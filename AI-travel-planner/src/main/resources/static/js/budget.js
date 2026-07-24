const BUDGET_CATEGORY_KEY =
  "ai_travel_planner_budget_categories";

const BUDGET_ITEM_KEY_PREFIX =
  "ai_travel_planner_budget_items";

const BUDGET_TARGET_KEY_PREFIX =
  "ai_travel_planner_budget_target";


const DEFAULT_CATEGORIES = [
  "숙소",
  "교통",
  "식비",
  "쇼핑",
  "입장료"
];

/* 현재 선택된 여행 ID */
function getCurrentTripId() {
  const params =
    new URLSearchParams(window.location.search);

  const urlTripId =
    params.get("tripId");

  if (urlTripId) {
    sessionStorage.setItem(
      ACTIVE_TRIP_KEY,
      urlTripId
    );

    return urlTripId;
  }

  return sessionStorage.getItem(
    ACTIVE_TRIP_KEY
  );
}

/* 여행별 지출 저장 키 */
function getBudgetItemKey() {
  const tripId = getCurrentTripId();

  return tripId
    ? `${BUDGET_ITEM_KEY_PREFIX}_${tripId}`
    : `${BUDGET_ITEM_KEY_PREFIX}_unselected`;
}

/* 여행별 총예산 저장 키 */
function getBudgetTargetKey() {
  const tripId = getCurrentTripId();

  return tripId
    ? `${BUDGET_TARGET_KEY_PREFIX}_${tripId}`
    : `${BUDGET_TARGET_KEY_PREFIX}_unselected`;
}

/* ===================== localStorage 데이터 ===================== */

function getCategories() {
  const saved = JSON.parse(localStorage.getItem(BUDGET_CATEGORY_KEY) || "null");
  return saved && saved.length > 0 ? saved : DEFAULT_CATEGORIES.slice();
}

function saveCategories(categories) {
  localStorage.setItem(BUDGET_CATEGORY_KEY, JSON.stringify(categories));
}

function getExpenseItems() {
  try {
    const saved =
      JSON.parse(
        localStorage.getItem(
          getBudgetItemKey()
        ) || "[]"
      );

    if (!Array.isArray(saved)) {
      return [];
    }

    /*
     * 과거 데이터에 category나 amount가 없더라도
     * undefined가 표시되지 않도록 보정
     */
    return saved.map((item) => ({
      ...item,
      id:
        item.id ||
        `${Date.now()}-${Math.random()}`,

      date:
        item.date || "",

      category:
        item.category || "기타",

      memo:
        item.memo || "",

      amount:
        Number(item.amount || 0)
    }));

  } catch (error) {
    console.error(
      "지출 내역 불러오기 실패:",
      error
    );

    return [];
  }
}

function saveExpenseItems(items) {
  localStorage.setItem(
    getBudgetItemKey(),
    JSON.stringify(items)
  );
}

function getBudgetTarget() {
  const value =
    Number(
      localStorage.getItem(
        getBudgetTargetKey()
      ) || "0"
    );

  return Number.isFinite(value)
    ? value
    : 0;
}

function saveBudgetTarget(value) {
  localStorage.setItem(
    getBudgetTargetKey(),
    String(value)
  );
}

/* ===================== DOM 참조 ===================== */

const budgetTargetInput = document.getElementById("budgetTargetInput");
const budgetTargetSaveBtn = document.getElementById("budgetTargetSaveBtn");
const totalSpentValue = document.getElementById("totalSpentValue");
const remainingLabel = document.getElementById("remainingLabel");
const remainingValue = document.getElementById("remainingValue");
const budgetProgressFill = document.getElementById("budgetProgressFill");
const categorySummaryList = document.getElementById("categorySummaryList");

const categoryChipList = document.getElementById("categoryChipList");
const newCategoryInput = document.getElementById("newCategoryInput");
const addCategoryBtn = document.getElementById("addCategoryBtn");

const expenseForm = document.getElementById("expenseForm");
const expenseDate = document.getElementById("expenseDate");
const expenseCategory = document.getElementById("expenseCategory");
const expenseAmount = document.getElementById("expenseAmount");
const expenseMemo = document.getElementById("expenseMemo");

const expenseList = document.getElementById("expenseList");
const expenseEmptyMsg = document.getElementById("expenseEmptyMsg");

const runAiAnalysisBtn = document.getElementById("runAiAnalysisBtn");
const aiAnalysisResult = document.getElementById("aiAnalysisResult");

