package com.SmartHireX.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.SmartHireX.entity.CodingProblem;

import java.util.List;
import java.util.Optional;

@Repository
public interface CodingProblemRepository extends JpaRepository<CodingProblem, Long> {
    
    /**
     * Find all coding problems for a specific round
     */
    List<CodingProblem> findByRoundIdOrderByCreatedAtAsc(Long roundId);
    
    /**
     * Find coding problems created by a specific recruiter
     */
    List<CodingProblem> findByCreatedByOrderByCreatedAtDesc(String createdBy);
    
    /**
     * Find coding problems for a round created by a specific recruiter
     */
    List<CodingProblem> findByRoundIdAndCreatedByOrderByCreatedAtAsc(Long roundId, String createdBy);
    
    /**
     * Check if coding problems exist for a round
     */
    boolean existsByRoundId(Long roundId);
    
    /**
     * Count coding problems for a round
     */
    long countByRoundId(Long roundId);
    
    /**
     * Delete all coding problems for a specific round
     */
    void deleteByRoundId(Long roundId);
    
    /**
     * Find coding problem with test cases
     */
    @Query("SELECT cp FROM CodingProblem cp LEFT JOIN FETCH cp.testCases WHERE cp.id = :id")
    Optional<CodingProblem> findByIdWithTestCases(@Param("id") Long id);
    
    /**
     * Find coding problems for a round with test cases
     */
    @Query("SELECT cp FROM CodingProblem cp LEFT JOIN FETCH cp.testCases WHERE cp.roundId = :roundId")
    List<CodingProblem> findByRoundIdWithTestCases(@Param("roundId") Long roundId);
}
