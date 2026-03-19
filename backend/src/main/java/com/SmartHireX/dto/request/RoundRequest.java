package com.SmartHireX.dto.request;

import com.SmartHireX.entity.Round;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class RoundRequest {
    
    @NotBlank(message = "Title is required")
    private String title;
    
    @NotBlank(message = "Description is required")
    private String description;
    
    @NotNull(message = "Round type is required")
    private Round.RoundType type;
    
        private Integer duration;
    
        private String instructions;

        private String topics;
        
    // Question count fields
    private Integer mcqQuestions;
    private Integer codingQuestions;
    private Integer totalQuestions;

    private Integer numAutoShortlistCandidates;

    @NotNull(message = "Start time is required")
    private String startTime;
}
