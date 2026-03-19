package com.SmartHireX.service;

import com.SmartHireX.entity.CandidateProgress;
import com.SmartHireX.entity.CandidateProgress.ProgressStatus;
import com.SmartHireX.entity.Round;
import com.SmartHireX.model.Application;
import com.SmartHireX.model.JobPosting;
import com.SmartHireX.repository.ApplicationRepository;
import com.SmartHireX.repository.CandidateProgressRepository;
import com.SmartHireX.repository.RoundRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional
public class WorkflowManagementService {
    
    private static final Logger logger = LoggerFactory.getLogger(WorkflowManagementService.class);
    
    @Autowired
    private CandidateProgressRepository candidateProgressRepository;
    
    @Autowired
    private ApplicationRepository applicationRepository;
    
    @Autowired
    private RoundRepository roundRepository;
    
    @Autowired
    private EmailService emailService;
    
    @Autowired
    private CandidateShortlistingService shortlistingService;
    
    /**
     * Initialize candidate progress tracking for a job
     */
    public void initializeCandidateProgress(JobPosting job) {
        logger.info("🚀 Initializing candidate progress for job: {}", job.getTitle());
        
        List<Application> applications = applicationRepository.findByJobId(job.getId());
        
        for (Application application : applications) {
            // Check if progress already exists
            if (candidateProgressRepository.findByJobIdAndApplicationId(job.getId(), application.getId()).isEmpty()) {
                CandidateProgress progress = new CandidateProgress();
                progress.setJob(job);
                progress.setApplication(application);
                progress.setCurrentRound(0);
                progress.setStatus(ProgressStatus.APPLIED);
                progress.setLastProgressedAt(LocalDateTime.now());
                
                candidateProgressRepository.save(progress);
            }
        }
        
        logger.info("✅ Initialized progress tracking for {} candidates", applications.size());
    }
    
    /**
     * Perform automatic shortlisting when shortlist end time is reached
     */
    public void performAutoShortlisting(JobPosting job) {
        if (!Boolean.TRUE.equals(job.getAutoShortlistEnabled())) {
            logger.info("⏭️ Auto-shortlisting disabled for job: {}", job.getTitle());
            return;
        }
        
        if (job.getAutoShortlistTime() == null || Instant.now().isBefore(job.getAutoShortlistTime())) {
            logger.info("⏰ Shortlist end time not reached for job: {}", job.getTitle());
            return;
        }
        
        logger.info("🎯 Performing auto-shortlisting for job: {}", job.getTitle());
        
        List<Application> applications = applicationRepository.findByJobId(job.getId());
        var shortlistedCandidates = shortlistingService.shortlistCandidates(applications, job);
        
        // Update candidate progress for shortlisted candidates
        for (var candidate : shortlistedCandidates) {
            if (candidate.isQualified()) {
                updateCandidateProgress(job.getId(), candidate.getApplicationId(), 
                                      1, ProgressStatus.SHORTLISTED, candidate.getTotalScore());
            }
        }
        
        // Reject non-shortlisted candidates
        List<Long> shortlistedIds = shortlistedCandidates.stream()
                .filter(c -> c.isQualified())
                .map(c -> c.getApplicationId())
                .collect(Collectors.toList());
        
        applications.stream()
                .filter(app -> !shortlistedIds.contains(app.getId()))
                .forEach(app -> {
                    updateCandidateProgress(job.getId(), app.getId(), 
                                          0, ProgressStatus.REJECTED, 0.0);
                    sendRejectionEmail(app, job, "Initial screening");
                });
        
        logger.info("✅ Auto-shortlisting completed: {} selected, {} rejected", 
                   shortlistedIds.size(), applications.size() - shortlistedIds.size());
    }
    
