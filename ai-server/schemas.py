from pydantic import BaseModel
from typing import Optional


class TripRequest(BaseModel):
    destination: str
    period: str
    people: str
    budget: int
    style: str
    transportType: str


class ChatRequest(BaseModel):
    message: str
    destination: Optional[str] = None


class ReviewRequest(BaseModel):
    content: str