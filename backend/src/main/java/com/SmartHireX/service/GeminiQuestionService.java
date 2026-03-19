package com.SmartHireX.service;

import java.util.List;
import java.util.Map;

import com.SmartHireX.dto.CodingChallenge;
import com.SmartHireX.dto.McqQuestion;
import com.SmartHireX.entity.CandidateProfile;
import com.SmartHireX.entity.User;

public interface GeminiQuestionService {
    List<McqQuestion> generateMcqs(User user, CandidateProfile profile, List<String> techs, String difficulty, int count);
    CodingChallenge generateCoding(User user, CandidateProfile profile, String tech, String difficulty, int testCases);
    List<Map<String, Object>> generateInterviewQuestions(User user, CandidateProfile profile, String type, String tech, String projectSummary, String difficulty, Integer numQuestions, String resumeText);
}
