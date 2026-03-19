package com.SmartHireX.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.entity.MixedExamResult;
import com.SmartHireX.entity.MixedRoundComponent;
import com.SmartHireX.entity.User;
import com.SmartHireX.repository.MixedExamResultRepository;
import com.SmartHireX.repository.MixedRoundComponentRepository;
import com.SmartHireX.repository.UserRepository;

@Service
@Transactional
public class MixedRoundService {

    private static final Logger logger = LoggerFactory.getLogger(MixedRoundService.class);
    
    @Autowired
    private MixedRoundComponentRepository mixedRoundComponentRepository;
    
    @Autowired
    private MixedExamResultRepository mixedExamResultRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Create mixed round components
     */
    public List<MixedRoundComponent> createMixedRound(Long roundId, List<MixedRoundComponent> components) {
        // Delete existing components for this round
        mixedRoundComponentRepository.deleteByRoundId(roundId);
        
        // Validate that weights sum to 100%
        BigDecimal totalWeight = components.stream()
                .map(MixedRoundComponent::getComponentWeight)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        if (totalWeight.compareTo(BigDecimal.valueOf(100)) != 0) {
            throw new IllegalArgumentException("Component weights must sum to 100%");
        }
        
        // Set round ID for all components
        components.forEach(component -> component.setRoundId(roundId));
        
        return mixedRoundComponentRepository.saveAll(components);
    }
    
    /**
     * Get mixed round configuration
     */
    public List<MixedRoundComponent> getMixedRoundComponents(Long roundId) {
        return mixedRoundComponentRepository.findByRoundIdOrderByComponentType(roundId);
    }
    
    /**
     * Check if a round is mixed type
     */
    public boolean isMixedRound(Long roundId) {
        return mixedRoundComponentRepository.isMixedRound(roundId);
    }
    
    /**
     * Get mixed exam results for a candidate
     */
    public Optional<MixedExamResult> getMixedExamResult(Long roundId, String candidateEmail) {
        if (candidateEmail == null) {
            return Optional.empty();
        }
        return mixedExamResultRepository.findByRoundIdAndCandidateEmailIgnoreCase(roundId, candidateEmail.trim());
    }
    
    /**
     * Create or get mixed exam result for a candidate
     */
    private MixedExamResult getOrCreateMixedExamResult(Long roundId, String candidateEmail) {
        Optional<MixedExamResult> existingResult = getMixedExamResult(roundId, candidateEmail);
        if (existingResult.isPresent()) {
            return existingResult.get();
        }
        
        User candidate = userRepository.findByEmailIgnoreCase(candidateEmail)
                .orElseThrow(() -> new RuntimeException("Candidate not found: " + candidateEmail));
        
        MixedExamResult result = new MixedExamResult(roundId, candidate.getId(), candidateEmail, 
                                                    candidate.getFirstName() + " " + candidate.getLastName());
        
        return mixedExamResultRepository.save(result);
    }
    
    /**
     * Update MCQ results
     */
    public MixedExamResult updateMcqResults(Long roundId, String candidateEmail, 
                                          BigDecimal mcqScore, Integer correctAnswers, 
                                          Integer totalQuestions, Integer timeSpent) {
        MixedExamResult result = getOrCreateMixedExamResult(roundId, candidateEmail);
        
        result.setMcqScore(mcqScore);
        result.setMcqCorrectAnswers(correctAnswers);
        result.setMcqTotalQuestions(totalQuestions);
        result.setMcqTimeSpent(timeSpent);
        
        // Update status
        if (result.getStatus() == MixedExamResult.ExamStatus.IN_PROGRESS) {
            result.setStatus(MixedExamResult.ExamStatus.MCQ_COMPLETED);
        } else if (result.getStatus() == MixedExamResult.ExamStatus.CODING_COMPLETED) {
            result.setStatus(MixedExamResult.ExamStatus.COMPLETED);
            result.setSubmittedAt(LocalDateTime.now());
        }
        
        // Calculate total score
        calculateTotalScore(result, roundId);
        
        return mixedExamResultRepository.save(result);
    }
    
