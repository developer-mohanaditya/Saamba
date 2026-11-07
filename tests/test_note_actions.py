import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import groq_pipeline
import live_capture
import server

class NoteActionsTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.old=(server.DATA,server.DB)
        server.DATA=Path(self.temp.name);server.DB=server.DATA/'test.sqlite3'
        with server.connect() as db:
            db.execute('CREATE TABLE meetings (id TEXT PRIMARY KEY,title TEXT,created_at TEXT,filename TEXT,mime TEXT,status TEXT,error TEXT,transcript TEXT,summary TEXT)')
            db.execute('CREATE TABLE transcript_chunks (meeting_id TEXT,chunk_index INTEGER,segments TEXT, PRIMARY KEY(meeting_id,chunk_index))')
            db.execute('CREATE TABLE summary_chunks (meeting_id TEXT,chunk_index INTEGER,summary TEXT, PRIMARY KEY(meeting_id,chunk_index))')
            db.execute('CREATE TABLE summary_requests (meeting_id TEXT,request_hash TEXT,result TEXT, PRIMARY KEY(meeting_id,request_hash))')
            db.execute('CREATE TABLE summary_preview (meeting_id TEXT PRIMARY KEY,content TEXT,completed INTEGER,total INTEGER)')
            live_capture.initialize(db)
            db.execute('INSERT INTO meetings VALUES (?,?,?,?,?,?,?,?,?)',('test','test','today','audio','audio/wav','ready',None,json.dumps([{'start':0,'text':'old synthetic'}]),'old summary'))
            db.execute('INSERT INTO transcript_chunks VALUES (?,?,?)',('test',0,json.dumps([{'start':0,'text':'old synthetic'}])))
    def tearDown(self):
        server.DATA,server.DB=self.old;self.temp.cleanup()
    def row(self):
        with server.connect() as db:return dict(db.execute('SELECT * FROM meetings WHERE id=?',('test',)).fetchone())
    @patch.dict(os.environ,{'GROQ_API_KEY':'synthetic'})
    def test_summary_only_keeps_transcript(self):
        with patch('groq_pipeline.summarize',return_value='new summary'),patch('groq_pipeline.transcribe_segment') as transcribe:
            server.create_notes('test','summary')
        self.assertEqual(json.loads(self.row()['transcript'])[0]['text'],'old synthetic');self.assertEqual(self.row()['summary'],'new summary');transcribe.assert_not_called()
    @patch.dict(os.environ,{'GROQ_API_KEY':'synthetic'})
    def test_failed_retranscription_preserves_existing_work(self):
        with patch('groq_pipeline.duration',return_value=10),patch('groq_pipeline.transcribe_segment',side_effect=groq_pipeline.ProcessingError('synthetic error')):
            server.create_notes('test','both')
        row=self.row();self.assertEqual(row['status'],'error');self.assertEqual(json.loads(row['transcript'])[0]['text'],'old synthetic');self.assertEqual(row['summary'],'old summary')
    @patch.dict(os.environ,{'GROQ_API_KEY':'synthetic'})
    def test_transcript_only_replaces_transcript_and_invalidates_summary(self):
        with patch('groq_pipeline.duration',return_value=10),patch('groq_pipeline.transcribe_segment',return_value=[{'start':0,'text':'new synthetic'}]):
            server.create_notes('test','transcript')
        row=self.row();self.assertEqual(row['status'],'ready');self.assertEqual(json.loads(row['transcript'])[0]['text'],'new synthetic');self.assertIsNone(row['summary'])
