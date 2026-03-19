package com.SmartHireX.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.SmartHireX.model.JobPosting;

import java.time.LocalDateTime;

@Data
@Getter
@Setter
@Entity
@Table(name = "rounds")
public class Round {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String title;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private RoundType type;
    
    @Column(nullable = false)
    private Integer duration; // in minutes
    
    // Removed maxScore and passingScore - will calculate percentage based on correct answers
    
    // Question count fields for different round types
    private Integer mcqQuestions;        // Number of MCQ questions
    private Integer codingQuestions;     // Number of coding questions
    private Integer totalQuestions;      // Total questions for combined rounds

    @Column(name = "num_auto_shortlist_candidates")
    private Integer numAutoShortlistCandidates; // Number of candidates to auto-shortlist
    
    @Column(columnDefinition = "TEXT")
    private String instructions;

    @Column(columnDefinition = "TEXT")
    private String topics;

    private LocalDateTime startTime;
    private LocalDateTime decisionsFinalizedAt;
    private Boolean decisionsFinalized = false;
    private LocalDateTime nextReminderSentAt;
    @Column(nullable = false)
    private Integer roundOrder; // sequence of the round
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id", nullable = false)
    private JobPosting job;
    
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
    
    public enum RoundType {
        MCQS,
        MIXED,
        MCQS_CODING,
        CODING,
        TECHNICAL_INTERVIEW,
        HR_INTERVIEW
    }
}
