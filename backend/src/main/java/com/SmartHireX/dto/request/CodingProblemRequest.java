package com.SmartHireX.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

import com.SmartHireX.entity.CodingProblem;

@Data
public class CodingProblemRequest {
    
    @NotNull(message = "Round ID is required")
    private Long roundId;
    
    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;
    
    @NotBlank(message = "Problem statement is required")
    private String problemStatement;
    
    private String explanation;
    
    private String inputFormat;
    
    private String outputFormat;
    
    private String constraints;
    
    private CodingProblem.Difficulty difficulty = CodingProblem.Difficulty.MEDIUM;
    
    private Integer timeLimit = 2000; // milliseconds
    
    private Integer memoryLimit = 256; // MB
    
    private String allowedLanguages = "java,python,cpp,javascript";
    
    @Valid
    private List<TestCaseRequest> testCases;
}
