import io
import json
import subprocess
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch
import live_capture
import server

class DummyExecutor:
    def __init__(self): self.jobs=[]
    def submit(self,fn,*args): self.jobs.append((fn,args))

class LiveCaptureTests(unittest.TestCase):
    def test_chunks_are_saved_in_order_and_joined_without_audio_loss(self):
        old_data,old_db=server.DATA,server.DB
        with tempfile.TemporaryDirectory() as d:
            server.DATA=Path(d);server.DB=server.DATA/'test.sqlite3'
            try:
                with server.connect() as db:
                    db.execute('CREATE TABLE meetings (id TEXT PRIMARY KEY,title TEXT,created_at TEXT,filename TEXT,mime TEXT,status TEXT,error TEXT,transcript TEXT,summary TEXT)')
                    db.execute('CREATE TABLE transcript_chunks (meeting_id TEXT,chunk_index INTEGER,segments TEXT, PRIMARY KEY(meeting_id,chunk_index))')
                    live_capture.initialize(db)
                def chunk(value):
                    out=io.BytesIO()
                    with wave.open(out,'wb') as w:
                        w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes(value*480)
                    return out.getvalue()
                queue=DummyExecutor()
                with patch.object(live_capture,'executor',queue):
                    mid=live_capture.create(server)
                    live_capture.add(server,mid,0,chunk(b'\x01\x00'))
                    with self.assertRaises(ValueError):live_capture.add(server,mid,2,chunk(b'\x02\x00'))
                    live_capture.add(server,mid,1,chunk(b'\x02\x00'))
                    live_capture.finish(server,mid)
                with wave.open(str(server.DATA/(mid+'.wav')),'rb') as result:
                    self.assertEqual(result.getnframes(),960)
                    self.assertEqual(result.readframes(960), b'\x01\x00'*480+b'\x02\x00'*480)
                self.assertEqual(len(queue.jobs),3)
            finally:
                server.DATA,server.DB=old_data,old_db

    def test_recording_accepts_96khz_input(self):
        old_data,old_db=server.DATA,server.DB
        with tempfile.TemporaryDirectory() as d:
            server.DATA=Path(d);server.DB=server.DATA/'test.sqlite3'
            try:
                with server.connect() as db:
                    db.execute('CREATE TABLE meetings (id TEXT PRIMARY KEY,title TEXT,created_at TEXT,filename TEXT,mime TEXT,status TEXT,error TEXT,transcript TEXT,summary TEXT)')
                    live_capture.initialize(db)
                out=io.BytesIO()
                with wave.open(out,'wb') as w:
                    w.setnchannels(1);w.setsampwidth(2);w.setframerate(96000);w.writeframes(b'\0\0'*960)
                with patch.object(live_capture,'executor',DummyExecutor()):
                    mid=live_capture.create(server)
                    live_capture.add(server,mid,0,out.getvalue())
                    live_capture.finish(server,mid)
                with wave.open(str(server.DATA/(mid+'.wav')),'rb') as result:
                    self.assertEqual(result.getframerate(),96000)
                    self.assertEqual(result.getnframes(),960)
            finally: server.DATA,server.DB=old_data,old_db

    def test_video_is_combined_with_audio_for_playback(self):
        old_data, old_db = server.DATA, server.DB
        with tempfile.TemporaryDirectory() as d:
            server.DATA=Path(d); server.DB=server.DATA/'test.sqlite3'
            try:
                with server.connect() as db:
                    db.execute('CREATE TABLE meetings (id TEXT PRIMARY KEY,title TEXT,created_at TEXT,filename TEXT,mime TEXT,status TEXT,error TEXT,transcript TEXT,summary TEXT)')
                    live_capture.initialize(db)
                video=server.DATA/'synthetic.webm'
                subprocess.run(['ffmpeg','-v','error','-f','lavfi','-i','color=c=black:s=64x64:r=10:d=1','-c:v','libvpx','-an',str(video)],check=True)
                out=io.BytesIO()
                with wave.open(out,'wb') as w:
                    w.setnchannels(1);w.setsampwidth(2);w.setframerate(48000);w.writeframes(b'\0\0'*48000)
                with patch.object(live_capture,'executor',DummyExecutor()):
                    mid=live_capture.create(server)
                    live_capture.add(server,mid,0,out.getvalue())
                    data=video.read_bytes(); cut=len(data)//2
                    live_capture.add_video(server,mid,0,data[:cut]);live_capture.add_video(server,mid,1,data[cut:])
                    result=live_capture.finish(server,mid,2)
                self.assertTrue(result['video_saved'])
                with server.connect() as db:
                    row=db.execute('SELECT filename,mime FROM meetings WHERE id=?',(mid,)).fetchone()
                self.assertEqual(row['mime'],'video/webm')
                probe=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_type','-of','csv=p=0',str(server.DATA/row['filename'])],capture_output=True,text=True,check=True)
                self.assertEqual(set(probe.stdout.splitlines()),{'video','audio'})
            finally:
                server.DATA,server.DB=old_data,old_db

if __name__=='__main__': unittest.main()
