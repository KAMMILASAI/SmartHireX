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
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.entity.ExamAccessLock;
import com.SmartHireX.entity.MixedRoundComponent;
import com.SmartHireX.entity.Question;
import com.SmartHireX.repository.ExamAccessLockRepository;
import com.SmartHireX.security.UserPrincipal;
import com.SmartHireX.service.CodingProblemService;
import com.SmartHireX.service.MixedRoundService;
import com.SmartHireX.service.QuestionService;

@RestController
@RequestMapping("/candidate/mixed-exam")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('CANDIDATE') or hasRole('ADMIN')")
public class CandidateMixedExamController {

    private static final Logger logger = LoggerFactory.getLogger(CandidateMixedExamController.class);
    
    @Autowired
    private MixedRoundService mixedRoundService;
    
    @Autowired
    private QuestionService questionService;
    
    @Autowired
    private CodingProblemService codingProblemService;

    @Autowired
    private ExamAccessLockRepository examAccessLockRepository;

    private String resolveCandidateEmail(Authentication authentication) {
        if (authentication == null) return null;
        if (authentication.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getEmail();
        }
        return authentication.getName();
    }
    
    /**
     * Check mixed exam status
     */
    @GetMapping("/status/{roundId}")
    public ResponseEntity<?> getMixedExamStatus(
            @PathVariable Long roundId,
            Authentication authentication) {
        
        try {
            String candidateEmail = resolveCandidateEmail(authentication);

            boolean disqualified = examAccessLockRepository
                    .findByRoundIdAndCandidateEmailIgnoreCase(roundId, candidateEmail)
                    .map(lock -> lock.getStatus() == ExamAccessLock.LockStatus.MALPRACTICE)
                    .orElse(false);
            if (disqualified) {
                return ResponseEntity.ok(Map.of(
                    "alreadyTaken", true,
                    "isMixed", true,
                    "components", List.of(),
                    "disqualified", true,
                    "decisionStatus", "MALPRACTICE"
                ));
            }
            
            boolean alreadyTaken = mixedRoundService.hasAlreadyTaken(roundId, candidateEmail);
            List<MixedRoundComponent> components = mixedRoundService.getMixedRoundComponents(roundId);
            
            boolean isMixed = !components.isEmpty(); // If we have components, it's a mixed round
            
            System.out.println("=== MIXED EXAM STATUS DEBUG ===");
            System.out.println("Round ID: " + roundId);
            System.out.println("Already Taken: " + alreadyTaken);
            System.out.println("Is Mixed: " + isMixed);
            System.out.println("Components Count: " + components.size());
            
            return ResponseEntity.ok(Map.of(
                "alreadyTaken", alreadyTaken,
                "isMixed", isMixed,
                "components", components,
                "disqualified", false
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to check mixed exam status: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Simple test endpoint to check basic functionality
     */
    @GetMapping("/{roundId}/test")
    public ResponseEntity<?> testEndpoint(@PathVariable Long roundId) {
        try {
            System.out.println("=== TEST ENDPOINT CALLED ===");
            System.out.println("Round ID: " + roundId);
            
            return ResponseEntity.ok(Map.of(
                "message", "Test endpoint working",
                "roundId", roundId,
                "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            System.out.println("Error in test endpoint: " + e.getMessage());
            logger.error("Error in mixed exam test endpoint for roundId={}", roundId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", e.getMessage()
            ));
        }
    }

    /**
     * Get mixed exam content (MCQ questions and coding problems) - SIMPLIFIED FOR DEBUGGING
     */
    @GetMapping("/{roundId}")
    public ResponseEntity<?> getMixedExamContent(
            @PathVariable Long roundId,
            Authentication authentication) {
        
        try {
            String candidateEmail = resolveCandidateEmail(authentication);
            System.out.println("=== MIXED EXAM CONTENT REQUEST ===");
            System.out.println("Round ID: " + roundId);
            System.out.println("Candidate Email: " + candidateEmail);
            
            // Get mixed round components
            List<MixedRoundComponent> components = mixedRoundService.getMixedRoundComponents(roundId);
            System.out.println("Components found: " + components.size());

            if (components.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(
                    "error", "Mixed round configuration not found for this round"
                ));
            }
            
            Map<String, Object> examContent = new HashMap<>();
            
            for (MixedRoundComponent component : components) {
                if (component.getComponentType() == MixedRoundComponent.ComponentType.MCQ) {
                    // Get MCQ questions
                    List<?> questions = questionService.getCandidateQuestionsByRoundId(roundId);
                    examContent.put("mcqQuestions", questions);
                    examContent.put("mcqTimeLimit", component.getTimeLimitMinutes());
                    examContent.put("mcqWeight", component.getComponentWeight());
                    System.out.println("MCQ questions found: " + questions.size());
                    
                } else if (component.getComponentType() == MixedRoundComponent.ComponentType.CODING) {
                    // Get coding problems
                    List<?> codingProblems = codingProblemService.getCodingProblemsForCandidates(roundId);
                    examContent.put("codingProblems", codingProblems);
                    examContent.put("codingTimeLimit", component.getTimeLimitMinutes());
                    examContent.put("codingWeight", component.getComponentWeight());
                    System.out.println("Coding problems found: " + codingProblems.size());
                }
            }
            
            examContent.put("roundId", roundId);
            examContent.put("components", components);
            
            System.out.println("Returning real exam content");
            return ResponseEntity.ok(examContent);
            
        } catch (Exception e) {
            System.out.println("=== ERROR IN MIXED EXAM CONTENT ===");
            System.out.println("Error message: " + e.getMessage());
            System.out.println("Error class: " + e.getClass().getName());
                logger.error("Failed mixed exam content fetch for roundId={} user={}", roundId,
                    authentication != null ? resolveCandidateEmail(authentication) : "unknown", e);
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to fetch mixed exam content: " + e.getMessage(),
                "details", e.getClass().getSimpleName()
            ));
        }
    }
    
    /**
     * Submit individual MCQ question result
     */
    @PostMapping("/{roundId}/submit-mcq")
    public ResponseEntity<?> submitMCQComponent(
            @PathVariable Long roundId,
            @RequestBody Map<String, Object> submission,
            Authentication authentication) {
        
        try {
            String candidateEmail = resolveCandidateEmail(authentication);
            
            Long questionId = Long.valueOf(submission.get("questionId").toString());
            String selectedAnswer = submission.get("answer").toString();
            Integer timeSpent = toInteger(submission.get("timeSpent"));
            
            System.out.println("=== MCQ SUBMISSION DEBUG ===");
            System.out.println("Round ID: " + roundId);
            System.out.println("Question ID: " + questionId);
            System.out.println("Selected Answer: " + selectedAnswer);
            System.out.println("Time Spent: " + timeSpent);
            
            // Calculate score for this individual MCQ question
            int score = calculateMCQScore(questionId, selectedAnswer);
            
            // Store individual MCQ result
            mixedRoundService.storeMCQResult(roundId, candidateEmail, questionId, selectedAnswer, score, timeSpent);
            
            // Check if all components are completed and calculate total score
            Map<String, Object> examStatus = checkAndCalculateTotalScore(roundId, candidateEmail);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "MCQ question submitted successfully");
            response.put("questionScore", score);
            response.put("examStatus", examStatus);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to submit MCQ question: " + e.getMessage()
            ));
        }
    }

    /**
     * Submit individual coding problem result
     */
    @PostMapping("/{roundId}/submit-coding")
    public ResponseEntity<?> submitCodingComponent(
            @PathVariable Long roundId,
            @RequestBody Map<String, Object> submission,
            Authentication authentication) {
        
        try {
            String candidateEmail = resolveCandidateEmail(authentication);
            
            Long problemId = Long.valueOf(submission.get("problemId").toString());
            String solution = submission.get("solution").toString();
            String language = submission.get("language").toString();
            Integer timeSpent = toInteger(submission.get("timeSpent"));
            
            System.out.println("=== CODING SUBMISSION DEBUG ===");
            System.out.println("Round ID: " + roundId);
            System.out.println("Problem ID: " + problemId);
            System.out.println("Language: " + language);
            System.out.println("Time Spent: " + timeSpent);
            System.out.println("Solution Length: " + solution.length());
            // Always calculate score on backend to prevent client-side tampering
            int score = calculateCodingScore(problemId, solution, language);
            
            // Store individual coding result
            mixedRoundService.storeCodingResult(roundId, candidateEmail, problemId, solution, language, score, timeSpent);
            
            // Check if all components are completed and calculate total score
            Map<String, Object> examStatus = checkAndCalculateTotalScore(roundId, candidateEmail);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Coding problem submitted successfully");
            response.put("problemScore", score);
            response.put("examStatus", examStatus);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to submit coding problem: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Calculate MCQ score for individual question
     */
    private int calculateMCQScore(Long questionId, String selectedAnswer) {
        try {
            System.out.println("Calculating MCQ score for question " + questionId + " with answer: " + selectedAnswer);

            if (selectedAnswer == null || selectedAnswer.trim().isEmpty()) {
                return 0;
            }

            Question question = questionService.getQuestionById(questionId).orElse(null);
            if (question == null || question.getCorrectAnswer() == null) {
                return 0;
            }

            String normalized = selectedAnswer.trim();
            Integer selectedIndex = parseAnswerIndex(normalized);

            if (selectedIndex != null) {
                return selectedIndex.equals(question.getCorrectAnswer()) ? 100 : 0;
            }

            String correctAnswerText = questionService.getCorrectAnswer(questionId);
            return correctAnswerText.equalsIgnoreCase(normalized) ? 100 : 0;
            
        } catch (Exception e) {
            System.out.println("Error calculating MCQ score: " + e.getMessage());
            logger.error("Error calculating MCQ score for questionId={}", questionId, e);
            return 0;
        }
    }

    private Integer parseAnswerIndex(String selectedAnswer) {
        try {
            int numeric = Integer.parseInt(selectedAnswer);
            if (numeric >= 0 && numeric <= 3) {
                return numeric;
            }
        } catch (Exception ignored) {
            // Not numeric.
        }

        if (selectedAnswer.length() == 1) {
            char c = Character.toUpperCase(selectedAnswer.charAt(0));
            if (c >= 'A' && c <= 'D') {
                return c - 'A';
            }
        }

        return null;
    }

    private Integer toInteger(Object value) {
        if (value == null) return 0;
        if (value instanceof Integer i) return i;
        if (value instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception ignored) {
            return 0;
        }
    }
    
    /**
     * Calculate coding score for individual problem
     */
    private int calculateCodingScore(Long problemId, String solution, String language) {
        try {
            System.out.println("=== CODING SCORE CALCULATION ===");
            System.out.println("Problem ID: " + problemId);
            System.out.println("Language: " + language);
            System.out.println("Solution length: " + (solution != null ? solution.length() : 0));
            
            if (solution != null && solution.length() > 10) {
                System.out.println("Solution preview: " + solution.substring(0, Math.min(100, solution.length())));
            }
            
            // Enhanced scoring logic based on solution quality
            if (solution == null || solution.trim().isEmpty()) {
                System.out.println("Empty solution - Score: 0");
                return 0;
            }
            
            // Remove template/placeholder content
            String cleanSolution = solution.trim();
            if (cleanSolution.contains("Write your solution here") || 
                cleanSolution.contains("// Your code here") ||
                cleanSolution.length() < 20) {
                System.out.println("Template or minimal solution - Score: 10");
                return 10;
            }
            
            // Check for basic programming constructs
            int score = 30; // Base score for non-empty solution
            
            if (cleanSolution.contains("for") || cleanSolution.contains("while")) {
                score += 20; // Has loops
            }
            if (cleanSolution.contains("if") || cleanSolution.contains("switch")) {
                score += 15; // Has conditionals
            }
            if (cleanSolution.contains("return")) {
                score += 15; // Has return statements
            }
            if (cleanSolution.length() > 100) {
                score += 20; // Substantial solution
            }
            
            // Cap at 100
            score = Math.min(score, 100);
            
            System.out.println("Calculated score: " + score);
            return score;
            
        } catch (Exception e) {
            System.out.println("Error calculating coding score: " + e.getMessage());
            logger.error("Error calculating coding score for problemId={} language={}", problemId, language, e);
            return 0;
        }
    }
    
    /**
     * Check if all components completed and calculate total weighted score
     */
    private Map<String, Object> checkAndCalculateTotalScore(Long roundId, String candidateEmail) {
        try {
            // Get all mixed round components
            List<MixedRoundComponent> components = mixedRoundService.getMixedRoundComponents(roundId);
            
            // Get all submitted results
            Map<String, Object> results = mixedRoundService.getCandidateResults(roundId, candidateEmail);
            
            // Calculate total weighted score
            double totalScore = mixedRoundService.calculateTotalWeightedScore(roundId, candidateEmail, components);
            
            boolean allCompleted = mixedRoundService.areAllComponentsCompleted(roundId, candidateEmail, components);
            
            Map<String, Object> status = new HashMap<>();
            status.put("allCompleted", allCompleted);
            status.put("totalScore", totalScore);
            status.put("individualResults", results);
            
            if (allCompleted) {
                // Store final exam result
                mixedRoundService.storeFinalExamResult(roundId, candidateEmail, totalScore);
            }
            
            return status;
            
        } catch (Exception e) {
            System.out.println("Error checking exam status: " + e.getMessage());
            return Map.of("error", "Failed to calculate total score");
        }
    }
}
