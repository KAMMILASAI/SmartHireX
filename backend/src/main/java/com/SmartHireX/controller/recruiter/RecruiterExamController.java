package com.SmartHireX.controller.recruiter;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import com.SmartHireX.dto.CodingChallenge;
import com.SmartHireX.dto.McqQuestion;
import com.SmartHireX.entity.CandidateProfile;
import com.SmartHireX.entity.User;
import com.SmartHireX.repository.CandidateProfileRepository;
import com.SmartHireX.repository.UserRepository;
import com.SmartHireX.service.ExamResultService;
import com.SmartHireX.service.GeminiQuestionService;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.HashMap;

@RestController
@RequestMapping("/recruiter")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
public class RecruiterExamController {
    
    @Autowired
    private ExamResultService examResultService;
    
    @Autowired
    private GeminiQuestionService geminiQuestionService;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private CandidateProfileRepository candidateProfileRepository;
    
    /**
     * Generate AI MCQ questions - FULLY DYNAMIC
     */
    @PostMapping({"/exams/rounds/{roundId}/generate-questions"})
    public ResponseEntity<?> generateAiQuestions(
            @PathVariable("roundId") Long roundId,
            @RequestBody Map<String, Object> requestBody,
            Authentication authentication) {
        
        try {
            @SuppressWarnings("unchecked")
            List<String> techConcepts = (List<String>) requestBody.get("techConcepts");
            String difficulty = (String) requestBody.get("difficulty");
            Integer numQuestions = (Integer) requestBody.get("numQuestions");
            
            if (techConcepts == null || techConcepts.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Tech concepts are required"));
            }
            
            String userEmail = authentication.getName();
            User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            CandidateProfile profile = candidateProfileRepository.findByUser(user).orElse(null);
            
            List<McqQuestion> aiQuestions = geminiQuestionService.generateMcqs(
                user, profile, techConcepts, difficulty != null ? difficulty : "medium", 
                numQuestions != null ? numQuestions : 5
            );
            
            List<Map<String, Object>> questions = new ArrayList<>();
            for (McqQuestion q : aiQuestions) {
                Map<String, Object> questionMap = new HashMap<>();
                questionMap.put("id", "ai-" + System.currentTimeMillis() + "-" + questions.size());
                questionMap.put("question", q.getQuestion());
                questionMap.put("options", q.getOptions() != null ? q.getOptions() : List.of("Option A", "Option B", "Option C", "Option D"));
                
                // Find correct answer index from the answer string
                int correctAnswerIndex = 0;
                if (q.getAnswer() != null && q.getOptions() != null) {
                    for (int i = 0; i < q.getOptions().size(); i++) {
                        if (q.getOptions().get(i).equals(q.getAnswer())) {
                            correctAnswerIndex = i;
                            break;
                        }
                    }
                }
                
                questionMap.put("correctAnswer", correctAnswerIndex);
                questionMap.put("difficulty", difficulty != null ? difficulty : "medium");
                questionMap.put("concept", q.getTechnology() != null ? q.getTechnology() : 
                    (techConcepts.isEmpty() ? "General" : techConcepts.get(0)));
                questionMap.put("isAiGenerated", true);
                questions.add(questionMap);
            }
            
            return ResponseEntity.ok(Map.of("questions", questions, "count", questions.size()));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "AI service temporarily unavailable. Please try again later."));
        }
    }
    
    /**
     * Generate AI coding problems - FULLY DYNAMIC
     */
    @PostMapping({"/exams/rounds/{roundId}/generate-coding-problems"})
    public ResponseEntity<?> generateAiCodingProblems(
            @PathVariable("roundId") Long roundId,
            @RequestBody Map<String, Object> requestBody,
            Authentication authentication) {
        
        try {
            @SuppressWarnings("unchecked")
            List<String> topics = (List<String>) requestBody.get("topics");
            String difficulty = (String) requestBody.get("difficulty");
            Integer numProblems = (Integer) requestBody.get("numProblems");
            
            if (topics == null || topics.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "Programming topics are required"));
            }
            
            String userEmail = authentication.getName();
            User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            CandidateProfile profile = candidateProfileRepository.findByUser(user).orElse(null);
            
            List<Map<String, Object>> aiProblems = new ArrayList<>();
            
            for (String topic : topics) {
                if (aiProblems.size() >= (numProblems != null ? numProblems : 2)) break;
                
                CodingChallenge challenge = geminiQuestionService.generateCoding(
                    user, profile, topic, difficulty != null ? difficulty : "medium", 3
                );
                
                if (challenge != null) {
                    Map<String, Object> problem = convertCodingChallengeToMap(challenge, topic, difficulty);
                    aiProblems.add(problem);
                }
            }
            
            return ResponseEntity.ok(Map.of("problems", aiProblems, "count", aiProblems.size()));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "AI service temporarily unavailable. Please try again later."));
        }
    }
    
    private Map<String, Object> convertCodingChallengeToMap(CodingChallenge challenge, String topic, String difficulty) {
        Map<String, Object> problem = new HashMap<>();
        
        problem.put("id", "ai-coding-" + System.currentTimeMillis() + "-" + Math.random());
        problem.put("title", challenge.getTitle() != null ? challenge.getTitle() : "Coding Challenge");
        problem.put("problemStatement", challenge.getDescription() != null ? challenge.getDescription() : "");
        
        // Generate input/output format from examples
        String inputFormat = "Input format will be provided";
        String outputFormat = "Output format will be provided";
        if (challenge.getExamples() != null && !challenge.getExamples().isEmpty()) {
            Map<String, String> firstExample = challenge.getExamples().get(0);
            inputFormat = "Input: " + firstExample.getOrDefault("input", "");
            outputFormat = "Output: " + firstExample.getOrDefault("output", "");
        }
        
        problem.put("inputFormat", inputFormat);
        problem.put("outputFormat", outputFormat);
        
        // Convert constraints list to string
        String constraintsStr = "";
        if (challenge.getConstraints() != null && !challenge.getConstraints().isEmpty()) {
            constraintsStr = String.join("\n", challenge.getConstraints());
        }
        problem.put("constraints", constraintsStr);
        
        problem.put("difficulty", difficulty != null ? difficulty.toUpperCase() : "MEDIUM");
        problem.put("timeLimit", difficulty != null && difficulty.equals("easy") ? 1000 : 
                                 difficulty != null && difficulty.equals("hard") ? 3000 : 2000);
        problem.put("memoryLimit", 256);
        problem.put("allowedLanguages", "java,python,cpp,javascript");
        
        // Create explanation from hints and complexity info
        String explanation = "";
        if (challenge.getHints() != null && !challenge.getHints().isEmpty()) {
            explanation = "Hints: " + String.join(", ", challenge.getHints());
        }
        if (challenge.getTimeComplexity() != null) {
            explanation += (explanation.isEmpty() ? "" : "\n") + "Time Complexity: " + challenge.getTimeComplexity();
        }
        if (challenge.getSpaceComplexity() != null) {
            explanation += (explanation.isEmpty() ? "" : "\n") + "Space Complexity: " + challenge.getSpaceComplexity();
        }
        problem.put("explanation", explanation);
        
        // Convert examples to test cases
        List<Map<String, Object>> testCases = new ArrayList<>();
        if (challenge.getExamples() != null && !challenge.getExamples().isEmpty()) {
            for (int i = 0; i < challenge.getExamples().size(); i++) {
                Map<String, String> example = challenge.getExamples().get(i);
                Map<String, Object> testCaseMap = new HashMap<>();
                testCaseMap.put("input", example.getOrDefault("input", ""));
                testCaseMap.put("expectedOutput", example.getOrDefault("output", ""));
                testCaseMap.put("isSample", i == 0); // First test case is sample
                testCaseMap.put("isHidden", i > 0); // Rest are hidden
                testCaseMap.put("explanation", "Test case " + (i + 1));
                testCaseMap.put("order", i);
                testCases.add(testCaseMap);
            }
        } else {
            // Create a default test case if none provided
            Map<String, Object> defaultTestCase = new HashMap<>();
            defaultTestCase.put("input", "Sample input");
            defaultTestCase.put("expectedOutput", "Sample output");
            defaultTestCase.put("isSample", true);
            defaultTestCase.put("isHidden", false);
            defaultTestCase.put("explanation", "Sample test case");
            defaultTestCase.put("order", 0);
            testCases.add(defaultTestCase);
        }
        
        problem.put("testCases", testCases);
        
        return problem;
    }
}