package com.SmartHireX.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.dto.AnswerSubmissionDTO;
import com.SmartHireX.dto.ExamSubmissionDTO;
import com.SmartHireX.entity.CandidateAnswer;
import com.SmartHireX.entity.ExamResult;
import com.SmartHireX.entity.Question;
import com.SmartHireX.entity.Round;
import com.SmartHireX.entity.Round.RoundType;
import com.SmartHireX.repository.ExamResultRepository;
import com.SmartHireX.repository.QuestionRepository;
import com.SmartHireX.repository.RoundRepository;

@Service
@Transactional
public class ExamResultService {
    
    @Autowired
    private ExamResultRepository examResultRepository;

    @Autowired
    private RoundRepository roundRepository;

    @Autowired
    private QuestionRepository questionRepository;
    
    /**
     * Get exam results for recruiter view (formatted for frontend)
     */
    public List<Map<String, Object>> getExamResults(Long roundId) {
        List<ExamResult> results = examResultRepository.findByRoundIdOrderBySubmittedAtDesc(roundId);
        
        List<Map<String, Object>> resultMaps = new ArrayList<>();
        for (ExamResult result : results) {
            Map<String, Object> resultMap = new java.util.HashMap<>();
            resultMap.put("id", result.getId());
            resultMap.put("candidateName", result.getCandidateName());
            resultMap.put("candidateEmail", result.getCandidateEmail());
            resultMap.put("score", result.getScorePercentage());
            resultMap.put("scorePercentage", result.getScorePercentage());
            resultMap.put("totalQuestions", result.getTotalQuestions());
            resultMap.put("correctAnswers", result.getCorrectAnswers());
            resultMap.put("wrongAnswers", result.getWrongAnswers());
            resultMap.put("timeSpent", result.getTimeTaken());
            resultMap.put("timeTaken", result.getTimeTaken());
            resultMap.put("submittedAt", result.getSubmittedAt().toString());
            resultMap.put("status", result.getStatus().toString());
            
            // Calculate time complexity score for MCQ (based on accuracy and speed)
            int timeComplexityScore = calculateMCQComplexityScore(result);
            resultMap.put("timeComplexityScore", timeComplexityScore);
            
            resultMaps.add(resultMap);
        }
        
        // Sort by: 1) Score (desc), 2) Time Complexity (asc), 3) Time Taken (asc)
        resultMaps.sort((a, b) -> {
            // First compare by score (higher score is better)
            Double scoreA = (Double) a.get("scorePercentage");
            Double scoreB = (Double) b.get("scorePercentage");
            int scoreComparison = scoreB.compareTo(scoreA);
            
            if (scoreComparison != 0) {
                return scoreComparison;
            }
            
            // If scores are equal, compare by time complexity (lower is better)
            Integer complexityA = (Integer) a.get("timeComplexityScore");
            Integer complexityB = (Integer) b.get("timeComplexityScore");
            int complexityComparison = complexityA.compareTo(complexityB);
            
            if (complexityComparison != 0) {
                return complexityComparison;
            }
            
            // If both score and complexity are equal, compare by time taken (lower is better)
            Integer timeA = (Integer) a.get("timeTaken");
            Integer timeB = (Integer) b.get("timeTaken");
            return timeA.compareTo(timeB);
        });
        
        return resultMaps;
    }
    
    /**
     * Calculate time complexity score for MCQ exams
     * Lower score means better performance (faster with high accuracy)
     */
    private int calculateMCQComplexityScore(ExamResult result) {
        // For MCQ, complexity is based on time per question and accuracy
        int totalQuestions = result.getTotalQuestions();
        int timeTaken = result.getTimeTaken();
        double scorePercentage = result.getScorePercentage();
        
        // Calculate time per question
        double timePerQuestion = totalQuestions > 0 ? (double) timeTaken / totalQuestions : timeTaken;
        
        // Base complexity score on time per question
        int timeScore;
        if (timePerQuestion <= 30) timeScore = 1;      // Very fast (30 seconds or less per question)
        else if (timePerQuestion <= 60) timeScore = 2; // Fast (1 minute or less per question)
        else if (timePerQuestion <= 120) timeScore = 3; // Average (2 minutes or less per question)
        else if (timePerQuestion <= 180) timeScore = 4; // Slow (3 minutes or less per question)
        else timeScore = 5;                             // Very slow (more than 3 minutes per question)
        
        // Adjust based on accuracy (lower accuracy increases complexity score)
        if (scorePercentage < 50) timeScore += 2;      // Poor accuracy
        else if (scorePercentage < 70) timeScore += 1; // Below average accuracy
        // Good accuracy (70%+) doesn't add penalty
        
        return Math.min(timeScore, 7); // Cap at 7
    }
    
