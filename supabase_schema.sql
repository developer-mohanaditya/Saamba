-- ==============================================================================
-- SAAMBA DATABASE SCHEMA (PostgreSQL / Supabase)
-- ==============================================================================

-- 1. Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    name TEXT NOT NULL,
    icon TEXT NOT NULL DEFAULT 'briefcase',
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Meetings Table
CREATE TABLE IF NOT EXISTS public.meetings (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ready',
    error TEXT,
    transcript JSONB DEFAULT '[]'::jsonb,
    summary TEXT,
    drive_file_id TEXT,
    drive_link TEXT,
    agenda_goal TEXT,
    attendee_emails JSONB DEFAULT '[]'::jsonb
);

-- 3. Workspace Meetings Junction
CREATE TABLE IF NOT EXISTS public.workspace_meetings (
    workspace_id TEXT REFERENCES public.workspaces(id) ON DELETE CASCADE,
    meeting_id TEXT REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    PRIMARY KEY (workspace_id, meeting_id)
);

-- 4. Action Checks Table
CREATE TABLE IF NOT EXISTS public.action_checks (
    meeting_id TEXT REFERENCES public.meetings(id) ON DELETE CASCADE,
    item_key TEXT NOT NULL,
    checked BOOLEAN NOT NULL DEFAULT false,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    PRIMARY KEY (meeting_id, item_key)
);

-- 5. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id BIGSERIAL PRIMARY KEY,
    meeting_id TEXT REFERENCES public.meetings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'this',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Meeting Translations Table
CREATE TABLE IF NOT EXISTS public.meeting_translations (
    meeting_id TEXT REFERENCES public.meetings(id) ON DELETE CASCADE,
    language_code TEXT NOT NULL,
    language_name TEXT NOT NULL,
    transcript JSONB DEFAULT '[]'::jsonb,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    PRIMARY KEY (meeting_id, language_code)
);

-- 7. Google Workspace Integrations Table
CREATE TABLE IF NOT EXISTS public.google_integrations (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
    google_email TEXT,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    drive_folder_id TEXT,
    booking_handle TEXT UNIQUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meeting_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.google_integrations ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for authenticated users (isolated per user)
CREATE POLICY "Users manage own workspaces" ON public.workspaces FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own meetings" ON public.meetings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own workspace meetings" ON public.workspace_meetings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own action checks" ON public.action_checks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own chat messages" ON public.chat_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own translations" ON public.meeting_translations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own google integrations" ON public.google_integrations FOR ALL USING (auth.uid() = user_id);
