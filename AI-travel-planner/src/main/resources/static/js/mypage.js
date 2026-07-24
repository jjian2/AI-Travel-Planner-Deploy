// --- 1. 프로필 사진 변경 관련 로직 ---
const avatarContainer = document.getElementById('avatarContainer');
const avatarInput = document.getElementById('avatarInput');
const profileImg = document.getElementById('profileImg');

avatarContainer.addEventListener('click', () => {
    avatarInput.click();
});

avatarInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 선택 가능합니다.');
            return;
        }
        const reader = new FileReader();
        reader.onload = (event) => {
            profileImg.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// --- 2. 프로필 정보 저장 (필수값 체크 및 색상 피드백) ---
document.addEventListener("DOMContentLoaded", function () {
  const avatarContainer =
    document.getElementById("avatarContainer");

  const avatarInput =
    document.getElementById("avatarInput");

  const profileImg =
    document.getElementById("profileImg");

  const profileForm =
    document.getElementById("profileForm");

  const passwordForm =
    document.getElementById("passwordForm");

  const withdrawBtn =
    document.getElementById("withdrawBtn");

  /*
   * 비로그인 상태에서는 Thymeleaf가 기존 마이페이지 form을
   * 렌더링하지 않으므로, 아래 요소가 없어도 오류가 나지 않게 처리한다.
   */
  if (
    avatarContainer &&
    avatarInput &&
    profileImg
  ) {
    avatarContainer.addEventListener("click", function () {
      avatarInput.click();
    });

    avatarInput.addEventListener("change", function (event) {
      const file = event.target.files[0];

      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        alert("이미지 파일만 선택할 수 있습니다.");
        avatarInput.value = "";
        return;
      }

      const reader = new FileReader();

      reader.onload = function (readerEvent) {
        profileImg.src = readerEvent.target.result;
      };

      reader.readAsDataURL(file);
    });
  }

  /* 회원정보 수정 */
  profileForm?.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      const name =
        document.getElementById("profileName").value.trim();

      const email =
        document.getElementById("profileEmail").value.trim();

      const message =
        document.getElementById("profileSaveMsg");

      message.textContent = "";

      if (!name || !email) {
        message.textContent =
          "이름과 이메일을 모두 입력해주세요.";

        message.style.color = "#dc2626";
        return;
      }

      const submitButton =
        profileForm.querySelector(
          'button[type="submit"]'
        );

      submitButton.disabled = true;
      submitButton.textContent = "저장 중...";

      try {
        const body = new URLSearchParams();

        body.append("name", name);
        body.append("email", email);

        const response = await fetch(
          "/api/mypage/profile",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded;charset=UTF-8"
            },
            body: body.toString()
          }
        );

        if (!response.ok) {
          throw new Error(
            `회원정보 수정 실패: ${response.status}`
          );
        }

        const result = await response.text();

        if (result === "SUCCESS") {
          message.textContent =
            "회원정보가 저장되었습니다.";

          message.style.color = "#1b3f9e";
          return;
        }

        if (result === "LOGIN_REQUIRED") {
          alert("로그인이 필요합니다.");
          window.location.href = "/";
          return;
        }

        if (result === "INVALID_INPUT") {
          message.textContent =
            "이름과 이메일을 확인해주세요.";

          message.style.color = "#dc2626";
          return;
        }

        message.textContent =
          "회원정보 저장에 실패했습니다.";

        message.style.color = "#dc2626";

      } catch (error) {
        console.error("회원정보 수정 오류:", error);

        message.textContent =
          "서버 연결 중 오류가 발생했습니다.";

        message.style.color = "#dc2626";

      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "정보 저장";
      }
    }
  );

  /* 비밀번호 변경 */
  passwordForm?.addEventListener(
    "submit",
    async function (event) {
      event.preventDefault();

      const currentPassword =
        document.getElementById("currentPw").value;

      const newPassword =
        document.getElementById("newPw").value;

      const newPasswordConfirm =
        document.getElementById("newPwConfirm").value;

      const errorMessage =
        document.getElementById("newPwMismatchMsg");

      const successMessage =
        document.getElementById("passwordSaveMsg");

      errorMessage.textContent = "";
      successMessage.textContent = "";

      if (
        !currentPassword ||
        !newPassword ||
        !newPasswordConfirm
      ) {
        errorMessage.textContent =
          "모든 비밀번호 칸을 입력해주세요.";
        return;
      }

      if (newPassword.length < 8) {
        errorMessage.textContent =
          "새 비밀번호는 8자 이상이어야 합니다.";
        return;
      }

      if (newPassword !== newPasswordConfirm) {
        errorMessage.textContent =
          "새 비밀번호가 일치하지 않습니다.";
        return;
      }

      if (currentPassword === newPassword) {
        errorMessage.textContent =
          "현재 비밀번호와 다른 비밀번호를 입력해주세요.";
        return;
      }

      const submitButton =
        passwordForm.querySelector(
          'button[type="submit"]'
        );

      submitButton.disabled = true;
      submitButton.textContent = "변경 중...";

      try {
        const body = new URLSearchParams();

        body.append(
          "currentPassword",
          currentPassword
        );

        body.append(
          "newPassword",
          newPassword
        );

        const response = await fetch(
          "/api/mypage/password",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/x-www-form-urlencoded;charset=UTF-8"
            },
            body: body.toString()
          }
        );

        if (!response.ok) {
          throw new Error(
            `비밀번호 변경 실패: ${response.status}`
          );
        }

        const result = await response.text();

        if (result === "SUCCESS") {
          successMessage.textContent =
            "비밀번호가 변경되었습니다.";

          successMessage.style.color = "#1b3f9e";

          passwordForm.reset();
          return;
        }

        if (result === "WRONG_CURRENT_PASSWORD") {
          errorMessage.textContent =
            "현재 비밀번호가 일치하지 않습니다.";
          return;
        }

        if (result === "INVALID_PASSWORD") {
          errorMessage.textContent =
            "새 비밀번호는 8자 이상이어야 합니다.";
          return;
        }

        if (result === "LOGIN_REQUIRED") {
          alert("로그인이 필요합니다.");
          window.location.href = "/";
          return;
        }

        errorMessage.textContent =
          "비밀번호 변경에 실패했습니다.";

      } catch (error) {
        console.error("비밀번호 변경 오류:", error);

        errorMessage.textContent =
          "서버 연결 중 오류가 발생했습니다.";

      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "비밀번호 저장";
      }
    }
  );

  /*
   * 회원 탈퇴는 아직 실제 API가 없기 때문에
   * 거짓으로 '탈퇴되었습니다'라고 표시하지 않는다.
   */
  /* 회원 탈퇴 */
  withdrawBtn?.addEventListener("click", async function () {
    const confirmed = confirm(
      "정말 회원 탈퇴하시겠습니까?\n저장된 여행 일정과 회원 정보가 모두 삭제됩니다."
    );

    if (!confirmed) {
      return;
    }

    withdrawBtn.disabled = true;
    withdrawBtn.textContent = "탈퇴 처리 중...";

    try {
      const response = await fetch("/user/delete", {
        method: "POST"
      });

      if (response.status === 401) {
        alert("로그인이 필요합니다.");
        window.location.href = "/";
        return;
      }

      if (!response.ok) {
        throw new Error(
          `회원 탈퇴 실패: ${response.status}`
        );
      }

      /*
       * 브라우저에 남아 있는 여행 관련 데이터도 제거
       */
      localStorage.removeItem("latestTrip");
      sessionStorage.removeItem(
        "ai_travel_planner_active_trip"
      );

      alert("회원 탈퇴가 완료되었습니다.");

      window.location.href = "/";

    } catch (error) {
      console.error("회원 탈퇴 오류:", error);

      alert(
        "회원 탈퇴 중 오류가 발생했습니다."
      );

      withdrawBtn.disabled = false;
      withdrawBtn.textContent = "회원 탈퇴";
    }
  });
  });