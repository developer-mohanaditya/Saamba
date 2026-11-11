// frontend/lib/api.ts - Typed API client for Saamba with Supabase cloud hybrid support

import { Meeting, Workspace, ChatMessage, MeetingTranslation } from './types';
import { supabase } from './supabaseClient';

const API_BASE = ''; // relative to same origin, or proxies to 127.0.0.1:24917

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(init?.headers as Record<string, string>),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...init,
    headers,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || data.error || `HTTP ${res.status}: Failed to fetch`);
  }
  return data as T;
}

export async function getMeetingMediaUrl(mid: string): Promise<{ url: string; expires_in: number; mime: string }> {
  return fetchJson<{ url: string; expires_in: number; mime: string }>(`/api/meetings/${encodeURIComponent(mid)}/media-url`);
}

export async function getWorkspaces(): Promise<{
  workspaces: Workspace[];
  workspaceMeetings: Record<string, string[]>;
}> {
  // If authenticated with Supabase, query Supabase workspaces directly
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    return {
      workspaces: [{ id: 'default', name: 'My meetings', icon: 'users', isDefault: true }],
      workspaceMeetings: { default: [] },
    };
  }

  const { data: wsRows, error: wsErr } = await supabase
    .from('workspaces')
    .select('*')
    .order('is_default', { ascending: false });

  if (!wsErr && wsRows && wsRows.length > 0) {
    const { data: wmRows } = await supabase.from('workspace_meetings').select('workspace_id, meeting_id');
    const wmMap: Record<string, string[]> = {};
    (wmRows || []).forEach((row: any) => {
      if (!wmMap[row.workspace_id]) wmMap[row.workspace_id] = [];
      wmMap[row.workspace_id].push(row.meeting_id);
    });

    return {
      workspaces: wsRows.map((w: any) => ({
        id: w.id,
        name: w.name,
        icon: w.icon || 'briefcase',
        isDefault: Boolean(w.is_default),
      })),
      workspaceMeetings: wmMap,
    };
  }

  return {
    workspaces: [{ id: 'default', name: 'My meetings', icon: 'users', isDefault: true }],
    workspaceMeetings: { default: [] },
  };
}

export async function createWorkspace(ws: { name: string; icon: string }): Promise<Workspace> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    throw new Error('Please sign in to create a workspace.');
  }

  const newWs = {
    id: `ws-${Date.now()}`,
    name: ws.name,
    icon: ws.icon,
    is_default: false,
    user_id: sessionData.session.user.id,
  };
  const { data, error } = await supabase.from('workspaces').insert([newWs]).select().single();
  if (!error && data) {
    return {
      id: data.id,
      name: data.name,
      icon: data.icon,
      isDefault: Boolean(data.is_default),
    };
  }
  throw new Error(error?.message || 'Failed to create workspace.');
}

export async function deleteWorkspace(id: string): Promise<{ status: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    throw new Error('Please sign in to delete a workspace.');
  }
  await supabase.from('workspaces').delete().eq('id', id);
  return { status: 'ok' };
}

export async function getMeetings(): Promise<Meeting[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    // Unauthenticated visitors have no access to private meetings
    return [];
  }

  const { data, error } = await supabase
    .from('meetings')
    .select('id, title, created_at, status, error, mime, summary, transcript')
    .order('created_at', { ascending: false });

  if (!error && data) {
    return data.map((m: any) => ({
      id: m.id,
      title: m.title,
      created_at: m.created_at,
      status: m.status,
      error: m.error,
      mime: m.mime,
      has_summary: Boolean(m.summary && m.summary.trim().length > 0),
      has_transcript: Boolean(m.transcript && Array.isArray(m.transcript) && m.transcript.length > 0),
    }));
  }

  return [];
}

export function parseActionItems(summary: string, checks: Record<string, boolean> = {}): any[] {
  let active = false;
  const result: any[] = [];
  const counts: Record<string, number> = {};

  for (const line of (summary || '').split(/\r?\n/)) {
    const stripped = line.trim();
    const heading = stripped.match(/^(?:#{1,4}\s+(.+?)|\*\*(.+?)\*\*)\s*:?[ ]*$/);
    if (heading) {
      const rawName = (heading[1] || heading[2]).trim().replace(/:$/, '').toLowerCase();
      const name = rawName.replace(/^\d+[\.\)]\s*/, '');
      active = name === 'action items' || name === 'action item' || name === 'next steps';
      continue;
    }
    const cleaned = stripped.toLowerCase().replace(/:$/, '').replace(/^\d+[\.\)]\s*/, '');
    if (cleaned === 'action items' || cleaned === 'next steps') {
      active = true;
      continue;
    }
    if (stripped.startsWith('#')) {
      active = false;
      continue;
    }
    const item = stripped.match(/^[-*]\s+(?:\[[ xX]\]\s*)?(.+)/);
    if (active && item) {
      let text = item[1].trim();
      // Filter out negative filler statements so they never become fake action item checkboxes
      if (
        /^(?:no\s+(?:actionable\s+tasks?|action\s+items?|tasks?|next\s+steps?)|none|n\/a|not\s+applicable)\b/i.test(
          text
        )
      ) {
        continue;
      }
      const stamp = text.match(/\[(?:(\d+):(\d{2})|(\d+(?:\.\d+)?)s)\]/);
      let seconds: number | null = null;
      if (stamp) {
        seconds = stamp[1] ? parseInt(stamp[1], 10) * 60 + parseInt(stamp[2], 10) : parseFloat(stamp[3]);
        text = text.replace(stamp[0], ' ');
      }
      const spkMatch = text.match(/(?:\[|\()\s*(Speaker\s*\w+|[A-Z][a-z]+)\s*(?:\]|\))/i);
      let speakerLabel: string | null = null;
      if (spkMatch) {
        speakerLabel = spkMatch[1].trim();
        text = text.replace(spkMatch[0], ' ');
      }
      text = text.replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ').trim();
      if (text.endsWith(' .')) text = text.slice(0, -2) + '.';
      text = text.replace(/\s+\.\s*$/, '.');
      counts[text] = (counts[text] || 0) + 1;
      const key = `${text}-${counts[text]}`;
      result.push({
        key,
        text,
        checked: Boolean(checks[key]),
        start: seconds,
        speaker: speakerLabel,
      });
    }
  }
  return result;
}

