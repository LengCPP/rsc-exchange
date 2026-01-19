import logging
from typing import Any
from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from app.api.deps import CurrentUser
from app.storage import upload_image, delete_image, minio_client
from app.core.config import settings
from app.models import Message

router = APIRouter(prefix="/storage", tags=["storage"])
logger = logging.getLogger(__name__)

@router.post("/upload", response_model=Message)
async def upload(
    *,
    current_user: CurrentUser,
    file: UploadFile = File(...)
) -> Any:
    """
    Upload an image.
    """
    contents = await file.read()
    url = await upload_image(contents, file.filename)
    if not url:
        raise HTTPException(status_code=500, detail="Failed to upload image")
    return Message(message=url)

@router.get("/image/{folder}/{filename}")
async def get_image(folder: str, filename: str):
    """
    Get an image from Minio and stream it.
    """
    try:
        object_name = f"{folder}/{filename}"
        # response is a urllib3.response.HTTPResponse object which is a stream
        response = minio_client.get_object(settings.MINIO_STORAGE_BUCKET, object_name)
        
        # We should ideally set the correct media type
        media_type = "image/png"
        if filename.lower().endswith(".jpg") or filename.lower().endswith(".jpeg"):
            media_type = "image/jpeg"
        elif filename.lower().endswith(".gif"):
            media_type = "image/gif"
            
        return StreamingResponse(response, media_type=media_type)
    except Exception as e:
        logger.error(f"Failed to get image {folder}/{filename}: {e}")
        raise HTTPException(status_code=404, detail="Image not found")

@router.delete("/image/{folder}/{filename}", response_model=Message)
async def delete(
    folder: str,
    filename: str,
    current_user: CurrentUser
) -> Any:
    """
    Delete an image.
    """
    file_path = f"{folder}/{filename}"
    success = await delete_image(file_path)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete image")
    return Message(message="Image deleted successfully")