from pathlib import Path
from uuid import uuid4

from .settings import settings


class ObjectStorage:
    def __init__(self) -> None:
        self.root = Path(settings.object_storage_dir)
        self.root.mkdir(parents=True, exist_ok=True)

    def put(self, filename: str, content: bytes) -> str:
        key = f'raw/{uuid4()}-{Path(filename).name}'
        target = self.root / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(content)
        return key

    def exists(self, key: str) -> bool:
        return (self.root / key).is_file()


storage = ObjectStorage()
