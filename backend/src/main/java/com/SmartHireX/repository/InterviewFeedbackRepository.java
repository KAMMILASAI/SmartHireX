package com.SmartHireX.repository;

import com.SmartHireX.entity.InterviewFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewFeedbackRepository extends JpaRepository<InterviewFeedback, Long> {
    
    // Find feedback by room code
    List<InterviewFeedback> findByRoomCode(String roomCode);
    
    // Find feedback by candidate name
    List<InterviewFeedback> findByCandidateName(String candidateName);
    
    // Find feedback by recruiter name
    List<InterviewFeedback> findByRecruiterName(String recruiterName);
    
    // Find feedback by room code and candidate name
    Optional<InterviewFeedback> findByRoomCodeAndCandidateName(String roomCode, String candidateName);
    
    // Find all feedback ordered by submission date (most recent first)
    @Query("SELECT f FROM InterviewFeedback f ORDER BY f.submittedAt DESC")
    List<InterviewFeedback> findAllOrderBySubmittedAtDesc();
    
    // Find feedback by recruiter with pagination
    @Query("SELECT f FROM InterviewFeedback f WHERE f.recruiterName LIKE %:recruiterName% ORDER BY f.submittedAt DESC")
    List<InterviewFeedback> findByRecruiterNameContaining(@Param("recruiterName") String recruiterName);
    
    // Get average scores for a candidate
    @Query("SELECT AVG((f.communication + f.confidence + f.technical + f.softSkills + f.problemSolving + f.analytics) / 6.0) " +
           "FROM InterviewFeedback f WHERE f.candidateName = :candidateName")
    Double getAverageScoreForCandidate(@Param("candidateName") String candidateName);
    
    // Get feedback statistics
    @Query("SELECT COUNT(f) FROM InterviewFeedback f")
    Long getTotalFeedbackCount();
    
    // Get feedback by date range
    @Query("SELECT f FROM InterviewFeedback f WHERE f.interviewDate BETWEEN :startDate AND :endDate ORDER BY f.submittedAt DESC")
    List<InterviewFeedback> findByInterviewDateBetween(@Param("startDate") String startDate, @Param("endDate") String endDate);
    
    // Check if feedback exists for a room code
    boolean existsByRoomCode(String roomCode);
    
    // Delete feedback by room code
    void deleteByRoomCode(String roomCode);
    
    // Find top performers (candidates with highest average scores)
    @Query("SELECT f.candidateName, AVG((f.communication + f.confidence + f.technical + f.softSkills + f.problemSolving + f.analytics) / 6.0) as avgScore " +
           "FROM InterviewFeedback f " +
           "GROUP BY f.candidateName " +
           "ORDER BY avgScore DESC")
    List<Object[]> findTopPerformers();
    
    // Find feedback by job ID
    List<InterviewFeedback> findByJobId(Long jobId);
    
    // Find feedback by job ID and candidate name
    List<InterviewFeedback> findByJobIdAndCandidateName(Long jobId, String candidateName);
    
    // Find feedback by job ID ordered by submission date
    @Query("SELECT f FROM InterviewFeedback f WHERE f.jobId = :jobId ORDER BY f.submittedAt DESC")
    List<InterviewFeedback> findByJobIdOrderBySubmittedAtDesc(@Param("jobId") Long jobId);
    
    // Find feedback by room code and job ID
    List<InterviewFeedback> findByRoomCodeAndJobId(String roomCode, Long jobId);
    
    // Get average scores for a candidate in a specific job
    @Query("SELECT AVG((f.communication + f.confidence + f.technical + f.softSkills + f.problemSolving + f.analytics) / 6.0) " +
           "FROM InterviewFeedback f WHERE f.candidateName = :candidateName AND f.jobId = :jobId")
    Double getAverageScoreForCandidateInJob(@Param("candidateName") String candidateName, @Param("jobId") Long jobId);
}