const ocrFileInput = document.getElementById("ocrFileInput");
const ocrFileName = document.getElementById("ocrFileName");
const ocrStatus = document.getElementById("ocrStatus");
const ocrConfirmForm = document.getElementById("ocrConfirmForm");
const ocrDate = document.getElementById("ocrDate");
const ocrCategory = document.getElementById("ocrCategory");
const ocrAmount = document.getElementById("ocrAmount");
const ocrMemo = document.getElementById("ocrMemo");

/* ===================== 렌더링 ===================== */

function renderAll() {
  renderCategoryChips();
  renderCategoryOptions();
  renderExpenseList();
  renderSummary();
}

/* 카테고리 칩 (관리 카드) */
function renderCategoryChips() {
  const categories = getCategories();
  categoryChipList.innerHTML = "";

  categories.forEach((cat) => {
    const chip = document.createElement("span");
    chip.className = "category-chip";
    chip.innerHTML = `
      <span class="chip-name"></span>
      <button type="button" class="category-chip-delete" aria-label="카테고리 삭제">✕</button>
    `;
    chip.querySelector(".chip-name").textContent = cat;

    chip.querySelector(".category-chip-delete").addEventListener("click", () => {
      if (categories.length <= 1) {
        alert("카테고리는 최소 1개 이상 있어야 해요.");
        return;
      }
      if (!confirm(`"${cat}" 카테고리를 삭제할까요? (이미 등록된 지출의 카테고리 표시는 유지돼요)`)) return;

      const updated = getCategories().filter((c) => c !== cat);
      saveCategories(updated);
      renderAll();
    });

    categoryChipList.appendChild(chip);
  });
}

/* 지출 추가 / OCR 확인 폼의 카테고리 <select> 옵션 */
function renderCategoryOptions() {
  const categories = getCategories();
  const prevExpenseValue = expenseCategory.value;
  const prevOcrValue = ocrCategory.value;

  [expenseCategory, ocrCategory].forEach((select) => {
    select.innerHTML = "";
    categories.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
  });

  if (categories.includes(prevExpenseValue)) expenseCategory.value = prevExpenseValue;
  if (categories.includes(prevOcrValue)) ocrCategory.value = prevOcrValue;
}

/* 지출 목록 */
function renderExpenseList() {
  const items = getExpenseItems().slice().sort((a, b) => (a.date < b.date ? 1 : -1));

  expenseList.querySelectorAll(".expense-item").forEach((el) => el.remove());
  expenseEmptyMsg.style.display = items.length > 0 ? "none" : "block";

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "expense-item";
    li.innerHTML = `
      <span class="expense-date"></span>
      <span class="expense-category-tag"></span>
      <span class="expense-memo"></span>
      <span class="expense-amount"></span>
      <button type="button" class="expense-delete-btn" aria-label="삭제">✕</button>
    `;
    li.querySelector(".expense-date").textContent = item.date || "-";
	li.querySelector(
	  ".expense-category-tag"
	).textContent =
	  item.category || "기타";
    li.querySelector(".expense-memo").textContent = item.memo || "-";
	li.querySelector(
	  ".expense-amount"
	).textContent =
	  `${Number(
	    item.amount || 0
	  ).toLocaleString()}원`;

    li.querySelector(".expense-delete-btn").addEventListener("click", () => {
      const updated = getExpenseItems().filter((i) => i.id !== item.id);
      saveExpenseItems(updated);
      renderAll();
      // TODO: 실제 서비스에서는 여기서 서버에 삭제 API 호출
    });

    expenseList.appendChild(li);
  });
}

/* 예산 요약 (총 지출 / 남은 예산 / 진행바 / 카테고리별 소계) */
function renderSummary() {
  const items = getExpenseItems();
  const target = getBudgetTarget();
  const totalSpent = items.reduce(
    (sum, item) =>
      sum + Number(item.amount || 0),
    0
  );

  budgetTargetInput.value = target > 0 ? target : "";
  totalSpentValue.textContent = `${totalSpent.toLocaleString()}원`;

  if (target > 0) {
    const remaining = target - totalSpent;
    const isOver = remaining < 0;

    remainingLabel.textContent = isOver ? "예산 초과" : "남은 예산";
    remainingValue.textContent = `${Math.abs(remaining).toLocaleString()}원`;
    remainingValue.classList.toggle("over-budget", isOver);
    remainingValue.classList.toggle("under-budget", !isOver);

    const percent = Math.min(100, Math.round((totalSpent / target) * 100));
    budgetProgressFill.style.width = `${percent}%`;
    budgetProgressFill.classList.toggle("over-budget", isOver);
  } else {
    remainingLabel.textContent = "남은 예산";
    remainingValue.textContent = "총 예산을 입력해주세요";
    remainingValue.classList.remove("over-budget", "under-budget");
    budgetProgressFill.style.width = "0%";
    budgetProgressFill.classList.remove("over-budget");
  }

  // 카테고리별 소계
  const categories = getCategories();
  const sumsByCategory = {};
  categories.forEach((cat) => (sumsByCategory[cat] = 0));
  items.forEach((item) => {
      const category = item.category || "기타";

      sumsByCategory[category] =
          (sumsByCategory[category] || 0)
          + item.amount;
  });

  categorySummaryList.innerHTML = "";
  const hasAnySpending = Object.values(sumsByCategory).some((v) => v > 0);

  if (!hasAnySpending) {
    const empty = document.createElement("li");
    empty.className = "category-empty-msg";
    empty.textContent = "카테고리별 지출이 아직 없어요.";
    categorySummaryList.appendChild(empty);
    return;
  }

  Object.keys(sumsByCategory).forEach((cat) => {
    if (sumsByCategory[cat] <= 0) return;
    const li = document.createElement("li");
    li.innerHTML = `<span class="cat-name"></span><span class="cat-amount"></span>`;
    li.querySelector(".cat-name").textContent = cat;
    li.querySelector(".cat-amount").textContent = `${sumsByCategory[cat].toLocaleString()}원`;
    categorySummaryList.appendChild(li);
  });
}

