package com.SmartHireX.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.SmartHireX.entity.Question;

import java.util.List;

@Repository
public interface QuestionRepository extends JpaRepository<Question, Long> {
    
    /**
     * Find all questions for a specific round with options eagerly loaded
     */
    @Query("SELECT DISTINCT q FROM Question q LEFT JOIN FETCH q.options WHERE q.roundId = :roundId ORDER BY q.createdAt ASC")
    List<Question> findByRoundIdWithOptionsOrderByCreatedAtAsc(@Param("roundId") Long roundId);

    /**
     * Find all questions for a specific round
     */
    List<Question> findByRoundIdOrderByCreatedAtAsc(Long roundId);
    
    /**
     * Count questions for a specific round
     */
    long countByRoundId(Long roundId);
    
    /**
     * Find questions created by a specific recruiter
     */
    List<Question> findByCreatedByOrderByCreatedAtDesc(String createdBy);
    
    /**
     * Find questions for a round created by a specific recruiter
     */
    List<Question> findByRoundIdAndCreatedByOrderByCreatedAtAsc(Long roundId, String createdBy);
    
    /**
     * Check if questions exist for a round
     */
    boolean existsByRoundId(Long roundId);
    
    /**
     * Find questions by round ID ordered by ID
     */
    List<Question> findByRoundIdOrderById(Long roundId);
    
    /**
     * Delete all questions for a specific round
     */
    void deleteByRoundId(Long roundId);
    
    /**
     * Get questions with pagination for large rounds
     */
    @Query("SELECT q FROM Question q WHERE q.roundId = :roundId ORDER BY q.createdAt ASC")
    List<Question> findQuestionsByRoundIdWithPagination(@Param("roundId") Long roundId);
}
