package com.SmartHireX.service;

import com.SmartHireX.model.Application;
import com.SmartHireX.repository.ApplicationRepository;
import com.SmartHireX.repository.RoundRepository;
import com.SmartHireX.repository.ExamResultRepository;
import com.SmartHireX.repository.CodingExamResultRepository;
import com.SmartHireX.repository.MixedExamResultRepository;
import com.SmartHireX.entity.Round;
import com.SmartHireX.model.JobPosting;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class ApplicationService {
    
    private final ApplicationRepository applicationRepository;
    private final RoundRepository roundRepository;
    private final ExamResultRepository examResultRepository;
    private final CodingExamResultRepository codingExamResultRepository;
    private final MixedExamResultRepository mixedExamResultRepository;
    
    /**
     * Scheduled task that runs every 5 minutes to check for ended rounds
     * and update application statuses for candidates who didn't attempt them
     */
    @Scheduled(fixedRate = 300000) // 5 minutes = 300,000 milliseconds
    @Transactional
    public void processEndedRounds() {
        try {
            log.info("🔄 Processing ended rounds for auto-rejection...");
            
            LocalDateTime now = LocalDateTime.now();
            
            // Find all rounds that have ended (current time > start time + duration)
            List<Round> allRounds = roundRepository.findAll();
            
            int processedRounds = 0;
            int rejectedApplications = 0;
            
            for (Round round : allRounds) {
                if (isRoundEnded(round, now)) {
                    int rejected = processEndedRound(round);
                    if (rejected > 0) {
                        processedRounds++;
                        rejectedApplications += rejected;
                        log.info("📋 Round '{}' (ID: {}) - Rejected {} applications for non-attempt", 
                                round.getTitle(), round.getId(), rejected);
                    }
                }
            }
            
            if (processedRounds > 0) {
                log.info("✅ Auto-rejection complete: {} rounds processed, {} applications rejected", 
                        processedRounds, rejectedApplications);
            }
            
        } catch (Exception e) {
            log.error("❌ Error processing ended rounds: {}", e.getMessage(), e);
        }
    }
    
    /**
     * Check if a round has ended based on current time
     */
    private boolean isRoundEnded(Round round, LocalDateTime now) {
        if (round.getStartTime() == null || round.getDuration() == null) {
            return false;
        }
        
        LocalDateTime endTime = round.getStartTime().plusMinutes(round.getDuration());
        return now.isAfter(endTime);
    }
    
    /**
     * Process a specific ended round and reject applications for non-attempts
     */
    @Transactional
    public int processEndedRound(Round round) {
        try {
            // Get the job associated with this round
            JobPosting job = round.getJob();
            if (job == null) {
                log.warn("⚠️ Round {} has no associated job", round.getId());
                return 0;
            }
            
            // Find all shortlisted applications for this job
            List<Application> shortlistedApps = applicationRepository.findByJob_IdAndStatusIgnoreCase(job.getId(), "shortlisted");
            
            int rejectedCount = 0;
            
            for (Application app : shortlistedApps) {
                // Check if candidate attempted this round
                boolean hasAttempted = hasUserAttemptedRound(app.getEmail(), round.getId());
                
                if (!hasAttempted) {
                    // Candidate didn't attempt the round - reject the application
                    app.setStatus("rejected");
                    
                    // Add rejection details if the Application model supports it
                    // Note: This would require adding fields to the Application model
                    // For now, we'll just update the status
                    
                    applicationRepository.save(app);
                    rejectedCount++;
                    
                    log.info("🚫 Auto-rejected application for {} (Job: {}, Round: {}) - Round ended without attempt", 
                            app.getEmail(), job.getTitle(), round.getTitle());
                }
            }
            
            return rejectedCount;
            
        } catch (Exception e) {
            log.error("❌ Error processing ended round {}: {}", round.getId(), e.getMessage(), e);
            return 0;
        }
    }
    
    /**
     * Manual method to process a specific round (can be called from API)
     */
    @Transactional
    public void processSpecificRound(Long roundId) {
        try {
            Round round = roundRepository.findById(roundId)
                    .orElseThrow(() -> new RuntimeException("Round not found: " + roundId));
            
            if (isRoundEnded(round, LocalDateTime.now())) {
                int rejected = processEndedRound(round);
                log.info("📋 Manually processed round {} - Rejected {} applications", roundId, rejected);
            } else {
                log.warn("⚠️ Round {} has not ended yet", roundId);
            }
            
        } catch (Exception e) {
            log.error("❌ Error manually processing round {}: {}", roundId, e.getMessage(), e);
            throw new RuntimeException("Failed to process round: " + e.getMessage());
        }
    }
    
    /**
     * Check if a user has attempted a specific round
     * Checks across all exam result repositories (MCQ, Coding, Mixed)
     */
    private boolean hasUserAttemptedRound(String email, Long roundId) {
        try {
            // Check MCQ exam results
            boolean hasMcqResult = !examResultRepository.findByCandidateEmailOrderBySubmittedAtDesc(email)
                    .stream()
                    .filter(result -> result.getRoundId().equals(roundId))
                    .findAny()
                    .isEmpty();
            
            if (hasMcqResult) {
                log.debug("📝 User {} has MCQ result for round {}", email, roundId);
                return true;
            }
            
            // Check coding exam results (by finding all results for the round and checking email)
            boolean hasCodingResult = codingExamResultRepository.findByRoundIdOrderBySubmittedAtDesc(roundId)
                    .stream()
                    .anyMatch(result -> email.equalsIgnoreCase(result.getCandidateEmail()));
            
            if (hasCodingResult) {
                log.debug("💻 User {} has coding result for round {}", email, roundId);
                return true;
            }
            
            // Check mixed exam results
            boolean hasMixedResult = mixedExamResultRepository.findByRoundIdAndCandidateEmail(roundId, email).isPresent();
            if (hasMixedResult) {
                log.debug("🔄 User {} has mixed result for round {}", email, roundId);
                return true;
            }
            
            log.debug("❌ User {} has no results for round {}", email, roundId);
            return false;
            
        } catch (Exception e) {
            log.error("❌ Error checking if user {} attempted round {}: {}", email, roundId, e.getMessage());
            return false; // Assume not attempted if there's an error
        }
    }
}
