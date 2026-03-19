package com.SmartHireX.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "mixed_exam_results")
public class MixedExamResult {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "round_id", nullable = false)
    private Long roundId;
    
    @Column(name = "candidate_id", nullable = false)
    private Long candidateId;
    
    @Column(name = "candidate_email", nullable = false)
    private String candidateEmail;
    
    @Column(name = "candidate_name", nullable = false)
    private String candidateName;
    
    // MCQ Results
    @Column(name = "mcq_score", precision = 5, scale = 2)
    private BigDecimal mcqScore = BigDecimal.ZERO;
    
    @Column(name = "mcq_correct_answers")
    private Integer mcqCorrectAnswers = 0;
    
    @Column(name = "mcq_total_questions")
    private Integer mcqTotalQuestions = 0;
    
    @Column(name = "mcq_time_spent")
    private Integer mcqTimeSpent = 0;
    
    // Coding Results
    @Column(name = "coding_score", precision = 5, scale = 2)
    private BigDecimal codingScore = BigDecimal.ZERO;
    
    @Column(name = "coding_problems_solved")
    private Integer codingProblemsSolved = 0;
    
    @Column(name = "coding_total_problems")
    private Integer codingTotalProblems = 0;
    
    @Column(name = "coding_time_spent")
    private Integer codingTimeSpent = 0;
    
    @Column(name = "coding_language")
    private String codingLanguage;
    
    // Combined Results
    @Column(name = "total_score", precision = 5, scale = 2)
    private BigDecimal totalScore = BigDecimal.ZERO;
    
    @Column(name = "total_time_spent")
    private Integer totalTimeSpent = 0;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status")
    private ExamStatus status = ExamStatus.IN_PROGRESS;
    
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    public enum ExamStatus {
        IN_PROGRESS, MCQ_COMPLETED, CODING_COMPLETED, COMPLETED
    }
    
    // Constructors
    public MixedExamResult() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public MixedExamResult(Long roundId, Long candidateId, String candidateEmail, String candidateName) {
        this();
        this.roundId = roundId;
        this.candidateId = candidateId;
        this.candidateEmail = candidateEmail;
        this.candidateName = candidateName;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getRoundId() {
        return roundId;
    }
    
    public void setRoundId(Long roundId) {
        this.roundId = roundId;
    }
    
    public Long getCandidateId() {
        return candidateId;
    }
    
    public void setCandidateId(Long candidateId) {
        this.candidateId = candidateId;
    }
    
    public String getCandidateEmail() {
        return candidateEmail;
    }
    
    public void setCandidateEmail(String candidateEmail) {
        this.candidateEmail = candidateEmail;
    }
    
    public String getCandidateName() {
        return candidateName;
    }
    
    public void setCandidateName(String candidateName) {
        this.candidateName = candidateName;
    }
    
    public BigDecimal getMcqScore() {
        return mcqScore;
    }
    
    public void setMcqScore(BigDecimal mcqScore) {
        this.mcqScore = mcqScore;
    }
    
    public Integer getMcqCorrectAnswers() {
        return mcqCorrectAnswers;
    }
    
    public void setMcqCorrectAnswers(Integer mcqCorrectAnswers) {
        this.mcqCorrectAnswers = mcqCorrectAnswers;
    }
    
    public Integer getMcqTotalQuestions() {
        return mcqTotalQuestions;
    }
    
    public void setMcqTotalQuestions(Integer mcqTotalQuestions) {
        this.mcqTotalQuestions = mcqTotalQuestions;
    }
    
    public Integer getMcqTimeSpent() {
        return mcqTimeSpent;
    }
    
    public void setMcqTimeSpent(Integer mcqTimeSpent) {
        this.mcqTimeSpent = mcqTimeSpent;
    }
    
    public BigDecimal getCodingScore() {
        return codingScore;
    }
    
    public void setCodingScore(BigDecimal codingScore) {
        this.codingScore = codingScore;
    }
    
    public Integer getCodingProblemsSolved() {
        return codingProblemsSolved;
    }
    
    public void setCodingProblemsSolved(Integer codingProblemsSolved) {
        this.codingProblemsSolved = codingProblemsSolved;
    }
    
    public Integer getCodingTotalProblems() {
        return codingTotalProblems;
    }
    
    public void setCodingTotalProblems(Integer codingTotalProblems) {
        this.codingTotalProblems = codingTotalProblems;
    }
    
    public Integer getCodingTimeSpent() {
        return codingTimeSpent;
    }
    
    public void setCodingTimeSpent(Integer codingTimeSpent) {
        this.codingTimeSpent = codingTimeSpent;
    }
    
    public String getCodingLanguage() {
        return codingLanguage;
    }
    
    public void setCodingLanguage(String codingLanguage) {
        this.codingLanguage = codingLanguage;
    }
    
    public BigDecimal getTotalScore() {
        return totalScore;
    }
    
    public void setTotalScore(BigDecimal totalScore) {
        this.totalScore = totalScore;
    }
    
    public Integer getTotalTimeSpent() {
        return totalTimeSpent;
    }
    
    public void setTotalTimeSpent(Integer totalTimeSpent) {
        this.totalTimeSpent = totalTimeSpent;
    }
    
    public ExamStatus getStatus() {
        return status;
    }
    
    public void setStatus(ExamStatus status) {
        this.status = status;
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
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