/* ===================== 카테고리 추가 ===================== */

addCategoryBtn.addEventListener("click", () => {
  const name = newCategoryInput.value.trim();
  if (!name) {
    alert("카테고리 이름을 입력해주세요.");
    return;
  }

  const categories = getCategories();
  if (categories.includes(name)) {
    alert("이미 있는 카테고리예요.");
    return;
  }

  categories.push(name);
  saveCategories(categories);
  newCategoryInput.value = "";
  renderAll();
});

newCategoryInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addCategoryBtn.click();
  }
});

/* ===================== 총 예산 저장 ===================== */

budgetTargetSaveBtn.addEventListener("click", () => {
  const value = Number(budgetTargetInput.value.trim().replace(/,/g, ""));
  if (!value || value <= 0) {
    alert("숫자로 된 예산 금액을 입력해주세요.");
    return;
  }
  saveBudgetTarget(value);
  renderSummary();
  // TODO: 실제 서비스에서는 여기서 서버에 예산 목표 저장 API 호출
});

/* ===================== 지출 추가 폼 ===================== */

expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const date = expenseDate.value;
  const category = expenseCategory.value;
  const amount = Number(expenseAmount.value.trim().replace(/,/g, ""));
  const memo = expenseMemo.value.trim();

  if (!date || !category || !amount || isNaN(amount) || amount <= 0) {
    alert("날짜, 카테고리, 금액을 정확히 입력해주세요.");
    return;
  }

  addExpenseItem({ date, category, amount, memo });
  expenseForm.reset();
  // TODO: 실제 서비스에서는 여기서 서버에 지출 저장 API 호출
});

function addExpenseItem({ date, category, amount, memo }) {
  const items = getExpenseItems();
  items.push({ id: Date.now(), date, category, amount, memo });
  saveExpenseItems(items);
  renderAll();
}

/* ===================== AI 예산 분석 (mock) ===================== */

runAiAnalysisBtn.addEventListener("click", async () => {
  const items = getExpenseItems();

  if (items.length === 0) {
    aiAnalysisResult.innerHTML = `<p class="placeholder-text">아직 등록된 지출이 없어요. 지출을 먼저 추가해주세요.</p>`;
    return;
  }

  runAiAnalysisBtn.disabled = true;
  aiAnalysisResult.innerHTML = `<p class="ai-analysis-loading">AI가 예산을 분석하고 있어요...</p>`;

  /*
   * TODO: 실제 AI 연동 시 아래를 백엔드 API 호출로 교체
   * const response = await fetch("http://localhost:8080/api/budget/analyze", { ... });
   * const data = await response.json();
   */
  await new Promise((resolve) => setTimeout(resolve, 900));

  const target = getBudgetTarget();
  const totalSpent = items.reduce((sum, i) => sum + i.amount, 0);

  const categories = getCategories();
  const sumsByCategory = {};
  categories.forEach((cat) => (sumsByCategory[cat] = 0));
  items.forEach((item) => {
    const category =
      item.category || "기타";

    sumsByCategory[category] =
      (
        sumsByCategory[category] ||
        0
      ) +
      Number(item.amount || 0);
  });

  const listHtml = Object.keys(sumsByCategory)
    .filter((cat) => sumsByCategory[cat] > 0)
    .map((cat) => `<li>${cat}: ${sumsByCategory[cat].toLocaleString()}원</li>`)
    .join("");

  let conclusionHtml = "";
  if (target > 0) {
    const isOver = totalSpent > target;
    const diff = Math.abs(target - totalSpent);
    conclusionHtml = isOver
      ? `<div class="ai-analysis-conclusion over-budget">⚠️ 총 예산보다 ${diff.toLocaleString()}원 초과했어요.</div>`
      : `<div class="ai-analysis-conclusion under-budget">✅ 총 예산 안에서 ${diff.toLocaleString()}원 여유가 있어요.</div>`;
  } else {
    conclusionHtml = `<div class="ai-analysis-conclusion under-budget">총 예산을 입력하면 초과 여부까지 알려드려요.</div>`;
  }

  aiAnalysisResult.innerHTML = `
    <p>사용자의 지출을 분석하여</p>
    <ul>${listHtml}</ul>
    <p>을(를) 계산했어요.</p>
    ${conclusionHtml}
  `;

  runAiAnalysisBtn.disabled = false;
});