    /**
     * Update Coding results
     */
    public MixedExamResult updateCodingResults(Long roundId, String candidateEmail, 
                                             BigDecimal codingScore, Integer problemsSolved, 
                                             Integer totalProblems, Integer timeSpent, String language) {
        MixedExamResult result = getOrCreateMixedExamResult(roundId, candidateEmail);
        
        result.setCodingScore(codingScore);
        result.setCodingProblemsSolved(problemsSolved);
        result.setCodingTotalProblems(totalProblems);
        result.setCodingTimeSpent(timeSpent);
        result.setCodingLanguage(language);
        
        // Update status
        if (result.getStatus() == MixedExamResult.ExamStatus.IN_PROGRESS) {
            result.setStatus(MixedExamResult.ExamStatus.CODING_COMPLETED);
        } else if (result.getStatus() == MixedExamResult.ExamStatus.MCQ_COMPLETED) {
            result.setStatus(MixedExamResult.ExamStatus.COMPLETED);
            result.setSubmittedAt(LocalDateTime.now());
        }
        
        // Calculate total score
        calculateTotalScore(result, roundId);
        
        return mixedExamResultRepository.save(result);
    }
    
    /**
     * Calculate simple average total score (MCQ + Coding) / 2
     */
    private void calculateTotalScore(MixedExamResult result, Long roundId) {
        BigDecimal mcqScore = result.getMcqScore() != null ? result.getMcqScore() : BigDecimal.ZERO;
        BigDecimal codingScore = result.getCodingScore() != null ? result.getCodingScore() : BigDecimal.ZERO;
        
        // Simple average: (MCQ Score + Coding Score) / 2
        BigDecimal totalScore = mcqScore.add(codingScore)
                .divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
        
        // Total time spent
        Integer totalTime = (result.getMcqTimeSpent() != null ? result.getMcqTimeSpent() : 0) +
                           (result.getCodingTimeSpent() != null ? result.getCodingTimeSpent() : 0);
        
        result.setTotalScore(totalScore);
        result.setTotalTimeSpent(totalTime);
        
        System.out.println("Score Calculation:");
        System.out.println("MCQ Score: " + mcqScore);
        System.out.println("Coding Score: " + codingScore);
        System.out.println("Average Total Score: " + totalScore);
    }
    
    /**
     * Get mixed exam results for a round
     */
    public List<Map<String, Object>> getMixedExamResults(Long roundId) {
        List<MixedExamResult> results = mixedExamResultRepository.findByRoundIdOrderByTotalScoreDesc(roundId);
        List<Map<String, Object>> resultMaps = new ArrayList<>();
        
        for (MixedExamResult result : results) {
            Map<String, Object> resultMap = new HashMap<>();
            resultMap.put("id", result.getId());
            resultMap.put("candidateId", result.getCandidateId());
            resultMap.put("candidateName", result.getCandidateName());
            resultMap.put("candidateEmail", result.getCandidateEmail());
            
            // MCQ Results
            resultMap.put("mcqScore", result.getMcqScore());
            resultMap.put("mcqCorrectAnswers", result.getMcqCorrectAnswers());
            resultMap.put("mcqTotalQuestions", result.getMcqTotalQuestions());
            resultMap.put("mcqTimeSpent", result.getMcqTimeSpent());
            
            // Coding Results
            resultMap.put("codingScore", result.getCodingScore());
            resultMap.put("codingProblemsSolved", result.getCodingProblemsSolved());
            resultMap.put("codingTotalProblems", result.getCodingTotalProblems());
            resultMap.put("codingTimeSpent", result.getCodingTimeSpent());
            resultMap.put("codingLanguage", result.getCodingLanguage());
            
            // Combined Results
            resultMap.put("totalScore", result.getTotalScore());
            resultMap.put("totalTimeSpent", result.getTotalTimeSpent());
            resultMap.put("status", result.getStatus().toString());
            resultMap.put("submittedAt", result.getSubmittedAt());
            
            resultMaps.add(resultMap);
        }
        
        return resultMaps;
    }
    
