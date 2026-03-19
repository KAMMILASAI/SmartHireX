package com.SmartHireX.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "coding_exam_results")
public class CodingExamResult {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private Long roundId;
    
    @Column(nullable = false)
    private Long candidateId;
    
    @Column(nullable = false)
    private String candidateEmail;
    
    @Column(nullable = false)
    private String candidateName;
    
    @Column(nullable = false)
    private Integer totalScore; // Overall percentage score
    
    @Column(name = "problem_scores_json", columnDefinition = "TEXT")
    private String problemScoresJson; // JSON string of problem scores map
    
    @Column(nullable = false)
    private Integer timeSpent; // in seconds
    
    @Column(nullable = false)
    private String language; // Programming language used
    
    @Column(nullable = false)
    private LocalDateTime submittedAt;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private CodingExamStatus status;
    
    @Column(columnDefinition = "TEXT")
    private String notes;
    
    // Constructors
    public CodingExamResult() {}
    
    public CodingExamResult(Long roundId, Long candidateId, String candidateEmail, String candidateName) {
        this.roundId = roundId;
        this.candidateId = candidateId;
        this.candidateEmail = candidateEmail;
        this.candidateName = candidateName;
        this.submittedAt = LocalDateTime.now();
        this.status = CodingExamStatus.COMPLETED;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getRoundId() {
        return roundId;
    }
    
    public void setRoundId(Long roundId) {
        this.roundId = roundId;
    }
    
    public Long getCandidateId() {
        return candidateId;
    }
    
    public void setCandidateId(Long candidateId) {
        this.candidateId = candidateId;
    }
    
    public String getCandidateEmail() {
        return candidateEmail;
    }
    
    public void setCandidateEmail(String candidateEmail) {
        this.candidateEmail = candidateEmail;
    }
    
    public String getCandidateName() {
        return candidateName;
    }
    
    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }
    
    public Integer getTotalScore() {
        return totalScore;
    }
    
    public void setTotalScore(Integer totalScore) {
        this.totalScore = totalScore;
    }
    
    public Map<String, String> getProblemScores() {
        if (problemScoresJson == null || problemScoresJson.isEmpty()) return new java.util.HashMap<>();
        try {
            com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
            return om.readValue(problemScoresJson, new com.fasterxml.jackson.core.type.TypeReference<Map<String, String>>() {});
        } catch (Exception e) {
            return new java.util.HashMap<>();
        }
    }

    public void setProblemScores(Map<String, String> problemScores) {
        if (problemScores == null) { this.problemScoresJson = null; return; }
        try {
            com.fasterxml.jackson.databind.ObjectMapper om = new com.fasterxml.jackson.databind.ObjectMapper();
            this.problemScoresJson = om.writeValueAsString(problemScores);
        } catch (Exception e) {
            this.problemScoresJson = "{}";
        }
    }
    
    public Integer getTimeSpent() {
        return timeSpent;
    }
    
    public void setTimeSpent(Integer timeSpent) {
        this.timeSpent = timeSpent;
    }
    
    public String getLanguage() {
        return language;
    }
    
    public void setLanguage(String language) {
        this.language = language;
    }
    
    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }
    
    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }
    
    public CodingExamStatus getStatus() {
        return status;
    }
    
    public void setStatus(CodingExamStatus status) {
        this.status = status;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    @PrePersist
    protected void onCreate() {
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
        if (status == null) {
            status = CodingExamStatus.COMPLETED;
        }
    }
    
    // Enum for coding exam status
    public enum CodingExamStatus {
        IN_PROGRESS,
        COMPLETED,
        TIMEOUT,
        ABANDONED
    }
    
    @Override
    public String toString() {
        return "CodingExamResult{" +
                "id=" + id +
                ", roundId=" + roundId +
                ", candidateEmail='" + candidateEmail + '\'' +
                ", candidateName='" + candidateName + '\'' +
                ", totalScore=" + totalScore +
                ", language='" + language + '\'' +
                ", status=" + status +
                '}';
    }
}
