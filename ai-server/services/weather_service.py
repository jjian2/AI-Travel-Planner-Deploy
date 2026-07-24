import requests


def get_weather(destination: str):
    try:
        location = get_location(destination)

        if not location:
            return dummy_weather(destination)

        latitude = location["latitude"]
        longitude = location["longitude"]

        url = "https://api.open-meteo.com/v1/forecast"

        params = {
            "latitude": latitude,
            "longitude": longitude,
            "current": "temperature_2m,precipitation,weather_code",
            "timezone": "Asia/Seoul"
        }

        response = requests.get(url, params=params)
        response.raise_for_status()

        data = response.json()
        current = data.get("current", {})

        weather_code = current.get("weather_code")

        return {
            "destination": destination,
            "latitude": latitude,
            "longitude": longitude,
            "temperature": current.get("temperature_2m"),
            "precipitation": current.get("precipitation"),
            "weatherCode": weather_code,
            "condition": convert_weather_code(weather_code),
            "recommendation": make_recommendation(weather_code)
        }

    except Exception as e:
        print("Weather API Error:", e)
        return dummy_weather(destination)


def get_location(destination: str):
    url = "https://geocoding-api.open-meteo.com/v1/search"

    params = {
        "name": destination,
        "count": 1,
        "language": "ko",
        "format": "json"
    }

    response = requests.get(url, params=params)
    response.raise_for_status()

    data = response.json()
    results = data.get("results", [])

    if not results:
        return None

    place = results[0]

    return {
        "name": place.get("name"),
        "latitude": place.get("latitude"),
        "longitude": place.get("longitude"),
        "country": place.get("country")
    }


def convert_weather_code(code):
    weather_map = {
        0: "맑음",
        1: "대체로 맑음",
        2: "부분적으로 흐림",
        3: "흐림",
        45: "안개",
        48: "서리 안개",
        51: "약한 이슬비",
        53: "이슬비",
        55: "강한 이슬비",
        61: "약한 비",
        63: "비",
        65: "강한 비",
        71: "약한 눈",
        73: "눈",
        75: "강한 눈",
        80: "약한 소나기",
        81: "소나기",
        82: "강한 소나기",
        95: "뇌우"
    }

    return weather_map.get(code, "날씨 정보 없음")


def make_recommendation(code):
    if code in [61, 63, 65, 80, 81, 82, 95]:
        return "비가 올 가능성이 있어 실내 관광지, 카페, 쇼핑몰 위주의 일정을 추천합니다."

    if code in [71, 73, 75]:
        return "눈이 올 가능성이 있어 이동 시간이 짧은 실내 위주 일정을 추천합니다."

    if code in [0, 1, 2]:
        return "야외 관광지와 산책 코스를 포함하기 좋은 날씨입니다."

    if code in [3, 45, 48]:
        return "흐리거나 안개가 있을 수 있어 전망대보다는 실내 관광지를 함께 추천합니다."

    return "날씨에 따라 실내와 야외 일정을 적절히 섞는 것을 추천합니다."


def dummy_weather(destination: str):
    return {
        "destination": destination,
        "temperature": 25,
        "precipitation": 0,
        "weatherCode": 0,
        "condition": "맑음",
        "recommendation": "야외 관광지 방문에 적합한 날씨입니다."
    }