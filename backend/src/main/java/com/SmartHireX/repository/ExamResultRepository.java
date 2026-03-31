package com.SmartHireX.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.SmartHireX.entity.ExamResult;

@Repository
public interface ExamResultRepository extends JpaRepository<ExamResult, Long> {
    
    /**
     * Find all exam results for a specific round
     */
    List<ExamResult> findByRoundIdOrderByScorePercentageDesc(Long roundId);
    
    /**
     * Find exam result by round and candidate
     */
    Optional<ExamResult> findByRoundIdAndCandidateId(Long roundId, Long candidateId);
    
    /**
     * Find all exam results for a candidate
     */
    List<ExamResult> findByCandidateIdOrderBySubmittedAtDesc(Long candidateId);
    
    /**
     * Find exam results by candidate email
     */
    List<ExamResult> findByCandidateEmailOrderBySubmittedAtDesc(String candidateEmail);
    
    /**
     * Check if candidate has already taken the exam for a round
     */
    boolean existsByRoundIdAndCandidateId(Long roundId, Long candidateId);

    /**
     * Fallback check by candidate email (case-insensitive)
     */
    boolean existsByRoundIdAndCandidateEmailIgnoreCase(Long roundId, String candidateEmail);
    
    /**
     * Count total candidates who took the exam for a round
     */
    long countByRoundId(Long roundId);
    
    /**
     * Get average score for a round
     */
    @Query("SELECT AVG(er.scorePercentage) FROM ExamResult er WHERE er.roundId = :roundId")
    Double getAverageScoreByRoundId(@Param("roundId") Long roundId);
    
    /**
     * Get highest score for a round
     */
    @Query("SELECT MAX(er.scorePercentage) FROM ExamResult er WHERE er.roundId = :roundId")
    Double getHighestScoreByRoundId(@Param("roundId") Long roundId);
    
    /**
     * Get lowest score for a round
     */
    @Query("SELECT MIN(er.scorePercentage) FROM ExamResult er WHERE er.roundId = :roundId")
    Double getLowestScoreByRoundId(@Param("roundId") Long roundId);
    
    /**
     * Find top performers for a round (limit results)
     */
    @Query("SELECT er FROM ExamResult er WHERE er.roundId = :roundId ORDER BY er.scorePercentage DESC, er.timeTaken ASC")
    List<ExamResult> findTopPerformersByRoundId(@Param("roundId") Long roundId);
    
    /**
     * Count candidates who passed (score >= passing percentage)
     */
    @Query("SELECT COUNT(er) FROM ExamResult er WHERE er.roundId = :roundId AND er.scorePercentage >= :passingPercentage")
    long countPassedCandidates(@Param("roundId") Long roundId, @Param("passingPercentage") Double passingPercentage);
    
    /**
     * Find exam results by status
     */
    List<ExamResult> findByRoundIdAndStatus(Long roundId, ExamResult.ExamStatus status);
    
    /**
     * Find all exam results for a round ordered by submission time
     */
    List<ExamResult> findByRoundIdOrderBySubmittedAtDesc(Long roundId);
    
    /**
     * Delete all exam results for a specific round
     */
    void deleteByRoundId(Long roundId);

    /**
     * Delete all exam results for a candidate
     */
    void deleteByCandidateId(Long candidateId);

    /**
     * Count candidates by score range
     */
    @Query("SELECT COUNT(er) FROM ExamResult er WHERE er.roundId = :roundId AND er.scorePercentage >= :minScore AND er.scorePercentage <= :maxScore")
    long countByRoundIdAndScoreRange(@Param("roundId") Long roundId, @Param("minScore") Double minScore, @Param("maxScore") Double maxScore);
}
