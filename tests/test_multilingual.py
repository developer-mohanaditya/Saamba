import json
import os
import unittest
from unittest.mock import patch
from types import SimpleNamespace
import groq_pipeline

class MultilingualTests(unittest.TestCase):
    def transcription_body(self, language=None):
        env = {'SAAMBA_TRANSCRIPTION_LANGUAGE': language} if language is not None else {}
        with patch.dict(os.environ, env, clear=True), patch('groq_pipeline.subprocess.run', return_value=SimpleNamespace(stdout=b'synthetic wav')), patch('groq_pipeline.send', return_value={'segments': []}) as send:
            groq_pipeline.transcribe_segment('synthetic.wav', 0, 'synthetic-key')
            return send.call_args.args[1]

    def test_automatic_detection_by_default_and_language_override(self):
        self.assertNotIn(b'name="language"', self.transcription_body())
        self.assertIn(b'name="language"\r\n\r\nte\r\n', self.transcription_body('te'))
        self.assertNotIn(b'name="language"', self.transcription_body('auto'))
        self.assertIn(b'name="language"\r\n\r\nen\r\n', self.transcription_body('en'))

    def test_translation_precedes_english_summary_and_is_cached(self):
        requests=[]; cache={}
        def send(path,body,*args):
            payload=json.loads(body); requests.append(payload)
            text='Translated synthetic text' if len(requests)==1 else 'English synthetic summary'
            return {'choices':[{'finish_reason':'stop','message':{'content':text}}]}
        with patch('groq_pipeline.send',side_effect=send):
            segments=[{'start':0,'text':'synthetic Telugu and English'}]
            result=groq_pipeline.summarize(segments,'synthetic-key',cache.get,cache.__setitem__)
            self.assertEqual(result,'English synthetic summary')
            self.assertIn('Translate',requests[0]['messages'][0]['content'])
            self.assertEqual(requests[1]['messages'][1]['content'],'Translated synthetic text')
            self.assertIn('in English',requests[1]['messages'][0]['content'])
            self.assertEqual(groq_pipeline.summarize(segments,'synthetic-key',cache.get,cache.__setitem__),result)
            self.assertEqual(len(requests),2)

class OutputLimitTests(unittest.TestCase):
    def test_long_translation_splits_and_does_not_accept_truncated_text(self):
        calls=[]
        def fake_send(path,body,*args):
            payload=json.loads(body); text=payload['messages'][1]['content']; instruction=payload['messages'][0]['content'];calls.append((instruction,text))
            is_translation='Translate' in instruction
            if is_translation and len(text)>180:
                return {'choices':[{'finish_reason':'length','message':{'content':'truncated'}}]}
            content=text if is_translation else 'synthetic summary'
            return {'choices':[{'finish_reason':'stop','message':{'content':content}}]}
        segments=[{'start':i,'text':'synthetic sentence '*4} for i in range(8)]
        with patch('groq_pipeline.send',side_effect=fake_send):
            self.assertEqual(groq_pipeline.summarize(segments,'synthetic'),'synthetic summary')
        translated_input=[t for instruction,t in calls if 'Summarize' in instruction][0]
        self.assertNotIn('truncated',translated_input)
        for i in range(8): self.assertIn(f'[{i:.1f}s]',translated_input)

class SummaryResumeTests(unittest.TestCase):
    def test_retry_reuses_completed_translation_after_limit(self):
        cache={};calls=[]
        def fake_send(path,body,*args):
            payload=json.loads(body); instruction=payload['messages'][0]['content'];calls.append(instruction)
            if 'Summarize' in instruction and sum('Summarize' in x for x in calls)==1:
                raise groq_pipeline.ProcessingError('synthetic limit')
            text='translated synthetic' if 'Translate' in instruction else 'finished synthetic summary'
            return {'choices':[{'finish_reason':'stop','message':{'content':text}}]}
        segments=[{'start':0,'text':'synthetic mixed conversation'}]
        with patch('groq_pipeline.send',side_effect=fake_send):
            with self.assertRaises(groq_pipeline.ProcessingError):
                groq_pipeline.summarize(segments,'synthetic',request_get=cache.get,request_set=cache.__setitem__)
            result=groq_pipeline.summarize(segments,'synthetic',request_get=cache.get,request_set=cache.__setitem__)
        self.assertEqual(result,'finished synthetic summary')
        self.assertEqual(sum('Translate' in x for x in calls),1)
        self.assertEqual(sum('Summarize' in x for x in calls),2)

class SummaryPreviewTests(unittest.TestCase):
    def test_summary_draft_is_emitted_only_after_a_complete_section(self):
        published=[]
        def fake_send(path,body,*args):
            instruction=json.loads(body)['messages'][0]['content']
            return {'choices':[{'finish_reason':'stop','message':{'content':'translated' if 'Translate' in instruction else 'draft section'}}]}
        with patch('groq_pipeline.send',side_effect=fake_send):
            result=groq_pipeline.summarize([{'start':0,'text':'synthetic'}],'test',on_partial=lambda parts,done,total:published.append((list(parts),done,total)))
        self.assertEqual(result,'draft section')
        self.assertEqual(published,[(['draft section'],1,1)])
