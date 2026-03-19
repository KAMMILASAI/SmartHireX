package com.SmartHireX.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonInclude.Include;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "practice_sessions")
public class PracticeSession {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;
    
    @Column(length = 20)
    private String type; // mcq, coding, interview
    
    private String difficulty; // easy, medium, hard
    
    @ElementCollection
    @CollectionTable(name = "practice_session_technologies", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "technology")
    private List<String> technologies;
    
    private Integer percentage;
    
    private Integer score;
    
    private Integer totalQuestions;
    
    private Integer correctAnswers;
    
    private Integer timeSpent; // in minutes
    
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
    
    @Column(columnDefinition = "TEXT")
    @JsonInclude(Include.NON_NULL)
    private String questionsJson; // Store questions as JSON string
    
    @Transient
    private List<PracticeQuestion> questions;
    
    @Data
    @JsonInclude(Include.NON_NULL)
    public static class PracticeQuestion {
        private String question;
        private List<String> options;
        private String userAnswer;
        private String correctAnswer;
        private Boolean isCorrect;
        private String explanation;
        private String technology;
        private String questionType; // mcq, coding, etc.
    }
}
