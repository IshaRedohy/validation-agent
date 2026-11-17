import os
from pathlib import Path
from typing import Protocol

class Storage(Protocol):
    def put(self, key: str, content: bytes) -> None: ...
    def path(self, key: str) -> Path: ...

class LocalStorage:
    def __init__(self):
        self.root = Path(os.getenv('STORAGE_PATH', './data/documents')).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
    def path(self, key):
        target = (self.root / key).resolve()
        if target.parent != self.root: raise ValueError('Invalid storage key')
        return target
    def put(self, key, content):
        self.path(key).write_bytes(content)
