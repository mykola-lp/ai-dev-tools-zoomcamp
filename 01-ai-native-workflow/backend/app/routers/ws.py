import jwt
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import User, UserStatus
from app.security import decode_access_token
from app.ws import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str | None = None,
    db: Session = Depends(get_db),
) -> None:
    await websocket.accept()

    user = None
    if token is not None:
        try:
            payload = decode_access_token(token)
            user_id = int(payload["sub"])
            user = db.get(User, user_id)
        except (jwt.PyJWTError, KeyError, ValueError):
            user = None

    if user is None or user.status != UserStatus.approved:
        await websocket.close(code=1008)
        return

    manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
