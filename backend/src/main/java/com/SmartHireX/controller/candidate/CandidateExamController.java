package com.SmartHireX.controller.candidate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.dto.CandidateQuestionDTO;
import com.SmartHireX.dto.ExamSubmissionDTO;
import com.SmartHireX.dto.response.RoundResponse;
import com.SmartHireX.entity.ExamAccessLock;
import com.SmartHireX.entity.User;
import com.SmartHireX.repository.CodingExamResultRepository;
import com.SmartHireX.repository.ExamAccessLockRepository;
import com.SmartHireX.repository.ExamResultRepository;
import com.SmartHireX.repository.MixedExamResultRepository;
import com.SmartHireX.repository.UserRepository;
import com.SmartHireX.security.UserPrincipal;
import com.SmartHireX.service.ExamResultService;
import com.SmartHireX.service.QuestionService;
import com.SmartHireX.service.RoundService;
import com.SmartHireX.service.UserService;

@RestController
@RequestMapping("/candidate")
@PreAuthorize("hasRole('CANDIDATE') or hasRole('ADMIN')")
public class CandidateExamController {

    private static final Logger logger = LoggerFactory.getLogger(CandidateExamController.class);
    
    @Autowired
    private ExamResultService examResultService;

    @Autowired
    private MixedExamResultRepository mixedExamResultRepository;

    @Autowired
    private CodingExamResultRepository codingExamResultRepository;

    @Autowired
    private ExamResultRepository examResultRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private RoundService roundService;

    @Autowired
    private QuestionService questionService;

    @Autowired
    private ExamAccessLockRepository examAccessLockRepository;

    private String resolveCandidateEmail(Authentication authentication) {
        if (authentication == null) return null;
        if (authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getEmail();
        }
        return authentication.getName();
    }

    private boolean isMalpracticeLocked(Long roundId, String candidateEmail) {
        if (candidateEmail == null || candidateEmail.isBlank()) return false;
        return examAccessLockRepository
                .findByRoundIdAndCandidateEmailIgnoreCase(roundId, candidateEmail)
                .map(lock -> lock.getStatus() == ExamAccessLock.LockStatus.MALPRACTICE)
                .orElse(false);
    }

