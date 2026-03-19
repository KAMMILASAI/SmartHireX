package com.SmartHireX.service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.entity.CodingExamResult;
import com.SmartHireX.entity.User;
import com.SmartHireX.repository.CodingExamResultRepository;
import com.SmartHireX.repository.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
@Transactional(readOnly = true)
public class CodingExamResultService {
    
    @Autowired
    private CodingExamResultRepository codingExamResultRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    /**
     * Save coding exam result
     */
    @Transactional
    public CodingExamResult saveCodingExamResult(Long roundId, String candidateEmail, 
                                               Integer totalScore, Map<String, Object> problemScores, 
                                               Integer timeSpent, String language) {
        // Get candidate details
        User candidate = userRepository.findByEmailIgnoreCase(candidateEmail)
                .orElseThrow(() -> new RuntimeException("Candidate not found: " + candidateEmail));
        
        // Check if candidate has already taken this exam — return existing result (idempotent)
        if (codingExamResultRepository.existsByRoundIdAndCandidateId(roundId, candidate.getId())) {
            return codingExamResultRepository.findByRoundIdAndCandidateId(roundId, candidate.getId())
                    .orElseThrow(() -> new RuntimeException("Candidate has already taken this coding exam"));
        }
        
        // Create new coding exam result
        CodingExamResult result = new CodingExamResult(roundId, candidate.getId(), 
                                                     candidateEmail, candidate.getFirstName() + " " + candidate.getLastName());
        
        result.setTotalScore(totalScore);
        result.setTimeSpent(timeSpent);
        result.setLanguage(language);
        
        // Convert problem scores to JSON strings
        Map<String, String> problemScoreStrings = new HashMap<>();
        for (Map.Entry<String, Object> entry : problemScores.entrySet()) {
            try {
                String jsonString = objectMapper.writeValueAsString(entry.getValue());
                problemScoreStrings.put(entry.getKey(), jsonString);
            } catch (Exception e) {
                System.err.println("Error serializing problem score: " + e.getMessage());
                problemScoreStrings.put(entry.getKey(), "{}");
            }
        }
        result.setProblemScores(problemScoreStrings);
        
        return codingExamResultRepository.save(result);
    }
    
