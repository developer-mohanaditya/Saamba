// frontend/lib/types.ts - Core domain models

export interface Workspace {
  id: string;
  name: string;
  icon: string;
  isDefault?: boolean;
  is_default?: boolean;
  meeting_ids?: string[];
  meeting_count?: number;
  created_at?: string;
}

export interface TranscriptSegment {
  start: number;
  end?: number;
  speaker?: string | null;
  text: string;
}

export interface ActionItem {
  key: string;
  text: string;
  checked: boolean;
  speaker?: string | null;
  start?: number | null;
  timestamp?: number | null;
}

export interface MeetingTranslation {
  language_code: string;
  language_name: string;
  created_at?: string;
  transcript?: TranscriptSegment[];
  summary?: string;
}

export interface Meeting {
  id: string;
  title: string;
  created_at: string;
  filename?: string;
  mime?: string;
  status: 'ready' | 'transcribing' | 'summarizing' | 'recording' | 'error' | 'queued';
  error?: string | null;
  has_summary?: number | boolean;
  has_transcript?: number | boolean;
  summary?: string;
  transcript?: TranscriptSegment[];
  action_items?: ActionItem[];
  translations?: MeetingTranslation[];
  summary_preview?: {
    content: string;
    completed: number;
    total: number;
  } | null;
  transcript_preview?: string | null;
}

export interface ChatMessage {
  id?: number;
  meeting_id?: string;
  role: 'user' | 'assistant';
  content: string;
  text?: string;
  scope?: string;
  created_at?: string;
}
