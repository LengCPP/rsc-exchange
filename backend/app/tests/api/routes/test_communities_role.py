import random
import string
from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import CommunityCreate, UserCreate, CommunityMemberRole

def random_lower_string() -> str:
    return "".join(random.choices(string.ascii_lowercase, k=32))

def random_email() -> str:
    return f"{random_lower_string()}@{random_lower_string()}.com"

def test_update_member_role(
    client: TestClient, db: Session
) -> None:
    # Create user 1 (Admin)
    email1 = random_email()
    password1 = random_lower_string()
    user_in1 = UserCreate(email=email1, password=password1)
    user1 = crud.create_user(session=db, user_create=user_in1)
    
    login_data1 = {"username": email1, "password": password1}
    r1 = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data1)
    headers1 = {"Authorization": f"Bearer {r1.json()['access_token']}"}

    # Create user 2 (Member)
    email2 = random_email()
    password2 = random_lower_string()
    user_in2 = UserCreate(email=email2, password=password2)
    user2 = crud.create_user(session=db, user_create=user_in2)
    
    login_data2 = {"username": email2, "password": password2}
    r2 = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data2)
    headers2 = {"Authorization": f"Bearer {r2.json()['access_token']}"}
    
    # User 1 creates community
    community_in = CommunityCreate(name=random_lower_string(), description=random_lower_string())
    response = client.post(
        f"{settings.API_V1_STR}/communities/",
        headers=headers1,
        json=community_in.model_dump(),
    )
    community_id = response.json()["id"]
    
    # User 2 joins community
    client.post(f"{settings.API_V1_STR}/communities/{community_id}/join", headers=headers2)
    
    # User 1 promotes User 2 to admin
    data = {"role": CommunityMemberRole.ADMIN}
    response = client.patch(
        f"{settings.API_V1_STR}/communities/{community_id}/members/{user2.id}",
        headers=headers1,
        json=data,
    )
    assert response.status_code == 200
    content = response.json()
    assert content["email"] == email2
    assert content["community_role"] == CommunityMemberRole.ADMIN
    
    # User 2 tries to promote themselves back to member (should succeed because they are admin now)
    data = {"role": CommunityMemberRole.MEMBER}
    response = client.patch(
        f"{settings.API_V1_STR}/communities/{community_id}/members/{user2.id}",
        headers=headers2,
        json=data,
    )
    assert response.status_code == 200
    assert response.json()["community_role"] == CommunityMemberRole.MEMBER

    # User 2 tries to promote themselves back to admin (should fail because they are member now)
    data = {"role": CommunityMemberRole.ADMIN}
    response = client.patch(
        f"{settings.API_V1_STR}/communities/{community_id}/members/{user2.id}",
        headers=headers2,
        json=data,
    )
    assert response.status_code == 400