export async function getMeeting(id: string): Promise<Meeting> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;

  if (!userId) {
    throw new Error('Please sign in to view this meeting.');
  }

  // 1. First look up the meeting scoped to the authenticated user from Supabase
  const { data: m, error } = await supabase.from('meetings').select('*').eq('id', id).single();
  if (!error && m) {
    const { data: checksData } = await supabase.from('action_checks').select('*').eq('meeting_id', id);
    const { data: transData } = await supabase.from('meeting_translations').select('language_code, language_name, created_at').eq('meeting_id', id);

    const checks: Record<string, boolean> = {};
    (checksData || []).forEach((c: any) => {
      checks[c.item_key] = Boolean(c.checked);
    });

    return {
      id: m.id,
      title: m.title,
      created_at: m.created_at,
      filename: m.filename,
      mime: m.mime,
      status: m.status,
      error: m.error,
      transcript: m.transcript || [],
      summary: m.summary || '',
      action_items: parseActionItems(m.summary || '', checks),
      translations: transData || [],
      has_summary: Boolean(m.summary && m.summary.trim().length > 0),
      has_transcript: Boolean(m.transcript && Array.isArray(m.transcript) && m.transcript.length > 0),
    };
  }

  // 2. Fallback to server API with authenticated user header
  try {
    const headers: Record<string, string> = { 'X-User-Id': userId };
    const data = await fetchJson<any>(`/api/meetings/${encodeURIComponent(id)}`, { headers });
    if (data && data.id) {
      if (!data.action_items || data.action_items.length === 0) {
        data.action_items = parseActionItems(data.summary || '');
      }
      return data as Meeting;
    }
  } catch (_) {}

  throw new Error('Please sign in to view this meeting.');
}

export async function renameMeeting(id: string, title: string): Promise<{ title: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    throw new Error('Please sign in to rename this meeting.');
  }
  await supabase.from('meetings').update({ title }).eq('id', id);
  return { title };
}

export async function deleteMeeting(id: string): Promise<{ ok: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    throw new Error('Please sign in to delete this meeting.');
  }
  await supabase.from('meetings').delete().eq('id', id);
  return { ok: true };
}

export async function getChatMessages(id: string): Promise<ChatMessage[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    return [];
  }
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('meeting_id', id)
    .order('created_at', { ascending: true });
  if (data && data.length > 0) {
    return data.map((d: any) => ({
      id: d.id,
      role: d.role,
      content: d.content || d.text || '',
      text: d.content || d.text || '',
      scope: d.scope || 'this',
      created_at: d.created_at,
    }));
  }
  return [];
}

export async function sendChatMessage(mid: string, question: string, scope: 'this' | 'mine' = 'this'): Promise<{ answer: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    throw new Error('Please sign in to ask questions about your meetings.');
  }

  const res = await fetchJson<{ answer: string }>('/api/ask', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    body: JSON.stringify({ meeting_id: mid, question, scope }),
  });

  try {
    await supabase.from('chat_messages').insert([
      { meeting_id: mid, role: 'user', content: question, scope, user_id: userId },
      { meeting_id: mid, role: 'assistant', content: res.answer, scope, user_id: userId }
    ]);
  } catch (e) {
    console.warn('Failed to sync chat message to Supabase:', e);
  }

  return res;
}

export async function toggleActionItem(mid: string, key: string, checked: boolean): Promise<{ ok: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const userId = sessionData.session?.user?.id;
  if (!userId) {
    throw new Error('Please sign in to update action items.');
  }
  await supabase.from('action_checks').upsert([{
    meeting_id: mid,
    item_key: key,
    checked,
    user_id: userId,
  }]);
  return { ok: true };
}

export async function getTranslation(mid: string, langCode: string): Promise<MeetingTranslation> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session?.user) {
    throw new Error('Please sign in to view translations.');
  }
  const { data } = await supabase
    .from('meeting_translations')
    .select('*')
    .eq('meeting_id', mid)
    .eq('language_code', langCode)
    .single();
  if (data) return data;
  return fetchJson(`/api/meetings/${mid}/translations/${langCode}`);
}
