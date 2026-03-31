package com.SmartHireX.repository;

import com.SmartHireX.entity.CandidateProgress;
import com.SmartHireX.entity.CandidateProgress.ProgressStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CandidateProgressRepository extends JpaRepository<CandidateProgress, Long> {
    
    // Find progress by job and application
    Optional<CandidateProgress> findByJobIdAndApplicationId(Long jobId, Long applicationId);
    
    // Find all candidates in a specific round for a job
    List<CandidateProgress> findByJobIdAndCurrentRound(Long jobId, Integer roundNumber);
    
    // Find candidates by status for a job
    List<CandidateProgress> findByJobIdAndStatus(Long jobId, ProgressStatus status);
    
    // Find candidates eligible for next round (selected status)
    List<CandidateProgress> findByJobIdAndStatusAndCurrentRound(Long jobId, ProgressStatus status, Integer currentRound);
    
    // Get all progress for a job
    List<CandidateProgress> findByJobIdOrderByOverallScoreDesc(Long jobId);
    
    // Count candidates in each round
    @Query("SELECT cp.currentRound, COUNT(cp) FROM CandidateProgress cp WHERE cp.job.id = :jobId GROUP BY cp.currentRound")
    List<Object[]> countCandidatesByRound(@Param("jobId") Long jobId);
    
    // Count candidates by status
    @Query("SELECT cp.status, COUNT(cp) FROM CandidateProgress cp WHERE cp.job.id = :jobId GROUP BY cp.status")
    List<Object[]> countCandidatesByStatus(@Param("jobId") Long jobId);
    
    // Find top performers in a round
    List<CandidateProgress> findTop10ByJobIdAndCurrentRoundOrderByLastRoundScoreDesc(Long jobId, Integer roundNumber);
    
    // Find candidates who need to progress to next round
    @Query("SELECT cp FROM CandidateProgress cp WHERE cp.job.id = :jobId AND cp.status = :status AND cp.currentRound = :currentRound")
    List<CandidateProgress> findCandidatesForProgression(@Param("jobId") Long jobId, 
                                                        @Param("status") ProgressStatus status, 
                                                        @Param("currentRound") Integer currentRound);

    void deleteByJobId(Long jobId);
}
