/* ============================================================
 * common.js
 * 모든 페이지 공통 기능
 * - DB에 저장된 여행 목록 불러오기
 * - 사이드바 여행 목록 표시
 * - 저장된 여행 선택
 * - 여행 삭제
 * - 새 여행 만들기
 * - 메뉴 활성화
 * ============================================================ */

const ACTIVE_TRIP_KEY = "ai_travel_planner_active_trip";

/* =========================
   현재 선택된 여행 ID
========================= */

function getActiveTripId() {
  return sessionStorage.getItem(ACTIVE_TRIP_KEY);
}

function setActiveTripId(id) {
  if (id == null) {
    return;
  }

  sessionStorage.setItem(
    ACTIVE_TRIP_KEY,
    String(id)
  );

  highlightActiveTrip(id);
}

function clearActiveTripId() {
  sessionStorage.removeItem(ACTIVE_TRIP_KEY);
  highlightActiveTrip(null);
}

/* =========================
   날짜 표시
========================= */

function formatSidebarDate(value) {
  if (!value) {
    return "";
  }

  const parts = String(value).split("-");

  if (parts.length !== 3) {
    return String(value);
  }

  return `${Number(parts[1])}/${Number(parts[2])}`;
}

/* =========================
   HTML 안전 처리
========================= */

function escapeCommonHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* =========================
   DB 여행 목록 불러오기
========================= */

async function loadSidebarTrips() {
  const tripList =
    document.getElementById("tripList");

  const tripEmptyMsg =
    document.getElementById("tripEmptyMsg");

  const tripAddItem =
    document.getElementById("tripAddItem");

  if (!tripList) {
    return;
  }

  try {
    const response = await fetch("/trip/list");

    if (response.status === 401) {
      tripList
        .querySelectorAll(".saved-trip-item")
        .forEach((item) => item.remove());

      if (tripEmptyMsg) {
        tripEmptyMsg.style.display = "list-item";
        tripEmptyMsg.textContent =
          "로그인하면 저장된 여행을 확인할 수 있어요.";
      }

      return;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "저장된 여행 목록을 불러오지 못했습니다."
      );
    }

    tripList
      .querySelectorAll(".saved-trip-item")
      .forEach((item) => item.remove());

    const trips = Array.isArray(data.trips)
      ? data.trips
      : [];

    if (tripEmptyMsg) {
      tripEmptyMsg.style.display =
        trips.length === 0
          ? "list-item"
          : "none";

      tripEmptyMsg.textContent =
        "아직 생성된 여행이 없어요.";
    }

    const activeTripId =
      getActiveTripId();

    trips.forEach((trip) => {
      const li =
        document.createElement("li");

      li.className = "saved-trip-item";

      const startDate =
        formatSidebarDate(trip.startDate);

      const endDate =
        formatSidebarDate(trip.endDate);

      const title =
        escapeCommonHtml(
          trip.title ||
          trip.destination ||
          "저장된 여행"
        );

      li.innerHTML = `
        <div class="saved-trip-row">

          <button
            type="button"
            class="saved-trip-button"
            data-trip-id="${trip.id}">

            <span class="saved-trip-title">
              ${title}
            </span>

            <span class="saved-trip-date">
              ${startDate}
              ${
                startDate && endDate
                  ? " ~ "
                  : ""
              }
              ${endDate}
            </span>

          </button>

          <button
            type="button"
            class="saved-trip-delete"
            data-trip-id="${trip.id}"
            aria-label="여행 삭제"
            title="여행 삭제">
            ×
          </button>

        </div>
      `;

      if (
        activeTripId &&
        String(activeTripId) ===
          String(trip.id)
      ) {
        li
          .querySelector(".saved-trip-button")
          ?.classList.add("active");
      }

      tripList.insertBefore(
        li,
        tripAddItem || null
      );
    });

  } catch (error) {
    console.error(
      "여행 목록 불러오기 오류:",
      error
    );

    if (tripEmptyMsg) {
      tripEmptyMsg.style.display = "list-item";
      tripEmptyMsg.textContent =
        "여행 목록을 불러오지 못했습니다.";
    }
  }
}

/* =========================
   저장된 여행 선택
========================= */

function goToTrip(tripId) {
  if (!tripId) {
    return;
  }

  setActiveTripId(tripId);

  /*
   * 메인 페이지라면 main.js의 함수를 직접 실행
   */
  if (
    window.location.pathname === "/main" &&
    typeof window.loadSavedTripDetail ===
      "function"
  ) {
    window.loadSavedTripDetail(tripId);
    return;
  }

  /*
   * 다른 페이지라면 메인으로 이동 후 불러오기
   */
  window.location.href =
    `/main?tripId=${encodeURIComponent(tripId)}`;
}

