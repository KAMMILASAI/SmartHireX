package com.SmartHireX.controller.recruiter;

import java.math.BigDecimal;
import java.util.ArrayList;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.entity.MixedRoundComponent;
import com.SmartHireX.service.MixedRoundService;

@RestController
@RequestMapping("/recruiter/mixed-rounds")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
public class MixedRoundController {

    private static final Logger logger = LoggerFactory.getLogger(MixedRoundController.class);
    
    @Autowired
    private MixedRoundService mixedRoundService;
    
    /**
     * Create mixed round configuration
     */
    @PostMapping("/{roundId}/configure")
    public ResponseEntity<?> configureMixedRound(
            @PathVariable Long roundId,
            @RequestBody Map<String, Object> configData,
            Authentication authentication) {
        
        try {
            String recruiterEmail = authentication.getName();
            logger.info("Configuring mixed round {} by recruiter {}", roundId, recruiterEmail);
            
            List<MixedRoundComponent> components = new ArrayList<>();
            
            // Parse MCQ component
            if (configData.containsKey("mcqComponent")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> mcqData = (Map<String, Object>) configData.get("mcqComponent");
                
                MixedRoundComponent mcqComponent = new MixedRoundComponent();
                mcqComponent.setRoundId(roundId);
                mcqComponent.setComponentType(MixedRoundComponent.ComponentType.MCQ);
                mcqComponent.setComponentWeight(new BigDecimal(mcqData.get("weight").toString()));
                mcqComponent.setMcqCount(Integer.valueOf(mcqData.get("questionCount").toString()));
                mcqComponent.setTimeLimitMinutes(Integer.valueOf(mcqData.get("timeLimit").toString()));
                
                components.add(mcqComponent);
            }
            
            // Parse Coding component
            if (configData.containsKey("codingComponent")) {
                @SuppressWarnings("unchecked")
                Map<String, Object> codingData = (Map<String, Object>) configData.get("codingComponent");
                
                MixedRoundComponent codingComponent = new MixedRoundComponent();
                codingComponent.setRoundId(roundId);
                codingComponent.setComponentType(MixedRoundComponent.ComponentType.CODING);
                codingComponent.setComponentWeight(new BigDecimal(codingData.get("weight").toString()));
                codingComponent.setCodingCount(Integer.valueOf(codingData.get("problemCount").toString()));
                codingComponent.setTimeLimitMinutes(Integer.valueOf(codingData.get("timeLimit").toString()));
                
                components.add(codingComponent);
            }
            
            List<MixedRoundComponent> savedComponents = mixedRoundService.createMixedRound(roundId, components);
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Mixed round configured successfully",
                "components", savedComponents
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to configure mixed round: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Get mixed round configuration
     */
    @GetMapping("/{roundId}/configuration")
    public ResponseEntity<?> getMixedRoundConfiguration(
            @PathVariable Long roundId,
            Authentication authentication) {
        
        try {
            String recruiterEmail = authentication.getName();
            logger.debug("Fetching mixed round configuration for round {} by recruiter {}", roundId, recruiterEmail);
            
            List<MixedRoundComponent> components = mixedRoundService.getMixedRoundComponents(roundId);
            boolean isMixed = mixedRoundService.isMixedRound(roundId);
            
            return ResponseEntity.ok(Map.of(
                "isMixed", isMixed,
                "components", components
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to fetch mixed round configuration: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Get mixed exam results
     */
    @GetMapping("/{roundId}/results")
    public ResponseEntity<?> getMixedExamResults(
            @PathVariable Long roundId,
            Authentication authentication) {
        
        try {
            String recruiterEmail = authentication.getName();
            logger.debug("Fetching mixed exam results for round {} by recruiter {}", roundId, recruiterEmail);
            
            List<Map<String, Object>> results = mixedRoundService.getMixedExamResults(roundId);
            
            return ResponseEntity.ok(results);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to fetch mixed exam results: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Get mixed exam statistics
     */
    @GetMapping("/{roundId}/statistics")
    public ResponseEntity<?> getMixedExamStatistics(
            @PathVariable Long roundId,
            Authentication authentication) {
        
        try {
            String recruiterEmail = authentication.getName();
            logger.debug("Fetching mixed exam statistics for round {} by recruiter {}", roundId, recruiterEmail);
            
            Map<String, Object> statistics = mixedRoundService.getMixedExamStatistics(roundId);
            
            logger.debug("Mixed exam statistics fetched for round {} with {} entries", roundId, statistics.size());
            return ResponseEntity.ok(statistics);
            
        } catch (Exception e) {
            logger.error("Error while fetching mixed exam statistics for round {}", roundId, e);
            
            // Return empty statistics instead of error to prevent frontend crash
            Map<String, Object> emptyStats = new HashMap<>();
            emptyStats.put("totalCandidates", 0);
            emptyStats.put("averageScore", 0.0);
            emptyStats.put("highestScore", 0.0);
            emptyStats.put("lowestScore", 0.0);
            emptyStats.put("averageTime", 0);
            emptyStats.put("completedCount", 0);
            emptyStats.put("mcqStatistics", new HashMap<>());
            emptyStats.put("codingStatistics", new ArrayList<>());
            
            Map<String, Object> distribution = new HashMap<>();
            distribution.put("excellent", 0);
            distribution.put("good", 0);
            distribution.put("average", 0);
            distribution.put("poor", 0);
            emptyStats.put("scoreDistribution", distribution);
            
            return ResponseEntity.ok(emptyStats);
        }
    }
    
    /**
     * Clear mixed exam results for a round (for testing purposes)
     */
    @DeleteMapping("/{roundId}/results")
    public ResponseEntity<?> clearMixedExamResults(
            @PathVariable Long roundId,
            Authentication authentication) {
        
        try {
            String recruiterEmail = authentication.getName();
            logger.info("Clearing mixed exam results for round {} by recruiter {}", roundId, recruiterEmail);
            
            mixedRoundService.clearMixedExamResults(roundId);
            
            return ResponseEntity.ok(Map.of(
                "message", "Mixed exam results cleared successfully",
                "roundId", roundId
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to clear mixed exam results: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Clear mixed exam result for specific candidate
     */
    @DeleteMapping("/{roundId}/results/{candidateEmail}")
    public ResponseEntity<?> clearCandidateMixedExamResult(
            @PathVariable Long roundId,
            @PathVariable String candidateEmail,
            Authentication authentication) {
        
        try {
            String recruiterEmail = authentication.getName();
            logger.info("Clearing mixed exam result for candidate {} in round {} by recruiter {}", candidateEmail, roundId, recruiterEmail);
            
            mixedRoundService.clearCandidateMixedExamResult(roundId, candidateEmail);
            
            return ResponseEntity.ok(Map.of(
                "message", "Candidate mixed exam result cleared successfully",
                "roundId", roundId,
                "candidateEmail", candidateEmail
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to clear candidate mixed exam result: " + e.getMessage()
            ));
        }
    }
}
