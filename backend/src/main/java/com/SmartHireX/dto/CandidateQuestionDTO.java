package com.SmartHireX.dto;

import java.util.List;

/**
 * DTO for questions shown to candidates during exams
 * Excludes sensitive information like correct answers and explanations
 */
public class CandidateQuestionDTO {
    
    private Long id;
    private String questionText;
    private List<String> options;
    
    // Constructors
    public CandidateQuestionDTO() {}
    
    public CandidateQuestionDTO(Long id, String questionText, List<String> options) {
        this.id = id;
        this.questionText = questionText;
        this.options = options;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getQuestionText() {
        return questionText;
    }
    
    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }
    
    public List<String> getOptions() {
        return options;
    }
    
    public void setOptions(List<String> options) {
        this.options = options;
    }
}