/* =========================
   여행 삭제
========================= */

async function deleteSavedTrip(
  tripId,
  tripTitle
) {
  const confirmed = confirm(
    `"${tripTitle}" 여행을 삭제할까요?\n\n일정과 방문 장소도 함께 삭제됩니다.`
  );

  if (!confirmed) {
    return;
  }

  try {
    const response = await fetch(
      `/trip/${tripId}`,
      {
        method: "DELETE"
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      alert(
        data.message ||
        "로그인이 필요한 기능입니다."
      );

      window.location.href = "/";
      return;
    }

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "여행 일정 삭제에 실패했습니다."
      );
    }

    const activeTripId =
      getActiveTripId();

    if (
      String(activeTripId) ===
      String(tripId)
    ) {
      clearActiveTripId();
      localStorage.removeItem("latestTrip");

      if (
        typeof window.onActiveTripCleared ===
        "function"
      ) {
        window.onActiveTripCleared();
      }
    }

    await loadSidebarTrips();

    alert(
      data.message ||
      "여행 일정이 삭제되었습니다."
    );

  } catch (error) {
    console.error(
      "여행 삭제 오류:",
      error
    );

    alert(
      error.message ||
      "여행 삭제 중 오류가 발생했습니다."
    );
  }
}

/* =========================
   사이드바 클릭 이벤트
========================= */

function initTripListEvents() {
  const tripList =
    document.getElementById("tripList");

  if (!tripList) {
    return;
  }

  tripList.addEventListener(
    "click",
    async function (event) {

      const deleteButton =
        event.target.closest(
          ".saved-trip-delete"
        );

      if (deleteButton) {
        event.preventDefault();
        event.stopPropagation();

        const tripId =
          deleteButton.dataset.tripId;

        const row =
          deleteButton.closest(
            ".saved-trip-row"
          );

        const title =
          row
            ?.querySelector(
              ".saved-trip-title"
            )
            ?.textContent
            ?.trim() ||
          "저장된 여행";

        if (tripId) {
          await deleteSavedTrip(
            tripId,
            title
          );
        }

        return;
      }

      const tripButton =
        event.target.closest(
          ".saved-trip-button"
        );

      if (!tripButton) {
        return;
      }

      const tripId =
        tripButton.dataset.tripId;

      if (!tripId) {
        return;
      }

      goToTrip(tripId);
    }
  );
}

/* =========================
   여행 일정 펼침/접힘
========================= */

function initScheduleToggle() {
  const scheduleToggle =
    document.getElementById(
      "scheduleToggle"
    );

  if (!scheduleToggle) {
    return;
  }

  const navGroup =
    scheduleToggle.closest(".nav-group");

  scheduleToggle.addEventListener(
    "click",
    function () {
      navGroup?.classList.toggle("open");
    }
  );

  if (getActiveTripId()) {
    navGroup?.classList.add("open");
  }
}

/* =========================
   새 여행 만들기
========================= */

function initNewTripButton() {
  const tripAddItem =
    document.getElementById(
      "tripAddItem"
    );

  if (!tripAddItem) {
    return;
  }

  tripAddItem.addEventListener(
    "click",
    function () {
      clearActiveTripId();

      if (
        window.location.pathname === "/main" &&
        typeof window.onNewTripRequested ===
          "function"
      ) {
        window.onNewTripRequested();
        return;
      }

      window.location.href = "/main";
    }
  );
}

/* =========================
   메뉴 활성화
========================= */

function initSidebarNav() {
  const currentPath =
    window.location.pathname;

  document
    .querySelectorAll(
      ".nav-item:not(.nav-group-toggle)"
    )
    .forEach((item) => {
      const href =
        item.getAttribute("href");

      if (
        href &&
        href !== "#" &&
        href === currentPath &&
        !getActiveTripId()
      ) {
        item.classList.add("active");
      }
    });
}

/* =========================
   선택된 여행 강조
========================= */

function highlightActiveTrip(id) {
  document
    .querySelectorAll(
      ".saved-trip-button"
    )
    .forEach((button) => {
      button.classList.toggle(
        "active",
        Boolean(id) &&
        String(button.dataset.tripId) ===
          String(id)
      );
    });

  const navGroup =
    document.querySelector(".nav-group");

  if (navGroup && id) {
    navGroup.classList.add("open");
  }
}

/* =========================
   초기화
========================= */

document.addEventListener(
  "DOMContentLoaded",
  function () {
    initSidebarNav();
    initScheduleToggle();
    initNewTripButton();
    initTripListEvents();
    loadSidebarTrips();
  }
);