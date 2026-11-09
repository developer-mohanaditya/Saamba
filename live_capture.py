"""Local meeting recorder: persisted WAV chunks and ordered transcription jobs."""
import json
import os
import subprocess
import threading
import uuid
import wave
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import groq_pipeline
import gemini_pipeline

executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix='saamba-live')
locks = {}
locks_guard = threading.Lock()


def lock_for(mid):
    with locks_guard:
        return locks.setdefault(mid, threading.Lock())


def initialize(db):
    db.execute('CREATE TABLE IF NOT EXISTS live_chunks (meeting_id TEXT NOT NULL, chunk_index INTEGER NOT NULL, filename TEXT NOT NULL, frames INTEGER NOT NULL, sample_rate INTEGER NOT NULL, PRIMARY KEY(meeting_id, chunk_index))')


def create(server, title=None):
    mid = uuid.uuid4().hex
    name = mid + '.wav'
    with server.connect() as db:
        db.execute('INSERT INTO meetings (id,title,created_at,filename,mime,status) VALUES (?,?,?,?,?,?)', (mid, (title or '').strip()[:200] or 'Google Meet — ' + datetime.now().strftime('%d %b %Y'), datetime.now(timezone.utc).isoformat(), name, 'audio/wav', 'recording'))
    return mid


def add(server, mid, index, body):
    with lock_for(mid):
        with server.connect() as db:
            row = db.execute('SELECT status FROM meetings WHERE id=?', (mid,)).fetchone()
            if not row or row['status'] != 'recording': raise ValueError('Meeting is not recording')
            next_index = db.execute('SELECT COUNT(*) FROM live_chunks WHERE meeting_id=?', (mid,)).fetchone()[0]
            if index < next_index:
                old = db.execute('SELECT filename FROM live_chunks WHERE meeting_id=? AND chunk_index=?', (mid,index)).fetchone()
                if old and (server.DATA / old['filename']).read_bytes() == body: return
            if index != next_index: raise ValueError('Audio segment out of order')
        directory = server.DATA / 'live' / mid
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        path = directory / f'{index:08d}.wav'
        with path.open('xb') as f:
            os.fchmod(f.fileno(), 0o600)
            f.write(body)
        try:
            with wave.open(str(path), 'rb') as audio:
                if audio.getsampwidth() != 2 or audio.getnchannels() != 1 or not 8000 <= audio.getframerate() <= 192000: raise ValueError('Unsupported audio format')
                frames, rate = audio.getnframes(), audio.getframerate()
                if frames <= 0 or frames > rate * 65: raise ValueError('Invalid audio duration')
            with server.connect() as db:
                db.execute('INSERT INTO live_chunks VALUES (?,?,?,?,?)', (mid, index, str(path.relative_to(server.DATA)), frames, rate))
        except Exception:
            path.unlink(missing_ok=True)
            raise
    executor.submit(transcribe, server, mid, index)


def add_video(server, mid, index, body):
    with lock_for(mid):
        with server.connect() as db:
            row = db.execute('SELECT status FROM meetings WHERE id=?', (mid,)).fetchone()
        if not row or row['status'] != 'recording' or not body:
            raise ValueError('Meeting is not recording')
        directory = server.DATA / 'live' / mid / 'video'
        directory.mkdir(parents=True, exist_ok=True, mode=0o700)
        path = directory / f'{index:08d}.webm'
        if path.exists():
            if path.read_bytes() != body: raise ValueError('Video segment mismatch')
            return
        if index != len(list(directory.glob('*.webm'))): raise ValueError('Video segment out of order')
        with path.open('xb') as f:
            os.fchmod(f.fileno(), 0o600)
            f.write(body)


def transcribe(server, mid, index):
    gemini_key = os.environ.get('GEMINI_API_KEY')
    groq_key = os.environ.get('GROQ_API_KEY')
    if not gemini_key and not groq_key: return
    with server.connect() as db:
        chunk = db.execute('SELECT * FROM live_chunks WHERE meeting_id=? AND chunk_index=?', (mid,index)).fetchone()
        elapsed = db.execute('SELECT COALESCE(SUM(1.0*frames/sample_rate),0) FROM live_chunks WHERE meeting_id=? AND chunk_index<?', (mid,index)).fetchone()[0]
    if not chunk: return
    chunk_path = server.DATA / chunk['filename']
    if not chunk_path.exists(): return

    segments = []
    if gemini_key:
        try:
            text = gemini_pipeline.transcribe_chunk(chunk_path, gemini_key)
            if text:
                segments = [{'start': round(elapsed, 2), 'speaker': None, 'text': text}]
        except Exception:
            pass
    if not segments and groq_key:
        try:
            local_segments = groq_pipeline.transcribe_segment(chunk_path, 0, groq_key)
            segments = [dict(s, start=round(s['start'] + elapsed, 2)) for s in local_segments]
        except Exception:
            pass

    if segments:
        with server.connect() as db:
            db.execute('INSERT OR REPLACE INTO transcript_chunks VALUES (?,?,?)', (mid,index,json.dumps(segments)))
            rows=db.execute('SELECT segments FROM transcript_chunks WHERE meeting_id=? ORDER BY chunk_index',(mid,)).fetchall()
            combined=[segment for row in rows for segment in json.loads(row['segments'])]
            db.execute('UPDATE meetings SET transcript=?, error=NULL WHERE id=?',(json.dumps(combined),mid))
        if hasattr(server, 'event_hub'):
            server.event_hub.broadcast(mid, 'live_chunk', {'segments': segments, 'chunk_index': index, 'total': len(combined)})
    elif not gemini_key and groq_key:
        server.update(mid, error='Live transcription is delayed. Audio is saved; processing will retry after the meeting.')


