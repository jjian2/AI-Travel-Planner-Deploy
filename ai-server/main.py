from fastapi import FastAPI
from routers.trip import router as trip_router

app = FastAPI(
    title="AI Travel Planner",
    version="1.0"
)

app.include_router(trip_router, prefix="/api")


@app.get("/")
def home():
    return {"message": "AI Travel Planner API"}


@app.get("/health")
def health():
    return {"status": "OK"}