// frontend/lib/api.ts - Typed API client for Saamba FastAPI backend

import { Meeting, Workspace, ChatMessage, MeetingTranslation } from './types';

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
  return fetchJson('/api/workspaces');
}

export async function createWorkspace(ws: { name: string; icon: string }): Promise<Workspace> {
  return fetchJson('/api/workspaces', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ws),
  });
}

export async function deleteWorkspace(id: string): Promise<{ status: string }> {
  return fetchJson(`/api/workspaces/${id}`, { method: 'DELETE' });
}

export async function getMeetings(): Promise<Meeting[]> {
  return fetchJson('/api/meetings');
}

export async function getMeeting(id: string): Promise<Meeting> {
  return fetchJson(`/api/meetings/${id}`);
}

export async function getChatMessages(id: string): Promise<ChatMessage[]> {
  return fetchJson(`/api/meetings/${id}/chat`);
}

export async function sendChatMessage(mid: string, prompt: string, scope: 'current' | 'all' = 'current'): Promise<{ answer: string }> {
  return fetchJson('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ meeting_id: mid, prompt, scope }),
  });
}

export async function toggleActionItem(mid: string, itemKey: string, checked: boolean): Promise<{ checked: boolean }> {
  return fetchJson(`/api/meetings/${mid}/action-check`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item_key: itemKey, checked }),
  });
}

export async function getTranslation(mid: string, langCode: string): Promise<MeetingTranslation> {
  return fetchJson(`/api/meetings/${mid}/translations/${langCode}`);
}
