from fastapi import FastAPI, Depends
from app.api.deps import get_current_user
from app.models.auth_schema import User

from app.api.endpoints import stores

app = FastAPI()

# Configure CORS
from fastapi.middleware.cors import CORSMiddleware

origins = [
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(stores.router, prefix="/api/stores", tags=["stores"])

@app.get("/")
def read_root():
    return {"message": "Hello from backend!"}

@app.get("/api/me")
def read_current_user(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "image": current_user.image,
    }
