package com.SmartHireX.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.dto.request.RoundRequest;
import com.SmartHireX.dto.response.RoundResponse;
import com.SmartHireX.entity.MixedExamResult;
import com.SmartHireX.entity.Round;
import com.SmartHireX.model.Application;
import com.SmartHireX.model.JobPosting;
import com.SmartHireX.repository.ApplicationRepository;
import com.SmartHireX.repository.JobRepository;
import com.SmartHireX.repository.MixedExamResultRepository;
import com.SmartHireX.repository.RoundRepository;
import com.SmartHireX.service.CandidateShortlistingService;
import com.SmartHireX.service.CodingExamResultService;
import com.SmartHireX.service.ExamResultService;
import com.SmartHireX.service.RoundService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class RoundServiceImpl implements RoundService {
    
    @Autowired
    private RoundRepository roundRepository;
    
    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private ExamResultService examResultService;
    @Autowired
    private CodingExamResultService codingExamResultService;

    @Autowired
    private MixedExamResultRepository mixedExamResultRepository;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private CandidateShortlistingService candidateShortlistingService;

    @Override
    public List<RoundResponse> getRoundsByJobId(Long jobId) {
        List<Round> rounds = roundRepository.findByJobIdOrderByRoundOrder(jobId);
        return rounds.stream()
                .map(RoundResponse::fromEntity)
                .collect(Collectors.toList());
    }
    
    @Override
                    public RoundResponse createRound(Long jobId, RoundRequest request) {
        JobPosting job = jobRepository.findById(jobId)
                .orElseThrow(() -> new RuntimeException("Job not found with id: " + jobId));

        LocalDateTime newRoundStart = LocalDateTime.parse(request.getStartTime());
        LocalDateTime newRoundEnd = newRoundStart.plusMinutes(request.getDuration());
        LocalDateTime now = LocalDateTime.now();

        // 0. Check if round is scheduled in the past
        if (newRoundStart.isBefore(now)) {
            throw new RuntimeException("Round cannot be scheduled in the past. Please select a future date and time.");
        }

        // 1. Check if round is within job's timeline
        if (job.getStartDate() != null && job.getEndDate() != null) {
            LocalDate jobStartDate = job.getStartDate().atZone(ZoneId.systemDefault()).toLocalDate();
            LocalDate jobEndDate = job.getEndDate().atZone(ZoneId.systemDefault()).toLocalDate();
            if (newRoundStart.isBefore(jobStartDate.atStartOfDay()) || newRoundStart.isAfter(jobEndDate.atTime(23, 59))) {
                throw new RuntimeException("Round date must be within the job's hiring timeline.");
            }
        }

        // 2. Check for clashes with other rounds (with 30-minute buffer)
        List<Round> existingRounds = roundRepository.findByJobIdOrderByRoundOrder(jobId);
        for (Round round : existingRounds) {
            LocalDateTime existingRoundStart = round.getStartTime();
            LocalDateTime existingRoundEnd = existingRoundStart.plusMinutes(round.getDuration());
            
            // Add 30-minute buffer before and after existing rounds
            LocalDateTime existingRoundStartWithBuffer = existingRoundStart.minusMinutes(30);
            LocalDateTime existingRoundEndWithBuffer = existingRoundEnd.plusMinutes(30);
            
            if (newRoundStart.isBefore(existingRoundEndWithBuffer) && newRoundEnd.isAfter(existingRoundStartWithBuffer)) {
                throw new RuntimeException("Time slot conflict with \"" + round.getTitle() + "\". Rounds must have at least 30 minutes gap between them.");
            }
        }

        Integer maxOrder = roundRepository.findMaxRoundOrderByJobId(jobId);
        int nextOrder = (maxOrder != null) ? maxOrder + 1 : 1;

        Round round = new Round();
        round.setTitle(request.getTitle());
        round.setDescription(request.getDescription());
        round.setType(request.getType());
        round.setTopics(request.getTopics());
        round.setStartTime(LocalDateTime.parse(request.getStartTime()));
        round.setDuration(request.getDuration());
        round.setInstructions(request.getInstructions());
        round.setMcqQuestions(request.getMcqQuestions());
        round.setCodingQuestions(request.getCodingQuestions());
        round.setTotalQuestions(request.getTotalQuestions());
        round.setNumAutoShortlistCandidates(request.getNumAutoShortlistCandidates());
        round.setRoundOrder(nextOrder);
        round.setJob(job);

        Round savedRound = roundRepository.save(round);

        try {
            candidateShortlistingService.notifyShortlistedCandidatesOfRound(job, savedRound);
        } catch (Exception notificationEx) {
            // Log but don't block round creation
            System.err.println("Failed to send round notification emails: " + notificationEx.getMessage());
        }

        return RoundResponse.fromEntity(savedRound);
    }
    
    @Override
                    public RoundResponse updateRound(Long roundId, RoundRequest request) {
        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new RuntimeException("Round not found with id: " + roundId));

        JobPosting job = round.getJob();
        LocalDateTime newRoundStart = LocalDateTime.parse(request.getStartTime());
        LocalDateTime newRoundEnd = newRoundStart.plusMinutes(request.getDuration());
        LocalDateTime now = LocalDateTime.now();

        // 0. Check if round is scheduled in the past
        if (newRoundStart.isBefore(now)) {
            throw new RuntimeException("Round cannot be scheduled in the past. Please select a future date and time.");
        }

        // 1. Check if round is within job's timeline
        if (job.getStartDate() != null && job.getEndDate() != null) {
            LocalDate jobStartDate = job.getStartDate().atZone(ZoneId.systemDefault()).toLocalDate();
            LocalDate jobEndDate = job.getEndDate().atZone(ZoneId.systemDefault()).toLocalDate();
            if (newRoundStart.isBefore(jobStartDate.atStartOfDay()) || newRoundStart.isAfter(jobEndDate.atTime(23, 59))) {
                throw new RuntimeException("Round date must be within the job's hiring timeline.");
            }
        }

        // 2. Check for clashes with other rounds (with 30-minute buffer)
        List<Round> existingRounds = roundRepository.findByJobIdOrderByRoundOrder(job.getId());
        for (Round existingRound : existingRounds) {
            if (existingRound.getId().equals(roundId)) continue; // Skip self
            
            LocalDateTime existingRoundStart = existingRound.getStartTime();
            LocalDateTime existingRoundEnd = existingRoundStart.plusMinutes(existingRound.getDuration());
            
            // Add 30-minute buffer before and after existing rounds
            LocalDateTime existingRoundStartWithBuffer = existingRoundStart.minusMinutes(30);
            LocalDateTime existingRoundEndWithBuffer = existingRoundEnd.plusMinutes(30);
            
            if (newRoundStart.isBefore(existingRoundEndWithBuffer) && newRoundEnd.isAfter(existingRoundStartWithBuffer)) {
                throw new RuntimeException("Time slot conflict with \"" + existingRound.getTitle() + "\". Rounds must have at least 30 minutes gap between them.");
            }
        }

        round.setTitle(request.getTitle());
        round.setDescription(request.getDescription());
        round.setType(request.getType());
        round.setTopics(request.getTopics());
        round.setStartTime(LocalDateTime.parse(request.getStartTime()));
        round.setDuration(request.getDuration());
        round.setInstructions(request.getInstructions());
        round.setMcqQuestions(request.getMcqQuestions());
        round.setCodingQuestions(request.getCodingQuestions());
        round.setTotalQuestions(request.getTotalQuestions());
        round.setNumAutoShortlistCandidates(request.getNumAutoShortlistCandidates());

        Round updatedRound = roundRepository.save(round);
        return RoundResponse.fromEntity(updatedRound);
    }
    
    @Override
    public void deleteRound(Long roundId) {
        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new RuntimeException("Round not found with id: " + roundId));
        
        roundRepository.delete(round);
        
        // Reorder remaining rounds
        List<Round> remainingRounds = roundRepository.findByJobIdOrderByRoundOrder(round.getJob().getId());
        for (int i = 0; i < remainingRounds.size(); i++) {
            Round r = remainingRounds.get(i);
            r.setRoundOrder(i + 1);
            roundRepository.save(r);
        }
    }
    
    @Override
    @Transactional(readOnly = true)
    public RoundResponse getRoundById(Long roundId) {
        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new RuntimeException("Round not found with id: " + roundId));
        
        return RoundResponse.fromEntity(round);
    }

    @Override
    public Map<String, Object> getRoundShortlist(Long roundId) {
        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new RuntimeException("Round not found with id: " + roundId));

        List<Map<String, Object>> rawResults = new ArrayList<>(fetchRoundResults(round));
        boolean isFirstRound = round.getRoundOrder() == null || round.getRoundOrder() <= 1;
        int shortlistLimit = round.getNumAutoShortlistCandidates() != null ? round.getNumAutoShortlistCandidates() : 0;

        final double MIN_SCORE_THRESHOLD = 70.0;

        Long jobId = round.getJob() != null ? round.getJob().getId() : null;
        Integer currentOrder = round.getRoundOrder();

        boolean hasResults = !rawResults.isEmpty();

        if (hasResults) {
            rawResults.sort((entryA, entryB) -> {
                double scoreA = extractScore(entryA);
                double scoreB = extractScore(entryB);
                int scoreComparison = Double.compare(scoreB, scoreA); // higher first
                if (scoreComparison != 0) {
                    return scoreComparison;
                }

                int timeA = extractTime(entryA);
                int timeB = extractTime(entryB);
                int timeComparison = Integer.compare(timeA, timeB); // lower time first
                if (timeComparison != 0) {
                    return timeComparison;
                }

                String keyA = extractTieBreakerKey(entryA);
                String keyB = extractTieBreakerKey(entryB);
                return keyA.compareToIgnoreCase(keyB);
            });
        }

        if (isFirstRound && !hasResults) {
            List<Map<String, Object>> applicants = getApplicantsForRound(round);
            Map<String, Object> response = new HashMap<>();
            response.put("roundId", roundId);
            response.put("roundTitle", round.getTitle());
            response.put("roundType", round.getType());
            response.put("roundOrder", round.getRoundOrder());
            response.put("isFirstRound", true);

            for (Map<String, Object> applicant : applicants) {
                applicant.put("shortlisted", null);
                applicant.put("decisionStatus", "READY_FOR_EXAM");
                applicant.put("eligibleToAttempt", true);
                applicant.put("status", "NOT_COMPLETED");
                applicant.put("displayScore", null);
                applicant.put("scorePercentage", null);
                applicant.put("progressNote", "Round not started. Candidate can attempt when it opens.");
            }
            response.put("shortlistLimit", shortlistLimit);
            response.put("totalCandidates", applicants.size());
            response.put("shortlistedCount", 0);
            response.put("candidates", applicants);

            return response;
        }

        List<Map<String, Object>> processedCandidates = new ArrayList<>();
        int shortlistedCount = 0;

        List<Map<String, Object>> previousShortlisted = new ArrayList<>();

        if (!isFirstRound && jobId != null && currentOrder != null && currentOrder > 1) {
            Round previousRound = roundRepository.findByJobIdOrderByRoundOrder(jobId).stream()
                    .filter(r -> r.getRoundOrder() != null && r.getRoundOrder() == currentOrder - 1)
                    .findFirst()
                    .orElse(null);

            if (previousRound != null) {
                Map<String, Object> previousShortlistPayload = getRoundShortlist(previousRound.getId());
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> previousCandidates = (List<Map<String, Object>>) previousShortlistPayload.getOrDefault("candidates", List.of());
                previousShortlisted = previousCandidates.stream()
                        .filter(entry -> Boolean.TRUE.equals(entry.get("shortlisted")))
                        .collect(Collectors.toList());
            }
        }

        final Set<String> allowedEmails = previousShortlisted.stream()
                .map(entry -> {
                    Object emailObj = entry.get("candidateEmail");
                    return emailObj != null ? emailObj.toString().toLowerCase() : null;
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        for (int index = 0; index < rawResults.size(); index++) {
            Map<String, Object> original = rawResults.get(index);
            Map<String, Object> candidate = new HashMap<>(original);

            double score = extractScore(candidate);
            candidate.put("displayScore", score);
            candidate.putIfAbsent("scorePercentage", score);
            boolean meetsScoreThreshold = score >= MIN_SCORE_THRESHOLD;
            candidate.put("scoreThresholdMet", meetsScoreThreshold);

            boolean shortlisted;
            String email = candidate.get("candidateEmail") != null ? candidate.get("candidateEmail").toString().toLowerCase() : null;
            boolean wasShortlistedPreviously = allowedEmails.isEmpty() || (email != null && allowedEmails.contains(email));

            shortlisted = meetsScoreThreshold && wasShortlistedPreviously && (shortlistLimit == 0 || shortlistedCount < shortlistLimit);
            if (shortlisted) {
                shortlistedCount++;
            }

            candidate.put("shortlisted", shortlisted);
            candidate.put("rank", index + 1);
            candidate.put("decisionStatus", shortlisted ? "SHORTLISTED" : "NOT_SHORTLISTED");
            candidate.put("eligibleToAttempt", shortlisted);

            processedCandidates.add(candidate);
        }

        if (!isFirstRound && !hasResults) {
            List<Map<String, Object>> awaitingCandidates = previousShortlisted.stream()
                    .map(prev -> {
                        Map<String, Object> candidate = new HashMap<>();
                        candidate.put("candidateName", prev.get("candidateName"));
                        candidate.put("candidateEmail", prev.get("candidateEmail"));
                        candidate.put("displayScore", null);
                        candidate.put("scorePercentage", null);
                        candidate.put("rank", prev.get("rank"));
                        candidate.put("status", "NOT_COMPLETED");
                        candidate.put("shortlisted", null);
                        candidate.put("decisionStatus", "READY_FOR_EXAM");
                        candidate.put("eligibleToAttempt", true);
                        candidate.put("progressNote", "Awaiting participation in this round. Previously shortlisted to proceed.");
                        candidate.put("scoreThresholdMet", null);
                        return candidate;
                    })
                    .collect(Collectors.toList());

            processedCandidates.addAll(awaitingCandidates);
        }

        if (shortlistLimit == 0) {
            shortlistedCount = 0;
        }

        Map<String, Object> response = new HashMap<>();
        response.put("roundId", roundId);
        response.put("roundTitle", round.getTitle());
        response.put("roundType", round.getType());
        response.put("roundOrder", round.getRoundOrder());
        response.put("shortlistLimit", shortlistLimit);
        response.put("isFirstRound", isFirstRound);
        response.put("totalCandidates", rawResults.size());
        int finalShortlistedCount = (int) processedCandidates.stream()
                .filter(entry -> Boolean.TRUE.equals(entry.get("shortlisted")))
                .count();
        response.put("shortlistedCount", finalShortlistedCount);
        response.put("candidates", processedCandidates);

        return response;
    }

    @Override
    public Map<String, Object> getRoundDecisionStatus(Long roundId) {
        Round round = roundRepository.findById(roundId)
                .orElseThrow(() -> new RuntimeException("Round not found with id: " + roundId));

        Map<String, Object> decisionStatus = new HashMap<>();
        decisionStatus.put("roundId", roundId);
        decisionStatus.put("roundTitle", round.getTitle());
        decisionStatus.put("roundOrder", round.getRoundOrder());
        decisionStatus.put("decisionsFinalized", Boolean.TRUE.equals(round.getDecisionsFinalized()));
        decisionStatus.put("decisionsFinalizedAt", round.getDecisionsFinalizedAt());
        decisionStatus.put("nextReminderSentAt", round.getNextReminderSentAt());

        Map<String, Object> shortlistSnapshot = null;
        try {
            shortlistSnapshot = getRoundShortlist(roundId);
        } catch (Exception shortlistError) {
            decisionStatus.put("shortlistUnavailable", true);
            decisionStatus.put("shortlistError", shortlistError.getMessage());
        }

        List<Map<String, Object>> candidates = new ArrayList<>();
        if (shortlistSnapshot != null) {
            decisionStatus.put("shortlistLimit", shortlistSnapshot.get("shortlistLimit"));
            decisionStatus.put("isFirstRound", shortlistSnapshot.get("isFirstRound"));
            decisionStatus.put("totalCandidates", shortlistSnapshot.get("totalCandidates"));

            Object candidatesObj = shortlistSnapshot.get("candidates");
            if (candidatesObj instanceof List<?>) {
                for (Object obj : (List<?>) candidatesObj) {
                    if (obj instanceof Map<?, ?>) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> candidateMap = (Map<String, Object>) obj;
                        candidates.add(candidateMap);
                    }
                }
            }
        }

        long shortlistedCount = candidates.stream()
                .filter(entry -> Boolean.TRUE.equals(entry.get("shortlisted")))
                .count();
        long rejectedCount = candidates.stream()
                .filter(entry -> Boolean.FALSE.equals(entry.get("shortlisted")))
                .count();
        long pendingCount = candidates.stream()
                .filter(entry -> entry.get("shortlisted") == null)
                .count();

        long eligibleCount = candidates.stream()
                .filter(entry -> Boolean.TRUE.equals(entry.get("eligibleToAttempt")))
                .count();

        decisionStatus.put("shortlistedCount", shortlistedCount);
        decisionStatus.put("rejectedCount", rejectedCount);
        decisionStatus.put("pendingCount", pendingCount);
        decisionStatus.put("eligibleToAttemptCount", eligibleCount);

        String overallStatus;
        if (Boolean.TRUE.equals(round.getDecisionsFinalized())) {
            overallStatus = "FINALIZED";
        } else if (pendingCount > 0) {
            overallStatus = "AWAITING_DECISIONS";
        } else if ((shortlistedCount + rejectedCount) > 0) {
            overallStatus = "READY_FOR_FINALIZATION";
        } else {
            overallStatus = "NO_RESULTS";
        }

        decisionStatus.put("status", overallStatus);

        return decisionStatus;
    }

    private List<Map<String, Object>> fetchRoundResults(Round round) {
        Long roundId = round.getId();
        if (roundId == null) {
            return List.of();
        }

        Round.RoundType type = round.getType();
        if (type == null) {
            return List.of();
        }

        switch (type) {
            case CODING:
                return codingExamResultService.getCodingExamResults(roundId);
            case MIXED:
            case MCQS_CODING:
                return getMixedRoundResults(roundId);
            case MCQS:
            case TECHNICAL_INTERVIEW:
            case HR_INTERVIEW:
            default:
                return examResultService.getExamResults(roundId);
        }
    }

    private List<Map<String, Object>> getMixedRoundResults(Long roundId) {
        List<MixedExamResult> results = mixedExamResultRepository.findByRoundIdOrderByTotalScoreDesc(roundId);
        List<Map<String, Object>> mapped = new ArrayList<>();

        for (MixedExamResult result : results) {
            Map<String, Object> map = new HashMap<>();
            map.put("id", result.getId());
            map.put("candidateName", result.getCandidateName());
            map.put("candidateEmail", result.getCandidateEmail());
            map.put("totalScore", result.getTotalScore() != null ? result.getTotalScore().doubleValue() : 0.0);
            map.put("mcqScore", result.getMcqScore() != null ? result.getMcqScore().doubleValue() : 0.0);
            map.put("codingScore", result.getCodingScore() != null ? result.getCodingScore().doubleValue() : 0.0);
            map.put("timeSpent", result.getTotalTimeSpent());
            map.put("status", result.getStatus() != null ? result.getStatus().name() : "UNKNOWN");
            map.put("submittedAt", result.getSubmittedAt() != null ? result.getSubmittedAt().toString() : null);
            mapped.add(map);
        }

        mapped.sort(Comparator.comparingDouble((Map<String, Object> entry) -> extractScore(entry)).reversed());
        return mapped;
    }

    private List<Map<String, Object>> getApplicantsForRound(Round round) {
        if (round.getJob() == null || round.getJob().getId() == null) {
            return List.of();
        }

        List<Application> applications = applicationRepository.findByJob_IdOrderByCreatedAtDesc(round.getJob().getId());
        List<Map<String, Object>> mapped = new ArrayList<>();

        for (int index = 0; index < applications.size(); index++) {
            Application application = applications.get(index);
            Map<String, Object> map = new HashMap<>();
            map.put("id", application.getId());
            map.put("candidateName", application.getName());
            map.put("candidateEmail", application.getEmail());
            map.put("status", application.getStatus());
            map.put("appliedAt", application.getCreatedAt() != null ? application.getCreatedAt().toString() : null);
            map.put("shortlisted", true);
            map.put("rank", index + 1);
            map.put("displayScore", null);
            mapped.add(map);
        }

        return mapped;
    }

    private double extractScore(Map<String, Object> candidate) {
        Object[] keys = new Object[] { candidate.get("scorePercentage"), candidate.get("score"), candidate.get("totalScore") };
        for (Object value : keys) {
            if (value instanceof Number) {
                return ((Number) value).doubleValue();
            }
            if (value instanceof String) {
                try {
                    return Double.parseDouble((String) value);
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return 0.0;
    }

    private int extractTime(Map<String, Object> candidate) {
        Object[] keys = new Object[] { candidate.get("timeTaken"), candidate.get("timeSpent"), candidate.get("duration") };
        for (Object value : keys) {
            if (value instanceof Number) {
                return Math.max(0, ((Number) value).intValue());
            }
            if (value instanceof String) {
                try {
                    return Math.max(0, (int) Math.round(Double.parseDouble((String) value)));
                } catch (NumberFormatException ignored) {
                }
            }
        }
        return Integer.MAX_VALUE; // Treat missing time as worst
    }

    private String extractTieBreakerKey(Map<String, Object> candidate) {
        Object email = candidate.get("candidateEmail");
        if (email instanceof String) {
            return (String) email;
        }
        Object name = candidate.get("candidateName");
        return name instanceof String ? (String) name : "";
    }
}