def finish(server, mid, video_count=0):
    with lock_for(mid):
        with server.connect() as db:
            meeting=db.execute('SELECT status,filename FROM meetings WHERE id=?',(mid,)).fetchone()
            chunks=db.execute('SELECT * FROM live_chunks WHERE meeting_id=? ORDER BY chunk_index',(mid,)).fetchall()
        if not meeting or meeting['status'] != 'recording' or not chunks: raise ValueError('No recorded audio to finish')
        if any(c['sample_rate'] != chunks[0]['sample_rate'] for c in chunks): raise ValueError('Audio format changed during recording')
        target=server.DATA / meeting['filename']
        try:
            with target.open('xb') as raw:
                os.fchmod(raw.fileno(), 0o600)
                with wave.open(raw,'wb') as output:
                    output.setnchannels(1); output.setsampwidth(2); output.setframerate(chunks[0]['sample_rate'])
                    for chunk in chunks:
                        with wave.open(str(server.DATA / chunk['filename']),'rb') as source:
                            while True:
                                frames=source.readframes(65536)
                                if not frames: break
                                output.writeframesraw(frames)
        except Exception:
            target.unlink(missing_ok=True)
            raise
        video_saved = False
        if video_count:
            directory = server.DATA / 'live' / mid / 'video'
            combined = directory / 'combined.tmp'
            output_path = server.DATA / (mid + '.webm')
            temporary = server.DATA / (mid + '.video.tmp.webm')
            try:
                parts = sorted(directory.glob('*.webm'))
                if [p.name for p in parts] != [f'{i:08d}.webm' for i in range(video_count)]: raise ValueError('Missing video segment')
                with combined.open('wb') as out:
                    os.fchmod(out.fileno(), 0o600)
                    for part in parts:
                        with part.open('rb') as source:
                            while block := source.read(1024 * 1024): out.write(block)
                subprocess.run(['ffmpeg','-v','error','-y','-i',str(combined),'-i',str(target),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','libopus','-shortest',str(temporary)], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=600)
                os.chmod(temporary, 0o600)
                os.replace(temporary, output_path)
                with server.connect() as db:
                    db.execute('UPDATE meetings SET filename=?, mime=? WHERE id=?', (output_path.name, 'video/webm', mid))
                video_saved = True
            except (OSError, ValueError, subprocess.SubprocessError):
                temporary.unlink(missing_ok=True)
            finally:
                combined.unlink(missing_ok=True)
        server.update(mid,status='queued',error=None)
    executor.submit(finish_processing,server,mid)
    return {'video_saved': video_saved}



def finish_processing(server,mid):
    # This job runs after all accepted live transcription jobs in the single worker.
    with server.connect() as db:
        chunks=db.execute('SELECT * FROM live_chunks WHERE meeting_id=? ORDER BY chunk_index',(mid,)).fetchall()
        done={row['chunk_index'] for row in db.execute('SELECT chunk_index FROM transcript_chunks WHERE meeting_id=?',(mid,))}
    for chunk in chunks:
        if chunk['chunk_index'] not in done:
            transcribe(server,mid,chunk['chunk_index'])
    with server.connect() as db:
        count=db.execute('SELECT COUNT(*) FROM transcript_chunks WHERE meeting_id=?',(mid,)).fetchone()[0]
    if count != len(chunks):
        server.update(mid,status='error',error='Some transcript segments remain incomplete. Your recording is saved; retry later.')
        return
    with server.connect() as db:
        rows=db.execute('SELECT segments FROM transcript_chunks WHERE meeting_id=? ORDER BY chunk_index',(mid,)).fetchall()
    segments=[s for row in rows for s in json.loads(row['segments'])]
    with server.connect() as db: db.execute('DELETE FROM summary_preview WHERE meeting_id=?',(mid,))
    server.update(mid,status='summarizing',transcript=json.dumps(segments),error=None)
    if hasattr(server, 'event_hub'):
        server.event_hub.broadcast(mid, 'status', {'status': 'summarizing'})
    gemini_key = os.environ.get('GEMINI_API_KEY')
    if gemini_key:
        try:
            summary = gemini_pipeline.summarize(segments, gemini_key, on_chunk=lambda c: server.publish_summary_chunk(mid, c) if hasattr(server, 'publish_summary_chunk') else None)
            server.update(mid, status='ready', summary=summary, error=None)
            if hasattr(server, 'clear_previews'):
                server.clear_previews(mid)
            if hasattr(server, 'event_hub'):
                server.event_hub.broadcast(mid, 'summary_done', {'summary': summary})
                server.event_hub.broadcast(mid, 'status', {'status': 'ready'})
            return
        except Exception as exc:
            server.update(mid, status='error', error=str(exc))
            if hasattr(server, 'clear_previews'):
                server.clear_previews(mid)
            if hasattr(server, 'event_hub'):
                server.event_hub.broadcast(mid, 'error', {'error': str(exc)})
            return
    try:
        request_get,request_set=server.summary_request_cache(mid)
        summary=groq_pipeline.summarize(segments,os.environ['GROQ_API_KEY'],request_get=request_get,request_set=request_set,on_partial=server.summary_preview_callback(mid))
        server.update(mid,status='ready',summary=summary,error=None)
    except groq_pipeline.ProcessingError as exc:
        server.update(mid,status='error',error=str(exc))
    except KeyError:
        server.update(mid,status='needs setup',error='Set GROQ_API_KEY and restart Saamba to create a summary.')
