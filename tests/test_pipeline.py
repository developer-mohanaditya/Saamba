import json
import os
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import groq_pipeline
import server

class ResumeTests(unittest.TestCase):
    def test_completed_chunk_survives_limit_and_is_not_repeated(self):
        old_data, old_db = server.DATA, server.DB
        try:
            with tempfile.TemporaryDirectory() as directory:
                server.DATA = Path(directory)
                server.DB = server.DATA / 'test.sqlite3'
                with server.connect() as db:
                    db.execute('CREATE TABLE meetings (id TEXT PRIMARY KEY,title TEXT,created_at TEXT,filename TEXT,mime TEXT,status TEXT,error TEXT,transcript TEXT,summary TEXT)')
                    db.execute('CREATE TABLE transcript_chunks (meeting_id TEXT,chunk_index INTEGER,segments TEXT, PRIMARY KEY (meeting_id,chunk_index))')
                    db.execute('CREATE TABLE summary_preview (meeting_id TEXT PRIMARY KEY,content TEXT,completed INTEGER,total INTEGER)')
                    db.execute('CREATE TABLE summary_chunks (meeting_id TEXT,chunk_index INTEGER,summary TEXT, PRIMARY KEY (meeting_id,chunk_index))')
                    db.execute('INSERT INTO meetings VALUES (?,?,?,?,?,?,?,?,?)',('test','test','today','audio','audio/wav','queued',None,None,None))
                calls = []
                def transcribe(path,start,key):
                    calls.append(start)
                    if start == 60 and calls.count(60) == 1:
                        raise groq_pipeline.ProcessingError('rate limit')
                    return [{'start':start,'speaker':None,'text':'synthetic'}]
                with patch.dict(os.environ, {'GROQ_API_KEY':'test-only'}), patch('groq_pipeline.duration',return_value=90), patch('groq_pipeline.transcribe_segment',side_effect=transcribe), patch('groq_pipeline.summarize',return_value='synthetic summary'):
                    server.process('test')
                    with server.connect() as db:
                        self.assertEqual(db.execute('SELECT status FROM meetings').fetchone()[0],'error')
                        self.assertEqual(db.execute('SELECT COUNT(*) FROM transcript_chunks').fetchone()[0],1)
                    server.process('test')
                    with server.connect() as db:
                        row=db.execute('SELECT status,transcript FROM meetings').fetchone()
                        self.assertEqual(row['status'],'ready')
                        self.assertEqual(len(json.loads(row['transcript'])),2)
                self.assertEqual(calls,[0,60,60])
        finally:
            server.DATA, server.DB = old_data, old_db

if __name__ == '__main__':
    unittest.main()

class RateLimitTests(unittest.TestCase):
    def test_429_waits_then_retries(self):
        import io
        import urllib.error
        from email.message import Message
        headers = Message()
        headers['Retry-After'] = '2'
        error = urllib.error.HTTPError('https://api.groq.com',429,'limited',headers,None)
        class Response(io.BytesIO):
            def __enter__(self): return self
            def __exit__(self, *args): self.close()
        with patch('groq_pipeline.pace'), patch('groq_pipeline.time.sleep') as sleep, patch('urllib.request.urlopen',side_effect=[error,Response(b'{"ok":true}')]) as request:
            self.assertEqual(groq_pipeline.send('/test',b'{}','application/json','test'),{'ok':True})
            self.assertEqual(request.call_count,2)
            sleep.assert_called_once_with(2.0)
