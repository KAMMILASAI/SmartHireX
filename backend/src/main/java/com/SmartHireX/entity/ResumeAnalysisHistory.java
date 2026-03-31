package com.SmartHireX.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "resume_analysis_history")
public class ResumeAnalysisHistory {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_email", nullable = false)
    private String userEmail;
    
    @Column(name = "resume_filename", nullable = false)
    private String resumeFilename;
    
    @Column(name = "job_role_or_description", columnDefinition = "TEXT")
    private String jobRoleOrDescription;
    
    @Column(name = "overall_score")
    private Integer overallScore;
    
    @Column(name = "keyword_match")
    private Integer keywordMatch;
    
    @Column(name = "analysis_result", columnDefinition = "JSON")
    private String analysisResult;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    // Constructors
    public ResumeAnalysisHistory() {}
    
    public ResumeAnalysisHistory(String userEmail, String resumeFilename, String jobRoleOrDescription, 
                               Integer overallScore, Integer keywordMatch, String analysisResult) {
        this.userEmail = userEmail;
        this.resumeFilename = resumeFilename;
        this.jobRoleOrDescription = jobRoleOrDescription;
        this.overallScore = overallScore;
        this.keywordMatch = keywordMatch;
        this.analysisResult = analysisResult;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getUserEmail() {
        return userEmail;
    }
    
    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }
    
    public String getResumeFilename() {
        return resumeFilename;
    }
    
    public void setResumeFilename(String resumeFilename) {
        this.resumeFilename = resumeFilename;
    }
    
    public String getJobRoleOrDescription() {
        return jobRoleOrDescription;
    }
    
    public void setJobRoleOrDescription(String jobRoleOrDescription) {
        this.jobRoleOrDescription = jobRoleOrDescription;
    }
    
    public Integer getOverallScore() {
        return overallScore;
    }
    
    public void setOverallScore(Integer overallScore) {
        this.overallScore = overallScore;
    }
    
    public Integer getKeywordMatch() {
        return keywordMatch;
    }
    
    public void setKeywordMatch(Integer keywordMatch) {
        this.keywordMatch = keywordMatch;
    }
    
    public String getAnalysisResult() {
        return analysisResult;
    }
    
    public void setAnalysisResult(String analysisResult) {
        this.analysisResult = analysisResult;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
