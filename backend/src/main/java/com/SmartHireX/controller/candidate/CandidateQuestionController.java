package com.SmartHireX.controller.candidate;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.SmartHireX.dto.CandidateQuestionDTO;
import com.SmartHireX.entity.User;
import com.SmartHireX.service.ExamResultService;
import com.SmartHireX.service.QuestionService;
import com.SmartHireX.service.RoundService;
import com.SmartHireX.service.UserService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/candidate")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('CANDIDATE') or hasRole('ADMIN')")
public class CandidateQuestionController {
    
    @Autowired
    private QuestionService questionService;

    @Autowired
    private UserService userService;

    @Autowired
    private ExamResultService examResultService;

    @Autowired
    private RoundService roundService;
    
    /**
     * Get questions for candidates (excludes correct answers)
     */
    @GetMapping("/rounds/{roundId}/questions")
    public ResponseEntity<?> getCandidateQuestions(
            @PathVariable Long roundId,
            Authentication authentication) {
        
        try {
            User candidate = resolveCandidate(authentication);
            ResponseEntity<?> accessViolation = enforceAccessGuard(roundId, candidate);
            if (accessViolation != null) {
                return accessViolation;
            }
            
            List<CandidateQuestionDTO> questions = questionService.getCandidateQuestionsByRoundId(roundId);
            
            if (questions.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                    "message", "No questions found for this round",
                    "questions", questions
                ));
            }
            
            return ResponseEntity.ok(questions);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch questions: " + e.getMessage()));
        }
    }
    
    /**
     * Get exam data for candidates (round info + questions)
     */
    @GetMapping("/exam-info/{roundId}")
    public ResponseEntity<?> getExamData(
            @PathVariable Long roundId,
            Authentication authentication) {
        
        try {
            User candidate = resolveCandidate(authentication);
            ResponseEntity<?> accessViolation = enforceAccessGuard(roundId, candidate);
            if (accessViolation != null) {
                return accessViolation;
            }
            
            // Get questions for the candidate
            List<CandidateQuestionDTO> questions = questionService.getCandidateQuestionsByRoundId(roundId);
            
            // For now, we'll return basic round info
            // TODO: Integrate with Round service to get full round details
            Map<String, Object> examData = Map.of(
                "round", Map.of(
                    "id", roundId,
                    "title", "MCQ Round", // TODO: Get from Round service
                    "type", "MCQS",
                    "duration", 60,
                    "instructions", "Answer all questions to the best of your ability. Each question has only one correct answer."
                ),
                "questions", questions
            );
            
            return ResponseEntity.ok(examData);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch exam data: " + e.getMessage()));
        }
    }

    private User resolveCandidate(Authentication authentication) {
        String email = authentication.getName();
        return userService.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
    }

    @SuppressWarnings("unchecked")
    private ResponseEntity<?> enforceAccessGuard(Long roundId, User candidate) {
        if (examResultService.hasExamBeenTaken(roundId, candidate.getId())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of(
                            "error", "Exam already submitted",
                            "message", "You have already submitted this exam and cannot retake it."
                    ));
        }

        Map<String, Object> shortlist = roundService.getRoundShortlist(roundId);
        boolean isFirstRound = Boolean.TRUE.equals(shortlist.get("isFirstRound"));
        if (isFirstRound) {
            return null;
        }

        List<Map<String, Object>> candidates = (List<Map<String, Object>>) shortlist.getOrDefault("candidates", List.of());
        boolean shortlisted = candidates.stream().anyMatch(entry -> {
            String email = (String) entry.get("candidateEmail");
            boolean allowed = Boolean.TRUE.equals(entry.get("shortlisted"));
            return allowed && email != null && email.equalsIgnoreCase(candidate.getEmail());
        });

        if (!shortlisted) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "error", "Not shortlisted",
                            "message", "You are not shortlisted for this round."
                    ));
        }

        return null;
    }
}
