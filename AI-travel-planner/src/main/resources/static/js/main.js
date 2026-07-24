let map;
let markers = [];



/* ===== 여행 조건 입력 폼 ===== */
const tripForm = document.getElementById("tripForm");
const itineraryCard = document.getElementById("itineraryCard");
const itineraryContent = document.getElementById("itineraryContent");
const generateBtn = document.getElementById("generateBtn");

const saveTripBtn = document.getElementById("saveTripBtn");
const tripSaveMessage = document.getElementById("tripSaveMessage");

let latestGeneratedTrip = null;
let latestTripConditions = null;

tripForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const destination = document.getElementById("destination").value.trim();
  const period = document.getElementById("duration").value.trim();
  const companionCount = document.getElementById("companionCount").value.trim();
  const companionType = document.getElementById("companionType").value;
  const budgetText = document.getElementById("budget").value.trim();
  const travelStyleValue = document.getElementById("travelStyle").value;
  const travelStyleText = document.getElementById("travelStyle").selectedOptions[0].text;

  if (!destination || !period) {
    alert("여행지와 기간은 꼭 입력해주세요.");
    return;
  }

  const peopleText =
    companionCount && companionType
      ? `${companionCount}명 (${companionType})`
      : companionCount
      ? `${companionCount}명`
      : companionType || "1명";

  const budgetNumber = parseInt(budgetText.replace(/[^0-9]/g, "")) || 500000;

  const requestData = {
    destination: destination,
    period: period,
    people: peopleText,
    budget: budgetNumber,
    style: travelStyleText,
    transportType: "대중교통"
  };

  const conditions = {
    destination,
    period,
    companionCount,
    companionType,
    peopleText,
    budget: budgetNumber,
    budgetText,
    travelStyleValue,
    travelStyleText
  };

  generateBtn.disabled = true;
  generateBtn.textContent = "생성 중...";

  itineraryContent.innerHTML = `
    <h3>🕒 AI 추천 일정</h3>
    <p class="placeholder-text">AI가 일정을 생성하고 있어요... 1분정도 소요 됩니다...</p>
  `;

  try {
    const response = await fetch("/trip/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      throw new Error("서버 응답 오류");
    }

	const data = await response.json();

	console.log("AI 응답:", data);

	if (!response.ok || !data.success || !data.result) {
	  throw new Error("AI 일정 생성에 실패했습니다.");
	}

	const result = data.result;
	
	latestGeneratedTrip = result;
	latestTripConditions = conditions;

	/* 방문 장소 페이지에 넘길 최신 일정 저장 */
	localStorage.setItem(
	  "latestTrip",
	  JSON.stringify(result)
	);
	
	if (saveTripBtn) {
	  saveTripBtn.hidden = false;
	  saveTripBtn.disabled = false;
	  saveTripBtn.textContent = "💾 여행 일정 저장";
	}

	if (tripSaveMessage) {
	  tripSaveMessage.textContent = "";
	  tripSaveMessage.classList.remove("error");
	}

	console.log(
	  "저장된 최신 일정:",
	  JSON.parse(localStorage.getItem("latestTrip"))
	);

	renderItinerary(result);
	showPlacesOnMap(result);
	await loadSidebarTrips();
	

  } catch (error) {
    console.error(error);
    alert("AI 일정 생성에 실패했습니다. FastAPI 서버와 Spring Boot 서버가 모두 켜져 있는지 확인해주세요.");

	itineraryContent.innerHTML = `
	  <h3>🕒 AI 추천 일정</h3>
	  <p class="placeholder-text">
	    AI 일정 생성에 실패했습니다.
	  </p>
	`;

	if (saveTripBtn) {
	  saveTripBtn.hidden = true;
	}
  }

  generateBtn.disabled = false;
  generateBtn.textContent = "AI 일정 생성";
});

