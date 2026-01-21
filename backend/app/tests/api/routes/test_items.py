import uuid
from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import UserCreate, Item

def get_superuser_token_headers(client: TestClient) -> dict[str, str]:
    login_data = {
        "username": settings.FIRST_SUPERUSER,
        "password": settings.FIRST_SUPERUSER_PASSWORD,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    a_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}
    return headers

def test_create_item(
    client: TestClient, db: Session
) -> None:
    # Ensure superuser exists
    user_in = UserCreate(
        email=settings.FIRST_SUPERUSER,
        password=settings.FIRST_SUPERUSER_PASSWORD,
        is_superuser=True,
    )
    user = crud.get_user_by_email(session=db, email=settings.FIRST_SUPERUSER)
    if not user:
        crud.create_user(session=db, user_create=user_in)
    
    headers = get_superuser_token_headers(client)
    data = {"title": "Foo", "description": "Bar", "item_type": "general"}
    response = client.post(
        f"{settings.API_V1_STR}/items/",
        headers=headers,
        data=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == data["title"]
    assert content["description"] == data["description"]
    assert "id" in content
    assert "created_at" in content

def test_read_item(
    client: TestClient, db: Session
) -> None:
    # Ensure superuser exists
    user_in = UserCreate(
        email=settings.FIRST_SUPERUSER,
        password=settings.FIRST_SUPERUSER_PASSWORD,
        is_superuser=True,
    )
    user = crud.get_user_by_email(session=db, email=settings.FIRST_SUPERUSER)
    if not user:
        user = crud.create_user(session=db, user_create=user_in)
    
    item = Item(title="Test Item", description="Test Description")
    item.owners.append(user)
    db.add(item)
    db.commit()
    db.refresh(item)
    
    headers = get_superuser_token_headers(client)
    response = client.get(
        f"{settings.API_V1_STR}/items/{item.id}",
        headers=headers,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["title"] == item.title
    assert content["description"] == item.description
    assert content["id"] == str(item.id)
    assert "created_at" in content
