package com.SmartHireX.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.SmartHireX.dto.QuestionDTO;
import com.SmartHireX.service.QuestionService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/recruiter/questions")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
public class QuestionController {
    
    @Autowired
    private QuestionService questionService;
    
    /**
     * Create a new question for a round (Recruiter only)
     */
    @PostMapping("/rounds/{roundId}/questions")
    public ResponseEntity<?> createQuestion(
            @PathVariable("roundId") Long roundId,
            @RequestBody QuestionDTO questionDTO,
            Authentication authentication) {
        
        try {
            // Set the round ID from path variable
            questionDTO.setRoundId(roundId);
            
            // Get the authenticated user
            String createdBy = authentication.getName();
            
            // Create the question
            QuestionDTO createdQuestion = questionService.createQuestion(questionDTO, createdBy);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(createdQuestion);
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to create question: " + e.getMessage()));
        }
    }
    
    /**
     * Get all questions for a round (Recruiter only - includes correct answers)
     */
    @GetMapping("/rounds/{roundId}/questions")
    public ResponseEntity<?> getQuestionsByRoundId(
            @PathVariable("roundId") Long roundId,
            Authentication authentication) {
        
        try {
            List<QuestionDTO> questions = questionService.getQuestionsByRoundId(roundId);
            return ResponseEntity.ok(questions);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch questions: " + e.getMessage()));
        }
    }
    
    
    /**
     * Update a question (Recruiter only)
     */
    @PutMapping("/questions/{questionId}")
    public ResponseEntity<?> updateQuestion(
            @PathVariable("questionId") Long questionId,
            @RequestBody QuestionDTO questionDTO,
            Authentication authentication) {
        
        try {
            String updatedBy = authentication.getName();
            QuestionDTO updatedQuestion = questionService.updateQuestion(questionId, questionDTO, updatedBy);
            
            return ResponseEntity.ok(updatedQuestion);
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update question: " + e.getMessage()));
        }
    }
    
    /**
     * Delete a question (Recruiter only)
     */
    @DeleteMapping("/questions/{questionId}")
    public ResponseEntity<?> deleteQuestion(
            @PathVariable("questionId") Long questionId,
            Authentication authentication) {
        
        try {
            String deletedBy = authentication.getName();
            boolean deleted = questionService.deleteQuestion(questionId, deletedBy);
            
            if (deleted) {
                return ResponseEntity.ok(Map.of("message", "Question deleted successfully"));
            } else {
                return ResponseEntity.notFound().build();
            }
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete question: " + e.getMessage()));
        }
    }
    
    /**
     * Get question count for a round
     */
    @GetMapping("/rounds/{roundId}/questions/count")
    public ResponseEntity<?> getQuestionCount(@PathVariable("roundId") Long roundId) {
        try {
            long count = questionService.getQuestionCountByRoundId(roundId);
            return ResponseEntity.ok(Map.of("count", count));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to get question count: " + e.getMessage()));
        }
    }
    
    /**
     * Check if a round has questions
     */
    @GetMapping("/rounds/{roundId}/questions/exists")
    public ResponseEntity<?> hasQuestions(@PathVariable Long roundId) {
        try {
            boolean hasQuestions = questionService.hasQuestions(roundId);
            return ResponseEntity.ok(Map.of("hasQuestions", hasQuestions));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to check questions: " + e.getMessage()));
        }
    }
}
