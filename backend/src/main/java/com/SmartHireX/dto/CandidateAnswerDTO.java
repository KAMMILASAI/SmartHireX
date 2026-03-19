package com.SmartHireX.dto;

import com.SmartHireX.entity.CandidateAnswer;

public class CandidateAnswerDTO {
    
    private Long questionId;
    private String questionText;
    private Integer selectedAnswer; // Index of selected option (0-3), null if unanswered
    private Integer correctAnswer; // Index of correct option (0-3)
    private Boolean isCorrect;
    private Integer timeTaken; // Time taken for this question in seconds
    
    // Constructors
    public CandidateAnswerDTO() {}
    
    public CandidateAnswerDTO(CandidateAnswer candidateAnswer) {
        this.questionId = candidateAnswer.getQuestionId();
        this.questionText = candidateAnswer.getQuestionText();
        this.selectedAnswer = candidateAnswer.getSelectedAnswer();
        this.correctAnswer = candidateAnswer.getCorrectAnswer();
        this.isCorrect = candidateAnswer.getIsCorrect();
        this.timeTaken = candidateAnswer.getTimeTaken();
    }
    
    // Getters and Setters
    public Long getQuestionId() {
        return questionId;
    }
    
    public void setQuestionId(Long questionId) {
        this.questionId = questionId;
    }
    
    public String getQuestionText() {
        return questionText;
    }
    
    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }
    
    public Integer getSelectedAnswer() {
        return selectedAnswer;
    }
    
    public void setSelectedAnswer(Integer selectedAnswer) {
        this.selectedAnswer = selectedAnswer;
    }
    
    public Integer getCorrectAnswer() {
        return correctAnswer;
    }
    
    public void setCorrectAnswer(Integer correctAnswer) {
        this.correctAnswer = correctAnswer;
    }
    
    public Boolean getIsCorrect() {
        return isCorrect;
    }
    
    public void setIsCorrect(Boolean isCorrect) {
        this.isCorrect = isCorrect;
    }
    
    public Integer getTimeTaken() {
        return timeTaken;
    }
    
    public void setTimeTaken(Integer timeTaken) {
        this.timeTaken = timeTaken;
    }
    
    // Helper methods
    public boolean isAnswered() {
        return selectedAnswer != null;
    }
    
    public boolean isUnanswered() {
        return selectedAnswer == null;
    }
    
    public String getFormattedTime() {
        if (timeTaken == null) return "N/A";
        int minutes = timeTaken / 60;
        int seconds = timeTaken % 60;
        return String.format("%02d:%02d", minutes, seconds);
    }
    
    @Override
    public String toString() {
        return "CandidateAnswerDTO{" +
                "questionId=" + questionId +
                ", selectedAnswer=" + selectedAnswer +
                ", correctAnswer=" + correctAnswer +
                ", isCorrect=" + isCorrect +
                ", timeTaken=" + timeTaken +
                '}';
    }
}
