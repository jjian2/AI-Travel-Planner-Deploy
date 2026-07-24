package com.travel.AI_travel_planner.dto;

import java.math.BigDecimal;
import java.util.List;

public class TripSaveRequest {

    private String title;
    private String destination;

    // yyyy-MM-dd 형식
    private String startDate;
    private String endDate;

    private Integer people;
    private Integer budget;
    private String style;
    private String transportType;

    private List<DayRequest> days;

    public TripSaveRequest() {
    }

    public static class DayRequest {

        private Integer day;
        private String summary;
        private List<PlaceRequest> places;

        public DayRequest() {
        }

        public Integer getDay() {
            return day;
        }

        public void setDay(Integer day) {
            this.day = day;
        }

        public String getSummary() {
            return summary;
        }

        public void setSummary(String summary) {
            this.summary = summary;
        }

        public List<PlaceRequest> getPlaces() {
            return places;
        }

        public void setPlaces(List<PlaceRequest> places) {
            this.places = places;
        }
    }

    public static class PlaceRequest {

        private String time;
        private String placeName;
        private String category;
        private String address;
        private BigDecimal latitude;
        private BigDecimal longitude;
        private String description;
        private Integer estimatedCost;

        public PlaceRequest() {
        }

        public String getTime() {
            return time;
        }

        public void setTime(String time) {
            this.time = time;
        }

        public String getPlaceName() {
            return placeName;
        }

        public void setPlaceName(String placeName) {
            this.placeName = placeName;
        }

        public String getCategory() {
            return category;
        }

        public void setCategory(String category) {
            this.category = category;
        }

        public String getAddress() {
            return address;
        }

        public void setAddress(String address) {
            this.address = address;
        }

        public BigDecimal getLatitude() {
            return latitude;
        }

        public void setLatitude(BigDecimal latitude) {
            this.latitude = latitude;
        }

        public BigDecimal getLongitude() {
            return longitude;
        }

        public void setLongitude(BigDecimal longitude) {
            this.longitude = longitude;
        }

        public String getDescription() {
            return description;
        }

        public void setDescription(String description) {
            this.description = description;
        }

        public Integer getEstimatedCost() {
            return estimatedCost;
        }

        public void setEstimatedCost(Integer estimatedCost) {
            this.estimatedCost = estimatedCost;
        }
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDestination() {
        return destination;
    }

    public void setDestination(String destination) {
        this.destination = destination;
    }

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public Integer getPeople() {
        return people;
    }

    public void setPeople(Integer people) {
        this.people = people;
    }

    public Integer getBudget() {
        return budget;
    }

    public void setBudget(Integer budget) {
        this.budget = budget;
    }

    public String getStyle() {
        return style;
    }

    public void setStyle(String style) {
        this.style = style;
    }

    public String getTransportType() {
        return transportType;
    }

    public void setTransportType(String transportType) {
        this.transportType = transportType;
    }

    public List<DayRequest> getDays() {
        return days;
    }

    public void setDays(List<DayRequest> days) {
        this.days = days;
    }
}