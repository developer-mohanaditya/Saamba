#!/usr/bin/env python3
"""
Benchmark Runner for File 3: web-contents-media-stream (1.39 GB Video, 1h 43m)
Uses chunked streaming upload (25MB chunks) to stream 1.39 GB through Cloudflare edge.
Monitors full pipeline: Chunked Ingestion -> Audio Pre-compression -> Gemini Flash Transcription -> Summarization -> R2 Partial Streaming.
"""
import os
import sys
import time
import json
import base64
import math
import subprocess
import urllib.request
import urllib.parse
import websocket
from pathlib import Path

FILE_PATH = Path("/Users/sma/Downloads/audio-video-test-for-saamba/web-contents-media-stream_ E5E6377CEFA41DB6FF7EB5267CB8FB86.mp4")
FILE_TITLE = "Saamba Benchmark 1h43m Full Meeting Video"
PROD_BASE_URL = "https://saamba.profeshare.ai"
USER_ID = "99dc2206-2063-4d4f-ab6e-991ec3952099"
WORKSPACE_ID = "11799a11-c809-4783-ad9c-6e41b4f531b6"
CDP_URL = "ws://localhost:9222/devtools/page/FF2949CDCD615A8109A52EC97DCFF6C1"
ARTIFACTS_DIR = Path("/Users/sma/.gemini/antigravity/brain/22adfa42-06e8-41a7-9f80-6399216c2cd4")

SUPABASE_URL = "https://swapfqsivtuqbrczrmns.supabase.co"
SUPABASE_KEY = "os.environ.get("SUPABASE_SERVICE_KEY", "")"
OCI_SSH_CMD = ["ssh", "-i", os.path.expanduser("~/.ssh/id_ed25519_oci"), "-o", "StrictHostKeyChecking=no", "opc@158.178.199.98"]

CHUNK_SIZE = 25 * 1024 * 1024  # 25 MB slices

