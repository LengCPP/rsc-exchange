import uuid
import pytest
from sqlmodel import Session, SQLModel, create_engine, select
from app import crud
from app.models import User, UserCreate, Friendship, FriendshipStatus, UserUpdateMe, UserProfileUpdate

# Setup in-memory SQLite database for testing
engine = create_engine("sqlite://")

@pytest.fixture(name="session")
def session_fixture():
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session
    SQLModel.metadata.drop_all(engine)

def test_create_user_initializes_profiles(session: Session):
    email = "test@example.com"
    password = "password123"
    user_in = UserCreate(email=email, password=password)
    user = crud.create_user(session=session, user_create=user_in)
    
    assert user.email == email
    assert user.profile is not None
    assert user.settings == {}
    assert user.profile.user_id == user.id

def test_accept_friend_request_avoids_duplicates(session: Session):
    u1_in = UserCreate(email="u1@example.com", password="password")
    u2_in = UserCreate(email="u2@example.com", password="password")
    user1 = crud.create_user(session=session, user_create=u1_in)
    user2 = crud.create_user(session=session, user_create=u2_in)
    
    # Create request
    crud.create_friend_request(session=session, user_id=user1.id, friend_id=user2.id)
    
    # Accept
    crud.accept_friend_request(session=session, user_id=user1.id, friend_id=user2.id)
    
    # Verify both directions exist
    stmt1 = select(Friendship).where(Friendship.user_id == user1.id, Friendship.friend_id == user2.id)
    f1 = session.exec(stmt1).first()
    assert f1.status == FriendshipStatus.ACCEPTED
    
    stmt2 = select(Friendship).where(Friendship.user_id == user2.id, Friendship.friend_id == user1.id)
    f2 = session.exec(stmt2).first()
    assert f2.status == FriendshipStatus.ACCEPTED
    
    # Accept again (should not fail or create new entries)
    crud.accept_friend_request(session=session, user_id=user1.id, friend_id=user2.id)
    
    count_stmt = select(Friendship)
    all_friendships = session.exec(count_stmt).all()
    assert len(all_friendships) == 2

def test_user_input_validation():
    # Test bio validation
    profile_update = UserProfileUpdate(bio="  My bio  ")
    assert profile_update.bio == "My bio"
