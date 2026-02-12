import asyncio
import logging
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.api.deps import get_current_user
from app.db.session import get_session
from app.models.store import Store, StoreStatus
from app.services.store_service import StoreService
from pydantic import BaseModel
from uuid import UUID

router = APIRouter()
logger = logging.getLogger(__name__)

class StoreCreate(BaseModel):
    name: str

class StoreResponse(BaseModel):
    id: UUID
    name: str
    status: str
    url: str | None
    admin_user: str | None
    admin_password: str | None

@router.post("/", response_model=StoreResponse)
async def create_store(
    store_in: StoreCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Check if store exists
    # For now assume unique names are required globally or handle error in helm
    
    new_store = Store(name=store_in.name, status=StoreStatus.PROVISIONING, user_id=current_user.id)
    session.add(new_store)
    await session.commit()
    await session.refresh(new_store)
    
    # Trigger background task or just return and let websocket handle logs
    # We will use websocket for logs, but we need to trigger the process. 
    # To keep it simple, the websocket connection will trigger the actual install 
    # or we can use BackgroundTasks in FastAPI.
    
    return new_store

@router.websocket("/ws/{store_id}")
async def websocket_endpoint(websocket: WebSocket, store_id: str, session: AsyncSession = Depends(get_session)):
    await websocket.accept()
    
    store = await session.get(Store, store_id)
    if not store:
        await websocket.close(code=4004, reason="Store not found")
        return

    try:
        if store.status == StoreStatus.PROVISIONING:
            await websocket.send_text(f"Starting provisioning for {store.name}...")
            
            async for log_line in StoreService.install_helm_chart(store, session):
                await websocket.send_text(log_line)
            
            # Final status update
            await session.refresh(store)
            if store.status == StoreStatus.READY:
                await websocket.send_text("PROVISIONING_COMPLETE")
                await websocket.send_json({
                    "url": store.url,
                    "admin_user": store.admin_user,
                    "admin_password": store.admin_password
                })
            else:
                 await websocket.send_text("PROVISIONING_FAILED")

        else:
            await websocket.send_text(f"Store is already {store.status}")
            
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for store {store_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_text(f"Error: {str(e)}")
        except Exception:
            pass  # Client already disconnected
    finally:
        try:
            await websocket.close()
        except Exception:
            pass  # Already closed

@router.get("/", response_model=List[Store])
async def list_stores(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    # Filter by user in real app
    # result = await session.exec(select(Store).where(Store.user_id == current_user.id))
    # return result.all()
    # Mock for now
    return [] 