    /**
     * Clear all mixed exam results for a round (for testing purposes)
     */
    @Transactional
    public void clearMixedExamResults(Long roundId) {
        System.out.println("=== CLEARING MIXED EXAM RESULTS ===");
        System.out.println("Round ID: " + roundId);
        
        List<MixedExamResult> results = mixedExamResultRepository.findByRoundId(roundId);
        System.out.println("Found " + results.size() + " results to delete");
        
        mixedExamResultRepository.deleteByRoundId(roundId);
        System.out.println("Mixed exam results cleared for round: " + roundId);
    }
    
    /**
     * Clear mixed exam result for specific candidate
     */
    @Transactional
    public void clearCandidateMixedExamResult(Long roundId, String candidateEmail) {
        System.out.println("=== CLEARING CANDIDATE MIXED EXAM RESULT ===");
        System.out.println("Round ID: " + roundId);
        System.out.println("Candidate Email: " + candidateEmail);
        
        Optional<MixedExamResult> resultOptional = mixedExamResultRepository.findByRoundIdAndCandidateEmail(roundId, candidateEmail);
        if (resultOptional.isPresent()) {
            mixedExamResultRepository.delete(resultOptional.get());
            System.out.println("Cleared 1 result for candidate: " + candidateEmail);
        } else {
            System.out.println("No results found for candidate: " + candidateEmail);
        }
    }

    /**
     * Get mixed exam statistics
     */
    public Map<String, Object> getMixedExamStatistics(Long roundId) {
        Map<String, Object> stats = new HashMap<>();
        
        try {
            System.out.println("=== FETCHING MIXED EXAM STATISTICS ===");
            System.out.println("Round ID: " + roundId);
            
            // Overall statistics
            Object[] overallStats = mixedExamResultRepository.getExamStatistics(roundId);
            System.out.println("Overall stats result: " + (overallStats != null ? overallStats.length : "null"));
            
            if (overallStats != null && overallStats.length > 0) {
                stats.put("totalCandidates", overallStats[0] != null ? overallStats[0] : 0);
                stats.put("averageScore", overallStats[1] != null ? overallStats[1] : 0.0);
                stats.put("highestScore", overallStats[2] != null ? overallStats[2] : 0.0);
                stats.put("lowestScore", overallStats[3] != null ? overallStats[3] : 0.0);
                stats.put("averageTime", overallStats[4] != null ? overallStats[4] : 0);
                stats.put("completedCount", overallStats[5] != null ? overallStats[5] : 0);
            } else {
                // Default values when no results
                stats.put("totalCandidates", 0);
                stats.put("averageScore", 0.0);
                stats.put("highestScore", 0.0);
                stats.put("lowestScore", 0.0);
                stats.put("averageTime", 0);
                stats.put("completedCount", 0);
            }
            
            // MCQ statistics
            try {
                Object[] mcqStats = mixedExamResultRepository.getMcqStatistics(roundId);
                if (mcqStats != null && mcqStats.length > 0) {
                    Map<String, Object> mcqStatsMap = new HashMap<>();
                    mcqStatsMap.put("averageScore", mcqStats[0] != null ? mcqStats[0] : 0.0);
                    mcqStatsMap.put("averageCorrectAnswers", mcqStats[1] != null ? mcqStats[1] : 0.0);
                    mcqStatsMap.put("averageTime", mcqStats[2] != null ? mcqStats[2] : 0);
                    stats.put("mcqStatistics", mcqStatsMap);
                }
            } catch (Exception e) {
                System.out.println("Error fetching MCQ stats: " + e.getMessage());
            }
            
            // Coding statistics
            try {
                List<Object[]> codingStats = mixedExamResultRepository.getCodingStatistics(roundId);
                List<Map<String, Object>> codingStatsMap = new ArrayList<>();
                for (Object[] stat : codingStats) {
                    Map<String, Object> langStat = new HashMap<>();
                    langStat.put("averageScore", stat[0] != null ? stat[0] : 0.0);
                    langStat.put("averageProblemsSolved", stat[1] != null ? stat[1] : 0.0);
                    langStat.put("averageTime", stat[2] != null ? stat[2] : 0);
                    langStat.put("language", stat[3] != null ? stat[3] : "unknown");
                    langStat.put("count", stat[4] != null ? stat[4] : 0);
                    codingStatsMap.add(langStat);
                }
                stats.put("codingStatistics", codingStatsMap);
            } catch (Exception e) {
                System.out.println("Error fetching coding stats: " + e.getMessage());
                stats.put("codingStatistics", new ArrayList<>());
            }
            
            // Score distribution
            try {
                Object[] scoreDistribution = mixedExamResultRepository.getScoreDistribution(roundId);
                if (scoreDistribution != null && scoreDistribution.length > 0) {
                    Map<String, Object> distribution = new HashMap<>();
                    distribution.put("excellent", scoreDistribution[0] != null ? scoreDistribution[0] : 0);
                    distribution.put("good", scoreDistribution[1] != null ? scoreDistribution[1] : 0);
                    distribution.put("average", scoreDistribution[2] != null ? scoreDistribution[2] : 0);
                    distribution.put("poor", scoreDistribution[3] != null ? scoreDistribution[3] : 0);
                    stats.put("scoreDistribution", distribution);
                } else {
                    Map<String, Object> distribution = new HashMap<>();
                    distribution.put("excellent", 0);
                    distribution.put("good", 0);
                    distribution.put("average", 0);
                    distribution.put("poor", 0);
                    stats.put("scoreDistribution", distribution);
                }
            } catch (Exception e) {
                System.out.println("Error fetching score distribution: " + e.getMessage());
            }
            
            System.out.println("Final stats: " + stats);
            return stats;
            
        } catch (Exception e) {
            System.out.println("Error in getMixedExamStatistics: " + e.getMessage());
            logger.error("Error while getting mixed exam statistics for roundId={}", roundId, e);
            
            // Return empty stats on error
            Map<String, Object> emptyStats = new HashMap<>();
            emptyStats.put("totalCandidates", 0);
            emptyStats.put("averageScore", 0.0);
            emptyStats.put("highestScore", 0.0);
            emptyStats.put("lowestScore", 0.0);
            emptyStats.put("averageTime", 0);
            emptyStats.put("completedCount", 0);
            emptyStats.put("mcqStatistics", new HashMap<>());
            emptyStats.put("codingStatistics", new ArrayList<>());
            
            Map<String, Object> distribution = new HashMap<>();
            distribution.put("excellent", 0);
            distribution.put("good", 0);
            distribution.put("average", 0);
            distribution.put("poor", 0);
            emptyStats.put("scoreDistribution", distribution);
            
            return emptyStats;
        }
    }
    
