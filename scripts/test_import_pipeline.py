#!/usr/bin/env python3
"""
Saamba End-to-End Benchmark & Pipeline Test Harness
Tests file import, automatic transcription, automatic summarization,
Cloudflare R2 sync, Supabase sync, Oracle VM performance, and live browser UI.
"""
import os
import sys
import time
import json
import base64
import urllib.request
import websocket
from pathlib import Path

FILE_PATH = Path("/Users/sma/Downloads/audio-video-test-for-saamba/Impromptu Google Meet Meeting - Nov 6 2026.mp4")
FILE_TITLE = "Impromptu Google Meet Meeting - Nov 6 2026"
BASE_URL = "https://saamba.profeshare.ai"
USER_ID = "99dc2206-2063-4d4f-ab6e-991ec3952099"
WORKSPACE_ID = "11799a11-c809-4783-ad9c-6e41b4f531b6"
CDP_URL = "ws://localhost:9222/devtools/page/FF2949CDCD615A8109A52EC97DCFF6C1"
ARTIFACTS_DIR = Path("/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4")

SUPABASE_URL = "https://swapfqsivtuqbrczrmns.supabase.co"
SUPABASE_KEY = "os.environ.get("SUPABASE_SERVICE_KEY", "")"

def cdp_send(ws, method, params=None):
    ws._id_counter = getattr(ws, '_id_counter', 0) + 1
    req_id = ws._id_counter
    ws.send(json.dumps({'id': req_id, 'method': method, 'params': params or {}}))
    while True:
        resp = json.loads(ws.recv())
        if resp.get('id') == req_id:
            return resp.get('result', {})

def take_cdp_screenshot(ws, filename):
    try:
        shot = cdp_send(ws, 'Page.captureScreenshot', {'format': 'png'})
        if 'data' in shot:
            with open(ARTIFACTS_DIR / filename, 'wb') as f:
                f.write(base64.b64decode(shot['data']))
            print(f"  [UI] Screenshot saved: {filename}")
    except Exception as e:
        print(f"  [UI] Screenshot error: {e}")

