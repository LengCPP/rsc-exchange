import logging
from io import BytesIO
from minio import Minio
from app.core.config import settings

logger = logging.getLogger(__name__)

# Initialize Minio client
# Inside Docker, MINIO_ENDPOINT is "minio"
minio_client = Minio(
    f"{settings.MINIO_ENDPOINT}:{settings.MINIO_PORT}",
    access_key=settings.MINIO_ROOT_USER,
    secret_key=settings.MINIO_ROOT_PASSWORD,
    secure=False
)

async def upload_image(file_data: bytes, file_name: str, folder: str = "item-images") -> str | None:
    """
    Upload an image to Minio and return the INTERNAL proxy URL.
    """
    try:
        if not minio_client.bucket_exists(settings.MINIO_STORAGE_BUCKET):
            minio_client.make_bucket(settings.MINIO_STORAGE_BUCKET)

        # Generate a safer filename or keep original
        file_path = f"{folder}/{file_name}"
        data = BytesIO(file_data)
        
        minio_client.put_object(
            settings.MINIO_STORAGE_BUCKET,
            file_path,
            data,
            len(file_data),
            content_type="image/png" # Could be dynamic
        )
        
        # We return the URL that points to our backend proxy endpoint
        # The backend endpoint will be /api/v1/storage/image/{folder}/{filename}
        # We use a relative path here, or absolute if we know the host
        # To be safe for both frontend and backend, we return the path part
        return f"/api/v1/storage/image/{file_path}"
    except Exception as e:
        logger.error(f"Minio upload failed: {e}")
        return None

async def delete_image(file_path: str) -> bool:
    """
    Delete an image from Minio.
    """
    try:
        # If it's a proxy URL, extract the path
        if "/api/v1/storage/image/" in file_path:
            file_path = file_path.split("/api/v1/storage/image/")[-1]
            
        minio_client.remove_object(settings.MINIO_STORAGE_BUCKET, file_path)
        return True
    except Exception as e:
        logger.error(f"Minio delete failed: {e}")
        return False

def get_proxy_url(file_path: str) -> str:
    """
    Construct the proxy URL for a given file path.
    """
    return f"/api/v1/storage/image/{file_path}"