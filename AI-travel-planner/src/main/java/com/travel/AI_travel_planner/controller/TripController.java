package com.travel.AI_travel_planner.controller;

import com.travel.AI_travel_planner.dto.TripPlanRequest;
import com.travel.AI_travel_planner.dto.TripPlanResponse;
import com.travel.AI_travel_planner.dto.TripSaveRequest;
import com.travel.AI_travel_planner.entity.Trip;
import com.travel.AI_travel_planner.entity.User;
import com.travel.AI_travel_planner.service.TripAIService;
import com.travel.AI_travel_planner.service.TripSaveService;

import jakarta.servlet.http.HttpSession;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/trip")
public class TripController {

    private final TripAIService tripAIService;
    private final TripSaveService tripSaveService;

    public TripController(
            TripAIService tripAIService,
            TripSaveService tripSaveService
    ) {
        this.tripAIService = tripAIService;
        this.tripSaveService = tripSaveService;
    }

    @PostMapping("/generate")
    public TripPlanResponse generateTrip(
            @RequestBody TripPlanRequest request
    ) {
        return tripAIService.generateTripPlan(request);
    }

    @PostMapping("/save")
    public ResponseEntity<Map<String, Object>> saveTrip(
            @RequestBody TripSaveRequest request,
            HttpSession session
    ) {
        Map<String, Object> response =
                new HashMap<>();

        User loginUser =
                (User) session.getAttribute("loginUser");

        if (loginUser == null) {
            response.put("success", false);
            response.put(
                    "message",
                    "로그인이 필요한 기능입니다."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(response);
        }

        try {
            Trip savedTrip =
                    tripSaveService.saveTrip(
                            loginUser.getId(),
                            request
                    );

            response.put("success", true);
            response.put(
                    "message",
                    "여행 일정이 저장되었습니다."
            );
            response.put("tripId", savedTrip.getId());
            response.put(
                    "title",
                    savedTrip.getTitle()
            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException exception) {
            response.put("success", false);
            response.put(
                    "message",
                    exception.getMessage()
            );

            return ResponseEntity
                    .badRequest()
                    .body(response);

        } catch (Exception exception) {
            exception.printStackTrace();

            response.put("success", false);
            response.put(
                    "message",
                    "일정 저장 중 오류가 발생했습니다."
            );

            return ResponseEntity
                    .status(
                            HttpStatus.INTERNAL_SERVER_ERROR
                    )
                    .body(response);
        }
        
    }
    @GetMapping("/list")
    public ResponseEntity<Map<String, Object>> getTripList(
            HttpSession session
    ) {
        Map<String, Object> response = new HashMap<>();

        User loginUser =
                (User) session.getAttribute("loginUser");

        if (loginUser == null) {
            response.put("success", false);
            response.put(
                    "message",
                    "로그인이 필요한 기능입니다."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(response);
        }

        response.put("success", true);
        response.put(
                "trips",
                tripSaveService.getUserTrips(
                        loginUser.getId()
                )
        );

        return ResponseEntity.ok(response);
    }
    @GetMapping("/{tripId}")
    public ResponseEntity<Map<String, Object>> getTripDetail(
            @PathVariable Integer tripId,
            HttpSession session
    ) {
        Map<String, Object> response = new HashMap<>();

        User loginUser =
                (User) session.getAttribute("loginUser");

        if (loginUser == null) {
            response.put("success", false);
            response.put(
                    "message",
                    "로그인이 필요한 기능입니다."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(response);
        }

        try {
            Map<String, Object> trip =
                    tripSaveService.getTripDetail(
                            loginUser.getId(),
                            tripId
                    );

            response.put("success", true);
            response.put("trip", trip);

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException exception) {
            response.put("success", false);
            response.put(
                    "message",
                    exception.getMessage()
            );

            return ResponseEntity
                    .badRequest()
                    .body(response);
        }
        
    }
    @DeleteMapping("/{tripId}")
    public ResponseEntity<Map<String, Object>> deleteTrip(
            @PathVariable Integer tripId,
            HttpSession session
    ) {
        Map<String, Object> response = new HashMap<>();

        User loginUser =
                (User) session.getAttribute("loginUser");

        if (loginUser == null) {
            response.put("success", false);
            response.put(
                    "message",
                    "로그인이 필요한 기능입니다."
            );

            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(response);
        }

        try {
            tripSaveService.deleteTrip(
                    loginUser.getId(),
                    tripId
            );

            response.put("success", true);
            response.put(
                    "message",
                    "여행 일정이 삭제되었습니다."
            );

            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException exception) {
            response.put("success", false);
            response.put(
                    "message",
                    exception.getMessage()
            );

            return ResponseEntity
                    .badRequest()
                    .body(response);

        } catch (Exception exception) {
            exception.printStackTrace();

            response.put("success", false);
            response.put(
                    "message",
                    "여행 일정 삭제 중 오류가 발생했습니다."
            );

            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(response);
        }
    }
}