/* ===================== OCR 영수증 등록 (mock) ===================== */

ocrFileInput.addEventListener("change", async () => {
  const file = ocrFileInput.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("이미지 파일만 업로드할 수 있어요.");
    ocrFileInput.value = "";
    return;
  }

  ocrFileName.textContent = file.name;
  ocrConfirmForm.style.display = "none";
  ocrStatus.textContent = "영수증을 인식하고 있어요...";

  /*
   * TODO: 실제 OCR 연동 시 아래를 백엔드 API 호출로 교체
   * const formData = new FormData();
   * formData.append("receipt", file);
   * const response = await fetch("http://localhost:8080/api/ocr/receipt", { method: "POST", body: formData });
   * const data = await response.json();   // { amount, place, date } 등
   */
  await new Promise((resolve) => setTimeout(resolve, 1200));

  // mock: 파일명을 상호명처럼 사용하고, 금액은 임의로 생성
  const fakeAmount = Math.floor((Math.random() * 45000 + 5000) / 100) * 100;
  const fakePlaceName = file.name.replace(/\.[^/.]+$/, "");

  ocrStatus.textContent = "인식이 완료됐어요. 아래 내용을 확인하고 추가해주세요.";

  ocrDate.value = new Date().toISOString().slice(0, 10);
  ocrAmount.value = fakeAmount;
  ocrMemo.value = fakePlaceName;
  ocrCategory.selectedIndex = 0;

  ocrConfirmForm.style.display = "flex";
});

ocrConfirmForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const date = ocrDate.value;
  const category = ocrCategory.value;
  const amount = Number(ocrAmount.value.trim().replace(/,/g, ""));
  const memo = ocrMemo.value.trim();

  if (!date || !category || !amount || isNaN(amount) || amount <= 0) {
    alert("날짜, 카테고리, 금액을 확인해주세요.");
    return;
  }

  addExpenseItem({ date, category, amount, memo });

  ocrConfirmForm.reset();
  ocrConfirmForm.style.display = "none";
  ocrFileInput.value = "";
  ocrFileName.textContent = "";
  ocrStatus.textContent = "가계부에 추가됐어요. ✅";

  // TODO: 실제 서비스에서는 여기서 서버에 영수증 원본 + 지출 데이터 저장 API 호출
});

/* ===================== 초기화 ===================== */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    const tripId =
      getCurrentTripId();

    expenseDate.value =
      new Date()
        .toISOString()
        .slice(0, 10);

    if (!tripId) {
      alert(
        "여행별 가계부를 이용하려면 사이드바에서 여행 일정을 먼저 선택해주세요."
      );

      if (expenseForm) {
        expenseForm
          .querySelectorAll(
            "input, select, button"
          )
          .forEach((element) => {
            element.disabled = true;
          });
      }

      if (budgetTargetSaveBtn) {
        budgetTargetSaveBtn.disabled = true;
      }
    }

    renderAll();

    console.log(
      "현재 가계부 여행 ID:",
      tripId
    );

    console.log(
      "현재 지출 저장 키:",
      getBudgetItemKey()
    );
  }
);

/* 예산 및 데이터 초기화 기능 */
document
  .getElementById("resetBudgetBtn")
  .addEventListener("click", () => {
    const tripId =
      getCurrentTripId();

    if (!tripId) {
      alert(
        "먼저 사이드바에서 여행을 선택해주세요."
      );
      return;
    }

    if (
      !confirm(
        "현재 여행의 예산과 지출 내역을 모두 초기화하시겠습니까?"
      )
    ) {
      return;
    }

    localStorage.removeItem(
      getBudgetTargetKey()
    );

    localStorage.removeItem(
      getBudgetItemKey()
    );

    budgetTargetInput.value = "";

    renderAll();

    alert(
      "현재 여행의 가계부가 초기화되었습니다."
    );
  });