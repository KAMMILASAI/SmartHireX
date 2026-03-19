package com.SmartHireX.controller;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.entity.InterviewFeedback;
import com.SmartHireX.model.Application;
import com.SmartHireX.repository.ApplicationRepository;
import com.SmartHireX.repository.InterviewFeedbackRepository;
import com.SmartHireX.service.EmailService;

@RestController
@RequestMapping("/interview-feedback")
@CrossOrigin(origins = "*")
public class InterviewFeedbackController {
    
    private static final Logger logger = LoggerFactory.getLogger(InterviewFeedbackController.class);
    
    @Autowired
    private InterviewFeedbackRepository feedbackRepository;
    
    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private EmailService emailService;
    
    // Test endpoint to verify controller is working
    @GetMapping("/test")
    public ResponseEntity<?> testEndpoint() {
        return ResponseEntity.ok(Map.of("message", "InterviewFeedback controller is working!", "timestamp", System.currentTimeMillis()));
    }
    
    // Debug endpoint to check system status
    @GetMapping("/debug/status")
    public ResponseEntity<?> debugStatus() {
        try {
            Map<String, Object> status = new HashMap<>();
            status.put("controller", "InterviewFeedbackController");
            status.put("timestamp", LocalDateTime.now());
            status.put("totalFeedback", feedbackRepository.count());
            
            // Test database connection
            try {
                feedbackRepository.findAll();
                status.put("database", "Connected");
            } catch (Exception e) {
                status.put("database", "Error: " + e.getMessage());
            }
            
            // Check available endpoints
            status.put("endpoints", List.of(
                "GET /test", "POST /submit", "GET /room/{roomCode}", 
                "GET /job/{jobId}", "GET /job/{jobId}/candidate/{candidateName}",
                "GET /room/{roomCode}/job/{jobId}", "POST /candidate-selection"
            ));
            
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Debug status failed: " + e.getMessage()));
        }
    }
    
    // Submit interview feedback (Recruiters only)
    @PostMapping("/submit")
    // @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')") // Temporarily disabled for testing
    public ResponseEntity<?> submitFeedback(@RequestBody Map<String, Object> feedbackData) {
        try {
            logger.info("Submitting interview feedback: {}", feedbackData);
            
            // Validate required fields
            if (!feedbackData.containsKey("roomCode") || !feedbackData.containsKey("candidateName")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Room code and candidate name are required"));
            }
            
            // Validate that required numeric fields are present and valid
            String[] requiredFields = {"communication", "confidence", "technical", "softSkills", "problemSolving", "analytics"};
            for (String field : requiredFields) {
                if (!feedbackData.containsKey(field) || feedbackData.get(field) == null) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Missing required field: " + field));
                }
                try {
                    Integer value = (Integer) feedbackData.get(field);
                    if (value < 1 || value > 10) {
                        return ResponseEntity.badRequest().body(Map.of("error", field + " must be between 1 and 10"));
                    }
                } catch (ClassCastException e) {
                    return ResponseEntity.badRequest().body(Map.of("error", field + " must be a valid integer"));
                }
            }
            
            // Validate string fields
            String roomCode = (String) feedbackData.get("roomCode");
            String candidateName = (String) feedbackData.get("candidateName");
            String recruiterName = (String) feedbackData.get("recruiterName");
            
            if (roomCode == null || roomCode.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Room code cannot be empty"));
            }
            if (candidateName == null || candidateName.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Candidate name cannot be empty"));
            }
            
            // Create feedback entity
            InterviewFeedback feedback = new InterviewFeedback();
            feedback.setRoomCode(roomCode.trim());
            feedback.setCandidateName(candidateName.trim());
            feedback.setRecruiterName(recruiterName != null ? recruiterName.trim() : "Unknown Recruiter");
            feedback.setCommunication((Integer) feedbackData.get("communication"));
            feedback.setConfidence((Integer) feedbackData.get("confidence"));
            feedback.setTechnical((Integer) feedbackData.get("technical"));
            feedback.setSoftSkills((Integer) feedbackData.get("softSkills"));
            feedback.setProblemSolving((Integer) feedbackData.get("problemSolving"));
            feedback.setAnalytics((Integer) feedbackData.get("analytics"));
            feedback.setOverallComments((String) feedbackData.get("overallComments"));
            feedback.setInterviewDate((String) feedbackData.get("interviewDate"));
            // Handle jobId conversion safely
            Object jobIdObj = feedbackData.get("jobId");
            if (jobIdObj != null) {
                if (jobIdObj instanceof Integer) {
                    feedback.setJobId(((Integer) jobIdObj).longValue());
                } else if (jobIdObj instanceof Long) {
                    feedback.setJobId((Long) jobIdObj);
                } else if (jobIdObj instanceof String) {
                    try {
                        feedback.setJobId(Long.parseLong((String) jobIdObj));
                    } catch (NumberFormatException e) {
                        logger.warn("Invalid jobId format: {}", jobIdObj);
                    }
                }
            }
            feedback.setSubmittedAt(LocalDateTime.now());
            
            // Save feedback
            InterviewFeedback savedFeedback = feedbackRepository.save(feedback);
            
            logger.info("Feedback saved successfully with ID: {}", savedFeedback.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Feedback submitted successfully");
            response.put("feedbackId", savedFeedback.getId());
            response.put("averageScore", savedFeedback.getAverageScore());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error submitting feedback: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to submit feedback: " + e.getMessage()));
        }
    }
    
