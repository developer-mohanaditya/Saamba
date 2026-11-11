"""
Cloudflare R2 Object Storage Manager for Saamba.
Provides S3-compatible upload, download, streaming, and deletion for meeting recordings.
"""
import os
import logging
from pathlib import Path
from typing import Optional

logger = logging.getLogger("saamba.storage")

class R2Storage:
    def __init__(self):
        self.account_id = os.environ.get("R2_ACCOUNT_ID")
        self.access_key = os.environ.get("R2_ACCESS_KEY_ID")
        self.secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
        self.bucket = os.environ.get("R2_BUCKET_NAME", "saamba-media")
        self.endpoint = os.environ.get(
            "R2_ENDPOINT_URL",
            f"https://{self.account_id}.r2.cloudflarestorage.com" if self.account_id else None
        )
        self._client = None

    @property
    def is_configured(self) -> bool:
        return bool(self.access_key and self.secret_key and self.endpoint)

    @property
    def client(self):
        if not self._client and self.is_configured:
            import boto3
            self._client = boto3.client(
                service_name="s3",
                endpoint_url=self.endpoint,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name="auto"
            )
        return self._client

    def upload_file(self, file_path: Path, object_key: Optional[str] = None) -> bool:
        if not self.is_configured or not file_path.exists():
            return False
        key = object_key or file_path.name
        try:
            self.client.upload_file(str(file_path), self.bucket, key)
            logger.info(f"Successfully uploaded {key} to R2 bucket {self.bucket}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload {key} to R2: {e}")
            return False

    def download_file(self, object_key: str, target_path: Path) -> bool:
        if not self.is_configured:
            return False
        try:
            target_path.parent.mkdir(parents=True, exist_ok=True)
            self.client.download_file(self.bucket, object_key, str(target_path))
            return True
        except Exception as e:
            logger.error(f"Failed to download {object_key} from R2: {e}")
            return False

    def exists(self, object_key: str) -> bool:
        if not self.is_configured:
            return False
        try:
            self.client.head_object(Bucket=self.bucket, Key=object_key)
            return True
        except Exception:
            return False

    def delete_file(self, object_key: str) -> bool:
        if not self.is_configured:
            return False
        try:
            self.client.delete_object(Bucket=self.bucket, Key=object_key)
            logger.info(f"Deleted {object_key} from R2 bucket {self.bucket}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete {object_key} from R2: {e}")
            return False

    def generate_presigned_url(self, object_key: str, expires_in: int = 3600) -> Optional[str]:
        if not self.is_configured:
            return None
        try:
            return self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": object_key},
                ExpiresIn=expires_in
            )
        except Exception as e:
            logger.error(f"Failed to generate presigned URL for {object_key}: {e}")
            return None

    def generate_upload_url(self, object_key: str, content_type: str = "application/octet-stream", expires_in: int = 3600) -> Optional[str]:
        if not self.is_configured:
            return None
        try:
            return self.client.generate_presigned_url(
                "put_object",
                Params={"Bucket": self.bucket, "Key": object_key, "ContentType": content_type},
                ExpiresIn=expires_in
            )
        except Exception as e:
            logger.error(f"Failed to generate upload presigned URL for {object_key}: {e}")
            return None

storage = R2Storage()