function renderItinerary(result) {
  if (
    !itineraryContent ||
    !result ||
    !Array.isArray(result.days)
  ) {
    if (itineraryContent) {
      itineraryContent.innerHTML = `
        <h3>🕒 AI 추천 일정</h3>
        <p class="placeholder-text">
          일정 데이터가 없습니다.
        </p>
      `;
    }

    return;
  }

  const daysHtml = result.days
    .map((day) => {
      const places = Array.isArray(day.places)
        ? day.places
        : [];

      const placesHtml = places
        .map((place) => {
          const estimatedCost = Number(
            place.estimatedCost || 0
          ).toLocaleString();

          return `
            <div class="trip-place-card">
              <strong>${place.time || ""}</strong>
              <span>${place.placeName || ""}</span>

              <br>

              <small>${place.category || ""}</small>

              <br>

              <small>${place.address || ""}</small>

              ${
                place.description
                  ? `<p>${place.description}</p>`
                  : ""
              }

              <p>
                예상 비용: ${estimatedCost}원
              </p>
            </div>
          `;
        })
        .join("");

      return `
        <div class="day-box">
          <h4>Day ${day.day || ""}</h4>
          <p>${day.summary || ""}</p>

          ${placesHtml}
        </div>
      `;
    })
    .join("");

  itineraryContent.innerHTML = `
    <h3>
      🕒 ${result.title || "AI 추천 일정"}
    </h3>

    <p class="placeholder-text">
      ${result.destination || ""}
      · ${result.period || ""}
      · ${result.people || ""}
    </p>

    <div class="itinerary-days">
      ${daysHtml}
    </div>
  `;
}/* ===== 여행 기간 캘린더 ===== */
/* ===== 여행 기간 캘린더 ===== */

const durationInput = document.getElementById("duration");
const calendarBtn = document.getElementById("calendarBtn");

let durationPicker = null;

function formatKoreanDate(date) {
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

if (!durationInput) {
  console.error("날짜 입력창 #duration을 찾을 수 없습니다.");
} else if (typeof flatpickr === "undefined") {
  console.error("flatpickr 라이브러리를 불러오지 못했습니다.");
} else {
  durationPicker = flatpickr(durationInput, {
    mode: "range",
    dateFormat: "Y-m-d",
    minDate: "today",
    locale: "ko",
    showMonths: 2,

    // 입력창을 클릭해도 달력이 열리도록 설정
    clickOpens: true,
    allowInput: false,

    onChange: function (selectedDates) {
      if (selectedDates.length === 2) {
        const startDate = selectedDates[0];
        const endDate = selectedDates[1];

        durationInput.value =
          `${formatKoreanDate(startDate)} ~ ${formatKoreanDate(endDate)}`;
      }
    }
  });

  durationInput.addEventListener("click", function () {
    durationPicker.open();
  });

  durationInput.addEventListener("focus", function () {
    durationPicker.open();
  });
}

if (calendarBtn) {
  calendarBtn.addEventListener("click", function (event) {
    event.preventDefault();
    event.stopPropagation();

    if (durationPicker) {
      durationPicker.open();
    } else {
      alert("달력 기능을 불러오지 못했습니다.");
    }
  });
}

/* ===== 여행 가계부 ===== */

const addExpenseBtn = document.getElementById("addExpenseBtn");
const budgetList = document.getElementById("budgetList");
const budgetEmptyMsg = document.getElementById("budgetEmptyMsg");
const budgetTotal = document.getElementById("budgetTotal");

const BUDGET_STORAGE_KEY = "ai_travel_planner_budget_items";

let budgetItems = [];
let budgetItemIdCounter = 0;

/* localStorage 저장 */
function saveBudgetItems() {
  localStorage.setItem(
    BUDGET_STORAGE_KEY,
    JSON.stringify(budgetItems)
  );
}

/* localStorage 불러오기 */
function loadBudgetItems() {
  try {
    const savedItems = JSON.parse(
      localStorage.getItem(BUDGET_STORAGE_KEY) || "[]"
    );

    if (!Array.isArray(savedItems)) {
      budgetItems = [];
      return;
    }

    budgetItems = savedItems;

    budgetItems.forEach((item) => {
      renderBudgetItem(item);

      if (Number(item.id) > budgetItemIdCounter) {
        budgetItemIdCounter = Number(item.id);
      }
    });
  } catch (error) {
    console.error("가계부 불러오기 실패:", error);
    budgetItems = [];
  }

  updateBudgetState();
}

/* 비어 있는지 확인하고 총합 갱신 */
function updateBudgetState() {
  if (budgetEmptyMsg) {
    budgetEmptyMsg.style.display =
      budgetItems.length === 0 ? "block" : "none";
  }

  updateBudgetTotal();
}

/* 총 지출 계산 */
function updateBudgetTotal() {
  const total = budgetItems.reduce((sum, item) => {
    return sum + Number(item.amount || 0);
  }, 0);

  if (budgetTotal) {
    budgetTotal.textContent = `${total.toLocaleString()}원`;
  }
}

/* 이미 열린 입력 줄 제거 */
function removeEditRowIfExists() {
  const existingRow = budgetList.querySelector(
    ".budget-edit-row"
  );

  if (existingRow) {
    existingRow.remove();
  }
}

/* + 버튼 클릭 */
addExpenseBtn.addEventListener("click", function () {
  removeEditRowIfExists();

  const editRow = document.createElement("li");
  editRow.className = "budget-edit-row";

  editRow.innerHTML = `
    <input
      type="text"
      class="budget-edit-label"
      placeholder="항목 (예: 점심)"
    >

    <input
      type="text"
      class="budget-edit-amount"
      placeholder="금액"
      inputmode="numeric"
    >

    <button
      type="button"
      class="budget-confirm-btn"
      aria-label="저장"
    >
      ✓
    </button>

    <button
      type="button"
      class="budget-cancel-btn"
      aria-label="취소"
    >
      ✕
    </button>
  `;

  budgetList.appendChild(editRow);

  const labelInput = editRow.querySelector(
    ".budget-edit-label"
  );

  const amountInput = editRow.querySelector(
    ".budget-edit-amount"
  );

  const confirmBtn = editRow.querySelector(
    ".budget-confirm-btn"
  );

  const cancelBtn = editRow.querySelector(
    ".budget-cancel-btn"
  );

  labelInput.focus();

  /* 금액에 숫자만 입력되도록 처리 */
  amountInput.addEventListener("input", function () {
    const numberOnly = this.value.replace(/[^0-9]/g, "");

    this.value = numberOnly
      ? Number(numberOnly).toLocaleString()
      : "";
  });

  function confirmExpense() {
    const label = labelInput.value.trim();

    const amount = Number(
      amountInput.value.replace(/[^0-9]/g, "")
    );

    if (!label) {
      alert("지출 항목을 입력해주세요.");
      labelInput.focus();
      return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      alert("금액을 숫자로 입력해주세요.");
      amountInput.focus();
      return;
    }

    addBudgetItem(label, amount);
    editRow.remove();
  }

  confirmBtn.addEventListener("click", confirmExpense);

  cancelBtn.addEventListener("click", function () {
    editRow.remove();
  });

  editRow.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmExpense();
    }

    if (event.key === "Escape") {
      editRow.remove();
    }
  });
});

