import tempfile
import unittest
from pathlib import Path
import live_capture
import server

class DeleteMeetingTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.old=(server.DATA,server.DB)
        server.DATA=Path(self.tmp.name);server.DB=server.DATA/'test.sqlite3'
        self.mid='a'*32;self.other='b'*32
        with server.connect() as db:
            db.execute('CREATE TABLE meetings (id TEXT PRIMARY KEY,status TEXT,filename TEXT)')
            for table in ('transcript_chunks','summary_chunks','summary_requests','summary_preview','live_chunks','action_checks','chat_messages'):
                db.execute(f'CREATE TABLE {table} (meeting_id TEXT, value TEXT)')
                db.execute(f'INSERT INTO {table} VALUES (?,?)',(self.mid,'synthetic'))
                db.execute(f'INSERT INTO {table} VALUES (?,?)',(self.other,'synthetic'))
            db.execute('INSERT INTO meetings VALUES (?,?,?)',(self.mid,'ready',self.mid+'.wav'))
            db.execute('INSERT INTO meetings VALUES (?,?,?)',(self.other,'ready',self.other+'.wav'))
        (server.DATA/(self.mid+'.wav')).write_bytes(b'synthetic')
        (server.DATA/(self.other+'.wav')).write_bytes(b'other')
        directory=server.DATA/'live'/self.mid;directory.mkdir(parents=True);(directory/'chunk.wav').write_bytes(b'synthetic')
    def tearDown(self):
        server.DATA,server.DB=self.old;self.tmp.cleanup()
    def test_deletes_only_selected_meeting_and_its_private_files(self):
        server.delete_meeting(self.mid)
        self.assertFalse((server.DATA/(self.mid+'.wav')).exists())
        self.assertFalse((server.DATA/'live'/self.mid).exists())
        self.assertTrue((server.DATA/(self.other+'.wav')).exists())
        with server.connect() as db:
            self.assertEqual(db.execute('SELECT id FROM meetings').fetchone()[0],self.other)
            for table in ('transcript_chunks','summary_chunks','summary_requests','summary_preview','live_chunks','action_checks','chat_messages'):
                self.assertEqual(db.execute(f'SELECT meeting_id FROM {table}').fetchone()[0],self.other)
    def test_rejects_active_meeting_without_deleting_data(self):
        with server.connect() as db:db.execute('UPDATE meetings SET status=? WHERE id=?',('recording',self.mid))
        with self.assertRaises(ValueError):server.delete_meeting(self.mid)
        self.assertTrue((server.DATA/(self.mid+'.wav')).exists())
        with server.connect() as db:self.assertIsNotNone(db.execute('SELECT id FROM meetings WHERE id=?',(self.mid,)).fetchone())
