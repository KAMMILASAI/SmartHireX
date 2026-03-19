package com.SmartHireX.dto;

import java.util.List;

public class McqQuestion {
    private String id;
    private String question;
    private List<String> options;
    private String answer;
    private String technology;
    private String difficulty;

    public McqQuestion() {}

    public McqQuestion(String id, String question, List<String> options, String answer, String technology, String difficulty) {
        this.id = id;
        this.question = question;
        this.options = options;
        this.answer = answer;
        this.technology = technology;
        this.difficulty = difficulty;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getQuestion() { return question; }
    public void setQuestion(String question) { this.question = question; }

    public List<String> getOptions() { return options; }
    public void setOptions(List<String> options) { this.options = options; }

    public String getAnswer() { return answer; }
    public void setAnswer(String answer) { this.answer = answer; }

    public String getTechnology() { return technology; }
    public void setTechnology(String technology) { this.technology = technology; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }
}