/* 새 지출 등록 */
function addBudgetItem(label, amount) {
  budgetItemIdCounter += 1;

  const budgetItem = {
    id: budgetItemIdCounter,
    label: label,
    amount: Number(amount)
  };

  budgetItems.push(budgetItem);

  renderBudgetItem(budgetItem);
  saveBudgetItems();
  updateBudgetState();
}

/* 화면에 지출 항목 출력 */
function renderBudgetItem(item) {
  const listItem = document.createElement("li");

  listItem.className = "budget-item";
  listItem.dataset.budgetId = item.id;

  listItem.innerHTML = `
    <span class="budget-item-label"></span>

    <span class="budget-item-amount"></span>

    <button
      type="button"
      class="budget-delete-btn"
      aria-label="삭제"
    >
      ✕
    </button>
  `;

  listItem.querySelector(
    ".budget-item-label"
  ).textContent = item.label;

  listItem.querySelector(
    ".budget-item-amount"
  ).textContent =
    `${Number(item.amount).toLocaleString()}원`;

  listItem.querySelector(
    ".budget-delete-btn"
  ).addEventListener("click", function () {
    deleteBudgetItem(item.id);
  });

  budgetList.appendChild(listItem);
}

/* 지출 삭제 */
function deleteBudgetItem(itemId) {
  budgetItems = budgetItems.filter(
    (item) => Number(item.id) !== Number(itemId)
  );

  const targetItem = budgetList.querySelector(
    `[data-budget-id="${itemId}"]`
  );

  if (targetItem) {
    targetItem.remove();
  }

  saveBudgetItems();
  updateBudgetState();
}

