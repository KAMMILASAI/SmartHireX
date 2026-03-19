package com.SmartHireX.service;

import com.SmartHireX.entity.User;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface GeminiResumeAnalysisService {
    
    /**
     * Analyze resume against job description using Gemini AI
     * 
     * @param resumeFile The uploaded resume file (PDF, DOCX, or TXT)
     * @param jobDescription The job description to match against
     * @param user The current user
     * @return Analysis results including score, strengths, and weaknesses
     */
    Map<String, Object> analyzeResume(MultipartFile resumeFile, String jobDescription, User user);
    
    /**
     * Extract text content from uploaded resume file
     * 
     * @param resumeFile The uploaded resume file
     * @return Extracted text content
     */
    String extractResumeText(MultipartFile resumeFile);
}
