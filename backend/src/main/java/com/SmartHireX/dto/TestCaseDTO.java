package com.SmartHireX.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TestCaseDTO {
    
    private Long id;
    private Long codingProblemId;
    private String input;
    private String expectedOutput;
    private Boolean isSample;
    private Boolean isHidden;
    private String explanation;
    private Integer order;
    private LocalDateTime createdAt;
}
