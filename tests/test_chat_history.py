import json
import os
import tempfile
import threading
import unittest
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
import server

class ChatHistoryTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(); self.old=(server.DATA,server.DB)
        server.DATA=Path(self.temp.name); server.DB=server.DATA/'test.sqlite3'
        with server.connect() as db:
            db.execute('CREATE TABLE meetings (id TEXT PRIMARY KEY,title TEXT,summary TEXT,transcript TEXT)')
            db.execute('CREATE TABLE chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, meeting_id TEXT,role TEXT,content TEXT,scope TEXT,created_at TEXT)')
            db.execute('INSERT INTO meetings VALUES (?,?,?,?)',('synthetic','Synthetic','Synthetic notes',json.dumps([{'start':0,'text':'Synthetic transcript'}])))
        self.http=ThreadingHTTPServer(('127.0.0.1',0),server.Handler)
        self.thread=threading.Thread(target=self.http.serve_forever,daemon=True);self.thread.start()
    def tearDown(self):
        self.http.shutdown();self.http.server_close();self.thread.join();server.DATA,server.DB=self.old;self.temp.cleanup()
    def test_history_persists_and_next_question_receives_prior_messages(self):
        url=f'http://127.0.0.1:{self.http.server_port}'
        sent=[]
        def fake_send(path, body, content_type, key):
            sent.append(json.loads(body));return {'choices':[{'message':{'content':'Synthetic answer'}}]}
        with patch.dict(os.environ,{'GROQ_API_KEY':'synthetic'}),patch('groq_pipeline.send',side_effect=fake_send):
            for question in ('First synthetic question','Second synthetic question'):
                data=json.dumps({'meeting_id':'synthetic','question':question,'scope':'this'}).encode()
                with urllib.request.urlopen(urllib.request.Request(url+'/api/ask',data=data,headers={'Content-Type':'application/json'})) as response: self.assertEqual(response.status,200)
        with urllib.request.urlopen(url+'/api/meetings/synthetic/chat') as response: messages=json.load(response)
        self.assertEqual([x['role'] for x in messages],['user','assistant','user','assistant'])
        self.assertEqual(sent[1]['messages'][1]['content'],'First synthetic question')
        self.assertEqual(sent[1]['messages'][2]['content'],'Synthetic answer')
