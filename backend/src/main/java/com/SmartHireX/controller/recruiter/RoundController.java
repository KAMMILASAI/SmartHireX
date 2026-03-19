package com.SmartHireX.controller.recruiter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.dto.request.RoundRequest;
import com.SmartHireX.dto.response.RoundResponse;
import com.SmartHireX.entity.MixedRoundComponent;
import com.SmartHireX.entity.Round;
import com.SmartHireX.model.JobPosting;
import com.SmartHireX.repository.JobRepository;
import com.SmartHireX.service.MixedRoundService;
import com.SmartHireX.service.RoundService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/recruiter/rounds")
@PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
public class RoundController {
    
    private static final Logger logger = LoggerFactory.getLogger(RoundController.class);
    
    @Autowired
    private RoundService roundService;
    
    @Autowired
    private MixedRoundService mixedRoundService;
    
    @Autowired
    private JobRepository jobRepository;
    
    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<?> getJobById(@PathVariable("jobId") Long jobId) {
        try {
            JobPosting job = jobRepository.findById(jobId)
                    .orElseThrow(() -> new RuntimeException("Job not found with id: " + jobId));
            return ResponseEntity.ok(job);
        } catch (Exception e) {
            logger.error("Error fetching job {}: {}", jobId, e.getMessage());
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("message", "Failed to fetch job: " + e.getMessage())
            );
        }
    }
    
    @GetMapping("/jobs/{jobId}/rounds")
    public ResponseEntity<?> getRoundsByJobId(@PathVariable("jobId") Long jobId) {
        try {
            List<RoundResponse> rounds = roundService.getRoundsByJobId(jobId);
            return ResponseEntity.ok(rounds);
        } catch (Exception e) {
            logger.error("Error fetching rounds for job {}: {}", jobId, e.getMessage());
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("message", "Failed to fetch rounds: " + e.getMessage())
            );
        }
    }
    
    @PostMapping("/jobs/{jobId}/rounds")
    public ResponseEntity<?> createRound(@PathVariable("jobId") Long jobId, @Valid @RequestBody RoundRequest request) {
        try {
            RoundResponse round = roundService.createRound(jobId, request);
            
            // If this is a mixed round (MCQS_CODING), automatically create mixed round components
            if (request.getType() == Round.RoundType.MCQS_CODING) {
                List<MixedRoundComponent> components = new ArrayList<>();
                
                // Create MCQ component
                MixedRoundComponent mcqComponent = new MixedRoundComponent();
                mcqComponent.setRoundId(round.getId());
                mcqComponent.setComponentType(MixedRoundComponent.ComponentType.MCQ);
                mcqComponent.setComponentWeight(new BigDecimal("70.00")); // Default 70% weight
                // Use the actual MCQ questions count from the request, fallback to 10
                int mcqCount = request.getMcqQuestions() != null ? request.getMcqQuestions().intValue() : 10;
                mcqComponent.setMcqCount(mcqCount);
                logger.info("Setting MCQ count to: {}", mcqCount);
                mcqComponent.setTimeLimitMinutes(30); // Default 30 minutes for MCQ
                components.add(mcqComponent);
                
                // Create Coding component
                MixedRoundComponent codingComponent = new MixedRoundComponent();
                codingComponent.setRoundId(round.getId());
                codingComponent.setComponentType(MixedRoundComponent.ComponentType.CODING);
                codingComponent.setComponentWeight(new BigDecimal("30.00")); // Default 30% weight
                int codingCount = request.getCodingQuestions() != null ? request.getCodingQuestions().intValue() : 2;
                codingComponent.setCodingCount(codingCount);
                codingComponent.setTimeLimitMinutes(60); // Default 60 minutes for Coding
                components.add(codingComponent);
                
                // Save the mixed round components
                mixedRoundService.createMixedRound(round.getId(), components);
                
                logger.info("Created mixed round components for round {}", round.getId());
            }
            
            return ResponseEntity.ok(round);
        } catch (Exception e) {
            logger.error("Error creating round for job {}: {}", jobId, e.getMessage());
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("message", "Failed to create round: " + e.getMessage())
            );
        }
    }
    
    @GetMapping("/rounds/{roundId}")
    public ResponseEntity<?> getRoundById(@PathVariable("roundId") Long roundId) {
        try {
            RoundResponse round = roundService.getRoundById(roundId);
            return ResponseEntity.ok(round);
        } catch (Exception e) {
            logger.error("Error fetching round {}: {}", roundId, e.getMessage());
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("message", "Failed to fetch round: " + e.getMessage())
            );
        }
    }
    
    @PutMapping("/rounds/{roundId}")
    public ResponseEntity<?> updateRound(@PathVariable("roundId") Long roundId, @Valid @RequestBody RoundRequest request) {
        try {
            RoundResponse round = roundService.updateRound(roundId, request);
            return ResponseEntity.ok(round);
        } catch (Exception e) {
            logger.error("Error updating round {}: {}", roundId, e.getMessage());
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("message", "Failed to update round: " + e.getMessage())
            );
        }
    }

    @GetMapping("/rounds/{roundId}/shortlist")
    public ResponseEntity<?> getRoundShortlist(@PathVariable("roundId") Long roundId) {
        try {
            return ResponseEntity.ok(roundService.getRoundShortlist(roundId));
        } catch (Exception e) {
            logger.error("Error fetching shortlist for round {}: {}", roundId, e.getMessage());
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("message", "Failed to fetch shortlist: " + e.getMessage())
            );
        }
    }
    
    @DeleteMapping("/rounds/{roundId}")
    public ResponseEntity<?> deleteRound(@PathVariable("roundId") Long roundId) {
        try {
            roundService.deleteRound(roundId);
            return ResponseEntity.ok(Collections.singletonMap("message", "Round deleted successfully"));
        } catch (Exception e) {
            logger.error("Error deleting round {}: {}", roundId, e.getMessage());
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("message", "Failed to delete round: " + e.getMessage())
            );
        }
    }
}