    /**
     * Check if candidate has already taken the mixed exam
     */
    public boolean hasAlreadyTaken(Long roundId, String candidateEmail) {
        try {
            User candidate = userRepository.findByEmailIgnoreCase(candidateEmail).orElse(null);
            if (candidate == null) {
                // Fallback to email-only check to avoid false negatives on case mismatch.
                return mixedExamResultRepository.existsByRoundIdAndCandidateEmailIgnoreCase(roundId, candidateEmail);
            }
            
            Optional<MixedExamResult> result = mixedExamResultRepository.findByRoundIdAndCandidateId(roundId, candidate.getId());
            boolean hasTaken = result.isPresent() && (
                    result.get().getSubmittedAt() != null ||
                    result.get().getStatus() == MixedExamResult.ExamStatus.COMPLETED
            );
            
            System.out.println("Has already taken check - Round: " + roundId + ", Candidate: " + candidateEmail + ", Result: " + hasTaken);
            return hasTaken;
            
        } catch (Exception e) {
            System.out.println("Error checking if already taken: " + e.getMessage());
            logger.error("Error while checking mixed exam attempt state for roundId={} candidate={}", roundId, candidateEmail, e);
            return false;
        }
    }
    
    /**
     * Store individual MCQ result
     */
    public void storeMCQResult(Long roundId, String candidateEmail, Long questionId, String answer, int score, Integer timeSpent) {
        System.out.println("=== STORING MCQ RESULT ===");
        System.out.println("Round: " + roundId + ", Question: " + questionId + ", Score: " + score + "%");
        
        try {
            // Get or create mixed exam result
            MixedExamResult result = getOrCreateMixedExamResult(roundId, candidateEmail);
            
            // Update MCQ component results
            if (result.getMcqScore() == null) {
                result.setMcqScore(BigDecimal.valueOf(score));
                result.setMcqCorrectAnswers(score > 50 ? 1 : 0);
                result.setMcqTotalQuestions(1);
            } else {
                // Accumulate scores for multiple MCQ questions
                BigDecimal currentScore = result.getMcqScore();
                int currentCorrect = result.getMcqCorrectAnswers() != null ? result.getMcqCorrectAnswers() : 0;
                int currentTotal = result.getMcqTotalQuestions() != null ? result.getMcqTotalQuestions() : 0;
                
                result.setMcqCorrectAnswers(currentCorrect + (score > 50 ? 1 : 0));
                result.setMcqTotalQuestions(currentTotal + 1);
                
                // Calculate average score
                BigDecimal avgScore = currentScore.add(BigDecimal.valueOf(score)).divide(BigDecimal.valueOf(2), RoundingMode.HALF_UP);
                result.setMcqScore(avgScore);
            }
            
            result.setMcqTimeSpent(timeSpent);
            mixedExamResultRepository.save(result);
            
            System.out.println("MCQ result stored successfully");
            
        } catch (Exception e) {
            System.out.println("Error storing MCQ result: " + e.getMessage());
            logger.error("Error storing MCQ result for roundId={} candidate={} questionId={}", roundId, candidateEmail, questionId, e);
        }
    }
    
