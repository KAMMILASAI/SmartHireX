package com.SmartHireX.entity;

import jakarta.persistence.*;

@Embeddable
public class CandidateAnswer {
    
    @Column(nullable = false)
    private Long questionId;
    
    @Column(nullable = false)
    private String questionText;
    
    @Column(nullable = true)
    private Integer selectedAnswer; // Index of selected option (0-3), null if unanswered
    
    @Column(nullable = false)
    private Integer correctAnswer; // Index of correct option (0-3)
    
    @Column(nullable = false)
    private Boolean isCorrect;
    
    @Column(nullable = false)
    private Integer timeTaken; // Time taken for this question in seconds
    
    // Constructors
    public CandidateAnswer() {}
    
    public CandidateAnswer(Long questionId, String questionText, Integer selectedAnswer, 
                          Integer correctAnswer, Integer timeTaken) {
        this.questionId = questionId;
        this.questionText = questionText;
        this.selectedAnswer = selectedAnswer;
        this.correctAnswer = correctAnswer;
        this.timeTaken = timeTaken;
        this.isCorrect = selectedAnswer != null && selectedAnswer.equals(correctAnswer);
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
        // Recalculate correctness when answer is set
        this.isCorrect = selectedAnswer != null && selectedAnswer.equals(correctAnswer);
    }
    
    public Integer getCorrectAnswer() {
        return correctAnswer;
    }
    
    public void setCorrectAnswer(Integer correctAnswer) {
        this.correctAnswer = correctAnswer;
        // Recalculate correctness when correct answer is set
        this.isCorrect = selectedAnswer != null && selectedAnswer.equals(correctAnswer);
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
    
    @Override
    public String toString() {
        return "CandidateAnswer{" +
                "questionId=" + questionId +
                ", selectedAnswer=" + selectedAnswer +
                ", correctAnswer=" + correctAnswer +
                ", isCorrect=" + isCorrect +
                ", timeTaken=" + timeTaken +
                '}';
    }
}
