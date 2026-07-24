package com.travel.AI_travel_planner.controller;

import com.travel.AI_travel_planner.entity.User;
import com.travel.AI_travel_planner.service.UserService;
import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/api/user/check-id")
    @ResponseBody
    public boolean checkIdDuplicate(
            @RequestParam("username") String username
    ) {
        return userService.existsByUsername(username);
    }

    @PostMapping("/signup")
    public String handleSignup(
            @RequestParam("username") String username,
            @RequestParam("password") String password,
            @RequestParam("name") String name,
            @RequestParam("email") String email,
            RedirectAttributes redirectAttributes
    ) {
        if (userService.existsByUsername(username)) {
            redirectAttributes.addFlashAttribute(
                    "error",
                    "이미 사용 중인 아이디입니다."
            );
            return "redirect:/";
        }

        User newUser = new User();
        newUser.setUsername(username);
        newUser.setPassword(password);
        newUser.setName(name);
        newUser.setEmail(email);
        newUser.setRole("USER");

        try {
            userService.register(newUser);

            redirectAttributes.addFlashAttribute(
                    "message",
                    "회원가입이 완료되었습니다. 로그인해 주세요."
            );

            return "redirect:/";

        } catch (Exception exception) {
            exception.printStackTrace();

            redirectAttributes.addFlashAttribute(
                    "error",
                    "회원가입에 실패했습니다."
            );

            return "redirect:/";
        }
    }

    @PostMapping("/login")
    public String handleLogin(
            @RequestParam("username") String username,
            @RequestParam("password") String password,
            HttpSession session,
            RedirectAttributes redirectAttributes
    ) {
        User user = userService.login(username, password);

        if (user == null) {
            redirectAttributes.addFlashAttribute(
                    "error",
                    "아이디 또는 비밀번호가 일치하지 않습니다."
            );

            return "redirect:/";
        }

        session.setAttribute("loginUser", user);
        session.setAttribute("loginUserId", user.getId());

        return "redirect:/main";
    }
    
    @PostMapping("/api/mypage/profile")
    @ResponseBody
    public String updateProfile(
            @RequestParam("name") String name,
            @RequestParam("email") String email,
            HttpSession session
    ) {
        User loginUser =
                (User) session.getAttribute("loginUser");

        if (loginUser == null) {
            return "LOGIN_REQUIRED";
        }

        if (name.isBlank() || email.isBlank()) {
            return "INVALID_INPUT";
        }

        try {
            User updatedUser = userService.updateProfile(
                    loginUser.getId(),
                    name.trim(),
                    email.trim()
            );

            session.setAttribute("loginUser", updatedUser);

            return "SUCCESS";

        } catch (Exception exception) {
            exception.printStackTrace();
            return "ERROR";
        }
    }

    @PostMapping("/api/mypage/password")
    @ResponseBody
    public String changePassword(
            @RequestParam("currentPassword")
            String currentPassword,

            @RequestParam("newPassword")
            String newPassword,

            HttpSession session
    ) {
        User loginUser =
                (User) session.getAttribute("loginUser");

        if (loginUser == null) {
            return "LOGIN_REQUIRED";
        }

        if (newPassword == null || newPassword.length() < 8) {
            return "INVALID_PASSWORD";
        }

        try {
            boolean changed =
                    userService.changePassword(
                            loginUser.getId(),
                            currentPassword,
                            newPassword
                    );

            if (!changed) {
                return "WRONG_CURRENT_PASSWORD";
            }

            User updatedUser =
                    userService.findByUsername(
                            loginUser.getUsername()
                    );

            session.setAttribute("loginUser", updatedUser);

            return "SUCCESS";

        } catch (Exception exception) {
            exception.printStackTrace();
            return "ERROR";
        }
    }

    @GetMapping("/logout")
    public String logout(HttpSession session) {
        session.invalidate();
        return "redirect:/main";
   
    
    }
    @PostMapping("/user/delete")
    @ResponseBody
    public ResponseEntity<String> deleteUser(
            HttpSession session
    ) {
        User loginUser =
                (User) session.getAttribute("loginUser");

        if (loginUser == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body("LOGIN_REQUIRED");
        }

        try {
            userService.deleteUser(
                    loginUser.getId()
            );

            session.invalidate();

            return ResponseEntity.ok("SUCCESS");

        } catch (Exception exception) {
            exception.printStackTrace();

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body("ERROR");
        }
    }
}