package com.SmartHireX.dto;

public class AnswerSubmissionDTO {

    private Long questionId;
    private Integer selectedAnswer; // Index of selected option (0-3), null if unanswered
    private Integer correctAnswer; // Index of the correct option (0-3)
    private Boolean isCorrect; // Optional correctness flag supplied by client
    private Integer timeSpentSeconds; // Time taken for this question in seconds
    private Integer totalOptions;
    private String questionText;

    public AnswerSubmissionDTO() {}

    public AnswerSubmissionDTO(Long questionId, Integer selectedAnswer, Integer timeSpentSeconds) {
        this.questionId = questionId;
        this.selectedAnswer = selectedAnswer;
        this.timeSpentSeconds = timeSpentSeconds;
    }

    public Long getQuestionId() {
        return questionId;
    }

    public void setQuestionId(Long questionId) {
        this.questionId = questionId;
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

    public void setIsCorrect(Boolean correct) {
        this.isCorrect = correct;
    }

    public Integer getTimeSpentSeconds() {
        return timeSpentSeconds;
    }

    public void setTimeSpentSeconds(Integer timeSpentSeconds) {
        this.timeSpentSeconds = timeSpentSeconds;
    }

    public Integer getTotalOptions() {
        return totalOptions;
    }

    public void setTotalOptions(Integer totalOptions) {
        this.totalOptions = totalOptions;
    }

    public String getQuestionText() {
        return questionText;
    }

    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }

    public boolean isAnswered() {
        return selectedAnswer != null;
    }

    public boolean isUnanswered() {
        return selectedAnswer == null;
    }

    @Override
    public String toString() {
        return "AnswerSubmissionDTO{" +
                "questionId=" + questionId +
                ", selectedAnswer=" + selectedAnswer +
                ", correctAnswer=" + correctAnswer +
                ", isCorrect=" + isCorrect +
                ", timeSpentSeconds=" + timeSpentSeconds +
                ", totalOptions=" + totalOptions +
                ", questionText='" + questionText + '\'' +
                '}';
    }
}
