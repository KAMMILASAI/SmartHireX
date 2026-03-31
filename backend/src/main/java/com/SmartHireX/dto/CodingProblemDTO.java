package com.SmartHireX.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

import com.SmartHireX.entity.CodingProblem;

@Data
public class CodingProblemDTO {
    
    private Long id;
    private Long roundId;
    private String title;
    private String problemStatement;
    private String explanation;
    private String inputFormat;
    private String outputFormat;
    private String constraints;
    private CodingProblem.Difficulty difficulty;
    private Integer timeLimit;
    private Integer memoryLimit;
    private String allowedLanguages;
    private List<TestCaseDTO> testCases;
    private List<TestCaseDTO> sampleTestCases; // Only sample test cases for candidates
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Statistics
    private Long totalTestCases;
    private Long sampleTestCasesCount;
}
