package com.travel.AI_travel_planner.service;

import com.travel.AI_travel_planner.dto.TripSaveRequest;
import com.travel.AI_travel_planner.entity.Place;
import com.travel.AI_travel_planner.entity.Trip;
import com.travel.AI_travel_planner.entity.TripDay;
import com.travel.AI_travel_planner.repository.PlaceRepository;
import com.travel.AI_travel_planner.repository.TripDayRepository;
import com.travel.AI_travel_planner.repository.TripRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TripSaveService {

    private final TripRepository tripRepository;
    private final TripDayRepository tripDayRepository;
    private final PlaceRepository placeRepository;

    public TripSaveService(
            TripRepository tripRepository,
            TripDayRepository tripDayRepository,
            PlaceRepository placeRepository
    ) {
        this.tripRepository = tripRepository;
        this.tripDayRepository = tripDayRepository;
        this.placeRepository = placeRepository;
    }

    /*
     * AI가 생성한 여행 일정 저장
     */
    @Transactional
    public Trip saveTrip(
            Integer userId,
            TripSaveRequest request
    ) {
        validateRequest(userId, request);

        LocalDate startDate =
                LocalDate.parse(request.getStartDate());

        LocalDate endDate =
                LocalDate.parse(request.getEndDate());

        if (endDate.isBefore(startDate)) {
            throw new IllegalArgumentException(
                    "종료일은 시작일보다 빠를 수 없습니다."
            );
        }

        Trip trip = new Trip();

        trip.setUserId(userId);

        trip.setTitle(
                defaultText(
                        request.getTitle(),
                        request.getDestination() + " 여행"
                )
        );

        trip.setDestination(
                request.getDestination()
        );

        trip.setStartDate(startDate);
        trip.setEndDate(endDate);

        trip.setPeople(
                request.getPeople() == null ||
                request.getPeople() < 1
                        ? 1
                        : request.getPeople()
        );

        trip.setBudget(
                request.getBudget() == null
                        ? 0
                        : request.getBudget()
        );

        trip.setStyle(
                request.getStyle()
        );

        trip.setTransportType(
                request.getTransportType()
        );

        Trip savedTrip =
                tripRepository.save(trip);

        List<TripSaveRequest.DayRequest> days =
                request.getDays();

        if (days == null) {
            return savedTrip;
        }

        for (
                int dayIndex = 0;
                dayIndex < days.size();
                dayIndex++
        ) {
            TripSaveRequest.DayRequest dayRequest =
                    days.get(dayIndex);

            int dayNumber =
                    dayRequest.getDay() == null
                            ? dayIndex + 1
                            : dayRequest.getDay();

            TripDay tripDay = new TripDay();

            tripDay.setTripId(
                    savedTrip.getId()
            );

            tripDay.setDayNumber(
                    dayNumber
            );

            tripDay.setDate(
                    startDate.plusDays(
                            dayNumber - 1L
                    )
            );

            tripDay.setSummary(
                    dayRequest.getSummary()
            );

            TripDay savedTripDay =
                    tripDayRepository.save(tripDay);

            savePlaces(
                    savedTripDay.getId(),
                    dayRequest.getPlaces()
            );
        }

        return savedTrip;
    }

    /*
     * 여행 날짜별 장소 저장
     */
    private void savePlaces(
            Integer tripDayId,
            List<TripSaveRequest.PlaceRequest> places
    ) {
        if (places == null) {
            return;
        }

        for (
                int index = 0;
                index < places.size();
                index++
        ) {
            TripSaveRequest.PlaceRequest request =
                    places.get(index);

            if (
                    request.getPlaceName() == null ||
                    request.getPlaceName().isBlank()
            ) {
                continue;
            }

            Place place = new Place();

            place.setTripDayId(
                    tripDayId
            );

            place.setPlaceName(
                    request.getPlaceName().trim()
            );

            place.setCategory(
                    request.getCategory()
            );

            place.setAddress(
                    request.getAddress()
            );

            place.setLatitude(
                    request.getLatitude()
            );

            place.setLongitude(
                    request.getLongitude()
            );

            place.setVisitTime(
                    parseTime(
                            request.getTime()
                    )
            );

            place.setDescription(
                    request.getDescription()
            );

            place.setEstimatedCost(
                    request.getEstimatedCost() == null
                            ? 0
                            : request.getEstimatedCost()
            );

            place.setOrderIndex(
                    index
            );

            placeRepository.save(place);
        }
    }

    /*
     * 시간 문자열 변환
     */
    private LocalTime parseTime(String value) {
        if (
                value == null ||
                value.isBlank()
        ) {
            return null;
        }

        try {
            return LocalTime.parse(
                    value.trim()
            );

        } catch (
                DateTimeParseException exception
        ) {
            System.out.println(
                    "시간 변환 실패: " + value
            );

            return null;
        }
    }

    /*
     * 여행 저장 요청 검증
     */
    private void validateRequest(
            Integer userId,
            TripSaveRequest request
    ) {
        if (userId == null) {
            throw new IllegalArgumentException(
                    "로그인 정보가 없습니다."
            );
        }

        if (request == null) {
            throw new IllegalArgumentException(
                    "저장할 일정이 없습니다."
            );
        }

        if (
                request.getDestination() == null ||
                request.getDestination().isBlank()
        ) {
            throw new IllegalArgumentException(
                    "여행지가 없습니다."
            );
        }

        if (
                request.getStartDate() == null ||
                request.getStartDate().isBlank()
        ) {
            throw new IllegalArgumentException(
                    "여행 시작일이 없습니다."
            );
        }

        if (
                request.getEndDate() == null ||
                request.getEndDate().isBlank()
        ) {
            throw new IllegalArgumentException(
                    "여행 종료일이 없습니다."
            );
        }
    }

    /*
     * 빈 문자열 기본값 처리
     */
    private String defaultText(
            String value,
            String defaultValue
    ) {
        if (
                value == null ||
                value.isBlank()
        ) {
            return defaultValue;
        }

        return value.trim();
    }

    /*
     * 로그인 사용자의 저장된 여행 목록 조회
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> getUserTrips(
            Integer userId
    ) {
        List<Trip> trips =
                tripRepository
                        .findByUserIdOrderByCreatedAtDesc(
                                userId
                        );

        return trips.stream()
                .map(trip -> {
                    Map<String, Object> item =
                            new HashMap<>();

                    item.put(
                            "id",
                            trip.getId()
                    );

                    item.put(
                            "title",
                            trip.getTitle()
                    );

                    item.put(
                            "destination",
                            trip.getDestination()
                    );

                    item.put(
                            "startDate",
                            trip.getStartDate()
                    );

                    item.put(
                            "endDate",
                            trip.getEndDate()
                    );

                    item.put(
                            "people",
                            trip.getPeople()
                    );

                    item.put(
                            "budget",
                            trip.getBudget()
                    );

                    item.put(
                            "style",
                            trip.getStyle()
                    );

                    item.put(
                            "transportType",
                            trip.getTransportType()
                    );

                    return item;
                })
                .toList();
    }

    /*
     * 저장된 여행 상세 조회
     */
    @Transactional(readOnly = true)
    public Map<String, Object> getTripDetail(
            Integer userId,
            Integer tripId
    ) {
        Trip trip =
                tripRepository
                        .findById(tripId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "여행 일정을 찾을 수 없습니다."
                                )
                        );

        if (
                !trip.getUserId().equals(userId)
        ) {
            throw new IllegalArgumentException(
                    "해당 여행 일정에 접근할 수 없습니다."
            );
        }

        Map<String, Object> result =
                new HashMap<>();

        result.put(
                "id",
                trip.getId()
        );

        result.put(
                "title",
                trip.getTitle()
        );

        result.put(
                "destination",
                trip.getDestination()
        );

        result.put(
                "startDate",
                trip.getStartDate()
        );

        result.put(
                "endDate",
                trip.getEndDate()
        );

        result.put(
                "people",
                trip.getPeople()
        );

        result.put(
                "budget",
                trip.getBudget()
        );

        result.put(
                "style",
                trip.getStyle()
        );

        result.put(
                "transportType",
                trip.getTransportType()
        );

        List<TripDay> tripDays =
                tripDayRepository
                        .findByTripIdOrderByDayNumberAsc(
                                tripId
                        );

        List<Map<String, Object>> days =
                new ArrayList<>();

        for (TripDay tripDay : tripDays) {

            Map<String, Object> dayItem =
                    new HashMap<>();

            dayItem.put(
                    "day",
                    tripDay.getDayNumber()
            );

            dayItem.put(
                    "date",
                    tripDay.getDate()
            );

            dayItem.put(
                    "summary",
                    tripDay.getSummary()
            );

            List<Place> places =
                    placeRepository
                            .findByTripDayIdOrderByOrderIndexAsc(
                                    tripDay.getId()
                            );

            List<Map<String, Object>> placeItems =
                    new ArrayList<>();

            for (Place place : places) {

                Map<String, Object> placeItem =
                        new HashMap<>();

                placeItem.put(
                        "time",
                        place.getVisitTime()
                );

                placeItem.put(
                        "placeName",
                        place.getPlaceName()
                );

                placeItem.put(
                        "category",
                        place.getCategory()
                );

                placeItem.put(
                        "address",
                        place.getAddress()
                );

                placeItem.put(
                        "latitude",
                        place.getLatitude()
                );

                placeItem.put(
                        "longitude",
                        place.getLongitude()
                );

                placeItem.put(
                        "description",
                        place.getDescription()
                );

                placeItem.put(
                        "estimatedCost",
                        place.getEstimatedCost()
                );

                placeItems.add(
                        placeItem
                );
            }

            dayItem.put(
                    "places",
                    placeItems
            );

            days.add(
                    dayItem
            );
        }

        result.put(
                "days",
                days
        );

        return result;
    }

    /*
     * 저장된 여행 삭제
     */
    @Transactional
    public void deleteTrip(
            Integer userId,
            Integer tripId
    ) {
        if (userId == null) {
            throw new IllegalArgumentException(
                    "로그인 정보가 없습니다."
            );
        }

        if (tripId == null) {
            throw new IllegalArgumentException(
                    "삭제할 여행 ID가 없습니다."
            );
        }

        Trip trip =
                tripRepository
                        .findById(tripId)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "삭제할 여행 일정을 찾을 수 없습니다."
                                )
                        );

        if (
                !trip.getUserId().equals(userId)
        ) {
            throw new IllegalArgumentException(
                    "해당 여행 일정을 삭제할 권한이 없습니다."
            );
        }

        tripRepository.delete(trip);
    }
    @Transactional(readOnly = true)
    public long countUserTrips(Integer userId) {

        if (userId == null) {
            return 0;
        }

        return tripRepository.countByUserId(userId);
    }
}