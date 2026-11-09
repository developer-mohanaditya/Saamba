import asyncio
import io
import json
import os
import tempfile
import unittest
import wave
from pathlib import Path
from unittest.mock import patch, MagicMock

import httpx
import server
import live_capture

def make_valid_wav():
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(16000)
        w.writeframes(b'\x00\x00' * 160)
    return buf.getvalue()

class FastAPIExtensiveEndpointTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.old_data = server.DATA
        self.old_db = server.DB
        server.DATA = Path(self.temp.name)
        server.DB = server.DATA / 'test.sqlite3'
        
        with server.connect() as db:
            server.init_db(db)

            # Insert sample ready meeting
            self.mid = '11111111111111111111111111111111'
            audio_file = server.DATA / f'{self.mid}.webm'
            audio_file.write_bytes(b'G_TEST_AUDIO_BYTES_12345678901234567890')
            
            transcript_data = [
                {'start': 0.0, 'speaker': 'Alice', 'text': 'Hello everyone, welcome.'},
                {'start': 5.5, 'speaker': 'Bob', 'text': 'Thanks Alice. We should deploy the new API today.'}
            ]
            summary_text = "### Summary\nTeam discussed deployment.\n\n### Action Items\n- [ ] Deploy new FastAPI backend [0:05] (Bob)"
            
            db.execute(
                'INSERT INTO meetings VALUES (?,?,?,?,?,?,?,?,?)',
                (self.mid, 'Q4 Roadmap & Launch', '2026-11-09T01:00:00Z', f'{self.mid}.webm', 'video/webm', 'ready', None, json.dumps(transcript_data), summary_text)
            )

        self.transport = httpx.ASGITransport(app=server.app)
        self.client = httpx.AsyncClient(transport=self.transport, base_url='http://127.0.0.1:24917')

    async def asyncTearDown(self):
        await self.client.aclose()
        server.DATA = self.old_data
        server.DB = self.old_db
        self.temp.cleanup()

    # --- 1. Static Files & Root Routes ---
    async def test_static_routes(self):
        res = await self.client.get('/')
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/html', res.headers.get('content-type', ''))
        self.assertIn('<!doctype html>', res.text.lower())
        self.assertEqual(res.headers.get('cache-control'), 'no-cache, no-store, must-revalidate')

        for path, mime in [
            ('/classic', 'text/html'),
            ('/app.js', 'javascript'),
            ('/style.css', 'text/css'),
            ('/classic-app.js', 'javascript'),
            ('/classic-style.css', 'text/css'),
            ('/capture.js', 'javascript'),
            ('/capture-worklet.js', 'javascript'),
            ('/js/main.js', 'javascript'),
            ('/js/utils.js', 'javascript'),
        ]:
            r = await self.client.get(path)
            self.assertEqual(r.status_code, 200, f'Failed on {path}')
            self.assertIn(mime, r.headers.get('content-type', ''))

    # --- 2. OpenAPI Documentation ---
    async def test_openapi_docs(self):
        docs_res = await self.client.get('/docs')
        self.assertEqual(docs_res.status_code, 200)
        openapi_res = await self.client.get('/openapi.json')
        self.assertEqual(openapi_res.status_code, 200)
        data = openapi_res.json()
        self.assertEqual(data['info']['title'], 'Saamba API')
        self.assertIn('/api/meetings', data['paths'])
        self.assertIn('/api/ask', data['paths'])

    # --- 3. Meeting Listing & Details ---
    async def test_meeting_list_and_detail(self):
        # List
        res = await self.client.get('/api/meetings')
        self.assertEqual(res.status_code, 200)
        meetings = res.json()
        self.assertEqual(len(meetings), 1)
        self.assertEqual(meetings[0]['id'], self.mid)
        self.assertEqual(meetings[0]['has_summary'], 1)
        self.assertEqual(meetings[0]['has_transcript'], 1)

        # Detail
        res_detail = await self.client.get(f'/api/meetings/{self.mid}')
        self.assertEqual(res_detail.status_code, 200)
        detail = res_detail.json()
        self.assertEqual(detail['title'], 'Q4 Roadmap & Launch')
        self.assertEqual(len(detail['transcript']), 2)
        self.assertEqual(len(detail['action_items']), 1)
        self.assertNotIn('filename', detail)

        # Missing detail
        res_404 = await self.client.get('/api/meetings/nonexistent123')
        self.assertEqual(res_404.status_code, 404)
        self.assertEqual(res_404.json(), {'error': 'Meeting not found'})

    # --- 4. Share HTML Snapshot ---
    async def test_share_snapshot(self):
        res = await self.client.get(f'/share/{self.mid}')
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/html', res.headers.get('content-type', ''))
        self.assertIn('Q4 Roadmap & Launch', res.text)
        self.assertIn('Team discussed deployment.', res.text)

        res_missing = await self.client.get('/share/unknown')
        self.assertEqual(res_missing.status_code, 404)

    # --- 5. Transcript Download Formats ---
    async def test_transcript_download_formats(self):
        # TXT
        res_txt = await self.client.get(f'/api/meetings/{self.mid}/transcript/download?format=txt')
        self.assertEqual(res_txt.status_code, 200)
        self.assertIn('text/plain', res_txt.headers.get('content-type', ''))
        self.assertIn('Alice:', res_txt.text)
        self.assertIn('attachment;', res_txt.headers.get('content-disposition', ''))

        # Markdown
        res_md = await self.client.get(f'/api/meetings/{self.mid}/transcript/download?format=md')
        self.assertEqual(res_md.status_code, 200)
        self.assertIn('text/markdown', res_md.headers.get('content-type', ''))
        self.assertIn('**[00:00] Alice:**', res_md.text)

        # PDF / Print HTML
        res_pdf = await self.client.get(f'/api/meetings/{self.mid}/transcript/download?format=pdf')
        self.assertEqual(res_pdf.status_code, 200)
        self.assertIn('text/html', res_pdf.headers.get('content-type', ''))
        self.assertIn('window.print()', res_pdf.text)

    # --- 6. Recording Media Download ---
    async def test_recording_download(self):
        # WebM direct streaming
        res = await self.client.get(f'/api/meetings/{self.mid}/download?format=webm')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.headers.get('content-type'), 'video/webm')
        self.assertEqual(res.headers.get('content-length'), str(len(b'G_TEST_AUDIO_BYTES_12345678901234567890')))
        self.assertEqual(res.headers.get('x-total-bytes'), str(len(b'G_TEST_AUDIO_BYTES_12345678901234567890')))
        self.assertEqual(res.content, b'G_TEST_AUDIO_BYTES_12345678901234567890')

        # Invalid format
        res_bad = await self.client.get(f'/api/meetings/{self.mid}/download?format=flv')
        self.assertEqual(res_bad.status_code, 400)

    # --- 7. Audio Streaming with HTTP Range Requests ---
    async def test_audio_range_requests(self):
        # Full content
        res = await self.client.get(f'/api/meetings/{self.mid}/audio')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.content, b'G_TEST_AUDIO_BYTES_12345678901234567890')

        # Range request (bytes=0-9)
        res_range = await self.client.get(f'/api/meetings/{self.mid}/audio', headers={'Range': 'bytes=0-9'})
        self.assertEqual(res_range.status_code, 206)
        self.assertEqual(res_range.content, b'G_TEST_AUD')
        self.assertEqual(res_range.headers.get('content-range'), 'bytes 0-9/39')

        # Invalid range
        res_inv = await self.client.get(f'/api/meetings/{self.mid}/audio', headers={'Range': 'bytes=100-200'})
        self.assertEqual(res_inv.status_code, 416)

    # --- 8. SSE Events Endpoint ---
    async def test_sse_events(self):
        res = await self.client.get(f'/api/meetings/{self.mid}/events?max_events=1')
        self.assertEqual(res.status_code, 200)
        self.assertIn('text/event-stream', res.headers.get('content-type', ''))
        self.assertIn('event: init', res.text)
        self.assertIn('data: {"status": "ready"}', res.text)

    # --- 9. Meeting Rename ---
    async def test_meeting_rename(self):
        res = await self.client.post(
            f'/api/meetings/{self.mid}/rename',
            json={'title': 'Updated Title Here'}
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'ok': True})
        
        with server.connect() as db:
            title = db.execute('SELECT title FROM meetings WHERE id=?', (self.mid,)).fetchone()[0]
            self.assertEqual(title, 'Updated Title Here')

        # Empty title rejection
        res_bad = await self.client.post(f'/api/meetings/{self.mid}/rename', json={'title': '  '})
        self.assertEqual(res_bad.status_code, 400)

    # --- 10. Speaker Reassignment & Renaming ---
    async def test_speakers_api(self):
        # Rename speaker Alice -> Dr. Alice
        res_rename = await self.client.post(
            f'/api/meetings/{self.mid}/speakers',
            json={'action': 'rename', 'from': 'Alice', 'to': 'Dr. Alice'}
        )
        self.assertEqual(res_rename.status_code, 200)
        
        res_get = await self.client.get(f'/api/meetings/{self.mid}')
        segments = res_get.json()['transcript']
        self.assertEqual(segments[0]['speaker'], 'Dr. Alice')

        # Reassign index 1 to Charlie
        res_reassign = await self.client.post(
            f'/api/meetings/{self.mid}/speakers',
            json={'action': 'reassign', 'index': 1, 'speaker': 'Charlie'}
        )
        self.assertEqual(res_reassign.status_code, 200)
        res_get2 = await self.client.get(f'/api/meetings/{self.mid}')
        self.assertEqual(res_get2.json()['transcript'][1]['speaker'], 'Charlie')

    # --- 11. Action Items Check / Uncheck ---
    async def test_action_items(self):
        detail = (await self.client.get(f'/api/meetings/{self.mid}')).json()
        item_key = detail['action_items'][0]['key']

        # Check item
        res = await self.client.post(
            f'/api/meetings/{self.mid}/action-check',
            json={'key': item_key, 'checked': True}
        )
        self.assertEqual(res.status_code, 200)
        detail_after = (await self.client.get(f'/api/meetings/{self.mid}')).json()
        self.assertTrue(detail_after['action_items'][0]['checked'])

        # Bad key
        res_bad = await self.client.post(
            f'/api/meetings/{self.mid}/action-check',
            json={'key': 'non_existent_key', 'checked': True}
        )
        self.assertEqual(res_bad.status_code, 400)

    # --- 12. File Upload (Raw Audio/Video) ---
    async def test_meeting_upload(self):
        raw_audio = make_valid_wav()
        with patch('server.process') as mock_process:
            res = await self.client.post(
                '/api/meetings',
                content=raw_audio,
                headers={
                    'Content-Type': 'audio/wav',
                    'Content-Length': str(len(raw_audio)),
                    'X-Meeting-Title': 'Uploaded%20Standup'
                }
            )
            self.assertEqual(res.status_code, 201)
            new_id = res.json().get('id')
            self.assertTrue(new_id)
            mock_process.assert_called_once_with(new_id)

    # --- 13. Live Capture Flow ---
    async def test_live_capture_flow(self):
        # Start
        res_start = await self.client.post('/api/live/start', headers={'X-Meeting-Title': 'Live%20Meeting'})
        self.assertEqual(res_start.status_code, 201)
        live_id = res_start.json()['id']

        # Chunk with valid WAV bytes
        wav_chunk = make_valid_wav()
        res_chunk = await self.client.post(
            f'/api/live/{live_id}/chunk',
            content=wav_chunk,
            headers={'Content-Length': str(len(wav_chunk)), 'X-Chunk-Index': '0'}
        )
        self.assertEqual(res_chunk.status_code, 200)

        # Video chunk
        video_chunk = b'\x1a\x45\xdf\xa3' + b'\x00' * 50
        res_vchunk = await self.client.post(
            f'/api/live/{live_id}/video-chunk',
            content=video_chunk,
            headers={'Content-Length': str(len(video_chunk)), 'X-Chunk-Index': '0'}
        )
        self.assertEqual(res_vchunk.status_code, 200)

        # Finish
        with patch('live_capture.executor.submit') as mock_submit:
            res_finish = await self.client.post(
                f'/api/live/{live_id}/finish',
                headers={'X-Video-Chunks': '1'}
            )
            self.assertEqual(res_finish.status_code, 200)

    # --- 14. Stop & Retry Routes ---
    async def test_stop_and_retry(self):
        with server.connect() as db:
            db.execute('UPDATE meetings SET status=? WHERE id=?', ('transcribing', self.mid))
        
        # Stop
        res_stop = await self.client.post(f'/api/meetings/{self.mid}/stop')
        self.assertEqual(res_stop.status_code, 200)
        self.assertEqual(res_stop.json()['ok'], True)

        with server.connect() as db:
            status = db.execute('SELECT status FROM meetings WHERE id=?', (self.mid,)).fetchone()[0]
            self.assertEqual(status, 'ready')

        # Retry
        with patch('server.process') as mock_proc:
            res_retry = await self.client.post(f'/api/meetings/{self.mid}/retry')
            self.assertEqual(res_retry.status_code, 200)
            mock_proc.assert_called_once_with(self.mid)

    # --- 15. Origin Verification Middleware ---
    async def test_origin_verification(self):
        # Valid host origin
        res = await self.client.post(
            f'/api/meetings/{self.mid}/rename',
            json={'title': 'Allowed Origin'},
            headers={'Origin': 'http://127.0.0.1:24917', 'Host': '127.0.0.1:24917'}
        )
        self.assertEqual(res.status_code, 200)

        # Evil cross-site origin
        res_evil = await self.client.post(
            f'/api/meetings/{self.mid}/rename',
            json={'title': 'Hacked Title'},
            headers={'Origin': 'http://evil-site.com', 'Host': '127.0.0.1:24917'}
        )
        self.assertEqual(res_evil.status_code, 403)
        self.assertEqual(res_evil.json(), {'error': 'Invalid request origin'})

    # --- 16. Notes Action Modes (transcript, summary, both) ---
    async def test_notes_action_modes(self):
        with patch('server.create_notes') as mock_notes:
            for mode in ('transcript', 'summary', 'both'):
                # Reset status to ready first
                with server.connect() as db:
                    db.execute('UPDATE meetings SET status=? WHERE id=?', ('ready', self.mid))
                res = await self.client.post(f'/api/meetings/{self.mid}/{mode}')
                self.assertEqual(res.status_code, 200)
                self.assertEqual(res.json(), {'ok': True})

    # --- 17. Chat Messages & Ask Endpoint ---
    async def test_chat_and_ask(self):
        mock_groq_resp = {
            'choices': [{
                'message': {'content': 'The team discussed deploying the FastAPI backend today.'}
            }]
        }
        captured_payloads = []
        def mock_send(endpoint, body, content_type, key):
            captured_payloads.append(json.loads(body))
            return mock_groq_resp

        with patch.dict(os.environ, {'GROQ_API_KEY': 'test_key'}), patch('groq_pipeline.send', side_effect=mock_send):
            res = await self.client.post(
                '/api/ask',
                json={'question': 'What was discussed about deployment?', 'scope': 'this', 'meeting_id': self.mid}
            )
            self.assertEqual(res.status_code, 200)
            self.assertEqual(res.json()['answer'], 'The team discussed deploying the FastAPI backend today.')
            self.assertIn('Saamba Assistant', captured_payloads[0]['messages'][0]['content'])
            self.assertIn('prompt injection', captured_payloads[0]['messages'][0]['content'])

        # Retrieve chat messages
        res_chat = await self.client.get(f'/api/meetings/{self.mid}/chat')
        self.assertEqual(res_chat.status_code, 200)
        messages = res_chat.json()
        self.assertEqual(len(messages), 2)
        self.assertEqual(messages[0]['role'], 'user')
        self.assertEqual(messages[1]['role'], 'assistant')

    # --- 18. Translations Endpoint ---
    async def test_translations(self):
        # Empty translation list
        res_list = await self.client.get(f'/api/meetings/{self.mid}/translations')
        self.assertEqual(res_list.status_code, 200)
        self.assertEqual(res_list.json(), [])

        # Perform translation
        with patch.dict(os.environ, {'GEMINI_API_KEY': 'test_gemini'}), \
             patch('gemini_pipeline.translate_transcript', return_value=[{'start': 0.0, 'speaker': 'Alice', 'text': 'Hola a todos.'}]), \
             patch('gemini_pipeline.translate_summary', return_value='### Resumen\nEl equipo discutió el despliegue.'):
            
            res_trans = await self.client.post(
                f'/api/meetings/{self.mid}/translate',
                json={'language_code': 'es', 'language_name': 'Spanish'}
            )
            self.assertEqual(res_trans.status_code, 200)
            data = res_trans.json()
            self.assertEqual(data['language_code'], 'es')
            self.assertEqual(data['language_name'], 'Spanish')

        # Check translation detail
        res_detail = await self.client.get(f'/api/meetings/{self.mid}/translations/es')
        self.assertEqual(res_detail.status_code, 200)
        self.assertEqual(res_detail.json()['language_name'], 'Spanish')

    # --- 19. Delete Meeting ---
    async def test_delete_meeting(self):
        res = await self.client.post(f'/api/meetings/{self.mid}/delete')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), {'ok': True})
        
        with server.connect() as db:
            row = db.execute('SELECT 1 FROM meetings WHERE id=?', (self.mid,)).fetchone()
            self.assertIsNone(row)
        self.assertFalse((server.DATA / f'{self.mid}.webm').exists())

    # --- 20. Workspace Backend (SQLite Persistence & Sync) ---
    async def test_workspace_crud_and_sync(self):
        # 1. Initial list: should have default workspace ('My meetings' with 'users' icon)
        res = await self.client.get('/api/workspaces')
        self.assertEqual(res.status_code, 200)
        data = res.json()
        workspaces = data['workspaces']
        self.assertTrue(any(w['id'] == 'default' and w['name'] == 'My meetings' and w['icon'] == 'users' for w in workspaces))

        # 2. Create a new workspace
        res_create = await self.client.post(
            '/api/workspaces',
            json={'name': 'Engineering Sync', 'icon': 'code'}
        )
        self.assertEqual(res_create.status_code, 201)
        created = res_create.json()
        self.assertEqual(created['name'], 'Engineering Sync')
        self.assertEqual(created['icon'], 'code')
        ws_id = created['id']

        # 3. Assign meeting to the workspace
        res_assign = await self.client.post(
            f'/api/workspaces/{ws_id}/meetings',
            json={'meeting_id': self.mid, 'action': 'add'}
        )
        self.assertEqual(res_assign.status_code, 200)
        self.assertIn(self.mid, res_assign.json()['meeting_ids'])

        # Verify listing shows updated meeting count
        res_list = await self.client.get('/api/workspaces')
        ws_entry = next(w for w in res_list.json()['workspaces'] if w['id'] == ws_id)
        self.assertEqual(ws_entry['meeting_count'], 1)
        self.assertIn(self.mid, ws_entry['meeting_ids'])

        # 4. Sync from localStorage format
        sync_payload = {
            'workspaces': [
                {'id': 'ws-local-test', 'name': 'Class', 'icon': 'book'}
            ],
            'workspace_meetings': {
                'ws-local-test': [self.mid]
            }
        }
        res_sync = await self.client.post('/api/workspaces/sync', json=sync_payload)
        self.assertEqual(res_sync.status_code, 200)
        sync_data = res_sync.json()
        sync_workspaces = sync_data['workspaces']
        self.assertTrue(any(w['name'] == 'Class' for w in sync_workspaces))

        # 5. Prevent deleting default workspace
        res_del_def = await self.client.post('/api/workspaces/default/delete')
        self.assertEqual(res_del_def.status_code, 400)

        # 6. Delete custom workspace
        res_del = await self.client.post(f'/api/workspaces/{ws_id}/delete')
        self.assertEqual(res_del.status_code, 200)
        res_check = await self.client.get('/api/workspaces')
        self.assertFalse(any(w['id'] == ws_id for w in res_check.json()['workspaces']))

if __name__ == '__main__':
    unittest.main()
