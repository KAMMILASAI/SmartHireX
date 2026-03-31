package com.SmartHireX.dto;

import java.time.LocalDateTime;
import java.util.List;

import com.SmartHireX.entity.ExamResult;

public class ExamResultDTO {
    
    private Long id;
    private Long roundId;
    private String roundTitle;
    private Long candidateId;
    private String candidateEmail;
    private String candidateName;
    private Integer totalQuestions;
    private Integer correctAnswers;
    private Integer wrongAnswers;
    private Integer unanswered;
    private Double scorePercentage;
    private Integer timeTaken; // in seconds
    private Integer timeAllowed; // in seconds
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private LocalDateTime submittedAt;
    private ExamResult.ExamStatus status;
    private String notes;
    private List<CandidateAnswerDTO> answers; // Only for detailed view
    
    // Constructors
    public ExamResultDTO() {}
    
    // Constructor for summary view (without detailed answers)
    public ExamResultDTO(ExamResult examResult) {
        this.id = examResult.getId();
        this.roundId = examResult.getRoundId();
        this.candidateId = examResult.getCandidateId();
        this.candidateEmail = examResult.getCandidateEmail();
        this.candidateName = examResult.getCandidateName();
        this.totalQuestions = examResult.getTotalQuestions();
        this.correctAnswers = examResult.getCorrectAnswers();
        this.wrongAnswers = examResult.getWrongAnswers();
        this.unanswered = examResult.getUnanswered();
        this.scorePercentage = examResult.getScorePercentage();
        this.timeTaken = examResult.getTimeTaken();
        this.timeAllowed = examResult.getTimeAllowed();
        this.startTime = examResult.getStartTime();
        this.endTime = examResult.getEndTime();
        this.submittedAt = examResult.getSubmittedAt();
        this.status = examResult.getStatus();
        this.notes = examResult.getNotes();
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
    
    public String getRoundTitle() {
        return roundTitle;
    }
    
    public void setRoundTitle(String roundTitle) {
        this.roundTitle = roundTitle;
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
    
    public ExamResult.ExamStatus getStatus() {
        return status;
    }
    
    public void setStatus(ExamResult.ExamStatus status) {
        this.status = status;
    }
    
    public String getNotes() {
        return notes;
    }
    
    public void setNotes(String notes) {
        this.notes = notes;
    }
    
    public List<CandidateAnswerDTO> getAnswers() {
        return answers;
    }
    
    public void setAnswers(List<CandidateAnswerDTO> answers) {
        this.answers = answers;
    }
    
    // Helper methods
    public String getFormattedTime() {
        if (timeTaken == null) return "N/A";
        int minutes = timeTaken / 60;
        int seconds = timeTaken % 60;
        return String.format("%02d:%02d", minutes, seconds);
    }
    
    public String getScoreGrade() {
        if (scorePercentage == null) return "N/A";
        if (scorePercentage >= 90) return "A+";
        if (scorePercentage >= 80) return "A";
        if (scorePercentage >= 70) return "B";
        if (scorePercentage >= 60) return "C";
        if (scorePercentage >= 50) return "D";
        return "F";
    }
    
    @Override
    public String toString() {
        return "ExamResultDTO{" +
                "id=" + id +
                ", candidateEmail='" + candidateEmail + '\'' +
                ", candidateName='" + candidateName + '\'' +
                ", scorePercentage=" + scorePercentage +
                ", status=" + status +
                '}';
    }
}
