package com.SmartHireX.repository;

import com.SmartHireX.model.InterviewRound;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewRoundRepository extends JpaRepository<InterviewRound, Long> {
    
    // Find interviews by recruiter
    List<InterviewRound> findByRecruiterEmailOrderByScheduledDateTimeDesc(String recruiterEmail);
    
    // Find interviews by job
    List<InterviewRound> findByJobIdOrderByScheduledDateTimeDesc(Long jobId);
    
    // Find interviews by status
    List<InterviewRound> findByStatusOrderByScheduledDateTimeDesc(InterviewRound.InterviewStatus status);
    
    // Find interviews by room code
    Optional<InterviewRound> findByRoomCode(String roomCode);
    
    // Find upcoming interviews for a recruiter
    @Query("SELECT ir FROM InterviewRound ir WHERE ir.recruiterEmail = :recruiterEmail " +
           "AND ir.scheduledDateTime > :now AND ir.status = 'SCHEDULED' " +
           "ORDER BY ir.scheduledDateTime ASC")
    List<InterviewRound> findUpcomingInterviewsByRecruiter(@Param("recruiterEmail") String recruiterEmail, 
                                                          @Param("now") LocalDateTime now);
    
    // Find interviews for a candidate
    @Query("SELECT ir FROM InterviewRound ir JOIN ir.candidateEmails ce " +
           "WHERE ce = :candidateEmail ORDER BY ir.scheduledDateTime DESC")
    List<InterviewRound> findInterviewsForCandidate(@Param("candidateEmail") String candidateEmail);
    
    // Find today's interviews for a recruiter
    @Query("SELECT ir FROM InterviewRound ir WHERE ir.recruiterEmail = :recruiterEmail " +
           "AND DATE(ir.scheduledDateTime) = DATE(:today) " +
           "ORDER BY ir.scheduledDateTime ASC")
    List<InterviewRound> findTodaysInterviewsByRecruiter(@Param("recruiterEmail") String recruiterEmail, 
                                                        @Param("today") LocalDateTime today);
    
    // Find interviews by recruiter and job
    List<InterviewRound> findByRecruiterEmailAndJobIdOrderByScheduledDateTimeDesc(String recruiterEmail, Long jobId);

    // Delete interviews by job
    void deleteByJobId(Long jobId);
}
