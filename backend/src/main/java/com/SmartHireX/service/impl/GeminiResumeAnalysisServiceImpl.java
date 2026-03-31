package com.SmartHireX.service.impl;

import com.SmartHireX.entity.User;
import com.SmartHireX.service.GeminiResumeAnalysisService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.*;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;

@Service
public class GeminiResumeAnalysisServiceImpl implements GeminiResumeAnalysisService {

    @Value("${gemini.api-key:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    public Map<String, Object> analyzeResume(MultipartFile resumeFile, String jobDescription, User user) {
        ensureApiKey();
        
        // Extract text from resume
        String resumeText = extractResumeText(resumeFile);
        
        // Build analysis prompt
        String prompt = buildAnalysisPrompt(resumeText, jobDescription, user);
        
        // Call Gemini AI
        String responseText = callGeminiWithRetries(prompt, 2);
        
        // Parse response
        return parseAnalysisResponse(responseText);
    }

    @Override
    public String extractResumeText(MultipartFile resumeFile) {
        try {
            String filename = resumeFile.getOriginalFilename();
            if (filename == null) {
                throw new RuntimeException("Invalid file name");
            }
            
            String extension = filename.toLowerCase();
            
            if (extension.endsWith(".txt")) {
                // Read text file directly
                return new String(resumeFile.getBytes());
            } else if (extension.endsWith(".pdf")) {
                // Extract text from PDF using Apache PDFBox
                return extractTextFromPDF(resumeFile);
            } else if (extension.endsWith(".docx")) {
                // Extract text from DOCX using Apache POI
                return extractTextFromDOCX(resumeFile);
            } else {
                throw new RuntimeException("Unsupported file format: " + extension + ". Please use PDF, DOCX, or TXT format.");
            }
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to extract text from resume: " + e.getMessage(), e);
        }
    }

    private String extractTextFromPDF(MultipartFile pdfFile) throws IOException {
        try (PDDocument document = PDDocument.load(pdfFile.getInputStream())) {
            PDFTextStripper pdfStripper = new PDFTextStripper();
            String text = pdfStripper.getText(document);
            
            if (text == null || text.trim().isEmpty()) {
                throw new RuntimeException("PDF file appears to be empty or contains no extractable text");
            }
            
            return text.trim();
        } catch (Exception e) {
            throw new RuntimeException("Failed to extract text from PDF: " + e.getMessage(), e);
        }
    }

    private String extractTextFromDOCX(MultipartFile docxFile) throws IOException {
        try (XWPFDocument document = new XWPFDocument(docxFile.getInputStream());
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            
            String text = extractor.getText();
            
            if (text == null || text.trim().isEmpty()) {
                throw new RuntimeException("DOCX file appears to be empty or contains no extractable text");
            }
            
            return text.trim();
        } catch (Exception e) {
            throw new RuntimeException("Failed to extract text from DOCX: " + e.getMessage(), e);
        }
    }

    private void ensureApiKey() {
        if (geminiApiKey == null || geminiApiKey.isBlank()) {
            throw new IllegalStateException("Gemini API key not configured (gemini.api-key)");
        }
    }

    private String buildAnalysisPrompt(String resumeText, String jobDescription, User user) {
        return String.format(
            "You are an expert HR professional and resume analyst. Analyze the following resume against the job description and provide a detailed assessment.\n\n" +
            "RESUME CONTENT:\n%s\n\n" +
            "JOB DESCRIPTION:\n%s\n\n" +
            "IMPORTANT: Provide a thorough analysis based on the actual resume content. Do not use placeholder text.\n\n" +
            "Please analyze the resume and provide a response in the following JSON format ONLY (no markdown, no extra text):\n" +
            "{\n" +
            "  \"overallScore\": <number between 0-100 based on overall resume quality>,\n" +
            "  \"keywordMatch\": <percentage 0-100 of job keywords found in resume>,\n" +
            "  \"atsCompatibility\": \"<Excellent/Good/Poor>\",\n" +
            "  \"atsCompatibilityDetails\": \"<brief explanation of ATS compatibility>\",\n" +
            "  \"experienceRating\": \"<Excellent/Good/Poor>\",\n" +
            "  \"experienceMatch\": \"<detailed assessment of experience relevance>\",\n" +
            "  \"educationRating\": \"<Excellent/Good/Poor>\",\n" +
            "  \"educationDetails\": \"<assessment of education and certifications>\",\n" +
            "  \"achievementsRating\": \"<Excellent/Good/Poor>\",\n" +
            "  \"achievementsDetails\": \"<assessment of achievements and awards>\",\n" +
            "  \"grammarRating\": \"<Excellent/Good/Poor>\",\n" +
            "  \"grammarDetails\": \"<assessment of language quality>\",\n" +
            "  \"contactRating\": \"<Excellent/Good/Poor>\",\n" +
            "  \"contactDetails\": \"<assessment of contact information completeness>\",\n" +
            "  \"socialLinksRating\": \"<Excellent/Good/Poor>\",\n" +
            "  \"socialLinksDetails\": \"<assessment of professional social presence>\",\n" +
            "  \"projectImpactRating\": \"<Excellent/Good/Poor>\",\n" +
            "  \"projectImpactDetails\": \"<assessment of quantifiable project outcomes>\",\n" +
            "  \"strengths\": [\"specific strength 1\", \"specific strength 2\", \"specific strength 3\"],\n" +
            "  \"weaknesses\": [\"specific weakness 1\", \"specific weakness 2\", \"specific weakness 3\"],\n" +
            "  \"recommendations\": [\"actionable recommendation 1\", \"actionable recommendation 2\", \"actionable recommendation 3\"]\n" +
            "}\n\n" +
            "Analysis Guidelines:\n" +
            "1. **Score Calculation**: Base the score on actual resume content quality, relevance to job, and completeness\n" +
            "2. **Strengths**: Identify specific skills, experiences, or achievements mentioned in the resume\n" +
            "3. **Weaknesses**: Point out missing skills, experience gaps, or areas for improvement\n" +
            "4. **Recommendations**: Provide specific, actionable advice for improving the resume\n" +
            "5. **Keyword Matching**: Calculate percentage of job-related keywords found in resume\n" +
            "6. **Experience Match**: Assess how well the candidate's work history fits the role\n" +
            "7. **Skills Match**: Evaluate technical and soft skills alignment\n\n" +
            "Be honest, constructive, and specific in your analysis. Use actual details from the resume.",
            resumeText, jobDescription
        );
    }

