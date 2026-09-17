import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('env_loader', Path(__file__).with_name('run-with-env.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class EnvironmentLoaderTests(unittest.TestCase):
    def parse(self, content):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / '.env'
            path.write_text(content, encoding='utf-8')
            return module.load_env(path)

    def test_literal_hash_and_shell_characters_are_not_evaluated(self):
        values = self.parse("HASH='$2b$12$example'\nVALUE='$(never-run)'\n")
        self.assertEqual(values['HASH'], '$2b$12$example')
        self.assertEqual(values['VALUE'], '$(never-run)')

    def test_empty_values_comments_and_quoted_spaces(self):
        values = self.parse("# note\nEMPTY=\nPORT=9090 # note\nTEXT='hello # world'\n")
        self.assertEqual(values, {'EMPTY': '', 'PORT': '9090', 'TEXT': 'hello # world'})

    def test_invalid_entry_reports_line_without_secret(self):
        with self.assertRaisesRegex(ValueError, '^Invalid quoted entry on line 1$'):
            self.parse("PASSWORD='sensitive-value\n")


if __name__ == '__main__':
    unittest.main()
