package com.SmartHireX.controller.candidate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.dto.CodingChallenge;
import com.SmartHireX.dto.McqQuestion;
import com.SmartHireX.entity.CandidateProfile;
import com.SmartHireX.entity.PracticeSession;
import com.SmartHireX.entity.User;
import com.SmartHireX.repository.CandidateProfileRepository;
import com.SmartHireX.repository.UserRepository;
import com.SmartHireX.service.GeminiQuestionService;
import com.SmartHireX.service.PracticeSessionService;

import jakarta.persistence.EntityNotFoundException;

@RestController
@RequestMapping("/candidate/practice")
@CrossOrigin(origins = "*")
public class CandidateAIPracticeController {

    @Autowired
    private GeminiQuestionService geminiQuestionService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CandidateProfileRepository candidateProfileRepository;

    @Autowired
    private PracticeSessionService practiceSessionService;

    /**
     * Generate AI-powered MCQ questions for practice
     */
    @PostMapping("/ai-mcqs")
    public ResponseEntity<?> generateAIMCQs(
            @RequestBody Map<String, Object> requestBody,
            Authentication authentication) {

        try {
            System.out.println("=== AI MCQ PRACTICE REQUEST ===");
            System.out.println("Request Body: " + requestBody);
            System.out.println("User: " + authentication.getName());

            // Extract parameters from request
            String topic = (String) requestBody.get("topic");
            String difficulty = (String) requestBody.get("difficulty");
            Integer numQuestions = (Integer) requestBody.get("numQuestions");
            String constraints = (String) requestBody.get("constraints");

            // Validate parameters
            if (topic == null || topic.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Topic is required"));
            }

            if (difficulty == null || difficulty.trim().isEmpty()) {
                difficulty = "Medium";
            }

            if (numQuestions == null || numQuestions <= 0) {
                numQuestions = 5;
            }

            // Limit to reasonable number
            numQuestions = Math.min(numQuestions, 20);

            System.out.println("Topic: " + topic);
            System.out.println("Difficulty: " + difficulty);
            System.out.println("Num Questions: " + numQuestions);
            System.out.println("Constraints: " + constraints);

            // Get current user
            String userEmail = authentication.getName();
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get candidate profile
            CandidateProfile profile = candidateProfileRepository.findByUser(user).orElse(null);

                System.out.println("Attempting Gemini AI generation...");
                // Convert topic to list format expected by service
                List<String> techConcepts = List.of(topic.trim());
                List<McqQuestion> aiQuestions = geminiQuestionService.generateMcqs(
                    user, profile, techConcepts, difficulty.toLowerCase(), numQuestions);
                System.out.println("✅ SUCCESS: Generated " + aiQuestions.size() + " questions using Gemini AI");

            // Convert to frontend format
            List<Map<String, Object>> questions = new ArrayList<>();
            for (McqQuestion q : aiQuestions) {
                Map<String, Object> questionMap = new HashMap<>();
                questionMap.put("q", q.getQuestion()); // Use 'q' to match frontend format

                List<String> options = q.getOptions() != null ? q.getOptions()
                        : List.of("Option A", "Option B", "Option C", "Option D");
                questionMap.put("options", options);

                // Find correct answer
                String correctAnswer = q.getAnswer();
                if (correctAnswer == null && !options.isEmpty()) {
                    // Randomize correct answer position instead of always using first option
                    Random random = new Random();
                    int randomIndex = random.nextInt(options.size());
                    correctAnswer = options.get(randomIndex);
                }
                questionMap.put("answer", correctAnswer); // Use 'answer' to match frontend format

                // Add technology and explanation
                questionMap.put("technology", q.getTechnology());
                questionMap.put("explanation", generateExplanation(q.getQuestion(), correctAnswer, topic));

                questions.add(questionMap);
            }

            return ResponseEntity.ok(questions);

        } catch (Exception e) {
            System.err.println("Error generating AI MCQs: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate MCQs: " + e.getMessage()));
        }
    }

    /**
     * Generate AI-powered coding problems for practice
     */
    @PostMapping("/ai-coding")
    public ResponseEntity<?> generateAICoding(
            @RequestBody Map<String, Object> requestBody,
            Authentication authentication) {

        try {
            System.out.println("=== AI CODING PRACTICE REQUEST ===");
            System.out.println("Request Body: " + requestBody);
            System.out.println("User: " + authentication.getName());

            // Extract parameters from request
            String topic = (String) requestBody.get("topic");
            String difficulty = (String) requestBody.get("difficulty");
            Integer numProblems = (Integer) requestBody.get("numProblems");
            Integer testCases = (Integer) requestBody.get("testCases");
            String constraints = (String) requestBody.get("constraints");

            // Validate parameters
            if (topic == null || topic.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Topic is required"));
            }

            if (difficulty == null || difficulty.trim().isEmpty()) {
                difficulty = "Medium";
            }

            if (numProblems == null || numProblems <= 0) {
                numProblems = 1;
            }

            if (testCases == null || testCases <= 0) {
                testCases = 10; // Default to 10 test cases
            }

            // Limit to reasonable numbers
            numProblems = Math.min(numProblems, 5);
            testCases = Math.max(5, Math.min(20, testCases)); // Between 5-20 test cases

            System.out.println("Topic: " + topic);
            System.out.println("Difficulty: " + difficulty);
            System.out.println("Num Problems: " + numProblems);
            System.out.println("Test Cases: " + testCases);
            System.out.println("Constraints: " + constraints);

            // Get current user
            String userEmail = authentication.getName();
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get candidate profile
            CandidateProfile profile = candidateProfileRepository.findByUser(user).orElse(null);

            // Generate coding problems
            List<Map<String, Object>> problems = new ArrayList<>();

            for (int i = 0; i < numProblems; i++) {
                CodingChallenge challenge = geminiQuestionService.generateCoding(
                        user, profile, topic.trim(), difficulty.toLowerCase(), testCases);

                Map<String, Object> problemMap = new HashMap<>();
                problemMap.put("title", challenge.getTitle());
                problemMap.put("difficulty", difficulty);
                problemMap.put("problemContent", formatProblemContent(challenge));
                // Ensure examples are not null/empty - fail request if AI output is invalid
                List<Map<String, String>> examples = challenge.getExamples();
                if (examples == null || examples.isEmpty()) {
                    System.err.println("ERROR: No examples generated by AI for coding problem");
                    throw new RuntimeException("AI failed to generate examples for coding problem");
                }

                problemMap.put("examples", examples);
                problemMap.put("constraints", challenge.getConstraints());
                problemMap.put("description", challenge.getDescription());

                problems.add(problemMap);
                System.out.println("Generated coding problem " + (i + 1) + " using Gemini AI");
            }

            return ResponseEntity.ok(problems);

        } catch (Exception e) {
            System.err.println("Error generating AI coding problems: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate coding problems: " + e.getMessage()));
        }
    }

    /**
     * Generate explanation for MCQ
     */
    private String generateExplanation(String question, String correctAnswer, String topic) {
        StringBuilder explanation = new StringBuilder();
        explanation.append("**Explanation:** ");

        // Generate more specific explanations based on question content
        if (question.toLowerCase().contains("difference")) {
            explanation.append(correctAnswer)
                    .append(" is correct because it highlights the key distinction between these concepts in ")
                    .append(topic).append(". ");
            explanation.append("Understanding these differences is crucial for making informed decisions in ")
                    .append(topic).append(" development.");
        } else if (question.toLowerCase().contains("how")) {
            explanation.append(correctAnswer).append(" is the proper approach because it follows ").append(topic)
                    .append(" best practices. ");
            explanation.append("This method ensures optimal performance and maintainability in ").append(topic)
                    .append(" applications.");
        } else if (question.toLowerCase().contains("what")) {
            explanation.append(correctAnswer).append(" accurately defines this ").append(topic).append(" concept. ");
            explanation.append("This is a fundamental building block that every ").append(topic)
                    .append(" developer should understand.");
        } else if (question.toLowerCase().contains("time complexity")) {
            explanation.append(correctAnswer).append(" represents the algorithmic efficiency for this operation. ");
            explanation.append("Understanding time complexity is essential for writing performant code in ")
                    .append(topic).append(".");
        } else if (question.toLowerCase().contains("purpose") || question.toLowerCase().contains("used for")) {
            explanation.append(correctAnswer).append(" describes the primary use case for this ").append(topic)
                    .append(" feature. ");
            explanation.append("Knowing when and why to use specific features is key to mastering ").append(topic)
                    .append(".");
        } else {
            explanation.append(correctAnswer)
                    .append(" is the correct answer because it represents the standard approach in ").append(topic)
                    .append(". ");
            explanation.append("This concept is fundamental to understanding how ").append(topic)
                    .append(" works effectively.");
        }

        // Add a learning tip
        explanation.append(
                "\n\n**💡 Tip:** Practice implementing this concept in real projects to solidify your understanding!");

        return explanation.toString();
    }

    /**
     * Format coding problem content
     */
    private String formatProblemContent(CodingChallenge challenge) {
        StringBuilder content = new StringBuilder();
        content.append("# Problem Statement\n\n");
        content.append(challenge.getDescription()).append("\n\n");

        if (challenge.getExamples() != null && !challenge.getExamples().isEmpty()) {
            content.append("## Examples\n\n");
            for (int i = 0; i < challenge.getExamples().size(); i++) {
                Map<String, String> example = challenge.getExamples().get(i);
                content.append("**Example ").append(i + 1).append(":**\n");
                content.append("```\n");
                content.append("Input: ").append(example.getOrDefault("input", "")).append("\n");
                content.append("Output: ").append(example.getOrDefault("output", "")).append("\n");
                if (example.containsKey("explanation")) {
                    content.append("Explanation: ").append(example.get("explanation")).append("\n");
                }
                content.append("```\n\n");
            }
        }

        if (challenge.getConstraints() != null && !challenge.getConstraints().isEmpty()) {
            content.append("## Constraints\n\n");
            for (String constraint : challenge.getConstraints()) {
                content.append("- ").append(constraint).append("\n");
            }
        }

        return content.toString();
    }

    /**
     * Generate AI interview questions
     */
    @PostMapping("/ai-interview")
    @PreAuthorize("hasRole('CANDIDATE')")
    public ResponseEntity<?> generateAIInterview(
            @RequestBody Map<String, Object> request,
            Authentication authentication) {

        try {
            // Extract parameters
            String type = (String) request.getOrDefault("type", "technology");
            String tech = (String) request.getOrDefault("tech", "");
            String projectSummary = (String) request.getOrDefault("projectSummary", "");
            String difficulty = (String) request.getOrDefault("difficulty", "Medium");
            Integer numQuestions = (Integer) request.getOrDefault("num", 5);
            String resumeText = (String) request.getOrDefault("resumeText", "");

            // Validate parameters
            if (numQuestions == null || numQuestions <= 0) {
                numQuestions = 5;
            }
            numQuestions = Math.min(numQuestions, 10); // Limit to 10 questions

            if (type.equals("technology") && (tech == null || tech.trim().isEmpty())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Technology is required for technology-based interviews"));
            }

            System.out.println("Generating AI interview questions:");
            System.out.println("Type: " + type);
            System.out.println("Tech: " + tech);
            System.out.println("Difficulty: " + difficulty);
            System.out.println("Num Questions: " + numQuestions);

            // Get current user
            String userEmail = authentication.getName();
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get candidate profile
            CandidateProfile profile = candidateProfileRepository.findByUser(user).orElse(null);

            // Generate interview questions using AI
            List<Map<String, Object>> questions = new ArrayList<>();

                // Use Gemini AI to generate interview questions
                List<Map<String, Object>> aiQuestions = geminiQuestionService.generateInterviewQuestions(
                    user, profile, type, tech, projectSummary, difficulty, numQuestions, resumeText);
                questions.addAll(aiQuestions);

                System.out.println("Generated " + questions.size() + " interview questions using AI");

            return ResponseEntity.ok(Map.of(
                    "questions", questions,
                    "type", type,
                    "difficulty", difficulty,
                    "totalQuestions", questions.size()));

        } catch (Exception e) {
            System.err.println("Error generating AI interview questions: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to generate interview questions: " + e.getMessage()));
        }
    }

    /**
     * Get practice history for candidate
     */
    @GetMapping("/history")
    public ResponseEntity<?> getPracticeHistory(
            @RequestParam(defaultValue = "25") int limit,
            Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            List<PracticeSession> sessions = practiceSessionService.getPracticeHistory(user, limit);

            return ResponseEntity.ok(Map.of(
                    "sessions", sessions,
                    "count", sessions.size()));
        } catch (Exception e) {
            System.err.println("Error fetching practice history: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch practice history: " + e.getMessage()));
        }
    }

    /**
     * Save practice session
     */
    @PostMapping("/save-session")
    public ResponseEntity<?> savePracticeSession(
            @RequestBody Map<String, Object> body,
            Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String type = String.valueOf(body.getOrDefault("type", "coding"));
            int score = 0;
            int totalQuestions = 0;
            int correctAnswers = 0;
            try {
                score = Integer.parseInt(String.valueOf(body.getOrDefault("score", 0)));
            } catch (Exception ignored) {
            }
            try {
                totalQuestions = Integer.parseInt(String.valueOf(body.getOrDefault("totalQuestions", 0)));
            } catch (Exception ignored) {
            }

            // Handle enhanced session data
            PracticeSession session = new PracticeSession();
            session.setUser(user);
            session.setType(type);
            session.setScore(score);
            session.setTotalQuestions(totalQuestions);

            // Handle additional fields
            if (body.containsKey("difficulty")) {
                session.setDifficulty(String.valueOf(body.get("difficulty")));
            }
            if (body.containsKey("timeSpent")) {
                try {
                    session.setTimeSpent(Integer.parseInt(String.valueOf(body.get("timeSpent"))));
                } catch (Exception ignored) {
                }
            }
            if (body.containsKey("technologies") && body.get("technologies") instanceof List<?>) {
                @SuppressWarnings("unchecked")
                List<String> technologies = (List<String>) body.get("technologies");
                session.setTechnologies(technologies);
            }

            // Handle questions with enhanced data
            List<PracticeSession.PracticeQuestion> questions = new ArrayList<>();
            Object qs = body.get("questions");
            if (qs instanceof List<?> list) {
                for (Object o : list) {
                    if (o instanceof Map<?, ?> m) {
                        PracticeSession.PracticeQuestion question = new PracticeSession.PracticeQuestion();
                        question.setQuestion(String.valueOf(m.get("question") != null ? m.get("question") : ""));
                        question.setUserAnswer(String.valueOf(m.get("userAnswer") != null ? m.get("userAnswer") : ""));
                        question.setCorrectAnswer(
                                String.valueOf(m.get("correctAnswer") != null ? m.get("correctAnswer") : ""));
                        question.setTechnology(String.valueOf(m.get("technology") != null ? m.get("technology") : ""));
                        question.setQuestionType(type);

                        Object isCorrect = m.get("isCorrect");
                        if (isCorrect != null) {
                            question.setIsCorrect(Boolean.parseBoolean(String.valueOf(isCorrect)));
                            if (question.getIsCorrect())
                                correctAnswers++;
                        }

                        questions.add(question);
                    }
                }
            }

            session.setCorrectAnswers(correctAnswers);

            // Calculate percentage based on correct answers
            int percentage;
            if (totalQuestions > 0) {
                percentage = (int) Math.round((correctAnswers * 100.0) / totalQuestions);
            } else if (score >= 0 && score <= 100) {
                percentage = score;
            } else {
                percentage = 0;
            }
            session.setPercentage(percentage);
            session.setScore(correctAnswers);

            // Save session with questions
            PracticeSession saved;
            if (!questions.isEmpty()) {
                saved = practiceSessionService.saveSessionWithQuestions(session, questions);
            } else {
                saved = practiceSessionService.saveSession(session);
            }

            // Build response with saved details
            Map<String, Object> resp = new HashMap<>();
            resp.put("status", "ok");
            resp.put("id", saved.getId());
            resp.put("type", saved.getType());
            resp.put("score", saved.getScore());
            resp.put("totalQuestions", saved.getTotalQuestions());
            resp.put("correctAnswers", saved.getCorrectAnswers());
            resp.put("percentage", saved.getPercentage());
            resp.put("createdAt", saved.getCreatedAt());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", "Failed to save practice session",
                    "message", e.getMessage()));
        }
    }

    /**
     * Get specific practice session details
     */
    @GetMapping("/sessions/{id}")
    public ResponseEntity<?> getPracticeSessionDetails(
            @PathVariable Long id,
            Authentication authentication) {
        try {
            User user = userRepository.findByEmail(authentication.getName())
                    .orElseThrow(() -> new EntityNotFoundException("User not found"));

            PracticeSession session = practiceSessionService.findByIdAndUser(id, user);
            return ResponseEntity.ok(session);
        } catch (EntityNotFoundException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            System.err.println("Error fetching session details: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch session details: " + e.getMessage()));
        }
    }

}
