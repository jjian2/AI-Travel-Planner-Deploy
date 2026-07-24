import os
from typing import Any

import requests
from dotenv import load_dotenv

load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

PLACES_SEARCH_URL = (
    "https://places.googleapis.com/v1/places:searchText"
)

REQUEST_TIMEOUT_SECONDS = 15


def build_photo_url(photo_name: str | None) -> str:
    """
    Google Places 사진 리소스 이름을 실제 이미지 URL로 변환합니다.

    photo_name 예시:
    places/PLACE_ID/photos/PHOTO_REFERENCE
    """

    if not GOOGLE_API_KEY or not photo_name:
        return ""

    return (
        f"https://places.googleapis.com/v1/"
        f"{photo_name}/media"
        f"?maxWidthPx=800"
        f"&skipHttpRedirect=false"
        f"&key={GOOGLE_API_KEY}"
    )


def get_first_photo_url(item: dict[str, Any]) -> str:
    """
    장소 응답에서 첫 번째 사진 URL을 반환합니다.
    사진이 없으면 빈 문자열을 반환합니다.
    """

    photos = item.get("photos") or []

    if not photos:
        return ""

    first_photo = photos[0] or {}
    photo_name = first_photo.get("name")

    return build_photo_url(photo_name)


def search_places(
    destination: str,
    keyword: str,
    size: int = 5
) -> list[dict[str, Any]]:
    """
    Google Places Text Search API로 장소를 검색합니다.

    GOOGLE_API_KEY가 없거나 요청이 실패하면
    dummy_places() 데이터를 반환합니다.
    """

    if not GOOGLE_API_KEY:
        print("GOOGLE_API_KEY가 없어 더미 장소를 반환합니다.")
        return dummy_places(destination, keyword)

    safe_size = max(1, min(int(size), 20))

    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_API_KEY,
        "X-Goog-FieldMask": (
            "places.displayName,"
            "places.formattedAddress,"
            "places.location,"
            "places.rating,"
            "places.googleMapsUri,"
            "places.photos"
        )
    }

    body = {
        "textQuery": f"{destination} {keyword}",
        "languageCode": "ko",
        "maxResultCount": safe_size
    }

    try:
        response = requests.post(
            PLACES_SEARCH_URL,
            headers=headers,
            json=body,
            timeout=REQUEST_TIMEOUT_SECONDS
        )

        response.raise_for_status()

        data = response.json()
        places: list[dict[str, Any]] = []

        for item in data.get("places", []):
            location = item.get("location") or {}
            display_name = item.get("displayName") or {}

            place_name = display_name.get("text") or "이름 없는 장소"
            address = item.get("formattedAddress") or ""

            latitude = location.get("latitude")
            longitude = location.get("longitude")

            google_maps_uri = item.get("googleMapsUri") or ""
            photo_url = get_first_photo_url(item)

            places.append({
                "placeName": place_name,
                "address": address,
                "latitude": latitude,
                "longitude": longitude,
                "rating": item.get("rating"),
                "placeUrl": google_maps_uri,
                "googleMapsUri": google_maps_uri,
                "photoUrl": photo_url,
                "category": keyword
            })

        if not places:
            print(
                f"Google Places 검색 결과 없음: "
                f"{destination} {keyword}"
            )
            return dummy_places(destination, keyword)

        return places

    except requests.Timeout:
        print("Google Places 요청 시간 초과")
        return dummy_places(destination, keyword)

    except requests.RequestException as error:
        print("Google Places 요청 오류:", error)

        response = getattr(error, "response", None)

        if response is not None:
            print("STATUS:", response.status_code)
            print("BODY:", response.text)

        return dummy_places(destination, keyword)

    except (TypeError, ValueError) as error:
        print("Google Places 응답 처리 오류:", error)
        return dummy_places(destination, keyword)

    except Exception as error:
        print("Google Places 예상하지 못한 오류:", error)
        return dummy_places(destination, keyword)


def dummy_places(
    destination: str,
    keyword: str
) -> list[dict[str, Any]]:
    """
    API 키가 없거나 Google Places 요청에 실패했을 때
    사용하는 임시 장소 데이터입니다.
    """

    return [
        {
            "placeName": f"{destination} 대표 {keyword} 1",
            "address": f"{destination} 중심가",
            "latitude": 35.1796,
            "longitude": 129.0756,
            "rating": 4.5,
            "placeUrl": "",
            "googleMapsUri": "",
            "photoUrl": "",
            "category": keyword
        },
        {
            "placeName": f"{destination} 대표 {keyword} 2",
            "address": f"{destination} 인기 지역",
            "latitude": 35.1587,
            "longitude": 129.1604,
            "rating": 4.3,
            "placeUrl": "",
            "googleMapsUri": "",
            "photoUrl": "",
            "category": keyword
        }
    ]