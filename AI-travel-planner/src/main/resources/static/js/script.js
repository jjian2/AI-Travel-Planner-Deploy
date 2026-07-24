document.addEventListener("DOMContentLoaded", function () {
    /* =========================================================
       요소 찾기
       ========================================================= */

    const loginForm = document.getElementById("loginForm");

    const signupModal = document.getElementById("signupModal");
    const openSignupBtn = document.getElementById("openSignup");
    const closeSignupBtn = document.getElementById("closeSignup");
    const backToLoginBtn = document.getElementById("backToLogin");

    const signupForm = document.getElementById("signupForm");

    const signupNameInput = document.getElementById("signupName");
    const signupIdInput = document.getElementById("signupId");
    const signupEmailInput = document.getElementById("signupEmail");
    const signupPwInput = document.getElementById("signupPw");
    const signupPwConfirmInput =
        document.getElementById("signupPwConfirm");

    const checkIdBtn = document.getElementById("checkIdBtn");
    const idCheckMsg = document.getElementById("idCheckMsg");
    const pwMismatchMsg =
        document.getElementById("pwMismatchMsg");

    let idCheckPassed = false;

    /* =========================================================
       회원가입 모달
       ========================================================= */

    function openModal() {
        signupModal?.classList.add("open");
    }

    function closeModal() {
        signupModal?.classList.remove("open");
        resetSignupForm();
    }

    openSignupBtn?.addEventListener("click", function (event) {
        event.preventDefault();
        openModal();
    });

    closeSignupBtn?.addEventListener("click", closeModal);

    backToLoginBtn?.addEventListener("click", function (event) {
        event.preventDefault();
        closeModal();
    });

    signupModal?.addEventListener("click", function (event) {
        if (event.target === signupModal) {
            closeModal();
        }
    });

    document.addEventListener("keydown", function (event) {
        if (
            event.key === "Escape" &&
            signupModal?.classList.contains("open")
        ) {
            closeModal();
        }
    });

    /* =========================================================
       로그인
       Spring Controller의 POST /login으로 form 데이터 전송
       ========================================================= */

    loginForm?.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username =
            document.getElementById("userId").value.trim();

        const password =
            document.getElementById("userPw").value;

        if (!username || !password) {
            alert("아이디와 비밀번호를 모두 입력해주세요.");
            return;
        }

        const loginButton =
            loginForm.querySelector('button[type="submit"]');

        loginButton.disabled = true;
        loginButton.textContent = "로그인 중...";

        try {
            const body = new URLSearchParams();

            body.append("username", username);
            body.append("password", password);

            const response = await fetch("/login", {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded;charset=UTF-8"
                },
                body: body.toString(),
                redirect: "follow"
            });

            /*
             * 로그인 성공 시 서버가 /main으로 redirect하고,
             * 실패하면 / 또는 /?error=... 쪽으로 redirect함.
             */
            if (response.redirected) {
                const redirectedUrl = new URL(response.url);

                if (
                    redirectedUrl.pathname === "/main" ||
                    redirectedUrl.pathname === "/main.html"
                ) {
                    window.location.href = "/main";
                    return;
                }

                alert("아이디 또는 비밀번호가 일치하지 않습니다.");
                window.location.href = "/";
                return;
            }

            if (response.ok) {
                window.location.href = "/main";
                return;
            }

            alert("로그인에 실패했습니다.");

        } catch (error) {
            console.error("로그인 요청 오류:", error);
            alert("서버 연결 중 오류가 발생했습니다.");

        } finally {
            loginButton.disabled = false;
            loginButton.textContent = "로그인";
        }
    });

    /* =========================================================
       아이디 중복확인
       GET /api/user/check-id?username=...
       ========================================================= */

    checkIdBtn?.addEventListener("click", async function () {
        const username = signupIdInput.value.trim();

        if (!username) {
            idCheckMsg.textContent =
                "아이디를 먼저 입력해주세요.";
            idCheckMsg.className = "field-msg error";
            return;
        }

        checkIdBtn.disabled = true;
        checkIdBtn.textContent = "확인 중...";

        try {
            const response = await fetch(
                `/api/user/check-id?username=${encodeURIComponent(
                    username
                )}`
            );

            if (!response.ok) {
                throw new Error(
                    `중복확인 실패: ${response.status}`
                );
            }

            /*
             * Controller 응답:
             * true  = 이미 존재함
             * false = 사용 가능
             */
            const duplicated = await response.json();

            if (duplicated) {
                checkIdBtn.textContent = "중복있음";
                checkIdBtn.className =
                    "check-btn duplicate";

                idCheckMsg.textContent =
                    "이미 사용 중인 아이디입니다.";
                idCheckMsg.className =
                    "field-msg error";

                idCheckPassed = false;

            } else {
                checkIdBtn.textContent = "사용 가능";
                checkIdBtn.className =
                    "check-btn available";

                idCheckMsg.textContent =
                    "사용 가능한 아이디입니다.";
                idCheckMsg.className =
                    "field-msg success";

                idCheckPassed = true;
            }

        } catch (error) {
            console.error("아이디 중복확인 오류:", error);

            checkIdBtn.textContent = "중복확인";
            checkIdBtn.className = "check-btn";

            idCheckMsg.textContent =
                "중복확인 중 오류가 발생했습니다.";
            idCheckMsg.className =
                "field-msg error";

            idCheckPassed = false;

        } finally {
            checkIdBtn.disabled = false;
        }
    });

    signupIdInput?.addEventListener("input", function () {
        checkIdBtn.textContent = "중복확인";
        checkIdBtn.className = "check-btn";

        idCheckMsg.textContent = "";
        idCheckPassed = false;
    });

    /* =========================================================
       비밀번호 확인
       ========================================================= */

    function checkPasswordMatch() {
        const password = signupPwInput.value;
        const passwordConfirm =
            signupPwConfirmInput.value;

        if (
            passwordConfirm &&
            password !== passwordConfirm
        ) {
            pwMismatchMsg.textContent =
                "비밀번호가 다릅니다.";
            return false;
        }

        pwMismatchMsg.textContent = "";
        return true;
    }

    signupPwInput?.addEventListener(
        "input",
        checkPasswordMatch
    );

    signupPwConfirmInput?.addEventListener(
        "input",
        checkPasswordMatch
    );

    /* =========================================================
       회원가입
       Spring Controller의 POST /signup으로 form 데이터 전송
       ========================================================= */

    signupForm?.addEventListener(
        "submit",
        async function (event) {
            event.preventDefault();

            const name = signupNameInput.value.trim();
            const username =
                signupIdInput.value.trim();
            const email =
                signupEmailInput.value.trim();
            const password =
                signupPwInput.value;
            const passwordConfirm =
                signupPwConfirmInput.value;

            if (
                !name ||
                !username ||
                !email ||
                !password ||
                !passwordConfirm
            ) {
                alert("모든 항목을 입력해주세요.");
                return;
            }

            if (!checkPasswordMatch()) {
                alert("비밀번호가 일치하지 않습니다.");
                signupPwConfirmInput.focus();
                return;
            }

            if (!idCheckPassed) {
                alert("아이디 중복확인을 완료해주세요.");
                return;
            }

            const signupButton =
                signupForm.querySelector(
                    'button[type="submit"]'
                );

            signupButton.disabled = true;
            signupButton.textContent = "가입 중...";

            try {
                const body = new URLSearchParams();

                body.append("username", username);
                body.append("password", password);
                body.append("name", name);
                body.append("email", email);

                const response = await fetch("/signup", {
                    method: "POST",
                    headers: {
                        "Content-Type":
                            "application/x-www-form-urlencoded;charset=UTF-8"
                    },
                    body: body.toString(),
                    redirect: "follow"
                });

                if (!response.ok) {
                    throw new Error(
                        `회원가입 실패: ${response.status}`
                    );
                }

                /*
                 * 성공하면 Controller에서 "/"로 redirect됨.
                 * redirect 응답도 fetch에서는 최종 응답이 200으로 들어옴.
                 */
                alert(
                    `${name}님, 회원가입이 완료되었습니다. 로그인해주세요.`
                );

                resetSignupForm();
                signupModal.classList.remove("open");

            } catch (error) {
                console.error("회원가입 요청 오류:", error);
                alert(
                    "회원가입에 실패했습니다. 서버 콘솔을 확인해주세요."
                );

            } finally {
                signupButton.disabled = false;
                signupButton.textContent = "가입하기";
            }
        }
    );

    /* =========================================================
       회원가입 폼 초기화
       ========================================================= */

    function resetSignupForm() {
        signupForm?.reset();

        if (checkIdBtn) {
            checkIdBtn.textContent = "중복확인";
            checkIdBtn.className = "check-btn";
            checkIdBtn.disabled = false;
        }

        if (idCheckMsg) {
            idCheckMsg.textContent = "";
        }

        if (pwMismatchMsg) {
            pwMismatchMsg.textContent = "";
        }

        idCheckPassed = false;
    }
});