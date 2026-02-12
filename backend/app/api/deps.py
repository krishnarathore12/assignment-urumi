from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from app.db.session import get_session
from app.models.auth_schema import User, Session
from datetime import datetime

from urllib.parse import unquote

async def get_current_user(
    request: Request, session: AsyncSession = Depends(get_session)
) -> User:
    token = request.cookies.get("better-auth.session_token")
    if token:
        token = unquote(token)
        # better-auth stores the cookie as "token.signatureHash"
        # but the DB session.token column only stores the token part (before the dot)
        if "." in token:
            token = token.split(".")[0]
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # Query session from DB
    stmt = select(Session).where(Session.token == token)
    result = await session.execute(stmt)
    db_session = result.scalar_one_or_none()

    if not db_session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )

    if db_session.expires_at < datetime.now():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
        )

    # Query user from DB
    stmt = select(User).where(User.id == db_session.user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user
