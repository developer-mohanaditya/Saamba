"""
Sync meeting media files from local disk to Cloudflare R2 bucket saamba-media.
"""
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.append(str(ROOT))

env_file = ROOT / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip())

from storage_r2 import storage

DATA_DIR = ROOT / "data"

MEETING_FILES = [
    "a7f16012fb0c43c49cc806121d5bc324.audio",
    "bf0ad57c56544f8988bb5d3abfdb7c98.wav",
    "ab55a8a6efef4d8080a76db1ba38c51c.audio",
    "054aef68a0504d78a791773a56e3a4f9.wav",
    "65e034be3cca41c597760fc563a9d6c8.webm",
    "4c475d7b94344ffeb91a27c4a0df5347.wav",
    "76979353d2a84d07a59e4cca8f085218.webm",
    "bb730e31276945aaa54be49b52d57119.audio",
    "586399fdaa6147c5acdfb75d3ddfbf7a.webm",
    "8a2c03e2541b4a8f9a786b7cd92f45bd.audio",
    "21ee4fb04ee9436395e139524952494f.webm",
    "40cad5b850b34c2ab10072865c73c312.webm",
    "ebfc59dbeb424133a8b40afcd7665164.audio",
]

def main():
    if not storage.is_configured:
        print("Error: Cloudflare R2 is not configured in .env")
        sys.exit(1)

    print(f"Connecting to Cloudflare R2 bucket '{storage.bucket}'...")
    total = len(MEETING_FILES)
    for idx, filename in enumerate(MEETING_FILES, 1):
        file_path = DATA_DIR / filename
        if not file_path.exists():
            print(f"[{idx}/{total}] File missing locally: {filename}")
            continue

        size_mb = file_path.stat().st_size / (1024 * 1024)
        if storage.exists(filename):
            print(f"[{idx}/{total}] Already in R2: {filename} ({size_mb:.1f} MB)")
            continue

        print(f"[{idx}/{total}] Uploading {filename} ({size_mb:.1f} MB) to R2...")
        ok = storage.upload_file(file_path, filename)
        if ok:
            print(f"[{idx}/{total}] ✓ Uploaded: {filename}")
        else:
            print(f"[{idx}/{total}] ✗ Failed to upload: {filename}")

    print("\nAll meeting media synchronization to Cloudflare R2 completed!")

if __name__ == "__main__":
    main()
