package com.SmartHireX.controller;

import com.SmartHireX.dto.CreateInterviewRoundRequest;
import com.SmartHireX.dto.InterviewRoundResponse;
import com.SmartHireX.model.InterviewRound;
import com.SmartHireX.service.InterviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/interviews")
@RequiredArgsConstructor
@Slf4j
public class InterviewController {
    
    private final InterviewService interviewService;
    
    /**
     * Create a new interview round
     * Only recruiters and admins can create interviews
     */
    @PostMapping("/create")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> createInterviewRound(@Valid @RequestBody CreateInterviewRoundRequest request) {
        try {
            log.info("Creating interview round: {} by recruiter: {}", request.getTitle(), request.getRecruiterEmail());
            InterviewRoundResponse response = interviewService.createInterviewRound(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to create interview round: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get all interviews for a recruiter
     */
    @GetMapping("/recruiter/{recruiterEmail}")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<List<InterviewRoundResponse>> getInterviewsByRecruiter(
            @PathVariable("recruiterEmail") String recruiterEmail) {
        List<InterviewRoundResponse> interviews = interviewService.getInterviewsByRecruiter(recruiterEmail);
        return ResponseEntity.ok(interviews);
    }
    
    /**
     * Get upcoming interviews for a recruiter
     */
    @GetMapping("/recruiter/{recruiterEmail}/upcoming")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<List<InterviewRoundResponse>> getUpcomingInterviewsByRecruiter(
            @PathVariable("recruiterEmail") String recruiterEmail) {
        List<InterviewRoundResponse> interviews = interviewService.getUpcomingInterviewsByRecruiter(recruiterEmail);
        return ResponseEntity.ok(interviews);
    }
    
    /**
     * Get today's interviews for a recruiter
     */
    @GetMapping("/recruiter/{recruiterEmail}/today")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<List<InterviewRoundResponse>> getTodaysInterviewsByRecruiter(
            @PathVariable("recruiterEmail") String recruiterEmail) {
        List<InterviewRoundResponse> interviews = interviewService.getTodaysInterviewsByRecruiter(recruiterEmail);
        return ResponseEntity.ok(interviews);
    }
    
    /**
     * Get interview details by room code
     * Used when someone joins a video call room
     */
    @GetMapping("/room/{roomCode}")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> getInterviewByRoomCode(@PathVariable("roomCode") String roomCode) {
        return interviewService.getInterviewByRoomCode(roomCode)
            .map(interview -> ResponseEntity.ok(interview))
            .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * Update interview status
     */
    @PutMapping("/{interviewId}/status")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateInterviewStatus(
            @PathVariable("interviewId") Long interviewId,
            @RequestBody Map<String, String> request) {
        try {
            String statusStr = request.get("status");
            InterviewRound.InterviewStatus status = InterviewRound.InterviewStatus.valueOf(statusStr);
            
            InterviewRoundResponse response = interviewService.updateInterviewStatus(interviewId, status);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("Failed to update interview status: {}", e.getMessage());
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    /**
     * Get available interview types for interview rounds
     */
    @GetMapping("/interview-types")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> getInterviewTypes() {
        Map<String, String> interviewTypes = Map.of(
            "TECHNICAL_INTERVIEW", "Technical Interview",
            "HR_INTERVIEW", "HR Interview"
        );
        return ResponseEntity.ok(interviewTypes);
    }
    
    /**
     * Get interview rounds for a specific candidate and job
     * Candidates can see their scheduled interviews
     */
    @GetMapping("/candidate/{candidateEmail}/job/{jobId}")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<List<InterviewRoundResponse>> getInterviewsForCandidateAndJob(
            @PathVariable("candidateEmail") String candidateEmail,
            @PathVariable("jobId") Long jobId) {
        try {
            List<InterviewRoundResponse> interviews = interviewService.getInterviewsForCandidateAndJob(candidateEmail, jobId);
            return ResponseEntity.ok(interviews);
        } catch (Exception e) {
            log.error("Failed to get interviews for candidate {} and job {}: {}", candidateEmail, jobId, e.getMessage());
            return ResponseEntity.ok(List.of()); // Return empty list instead of error
        }
    }
    
    /**
     * Get interview rounds created by a specific recruiter for a job
     * Recruiters can see their created interviews
     */
    @GetMapping("/recruiter/{recruiterEmail}/job/{jobId}")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<List<InterviewRoundResponse>> getInterviewsForRecruiterAndJob(
            @PathVariable("recruiterEmail") String recruiterEmail,
            @PathVariable("jobId") Long jobId) {
        try {
            List<InterviewRoundResponse> interviews = interviewService.getInterviewsForRecruiterAndJob(recruiterEmail, jobId);
            return ResponseEntity.ok(interviews);
        } catch (Exception e) {
            log.error("Failed to get interviews for recruiter {} and job {}: {}", recruiterEmail, jobId, e.getMessage());
            return ResponseEntity.ok(List.of()); // Return empty list instead of error
        }
    }
    
    /**
     * Mark interview as completed
     * Only recruiters who created the interview or admins can mark as completed
     */
    @PutMapping("/{interviewId}/complete")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> markInterviewAsCompleted(@PathVariable("interviewId") Long interviewId) {
        try {
            boolean completed = interviewService.markInterviewAsCompleted(interviewId);
            if (completed) {
                return ResponseEntity.ok(Map.of("message", "Interview marked as completed successfully"));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Failed to mark interview {} as completed: {}", interviewId, e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Failed to mark interview as completed"));
        }
    }
    
    /**
     * Delete an interview round
     * Only recruiters who created the interview or admins can delete
     */
    @DeleteMapping("/{interviewId}")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> deleteInterviewRound(@PathVariable("interviewId") Long interviewId) {
        try {
            boolean deleted = interviewService.deleteInterviewRound(interviewId);
            if (deleted) {
                return ResponseEntity.ok(Map.of("message", "Interview round deleted successfully"));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            log.error("Failed to delete interview round {}: {}", interviewId, e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Failed to delete interview round"));
        }
    }
}