    /**
     * Get exam statistics for recruiter view (formatted for frontend)
     */
    public Map<String, Object> getExamStats(Long roundId) {
        Map<String, Object> stats = new java.util.HashMap<>();
        
        long totalCandidates = examResultRepository.countByRoundId(roundId);
        stats.put("totalCandidates", totalCandidates);
        stats.put("completedExams", totalCandidates); // All saved results are completed
        stats.put("pendingExams", 0);
        
        if (totalCandidates > 0) {
            Double avgScore = examResultRepository.getAverageScoreByRoundId(roundId);
            Double highestScore = examResultRepository.getHighestScoreByRoundId(roundId);
            Double lowestScore = examResultRepository.getLowestScoreByRoundId(roundId);
            
            stats.put("averageScore", avgScore != null ? avgScore : 0.0);
            stats.put("highestScore", highestScore != null ? highestScore.intValue() : 0);
            stats.put("lowestScore", lowestScore != null ? lowestScore.intValue() : 0);
            
            // Calculate average time spent
            List<ExamResult> results = examResultRepository.findByRoundIdOrderBySubmittedAtDesc(roundId);
            double avgTimeSpent = results.stream().mapToInt(ExamResult::getTimeTaken).average().orElse(0.0);
            stats.put("averageTimeSpent", (int) avgTimeSpent);
            
            // Count passed candidates (assuming 50% is passing)
            long passedCandidates = examResultRepository.countPassedCandidates(roundId, 50.0);
            stats.put("passedCandidates", passedCandidates);
            stats.put("failedCandidates", totalCandidates - passedCandidates);
            
            // Score distribution
            Map<String, Long> scoreDistribution = new java.util.HashMap<>();
            scoreDistribution.put("90-100", examResultRepository.countByRoundIdAndScoreRange(roundId, 90.0, 100.0));
            scoreDistribution.put("80-89", examResultRepository.countByRoundIdAndScoreRange(roundId, 80.0, 89.9));
            scoreDistribution.put("70-79", examResultRepository.countByRoundIdAndScoreRange(roundId, 70.0, 79.9));
            scoreDistribution.put("60-69", examResultRepository.countByRoundIdAndScoreRange(roundId, 60.0, 69.9));
            scoreDistribution.put("below-60", examResultRepository.countByRoundIdAndScoreRange(roundId, 0.0, 59.9));
            stats.put("scoreDistribution", scoreDistribution);
            
        } else {
            stats.put("averageScore", 0.0);
            stats.put("highestScore", 0);
            stats.put("lowestScore", 0);
            stats.put("averageTimeSpent", 0);
            stats.put("passedCandidates", 0);
            stats.put("failedCandidates", 0);
            stats.put("scoreDistribution", new java.util.HashMap<>());
        }
        
        return stats;
    }
    