    /**
     * Store individual coding result  
     */
    public void storeCodingResult(Long roundId, String candidateEmail, Long problemId, String solution, String language, int score, Integer timeSpent) {
        System.out.println("=== STORING CODING RESULT ===");
        System.out.println("Round: " + roundId + ", Problem: " + problemId + ", Score: " + score + "%");
        
        try {
            // Get or create mixed exam result
            MixedExamResult result = getOrCreateMixedExamResult(roundId, candidateEmail);
            
            // Update coding component results
            result.setCodingScore(BigDecimal.valueOf(score));
            result.setCodingProblemsSolved(score > 0 ? 1 : 0);
            result.setCodingTotalProblems(1);
            result.setCodingTimeSpent(timeSpent);
            result.setCodingLanguage(language);
            
            mixedExamResultRepository.save(result);
            
            System.out.println("Coding result stored successfully");
            
        } catch (Exception e) {
            System.out.println("Error storing coding result: " + e.getMessage());
            logger.error("Error storing coding result for roundId={} candidate={} problemId={}", roundId, candidateEmail, problemId, e);
        }
    }
    
    /**
     * Calculate total weighted score
     */
    public double calculateTotalWeightedScore(Long roundId, String candidateEmail, List<MixedRoundComponent> components) {
        System.out.println("=== CALCULATING TOTAL WEIGHTED SCORE ===");
        
        try {
            Optional<MixedExamResult> resultOpt = getMixedExamResult(roundId, candidateEmail);
            if (!resultOpt.isPresent()) {
                System.out.println("No exam result found");
                return 0.0;
            }
            
            MixedExamResult result = resultOpt.get();
            double totalWeightedScore = 0.0;
            double totalWeight = 0.0;
            
            // Calculate weighted scores for each component type
            for (MixedRoundComponent component : components) {
                double componentScore = 0.0;
                double weight = component.getComponentWeight().doubleValue();
                
                if (component.getComponentType() == MixedRoundComponent.ComponentType.MCQ) {
                    if (result.getMcqScore() != null) {
                        componentScore = result.getMcqScore().doubleValue();
                        System.out.println("MCQ Score: " + componentScore + "%, Weight: " + weight + "%");
                    }
                } else if (component.getComponentType() == MixedRoundComponent.ComponentType.CODING) {
                    if (result.getCodingScore() != null) {
                        componentScore = result.getCodingScore().doubleValue();
                        System.out.println("Coding Score: " + componentScore + "%, Weight: " + weight + "%");
                    }
                }
                
                totalWeightedScore += (componentScore * weight / 100.0);
                totalWeight += weight;
            }
            
            // Normalize if weights don't add up to 100%
            if (totalWeight > 0 && totalWeight != 100.0) {
                totalWeightedScore = (totalWeightedScore / totalWeight) * 100.0;
            }
            
            System.out.println("Total Weighted Score: " + totalWeightedScore + "%");
            return totalWeightedScore;
            
        } catch (Exception e) {
            System.out.println("Error calculating weighted score: " + e.getMessage());
            logger.error("Error calculating weighted score for roundId={} candidate={}", roundId, candidateEmail, e);
            return 0.0;
        }
    }
    
