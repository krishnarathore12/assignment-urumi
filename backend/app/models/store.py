from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import Field, SQLModel
from enum import Enum

class StoreStatus(str, Enum):
    PROVISIONING = "PROVISIONING"
    READY = "READY"
    FAILED = "FAILED"

class Store(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str
    status: StoreStatus = Field(default=StoreStatus.PROVISIONING)
    url: Optional[str] = None
    admin_user: Optional[str] = None
    admin_password: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    user_id: str  # To link to the frontend user if needed
