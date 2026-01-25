import logging
import httpx
import secrets
from datetime import timedelta
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel

from app import crud
from app.api.deps import CurrentUser, SessionDep, get_current_active_superuser
from app.core import security
from app.core.config import settings
from app.core.security import get_password_hash
from app.models import Message, NewPassword, Token, UserPublic, UserCreate
from app.utils import (
    generate_password_reset_token,
    generate_reset_password_email,
    send_email,
    verify_password_reset_token,
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["login"])


@router.post("/login/access-token")
def login_access_token(
    session: SessionDep, form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
) -> Token:
    """
    OAuth2 compatible token login, get an access token for future requests
    """
    user = crud.authenticate(
        session=session, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return Token(
        access_token=security.create_access_token(
            user.id, expires_delta=access_token_expires
        )
    )


@router.post("/login/test-token", response_model=UserPublic)
def test_token(current_user: CurrentUser) -> Any:
    """
    Test access token
    """
    return current_user


@router.post("/password-recovery/{email}")
def recover_password(email: str, session: SessionDep) -> Message:
    """
    Password Recovery
    """
    user = crud.get_user_by_email(session=session, email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this email does not exist in the system.",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(
        email_to=user.email, email=email, token=password_reset_token
    )
    send_email(
        email_to=user.email,
        subject=email_data.subject,
        html_content=email_data.html_content,
    )
    return Message(message="Password recovery email sent")


@router.post("/reset-password/")
def reset_password(session: SessionDep, body: NewPassword) -> Message:
    """
    Reset password
    """
    email = verify_password_reset_token(token=body.token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = crud.get_user_by_email(session=session, email=email)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this email does not exist in the system.",
        )
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    hashed_password = get_password_hash(password=body.new_password)
    user.hashed_password = hashed_password
    session.add(user)
    session.commit()
    return Message(message="Password updated successfully")


@router.post(
    "/password-recovery-html-content/{email}",
    dependencies=[Depends(get_current_active_superuser)],
    response_class=HTMLResponse,
)
def recover_password_html_content(email: str, session: SessionDep) -> Any:
    """
    HTML Content for Password Recovery
    """
    user = crud.get_user_by_email(session=session, email=email)

    if not user:
        raise HTTPException(
            status_code=404,
            detail="The user with this username does not exist in the system.",
        )
    password_reset_token = generate_password_reset_token(email=email)
    email_data = generate_reset_password_email(
        email_to=user.email, email=email, token=password_reset_token
    )

    return HTMLResponse(
        content=email_data.html_content, headers={"subject:": email_data.subject}
    )


@router.get("/auth/google")
def login_google_init():
    """
    Initiate Google OAuth flow.
    """
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Client ID not configured")
        
    redirect_uri = f"{settings.API_V1_STR}/auth/google/callback"
    # Construct absolute URL if needed, but relative usually works if on same domain. 
    # Better to use absolute for OAuth redirects.
    # Assuming the API is accessible via the same host as the request or configured domain.
    # For simplicity, we'll try to use a hardcoded base or infer it. 
    # But strictly, we should direct the user to Google.
    
    # We need the full URL for the redirect_uri that Google will call back
    # Since we are running in docker/behind traefik, we might need a configured public URL.
    # For now, let's assume localhost:8000 or the request base url.
    
    # A safer bet for local dev is hardcoding or using a setting for API_PUBLIC_URL.
    # We will use http://localhost:8000 for local dev based on the user's prompt context.
    
    base_url = "http://localhost:8000" # Should ideally be in settings
    callback_url = f"{base_url}{settings.API_V1_STR}/auth/google/callback"
    
    google_auth_url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&response_type=code"
        f"&scope=openid%20email%20profile"
        f"&redirect_uri={callback_url}"
    )
    
    return RedirectResponse(google_auth_url)


@router.get("/auth/google/callback")
async def login_google_callback(
    code: str, session: SessionDep
):
    """
    Handle Google OAuth callback.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Google credentials not configured")
        
    base_url = "http://localhost:8000"
    callback_url = f"{base_url}{settings.API_V1_STR}/auth/google/callback"

    # Exchange code for token
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "client_secret": settings.GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": callback_url,
    }
    
    async with httpx.AsyncClient() as client:
        token_response = await client.post(token_url, data=data)
        if token_response.status_code != 200:
            logger.error(f"Google Token Exchange Failed: {token_response.text}")
            raise HTTPException(status_code=400, detail="Failed to get Google token")
            
        token_json = token_response.json()
        id_token = token_json.get("id_token")
        access_token = token_json.get("access_token")
        
        # Get user info
        user_info_response = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        if user_info_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info from Google")
            
        user_info = user_info_response.json()

    email = user_info.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google token missing email")
    
    full_name = user_info.get("name")
    
    user = crud.get_user_by_email(session=session, email=email)
    is_new_user = False
    if not user:
        # Create user if not exists
        random_password = secrets.token_urlsafe(24)
        user_create = UserCreate(
            email=email,
            password=random_password,
            full_name=full_name,
        )
        user = crud.create_user(session=session, user_create=user_create)
        # Google users start without a set password
        user.has_set_password = False
        session.add(user)
        session.commit()
        session.refresh(user)
        is_new_user = True
        logger.info(f"Created new user via Google: {email}")
    elif not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = security.create_access_token(
        user.id, expires_delta=access_token_expires
    )
    
    # Redirect to frontend with token
    # Using settings.FRONTEND_HOST
    frontend_redirect_url = f"{settings.FRONTEND_HOST}/login?token={token}"
    if is_new_user:
        frontend_redirect_url += "&new_user=true"
    return RedirectResponse(frontend_redirect_url)