import json
import tempfile
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
import server
import live_capture

class ActionRouteTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.old=(server.DATA,server.DB)
        server.DATA=Path(self.temp.name);server.DB=server.DATA/'test.sqlite3'
        with server.connect() as db:
            db.execute('CREATE TABLE meetings (id TEXT PRIMARY KEY,title TEXT,created_at TEXT,filename TEXT,mime TEXT,status TEXT,error TEXT,transcript TEXT,summary TEXT)')
            db.execute('CREATE TABLE transcript_chunks (meeting_id TEXT,chunk_index INTEGER,segments TEXT, PRIMARY KEY(meeting_id,chunk_index))')
            db.execute('CREATE TABLE summary_chunks (meeting_id TEXT,chunk_index INTEGER,summary TEXT, PRIMARY KEY(meeting_id,chunk_index))')
            live_capture.initialize(db)
            db.execute('INSERT INTO meetings VALUES (?,?,?,?,?,?,?,?,?)',('synthetic','Original','today','audio','audio/wav','ready',None,json.dumps([{'start':0,'text':'synthetic'}]),'synthetic summary'))
        self.http=ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
    def tearDown(self):
        self.http.shutdown();self.http.server_close();self.thread.join();server.DATA,server.DB=self.old;self.temp.cleanup()
    def post(self,action,body=b''):
        url=f'http://127.0.0.1:{self.http.server_port}/api/meetings/synthetic/{action}'
        with urllib.request.urlopen(urllib.request.Request(url,data=body,method='POST',headers={'Content-Type':'application/json'})) as response:
            return response.status
    def test_rename_and_summary_routes(self):
        self.assertEqual(self.post('rename',json.dumps({'title':'New name'}).encode()),200)
        with server.connect() as db:self.assertEqual(db.execute('SELECT title FROM meetings').fetchone()[0],'New name')
        with patch('server.create_notes') as job:
            self.assertEqual(self.post('summary'),200)
            job.assert_called_once_with('synthetic','summary')
