import uuid
from fastapi.testclient import TestClient
from sqlmodel import Session

from app import crud
from app.core.config import settings
from app.models import CommunityCreate, UserCreate, CommunityMemberRole, CommunityMemberStatus, CommunityMember
from app.tests.utils.utils import random_email, random_lower_string

def test_update_community_auth(
    client: TestClient, db: Session
) -> None:
    # Create user 1
    email = random_email()
    password = random_lower_string()
    user_in = UserCreate(email=email, password=password)
    user1 = crud.create_user(session=db, user_create=user_in)
    
    # Login user 1
    login_data = {
        "username": email,
        "password": password,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data)
    tokens = r.json()
    a_token = tokens["access_token"]
    headers1 = {"Authorization": f"Bearer {a_token}"}

    # Create user 2
    email2 = random_email()
    password = random_lower_string()
    user_in2 = UserCreate(email=email2, password=password)
    user2 = crud.create_user(session=db, user_create=user_in2)
    
    # Login user 2
    login_data2 = {
        "username": email2,
        "password": password,
    }
    r = client.post(f"{settings.API_V1_STR}/login/access-token", data=login_data2)
    tokens2 = r.json()
    a_token2 = tokens2["access_token"]
    headers2 = {"Authorization": f"Bearer {a_token2}"}
    
    # User 1 creates community
    community_in = CommunityCreate(name=random_lower_string(), description=random_lower_string())
    response = client.post(
        f"{settings.API_V1_STR}/communities/",
        headers=headers1,
        json=community_in.model_dump(),
    )
    assert response.status_code == 200
    community_id = response.json()["id"]
    
    # User 2 tries to update (should fail)
    data = {"name": "New Name"}
    response = client.patch(
        f"{settings.API_V1_STR}/communities/{community_id}",
        headers=headers2,
        json=data,
    )
    assert response.status_code == 400
    
    # Make user 2 admin
    member = CommunityMember(
        community_id=uuid.UUID(community_id), 
        user_id=user2.id, 
        role=CommunityMemberRole.ADMIN,
        status=CommunityMemberStatus.ACCEPTED
    )
    db.add(member)
    db.commit()
    
    # User 2 tries to update (should succeed)
    response = client.patch(
        f"{settings.API_V1_STR}/communities/{community_id}",
        headers=headers2,
        json=data,
    )
    assert response.status_code == 200
    assert response.json()["name"] == "New Name"