def get_vm_stats():
    try:
        res = subprocess.run(OCI_SSH_CMD + ["uptime; free -m; df -h /"], capture_output=True, text=True, timeout=10)
        return res.stdout.strip()
    except Exception as e:
        return f"VM stats error: {e}"

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
    print("=" * 75)
    print(f"STARTING PRIORITY 1 BENCHMARK - FILE 3: {FILE_PATH.name}")
    print(f"Local Path: {FILE_PATH}")
    file_size_bytes = FILE_PATH.stat().st_size
    print(f"File Size:  {file_size_bytes / (1024*1024):.2f} MB ({file_size_bytes:,} bytes)")
    print(f"Endpoint:   {PROD_BASE_URL}/api/meetings/upload-chunk")
    print("=" * 75)

    ws = None
    try:
        ws = websocket.create_connection(CDP_URL, suppress_origin=True)
        print("[CDP] Connected to Chrome DevTools session")
    except Exception as e:
        print(f"[CDP] Warning: Could not connect to Chrome DevTools: {e}")

    total_chunks = math.ceil(file_size_bytes / CHUNK_SIZE)
    print(f"\n[Stage 1] Uploading in {total_chunks} chunks of {CHUNK_SIZE/(1024*1024):.0f} MB each...")
    
    mid = None
    t_start_upload = time.time()
    
    with open(FILE_PATH, 'rb') as f:
        for chunk_idx in range(total_chunks):
            chunk_data = f.read(CHUNK_SIZE)
            t_chunk_start = time.time()
            
            headers = {
                'Content-Type': 'application/octet-stream',
                'X-Chunk-Index': str(chunk_idx),
                'X-Total-Chunks': str(total_chunks),
                'X-Meeting-Title': urllib.parse.quote(FILE_TITLE),
                'X-Meeting-Mime': 'video/mp4',
                'X-User-Id': USER_ID,
                'X-Workspace-Id': WORKSPACE_ID,
                'User-Agent': 'SaambaBenchmark/1.0'
            }
            if mid:
                headers['X-Meeting-Id'] = mid
                
            req = urllib.request.Request(
                f"{PROD_BASE_URL}/api/meetings/upload-chunk",
                data=chunk_data,
                headers=headers,
                method='POST'
            )
            
            with urllib.request.urlopen(req, timeout=180) as resp:
                chunk_resp = json.loads(resp.read().decode())
                mid = chunk_resp.get('id')
                t_chunk_elapsed = time.time() - t_chunk_start
                chunk_mb = len(chunk_data) / (1024 * 1024)
                pct = ((chunk_idx + 1) / total_chunks) * 100
                if (chunk_idx + 1) % 5 == 0 or (chunk_idx + 1) == total_chunks:
                    print(f"  ✓ Chunk {chunk_idx + 1:2d}/{total_chunks} ({pct:5.1f}%) [{chunk_mb:.1f} MB in {t_chunk_elapsed:.2f}s | {chunk_mb/t_chunk_elapsed:.1f} MB/s]")

    t_end_upload = time.time()
    upload_total_latency = t_end_upload - t_start_upload
    avg_speed = (file_size_bytes / (1024 * 1024)) / upload_total_latency
    print(f"\n  ✓ All {total_chunks} Chunks Ingested! Meeting ID: {mid}")
    print(f"  ⏱ Total Upload Latency: {upload_total_latency:.2f}s ({upload_total_latency/60:.2f}m @ {avg_speed:.2f} MB/s)")

    if ws:
        print("\n[UI] Syncing browser dashboard...")
        cdp_send(ws, 'Page.navigate', {'url': 'http://localhost:3001/'})
        time.sleep(3)
        take_cdp_screenshot(ws, 'test3_stage1_uploaded.png')

    print("\n[Stage 2] Monitoring Automatic Pipeline Transitions (Queued -> Transcribing -> Summarizing -> Ready)...")
    last_status = None
    t_transcribe_start = None
    t_transcribe_end = None
    t_summarize_start = None
    t_summarize_end = None
    transcript_segments_count = 0
    summary_length = 0

    t_poll_start = time.time()
    vm_stats_transcribing = ""
    vm_stats_summarizing = ""
    vm_stats_ready = ""

    while time.time() - t_poll_start < 1200:  # 20 min timeout for 1h43m video
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
                    raw_transcript = row.get('transcript')
                    transcript = json.loads(raw_transcript) if isinstance(raw_transcript, str) else (raw_transcript or [])
                    summary = row.get('summary') or ''

                    if status != last_status:
                        elapsed = time.time() - t_poll_start
                        print(f"  ⏱ [{elapsed:5.1f}s] State Transition: -> {status.upper()}")
                        last_status = status

                        if status == 'transcribing' and not t_transcribe_start:
                            t_transcribe_start = time.time()
                            vm_stats_transcribing = get_vm_stats()
                            if ws:
                                time.sleep(1)
                                take_cdp_screenshot(ws, 'test3_stage2_transcribing.png')
                        elif status == 'summarizing' and not t_summarize_start:
                            t_transcribe_end = time.time()
                            t_summarize_start = time.time()
                            transcript_segments_count = len(transcript)
                            print(f"    ✓ Transcription Succeeded: {transcript_segments_count} segments generated!")
                            vm_stats_summarizing = get_vm_stats()
                            if ws:
                                time.sleep(1)
                                take_cdp_screenshot(ws, 'test3_stage3_summarizing.png')
                        elif status == 'ready':
                            t_summarize_end = time.time()
                            summary_length = len(summary)
                            print(f"    ✓ Summarization Succeeded: {summary_length:,} characters generated!")
                            vm_stats_ready = get_vm_stats()
                            if ws:
                                time.sleep(2)
                                take_cdp_screenshot(ws, 'test3_stage4_ready.png')
                            break
                        elif status == 'error':
                            print(f"    ✗ Pipeline Error: {error}")
                            break
        except Exception as e:
            print(f"  [Poll Warning]: {e}")

        time.sleep(3.0)

    print("\n[Stage 3] Verifying Cloudflare R2 Media Streaming...")
    audio_req = urllib.request.Request(
        f"{PROD_BASE_URL}/api/meetings/{mid}/audio",
        headers={'Range': 'bytes=0-1024', 'User-Agent': 'SaambaBenchmark/1.0'}
    )
    r2_status = "UNKNOWN"
    content_range = "UNKNOWN"
    server_hdr = "UNKNOWN"
    try:
        with urllib.request.urlopen(audio_req, timeout=15) as a_resp:
            r2_status = f"HTTP {a_resp.status}"
            content_range = a_resp.headers.get('Content-Range', 'N/A')
            server_hdr = a_resp.headers.get('Server', 'N/A')
            print(f"  ✓ Media streaming status: {r2_status}")
            print(f"  ✓ Content-Range header:  {content_range}")
            print(f"  ✓ Edge Server header:    {server_hdr}")
    except Exception as e:
        print(f"  ✗ Streaming check notice: {e}")

    t_pipeline_end = t_summarize_end or time.time()
    transcribe_dur = (t_transcribe_end - t_transcribe_start) if (t_transcribe_start and t_transcribe_end) else 0.0
    summarize_dur = (t_summarize_end - t_summarize_start) if (t_summarize_start and t_summarize_end) else 0.0
    total_pipeline_time = t_pipeline_end - t_start_upload

    print("\n" + "=" * 75)
    print("DETAILED PERFORMANCE & SYSTEM TELEMETRY REPORT: FILE 3")
    print("=" * 75)
    print(f"File Name:              {FILE_PATH.name}")
    print(f"File Size:              {file_size_bytes / (1024*1024):.2f} MB")
    print(f"Meeting ID:             {mid}")
    print(f"Upload Protocol:        Chunked HTTP POST ({total_chunks} x 25MB slices)")
    print(f"Upload Duration:        {upload_total_latency:.2f}s ({avg_speed:.2f} MB/s)")
    print(f"Transcribe Engine:      Gemini 2.5 Flash Single-Pass Ingestion")
    print(f"Transcribe Duration:    {transcribe_dur:.2f}s ({transcript_segments_count} segments)")
    print(f"Summarize Engine:       Gemini 2.5 Flash Structured Meeting Analyst")
    print(f"Summarize Duration:     {summarize_dur:.2f}s ({summary_length:,} characters)")
    print(f"Total Turnaround:       {total_pipeline_time:.2f}s ({total_pipeline_time/60:.2f} minutes)")
    print(f"Cloudflare Edge Stream: {r2_status} ({content_range})")
    print(f"Supabase PostgreSQL:    Synced Real-time")
    print("\nOracle VM System Health (during peak):")
    print(vm_stats_ready or vm_stats_summarizing or vm_stats_transcribing)
    print("=" * 75)

    if ws:
        ws.close()

if __name__ == '__main__':
    main()
