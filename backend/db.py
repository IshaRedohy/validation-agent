import os
from pathlib import Path
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb

URL = os.getenv('DATABASE_URL', 'postgresql://validation:validation@localhost:5433/validation')

def connect():
    return psycopg.connect(URL, row_factory=dict_row)

def initialize():
    with connect() as c:
        c.execute('SELECT pg_advisory_xact_lock(84620301)')
        c.execute(Path(__file__).with_name('schema.sql').read_text())

def event(c, project_id, kind, payload):
    c.execute('INSERT INTO events(project_id,kind,payload) VALUES (%s,%s,%s)', (project_id, kind, Jsonb(payload)))
