package com.SmartHireX.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonFormat;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "interview_rounds")
public class InterviewRound {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String title;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RoundType roundType;
    
    @Column(nullable = false)
    private Long jobId;
    
    @Column(nullable = false)
    private String recruiterEmail;
    
    private String description;
    
    @Column(nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime scheduledDateTime;
    
    private Integer durationMinutes = 60; // Default 1 hour
    
    // Video call room details
    private String roomCode;
    private String roomPassword;
    private Long roomId; // Reference to Room entity
    
    @Enumerated(EnumType.STRING)
    private InterviewStatus status = InterviewStatus.SCHEDULED;
    
    @ElementCollection
    @CollectionTable(name = "interview_candidates", joinColumns = @JoinColumn(name = "interview_id"))
    @Column(name = "candidate_email")
    private Set<String> candidateEmails = new HashSet<>();
    
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public enum RoundType {
        TECHNICAL_INTERVIEW("Technical Interview"),
        HR_INTERVIEW("HR Interview"),
        CODING_ROUND("Coding Round"),
        SYSTEM_DESIGN("System Design"),
        BEHAVIORAL("Behavioral Interview");
        
        private final String displayName;
        
        RoundType(String displayName) {
            this.displayName = displayName;
        }
        
        public String getDisplayName() {
            return displayName;
        }
    }
    
    public enum InterviewStatus {
        SCHEDULED,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED,
        RESCHEDULED
    }
}
