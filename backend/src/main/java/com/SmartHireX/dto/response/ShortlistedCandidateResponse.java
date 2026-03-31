package com.SmartHireX.dto.response;

import lombok.Data;
import java.time.Instant;
import java.util.List;

@Data
public class ShortlistedCandidateResponse {
    
    // Basic candidate information
    private Long applicationId;
    private String name;
    private String email;
    private String college;
    private Double cgpa;
    private Instant appliedAt;
    
    // Skills information
    private List<String> candidateSkills;
    private List<String> matchingSkills;
    private Double skillMatchPercentage;
    
    // Scoring information
    private Double skillsScore;        // 0-100
    private Double cgpaScore;          // 0-100  
    private Double experienceScore;    // 0-100
    private Double totalScore;         // 0-100 (weighted average)
    
    // Qualification status
    private boolean qualified;
    private List<String> qualificationReasons;
    
    // Additional candidate details
    private String profileType;       // student | postgraduate
    private Boolean isFresher;
    private String degree;
    private String company;
    private Double lpa;
    private Double yearsExp;
    
    // Ranking information
    private Integer rank;
    
    public String getQualificationStatus() {
        return qualified ? "Qualified" : "Not Qualified";
    }
    
    public String getSkillMatchDescription() {
        if (skillMatchPercentage >= 80) return "Excellent Match";
        if (skillMatchPercentage >= 60) return "Good Match";
        if (skillMatchPercentage >= 40) return "Partial Match";
        if (skillMatchPercentage >= 20) return "Limited Match";
        return "Poor Match";
    }
    
    public String getScoreGrade() {
        if (totalScore >= 90) return "A+";
        if (totalScore >= 80) return "A";
        if (totalScore >= 70) return "B+";
        if (totalScore >= 60) return "B";
        if (totalScore >= 50) return "C+";
        return "C";
    }
}
