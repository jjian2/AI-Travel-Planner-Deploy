package com.travel.AI_travel_planner.controller;

import com.travel.AI_travel_planner.entity.User;
import com.travel.AI_travel_planner.service.TripSaveService;

import jakarta.servlet.http.HttpSession;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    private final TripSaveService tripSaveService;

    public PageController(TripSaveService tripSaveService) {
        this.tripSaveService = tripSaveService;
    }

    @GetMapping("/")
    public String index() {
        return "index";
    }

    @GetMapping("/main")
    public String main() {
        return "main";
    }

    @GetMapping("/places")
    public String places() {
        return "places";
    }

    @GetMapping("/budget")
    public String budget() {
        return "budget";
    }

    @GetMapping("/mypage")
    public String mypage(
            HttpSession session,
            Model model
    ) {

        User loginUser =
                (User) session.getAttribute("loginUser");

        long tripCount = 0;

        if (loginUser != null) {
            tripCount =
                    tripSaveService.countUserTrips(
                            loginUser.getId()
                    );
        }

        model.addAttribute(
                "tripCount",
                tripCount
        );

        return "mypage";
    }

}