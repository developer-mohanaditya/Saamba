"""Gemini 3.8 Flash pipeline for Saamba meeting transcription, translation, and chat.
Single-pass ingestion: uploads the full audio to Google File API, avoiding artificial chunking.
"""
import os, json, time, uuid, subprocess, urllib.request, urllib.error
from pathlib import Path

MODEL_TRANSCRIPTION = os.environ.get('SAAMBA_GEMINI_MODEL', 'gemini-3.8-flash')
API_BASE = 'https://generativelanguage.googleapis.com'

class ProcessingError(Exception):
    pass

def duration(path):
    """Return recording duration in seconds using ffprobe."""
    try:
        cmd = ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(path)]
        out = subprocess.check_output(cmd, stderr=subprocess.DEVNULL, timeout=30).decode().strip()
        return float(out)
    except Exception:
        return 0.0

def detect_mime_type(path):
    """Detect MIME type using file command or extension fallback."""
    try:
        out = subprocess.check_output(['file', '-b', '--mime-type', str(path)], stderr=subprocess.DEVNULL).decode().strip()
        if 'mpeg' in out or 'mp3' in out:
            return 'audio/mp3'
        if 'wav' in out:
            return 'audio/wav'
        if 'webm' in out:
            return 'audio/webm'
        if 'ogg' in out:
            return 'audio/ogg'
        if 'mp4' in out:
            return 'video/mp4'
        if out.startswith('audio/') or out.startswith('video/'):
            return out
    except Exception:
        pass
    p = str(path).lower()
    if p.endswith('.mp3'):
        return 'audio/mp3'
    if p.endswith('.webm'):
        return 'audio/webm'
    if p.endswith('.mp4'):
        return 'video/mp4'
    return 'audio/wav'

def upload_audio(path, key):
    """Upload audio file to Google AI File API and return active file URI."""
    file_size = os.path.getsize(path)
    mime_type = detect_mime_type(path)

    init_url = f"{API_BASE}/upload/v1beta/files?key={key}"
    headers = {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": str(file_size),
        "X-Goog-Upload-Header-Content-Type": mime_type,
        "Content-Type": "application/json"
    }
    metadata = json.dumps({"file": {"display_name": Path(path).name}}).encode("utf-8")
    req = urllib.request.Request(init_url, data=metadata, headers=headers, method="POST")

    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            upload_url = resp.headers.get("X-Goog-Upload-URL")
            if not upload_url:
                raise ProcessingError("Failed to obtain upload URL from Google File API.")
    except urllib.error.HTTPError as e:
        raise ProcessingError(f"Google File API error ({e.code}): {e.read().decode('utf-8', errors='ignore')}")

    # Upload binary content
    headers_upload = {
        "Content-Length": str(file_size),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize"
    }
    with open(path, "rb") as f:
        req_upload = urllib.request.Request(upload_url, data=f, headers=headers_upload, method="POST")
        try:
            with urllib.request.urlopen(req_upload, timeout=300) as resp:
                upload_resp = json.loads(resp.read().decode("utf-8"))
                file_info = upload_resp.get("file", {})
                return file_info.get("uri"), file_info.get("mimeType", mime_type)
        except urllib.error.HTTPError as e:
            raise ProcessingError(f"Google File Upload error ({e.code}): {e.read().decode('utf-8', errors='ignore')}")

