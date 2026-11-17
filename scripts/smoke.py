"""Live API smoke test. Requires running Postgres and API; creates a synthetic project."""
from pathlib import Path
import sys
import httpx

base = 'http://127.0.0.1:8000/api/v1'
with httpx.Client(base_url=base, timeout=30) as client:
    def checked(response): response.raise_for_status(); return response.json()
    project=checked(client.post('/projects',json={'name':'Synthetic smoke test'}))
    for role in ['assessment','requirements','methodology']:
        path=Path('samples')/(role+'.txt')
        doc=checked(client.post(f'/projects/{project["id"]}/documents',data={'role':role},files={'file':(path.name,path.read_bytes(),'text/plain')}))
        checked(client.put(f'/documents/{doc["id"]}/confirmation',json={k:doc['extraction'][k] for k in ['rows','requirements']}))
    job=checked(client.post(f'/projects/{project["id"]}/reviews'))
    print(f'Created review {job["id"]}. Inspect it in the UI; the worker runs semantic review asynchronously.')
