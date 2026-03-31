package com.SmartHireX.service.impl;

import com.SmartHireX.dto.CodingChallenge;
import com.SmartHireX.dto.McqQuestion;
import com.SmartHireX.entity.CandidateProfile;
import com.SmartHireX.entity.User;
import com.SmartHireX.service.GeminiQuestionService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class GeminiQuestionServiceImpl implements GeminiQuestionService {

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    // Simple in-memory dedup cache per user for last N items
    private static final int MAX_CACHE = 200;
    private final Map<String, Deque<String>> mcqSeenByUser = new ConcurrentHashMap<>();
    private final Map<String, Deque<String>> codingSeenByUser = new ConcurrentHashMap<>();

    @Override
    public List<McqQuestion> generateMcqs(User user, CandidateProfile profile, List<String> techs, String difficulty, int count) {
        ensureApiKey();
        String userKey = safeUserKey(user);
        String prompt = buildMcqPrompt(user, profile, techs, difficulty, count);
        String responseText = callGeminiWithRetries(prompt, 2);
        List<McqQuestion> all = parseMcqs(responseText, techs, difficulty);
        // sanitize
        all = sanitizeMcqs(all, techs, difficulty);
        return dedupMcqs(userKey, all, count);
    }

    

    @Override
    public CodingChallenge generateCoding(User user, CandidateProfile profile, String tech, String difficulty, int testCases) {
        ensureApiKey();
        String userKey = safeUserKey(user);
        String prompt = buildCodingPrompt(user, profile, tech, difficulty, testCases);
        String responseText = callGeminiWithRetries(prompt, 2);
        CodingChallenge cc = parseCoding(responseText, tech, difficulty);
        // Dedup by title
        String key = normalize(cc.getTitle());
        Deque<String> dq = codingSeenByUser.computeIfAbsent(userKey, k -> new ArrayDeque<>());
        if (dq.contains(key)) {
            // If repeated, tweak prompt slightly to force novelty
            String retry = callGeminiWithRetries(prompt + "\nEnsure a different problem title than: " + cc.getTitle() + "\nReturn ONLY valid JSON without markdown fences.", 1);
            cc = parseCoding(retry, tech, difficulty);
            key = normalize(cc.getTitle());
        }
        addToDeque(dq, key);
        return cc;
    }

    private void ensureApiKey() {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            throw new IllegalStateException("Gemini API key not configured (gemini.api-key)");
        }
    }

    private String buildMcqPrompt(User user, CandidateProfile profile, List<String> techs, String difficulty, int count) {
        String skills = profile != null && profile.getSkills() != null ? profile.getSkills() : "";
        String context = String.format(Locale.ROOT,
                "Generate %d unique MCQ questions for technologies: %s at %s difficulty. " +
                "Personalize for candidate skills: %s. " +
                "Strictly output ONLY JSON (no markdown) with schema: {\"questions\":[{\"question\":string,\"options\":[string,string,string,string],\"answer\":string,\"technology\":string}]}. " +
                "Ensure options array has exactly 4 items and one correct answer present in options. " +
                "Avoid repeating similar questions.",
                count, String.join(", ", techs), difficulty, skills);
        return context;
    }

    private String buildCodingPrompt(User user, CandidateProfile profile, String tech, String difficulty) {
        return buildCodingPrompt(user, profile, tech, difficulty, 10); // Default to 10 test cases
    }

    private String buildCodingPrompt(User user, CandidateProfile profile, String tech, String difficulty, int testCases) {
        String skills = profile != null && profile.getSkills() != null ? profile.getSkills() : "";
        return String.format(Locale.ROOT,
                "Generate one coding challenge for technology: %s at %s difficulty. " +
                "Personalize for candidate skills: %s. " +
                "CRITICAL: Include exactly %d test cases in the 'examples' array. Format examples like LeetCode/HackerRank style: " +
                "- Use clean, simple input formats (arrays as [1,2,3], strings as \"hello\", numbers as 5) " +
                "- For complex data structures, use minimal JSON format " +
                "- Avoid verbose nested objects unless absolutely necessary " +
                "- Each example MUST have 'input' and 'output' fields with clean, readable values " +
                "Return ONLY valid JSON (no markdown fences, no extra text) with this EXACT schema: " +
                "{\"title\":\"Problem Title\",\"description\":\"Problem description\",\"examples\":[{\"input\":\"[1,2,3]\",\"output\":\"6\"},{\"input\":\"[]\",\"output\":\"0\"}],\"constraints\":[\"1 <= nums.length <= 1000\",\"0 <= nums[i] <= 100\"],\"timeComplexity\":\"O(n)\",\"spaceComplexity\":\"O(1)\",\"starter\":\"// Write your solution here\",\"hints\":[\"Try using a loop\"]}. " +
                "MANDATORY: The 'examples' array MUST contain exactly %d objects, each with 'input' and 'output' string fields. " +
                "Make examples concise and clear like real coding platforms. Use simple data formats: arrays [1,2,3], strings \"abc\", numbers 42. " +
                "For tree/graph problems, use standard representations like [1,null,2,3] for binary trees.",
                tech, difficulty, skills, testCases, testCases);
    }

    private String callGeminiWithRetries(String prompt, int attempts) {
        RuntimeException last = null;
        for (int i = 0; i < Math.max(1, attempts); i++) {
            try {
                String p = i == 0 ? prompt : (prompt + "\nReturn ONLY JSON. Do not include any extra text or markdown fences.");
                return callGemini(p);
            } catch (RuntimeException ex) {
                last = ex;
            }
        }
        if (last != null) throw last;
        throw new RuntimeException("Gemini call failed");
    }

    private String callGemini(String prompt) {
        try {
            String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + geminiApiKey;
            Map<String, Object> payload = new HashMap<>();
            Map<String, Object> parts = new HashMap<>();
            parts.put("text", prompt);
            Map<String, Object> content = new HashMap<>();
            content.put("parts", List.of(parts));
            payload.put("contents", List.of(content));

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(payload, headers);
            ResponseEntity<String> resp = restTemplate.postForEntity(url, entity, String.class);
            if (!resp.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Gemini API error: " + resp.getStatusCode());
            }
            String body = resp.getBody();
            if (body == null) throw new RuntimeException("Empty response from Gemini");

            // Extract text from response
            JsonNode root = mapper.readTree(body);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode textNode = candidates.get(0).path("content").path("parts");
                if (textNode.isArray() && textNode.size() > 0) {
                    JsonNode tn = textNode.get(0).path("text");
                    if (tn.isTextual()) return tn.asText();
                }
            }
            // fallback: return whole body for parser to try
            return body;
        } catch (Exception e) {
            throw new RuntimeException("Failed to call Gemini: " + e.getMessage(), e);
        }
    }

    private List<McqQuestion> parseMcqs(String responseText, List<String> techs, String difficulty) {
        try {
            // Try parse as JSON with root.questions
            JsonNode root;
            try {
                root = mapper.readTree(responseText);
            } catch (Exception ex) {
                // Maybe responseText is markdown code block. Strip if needed.
                String cleaned = responseText
                        .replaceAll("^```json[\\r\\n]+", "")
                        .replaceAll("```[\\r\\n]*$", "")
                        .trim();
                root = mapper.readTree(cleaned);
            }
            JsonNode arr = root.path("questions");
            List<McqQuestion> out = new ArrayList<>();
            if (arr.isArray()) {
                for (JsonNode qn : arr) {
                    String q = qn.path("question").asText("");
                    List<String> options = new ArrayList<>();
                    if (qn.path("options").isArray()) {
                        for (JsonNode opt : qn.path("options")) options.add(opt.asText(""));
                    }
                    String ans = qn.path("answer").asText("");
                    String tech = qn.path("technology").asText(techs.isEmpty()?"General":techs.get(0));
                    McqQuestion mq = new McqQuestion(UUID.randomUUID().toString(), q, options, ans, tech, difficulty);
                    out.add(mq);
                }
            }
            return out;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse MCQs from Gemini: " + e.getMessage(), e);
        }
    }

    private CodingChallenge parseCoding(String responseText, String tech, String difficulty) {
        try {
            System.out.println("=== AI RESPONSE DEBUG ===");
            System.out.println("Raw AI response: " + responseText);
            System.out.println("Response length: " + responseText.length());
            
            JsonNode root;
            try {
                root = mapper.readTree(responseText);
            } catch (Exception ex) {
                System.out.println("Failed to parse as JSON, trying to clean...");
                String cleaned = responseText
                        .replaceAll("^```json[\\r\\n]+", "")
                        .replaceAll("```[\\r\\n]*$", "")
                        .trim();
                System.out.println("Cleaned response: " + cleaned);
                root = mapper.readTree(cleaned);
            }
            CodingChallenge cc = new CodingChallenge();
            cc.setTechnology(tech);
            cc.setDifficulty(difficulty);
            cc.setTitle(root.path("title").asText("Coding Challenge"));
            cc.setDescription(root.path("description").asText(""));
            // examples
            List<Map<String,String>> examples = new ArrayList<>();
            System.out.println("Examples node exists: " + root.has("examples"));
            System.out.println("Examples is array: " + root.path("examples").isArray());
            System.out.println("Examples node: " + root.path("examples"));
            
            if (root.path("examples").isArray()) {
                for (JsonNode ex : root.path("examples")) {
                    Map<String,String> m = new HashMap<>();
                    m.put("input", ex.path("input").asText(""));
                    m.put("output", ex.path("output").asText(""));
                    examples.add(m);
                    System.out.println("Added example: " + m);
                }
            }
            // If no examples in JSON, try to extract from description
            if (examples.isEmpty()) {
                System.out.println("No examples in JSON, trying to extract from description...");
                String description = cc.getDescription();
                examples = extractExamplesFromDescription(description);
                System.out.println("Extracted " + examples.size() + " examples from description");
            }
            
            cc.setExamples(examples);
            System.out.println("Total examples parsed: " + examples.size());
            // constraints
            List<String> constraints = new ArrayList<>();
            if (root.path("constraints").isArray()) {
                for (JsonNode c : root.path("constraints")) constraints.add(c.asText(""));
            }
            cc.setConstraints(constraints);
            cc.setTimeComplexity(root.path("timeComplexity").asText(""));
            cc.setSpaceComplexity(root.path("spaceComplexity").asText(""));
            cc.setStarter(root.path("starter").asText(""));
            // hints optional
            List<String> hints = new ArrayList<>();
            if (root.path("hints").isArray()) {
                for (JsonNode h : root.path("hints")) {
                    hints.add(h.asText(""));
                }
            }
            cc.setHints(hints);
            return cc;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Coding challenge from Gemini: " + e.getMessage(), e);
        }
    }
    
    private List<Map<String, String>> extractExamplesFromDescription(String description) {
        List<Map<String, String>> examples = new ArrayList<>();
        try {
            // Pattern 1: Simple format like your examples - "Example N:\nInput: ...\nOutput: ..."
            java.util.regex.Pattern simplePattern = java.util.regex.Pattern.compile(
                "Example\\s+(\\d+):\\s*Input:\\s*(.*?)\\s*Output:\\s*(.*?)(?=Example|$)", 
                java.util.regex.Pattern.DOTALL
            );
            java.util.regex.Matcher simpleMatcher = simplePattern.matcher(description);
            
            while (simpleMatcher.find()) {
                Map<String, String> example = new HashMap<>();
                example.put("input", simpleMatcher.group(2).trim());
                example.put("output", simpleMatcher.group(3).trim());
                examples.add(example);
                System.out.println("Extracted simple example from description: " + example);
            }
            
            // Pattern 2: **Example N:** followed by ``` Input: ... Output: ... ``` (fallback)
            if (examples.isEmpty()) {
                java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                    "\\*\\*Example\\s+(\\d+):\\*\\*\\s*```\\s*Input:\\s*(.*?)\\s*Output:\\s*(.*?)\\s*```", 
                    java.util.regex.Pattern.DOTALL
                );
                java.util.regex.Matcher matcher = pattern.matcher(description);
                
                while (matcher.find()) {
                    Map<String, String> example = new HashMap<>();
                    example.put("input", matcher.group(2).trim());
                    example.put("output", matcher.group(3).trim());
                    examples.add(example);
                    System.out.println("Extracted formatted example from description: " + example);
                }
            }
        } catch (Exception e) {
            System.err.println("Error extracting examples from description: " + e.getMessage());
        }
        return examples;
    }

    @Override
    public List<Map<String, Object>> generateInterviewQuestions(User user, CandidateProfile profile, String type, String tech, String projectSummary, String difficulty, Integer numQuestions, String resumeText) {
        ensureApiKey();
        String prompt = buildInterviewPrompt(user, profile, type, tech, projectSummary, difficulty, numQuestions, resumeText);
        String responseText = callGeminiWithRetries(prompt, 2);
        return parseInterviewQuestions(responseText, type, difficulty, numQuestions);
    }
    
    private String buildInterviewPrompt(User user, CandidateProfile profile, String type, String tech, String projectSummary, String difficulty, Integer numQuestions, String resumeText) {
        String skills = profile != null && profile.getSkills() != null ? profile.getSkills() : "";
        
        if ("technology".equals(type)) {
            return String.format(Locale.ROOT,
                "Generate %d interview questions for technology: %s at %s difficulty level. " +
                "Personalize for candidate skills: %s. " +
                "Return ONLY valid JSON (no markdown fences) with this exact schema: " +
                "{\"questions\":[{\"id\":\"q1\",\"text\":\"Question text here?\",\"timeLimit\":120,\"category\":\"technical\",\"followUp\":\"Optional follow-up question\"}]}. " +
                "Make questions practical, interview-style, and relevant to %s technology. " +
                "Include a mix of: technical concepts, problem-solving scenarios, experience-based questions. " +
                "Each question should have a timeLimit of 90-180 seconds. Categories: technical, behavioral, problem-solving.",
                numQuestions, tech, difficulty, skills, tech);
        } else {
            return String.format(Locale.ROOT,
                "Generate %d project/resume-based interview questions at %s difficulty level. " +
                "Project summary: %s. Candidate skills: %s. Resume text: %s. " +
                "Return ONLY valid JSON (no markdown fences) with this exact schema: " +
                "{\"questions\":[{\"id\":\"q1\",\"text\":\"Question text here?\",\"timeLimit\":120,\"category\":\"project\",\"followUp\":\"Optional follow-up question\"}]}. " +
                "Focus on: project experience, technical decisions, challenges faced, team collaboration, impact. " +
                "Each question should have a timeLimit of 90-180 seconds. Categories: project, experience, leadership, technical.",
                numQuestions, difficulty, projectSummary, skills, resumeText);
        }
    }
    
    private List<Map<String, Object>> parseInterviewQuestions(String responseText, String type, String difficulty, Integer numQuestions) {
        try {
            System.out.println("=== AI INTERVIEW RESPONSE DEBUG ===");
            System.out.println("Raw AI response: " + responseText);
            
            JsonNode root;
            try {
                root = mapper.readTree(responseText);
            } catch (Exception ex) {
                System.out.println("Failed to parse as JSON, trying to clean...");
                String cleaned = responseText
                        .replaceAll("^```json[\\r\\n]+", "")
                        .replaceAll("```[\\r\\n]*$", "")
                        .trim();
                System.out.println("Cleaned response: " + cleaned);
                root = mapper.readTree(cleaned);
            }
            
            List<Map<String, Object>> questions = new ArrayList<>();
            JsonNode questionsArray = root.path("questions");
            
            if (questionsArray.isArray()) {
                for (int i = 0; i < questionsArray.size(); i++) {
                    JsonNode q = questionsArray.get(i);
                    Map<String, Object> question = new HashMap<>();
                    question.put("id", q.path("id").asText("q" + (i + 1)));
                    question.put("text", q.path("text").asText(""));
                    question.put("timeLimit", q.path("timeLimit").asInt(120));
                    question.put("category", q.path("category").asText("general"));
                    question.put("followUp", q.path("followUp").asText(""));
                    questions.add(question);
                    System.out.println("Parsed interview question: " + question);
                }
            }
            
            System.out.println("Total interview questions parsed: " + questions.size());
            return questions;
            
        } catch (Exception e) {
            System.err.println("Failed to parse interview questions: " + e.getMessage());
            throw new RuntimeException("AI interview question generation failed: " + e.getMessage(), e);
        }
    }

    private List<McqQuestion> sanitizeMcqs(List<McqQuestion> list, List<String> techs, String difficulty) {
        List<McqQuestion> out = new ArrayList<>();
        for (McqQuestion q : list) {
            List<String> opts = new ArrayList<>(q.getOptions() != null ? q.getOptions() : Collections.emptyList());
            // trim to 4
            while (opts.size() > 4) opts.remove(opts.size() - 1);
            // pad to 4
            String tech = (q.getTechnology() != null && !q.getTechnology().isBlank()) ? q.getTechnology() : (techs.isEmpty()?"General":techs.get(0));
            for (int i = opts.size(); i < 4; i++) opts.add("Option " + (char)('A' + i) + " (" + tech + ")");
            // ensure answer present
            String ans = q.getAnswer();
            if (ans == null || ans.isBlank() || !opts.contains(ans)) {
                ans = opts.get(0);
            }
            McqQuestion fixed = new McqQuestion(q.getId(), q.getQuestion(), opts, ans, tech, difficulty);
            // discard empty questions
            if (fixed.getQuestion() != null && !fixed.getQuestion().isBlank()) out.add(fixed);
        }
        return out;
    }

    private List<McqQuestion> dedupMcqs(String userKey, List<McqQuestion> all, int count) {
        Deque<String> dq = mcqSeenByUser.computeIfAbsent(userKey, k -> new ArrayDeque<>());
        Set<String> seen = new HashSet<>(dq);
        List<McqQuestion> unique = all.stream()
                .filter(q -> !seen.contains(normalize(q.getQuestion())))
                .collect(Collectors.toList());
        // If not enough, keep adding from all while skipping duplicates
        List<McqQuestion> result = new ArrayList<>();
        for (McqQuestion q : unique) {
            result.add(q);
            if (result.size() >= count) break;
        }
        // Update deque
        for (McqQuestion q : result) addToDeque(dq, normalize(q.getQuestion()));
        return result;
    }

    private void addToDeque(Deque<String> dq, String key) {
        dq.addLast(key);
        if (dq.size() > MAX_CACHE) dq.removeFirst();
    }

    private String normalize(String s) { return s == null ? "" : s.toLowerCase(Locale.ROOT).trim(); }
    private String safeUserKey(User u) { return (u != null && u.getEmail()!=null) ? u.getEmail().toLowerCase(Locale.ROOT) : "anon"; }
}