/* 페이지가 열릴 때 저장된 가계부 불러오기 */
loadBudgetItems();


/* ===== 체크리스트 저장 ===== */

const CHECKLIST_STORAGE_KEY = "ai_travel_planner_checklist";
const checklistItems = document.querySelectorAll(".checklist-item");

function saveChecklist() {
  const checklistState = {};

  checklistItems.forEach((checkbox) => {
    checklistState[checkbox.value] = checkbox.checked;
  });

  localStorage.setItem(
    CHECKLIST_STORAGE_KEY,
    JSON.stringify(checklistState)
  );
}

function loadChecklist() {
  try {
    const savedState = JSON.parse(
      localStorage.getItem(CHECKLIST_STORAGE_KEY) || "{}"
    );

    checklistItems.forEach((checkbox) => {
      checkbox.checked = Boolean(savedState[checkbox.value]);
    });
  } catch (error) {
    console.error("체크리스트 불러오기 실패:", error);
  }
}

checklistItems.forEach((checkbox) => {
  checkbox.addEventListener("change", saveChecklist);
});

loadChecklist();


/* ===== 추천 여행지 클릭 ===== */
const recommendItems =
  document.querySelectorAll(".recommend-item");

const destinationInput =
  document.getElementById("destination");

  const searchPanel =
    document.querySelector(".search-panel");

  recommendItems.forEach((button) => {
    button.addEventListener("click", function () {
      const place = this.dataset.place;

      if (!place || !destinationInput) {
        return;
      }

      destinationInput.value = place;

      const currentUrl =
        new URL(window.location.href);

      if (currentUrl.searchParams.has("tripId")) {
        currentUrl.searchParams.delete("tripId");

        window.history.replaceState(
          {},
          "",
          currentUrl.pathname
        );
      }

      sessionStorage.removeItem(
        "ai_travel_planner_active_trip"
      );

      document
        .querySelectorAll(".trip-item")
        .forEach((item) => {
          item.classList.remove("active");
        });

      searchPanel?.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });

      destinationInput.focus();
      destinationInput.classList.add(
        "recommend-selected"
      );

      setTimeout(() => {
        destinationInput.classList.remove(
          "recommend-selected"
        );
      }, 1000);
    });
  });


/* ===== Google Maps ===== */
let googleMap;
let googleMarkers = [];
let routePolyline = null;
let activeInfoWindow = null;

window.initMap = function () {
  const mapElement = document.getElementById("map");

  if (!mapElement) {
    console.error("지도 요소 #map을 찾을 수 없습니다.");
    return;
  }

  googleMap = new google.maps.Map(mapElement, {
    center: {
      lat: 34.6937,
      lng: 135.5023
    },
    zoom: 12
  });

  console.log("Google Maps 초기화 성공");

  const savedTrip = JSON.parse(
    localStorage.getItem("latestTrip") || "null"
  );

  if (savedTrip && Array.isArray(savedTrip.days)) {
    showPlacesOnMap(savedTrip);
  }
};

function clearMapMarkers() {
  googleMarkers.forEach((marker) => {
    marker.setMap(null);
  });

  googleMarkers = [];

  if (routePolyline) {
    routePolyline.setMap(null);
    routePolyline = null;
  }

  if (activeInfoWindow) {
    activeInfoWindow.close();
    activeInfoWindow = null;
  }
}

function addMapMarker(latitude, longitude, title) {
  if (!googleMap) {
    console.error("Google Map이 초기화되지 않았습니다.");
    return;
  }

  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    console.warn("올바르지 않은 좌표:", latitude, longitude);
    return;
  }

  const marker = new google.maps.Marker({
    position: { lat, lng },
    map: googleMap,
    title: title || ""
  });

  googleMarkers.push(marker);
}

