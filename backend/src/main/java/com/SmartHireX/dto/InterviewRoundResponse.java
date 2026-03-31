package com.SmartHireX.dto;

import com.SmartHireX.model.InterviewRound;
import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Set;

@Data
public class InterviewRoundResponse {
    
    private Long id;
    private String title;
    private InterviewRound.RoundType roundType;
    private Long jobId;
    private String jobTitle; // Will be populated from JobPosting entity
    private String recruiterEmail;
    private String description;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledDateTime;
    
    private Integer durationMinutes;
    
    // Video call room details
    private String roomCode;
    private String roomPassword;
    private Long roomId;
    
    private InterviewRound.InterviewStatus status;
    private Set<String> candidateEmails;
    private Integer candidateCount;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;
    
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;
    
    // Additional fields for UI
    private boolean isUpcoming;
    private boolean isToday;
    private String statusDisplayName;
    private String roundTypeDisplayName;
}
