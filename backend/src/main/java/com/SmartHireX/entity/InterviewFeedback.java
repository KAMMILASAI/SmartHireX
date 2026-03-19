package com.SmartHireX.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "interview_feedback")
public class InterviewFeedback {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "room_code", nullable = false)
    private String roomCode;
    
    @Column(name = "candidate_name", nullable = false)
    private String candidateName;
    
    @Column(name = "recruiter_name")
    private String recruiterName;
    
    @Column(name = "communication", nullable = false)
    private Integer communication;
    
    @Column(name = "confidence", nullable = false)
    private Integer confidence;
    
    @Column(name = "technical", nullable = false)
    private Integer technical;
    
    @Column(name = "soft_skills", nullable = false)
    private Integer softSkills;
    
    @Column(name = "problem_solving", nullable = false)
    private Integer problemSolving;
    
    @Column(name = "analytics", nullable = false)
    private Integer analytics;
    
    @Column(name = "overall_comments", columnDefinition = "TEXT")
    private String overallComments;
    
    @Column(name = "interview_date")
    private String interviewDate;
    
    @Column(name = "submitted_at", nullable = false)
    private LocalDateTime submittedAt;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @Column(name = "selection_status")
    private String selectionStatus; // "selected", "rejected", or null
    
    @Column(name = "job_id")
    private Long jobId; // Link to the job application
    
    // Constructors
    public InterviewFeedback() {
        this.createdAt = LocalDateTime.now();
        this.submittedAt = LocalDateTime.now();
    }
    
    public InterviewFeedback(String roomCode, String candidateName, String recruiterName,
                           Integer communication, Integer confidence, Integer technical,
                           Integer softSkills, Integer problemSolving, Integer analytics,
                           String overallComments, String interviewDate) {
        this();
        this.roomCode = roomCode;
        this.candidateName = candidateName;
        this.recruiterName = recruiterName;
        this.communication = communication;
        this.confidence = confidence;
        this.technical = technical;
        this.softSkills = softSkills;
        this.problemSolving = problemSolving;
        this.analytics = analytics;
        this.overallComments = overallComments;
        this.interviewDate = interviewDate;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getRoomCode() {
        return roomCode;
    }
    
    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }
    
    public String getCandidateName() {
        return candidateName;
    }
    
    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }
    
    public String getRecruiterName() {
        return recruiterName;
    }
    
    public void setRecruiterName(String recruiterName) {
        this.recruiterName = recruiterName;
    }
    
    public Integer getCommunication() {
        return communication;
    }
    
    public void setCommunication(Integer communication) {
        this.communication = communication;
    }
    
    public Integer getConfidence() {
        return confidence;
    }
    
    public void setConfidence(Integer confidence) {
        this.confidence = confidence;
    }
    
    public Integer getTechnical() {
        return technical;
    }
    
    public void setTechnical(Integer technical) {
        this.technical = technical;
    }
    
    public Integer getSoftSkills() {
        return softSkills;
    }
    
    public void setSoftSkills(Integer softSkills) {
        this.softSkills = softSkills;
    }
    
    public Integer getProblemSolving() {
        return problemSolving;
    }
    
    public void setProblemSolving(Integer problemSolving) {
        this.problemSolving = problemSolving;
    }
    
    public Integer getAnalytics() {
        return analytics;
    }
    
    public void setAnalytics(Integer analytics) {
        this.analytics = analytics;
    }
    
    public String getOverallComments() {
        return overallComments;
    }
    
    public void setOverallComments(String overallComments) {
        this.overallComments = overallComments;
    }
    
    public String getInterviewDate() {
        return interviewDate;
    }
    
    public void setInterviewDate(String interviewDate) {
        this.interviewDate = interviewDate;
    }
    
    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }
    
    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public String getSelectionStatus() {
        return selectionStatus;
    }
    
    public void setSelectionStatus(String selectionStatus) {
        this.selectionStatus = selectionStatus;
    }
    
    public Long getJobId() {
        return jobId;
    }
    
    public void setJobId(Long jobId) {
        this.jobId = jobId;
    }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
    
    // Helper method to calculate average score
    public Double getAverageScore() {
        return (communication + confidence + technical + softSkills + problemSolving + analytics) / 6.0;
    }
    
    @Override
    public String toString() {
        return "InterviewFeedback{" +
                "id=" + id +
                ", roomCode='" + roomCode + '\'' +
                ", candidateName='" + candidateName + '\'' +
                ", recruiterName='" + recruiterName + '\'' +
                ", averageScore=" + getAverageScore() +
                ", submittedAt=" + submittedAt +
                '}';
    }
}
