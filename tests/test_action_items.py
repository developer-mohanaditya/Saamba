import unittest
import server

class ActionItemsTests(unittest.TestCase):
    def test_items_have_stable_keys_and_only_explicit_citations(self):
        summary='**Summary**\nSynthetic notes.\n\n**Action Items**\n- Send the draft [1:23]\n- Schedule a review\n\n**Decisions**\n- Decide later'
        items=server.action_items(summary)
        self.assertEqual(len(items),2)
        self.assertEqual(items[0]['start'],83)
        self.assertIsNone(items[1]['start'])
        self.assertTrue(server.action_items(summary,{items[0]['key']:1})[0]['checked'])
        self.assertEqual(items[1]['key'],server.action_items(summary)[1]['key'])
