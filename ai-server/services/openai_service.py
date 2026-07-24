import json
import os
from typing import Any

from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


def create_trip_plan(request, places, weather, rag_docs):
    if not client:
        return dummy_trip_plan(request, places, weather)

    prompt = f"""
너는 여행 일정 추천 AI야.

아래 정보를 바탕으로 여행 일정을 만들어줘.

[여행 조건]
- 여행지: {request.destination}
- 기간: {request.period}
- 인원: {request.people}
- 예산: {request.budget}
- 스타일: {request.style}
- 이동수단: {request.transportType}

[실제 장소 후보]
{json.dumps(places, ensure_ascii=False)}

[날씨 정보]
{json.dumps(weather, ensure_ascii=False)}

[RAG 관광 정보]
{json.dumps(rag_docs, ensure_ascii=False)}

규칙:
1. 실제 장소 후보에 있는 장소를 우선 사용해.
2. 실제 장소 후보의 placeName, address, latitude, longitude,
   rating, photoUrl, googleMapsUri 값을 가능한 한 그대로 사용해.
3. 장소명과 좌표를 임의로 만들지 마.
4. 날씨가 비, 눈, 이슬비이면 실내 장소, 카페, 쇼핑 위주로 추천해.
5. 이동수단이 대중교통이면 이동이 너무 먼 장소는 피해서 구성해.
6. 예산을 초과하지 않도록 estimatedCost를 조절해.
7. 모든 장소 객체에는 photoUrl과 googleMapsUri 필드를 반드시 포함해.
8. 사진이나 지도 주소가 없으면 빈 문자열로 응답해.
9. 반드시 JSON만 응답해.
10. 설명 문장, 마크다운, 코드블록은 절대 쓰지 마.

JSON 형식:
{{
  "title": "부산 2박 3일 맛집 위주 여행",
  "destination": "부산",
  "period": "2박 3일",
  "people": "커플",
  "budget": 500000,
  "style": "맛집 위주",
  "transportType": "대중교통",
  "weatherSummary": "약한 이슬비로 실내 중심 일정 추천",
  "days": [
    {{
      "day": 1,
      "summary": "도착 및 맛집 중심 일정",
      "places": [
        {{
          "time": "10:00",
          "placeName": "장소명",
          "category": "맛집",
          "address": "주소",
          "latitude": 35.0,
          "longitude": 129.0,
          "rating": 4.5,
          "photoUrl": "Google Places 사진 URL",
          "googleMapsUri": "Google Maps 장소 URL",
          "description": "장소 설명",
          "estimatedCost": 20000
        }}
      ]
    }}
  ]
}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "너는 여행 일정 추천 전문가야. "
                        "반드시 유효한 JSON만 응답해."
                    )
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.4,
            response_format={"type": "json_object"}
        )

        content = response.choices[0].message.content
        result = json.loads(content)

        # GPT가 사진, 지도 URL 등을 빠뜨려도 실제 Places 데이터로 다시 채움
        enrich_trip_places(result, places)

        return result

    except Exception as error:
        print("OpenAI Error:", error)
        return dummy_trip_plan(request, places, weather)


def enrich_trip_places(
    trip_result: dict[str, Any],
    place_candidates: list[dict[str, Any]]
) -> None:
    """
    GPT가 생성한 일정 장소에 Google Places 원본 정보를 다시 넣습니다.

    GPT 응답에서 photoUrl, googleMapsUri 등이 빠지는 문제를 방지합니다.
    """

    days = trip_result.get("days")

    if not isinstance(days, list):
        return

    for day in days:
        if not isinstance(day, dict):
            continue

        trip_places = day.get("places")

        if not isinstance(trip_places, list):
            continue

        for trip_place in trip_places:
            if not isinstance(trip_place, dict):
                continue

            matched_place = find_matching_place(
                trip_place,
                place_candidates
            )

            if matched_place is None:
                # 매칭되지 않아도 프론트에서 필드가 없어지지 않도록 기본값 추가
                trip_place.setdefault("photoUrl", "")
                trip_place.setdefault("googleMapsUri", "")
                trip_place.setdefault("rating", None)
                continue

            # 장소 후보의 정확한 정보를 최종 일정에 다시 주입
            trip_place["placeName"] = (
                matched_place.get("placeName")
                or trip_place.get("placeName")
                or "여행 장소"
            )

            trip_place["address"] = (
                matched_place.get("address")
                or trip_place.get("address")
                or ""
            )

            trip_place["latitude"] = (
                matched_place.get("latitude")
                if matched_place.get("latitude") is not None
                else trip_place.get("latitude")
            )

            trip_place["longitude"] = (
                matched_place.get("longitude")
                if matched_place.get("longitude") is not None
                else trip_place.get("longitude")
            )

            trip_place["rating"] = matched_place.get("rating")

            trip_place["photoUrl"] = (
                matched_place.get("photoUrl")
                or ""
            )

            trip_place["googleMapsUri"] = (
                matched_place.get("googleMapsUri")
                or matched_place.get("placeUrl")
                or ""
            )

            trip_place.setdefault(
                "category",
                matched_place.get("category") or ""
            )


def find_matching_place(
    trip_place: dict[str, Any],
    place_candidates: list[dict[str, Any]]
) -> dict[str, Any] | None:
    """
    GPT 일정 장소와 Google Places 후보를 장소명 또는 주소로 매칭합니다.
    """

    trip_name = normalize_text(
        trip_place.get("placeName")
        or trip_place.get("name")
        or ""
    )

    trip_address = normalize_text(
        trip_place.get("address") or ""
    )

    # 1차: 장소명 완전 일치
    for candidate in place_candidates:
        candidate_name = normalize_text(
            candidate.get("placeName") or ""
        )

        if trip_name and trip_name == candidate_name:
            return candidate

    # 2차: 한쪽 장소명이 다른 쪽 이름에 포함
    for candidate in place_candidates:
        candidate_name = normalize_text(
            candidate.get("placeName") or ""
        )

        if (
            trip_name
            and candidate_name
            and (
                trip_name in candidate_name
                or candidate_name in trip_name
            )
        ):
            return candidate

    # 3차: 주소 일부 일치
    for candidate in place_candidates:
        candidate_address = normalize_text(
            candidate.get("address") or ""
        )

        if (
            trip_address
            and candidate_address
            and (
                trip_address in candidate_address
                or candidate_address in trip_address
            )
        ):
            return candidate

    return None


def normalize_text(value: Any) -> str:
    return (
        str(value or "")
        .strip()
        .lower()
        .replace(" ", "")
        .replace("-", "")
        .replace(",", "")
        .replace(".", "")
    )


def dummy_trip_plan(request, places, weather):
    first_place = places[0] if places else {}
    second_place = places[1] if len(places) > 1 else {}

    return {
        "title": (
            f"{request.destination} "
            f"{request.period} "
            f"{request.style} 여행"
        ),
        "destination": request.destination,
        "period": request.period,
        "people": request.people,
        "budget": request.budget,
        "style": request.style,
        "transportType": request.transportType,
        "weather": weather,
        "days": [
            {
                "day": 1,
                "summary": "도착 및 주요 관광지 방문",
                "places": [
                    {
                        "time": "10:00",
                        "placeName": (
                            first_place.get("placeName")
                            or f"{request.destination}역"
                        ),
                        "category": (
                            first_place.get("category")
                            or "관광지"
                        ),
                        "address": (
                            first_place.get("address")
                            or ""
                        ),
                        "latitude": first_place.get("latitude"),
                        "longitude": first_place.get("longitude"),
                        "rating": first_place.get("rating"),
                        "photoUrl": (
                            first_place.get("photoUrl")
                            or ""
                        ),
                        "googleMapsUri": (
                            first_place.get("googleMapsUri")
                            or first_place.get("placeUrl")
                            or ""
                        ),
                        "description": "여행 시작 장소입니다.",
                        "estimatedCost": 0
                    },
                    {
                        "time": "12:00",
                        "placeName": (
                            second_place.get("placeName")
                            or f"{request.destination} 맛집"
                        ),
                        "category": (
                            second_place.get("category")
                            or "맛집"
                        ),
                        "address": (
                            second_place.get("address")
                            or ""
                        ),
                        "latitude": second_place.get("latitude"),
                        "longitude": second_place.get("longitude"),
                        "rating": second_place.get("rating"),
                        "photoUrl": (
                            second_place.get("photoUrl")
                            or ""
                        ),
                        "googleMapsUri": (
                            second_place.get("googleMapsUri")
                            or second_place.get("placeUrl")
                            or ""
                        ),
                        "description": (
                            "지역 대표 음식을 즐길 수 있는 장소입니다."
                        ),
                        "estimatedCost": 20000
                    }
                ]
            }
        ],
        "note": (
            "OpenAI 호출 실패 또는 API 키 없음으로 "
            "더미 일정이 반환되었습니다."
        )
    }


def chat_with_ai(request):
    if not client:
        return {
            "message": request.message,
            "answer": (
                "OpenAI API 키가 없어 "
                "더미 챗봇 응답을 반환합니다."
            )
        }

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "너는 여행 추천 챗봇이야. "
                        "한국어로 친절하게 답변해."
                    )
                },
                {
                    "role": "user",
                    "content": request.message
                }
            ],
            temperature=0.5
        )

        return {
            "message": request.message,
            "answer": response.choices[0].message.content
        }

    except Exception as error:
        print("OpenAI Chat Error:", error)

        return {
            "message": request.message,
            "answer": "OpenAI 호출 실패로 더미 응답을 반환합니다."
        }


def analyze_review(content: str):
    if not client:
        return {
            "content": content,
            "sentiment": "positive",
            "keywords": ["여행", "만족", "추천"],
            "summary": (
                "OpenAI API 키가 없어 "
                "더미 분석 결과를 반환합니다."
            )
        }

    prompt = f"""
다음 여행 후기를 분석해줘.

후기:
{content}

반드시 JSON만 응답해.

형식:
{{
  "sentiment": "positive 또는 negative 또는 neutral",
  "keywords": ["키워드1", "키워드2"],
  "summary": "요약"
}}
"""

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.3,
            response_format={"type": "json_object"}
        )

        return json.loads(
            response.choices[0].message.content
        )

    except Exception as error:
        print("OpenAI Review Error:", error)

        return {
            "content": content,
            "sentiment": "positive",
            "keywords": ["여행", "만족", "추천"],
            "summary": (
                "OpenAI 호출 실패로 "
                "더미 분석 결과를 반환합니다."
            )
        }