def parse_timestamps(raw_text):
    """Parse timestamped transcript text into Saamba segment format:
    [{'start': float_sec, 'speaker': str or None, 'text': str}]
    """
    import re
    segments = []
    current_time = 0.0
    current_speaker = None
    buffer = []

    pattern = re.compile(r'^\s*\[?(\d{1,2}):(\d{2})(?::(\d{2}))?\]?\s*(Speaker\s*\w+)?\s*:?\s*(.*)$', re.IGNORECASE)

    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue
        m = pattern.match(line)
        if m:
            if buffer:
                segments.append({
                    "start": current_time,
                    "speaker": current_speaker,
                    "text": " ".join(buffer).strip()
                })
                buffer = []
            
            h_or_m = int(m.group(1))
            m_or_s = int(m.group(2))
            s_opt = m.group(3)
            if s_opt is not None:
                current_time = float(h_or_m * 3600 + m_or_s * 60 + int(s_opt))
            else:
                current_time = float(h_or_m * 60 + m_or_s)
            
            if m.group(4):
                spk_str = m.group(4).strip()
                spk_num = re.search(r'\d+', spk_str)
                if spk_num:
                    current_speaker = max(0, int(spk_num.group()) - 1)
                else:
                    current_speaker = None
            rest = m.group(5).strip()
            if rest:
                buffer.append(rest)
        else:
            buffer.append(line)

    if buffer:
        segments.append({
            "start": current_time,
            "speaker": current_speaker,
            "text": " ".join(buffer).strip()
        })

    return segments

def transcribe_audio(path, key):
    """Transcribe entire meeting recording in a single pass with Gemini Flash."""
    file_uri, mime_type = upload_audio(path, key)
    
    system_prompt = """You are a meticulous multilingual meeting transcription specialist.
Transcribe the supplied meeting audio faithfully in the original language or languages spoken.
The audio will often contain Telugu and English, including code-switching.
Preserve Telugu speech in Telugu script. Preserve English speech in Latin script.
Include exact [HH:MM:SS] timestamps and stable speaker labels (e.g. [00:01:23] Speaker 1: text).
Never translate or rewrite words to make them more fluent."""

    url = f"{API_BASE}/v1beta/models/{MODEL_TRANSCRIPTION}:generateContent?key={key}"
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{
            "parts": [
                {"fileData": {"mimeType": mime_type, "fileUri": file_uri}},
                {"text": "Transcribe the supplied meeting audio faithfully with timestamps and speaker labels."}
            ]
        }],
        "generationConfig": {"temperature": 0.2}
    }
    
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw_text = data["candidates"][0]["content"]["parts"][0]["text"]
            segments = parse_timestamps(raw_text)
            if not segments:
                segments = [{"start": 0.0, "speaker": None, "text": raw_text}]
            return segments, raw_text
    except urllib.error.HTTPError as e:
        raise ProcessingError(f"Gemini transcription failed ({e.code}): {e.read().decode('utf-8', errors='ignore')}")

def summarize(segments, key):
    """Generate executive summary, key points, decisions, and action items."""
    transcript_text = "\n".join([f"[{s.get('speaker') or 'Speaker'}]: {s.get('text', '')}" for s in segments])
    
    prompt = f"""You are a professional meeting intelligence analyst.
Analyze the following meeting transcript (Telugu & English) and generate a comprehensive English briefing:
1. Summary (<= 150 words)
2. Key Points (bulleted)
3. Decisions (bulleted)
4. Action Items (bulleted, actionable)

Transcript:
{transcript_text}"""

    url = f"{API_BASE}/v1beta/models/{MODEL_TRANSCRIPTION}:generateContent?key={key}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2}
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["candidates"][0]["content"]["parts"][0]["text"]
    except urllib.error.HTTPError as e:
        raise ProcessingError(f"Gemini summarization failed ({e.code}): {e.read().decode('utf-8', errors='ignore')}")

def chat(messages, transcript_text, key):
    """Answer user questions about the meeting."""
    system_prompt = f"""You are Saamba's meeting assistant. Answer the user's questions accurately based strictly on this meeting transcript:
{transcript_text}"""

    contents = []
    for msg in messages:
        contents.append({
            "role": "user" if msg["role"] == "user" else "model",
            "parts": [{"text": msg["content"]}]
        })

    url = f"{API_BASE}/v1beta/models/{MODEL_TRANSCRIPTION}:generateContent?key={key}"
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.3}
    }
    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            return data["candidates"][0]["content"]["parts"][0]["text"]
    except urllib.error.HTTPError as e:
        raise ProcessingError(f"Gemini chat failed ({e.code}): {e.read().decode('utf-8', errors='ignore')}")
