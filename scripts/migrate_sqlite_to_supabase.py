"""
Migrate all data from local SQLite database to Supabase PostgreSQL.
Preserves meetings, transcripts, summaries, action checks, chat messages, translations, and workspaces.
"""
import os
import sqlite3
import json
from pathlib import Path
from supabase import create_client

SQLITE_PATH = Path(__file__).resolve().parent.parent / "data" / "meetings.sqlite3"
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"

def load_env():
    env = {}
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    return env

_env = load_env()
SUPABASE_URL = os.environ.get("SUPABASE_URL", _env.get("SUPABASE_URL", ""))
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", _env.get("SUPABASE_SERVICE_ROLE_KEY", ""))

def migrate():
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env or environment")

    print(f"Connecting to SQLite: {SQLITE_PATH}")
    if not SQLITE_PATH.exists():
        raise FileNotFoundError(f"SQLite file not found at {SQLITE_PATH}")

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    cursor = sqlite_conn.cursor()

    print(f"Connecting to Supabase: {SUPABASE_URL}")
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

    # 1. Migrate Workspaces
    print("\n--- Migrating Workspaces ---")
    workspaces = cursor.execute("SELECT * FROM workspaces").fetchall()
    for w in workspaces:
        row = {
            "id": w["id"],
            "name": w["name"],
            "icon": w["icon"] or "briefcase",
            "is_default": bool(w["is_default"])
        }
        res = supabase.table("workspaces").upsert(row).execute()
        print(f"Upserted workspace: {w['id']} ({w['name']})")

    # 2. Migrate Meetings
    print("\n--- Migrating Meetings ---")
    meetings = cursor.execute("SELECT * FROM meetings").fetchall()
    for m in meetings:
        transcript_data = []
        if m["transcript"]:
            try:
                transcript_data = json.loads(m["transcript"])
            except Exception as e:
                print(f"Error parsing transcript for meeting {m['id']}: {e}")
                transcript_data = []

        row = {
            "id": m["id"],
            "title": m["title"],
            "created_at": m["created_at"],
            "filename": m["filename"] or "",
            "mime": m["mime"] or "audio/wav",
            "status": m["status"] or "ready",
            "error": m["error"],
            "transcript": transcript_data,
            "summary": m["summary"] or ""
        }
        res = supabase.table("meetings").upsert(row).execute()
        print(f"Upserted meeting: {m['id']} - '{m['title'][:40]}'")

    # 3. Migrate Action Checks
    print("\n--- Migrating Action Checks ---")
    checks = cursor.execute("SELECT * FROM action_checks").fetchall()
    for c in checks:
        row = {
            "meeting_id": c["meeting_id"],
            "item_key": c["item_key"],
            "checked": bool(c["checked"])
        }
        res = supabase.table("action_checks").upsert(row).execute()
        print(f"Upserted action check: {c['meeting_id']} -> {c['item_key'][:16]}...")

    # 4. Migrate Chat Messages
    print("\n--- Migrating Chat Messages ---")
    chats = cursor.execute("SELECT * FROM chat_messages").fetchall()
    for ch in chats:
        row = {
            "id": ch["id"],
            "meeting_id": ch["meeting_id"],
            "role": ch["role"],
            "content": ch["content"],
            "scope": ch["scope"] or "this",
            "created_at": ch["created_at"]
        }
        res = supabase.table("chat_messages").upsert(row).execute()
        print(f"Upserted chat message: {ch['id']} ({ch['role']})")

    # 5. Migrate Meeting Translations
    print("\n--- Migrating Meeting Translations ---")
    translations = cursor.execute("SELECT * FROM meeting_translations").fetchall()
    for t in translations:
        t_data = []
        if t["transcript"]:
            try:
                t_data = json.loads(t["transcript"])
            except Exception:
                t_data = []
        row = {
            "meeting_id": t["meeting_id"],
            "language_code": t["language_code"],
            "language_name": t["language_name"],
            "transcript": t_data,
            "summary": t["summary"] or "",
            "created_at": t["created_at"]
        }
        res = supabase.table("meeting_translations").upsert(row).execute()
        print(f"Upserted translation: {t['meeting_id']} -> {t['language_name']} ({t['language_code']})")

    print("\n=== Data Migration Completed Successfully! ===")

if __name__ == "__main__":
    migrate()
