package com.SmartHireX.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.SmartHireX.entity.Round;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface RoundRepository extends JpaRepository<Round, Long> {
    
    // Use native SQL queries to avoid HQL parsing issues
    @Query(value = "SELECT * FROM rounds WHERE job_id = :jobId ORDER BY round_order ASC", nativeQuery = true)
    List<Round> findByJobIdOrderByRoundOrder(@Param("jobId") Long jobId);
    
    @Query(value = "SELECT COUNT(*) FROM rounds WHERE job_id = :jobId", nativeQuery = true)
    Long countByJobId(@Param("jobId") Long jobId);
    
    @Query(value = "SELECT MAX(round_order) FROM rounds WHERE job_id = :jobId", nativeQuery = true)
    Integer findMaxRoundOrderByJobId(@Param("jobId") Long jobId);

    List<Round> findByStartTimeBetween(LocalDateTime startInclusive, LocalDateTime endInclusive);
    
    // Additional method for workflow management
    @Query(value = "SELECT * FROM rounds WHERE job_id = :jobId AND round_order = :roundOrder LIMIT 1", nativeQuery = true)
    java.util.Optional<Round> findByJobIdAndRoundOrder(@Param("jobId") Long jobId, @Param("roundOrder") Integer roundOrder);

    void deleteByJobId(Long jobId);
}