function showPlacesOnMap(result) {
  if (!googleMap) {
    console.error("Google Map이 아직 초기화되지 않았습니다.");
    return;
  }

  if (!result || !Array.isArray(result.days)) {
    console.error("지도에 표시할 일정 데이터가 없습니다.");
    return;
  }

  clearMapMarkers();

  const bounds = new google.maps.LatLngBounds();
  const routePath = [];

  let markerNumber = 1;

  result.days.forEach((day) => {
    if (!Array.isArray(day.places)) {
      return;
    }

    day.places.forEach((place) => {
      const latitude = Number(place.latitude);
      const longitude = Number(place.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        console.warn("좌표가 없는 장소:", place);
        return;
      }

      const position = {
        lat: latitude,
        lng: longitude
      };

      const marker = new google.maps.Marker({
        position: position,
        map: googleMap,
        title: place.placeName || "여행 장소",
        label: {
          text: String(markerNumber),
          color: "#ffffff",
          fontSize: "12px",
          fontWeight: "700"
        }
      });

      const estimatedCost = Number(place.estimatedCost || 0);

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="
            min-width: 210px;
            padding: 6px;
            line-height: 1.6;
            font-family: Arial, sans-serif;
          ">
            <strong style="font-size: 15px;">
              📍 ${escapeMapText(place.placeName || "여행 장소")}
            </strong>

            <div style="margin-top: 6px;">
              <b>Day ${escapeMapText(day.day || "")}</b>
              ${place.time ? ` · ${escapeMapText(place.time)}` : ""}
            </div>

            ${
              place.category
                ? `<div>여행 유형: ${escapeMapText(place.category)}</div>`
                : ""
            }

            ${
              place.address
                ? `<div>주소: ${escapeMapText(place.address)}</div>`
                : ""
            }

            <div>
              예상 비용: ${estimatedCost.toLocaleString()}원
            </div>

            ${
              place.description
                ? `<div style="margin-top: 5px;">
                    ${escapeMapText(place.description)}
                   </div>`
                : ""
            }
          </div>
        `
      });

      marker.addListener("click", function () {
        if (activeInfoWindow) {
          activeInfoWindow.close();
        }

        infoWindow.open({
          anchor: marker,
          map: googleMap
        });

        activeInfoWindow = infoWindow;
      });

      googleMarkers.push(marker);
      routePath.push(position);
      bounds.extend(position);

      markerNumber += 1;
    });
  });

  if (routePath.length >= 2) {
    routePolyline = new google.maps.Polyline({
      path: routePath,
      geodesic: true,
      strokeColor: "#1b3f9e",
      strokeOpacity: 0.85,
      strokeWeight: 4,
      map: googleMap
    });
  }

  if (routePath.length === 1) {
    googleMap.setCenter(routePath[0]);
    googleMap.setZoom(15);
  } else if (routePath.length > 1) {
    googleMap.fitBounds(bounds);

    google.maps.event.addListenerOnce(
      googleMap,
      "bounds_changed",
      function () {
        if (googleMap.getZoom() > 15) {
          googleMap.setZoom(15);
        }
      }
    );
	  } else {
	    console.warn("지도에 표시할 수 있는 장소 좌표가 없습니다.");
	  }
	}

	function escapeMapText(value) {
	  return String(value ?? "")
	    .replace(/&/g, "&amp;")
	    .replace(/</g, "&lt;")
	    .replace(/>/g, "&gt;")
	    .replace(/"/g, "&quot;")
	    .replace(/'/g, "&#039;");
	}

	/* ==================================================
	   AI 여행 일정 DB 저장
	================================================== */

	function formatLocalDate(date) {
	  const year = date.getFullYear();

	  const month = String(
	    date.getMonth() + 1
	  ).padStart(2, "0");

	  const day = String(
	    date.getDate()
	  ).padStart(2, "0");

	  return `${year}-${month}-${day}`;
	}

	function parseTripDateRange(value) {
	  if (!value) {
	    return null;
	  }

	  const text = String(value).trim();

	  // 예: 2026-07-29 ~ 2026-07-31
	  const isoDates = text.match(/\d{4}-\d{2}-\d{2}/g);

	  if (isoDates && isoDates.length >= 2) {
	    return {
	      startDate: isoDates[0],
	      endDate: isoDates[1]
	    };
	  }

	  // 예: 7월 29일 ~ 7월 31일
	  const koreanDates = [
	    ...text.matchAll(
	      /(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일/g
	    )
	  ];

	  if (koreanDates.length < 2) {
	    return null;
	  }

	  const currentYear = new Date().getFullYear();

	  const startYear =
	    Number(koreanDates[0][1]) || currentYear;

	  const startMonth = Number(koreanDates[0][2]);
	  const startDay = Number(koreanDates[0][3]);

	  const endYear =
	    Number(koreanDates[1][1]) || startYear;

	  const endMonth = Number(koreanDates[1][2]);
	  const endDay = Number(koreanDates[1][3]);

	  const startDate = new Date(
	    startYear,
	    startMonth - 1,
	    startDay
	  );

	  let endDate = new Date(
	    endYear,
	    endMonth - 1,
	    endDay
	  );

	  // 12월 30일 ~ 1월 2일과 같이 연도가 넘어가는 경우
	  if (endDate < startDate) {
	    endDate = new Date(
	      startYear + 1,
	      endMonth - 1,
	      endDay
	    );
	  }

	  return {
	    startDate: formatLocalDate(startDate),
	    endDate: formatLocalDate(endDate)
	  };
	}

	saveTripBtn?.addEventListener(
	  "click",
	  async function () {
	    if (!latestGeneratedTrip || !latestTripConditions) {
	      alert("먼저 AI 여행 일정을 생성해주세요.");
	      return;
	    }

	    const dateRange = parseTripDateRange(
	      latestTripConditions.period
	    );

	    if (!dateRange) {
	      alert(
	        "여행 날짜를 읽을 수 없습니다. 날짜를 다시 선택해주세요."
	      );
	      return;
	    }

	    const peopleNumber =
	      Number(latestTripConditions.companionCount) || 1;

	    const saveData = {
	      title:
	        latestGeneratedTrip.title ||
	        `${latestTripConditions.destination} 여행`,

	      destination:
	        latestGeneratedTrip.destination ||
	        latestTripConditions.destination,

	      startDate: dateRange.startDate,
	      endDate: dateRange.endDate,

	      people: peopleNumber,

	      budget:
	        Number(latestTripConditions.budget) || 0,

	      style:
	        latestGeneratedTrip.style ||
	        latestTripConditions.travelStyleText ||
	        "",

	      transportType:
	        latestGeneratedTrip.transportType ||
	        "대중교통",

	      days: Array.isArray(latestGeneratedTrip.days)
	        ? latestGeneratedTrip.days
	        : []
	    };

	    console.log("DB 저장 요청 데이터:", saveData);

	    saveTripBtn.disabled = true;
	    saveTripBtn.textContent = "저장 중...";

	    if (tripSaveMessage) {
	      tripSaveMessage.textContent = "";
	      tripSaveMessage.classList.remove("error");
	    }

	    try {
	      const response = await fetch("/trip/save", {
	        method: "POST",
	        headers: {
	          "Content-Type": "application/json"
	        },
	        body: JSON.stringify(saveData)
	      });

	      let result;

	      try {
	        result = await response.json();
	      } catch (jsonError) {
	        throw new Error(
	          `서버 응답을 읽을 수 없습니다. 상태 코드: ${response.status}`
	        );
	      }

	      if (response.status === 401) {
	        alert(
	          result.message ||
	          "로그인이 필요한 기능입니다."
	        );

	        window.location.href = "/";
	        return;
	      }

	      if (!response.ok || !result.success) {
	        throw new Error(
	          result.message ||
	          "여행 일정 저장에 실패했습니다."
	        );
	      }

	      if (tripSaveMessage) {
	        tripSaveMessage.textContent =
	          `✅ ${result.message}`;

	        tripSaveMessage.classList.remove("error");
	      }

	      saveTripBtn.textContent = "✅ 저장 완료";
	      saveTripBtn.disabled = true;

	      console.log("저장된 여행 ID:", result.tripId);

	    } catch (error) {
	      console.error("여행 일정 저장 오류:", error);

	      if (tripSaveMessage) {
	        tripSaveMessage.textContent =
	          error.message ||
	          "여행 일정 저장 중 오류가 발생했습니다.";

	        tripSaveMessage.classList.add("error");
	      }

	      saveTripBtn.disabled = false;
	      saveTripBtn.textContent = "💾 여행 일정 저장";
	    }
	  }
	);	
	
	
	/* ==================================================
	   DB에 저장된 여행 상세 불러오기
	================================================== */

	async function loadSavedTripDetail(tripId) {
	  console.log("저장된 여행 상세 조회 시작:", tripId);

	  try {
	    const response = await fetch(`/trip/${tripId}`);

	    let data;

	    try {
	      data = await response.json();
	    } catch (jsonError) {
	      throw new Error(
	        `서버 응답을 읽을 수 없습니다. (${response.status})`
	      );
	    }

	    console.log("저장된 여행 상세 응답:", data);

	    if (response.status === 401) {
	      alert(
	        data.message ||
	        "로그인이 필요한 기능입니다."
	      );

	      window.location.href = "/";
	      return;
	    }

	    if (
	      !response.ok ||
	      !data.success ||
	      !data.trip
	    ) {
	      throw new Error(
	        data.message ||
	        "저장된 여행 일정을 불러오지 못했습니다."
	      );
	    }

	    const trip = data.trip;

	    latestGeneratedTrip = trip;

	    latestTripConditions = {
	      destination: trip.destination || "",
	      period:
	        trip.startDate && trip.endDate
	          ? `${trip.startDate} ~ ${trip.endDate}`
	          : "",
	      companionCount: trip.people || 1,
	      companionType: "",
	      peopleText: `${trip.people || 1}명`,
	      budget: Number(trip.budget || 0),
	      budgetText: String(trip.budget || ""),
	      travelStyleValue: trip.style || "",
	      travelStyleText: trip.style || ""
	    };

	    localStorage.setItem(
	      "latestTrip",
	      JSON.stringify(trip)
	    );

	    /* 입력창에도 저장된 값 표시 */
	    const destinationInput =
	      document.getElementById("destination");

	    const durationInput =
	      document.getElementById("duration");

	    const companionCountInput =
	      document.getElementById("companionCount");

	    const budgetInput =
	      document.getElementById("budget");

	    if (destinationInput) {
	      destinationInput.value =
	        trip.destination || "";
	    }

	    if (durationInput) {
	      durationInput.value =
	        trip.startDate && trip.endDate
	          ? `${trip.startDate} ~ ${trip.endDate}`
	          : "";
	    }

	    if (companionCountInput) {
	      companionCountInput.value =
	        trip.people || "";
	    }

	    if (budgetInput) {
	      budgetInput.value =
	        trip.budget
	          ? `${Number(trip.budget).toLocaleString()}원`
	          : "";
	    }

	    renderItinerary(trip);

	    /*
	     * 지도 API가 이미 준비됐으면 바로 표시하고,
	     * 아직 준비 전이면 initMap()에서 latestTrip을 읽어 표시함
	     */
	    if (
	      typeof google !== "undefined" &&
	      googleMap
	    ) {
	      showPlacesOnMap(trip);
	    }

	    if (saveTripBtn) {
	      saveTripBtn.hidden = true;
	    }

	    if (tripSaveMessage) {
	      tripSaveMessage.textContent =
	        "📂 저장된 여행 일정을 불러왔습니다.";

	      tripSaveMessage.classList.remove("error");
	    }

	  } catch (error) {
	    console.error(
	      "저장된 여행 상세 불러오기 오류:",
	      error
	    );

	    if (itineraryContent) {
	      itineraryContent.innerHTML = `
	        <h3>🕒 AI 추천 일정</h3>
	        <p class="placeholder-text">
	          ${error.message}
	        </p>
	      `;
	    }

	    alert(error.message);
	  }
	}

	/* common.js가 메인 화면에서 호출할 수 있게 등록 */
	window.loadSavedTripDetail =
	  loadSavedTripDetail;


	  /* ==================================================
	     URL의 tripId로 저장된 여행 불러오기
	  ================================================== */

	  document.addEventListener(
	    "DOMContentLoaded",
	    async function () {
	      const params =
	        new URLSearchParams(
	          window.location.search
	        );

	      const tripId =
	        params.get("tripId");

	      if (!tripId) {
	        return;
	      }

	      console.log(
	        "URL에서 받은 여행 ID:",
	        tripId
	      );

	      if (
	        typeof setActiveTripId === "function"
	      ) {
	        setActiveTripId(tripId);
	      }

	      await loadSavedTripDetail(tripId);
	    }
	  );
	  

	    