package com.SmartHireX.dto;

import com.SmartHireX.model.InterviewRound;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

@Data
public class CreateInterviewRoundRequest {
    
    @NotBlank(message = "Title is required")
    private String title;
    
    @NotNull(message = "Round type is required")
    private InterviewRound.RoundType roundType;
    
    @NotNull(message = "Job ID is required")
    private Long jobId;
    
    @NotBlank(message = "Recruiter email is required")
    private String recruiterEmail;
    
    private String description;
    
    @NotNull(message = "Scheduled date time is required")
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm")
    private LocalDateTime scheduledDateTime;
    
    private Integer durationMinutes = 60;
    
    @NotEmpty(message = "At least one candidate must be selected")
    private Set<String> candidateEmails;
    
    // Video call settings
    private boolean createVideoRoom = true;
    private String customRoomPassword; // Optional custom password
}