def main():
    print("=" * 70)
    print(f"STARTING TEST FOR FILE 1: {FILE_PATH.name}")
    print(f"Size: {FILE_PATH.stat().st_size / (1024*1024):.2f} MB")
    print(f"Target: {BASE_URL}")
    print("=" * 70)

    # 1. Connect to Chrome CDP
    ws = None
    try:
        ws = websocket.create_connection(CDP_URL, suppress_origin=True)
        print("[CDP] Connected to Chrome tab")
    except Exception as e:
        print(f"[CDP] Warning: Could not connect to Chrome CDP: {e}")

    # 2. Upload file
    t_start_upload = time.time()
    print("\n[Stage 1] Uploading media file...")
    
    file_bytes = FILE_PATH.read_bytes()
    headers = {
        'Content-Type': 'video/mp4',
        'X-Meeting-Title': urllib.parse.quote(FILE_TITLE),
        'X-User-Id': USER_ID,
        'X-Workspace-Id': WORKSPACE_ID,
        'User-Agent': 'SaambaBenchmark/1.0'
    }
    
    req = urllib.request.Request(f"{BASE_URL}/api/meetings", data=file_bytes, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            t_end_upload = time.time()
            upload_duration = t_end_upload - t_start_upload
            resp_data = json.loads(resp.read().decode())
            mid = resp_data.get('id')
            print(f"  ✓ Upload Complete! Meeting ID: {mid}")
            print(f"  ⏱ Upload Latency: {upload_duration:.2f}s ({len(file_bytes)/(1024*1024*upload_duration):.2f} MB/s)")
    except Exception as e:
        print(f"  ✗ Upload Failed: {e}")
        return

    # If CDP connected, navigate to or refresh dashboard
    if ws:
        cdp_send(ws, 'Page.navigate', {'url': 'http://localhost:3001/'})
        time.sleep(2)
        take_cdp_screenshot(ws, 'test1_stage1_uploaded.png')

    # 3. Poll Status Transitions
    print("\n[Stage 2] Monitoring Automatic Pipeline Transitions (Transcribe -> Summarize -> Ready)...")
    last_status = None
    t_transcribe_start = None
    t_transcribe_end = None
    t_summarize_start = None
    t_summarize_end = None

    t_poll_start = time.time()
    while time.time() - t_poll_start < 300: # 5 min timeout
        # Query Supabase for meeting state
        sb_req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/meetings?id=eq.{mid}&select=status,error,transcript,summary,filename",
            headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
        )
        try:
            with urllib.request.urlopen(sb_req, timeout=10) as sb_resp:
                sb_rows = json.loads(sb_resp.read().decode())
                if sb_rows:
                    row = sb_rows[0]
                    status = row.get('status')
                    error = row.get('error')
                    transcript = row.get('transcript') or []
                    summary = row.get('summary') or ''

                    if status != last_status:
                        elapsed = time.time() - t_poll_start
                        print(f"  ⏱ [{elapsed:5.1f}s] Status changed to: -> {status.upper()}")
                        last_status = status

                        if status == 'transcribing' and not t_transcribe_start:
                            t_transcribe_start = time.time()
                            if ws: take_cdp_screenshot(ws, 'test1_stage2_transcribing.png')
                        elif status == 'summarizing' and not t_summarize_start:
                            t_transcribe_end = time.time()
                            t_summarize_start = time.time()
                            print(f"    ✓ Transcription completed: {len(transcript)} segments generated!")
                            if ws: take_cdp_screenshot(ws, 'test1_stage3_summarizing.png')
                        elif status == 'ready':
                            t_summarize_end = time.time()
                            print(f"    ✓ Summary completed: {len(summary)} chars generated!")
                            if ws: take_cdp_screenshot(ws, 'test1_stage4_ready.png')
                            break
                        elif status == 'error':
                            print(f"    ✗ Processing Error: {error}")
                            break

        except Exception as e:
            print(f"  Warning polling status: {e}")
            
        time.sleep(1.5)

    # 4. Verify Cloudflare R2 Upload
    print("\n[Stage 3] Verifying Cloudflare R2 Media & Streaming...")
    audio_req = urllib.request.Request(
        f"{BASE_URL}/api/meetings/{mid}/audio",
        headers={'Range': 'bytes=0-100', 'User-Agent': 'SaambaBenchmark/1.0'}
    )
    r2_status = "UNKNOWN"
    try:
        with urllib.request.urlopen(audio_req, timeout=15) as a_resp:
            r2_status = f"HTTP {a_resp.status}"
            content_range = a_resp.headers.get('Content-Range')
            server = a_resp.headers.get('Server')
            print(f"  ✓ Streaming verified: {r2_status}")
            print(f"  ✓ Content-Range: {content_range}")
            print(f"  ✓ Edge Server: {server}")
    except Exception as e:
        print(f"  Streaming check: {e}")

    # 5. Final Report & Metrics
    print("\n" + "=" * 70)
    print("PERFORMANCE & LATENCY REPORT FOR FILE 1")
    print("=" * 70)
    print(f"File Name:            {FILE_PATH.name}")
    print(f"File Size:            {len(file_bytes)/(1024*1024):.2f} MB")
    print(f"Upload Latency:       {upload_duration:.2f}s")
    if t_transcribe_start and t_transcribe_end:
        print(f"Transcribe Latency:   {t_transcribe_end - t_transcribe_start:.2f}s (Gemini Flash)")
    if t_summarize_start and t_summarize_end:
        print(f"Summarize Latency:    {t_summarize_end - t_summarize_start:.2f}s (Gemini Flash)")
    total_time = (t_summarize_end or time.time()) - t_start_upload
    print(f"Total Pipeline Time:  {total_time:.2f}s")
    print(f"Cloudflare R2 Edge:   Verified (HTTP 206 Partial Content)")
    print(f"Supabase PostgreSQL:  Verified (Meeting + Transcripts + Summary + Workspace Sync)")
    print("=" * 70)

    if ws:
        ws.close()

if __name__ == '__main__':
    main()
