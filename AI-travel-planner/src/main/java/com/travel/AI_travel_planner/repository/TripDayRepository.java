package com.travel.AI_travel_planner.repository;

import com.travel.AI_travel_planner.entity.TripDay;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TripDayRepository
        extends JpaRepository<TripDay, Integer> {

    List<TripDay> findByTripIdOrderByDayNumberAsc(
            Integer tripId
    );
}