    // Get feedback by room code (Recruiters only)
    @GetMapping("/room/{roomCode}")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> getFeedbackByRoomCode(@PathVariable String roomCode) {
        try {
            List<InterviewFeedback> feedbackList = feedbackRepository.findByRoomCode(roomCode);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("feedback", feedbackList);
            response.put("count", feedbackList.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching feedback for room {}: ", roomCode, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch feedback"));
        }
    }
    
    // Get all feedback for a recruiter (Recruiters only)
    @GetMapping("/recruiter")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> getFeedbackByRecruiter(@RequestParam("recruiterName") String recruiterName) {
        try {
            List<InterviewFeedback> feedbackList = feedbackRepository.findByRecruiterNameContaining(recruiterName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("feedback", feedbackList);
            response.put("count", feedbackList.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching feedback for recruiter {}: ", recruiterName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch feedback"));
        }
    }
    
    // Get feedback by candidate name (Recruiters only)
    @GetMapping("/candidate/{candidateName}")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> getFeedbackByCandidate(@PathVariable String candidateName) {
        try {
            List<InterviewFeedback> feedbackList = feedbackRepository.findByCandidateName(candidateName);
            Double averageScore = feedbackRepository.getAverageScoreForCandidate(candidateName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("feedback", feedbackList);
            response.put("count", feedbackList.size());
            response.put("averageScore", averageScore != null ? averageScore : 0.0);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching feedback for candidate {}: ", candidateName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch feedback"));
        }
    }
    
    // Get all feedback (Admin only)
    @GetMapping("/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllFeedback() {
        try {
            List<InterviewFeedback> feedbackList = feedbackRepository.findAllOrderBySubmittedAtDesc();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("feedback", feedbackList);
            response.put("count", feedbackList.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching all feedback: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch feedback"));
        }
    }
    
    // Get feedback statistics (Admin only)
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getFeedbackStats() {
        try {
            Long totalCount = feedbackRepository.getTotalFeedbackCount();
            List<Object[]> topPerformers = feedbackRepository.findTopPerformers();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("totalFeedback", totalCount);
            response.put("topPerformers", topPerformers);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching feedback statistics: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch statistics"));
        }
    }
    
    // Update feedback (Recruiters only)
    @PutMapping("/{feedbackId}")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateFeedback(@PathVariable Long feedbackId, @RequestBody Map<String, Object> feedbackData) {
        try {
            Optional<InterviewFeedback> existingFeedback = feedbackRepository.findById(feedbackId);
            
            if (existingFeedback.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            InterviewFeedback feedback = existingFeedback.get();
            
            // Update fields if provided
            if (feedbackData.containsKey("communication")) {
                feedback.setCommunication((Integer) feedbackData.get("communication"));
            }
            if (feedbackData.containsKey("confidence")) {
                feedback.setConfidence((Integer) feedbackData.get("confidence"));
            }
            if (feedbackData.containsKey("technical")) {
                feedback.setTechnical((Integer) feedbackData.get("technical"));
            }
            if (feedbackData.containsKey("softSkills")) {
                feedback.setSoftSkills((Integer) feedbackData.get("softSkills"));
            }
            if (feedbackData.containsKey("problemSolving")) {
                feedback.setProblemSolving((Integer) feedbackData.get("problemSolving"));
            }
            if (feedbackData.containsKey("analytics")) {
                feedback.setAnalytics((Integer) feedbackData.get("analytics"));
            }
            if (feedbackData.containsKey("overallComments")) {
                feedback.setOverallComments((String) feedbackData.get("overallComments"));
            }
            
            feedback.setUpdatedAt(LocalDateTime.now());
            
            InterviewFeedback updatedFeedback = feedbackRepository.save(feedback);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Feedback updated successfully");
            response.put("feedback", updatedFeedback);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error updating feedback {}: ", feedbackId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update feedback"));
        }
    }
    
    // Delete feedback (Admin only)
    @DeleteMapping("/{feedbackId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteFeedback(@PathVariable Long feedbackId) {
        try {
            if (!feedbackRepository.existsById(feedbackId)) {
                return ResponseEntity.notFound().build();
            }
            
            feedbackRepository.deleteById(feedbackId);
            
            return ResponseEntity.ok(Map.of("success", true, "message", "Feedback deleted successfully"));
            
        } catch (Exception e) {
            logger.error("Error deleting feedback {}: ", feedbackId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to delete feedback"));
        }
    }
    
    // Update candidate status based on interview feedback (Recruiters only)
    @PostMapping("/candidate-selection")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateCandidateStatus(@RequestBody Map<String, Object> selectionData) {
        try {
            logger.info("Updating candidate status: {}", selectionData);
            
            // Validate required fields
            if (!selectionData.containsKey("roomCode") || !selectionData.containsKey("candidateName") || !selectionData.containsKey("status")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Room code, candidate name, and status are required"));
            }
            
            String roomCode = (String) selectionData.get("roomCode");
            String candidateName = (String) selectionData.get("candidateName");
            String status = (String) selectionData.get("status"); // "selected" or "rejected"
            String recruiterEmail = (String) selectionData.get("recruiterEmail");
            
            // Handle jobId if provided
            Long jobId = null;
            Object jobIdObj = selectionData.get("jobId");
            if (jobIdObj != null) {
                if (jobIdObj instanceof Integer) {
                    jobId = ((Integer) jobIdObj).longValue();
                } else if (jobIdObj instanceof Long) {
                    jobId = (Long) jobIdObj;
                } else if (jobIdObj instanceof String) {
                    try {
                        jobId = Long.parseLong((String) jobIdObj);
                    } catch (NumberFormatException e) {
                        logger.warn("Invalid jobId format: {}", jobIdObj);
                    }
                }
            }
            
            // Find the interview feedback to get candidate email
            List<InterviewFeedback> feedbackList;
            if (jobId != null) {
                // Use job-specific lookup for better accuracy
                feedbackList = feedbackRepository.findByRoomCodeAndJobId(roomCode, jobId);
            } else {
                // Fallback to room code only
                feedbackList = feedbackRepository.findByRoomCode(roomCode);
            }
            
            InterviewFeedback feedback = feedbackList.stream()
                    .filter(f -> candidateName.equals(f.getCandidateName()))
                    .findFirst()
                    .orElse(null);
            
            if (feedback == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "No feedback found for this candidate and room code"));
            }
            
            // Try to find the candidate's application by name (this is a simplified approach)
            // In a real system, you'd want to store candidate email in feedback or have a better mapping
            String candidateEmail = findCandidateEmailByName(candidateName);
            
            if (candidateEmail != null) {
                // Find and update the candidate's applications
                List<Application> applications = applicationRepository.findByEmailLowerOrderByCreatedAtDesc(candidateEmail.toLowerCase());
                
                int updatedCount = 0;
                Application decisionApplication = null;
                for (Application app : applications) {
                    // If jobId is provided, only update applications for that specific job
                    boolean isCorrectJob = (jobId == null) || (app.getJob() != null && jobId.equals(app.getJob().getId()));
                    
                    // Update applications that are currently shortlisted or in interview process
                    if (isCorrectJob && ("shortlisted".equals(app.getStatus()) || 
                        "interview_scheduled".equals(app.getStatus()) || 
                        "interview_completed".equals(app.getStatus()))) {
                        
                        String newStatus = "selected".equals(status) ? "selected" : "rejected";
                        app.setStatus(newStatus);
                        applicationRepository.save(app);
                        if (decisionApplication == null) {
                            decisionApplication = app;
                        }
                        updatedCount++;
                        
                        logger.info("Updated application status for {} to {} (Job: {} - ID: {})", 
                                candidateEmail, newStatus, 
                                app.getJob() != null ? app.getJob().getTitle() : "Unknown",
                                app.getJob() != null ? app.getJob().getId() : "Unknown");
                    }
                }
                
                // Update the feedback with selection status
                feedback.setSelectionStatus(status);
                feedback.setUpdatedAt(LocalDateTime.now());
                feedbackRepository.save(feedback);

                if (decisionApplication != null) {
                    try {
                        if ("selected".equals(status)) {
                            emailService.sendFinalSelectionEmail(
                                    candidateEmail,
                                    candidateName,
                                    decisionApplication.getJob() != null ? decisionApplication.getJob().getTitle() : "your application"
                            );
                        } else {
                            emailService.sendFinalRejectionEmail(
                                    candidateEmail,
                                    candidateName,
                                    decisionApplication.getJob() != null ? decisionApplication.getJob().getTitle() : "your application"
                            );
                        }
                    } catch (Exception emailException) {
                        logger.warn("Candidate status updated but final decision email failed for {}", candidateEmail, emailException);
                    }
                }
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", String.format("Candidate %s has been %s successfully", candidateName, status));
                response.put("candidateName", candidateName);
                response.put("status", status);
                response.put("updatedApplications", updatedCount);
                
                return ResponseEntity.ok(response);
                
            } else {
                // If we can't find the candidate email, still update the feedback
                feedback.setSelectionStatus(status);
                feedback.setUpdatedAt(LocalDateTime.now());
                feedbackRepository.save(feedback);
                
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", String.format("Selection status updated for %s, but no applications found to update", candidateName));
                response.put("candidateName", candidateName);
                response.put("status", status);
                response.put("updatedApplications", 0);
                
                return ResponseEntity.ok(response);
            }
            
        } catch (Exception e) {
            logger.error("Error updating candidate status: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update candidate status: " + e.getMessage()));
        }
    }
    
    // Get feedback by job ID (Recruiters only)
    @GetMapping("/job/{jobId}")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> getFeedbackByJobId(@PathVariable Long jobId) {
        try {
            List<InterviewFeedback> feedbackList = feedbackRepository.findByJobIdOrderBySubmittedAtDesc(jobId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("feedback", feedbackList);
            response.put("count", feedbackList.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching feedback for job {}: ", jobId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch feedback"));
        }
    }
    
    // Get feedback by job ID and candidate name (Recruiters only)
    @GetMapping("/job/{jobId}/candidate/{candidateName}")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> getFeedbackByJobIdAndCandidate(@PathVariable Long jobId, @PathVariable String candidateName) {
        try {
            List<InterviewFeedback> feedbackList = feedbackRepository.findByJobIdAndCandidateName(jobId, candidateName);
            Double averageScore = feedbackRepository.getAverageScoreForCandidateInJob(candidateName, jobId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("feedback", feedbackList);
            response.put("count", feedbackList.size());
            response.put("averageScore", averageScore != null ? averageScore : 0.0);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching feedback for job {} and candidate {}: ", jobId, candidateName, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch feedback"));
        }
    }
    
    // Get feedback by room code and job ID (Recruiters only)
    @GetMapping("/room/{roomCode}/job/{jobId}")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> getFeedbackByRoomCodeAndJobId(@PathVariable String roomCode, @PathVariable Long jobId) {
        try {
            List<InterviewFeedback> feedbackList = feedbackRepository.findByRoomCodeAndJobId(roomCode, jobId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("feedback", feedbackList);
            response.put("count", feedbackList.size());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching feedback for room {} and job {}: ", roomCode, jobId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch feedback"));
        }
    }

    // Helper method to find candidate email by name (improved approach)
    private String findCandidateEmailByName(String candidateName) {
        try {
            if (candidateName == null || candidateName.trim().isEmpty()) {
                return null;
            }
            
            // Try to find applications where the candidate name matches
            List<Application> allApplications = applicationRepository.findAll();
            
            for (Application app : allApplications) {
                if (app.getName() != null && app.getEmail() != null) {
                    // Case-insensitive name matching
                    String appName = app.getName().trim().toLowerCase();
                    String searchName = candidateName.trim().toLowerCase();
                    
                    // Exact match
                    if (appName.equals(searchName)) {
                        return app.getEmail();
                    }
                    
                    // Partial match (first name or last name)
                    String[] appNameParts = appName.split("\\s+");
                    String[] searchNameParts = searchName.split("\\s+");
                    
                    for (String appPart : appNameParts) {
                        for (String searchPart : searchNameParts) {
                            if (appPart.equals(searchPart) && appPart.length() > 2) {
                                return app.getEmail();
                            }
                        }
                    }
                }
            }
            
            logger.warn("No candidate found with name: {}", candidateName);
            return null;
        } catch (Exception e) {
            logger.error("Error finding candidate email for name {}: ", candidateName, e);
            return null;
        }
    }
}
