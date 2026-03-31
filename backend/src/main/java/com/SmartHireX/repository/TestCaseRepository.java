package com.SmartHireX.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.SmartHireX.entity.TestCase;

import java.util.List;

@Repository
public interface TestCaseRepository extends JpaRepository<TestCase, Long> {
    
    /**
     * Find all test cases for a coding problem
     */
    List<TestCase> findByCodingProblemIdOrderByOrderAsc(@Param("codingProblemId") Long codingProblemId);
    
    /**
     * Find sample test cases for a coding problem (visible to candidates)
     */
    List<TestCase> findByCodingProblemIdAndIsSampleTrueOrderByOrderAsc(@Param("codingProblemId") Long codingProblemId);
    
    /**
     * Find hidden test cases for a coding problem (for evaluation)
     */
    List<TestCase> findByCodingProblemIdAndIsHiddenTrueOrderByOrderAsc(@Param("codingProblemId") Long codingProblemId);
    
    /**
     * Find all test cases for evaluation (both sample and hidden)
     */
    @Query("SELECT tc FROM TestCase tc WHERE tc.codingProblem.id = :codingProblemId ORDER BY tc.order ASC")
    List<TestCase> findAllTestCasesForEvaluation(@Param("codingProblemId") Long codingProblemId);
    
    /**
     * Count test cases for a coding problem
     */
    long countByCodingProblemId(@Param("codingProblemId") Long codingProblemId);
    
    /**
     * Count sample test cases for a coding problem
     */
    long countByCodingProblemIdAndIsSampleTrue(@Param("codingProblemId") Long codingProblemId);
    
    /**
     * Delete all test cases for a coding problem
     */
    void deleteByCodingProblemId(@Param("codingProblemId") Long codingProblemId);
}
