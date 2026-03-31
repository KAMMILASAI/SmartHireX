package com.SmartHireX.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.SmartHireX.entity.MixedExamResult;

@Repository
public interface MixedExamResultRepository extends JpaRepository<MixedExamResult, Long> {
    
    /**
     * Find exam result by round and candidate
     */
    Optional<MixedExamResult> findByRoundIdAndCandidateId(Long roundId, Long candidateId);
    
    /**
     * Find exam result by round and candidate email
     */
    Optional<MixedExamResult> findByRoundIdAndCandidateEmail(Long roundId, String candidateEmail);

       /**
        * Find exam result by round and candidate email (case-insensitive)
        */
       Optional<MixedExamResult> findByRoundIdAndCandidateEmailIgnoreCase(Long roundId, String candidateEmail);
    
    /**
     * Find all results for a specific round
     */
    List<MixedExamResult> findByRoundIdOrderByTotalScoreDesc(Long roundId);
    
    /**
     * Find all results for a specific round (for deletion)
     */
    List<MixedExamResult> findByRoundId(Long roundId);
    
    
    /**
     * Delete all results for a specific round
     */
    void deleteByRoundId(Long roundId);
    
    /**
     * Find results by status
     */
    List<MixedExamResult> findByRoundIdAndStatus(Long roundId, MixedExamResult.ExamStatus status);
    
    /**
     * Check if candidate has already taken the exam
     */
    boolean existsByRoundIdAndCandidateId(Long roundId, Long candidateId);

       /**
        * Check if candidate has already taken exam (case-insensitive email)
        */
       boolean existsByRoundIdAndCandidateEmailIgnoreCase(Long roundId, String candidateEmail);
    
    /**
     * Get statistics for a round
     */
    @Query("SELECT " +
           "COUNT(mer) as totalCandidates, " +
           "AVG(mer.totalScore) as averageScore, " +
           "MAX(mer.totalScore) as highestScore, " +
           "MIN(mer.totalScore) as lowestScore, " +
           "AVG(mer.totalTimeSpent) as averageTime, " +
           "COUNT(CASE WHEN mer.status = 'COMPLETED' THEN 1 END) as completedCount " +
           "FROM MixedExamResult mer WHERE mer.roundId = :roundId")
    Object[] getExamStatistics(@Param("roundId") Long roundId);
    
    /**
     * Get MCQ statistics for a round
     */
    @Query("SELECT " +
           "AVG(mer.mcqScore) as avgMcqScore, " +
           "AVG(mer.mcqCorrectAnswers) as avgCorrectAnswers, " +
           "AVG(mer.mcqTimeSpent) as avgMcqTime " +
           "FROM MixedExamResult mer WHERE mer.roundId = :roundId AND mer.mcqTotalQuestions > 0")
    Object[] getMcqStatistics(@Param("roundId") Long roundId);
    
    /**
     * Get Coding statistics for a round
     */
    @Query("SELECT " +
           "AVG(mer.codingScore) as avgCodingScore, " +
           "AVG(mer.codingProblemsSolved) as avgProblemsSolved, " +
           "AVG(mer.codingTimeSpent) as avgCodingTime, " +
           "mer.codingLanguage as language, " +
           "COUNT(mer) as languageCount " +
           "FROM MixedExamResult mer WHERE mer.roundId = :roundId AND mer.codingTotalProblems > 0 " +
           "GROUP BY mer.codingLanguage")
    List<Object[]> getCodingStatistics(@Param("roundId") Long roundId);
    
    /**
     * Get top performers for a round
     */
    @Query("SELECT mer FROM MixedExamResult mer WHERE mer.roundId = :roundId AND mer.status = 'COMPLETED' " +
           "ORDER BY mer.totalScore DESC, mer.totalTimeSpent ASC")
    List<MixedExamResult> getTopPerformers(@Param("roundId") Long roundId);
    
    /**
     * Count candidates by score range
     */
    @Query("SELECT " +
           "COUNT(CASE WHEN mer.totalScore >= 90 THEN 1 END) as excellent, " +
           "COUNT(CASE WHEN mer.totalScore >= 70 AND mer.totalScore < 90 THEN 1 END) as good, " +
           "COUNT(CASE WHEN mer.totalScore >= 50 AND mer.totalScore < 70 THEN 1 END) as average, " +
           "COUNT(CASE WHEN mer.totalScore < 50 THEN 1 END) as poor " +
           "FROM MixedExamResult mer WHERE mer.roundId = :roundId")
    Object[] getScoreDistribution(@Param("roundId") Long roundId);
    /**
     * Delete all results for a candidate
     */
    void deleteByCandidateId(Long candidateId);
}
