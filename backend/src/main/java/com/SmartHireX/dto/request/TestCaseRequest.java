package com.SmartHireX.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TestCaseRequest {
    
    @NotBlank(message = "Input is required")
    private String input;
    
    @NotBlank(message = "Expected output is required")
    private String expectedOutput;
    
    private Boolean isSample = false;
    
    private Boolean isHidden = false;
    
    private String explanation;
    
    private Integer order = 0;
}
