package com.SmartHireX.dto;

import java.time.LocalDateTime;
import java.util.List;

public class ExamSubmissionDTO {
    
    private Long roundId;
    private List<AnswerSubmissionDTO> answers;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private Integer timeTaken; // in seconds
    
    // Constructors
    public ExamSubmissionDTO() {}
    
    public ExamSubmissionDTO(Long roundId, List<AnswerSubmissionDTO> answers, 
                           LocalDateTime startTime, LocalDateTime endTime, Integer timeTaken) {
        this.roundId = roundId;
        this.answers = answers;
        this.startTime = startTime;
        this.endTime = endTime;
        this.timeTaken = timeTaken;
    }
    
    // Getters and Setters
    public Long getRoundId() {
        return roundId;
    }
    
    public void setRoundId(Long roundId) {
        this.roundId = roundId;
    }
    
    public List<AnswerSubmissionDTO> getAnswers() {
        return answers;
    }
    
    public void setAnswers(List<AnswerSubmissionDTO> answers) {
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
    
    public Integer getTimeTaken() {
        return timeTaken;
    }
    
    public void setTimeTaken(Integer timeTaken) {
        this.timeTaken = timeTaken;
    }
    
    @Override
    public String toString() {
        return "ExamSubmissionDTO{" +
                "roundId=" + roundId +
                ", answersCount=" + (answers != null ? answers.size() : 0) +
                ", timeTaken=" + timeTaken +
                '}';
    }
}
