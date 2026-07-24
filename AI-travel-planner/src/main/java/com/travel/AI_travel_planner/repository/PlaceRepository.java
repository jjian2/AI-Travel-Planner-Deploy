package com.travel.AI_travel_planner.repository;

import com.travel.AI_travel_planner.entity.Place;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PlaceRepository
        extends JpaRepository<Place, Integer> {

    List<Place> findByTripDayIdOrderByOrderIndexAsc(
            Integer tripDayId
    );
}