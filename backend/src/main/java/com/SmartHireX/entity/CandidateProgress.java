package com.SmartHireX.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.SmartHireX.model.JobPosting;
import com.SmartHireX.model.Application;

import java.time.LocalDateTime;

@Data
@Getter
@Setter
@Entity
@Table(name = "candidate_progress", 
       uniqueConstraints = @UniqueConstraint(columnNames = {"job_id", "application_id"}))
public class CandidateProgress {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private JobPosting job;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;
    
    @Column(nullable = false)
    private Integer currentRound = 0; // 0 = not started, 1 = round 1, etc.
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private ProgressStatus status = ProgressStatus.APPLIED;
    
    private Double lastRoundScore;
    
    private Double overallScore;
    
    @Column(columnDefinition = "TEXT")
    private String rejectionReason;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    private LocalDateTime lastProgressedAt;
    
    public enum ProgressStatus {
        APPLIED,           // Initial application
        SHORTLISTED,       // Passed initial screening
        IN_PROGRESS,       // Currently in a round
        SELECTED,          // Selected for next round
        REJECTED,          // Rejected at current round
        HIRED,             // Final selection
        WITHDRAWN          // Candidate withdrew
    }
}