    /**
     * Get all coding exam results for a round
     */
    public List<Map<String, Object>> getCodingExamResults(Long roundId) {
        List<CodingExamResult> results = codingExamResultRepository.findByRoundIdOrderBySubmittedAtDesc(roundId);
        
        List<Map<String, Object>> resultMaps = new ArrayList<>();
        for (CodingExamResult result : results) {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("id", result.getId());
            resultMap.put("candidateName", result.getCandidateName());
            resultMap.put("candidateEmail", result.getCandidateEmail());
            resultMap.put("score", result.getTotalScore());
            resultMap.put("totalScore", result.getTotalScore());
            resultMap.put("timeSpent", result.getTimeSpent());
            resultMap.put("language", result.getLanguage());
            resultMap.put("submittedAt", result.getSubmittedAt().toString());
            resultMap.put("status", result.getStatus().toString());
            
            // Calculate time complexity score (lower is better)
            int timeComplexityScore = calculateTimeComplexityScore(result);
            resultMap.put("timeComplexityScore", timeComplexityScore);
            
            // Parse problem scores back to objects (safe null handling)
            Map<String, Object> problemScores = new HashMap<>();
            try {
                Map<String, String> rawScores = result.getProblemScores();
                if (rawScores != null) {
                    for (Map.Entry<String, String> entry : rawScores.entrySet()) {
                        try {
                            Object scoreData = objectMapper.readValue(entry.getValue(), Object.class);
                            problemScores.put(entry.getKey(), scoreData);
                        } catch (Exception e) {
                            problemScores.put(entry.getKey(), entry.getValue());
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("Could not load problemScores for result " + result.getId() + ": " + e.getMessage());
            }
            resultMap.put("problemScores", problemScores);
            
            resultMaps.add(resultMap);
        }
        
        // Sort by: 1) Score (desc), 2) Time Complexity (asc), 3) Time Taken (asc)
        resultMaps.sort((a, b) -> {
            int scoreA = a.get("score") instanceof Number ? ((Number) a.get("score")).intValue() : 0;
            int scoreB = b.get("score") instanceof Number ? ((Number) b.get("score")).intValue() : 0;
            int scoreComparison = Integer.compare(scoreB, scoreA);
            if (scoreComparison != 0) return scoreComparison;

            int complexityA = a.get("timeComplexityScore") instanceof Number ? ((Number) a.get("timeComplexityScore")).intValue() : 5;
            int complexityB = b.get("timeComplexityScore") instanceof Number ? ((Number) b.get("timeComplexityScore")).intValue() : 5;
            int complexityComparison = Integer.compare(complexityA, complexityB);
            if (complexityComparison != 0) return complexityComparison;

            int timeA = a.get("timeSpent") instanceof Number ? ((Number) a.get("timeSpent")).intValue() : 0;
            int timeB = b.get("timeSpent") instanceof Number ? ((Number) b.get("timeSpent")).intValue() : 0;
            return Integer.compare(timeA, timeB);
        });
        
        return resultMaps;
    }
    
    /**
     * Calculate time complexity score based on code efficiency
     * Lower score means better time complexity
     */
    private int calculateTimeComplexityScore(CodingExamResult result) {
        // For now, use time spent as a proxy for complexity
        // In a real system, you might analyze the actual code for nested loops, etc.
        int timeSpent = result.getTimeSpent();
        
        // Convert time to complexity score (lower time = better complexity)
        if (timeSpent <= 300) return 1;      // Very efficient (5 minutes or less)
        else if (timeSpent <= 600) return 2; // Efficient (10 minutes or less)
        else if (timeSpent <= 1200) return 3; // Average (20 minutes or less)
        else if (timeSpent <= 1800) return 4; // Below average (30 minutes or less)
        else return 5;                        // Poor efficiency (more than 30 minutes)
    }
    
    /**
     * Get coding exam statistics for a round
     */
    public Map<String, Object> getCodingExamStats(Long roundId) {
        Map<String, Object> stats = new HashMap<>();
        
        long totalCandidates = codingExamResultRepository.countByRoundId(roundId);
        stats.put("totalCandidates", totalCandidates);
        stats.put("completedExams", totalCandidates); // All saved results are completed
        stats.put("pendingExams", 0);
        
        if (totalCandidates > 0) {
            Double avgScore = codingExamResultRepository.getAverageScoreByRoundId(roundId);
            Integer highestScore = codingExamResultRepository.getHighestScoreByRoundId(roundId);
            Integer lowestScore = codingExamResultRepository.getLowestScoreByRoundId(roundId);
            
            stats.put("averageScore", avgScore != null ? avgScore : 0.0);
            stats.put("highestScore", highestScore != null ? highestScore : 0);
            stats.put("lowestScore", lowestScore != null ? lowestScore : 0);
            
            // Calculate average time spent
            List<CodingExamResult> results = codingExamResultRepository.findByRoundIdOrderBySubmittedAtDesc(roundId);
            double avgTimeSpent = results.stream().mapToInt(CodingExamResult::getTimeSpent).average().orElse(0.0);
            stats.put("averageTimeSpent", (int) avgTimeSpent);
            
            // Language distribution
            List<Object[]> langDistribution = codingExamResultRepository.getLanguageDistributionByRoundId(roundId);
            Map<String, Long> languageMap = new HashMap<>();
            for (Object[] row : langDistribution) {
                languageMap.put((String) row[0], (Long) row[1]);
            }
            stats.put("languageDistribution", languageMap);
            
            // Score distribution
            Map<String, Long> scoreDistribution = new HashMap<>();
            scoreDistribution.put("90-100", codingExamResultRepository.countByRoundIdAndScoreRange(roundId, 90, 101));
            scoreDistribution.put("80-89", codingExamResultRepository.countByRoundIdAndScoreRange(roundId, 80, 90));
            scoreDistribution.put("70-79", codingExamResultRepository.countByRoundIdAndScoreRange(roundId, 70, 80));
            scoreDistribution.put("60-69", codingExamResultRepository.countByRoundIdAndScoreRange(roundId, 60, 70));
            scoreDistribution.put("below-60", codingExamResultRepository.countByRoundIdAndScoreRange(roundId, 0, 60));
            stats.put("scoreDistribution", scoreDistribution);
            
        } else {
            stats.put("averageScore", 0.0);
            stats.put("highestScore", 0);
            stats.put("lowestScore", 0);
            stats.put("averageTimeSpent", 0);
            stats.put("languageDistribution", new HashMap<>());
            stats.put("scoreDistribution", new HashMap<>());
        }
        
        return stats;
    }
    
    /**
     * Check if candidate has already taken the coding exam
     */
    public boolean hasAlreadyTaken(Long roundId, String candidateEmail) {
        User candidate = userRepository.findByEmailIgnoreCase(candidateEmail).orElse(null);
        if (candidate == null) {
            return codingExamResultRepository.existsByRoundIdAndCandidateEmailIgnoreCase(roundId, candidateEmail);
        }
        return codingExamResultRepository.existsByRoundIdAndCandidateId(roundId, candidate.getId());
    }
}
