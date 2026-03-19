package com.SmartHireX.controller.recruiter;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.SmartHireX.dto.CodingProblemDTO;
import com.SmartHireX.dto.request.CodingProblemRequest;
import com.SmartHireX.dto.request.TestCaseRequest;
import com.SmartHireX.entity.CodingProblem;
import com.SmartHireX.service.CodingProblemService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/recruiter/coding-problems")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
public class CodingProblemController {
    
    @Autowired
    private CodingProblemService codingProblemService;
    
    /**
     * Create a new coding problem
     */
    @PostMapping
    public ResponseEntity<?> createCodingProblem(
            @Valid @RequestBody CodingProblemRequest request,
            Authentication authentication) {
        
        try {
            String createdBy = authentication.getName();
            CodingProblemDTO codingProblem = codingProblemService.createCodingProblem(request, createdBy);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Coding problem created successfully",
                "codingProblem", codingProblem
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to create coding problem: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Create a coding problem for a specific round (used by AI generation)
     */
    @PostMapping("/rounds/{roundId}")
    public ResponseEntity<?> createCodingProblemForRound(
            @PathVariable(name = "roundId") Long roundId,
            @RequestBody Map<String, Object> problemData,
            Authentication authentication) {
        
        try {
            String createdBy = authentication.getName();
            
            System.out.println("=== Creating coding problem for round: " + roundId);
            System.out.println("Problem data received: " + problemData);
            
            // Convert the AI-generated problem data to CodingProblemRequest
            CodingProblemRequest request = new CodingProblemRequest();
            request.setRoundId(roundId);
            request.setTitle((String) problemData.get("title"));
            request.setProblemStatement((String) problemData.get("problemStatement"));
            request.setExplanation((String) problemData.get("explanation"));
            request.setInputFormat((String) problemData.get("inputFormat"));
            request.setOutputFormat((String) problemData.get("outputFormat"));
            request.setConstraints((String) problemData.get("constraints"));
            // Convert string difficulty to enum
            String difficultyStr = (String) problemData.get("difficulty");
            if (difficultyStr != null) {
                try {
                    request.setDifficulty(CodingProblem.Difficulty.valueOf(difficultyStr.toUpperCase()));
                } catch (IllegalArgumentException e) {
                    request.setDifficulty(CodingProblem.Difficulty.MEDIUM); // Default fallback
                }
            }
            request.setTimeLimit((Integer) problemData.get("timeLimit"));
            request.setMemoryLimit((Integer) problemData.get("memoryLimit"));
            request.setAllowedLanguages((String) problemData.get("allowedLanguages"));
            
            // Handle test cases
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> testCasesData = (List<Map<String, Object>>) problemData.get("testCases");
            System.out.println("Test cases data: " + testCasesData);
            
            if (testCasesData != null && !testCasesData.isEmpty()) {
                List<TestCaseRequest> testCaseRequests = new ArrayList<>();
                for (Map<String, Object> tcData : testCasesData) {
                    TestCaseRequest tcRequest = new TestCaseRequest();
                    tcRequest.setInput((String) tcData.get("input"));
                    tcRequest.setExpectedOutput((String) tcData.get("expectedOutput"));
                    tcRequest.setIsSample((Boolean) tcData.getOrDefault("isSample", false));
                    tcRequest.setIsHidden((Boolean) tcData.getOrDefault("isHidden", false));
                    tcRequest.setExplanation((String) tcData.get("explanation"));
                    tcRequest.setOrder((Integer) tcData.getOrDefault("order", 0));
                    testCaseRequests.add(tcRequest);
                }
                request.setTestCases(testCaseRequests);
                System.out.println("Created " + testCaseRequests.size() + " test case requests");
            } else {
                System.out.println("No test cases provided - setting to null");
                request.setTestCases(null);
            }
            
            CodingProblemDTO codingProblem = codingProblemService.createCodingProblem(request, createdBy);
            
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "message", "Coding problem created successfully for round",
                "codingProblem", codingProblem
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to create coding problem for round: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Get all coding problems for a round
     */
    @GetMapping("/round/{roundId}")
    public ResponseEntity<?> getCodingProblemsByRound(@PathVariable(name = "roundId") Long roundId) {
        
        try {
            List<CodingProblemDTO> codingProblems = codingProblemService.getCodingProblemsByRoundId(roundId);
            
            return ResponseEntity.ok(Map.of(
                "codingProblems", codingProblems,
                "count", codingProblems.size()
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to fetch coding problems: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Get a specific coding problem by ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getCodingProblemById(@PathVariable(name = "id") Long id) {
        
        try {
            CodingProblemDTO codingProblem = codingProblemService.getCodingProblemById(id);
            
            return ResponseEntity.ok(codingProblem);
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to fetch coding problem: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Update a coding problem
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateCodingProblem(
            @PathVariable(name = "id") Long id,
            @Valid @RequestBody CodingProblemRequest request,
            Authentication authentication) {
        
        try {
            String updatedBy = authentication.getName();
            CodingProblemDTO codingProblem = codingProblemService.updateCodingProblem(id, request, updatedBy);
            
            return ResponseEntity.ok(Map.of(
                "message", "Coding problem updated successfully",
                "codingProblem", codingProblem
            ));
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to update coding problem: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Delete a coding problem
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteCodingProblem(@PathVariable(name = "id") Long id) {
        
        try {
            codingProblemService.deleteCodingProblem(id);
            
            return ResponseEntity.ok(Map.of(
                "message", "Coding problem deleted successfully"
            ));
            
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(
                "error", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to delete coding problem: " + e.getMessage()
            ));
        }
    }
    
    /**
     * Check if coding problems exist for a round
     */
    @GetMapping("/round/{roundId}/exists")
    public ResponseEntity<?> checkCodingProblemsExist(@PathVariable(name = "roundId") Long roundId) {
        
        try {
            boolean exists = codingProblemService.existsByRoundId(roundId);
            
            return ResponseEntity.ok(Map.of(
                "exists", exists,
                "roundId", roundId
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "error", "Failed to check coding problems: " + e.getMessage()
            ));
        }
    }
}