    /**
     * Complete a round and progress candidates automatically
     */
    public void completeRound(Long jobId, Integer roundNumber) {
        logger.info("🏁 Completing round {} for job {}", roundNumber, jobId);
        
        Round round = roundRepository.findByJobIdAndRoundOrder(jobId, roundNumber)
                .orElseThrow(() -> new RuntimeException("Round not found"));
        
        List<CandidateProgress> candidatesInRound = candidateProgressRepository
                .findByJobIdAndCurrentRound(jobId, roundNumber);
        
        if (candidatesInRound.isEmpty()) {
            logger.warn("⚠️ No candidates found in round {} for job {}", roundNumber, jobId);
            return;
        }
        
        // Auto-select based on round criteria
        List<CandidateProgress> selectedCandidates = autoSelectCandidatesForNextRound(
                candidatesInRound, round);
        
        // Progress selected candidates to next round
        for (CandidateProgress candidate : selectedCandidates) {
            progressCandidateToNextRound(candidate, roundNumber + 1);
            sendSelectionEmail(candidate.getApplication(), round.getJob(), roundNumber + 1);
        }
        
        // Reject remaining candidates
        candidatesInRound.stream()
                .filter(c -> !selectedCandidates.contains(c))
                .forEach(candidate -> {
                    candidate.setStatus(ProgressStatus.REJECTED);
                    candidate.setRejectionReason("Did not meet round " + roundNumber + " criteria");
                    candidate.setLastProgressedAt(LocalDateTime.now());
                    candidateProgressRepository.save(candidate);
                    
                    sendRejectionEmail(candidate.getApplication(), round.getJob(), 
                                     "Round " + roundNumber);
                });
        
        // Mark round as completed
        round.setDecisionsFinalized(true);
        round.setDecisionsFinalizedAt(LocalDateTime.now());
        roundRepository.save(round);
        
        logger.info("✅ Round {} completed: {} selected, {} rejected", 
                   roundNumber, selectedCandidates.size(), 
                   candidatesInRound.size() - selectedCandidates.size());
    }
    
    /**
     * Update candidate progress
     */
    public void updateCandidateProgress(Long jobId, Long applicationId, Integer roundNumber, 
                                       ProgressStatus status, Double score) {
        CandidateProgress progress = candidateProgressRepository
                .findByJobIdAndApplicationId(jobId, applicationId)
                .orElseThrow(() -> new RuntimeException("Candidate progress not found"));
        
        progress.setCurrentRound(roundNumber);
        progress.setStatus(status);
        progress.setLastRoundScore(score);
        progress.setLastProgressedAt(LocalDateTime.now());
        
        // Update overall score (average of all rounds)
        if (score != null && score > 0) {
            if (progress.getOverallScore() == null) {
                progress.setOverallScore(score);
            } else {
                progress.setOverallScore((progress.getOverallScore() + score) / 2);
            }
        }
        
        candidateProgressRepository.save(progress);
    }
    
    /**
     * Get workflow statistics for a job
     */
    public Map<String, Object> getWorkflowStats(Long jobId) {
        List<Object[]> statusCounts = candidateProgressRepository.countCandidatesByStatus(jobId);
        List<Object[]> roundCounts = candidateProgressRepository.countCandidatesByRound(jobId);
        
        Map<String, Long> statusMap = statusCounts.stream()
                .collect(Collectors.toMap(
                    arr -> arr[0].toString(),
                    arr -> (Long) arr[1]
                ));
        
        Map<Integer, Long> roundMap = roundCounts.stream()
                .collect(Collectors.toMap(
                    arr -> (Integer) arr[0],
                    arr -> (Long) arr[1]
                ));
        
        return Map.of(
            "statusBreakdown", statusMap,
            "roundBreakdown", roundMap,
            "totalCandidates", statusMap.values().stream().mapToLong(Long::longValue).sum()
        );
    }
    
    // Private helper methods
    
    private List<CandidateProgress> autoSelectCandidatesForNextRound(
            List<CandidateProgress> candidates, Round round) {
        
        // Sort by score (descending)
        candidates.sort((a, b) -> Double.compare(
            b.getLastRoundScore() != null ? b.getLastRoundScore() : 0.0,
            a.getLastRoundScore() != null ? a.getLastRoundScore() : 0.0
        ));
        
        int maxSelections = round.getNumAutoShortlistCandidates() != null ? 
                           round.getNumAutoShortlistCandidates() : candidates.size() / 2;
        
        return candidates.stream()
                .limit(maxSelections)
                .collect(Collectors.toList());
    }
    
    private void progressCandidateToNextRound(CandidateProgress candidate, Integer nextRound) {
        candidate.setCurrentRound(nextRound);
        candidate.setStatus(ProgressStatus.SELECTED);
        candidate.setLastProgressedAt(LocalDateTime.now());
        candidateProgressRepository.save(candidate);
    }
    
    private void sendSelectionEmail(Application application, JobPosting job, Integer nextRound) {
        try {
            emailService.sendRoundSelectionEmail(
                application.getEmail(),
                application.getName(),
                job.getTitle(),
                nextRound
            );
        } catch (Exception e) {
            logger.error("Failed to send selection email to {}: {}", 
                        application.getEmail(), e.getMessage());
        }
    }
    
    private void sendRejectionEmail(Application application, JobPosting job, String roundName) {
        try {
            emailService.sendRoundRejectionEmail(
                application.getEmail(),
                application.getName(),
                job.getTitle(),
                roundName
            );
        } catch (Exception e) {
            logger.error("Failed to send rejection email to {}: {}", 
                        application.getEmail(), e.getMessage());
        }
    }
}