    /**
     * Check if all components completed
     */
    public boolean areAllComponentsCompleted(Long roundId, String candidateEmail, List<MixedRoundComponent> components) {
        System.out.println("=== CHECKING COMPLETION STATUS ===");
        
        try {
            Optional<MixedExamResult> resultOpt = getMixedExamResult(roundId, candidateEmail);
            if (!resultOpt.isPresent()) {
                System.out.println("No exam result found - not completed");
                return false;
            }
            
            MixedExamResult result = resultOpt.get();
            boolean allCompleted = true;
            
            // Check each component type
            for (MixedRoundComponent component : components) {
                if (component.getComponentType() == MixedRoundComponent.ComponentType.MCQ) {
                    if (result.getMcqScore() == null) {
                        System.out.println("MCQ component not completed");
                        allCompleted = false;
                    } else {
                        System.out.println("MCQ component completed with score: " + result.getMcqScore());
                    }
                } else if (component.getComponentType() == MixedRoundComponent.ComponentType.CODING) {
                    if (result.getCodingScore() == null) {
                        System.out.println("Coding component not completed");
                        allCompleted = false;
                    } else {
                        System.out.println("Coding component completed with score: " + result.getCodingScore());
                    }
                }
            }
            
            System.out.println("All components completed: " + allCompleted);
            return allCompleted;
            
        } catch (Exception e) {
            System.out.println("Error checking completion status: " + e.getMessage());
            logger.error("Error checking completion status for roundId={} candidate={}", roundId, candidateEmail, e);
            return false;
        }
    }
    
    /**
     * Get candidate results
     */
    public Map<String, Object> getCandidateResults(Long roundId, String candidateEmail) {
        System.out.println("=== GETTING CANDIDATE RESULTS ===");
        Map<String, Object> results = new HashMap<>();
        // TODO: Retrieve all individual results
        return results;
    }
    
    /**
     * Store final exam result
     */
    public void storeFinalExamResult(Long roundId, String candidateEmail, double totalScore) {
        System.out.println("=== STORING FINAL EXAM RESULT ===");
        System.out.println("Final mixed exam score for " + candidateEmail + ": " + totalScore + "%");
        
        try {
            Optional<MixedExamResult> resultOpt = getMixedExamResult(roundId, candidateEmail);
            if (resultOpt.isPresent()) {
                MixedExamResult result = resultOpt.get();
                
                // Update final score and status
                result.setTotalScore(BigDecimal.valueOf(totalScore));
                result.setStatus(MixedExamResult.ExamStatus.COMPLETED);
                result.setSubmittedAt(LocalDateTime.now());
                
                // Calculate total time spent
                Integer totalTime = 0;
                if (result.getMcqTimeSpent() != null) {
                    totalTime += result.getMcqTimeSpent();
                }
                if (result.getCodingTimeSpent() != null) {
                    totalTime += result.getCodingTimeSpent();
                }
                result.setTotalTimeSpent(totalTime);
                
                mixedExamResultRepository.save(result);
                
                System.out.println("Final exam result stored successfully");
                System.out.println("Status: " + result.getStatus());
                System.out.println("Total Score: " + result.getTotalScore() + "%");
                System.out.println("Total Time: " + totalTime + " seconds");
                
            } else {
                System.out.println("No exam result found to update");
            }
            
        } catch (Exception e) {
            System.out.println("Error storing final exam result: " + e.getMessage());
            logger.error("Error storing final mixed exam result for roundId={} candidate={}", roundId, candidateEmail, e);
        }
    }
}
