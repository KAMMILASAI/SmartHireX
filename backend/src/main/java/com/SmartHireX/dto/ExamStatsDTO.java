package com.SmartHireX.dto;

public class ExamStatsDTO {
    
    private Long roundId;
    private Long totalCandidates;
    private Double averageScore;
    private Double highestScore;
    private Double lowestScore;
    private Long passedCandidates;
    private Long failedCandidates;
    private Double passRate;
    
    // Constructors
    public ExamStatsDTO() {}
    
    public ExamStatsDTO(Long roundId, Long totalCandidates, Double averageScore, 
                       Double highestScore, Double lowestScore, Long passedCandidates, Long failedCandidates) {
        this.roundId = roundId;
        this.totalCandidates = totalCandidates;
        this.averageScore = averageScore;
        this.highestScore = highestScore;
        this.lowestScore = lowestScore;
        this.passedCandidates = passedCandidates;
        this.failedCandidates = failedCandidates;
        this.passRate = totalCandidates > 0 ? (passedCandidates.doubleValue() / totalCandidates.doubleValue()) * 100.0 : 0.0;
    }
    
    // Getters and Setters
    public Long getRoundId() {
        return roundId;
    }
    
    public void setRoundId(Long roundId) {
        this.roundId = roundId;
    }
    
    public Long getTotalCandidates() {
        return totalCandidates;
    }
    
    public void setTotalCandidates(Long totalCandidates) {
        this.totalCandidates = totalCandidates;
    }
    
    public Double getAverageScore() {
        return averageScore;
    }
    
    public void setAverageScore(Double averageScore) {
        this.averageScore = averageScore;
    }
    
    public Double getHighestScore() {
        return highestScore;
    }
    
    public void setHighestScore(Double highestScore) {
        this.highestScore = highestScore;
    }
    
    public Double getLowestScore() {
        return lowestScore;
    }
    
    public void setLowestScore(Double lowestScore) {
        this.lowestScore = lowestScore;
    }
    
    public Long getPassedCandidates() {
        return passedCandidates;
    }
    
    public void setPassedCandidates(Long passedCandidates) {
        this.passedCandidates = passedCandidates;
    }
    
    public Long getFailedCandidates() {
        return failedCandidates;
    }
    
    public void setFailedCandidates(Long failedCandidates) {
        this.failedCandidates = failedCandidates;
    }
    
    public Double getPassRate() {
        return passRate;
    }
    
    public void setPassRate(Double passRate) {
        this.passRate = passRate;
    }
    
    // Helper methods
    public String getFormattedAverageScore() {
        return averageScore != null ? String.format("%.1f%%", averageScore) : "N/A";
    }
    
    public String getFormattedPassRate() {
        return passRate != null ? String.format("%.1f%%", passRate) : "N/A";
    }
    
    @Override
    public String toString() {
        return "ExamStatsDTO{" +
                "roundId=" + roundId +
                ", totalCandidates=" + totalCandidates +
                ", averageScore=" + averageScore +
                ", passRate=" + passRate +
                '}';
    }
}
