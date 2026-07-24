package com.travel.AI_travel_planner.repository;

import com.travel.AI_travel_planner.entity.Trip;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TripRepository extends JpaRepository<Trip, Integer> {

    List<Trip> findByUserIdOrderByCreatedAtDesc(Integer userId);

    long countByUserId(Integer userId);
}