    /**
     * Get detailed candidate exam results including answers
     */
    public Map<String, Object> getCandidateDetailedResults(Long roundId, Long candidateId) {
        ExamResult result = examResultRepository.findByRoundIdAndCandidateId(roundId, candidateId)
                .orElseThrow(() -> new IllegalArgumentException("Exam result not found for this candidate"));
        
        Map<String, Object> details = new java.util.HashMap<>();
        details.put("candidateId", result.getCandidateId());
        details.put("candidateName", result.getCandidateName());
        details.put("candidateEmail", result.getCandidateEmail());
        details.put("roundId", result.getRoundId());
        details.put("totalScore", result.getScorePercentage());
        details.put("totalQuestions", result.getTotalQuestions());
        details.put("correctAnswers", result.getCorrectAnswers());
        details.put("wrongAnswers", result.getWrongAnswers());
        details.put("unanswered", result.getUnanswered());
        details.put("timeSpent", result.getTimeTaken());
        details.put("submittedAt", result.getSubmittedAt().toString());
        details.put("status", result.getStatus().toString());
        
        // Include detailed answers if available
        if (result.getAnswers() != null && !result.getAnswers().isEmpty()) {
            List<Map<String, Object>> answerDetails = new ArrayList<>();
            for (CandidateAnswer answer : result.getAnswers()) {
                Map<String, Object> answerMap = new java.util.HashMap<>();
                answerMap.put("questionId", answer.getQuestionId());
                answerMap.put("selectedAnswer", answer.getSelectedAnswer());
                answerMap.put("correctAnswer", answer.getCorrectAnswer());
                answerMap.put("isCorrect", answer.getIsCorrect());
                answerMap.put("timeSpent", answer.getTimeTaken());
                answerDetails.add(answerMap);
            }
            details.put("answers", answerDetails);
        }
        
        return details;
    }
    
    /**
     * Check if candidate has already taken the exam
     */
    public boolean hasExamBeenTaken(Long roundId, Long candidateId) {
        return examResultRepository.existsByRoundIdAndCandidateId(roundId, candidateId);
    }
    
    /**
     * Get exam result for a specific candidate and round (returns Map for compatibility)
     */
    public Map<String, Object> getCandidateExamResult(Long roundId, Long candidateId) {
        ExamResult result = examResultRepository.findByRoundIdAndCandidateId(roundId, candidateId)
                .orElseThrow(() -> new IllegalArgumentException("Exam result not found for this candidate"));
        
        Map<String, Object> resultMap = new java.util.HashMap<>();
        resultMap.put("id", result.getId());
        resultMap.put("candidateName", result.getCandidateName());
        resultMap.put("candidateEmail", result.getCandidateEmail());
        resultMap.put("score", result.getScorePercentage());
        resultMap.put("totalQuestions", result.getTotalQuestions());
        resultMap.put("correctAnswers", result.getCorrectAnswers());
        resultMap.put("wrongAnswers", result.getWrongAnswers());
        resultMap.put("timeSpent", result.getTimeTaken());
        resultMap.put("submittedAt", result.getSubmittedAt().toString());
        resultMap.put("status", result.getStatus().toString());
        
        return resultMap;
    }
    
    /**
     * Get all exam results for a candidate
     */
    public List<Map<String, Object>> getCandidateExamHistory(Long candidateId) {
        List<ExamResult> results = examResultRepository.findByCandidateIdOrderBySubmittedAtDesc(candidateId);
        
        List<Map<String, Object>> resultMaps = new ArrayList<>();
        for (ExamResult result : results) {
            Map<String, Object> resultMap = new java.util.HashMap<>();
            resultMap.put("id", result.getId());
            resultMap.put("candidateName", result.getCandidateName());
            resultMap.put("candidateEmail", result.getCandidateEmail());
            resultMap.put("roundId", result.getRoundId());
            resultMap.put("score", result.getScorePercentage());
            resultMap.put("totalQuestions", result.getTotalQuestions());
            resultMap.put("correctAnswers", result.getCorrectAnswers());
            resultMap.put("submittedAt", result.getSubmittedAt().toString());
            resultMap.put("status", result.getStatus().toString());
            resultMaps.add(resultMap);
        }
        
        return resultMaps;
    }
    
    /**
     * Get detailed exam result by ID
     */
    public Map<String, Object> getDetailedExamResult(Long resultId) {
        ExamResult result = examResultRepository.findById(resultId)
                .orElseThrow(() -> new IllegalArgumentException("Exam result not found"));
        
        return getCandidateDetailedResults(result.getRoundId(), result.getCandidateId());
    }
    
    /**
     * Get all exam results for a round (for recruiters)
     */
    public List<Map<String, Object>> getExamResultsByRoundId(Long roundId) {
        return getExamResults(roundId);
    }
    
    /**
     * Get exam statistics for a round
     */
    public Map<String, Object> getExamStatistics(Long roundId) {
        return getExamStats(roundId);
    }
    
