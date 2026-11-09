// frontend/lib/api.ts - Typed API client for Saamba with Supabase cloud hybrid support

import { Meeting, Workspace, ChatMessage, MeetingTranslation } from './types';
import { supabase } from './supabaseClient';

const API_BASE = ''; // relative to same origin, or proxies to 127.0.0.1:24917

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...init,
    headers: {
      'Accept': 'application/json',
      ...init?.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}: Failed to fetch`);
  }
  return data as T;
}

export async function getWorkspaces(): Promise<{
  workspaces: Workspace[];
  workspaceMeetings: Record<string, string[]>;
}> {
  // If authenticated with Supabase, query Supabase workspaces directly
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
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
  }

  // Guest / Unauthenticated: clean empty workspace, no mock data
  return {
    workspaces: [{ id: 'default', name: 'My meetings', icon: 'users', isDefault: true }],
    workspaceMeetings: { default: [] },
  };
}

export async function createWorkspace(ws: { name: string; icon: string }): Promise<Workspace> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    const newWs = {
      id: `ws-${Date.now()}`,
      name: ws.name,
      icon: ws.icon,
      is_default: false,
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
  }

  return fetchJson('/api/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ws),
  });
}

export async function deleteWorkspace(id: string): Promise<{ status: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    await supabase.from('workspaces').delete().eq('id', id);
    return { status: 'ok' };
  }
  return fetchJson(`/api/workspaces/${id}`, { method: 'DELETE' });
}

export async function getMeetings(): Promise<Meeting[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
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
  }

  // Guest / Unauthenticated: return empty list, no mock data injected
  return [];
}

export async function getMeeting(id: string): Promise<Meeting> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    const { data: m, error } = await supabase.from('meetings').select('*').eq('id', id).single();
    if (!error && m) {
      const { data: checksData } = await supabase.from('action_checks').select('*').eq('meeting_id', id);
      const { data: transData } = await supabase.from('meeting_translations').select('language_code, language_name, created_at').eq('meeting_id', id);

      const checks: Record<string, boolean> = {};
      (checksData || []).forEach((c: any) => {
        checks[c.item_key] = Boolean(c.checked);
      });

      // Parse action items from summary if available
      const lines = (m.summary || '').split('\n');
      const actionItems: any[] = [];
      let inActionSection = false;
      lines.forEach((line: string) => {
        if (/action\s*items?/i.test(line)) {
          inActionSection = true;
          return;
        }
        if (inActionSection && line.startsWith('###')) {
          inActionSection = false;
        }
        if (inActionSection && /^[-*]\s*\[[ xX]\]/.test(line)) {
          const text = line.replace(/^[-*]\s*\[[ xX]\]\s*/, '').trim();
          actionItems.push({
            key: text,
            text,
            checked: Boolean(checks[text]),
          });
        }
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
        action_items: actionItems,
        translations: transData || [],
        has_summary: Boolean(m.summary && m.summary.trim().length > 0),
        has_transcript: Boolean(m.transcript && Array.isArray(m.transcript) && m.transcript.length > 0),
      };
    }
  }

  throw new Error('Please sign in to view this meeting.');
}

export async function renameMeeting(id: string, title: string): Promise<{ title: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    await supabase.from('meetings').update({ title }).eq('id', id);
    return { title };
  }
  return fetchJson(`/api/meetings/${id}/rename`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
}

export async function deleteMeeting(id: string): Promise<{ ok: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    await supabase.from('meetings').delete().eq('id', id);
    return { ok: true };
  }
  return fetchJson(`/api/meetings/${id}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function getChatMessages(id: string): Promise<ChatMessage[]> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    const { data } = await supabase.from('chat_messages').select('*').eq('meeting_id', id).order('created_at', { ascending: true });
    if (data) return data;
  }
  return fetchJson(`/api/meetings/${id}/chat`);
}

export async function sendChatMessage(mid: string, question: string, scope: 'this' | 'mine' = 'this'): Promise<{ answer: string }> {
  return fetchJson('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meeting_id: mid, question, scope }),
  });
}

export async function toggleActionItem(mid: string, key: string, checked: boolean): Promise<{ ok: boolean }> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    await supabase.from('action_checks').upsert([{
      meeting_id: mid,
      item_key: key,
      checked,
    }]);
    return { ok: true };
  }
  return fetchJson(`/api/meetings/${mid}/action-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, checked }),
  });
}

export async function getTranslation(mid: string, langCode: string): Promise<MeetingTranslation> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    const { data } = await supabase
      .from('meeting_translations')
      .select('*')
      .eq('meeting_id', mid)
      .eq('language_code', langCode)
      .single();
    if (data) return data;
  }
  return fetchJson(`/api/meetings/${mid}/translations/${langCode}`);
}
