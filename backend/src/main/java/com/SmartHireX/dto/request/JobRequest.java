package com.SmartHireX.dto.request;

import lombok.Data;

@Data
public class JobRequest {
    private String title;
    private String company;
    private String description;
    private String skills;
    private String location;
    private Double minCgpa;
    private Integer minBacklogs;
    private String ctc;
    private String employmentType;
    private String startDate;
    private String endDate;
    private Boolean isPublic;
    private String accessCode;
}
