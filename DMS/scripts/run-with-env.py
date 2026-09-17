"""Run a command with DMS/.env loaded without shell evaluation or logging values."""
import os
from pathlib import Path
import re
import subprocess
import sys


def load_env(path):
    values = {}
    for number, raw in enumerate(path.read_text(encoding='utf-8-sig').splitlines(), 1):
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        key, sep, value = line.partition('=')
        key, value = key.strip(), value.strip()
        if not sep or not re.fullmatch(r'[A-Za-z_][A-Za-z0-9_]*', key):
            raise ValueError(f'Invalid environment entry on line {number}')
        if value.startswith(('"', "'")):
            quote = value[0]
            end = value.find(quote, 1)
            if end < 0 or (value[end + 1:].strip() and not value[end + 1:].strip().startswith('#')):
                raise ValueError(f'Invalid quoted entry on line {number}')
            value = value[1:end]
        else:
            value = re.split(r'\s+#', value, maxsplit=1)[0].rstrip()
        values[key] = value
    return values


if __name__ == '__main__':
    if len(sys.argv) < 2:
        raise SystemExit('Usage: python scripts/run-with-env.py COMMAND [ARGUMENTS...]')
    root = Path(__file__).resolve().parent.parent
    environment = load_env(root / '.env')
    environment.update(os.environ)  # Explicit process configuration takes precedence.
    raise SystemExit(subprocess.call(sys.argv[1:], env=environment))
