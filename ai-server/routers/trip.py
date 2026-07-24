from fastapi import APIRouter
from schemas import TripRequest, ChatRequest, ReviewRequest
from services.openai_service import create_trip_plan, chat_with_ai, analyze_review
from services.google_places_service import search_places
from services.weather_service import get_weather
from services.rag_service import rag_search

router = APIRouter()


@router.post("/trip-plan")
def generate_trip(request: TripRequest):
    places = search_places(request.destination, request.style)
    weather = get_weather(request.destination)
    rag_docs = rag_search(f"{request.destination} {request.style} 여행 추천")

    result = create_trip_plan(request, places, weather, rag_docs)

    return {
        "success": True,
        "result": result
    }


@router.get("/places")
def get_places(destination: str, keyword: str):
    places = search_places(destination, keyword)

    return {
        "success": True,
        "destination": destination,
        "keyword": keyword,
        "places": places
    }


@router.get("/weather")
def weather(destination: str):
    result = get_weather(destination)

    return {
        "success": True,
        "weather": result
    }


@router.post("/chat")
def chat(request: ChatRequest):
    result = chat_with_ai(request)

    return {
        "success": True,
        "result": result
    }


@router.post("/review-analysis")
def review_analysis(request: ReviewRequest):
    result = analyze_review(request.content)

    return {
        "success": True,
        "result": result
    }

@router.get("/rag")
def test_rag(query: str):

    docs = rag_search(query)

    return {
        "success": True,
        "query": query,
        "docs": docs
    }