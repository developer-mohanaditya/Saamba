#!/usr/bin/env python3
"""
Monitor File 3 Processing to Completion.
"""
import os
import sys
import time
import json
import base64
import subprocess
import urllib.request
import websocket
from pathlib import Path

MID = "12429fcd724946f1a3569b01ce7a5519"
FILE_NAME = "web-contents-media-stream_ E5E6377CEFA41DB6FF7EB5267CB8FB86.mp4"
PROD_BASE_URL = "https://saamba.profeshare.ai"
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
    print(f"Monitoring Meeting {MID} to Completion...")
    ws = None
    try:
        ws = websocket.create_connection(CDP_URL, suppress_origin=True)
    except Exception:
        pass

    last_status = None
    t_start = time.time()
    t_transcribe_end = None
    t_summarize_end = None

    while time.time() - t_start < 900:
        sb_req = urllib.request.Request(
            f"{SUPABASE_URL}/rest/v1/meetings?id=eq.{MID}&select=status,error,transcript,summary",
            headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
        )
        try:
            with urllib.request.urlopen(sb_req, timeout=10) as resp:
                rows = json.loads(resp.read().decode())
                if rows:
                    r = rows[0]
                    status = r.get('status')
                    error = r.get('error')
                    raw_transcript = r.get('transcript')
                    transcript = json.loads(raw_transcript) if isinstance(raw_transcript, str) else (raw_transcript or [])
                    summary = r.get('summary') or ''

                    if status != last_status:
                        elapsed = time.time() - t_start
                        print(f"  ⏱ [{elapsed:5.1f}s] State Transition: -> {status.upper()}")
                        last_status = status

                        if status == 'summarizing':
                            t_transcribe_end = time.time()
                            print(f"    ✓ Transcription Succeeded: {len(transcript)} segments generated!")
                            if ws:
                                time.sleep(1)
                                take_cdp_screenshot(ws, 'test3_stage3_summarizing.png')
                        elif status == 'ready':
                            t_summarize_end = time.time()
                            print(f"    ✓ Summarization Succeeded: {len(summary):,} characters generated!")
                            if ws:
                                time.sleep(2)
                                take_cdp_screenshot(ws, 'test3_stage4_ready.png')
                            break
                        elif status == 'error':
                            print(f"    ✗ Pipeline Error: {error}")
                            break
        except Exception as e:
            print(f"  [Poll Warning]: {e}")
        time.sleep(2.5)

    if ws:
        ws.close()

if __name__ == '__main__':
    main()