    private String callGeminiWithRetries(String prompt, int attempts) {
        RuntimeException lastException = null;
        
        for (int i = 0; i < Math.max(1, attempts); i++) {
            try {
                String enhancedPrompt = i == 0 ? prompt : 
                    (prompt + "\n\nIMPORTANT: Return ONLY valid JSON without any markdown formatting or extra text.");
                return callGemini(enhancedPrompt);
            } catch (RuntimeException ex) {
                lastException = ex;
                System.err.println("Gemini call attempt " + (i + 1) + " failed: " + ex.getMessage());
            }
        }
        
        if (lastException != null) throw lastException;
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
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);
            
            if (!response.getStatusCode().is2xxSuccessful()) {
                throw new RuntimeException("Gemini API error: " + response.getStatusCode());
            }
            
            String body = response.getBody();
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
            
            return body;
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to call Gemini: " + e.getMessage(), e);
        }
    }

    private Map<String, Object> parseAnalysisResponse(String responseText) {
        try {
            // Clean the response text
            String cleanedResponse = responseText
                .replaceAll("^```json[\\r\\n]+", "")
                .replaceAll("```[\\r\\n]*$", "")
                .trim();
            
            // Parse JSON
            JsonNode root = mapper.readTree(cleanedResponse);
            
            Map<String, Object> result = new HashMap<>();
            
            // Extract overall score
            result.put("overallScore", root.path("overallScore").asInt(0));
            result.put("score", root.path("overallScore").asInt(0)); // Keep for backward compatibility
            
            // Extract strengths
            List<String> strengths = new ArrayList<>();
            JsonNode strengthsNode = root.path("strengths");
            if (strengthsNode.isArray()) {
                for (JsonNode strength : strengthsNode) {
                    strengths.add(strength.asText());
                }
            }
            result.put("strengths", strengths);
            
            // Extract weaknesses
            List<String> weaknesses = new ArrayList<>();
            JsonNode weaknessesNode = root.path("weaknesses");
            if (weaknessesNode.isArray()) {
                for (JsonNode weakness : weaknessesNode) {
                    weaknesses.add(weakness.asText());
                }
            }
            result.put("weaknesses", weaknesses);
            
            // Extract recommendations
            List<String> recommendations = new ArrayList<>();
            JsonNode recommendationsNode = root.path("recommendations");
            if (recommendationsNode.isArray()) {
                for (JsonNode recommendation : recommendationsNode) {
                    recommendations.add(recommendation.asText());
                }
            }
            result.put("recommendations", recommendations);
            
            // Extract all analysis fields
            result.put("keywordMatch", root.path("keywordMatch").asInt(0));
            result.put("atsCompatibility", root.path("atsCompatibility").asText("Good"));
            result.put("atsCompatibilityDetails", root.path("atsCompatibilityDetails").asText(""));
            result.put("experienceRating", root.path("experienceRating").asText("Good"));
            result.put("experienceMatch", root.path("experienceMatch").asText(""));
            result.put("educationRating", root.path("educationRating").asText("Good"));
            result.put("educationDetails", root.path("educationDetails").asText(""));
            result.put("achievementsRating", root.path("achievementsRating").asText("Good"));
            result.put("achievementsDetails", root.path("achievementsDetails").asText(""));
            result.put("grammarRating", root.path("grammarRating").asText("Good"));
            result.put("grammarDetails", root.path("grammarDetails").asText(""));
            result.put("contactRating", root.path("contactRating").asText("Good"));
            result.put("contactDetails", root.path("contactDetails").asText(""));
            result.put("socialLinksRating", root.path("socialLinksRating").asText("Good"));
            result.put("socialLinksDetails", root.path("socialLinksDetails").asText(""));
            result.put("projectImpactRating", root.path("projectImpactRating").asText("Good"));
            result.put("projectImpactDetails", root.path("projectImpactDetails").asText(""));
            
            // Keep backward compatibility
            result.put("skillsMatch", root.path("experienceMatch").asText(""));
            
            return result;
            
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse resume analysis response: " + e.getMessage(), e);
        }
    }
}
