package com.SmartHireX.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.SmartHireX.entity.CodingExamResult;

@Repository
public interface CodingExamResultRepository extends JpaRepository<CodingExamResult, Long> {

    /**
     * Find all coding exam results for a specific round
     */
    List<CodingExamResult> findByRoundIdOrderBySubmittedAtDesc(Long roundId);

    /**
     * Find coding exam result by round and candidate
     */
    Optional<CodingExamResult> findByRoundIdAndCandidateId(Long roundId, Long candidateId);

    /**
     * Check if candidate has already taken the coding exam for a round
     */
    boolean existsByRoundIdAndCandidateId(Long roundId, Long candidateId);

    /**
     * Fallback check by candidate email (case-insensitive)
     */
    boolean existsByRoundIdAndCandidateEmailIgnoreCase(Long roundId, String candidateEmail);

    /**
     * Count total candidates who took the coding exam for a round
     */
    long countByRoundId(Long roundId);

    /**
     * Get average score for a round
     */
    @Query("SELECT AVG(c.totalScore) FROM CodingExamResult c WHERE c.roundId = :roundId")
    Double getAverageScoreByRoundId(@Param("roundId") Long roundId);

    /**
     * Get highest score for a round
     */
    @Query("SELECT MAX(c.totalScore) FROM CodingExamResult c WHERE c.roundId = :roundId")
    Integer getHighestScoreByRoundId(@Param("roundId") Long roundId);

    /**
     * Get lowest score for a round
     */
    @Query("SELECT MIN(c.totalScore) FROM CodingExamResult c WHERE c.roundId = :roundId")
    Integer getLowestScoreByRoundId(@Param("roundId") Long roundId);

    /**
     * Count candidates by score range
     */
    @Query("SELECT COUNT(c) FROM CodingExamResult c WHERE c.roundId = :roundId AND c.totalScore >= :minScore AND c.totalScore < :maxScore")
    long countByRoundIdAndScoreRange(@Param("roundId") Long roundId, @Param("minScore") int minScore,
            @Param("maxScore") int maxScore);

    /**
     * Get language distribution for a round
     */
    @Query("SELECT c.language, COUNT(c) FROM CodingExamResult c WHERE c.roundId = :roundId GROUP BY c.language")
    List<Object[]> getLanguageDistributionByRoundId(@Param("roundId") Long roundId);

    /**
     * Delete all coding exam results for a specific round
     */
    void deleteByRoundId(Long roundId);

    /**
     * Delete all coding exam results for a candidate
     */
    void deleteByCandidateId(Long candidateId);
}
