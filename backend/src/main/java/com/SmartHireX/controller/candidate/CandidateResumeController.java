package com.SmartHireX.controller.candidate;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.SmartHireX.entity.ResumeAnalysisHistory;
import com.SmartHireX.entity.User;
import com.SmartHireX.repository.ResumeAnalysisHistoryRepository;
import com.SmartHireX.repository.UserRepository;
import com.SmartHireX.service.GeminiResumeAnalysisService;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/candidate")
@CrossOrigin(origins = "*")
public class CandidateResumeController {

    @Autowired
    private GeminiResumeAnalysisService resumeAnalysisService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ResumeAnalysisHistoryRepository historyRepository;
    
    @Autowired
    private ObjectMapper objectMapper;

    /**
     * Analyze resume against job description using AI
     */
    @PostMapping("/analyze-resume")
    public ResponseEntity<?> analyzeResume(
            @RequestParam("resume") MultipartFile resumeFile,
            @RequestParam("jobDescription") String jobDescription,
            Authentication authentication) {
        
        try {
            System.out.println("=== RESUME ANALYSIS REQUEST ===");
            System.out.println("User: " + authentication.getName());
            System.out.println("Resume file: " + resumeFile.getOriginalFilename());
            System.out.println("File size: " + resumeFile.getSize() + " bytes");
            System.out.println("Job description length: " + jobDescription.length() + " chars");
            
            // Validate inputs
            if (resumeFile.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Resume file is required"));
            }
            
            if (jobDescription == null || jobDescription.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Job description is required"));
            }
            
            // Validate file type
            String filename = resumeFile.getOriginalFilename();
            if (filename == null || (!filename.toLowerCase().endsWith(".pdf") && 
                                   !filename.toLowerCase().endsWith(".docx") && 
                                   !filename.toLowerCase().endsWith(".txt"))) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Only PDF, DOCX, and TXT files are supported"));
            }
            
            // Validate file size (max 10MB)
            if (resumeFile.getSize() > 10 * 1024 * 1024) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "File size must be less than 10MB"));
            }
            
            // Get current user
            String userEmail = authentication.getName();
            User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Analyze resume using AI
            Map<String, Object> analysis;
            try {
                System.out.println("Starting AI resume analysis...");
                analysis = resumeAnalysisService.analyzeResume(resumeFile, jobDescription, user);
                System.out.println("✅ SUCCESS: Resume analysis completed");
            } catch (Exception aiError) {
                System.err.println("❌ AI ANALYSIS FAILED: " + aiError.getClass().getSimpleName() + " - " + aiError.getMessage());
                if (aiError.getCause() != null) {
                    System.err.println("Root cause: " + aiError.getCause().getMessage());
                }
                
                // Return explicit service-unavailable error
                return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(Map.of(
                            "error", "AI resume analysis service is currently unavailable",
                            "message", "Our AI resume analysis service is temporarily down. Please try again later.",
                            "suggestions", java.util.List.of(
                                "Try again in a few minutes",
                                "Check your internet connection",
                                "Ensure your resume file is properly formatted",
                                "Contact support if the issue persists"
                            ),
                            "errorCode", "AI_RESUME_SERVICE_UNAVAILABLE"
                        ));
            }
            
            // Save analysis to history
            try {
                saveAnalysisToHistory(userEmail, resumeFile.getOriginalFilename(), jobDescription, analysis);
            } catch (Exception historyError) {
                System.err.println("Warning: Failed to save analysis to history: " + historyError.getMessage());
                // Don't fail the request if history saving fails
            }
            
            return ResponseEntity.ok(analysis);
            
        } catch (Exception e) {
            System.err.println("Error analyzing resume: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to analyze resume: " + e.getMessage()));
        }
    }

    /**
     * Get resume analysis history for the current user
     */
    @GetMapping("/resume-analysis-history")
    public ResponseEntity<?> getResumeAnalysisHistory(Authentication authentication) {
        try {
            String userEmail = authentication.getName();
            List<ResumeAnalysisHistory> history = historyRepository.findByUserEmailOrderByCreatedAtDesc(userEmail);
            
            return ResponseEntity.ok(Map.of(
                "history", history,
                "count", history.size()
            ));
            
        } catch (Exception e) {
            System.err.println("Error fetching resume analysis history: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to fetch history: " + e.getMessage()));
        }
    }
    
    /**
     * Delete a specific analysis from history
     */
    @DeleteMapping("/resume-analysis-history/{id}")
    public ResponseEntity<?> deleteAnalysisHistory(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            String userEmail = authentication.getName();
            
            // Check if the history record exists and belongs to the user
            ResumeAnalysisHistory history = historyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Analysis history not found"));
            
            if (!history.getUserEmail().equals(userEmail)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "You can only delete your own analysis history"));
            }
            
            historyRepository.deleteById(id);
            
            return ResponseEntity.ok(Map.of(
                "message", "Analysis history deleted successfully",
                "deletedId", id
            ));
            
        } catch (Exception e) {
            System.err.println("Error deleting analysis history: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Failed to delete history: " + e.getMessage()));
        }
    }
    
    /**
     * Save analysis result to history
     */
    private void saveAnalysisToHistory(String userEmail, String resumeFilename, 
                                     String jobDescription, Map<String, Object> analysis) {
        try {
            // Extract key values from analysis
            Integer overallScore = 0;
            Integer keywordMatch = 0;
            
            if (analysis.get("overallScore") != null) {
                overallScore = (Integer) analysis.get("overallScore");
            } else if (analysis.get("score") != null) {
                overallScore = (Integer) analysis.get("score");
            }
            
            if (analysis.get("keywordMatch") != null) {
                keywordMatch = (Integer) analysis.get("keywordMatch");
            }
            
            // Convert analysis to JSON string
            String analysisJson = objectMapper.writeValueAsString(analysis);
            
            // Truncate job description if too long (keep first 500 chars)
            String truncatedJobDesc = jobDescription.length() > 500 ? 
                jobDescription.substring(0, 500) + "..." : jobDescription;
            
            // Create and save history record
            ResumeAnalysisHistory historyRecord = new ResumeAnalysisHistory(
                userEmail, resumeFilename, truncatedJobDesc, 
                overallScore, keywordMatch, analysisJson
            );
            
            historyRepository.save(historyRecord);
            System.out.println("✅ Analysis saved to history for user: " + userEmail);
            
        } catch (Exception e) {
            System.err.println("❌ Failed to save analysis to history: " + e.getMessage());
            throw new RuntimeException("Failed to save analysis to history", e);
        }
    }
}
