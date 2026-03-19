package com.SmartHireX.dto;

import java.util.List;
import java.util.Map;

public class CodingChallenge {
    private String title;
    private String description;
    private String technology;
    private String difficulty;
    private List<Map<String, String>> examples; // each with input, output
    private List<String> constraints;
    private String timeComplexity;
    private String spaceComplexity;
    private String starter;
    private List<String> hints;

    public CodingChallenge() {}

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTechnology() { return technology; }
    public void setTechnology(String technology) { this.technology = technology; }

    public String getDifficulty() { return difficulty; }
    public void setDifficulty(String difficulty) { this.difficulty = difficulty; }

    public List<Map<String, String>> getExamples() { return examples; }
    public void setExamples(List<Map<String, String>> examples) { this.examples = examples; }

    public List<String> getConstraints() { return constraints; }
    public void setConstraints(List<String> constraints) { this.constraints = constraints; }

    public String getTimeComplexity() { return timeComplexity; }
    public void setTimeComplexity(String timeComplexity) { this.timeComplexity = timeComplexity; }

    public String getSpaceComplexity() { return spaceComplexity; }
    public void setSpaceComplexity(String spaceComplexity) { this.spaceComplexity = spaceComplexity; }

    public String getStarter() { return starter; }
    public void setStarter(String starter) { this.starter = starter; }

    public List<String> getHints() { return hints; }
    public void setHints(List<String> hints) { this.hints = hints; }
}