    /**
     * Submit exam results and persist computed score details.
     */
    public Map<String, Object> submitExam(ExamSubmissionDTO submission, Long candidateId, String candidateEmail, String candidateName) {
        if (submission == null || submission.getRoundId() == null) {
            throw new IllegalArgumentException("Round ID is required for exam submission");
        }

        Round round = roundRepository.findById(submission.getRoundId())
                .orElseThrow(() -> new IllegalArgumentException("Round not found with id: " + submission.getRoundId()));

        RoundType roundType = round.getType();
        if (roundType == null) {
            throw new IllegalStateException("Round type is not configured for round: " + round.getId());
        }

        ExamResult result = new ExamResult();
        result.setRoundId(round.getId());
        result.setCandidateId(candidateId);
        result.setCandidateEmail(candidateEmail);
        result.setCandidateName(candidateName);
        java.time.LocalDateTime submissionTime = java.time.LocalDateTime.now();
        result.setSubmittedAt(submissionTime);
        result.setStatus(ExamResult.ExamStatus.COMPLETED);

        int totalQuestions = 0;
        int correctAnswers = 0;
        int wrongAnswers = 0;
        int unanswered = 0;

        List<CandidateAnswer> recordedAnswers = new java.util.ArrayList<>();

        if (submission.getAnswers() != null) {
            totalQuestions = submission.getAnswers().size();
            for (AnswerSubmissionDTO answer : submission.getAnswers()) {
                Question question = questionRepository.findById(answer.getQuestionId())
                        .orElseThrow(() -> new IllegalArgumentException("Question not found: " + answer.getQuestionId()));

                CandidateAnswer candidateAnswer = new CandidateAnswer();
                candidateAnswer.setQuestionId(answer.getQuestionId());
                candidateAnswer.setQuestionText(question.getQuestionText());
                candidateAnswer.setSelectedAnswer(answer.getSelectedAnswer());
                int correctOption = question.getCorrectAnswer();
                candidateAnswer.setCorrectAnswer(correctOption);

                boolean isCorrect = answer.getSelectedAnswer() != null && answer.getSelectedAnswer().equals(correctOption);
                candidateAnswer.setIsCorrect(isCorrect);
                candidateAnswer.setTimeTaken(answer.getTimeSpentSeconds() != null ? answer.getTimeSpentSeconds() : 0);

                recordedAnswers.add(candidateAnswer);

                if (answer.getSelectedAnswer() == null) {
                    unanswered++;
                } else if (isCorrect) {
                    correctAnswers++;
                } else {
                    wrongAnswers++;
                }
            }
        }

        result.setTotalQuestions(totalQuestions);
        result.setCorrectAnswers(correctAnswers);
        result.setWrongAnswers(wrongAnswers);
        result.setUnanswered(unanswered);
        result.setAnswers(recordedAnswers);

        int calculatedScore = totalQuestions > 0 ? (int) Math.round((correctAnswers * 100.0) / totalQuestions) : 0;
        result.setScorePercentage((double) calculatedScore);

        int timeTaken = submission.getTimeTaken() != null ? submission.getTimeTaken() : 0;
        result.setTimeTaken(timeTaken);

        result.setStartTime(submission.getStartTime() != null ? submission.getStartTime() : submissionTime.minusSeconds(timeTaken));
        result.setEndTime(submission.getEndTime() != null ? submission.getEndTime() : submissionTime);

        Integer roundDurationMinutes = round.getDuration();
        int timeAllowedSeconds = roundDurationMinutes != null ? roundDurationMinutes * 60 : Math.max(timeTaken, 0);
        result.setTimeAllowed(timeAllowedSeconds);

        ExamResult saved = examResultRepository.save(result);

        Map<String, Object> response = new java.util.HashMap<>();
        response.put("success", true);
        response.put("message", "Exam submitted successfully");
        response.put("resultId", saved.getId());
        response.put("scorePercentage", saved.getScorePercentage());
        response.put("correctAnswers", saved.getCorrectAnswers());
        response.put("totalQuestions", saved.getTotalQuestions());
        return response;
    }
}
