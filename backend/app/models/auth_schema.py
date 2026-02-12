from sqlmodel import SQLModel, Field
from typing import Optional
from datetime import datetime

class User(SQLModel, table=True):
    __tablename__ = "user"
    id: str = Field(primary_key=True)
    name: str
    email: str
    email_verified: bool
    image: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class Session(SQLModel, table=True):
    __tablename__ = "session"
    id: str = Field(primary_key=True)
    expires_at: datetime
    token: str
    created_at: datetime
    updated_at: datetime
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    user_id: str = Field(foreign_key="user.id")
