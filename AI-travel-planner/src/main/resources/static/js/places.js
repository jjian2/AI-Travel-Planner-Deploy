/*
 * places.js
 * 방문 장소 페이지
 *
 * - Home에서 선택하거나 DB에서 불러온 최신 여행 일정 사용
 * - Google Maps에 장소 마커 표시
 * - Google Places API로 장소 사진 조회
 * - 사진 조회 실패 시 기본 📍 화면 표시
 */

const savedTrip = JSON.parse(
  localStorage.getItem("latestTrip") || "null"
);

const placesData = [];

/* ==================================================
   저장된 여행에서 장소 목록 추출
================================================== */

if (savedTrip && Array.isArray(savedTrip.days)) {
  savedTrip.days.forEach((day) => {
    if (!Array.isArray(day.places)) {
      return;
    }

    day.places.forEach((place) => {
      placesData.push({
        name:
          place.placeName ||
          place.name ||
          "여행 장소",

        description:
          place.description ||
          place.category ||
          "AI가 추천한 여행 장소입니다.",

        category:
          place.category || "",

        latitude:
          place.latitude,

        longitude:
          place.longitude,

        address:
          place.address || "",

        time:
          place.time || "",

        estimatedCost:
          Number(place.estimatedCost || 0),

        /*
         * AI 응답이나 DB에 사진 URL이 이미 있다면 우선 사용
         */
        photo:
          place.photoUrl ||
          place.photo ||
          place.imageUrl ||
          "",

        link:
          place.googleMapsUri ||
          place.placeUrl ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
            `${place.placeName || place.name || ""} ${place.address || ""}`
          )}`
      });
    });
  });
}

/* ==================================================
   HTML 문자 안전 처리
================================================== */

function escapePlacesText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ==================================================
   장소 카드
================================================== */

const placesGrid =
  document.getElementById("placesGrid");

function renderPlaceCards() {
  if (!placesGrid) {
    console.error(
      "placesGrid 요소를 찾을 수 없습니다."
    );

    return;
  }

  placesGrid.innerHTML = "";

  if (placesData.length === 0) {
    placesGrid.innerHTML = `
      <p class="places-empty">
        아직 생성된 여행 장소가 없습니다.<br>
        먼저 Home에서 저장된 여행 일정을 선택해주세요.
      </p>
    `;

    return;
  }

  placesData.forEach((place, index) => {
    const card =
      document.createElement("div");

    card.className = "place-card";
    card.dataset.placeIndex = String(index);

    card.innerHTML = `
      <div class="place-card-photo">

	  <img
	    class="place-image"
	    alt="${escapePlacesText(place.name)}"
	  >
	  
        <div class="place-image-loading">
          사진 불러오는 중...
        </div>

        <div class="place-image-fallback">
          📍
        </div>

      </div>

      <div class="place-card-body">

        <h4>
          ${escapePlacesText(place.name)}
        </h4>

        ${
          place.time
            ? `
              <p class="place-card-time">
                🕒 ${escapePlacesText(place.time)}
              </p>
            `
            : ""
        }

        ${
          place.category
            ? `
              <p class="place-card-category">
                ${escapePlacesText(place.category)}
              </p>
            `
            : ""
        }

        <p class="place-card-description">
          ${escapePlacesText(place.description)}
        </p>

        ${
          place.address
            ? `
              <p class="place-card-address">
                📍 ${escapePlacesText(place.address)}
              </p>
            `
            : ""
        }

        <p class="place-card-cost">
          예상 비용:
          ${Number(
            place.estimatedCost || 0
          ).toLocaleString()}원
        </p>

        <a
          class="place-card-link"
          href="${escapePlacesText(place.link)}"
          target="_blank"
          rel="noopener noreferrer"
        >
          🗺️ Google Maps에서 보기 →
        </a>

      </div>
    `;

    placesGrid.appendChild(card);

    /*
     * 기존 사진 URL이 있으면 먼저 사용
     */
    if (place.photo) {
      setPlaceCardPhoto(
        index,
        place.photo
      );
    }
  });
}

/* ==================================================
   카드 사진 표시
================================================== */
function setPlaceCardPhoto(placeIndex, photoUrl) {
  const card = document.querySelector(
    `.place-card[data-place-index="${placeIndex}"]`
  );

  if (!card) {
    console.warn(
      "사진을 넣을 장소 카드를 찾지 못했습니다:",
      placeIndex
    );
    return;
  }

  const image = card.querySelector(".place-image");
  const loading = card.querySelector(".place-image-loading");
  const fallback = card.querySelector(".place-image-fallback");

  if (!image || !loading || !fallback) {
    console.warn(
      "카드 이미지 요소를 찾지 못했습니다:",
      placeIndex
    );
    return;
  }

  if (!photoUrl) {
    image.removeAttribute("src");
    image.style.display = "none";
    image.style.opacity = "0";

    loading.style.display = "none";
    fallback.style.display = "flex";
    return;
  }

  image.style.display = "block";
  image.style.opacity = "0";

  loading.style.display = "flex";
  fallback.style.display = "none";

  image.onload = function () {
    console.log(
      "장소 사진 표시 성공:",
      placeIndex
    );

    image.style.opacity = "1";
    loading.style.display = "none";
    fallback.style.display = "none";
  };

  image.onerror = function () {
    console.warn(
      "장소 사진 이미지 로딩 실패:",
      placeIndex,
      photoUrl
    );

    image.removeAttribute("src");
    image.style.display = "none";
    image.style.opacity = "0";

    loading.style.display = "none";
    fallback.style.display = "flex";
  };

  image.src = photoUrl;
}

/* ==================================================
   Google Maps
================================================== */

let googlePlacesMap = null;
let googlePlacesMarkers = [];
let currentPlacesInfoWindow = null;
let GooglePlaceClass = null;

window.initPlacesMap = async function () {
  const mapElement =
    document.getElementById("placesMap");

  if (!mapElement) {
    console.error(
      "placesMap 요소를 찾을 수 없습니다."
    );
    return;
  }

  try {
    googlePlacesMap =
      new google.maps.Map(mapElement, {
        center: {
          lat: 36.2,
          lng: 127.8
        },
        zoom: 7,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true
      });

    const { Place } =
      await google.maps.importLibrary(
        "places"
      );

    GooglePlaceClass = Place;

    /*
     * 반드시 카드부터 생성
     */
    renderPlaceCards();

    /*
     * 그다음 지도 마커 생성
     */
    renderPlacesMapMarkers();

    /*
     * 마지막으로 생성된 카드에 사진 적용
     */
    await loadAllPlacePhotos();

    console.log(
      "방문 장소 Google Maps 및 Places 초기화 성공"
    );

  } catch (error) {
    console.error(
      "Google Maps 초기화 실패:",
      error
    );

    renderPlaceCards();

    if (googlePlacesMap) {
      renderPlacesMapMarkers();
    }

    placesData.forEach(
      (_, index) => {
        setPlaceCardPhoto(
          index,
          null
        );
      }
    );
  }
};

/* ==================================================
   Google Places 사진 조회
================================================== */

function getPhotoCacheKey(place) {
  return `place_photo_v4_${place.name}_${place.address}`;
}

function getCachedPlacePhoto(place) {
  try {
    return localStorage.getItem(
      getPhotoCacheKey(place)
    );
  } catch (error) {
    return null;
  }
}

function saveCachedPlacePhoto(
  place,
  photoUrl
) {
  if (!photoUrl) {
    return;
  }

  try {
    localStorage.setItem(
      getPhotoCacheKey(place),
      photoUrl
    );
  } catch (error) {
    console.warn(
      "장소 사진 캐시 저장 실패:",
      error
    );
  }
}

async function findPlacePhoto(place) {
  if (!GooglePlaceClass) {
    console.error(
      "Google Place 클래스가 준비되지 않았습니다."
    );

    return null;
  }

  const query = [
    place.name,
    place.address
  ]
    .filter(Boolean)
    .join(" ");

  if (!query) {
    return null;
  }

  try {
    /*
     * 1단계: 장소 검색
     */
    const request = {
      textQuery: query,

      fields: [
        "id",
        "displayName",
        "location"
      ],

      maxResultCount: 1,
      language: "ko",
      region: "kr"
    };

    const latitude =
      Number(place.latitude);

    const longitude =
      Number(place.longitude);

    if (
      Number.isFinite(latitude) &&
      Number.isFinite(longitude)
    ) {
      request.locationBias = {
        center: {
          lat: latitude,
          lng: longitude
        },
        radius: 3000
      };
    }

    const searchResult =
      await GooglePlaceClass.searchByText(
        request
      );

    const matchedPlaces =
      searchResult?.places;

    console.log(
      "장소 검색 결과:",
      place.name,
      matchedPlaces
    );

    if (
      !Array.isArray(matchedPlaces) ||
      matchedPlaces.length === 0
    ) {
      console.warn(
        "장소 검색 결과 없음:",
        place.name
      );

      return null;
    }

    const matchedPlace =
      matchedPlaces[0];

    /*
     * 2단계: 선택한 장소의 사진 필드를 별도로 요청
     */
    await matchedPlace.fetchFields({
      fields: [
        "photos"
      ]
    });

    const photos =
      matchedPlace.photos;

    console.log(
      "장소 사진 정보:",
      place.name,
      photos
    );

    if (
      !photos ||
      photos.length === 0
    ) {
      console.warn(
        "Google에 등록된 사진이 없는 장소:",
        place.name
      );

      return null;
    }

    /*
     * 3단계: 사진 URL 생성
     */
    const photoUrl =
      photos[0].getURI({
        maxWidth: 900,
        maxHeight: 550
      });

    console.log(
      "생성된 사진 URL:",
      place.name,
      photoUrl
    );

    return photoUrl;

  } catch (error) {
    console.error(
      "Google Places 사진 검색 실패:",
      place.name,
      error
    );

    return null;
  }
}

async function loadPlacePhoto(
  place,
  index
) {
  /*
   * AI 응답에 사진이 이미 있으면 그대로 사용
   */
  if (place.photo) {
    setPlaceCardPhoto(
      index,
      place.photo
    );

    return;
  }

  /*
   * 이전에 검색했던 사진 URL 캐시 사용
   */
  const cachedPhoto =
    getCachedPlacePhoto(place);

  if (cachedPhoto) {
    place.photo = cachedPhoto;

    setPlaceCardPhoto(
      index,
      cachedPhoto
    );

    return;
  }

  try {
    const photoUrl =
      await findPlacePhoto(place);

    if (!photoUrl) {
      setPlaceCardPhoto(
        index,
        null
      );

      return;
    }

    place.photo = photoUrl;

    saveCachedPlacePhoto(
      place,
      photoUrl
    );

    setPlaceCardPhoto(
      index,
      photoUrl
    );

  } catch (error) {
    console.error(
      "장소 사진 조회 오류:",
      place.name,
      error
    );

    setPlaceCardPhoto(
      index,
      null
    );
  }
}

async function loadAllPlacePhotos() {
  if (!GooglePlaceClass) {
    /*
     * Places 라이브러리를 사용할 수 없다면
     * 모든 카드에 기본 이미지를 표시합니다.
     */
    placesData.forEach((place, index) => {
      setPlaceCardPhoto(index, null);
    });

    return;
  }

  /*
   * Google Places 요청을 한꺼번에 보내지 않고
   * 장소별로 순차 조회합니다.
   */
  for (
    let index = 0;
    index < placesData.length;
    index += 1
  ) {
    await loadPlacePhoto(
      placesData[index],
      index
    );
  }
}

/* ==================================================
   지도 마커 표시
================================================== */

function renderPlacesMapMarkers() {
  if (!googlePlacesMap) {
    console.error(
      "Google Maps가 아직 초기화되지 않았습니다."
    );

    return;
  }

  clearPlacesMapMarkers();

  const bounds =
    new google.maps.LatLngBounds();

  let validMarkerCount = 0;

  placesData.forEach(
    (place, index) => {
      const latitude =
        Number(place.latitude);

      const longitude =
        Number(place.longitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        console.warn(
          "좌표가 올바르지 않은 장소:",
          place
        );

        return;
      }

      const position = {
        lat: latitude,
        lng: longitude
      };

      validMarkerCount += 1;

      const marker =
        new google.maps.Marker({
          position: position,
          map: googlePlacesMap,
          title: place.name,

          label: {
            text:
              String(validMarkerCount),

            color: "#ffffff",
            fontSize: "12px",
            fontWeight: "700"
          }
        });

      const infoWindow =
        new google.maps.InfoWindow({
          content: `
            <div style="
              min-width: 210px;
              padding: 6px;
              line-height: 1.6;
              font-family: Arial, sans-serif;
            ">

              <strong style="
                font-size: 15px;
              ">
                📍 ${escapePlacesText(place.name)}
              </strong>

              <div style="
                margin-top: 7px;
                margin-bottom: 7px;
              ">
                ${escapePlacesText(place.description)}
              </div>

              ${
                place.address
                  ? `
                    <div style="
                      margin-bottom: 7px;
                    ">
                      ${escapePlacesText(place.address)}
                    </div>
                  `
                  : ""
              }

              <a
                href="${escapePlacesText(place.link)}"
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Maps에서 보기
              </a>

            </div>
          `
        });

      marker.addListener(
        "click",
        function () {
          if (
            currentPlacesInfoWindow
          ) {
            currentPlacesInfoWindow.close();
          }

          infoWindow.open({
            anchor: marker,
            map: googlePlacesMap
          });

          currentPlacesInfoWindow =
            infoWindow;
        }
      );

      googlePlacesMarkers.push(
        marker
      );

      bounds.extend(position);
    }
  );

  if (validMarkerCount === 1) {
    googlePlacesMap.setCenter(
      bounds.getCenter()
    );

    googlePlacesMap.setZoom(15);

  } else if (validMarkerCount > 1) {
    googlePlacesMap.fitBounds(bounds);

    google.maps.event.addListenerOnce(
      googlePlacesMap,
      "bounds_changed",
      function () {
        if (
          googlePlacesMap.getZoom() > 14
        ) {
          googlePlacesMap.setZoom(14);
        }
      }
    );
  }
}

function clearPlacesMapMarkers() {
  googlePlacesMarkers.forEach(
    (marker) => {
      marker.setMap(null);
    }
  );

  googlePlacesMarkers = [];

  if (currentPlacesInfoWindow) {
    currentPlacesInfoWindow.close();
    currentPlacesInfoWindow = null;
  }
}

/* ==================================================
   페이지 시작
================================================== */

function clearPlacesMapMarkers() {
  googlePlacesMarkers.forEach(
    (marker) => {
      marker.setMap(null);
    }
  );

  googlePlacesMarkers = [];

  if (currentPlacesInfoWindow) {
    currentPlacesInfoWindow.close();
    currentPlacesInfoWindow = null;
  }
}