package com.SmartHireX.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "exam_results")
public class ExamResult {
    
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
    private Integer totalQuestions;
    
    @Column(nullable = false)
    private Integer correctAnswers;
    
    @Column(nullable = false)
    private Integer wrongAnswers;
    
    @Column(nullable = false)
    private Integer unanswered;
    
    @Column(nullable = false)
    private Double scorePercentage;
    
    @Column(nullable = false)
    private Integer timeTaken; // in seconds
    
    @Column(nullable = false)
    private Integer timeAllowed; // in seconds
    
    @ElementCollection
    @CollectionTable(name = "exam_answers", joinColumns = @JoinColumn(name = "exam_result_id"))
    private List<CandidateAnswer> answers;
    
    @Column(nullable = false)
    private LocalDateTime startTime;
    
    @Column(nullable = false)
    private LocalDateTime endTime;
    
    @Column(nullable = false)
    private LocalDateTime submittedAt;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private ExamStatus status;
    
    @Column(columnDefinition = "TEXT")
    private String notes; // Any additional notes or flags
    
    // Constructors
    public ExamResult() {}
    
    public ExamResult(Long roundId, Long candidateId, String candidateEmail, String candidateName) {
        this.roundId = roundId;
        this.candidateId = candidateId;
        this.candidateEmail = candidateEmail;
        this.candidateName = candidateName;
        this.submittedAt = LocalDateTime.now();
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
    
    public Integer getTotalQuestions() {
        return totalQuestions;
    }
    
    public void setTotalQuestions(Integer totalQuestions) {
        this.totalQuestions = totalQuestions;
    }
    
    public Integer getCorrectAnswers() {
        return correctAnswers;
    }
    
    public void setCorrectAnswers(Integer correctAnswers) {
        this.correctAnswers = correctAnswers;
    }
    
    public Integer getWrongAnswers() {
        return wrongAnswers;
    }
    
    public void setWrongAnswers(Integer wrongAnswers) {
        this.wrongAnswers = wrongAnswers;
    }
    
    public Integer getUnanswered() {
        return unanswered;
    }
    
    public void setUnanswered(Integer unanswered) {
        this.unanswered = unanswered;
    }
    
    public Double getScorePercentage() {
        return scorePercentage;
    }
    
    public void setScorePercentage(Double scorePercentage) {
        this.scorePercentage = scorePercentage;
    }
    
    public Integer getTimeTaken() {
        return timeTaken;
    }
    
    public void setTimeTaken(Integer timeTaken) {
        this.timeTaken = timeTaken;
    }
    
    public Integer getTimeAllowed() {
        return timeAllowed;
    }
    
    public void setTimeAllowed(Integer timeAllowed) {
        this.timeAllowed = timeAllowed;
    }
    
    public List<CandidateAnswer> getAnswers() {
        return answers;
    }
    
    public void setAnswers(List<CandidateAnswer> answers) {
        this.answers = answers;
    }
    
    public LocalDateTime getStartTime() {
        return startTime;
    }
    
    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }
    
    public LocalDateTime getEndTime() {
        return endTime;
    }
    
    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }
    
    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }
    
    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }
    
    public ExamStatus getStatus() {
        return status;
    }
    
    public void setStatus(ExamStatus status) {
        this.status = status;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    // Helper methods
    public void calculateScore() {
        if (totalQuestions != null && totalQuestions > 0) {
            this.scorePercentage = (correctAnswers.doubleValue() / totalQuestions.doubleValue()) * 100.0;
        } else {
            this.scorePercentage = 0.0;
        }
    }
    
    @PrePersist
    protected void onCreate() {
        if (submittedAt == null) {
            submittedAt = LocalDateTime.now();
        }
    }
    
    // Enum for exam status
    public enum ExamStatus {
        IN_PROGRESS,
        COMPLETED,
        TIMEOUT,
        ABANDONED
    }
    
    @Override
    public String toString() {
        return "ExamResult{" +
                "id=" + id +
                ", roundId=" + roundId +
                ", candidateEmail='" + candidateEmail + '\'' +
                ", candidateName='" + candidateName + '\'' +
                ", scorePercentage=" + scorePercentage +
                ", status=" + status +
                '}';
    }
}
