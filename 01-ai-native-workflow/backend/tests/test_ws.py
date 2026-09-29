import anyio
from sqlalchemy import select

from app.models import User, UserStatus
from app.ws import manager

PASSWORD = "password123"


def register(client, email, name="User"):
    return client.post(
        "/auth/register",
        json={"email": email, "password": PASSWORD, "display_name": name},
    )


def login(client, email):
    return client.post("/auth/login", json={"email": email, "password": PASSWORD})


def make_approved_member(client, db_session, email, name):
    register(client, email, name)
    user = db_session.scalar(select(User).where(User.email == email))
    user.status = UserStatus.approved
    db_session.commit()
    return user


def token_for(client, email):
    return login(client, email).json()["access_token"]


def test_valid_token_connects_and_stays_open(client, db_session):
    make_approved_member(client, db_session, "anna@example.com", "Anna")
    token = token_for(client, "anna@example.com")

    with client.websocket_connect(f"/ws?token={token}"):
        assert len(manager.active_connections) == 1
    assert len(manager.active_connections) == 0


def test_missing_token_is_closed_with_1008(client):
    try:
        with client.websocket_connect("/ws") as ws:
            ws.receive_text()
        assert False, "expected the connection to be closed"
    except Exception as exc:
        assert "1008" in str(exc) or getattr(exc, "code", None) == 1008


def test_invalid_token_is_closed_with_1008(client):
    try:
        with client.websocket_connect("/ws?token=not-a-real-token") as ws:
            ws.receive_text()
        assert False, "expected the connection to be closed"
    except Exception as exc:
        assert "1008" in str(exc) or getattr(exc, "code", None) == 1008


def test_broadcast_reaches_two_connected_clients(client, db_session):
    make_approved_member(client, db_session, "anna@example.com", "Anna")
    make_approved_member(client, db_session, "bob@example.com", "Bob")
    anna_token = token_for(client, "anna@example.com")
    bob_token = token_for(client, "bob@example.com")

    with client.websocket_connect(f"/ws?token={anna_token}") as anna_ws:
        with client.websocket_connect(f"/ws?token={bob_token}") as bob_ws:
            anyio.run(manager.broadcast, {"type": "test", "payload": {"n": 1}})

            assert anna_ws.receive_json() == {"type": "test", "payload": {"n": 1}}
            assert bob_ws.receive_json() == {"type": "test", "payload": {"n": 1}}


def test_disconnected_client_does_not_break_later_broadcast(client, db_session):
    make_approved_member(client, db_session, "anna@example.com", "Anna")
    make_approved_member(client, db_session, "bob@example.com", "Bob")
    anna_token = token_for(client, "anna@example.com")
    bob_token = token_for(client, "bob@example.com")

    with client.websocket_connect(f"/ws?token={anna_token}") as anna_ws:
        with client.websocket_connect(f"/ws?token={bob_token}"):
            pass  # bob disconnects immediately when this block exits

        anyio.run(manager.broadcast, {"type": "test", "payload": {"n": 2}})

        assert anna_ws.receive_json() == {"type": "test", "payload": {"n": 2}}