    /**
     * Submit exam results
     */
    @PostMapping("/exam/submit")
    public ResponseEntity<?> submitExam(
            @RequestBody ExamSubmissionDTO submission,
            Authentication authentication) {
        
        try {
            // Get candidate details from authentication
            String candidateEmail = resolveCandidateEmail(authentication);
            
            // Get actual user details from database
            User candidate = userService.findByEmail(candidateEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + candidateEmail));
            
            Long candidateId = candidate.getId();
            String candidateName = (candidate.getFirstName() != null ? candidate.getFirstName() : "") + 
                                 (candidate.getLastName() != null ? " " + candidate.getLastName() : "").trim();
            if (candidateName.isEmpty()) {
                candidateName = candidateEmail; // Fallback to email if no name
            }
            
            // Check if exam has already been submitted
            if (examResultService.hasExamBeenTaken(submission.getRoundId(), candidateId)) {
                return ResponseEntity.badRequest().body(
                    Map.of("error", "Exam has already been submitted for this round")
                );
            }
            
            // Submit exam
            Map<String, Object> result = examResultService.submitExam(submission, candidateId, candidateEmail, candidateName);
            
            return ResponseEntity.ok(Map.of(
                "message", "Exam submitted successfully",
                "result", result
            ));
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to submit exam: " + e.getMessage()));
        }
    }
    
    /**
     * Simple MCQ exam status check — only queries exam_results table, no shortlist logic
     */
    @GetMapping("/mcq/exam-status/{roundId}")
    public ResponseEntity<?> getMcqExamStatus(
            @PathVariable Long roundId,
            Authentication authentication) {
        try {
            System.out.println("DEBUG: getMcqExamStatus called with roundId: " + roundId);
            System.out.println("DEBUG: Authentication: " + (authentication != null ? authentication.getClass().getSimpleName() : "null"));
            System.out.println("DEBUG: Principal: " + (authentication != null && authentication.getPrincipal() != null ? authentication.getPrincipal().getClass().getSimpleName() : "null"));
            
            if (authentication == null) {
                System.err.println("ERROR: Authentication is null");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            
            // Get candidate ID directly from the principal — no DB lookup needed
            Long candidateId = null;
            String candidateEmail;

            if (authentication.getPrincipal() instanceof UserPrincipal principal) {
                candidateId = principal.getId();
                candidateEmail = principal.getEmail();
                System.out.println("DEBUG: Found UserPrincipal - ID: " + candidateId + ", Email: " + candidateEmail);
            } else {
                System.err.println("ERROR: Principal is not UserPrincipal: " + authentication.getPrincipal().getClass().getName());
                // Fallback: look up by email
                candidateEmail = authentication.getName();
                System.out.println("DEBUG: Fallback - using email from getName(): " + candidateEmail);
                try {
                    User candidate = userRepository.findByEmailIgnoreCase(candidateEmail).orElse(null);
                    if (candidate != null) {
                        candidateId = candidate.getId();
                        System.out.println("DEBUG: Found candidate by email - ID: " + candidateId);
                    } else {
                        System.err.println("ERROR: No candidate found for email: " + candidateEmail);
                    }
                } catch (Exception e) {
                    System.err.println("ERROR: Failed to lookup candidate by email: " + e.getMessage());
                    logger.error("Failed candidate lookup for email {}", candidateEmail, e);
                }
            }

            if (candidateEmail != null && isMalpracticeLocked(roundId, candidateEmail)) {
                return ResponseEntity.ok(Map.of(
                    "alreadyTaken", true,
                    "disqualified", true,
                    "decisionStatus", "MALPRACTICE",
                    "eligibleToAttempt", false
                ));
            }

            boolean taken = false;
            if (candidateId != null) {
                try {
                    System.out.println("DEBUG: Checking if exam exists for roundId: " + roundId + ", candidateId: " + candidateId);
                    taken = examResultRepository.existsByRoundIdAndCandidateId(roundId, candidateId);
                    System.out.println("DEBUG: existsByRoundIdAndCandidateId returned: " + taken);
                } catch (Exception e) {
                    System.err.println("ERROR: existsByRoundIdAndCandidateId failed: " + e.getMessage());
                    logger.error("Exam status check by candidateId failed for roundId={} candidateId={}", roundId, candidateId, e);
                    taken = false;
                }
            } else {
                System.err.println("WARNING: candidateId is null, cannot check exam status");
            }

            // Fallback by candidate email to avoid false negatives when candidateId resolution fails.
            if (!taken && candidateEmail != null && !candidateEmail.isBlank()) {
                try {
                    taken = examResultRepository.existsByRoundIdAndCandidateEmailIgnoreCase(roundId, candidateEmail);
                } catch (Exception e) {
                    System.err.println("ERROR: existsByRoundIdAndCandidateEmailIgnoreCase failed: " + e.getMessage());
                }
            }
            
            System.out.println("DEBUG: Final result - roundId=" + roundId + " candidateId=" + candidateId + " taken=" + taken);
            return ResponseEntity.ok(Map.of(
                "alreadyTaken", taken,
                "disqualified", false
            ));
        } catch (Exception e) {
            System.err.println("ERROR: Exception in getMcqExamStatus: " + e.getMessage());
            logger.error("Unhandled exception in getMcqExamStatus for roundId={}", roundId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to check exam status: " + e.getMessage()));
        }
    }

    /**
     * Check if candidate has already taken the exam — uses direct repository calls only
     */
    @GetMapping("/exam/{roundId}/status")
    public ResponseEntity<?> getExamStatus(
            @PathVariable Long roundId,
            Authentication authentication) {
        try {
            if (authentication == null || authentication.getName() == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Not authenticated"));
            }
            // getName() on UserPrincipal returns display name, not email — get email from principal directly
            String candidateEmail;
            candidateEmail = resolveCandidateEmail(authentication);

            if (isMalpracticeLocked(roundId, candidateEmail)) {
                Map<String, Object> malpracticeResponse = new HashMap<>();
                malpracticeResponse.put("hasBeenTaken", true);
                malpracticeResponse.put("eligibleToAttempt", false);
                malpracticeResponse.put("decisionStatus", "MALPRACTICE");
                malpracticeResponse.put("disqualified", true);
                return ResponseEntity.ok(malpracticeResponse);
            }

            // Look up candidate ID directly from repository
            Long candidateId = null;
            try {
                User candidate = userRepository.findByEmailIgnoreCase(candidateEmail).orElse(null);
                candidateId = candidate != null ? candidate.getId() : null;
            } catch (Exception e) {
                System.err.println("[getExamStatus] userRepository lookup failed: " + e.getMessage());
            }

            // Check all exam types using direct repository calls — no service layer
            boolean hasBeenTaken = false;
            if (candidateId != null) {
                try { if (examResultRepository.existsByRoundIdAndCandidateId(roundId, candidateId)) hasBeenTaken = true; } catch (Exception e) { System.err.println("[getExamStatus] examResult check failed: " + e.getMessage()); }
                try { if (codingExamResultRepository.existsByRoundIdAndCandidateId(roundId, candidateId)) hasBeenTaken = true; } catch (Exception e) { System.err.println("[getExamStatus] codingResult check failed: " + e.getMessage()); }
            }
            final String emailForLambda = candidateEmail;
            try { if (mixedExamResultRepository.findByRoundIdAndCandidateEmailIgnoreCase(roundId, emailForLambda).isPresent()) hasBeenTaken = true; } catch (Exception e) { System.err.println("[getExamStatus] mixedResult check failed: " + e.getMessage()); }

            Map<String, Object> response = new HashMap<>();
            response.put("hasBeenTaken", hasBeenTaken);
            response.put("eligibleToAttempt", true);
            response.put("decisionStatus", hasBeenTaken ? "COMPLETED" : "AWAITING_RESULT");
            response.put("disqualified", false);

            // Try to get shortlist info — optional, don't fail if it throws
            try {
                Map<String, Object> shortlistPayload = roundService.getRoundShortlist(roundId);
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> candidates = (List<Map<String, Object>>) shortlistPayload.getOrDefault("candidates", List.of());
                candidates.stream()
                    .filter(e -> emailForLambda.equalsIgnoreCase(String.valueOf(e.get("candidateEmail"))))
                    .findFirst()
                    .ifPresent(entry -> {
                        response.put("shortlisted", entry.get("shortlisted"));
                        response.put("decisionStatus", entry.getOrDefault("decisionStatus", response.get("decisionStatus")));
                        response.put("eligibleToAttempt", entry.getOrDefault("eligibleToAttempt", true));
                    });
            } catch (Exception e) {
                System.err.println("[getExamStatus] shortlist lookup failed (non-fatal): " + e.getMessage());
            }

            // hasBeenTaken always wins — if taken, force eligibleToAttempt true so UI shows Submitted
            if (hasBeenTaken) response.put("eligibleToAttempt", true);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Status check failed for roundId={} and user={}", roundId,
                authentication != null ? authentication.getName() : "unknown", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Status check failed: " + e.getMessage()));
        }
    }

    /**
     * Get candidate's exam history
     */
    @GetMapping("/exam/history")
    public ResponseEntity<?> getExamHistory(Authentication authentication) {
        
        try {
            // Get candidate details from authentication
            String candidateEmail = resolveCandidateEmail(authentication);
            
            // Get actual user details from database
            User candidate = userService.findByEmail(candidateEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + candidateEmail));
            
            Long candidateId = candidate.getId();
            
            List<Map<String, Object>> results = examResultService.getCandidateExamHistory(candidateId);
            
            return ResponseEntity.ok(results);
            
        } catch (IllegalArgumentException e) {
            Map<String, Object> errorBody = new HashMap<>();
            errorBody.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorBody);
        } catch (Exception e) {
            Map<String, Object> errorBody = new HashMap<>();
            errorBody.put("error", "Failed to fetch exam history: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody);
        }
    }
    
    /**
     * Get specific exam result for candidate
     */
    @GetMapping("/exam/result/{resultId}")
    public ResponseEntity<?> getExamResult(
            @PathVariable Long resultId,
            Authentication authentication) {
        
        try {
            Map<String, Object> result = examResultService.getDetailedExamResult(resultId);
            
            // TODO: Add security check to ensure candidate can only view their own results
            
            return ResponseEntity.ok(result);
            
        } catch (IllegalArgumentException e) {
            Map<String, Object> errorBody = new HashMap<>();
            errorBody.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorBody);
        } catch (Exception e) {
            Map<String, Object> errorBody = new HashMap<>();
            errorBody.put("error", "Failed to fetch exam result: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody);
        }
    }
    /**
     * Get round details for check-in process (doesn't check if exam was taken)
     */
    @GetMapping("/round/{roundId}/check-in")
    public ResponseEntity<?> getRoundForCheckIn(
            @PathVariable("roundId") Long roundId,
            Authentication authentication) {

        try {
            // Get round details without checking exam status
            RoundResponse roundResponse = roundService.getRoundById(roundId);
            Map<String, Object> roundData = convertRoundResponseToMap(roundResponse);

            return ResponseEntity.ok(roundData);

        } catch (IllegalArgumentException e) {
            Map<String, Object> errorBody = new HashMap<>();
            errorBody.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorBody);
        } catch (Exception e) {
            Map<String, Object> errorBody = new HashMap<>();
            errorBody.put("error", "Failed to fetch round data: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody);
        }
    }


    /**
     * Get exam data for a specific round (used by SecureExam.jsx)
     */
    @GetMapping("/exam-data/{roundId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getExamData(
            @PathVariable Long roundId,
            Authentication authentication) {
        
        try {
            // Get candidate details from authentication
            String candidateEmail = resolveCandidateEmail(authentication);

            if (isMalpracticeLocked(roundId, candidateEmail)) {
                return ResponseEntity.badRequest().body(
                    Map.of("error", "Exam access blocked due to malpractice for this round")
                );
            }
            
            // Get actual user details from database
            User candidate = userService.findByEmail(candidateEmail)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + candidateEmail));
            
            Long candidateId = candidate.getId();
            
            // Check if exam has already been taken (wrapped to isolate failures)
            boolean hasBeenTaken = false;
            try {
                hasBeenTaken = examResultService.hasExamBeenTaken(roundId, candidateId);
            } catch (Exception checkEx) {
                System.err.println("[getExamData] hasExamBeenTaken failed: " + checkEx.getMessage());
                // Non-fatal — proceed without the check
            }

            if (hasBeenTaken) {
                return ResponseEntity.badRequest().body(
                    Map.of("error", "Exam has already been submitted for this round")
                );
            }
            
            // Get round details
            RoundResponse roundResponse = roundService.getRoundById(roundId);
            Map<String, Object> roundData = convertRoundResponseToMap(roundResponse);
            
            // Get questions for the round
            List<CandidateQuestionDTO> candidateQuestions = questionService.getCandidateQuestionsByRoundId(roundId);
            
            // Convert to Map format for consistency
            List<Map<String, Object>> questions = candidateQuestions.stream()
                .map(this::convertCandidateQuestionToMap)
                .collect(java.util.stream.Collectors.toList());
            
            Map<String, Object> examData = new HashMap<>();
            examData.put("round", roundData);
            examData.put("questions", questions);
            examData.put("hasBeenTaken", false);
            
            return ResponseEntity.ok(examData);
            
        } catch (IllegalArgumentException e) {
            Map<String, Object> errorBody = new HashMap<>();
            errorBody.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(errorBody);
        } catch (Exception e) {
            logger.error("Failed to fetch exam data for roundId={} user={}", roundId,
                    authentication != null ? authentication.getName() : "unknown", e);
            Map<String, Object> errorBody = new HashMap<>();
            errorBody.put("error", "Failed to fetch exam data: " + e.getClass().getSimpleName() + ": " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorBody);
        }
    }

    @PostMapping("/exam/{roundId}/violation")
    public ResponseEntity<?> reportViolation(
            @PathVariable Long roundId,
            @RequestBody Map<String, Object> violationPayload,
            Authentication authentication) {
        try {
            String candidateEmail = resolveCandidateEmail(authentication);
            if (candidateEmail == null || candidateEmail.isBlank()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not authenticated"));
            }

            String reason = String.valueOf(
                    violationPayload.getOrDefault("violation",
                    violationPayload.getOrDefault("reason", "Security violation"))
            );

            ExamAccessLock lock = examAccessLockRepository
                    .findByRoundIdAndCandidateEmailIgnoreCase(roundId, candidateEmail)
                    .orElseGet(ExamAccessLock::new);

            lock.setRoundId(roundId);
            lock.setCandidateEmail(candidateEmail);
            lock.setStatus(ExamAccessLock.LockStatus.MALPRACTICE);
            lock.setReason(reason);
            examAccessLockRepository.save(lock);

            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Violation recorded. Candidate disqualified for this round.",
                "decisionStatus", "MALPRACTICE"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to record violation: " + e.getMessage()));
        }
    }


    /**
     * Helper method to convert RoundResponse to Map for JSON serialization
     */
    private Map<String, Object> convertRoundResponseToMap(RoundResponse roundResponse) {
        Map<String, Object> roundMap = new HashMap<>();
        roundMap.put("id", roundResponse.getId());
        roundMap.put("title", roundResponse.getTitle());
        roundMap.put("description", roundResponse.getDescription());
        roundMap.put("type", roundResponse.getType());
        roundMap.put("instructions", roundResponse.getInstructions());
        roundMap.put("topics", roundResponse.getTopics());
        roundMap.put("totalQuestions", roundResponse.getTotalQuestions());
        roundMap.put("mcqQuestions", roundResponse.getMcqQuestions());
        roundMap.put("codingQuestions", roundResponse.getCodingQuestions());
        roundMap.put("timeLimit", roundResponse.getDuration());
        roundMap.put("roundOrder", roundResponse.getRoundOrder());
        roundMap.put("numAutoShortlistCandidates", roundResponse.getNumAutoShortlistCandidates());
        roundMap.put("createdAt", roundResponse.getCreatedAt());
        roundMap.put("updatedAt", roundResponse.getUpdatedAt());
        return roundMap;
    }

    /**
     * Helper method to convert CandidateQuestionDTO to Map for JSON serialization
     */
    private Map<String, Object> convertCandidateQuestionToMap(CandidateQuestionDTO question) {
        Map<String, Object> questionMap = new HashMap<>();
        questionMap.put("id", question.getId());
        questionMap.put("questionText", question.getQuestionText());
        questionMap.put("options", question.getOptions());
        // Note: CandidateQuestionDTO doesn't include roundId for security reasons
        return questionMap;
    }
}
