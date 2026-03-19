package com.SmartHireX.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.dto.CandidateQuestionDTO;
import com.SmartHireX.dto.QuestionDTO;
import com.SmartHireX.dto.response.RoundResponse;
import com.SmartHireX.entity.Question;
import com.SmartHireX.entity.Round;
import com.SmartHireX.repository.QuestionRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class QuestionService {
    
    @Autowired
    private QuestionRepository questionRepository;
    
    @Autowired
    private RoundService roundService;
    
    /**
     * Create a new question for a round
     */
    public QuestionDTO createQuestion(QuestionDTO questionDTO, String createdBy) {
        // Validate input
        if (questionDTO.getQuestionText() == null || questionDTO.getQuestionText().trim().isEmpty()) {
            throw new IllegalArgumentException("Question text cannot be empty");
        }
        
        if (questionDTO.getOptions() == null || questionDTO.getOptions().size() != 4) {
            throw new IllegalArgumentException("Question must have exactly 4 options");
        }
        
        if (questionDTO.getCorrectAnswer() == null || 
            questionDTO.getCorrectAnswer() < 0 || 
            questionDTO.getCorrectAnswer() >= 4) {
            throw new IllegalArgumentException("Correct answer must be between 0 and 3");
        }
        
        // Validate question limit for the round
        Long roundId = questionDTO.getRoundId();
        RoundResponse round = roundService.getRoundById(roundId);
        
        // Get current question count for this round
        long currentQuestionCount = questionRepository.countByRoundId(roundId);
        
        // Determine the maximum allowed questions based on round type and configuration
        Integer maxQuestions = getMaxQuestionsForRound(round);
        
        if (currentQuestionCount >= maxQuestions) {
            throw new IllegalArgumentException(
                String.format("Cannot add more questions. Round allows maximum %d questions, but %d already exist.", 
                    maxQuestions, currentQuestionCount)
            );
        }
        
        // Create entity
        Question question = new Question();
        question.setRoundId(questionDTO.getRoundId());
        question.setQuestionText(questionDTO.getQuestionText().trim());
        question.setOptions(questionDTO.getOptions());
        question.setCorrectAnswer(questionDTO.getCorrectAnswer());
        question.setExplanation(questionDTO.getExplanation());
        question.setCreatedBy(createdBy);
        
        // Save to database
        Question savedQuestion = questionRepository.save(question);
        
        // Convert to DTO and return
        return convertToDTO(savedQuestion);
    }
    
    /**
     * Get all questions for a round (for recruiters - includes correct answers)
     */
    public List<QuestionDTO> getQuestionsByRoundId(Long roundId) {
        List<Question> questions = questionRepository.findByRoundIdOrderByCreatedAtAsc(roundId);
        return questions.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get questions for candidates (excludes correct answers and explanations)
     */
    public List<CandidateQuestionDTO> getCandidateQuestionsByRoundId(Long roundId) {
        // Use JOIN FETCH to eagerly load options — avoids LazyInitializationException
        List<Question> questions = questionRepository.findByRoundIdWithOptionsOrderByCreatedAtAsc(roundId);
        return questions.stream()
                .map(this::convertToCandidateDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get a specific question by ID
     */
    public Optional<Question> getQuestionById(Long id) {
        return questionRepository.findById(id);
    }
    
    /**
     * Get correct answer for a question (for scoring)
     */
    public String getCorrectAnswer(Long questionId) {
        Optional<Question> question = questionRepository.findById(questionId);
        if (question.isPresent()) {
            Integer correctIndex = question.get().getCorrectAnswer();
            List<String> options = question.get().getOptions();
            if (correctIndex != null && correctIndex >= 0 && correctIndex < options.size()) {
                return options.get(correctIndex);
            }
        }
        throw new RuntimeException("Question not found or invalid correct answer: " + questionId);
    }
    
    /**
     * Update an existing question
     */
    public QuestionDTO updateQuestion(Long questionId, QuestionDTO questionDTO, String updatedBy) {
        Optional<Question> existingQuestionOpt = questionRepository.findById(questionId);
        
        if (existingQuestionOpt.isEmpty()) {
            throw new IllegalArgumentException("Question not found with ID: " + questionId);
        }
        
        Question existingQuestion = existingQuestionOpt.get();
        
        // Validate that the user can update this question
        if (!existingQuestion.getCreatedBy().equals(updatedBy)) {
            throw new IllegalArgumentException("You can only update questions you created");
        }
        
        // Update fields
        existingQuestion.setCorrectAnswer(questionDTO.getCorrectAnswer());
        existingQuestion.setExplanation(questionDTO.getExplanation());
        existingQuestion.setUpdatedAt(LocalDateTime.now());
        
        // Save and return
        Question updatedQuestion = questionRepository.save(existingQuestion);
        return convertToDTO(updatedQuestion);
    }

    /**
     * Delete a question
     */
    public boolean deleteQuestion(Long questionId, String deletedBy) {
        Optional<Question> questionOpt = questionRepository.findById(questionId);
        
        if (questionOpt.isEmpty()) {
            return false;
        }
        
        Question question = questionOpt.get();
        
        // Validate that the user can delete this question
        if (!question.getCreatedBy().equals(deletedBy)) {
            throw new IllegalArgumentException("You can only delete questions you created");
        }
        
        questionRepository.deleteById(questionId);
        return true;
    }
    
    /**
     * Delete all questions for a round
     */
    public void deleteAllQuestionsForRound(Long roundId, String deletedBy) {
        List<Question> questions = questionRepository.findByRoundIdAndCreatedByOrderByCreatedAtAsc(roundId, deletedBy);
        questionRepository.deleteAll(questions);
    }
    
    /**
     * Get question count for a round
     */
    public long getQuestionCountByRoundId(Long roundId) {
        return questionRepository.countByRoundId(roundId);
    }
    
    /**
     * Check if a round has questions
     */
    public boolean hasQuestions(Long roundId) {
        return questionRepository.existsByRoundId(roundId);
    }
    
    /**
     * Get random questions for candidates with limit (for mixed rounds)
     */
    public List<CandidateQuestionDTO> getRandomQuestionsForRound(Long roundId, Integer limit) {
        List<Question> allQuestions = questionRepository.findByRoundIdOrderByCreatedAtAsc(roundId);
        
        // If limit is null or greater than available questions, return all
        if (limit == null || limit >= allQuestions.size()) {
            return allQuestions.stream()
                    .map(this::convertToCandidateDTO)
                    .collect(Collectors.toList());
        }
        
        // Return limited number of questions
        return allQuestions.stream()
                .limit(limit)
                .map(this::convertToCandidateDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Convert Question entity to QuestionDTO
     */
    private QuestionDTO convertToDTO(Question question) {
        return new QuestionDTO(
                question.getId(),
                question.getRoundId(),
                question.getQuestionText(),
                question.getOptions(),
                question.getCorrectAnswer(),
                question.getExplanation(),
                question.getCreatedAt(),
                question.getUpdatedAt(),
                question.getCreatedBy()
        );
    }
    
    /**
     * Convert Question entity to CandidateQuestionDTO (excludes sensitive info)
     */
    private CandidateQuestionDTO convertToCandidateDTO(Question question) {
        // Copy options into a plain ArrayList to avoid Hibernate PersistentBag leaking outside session
        List<String> options = question.getOptions() != null
                ? new java.util.ArrayList<>(question.getOptions())
                : new java.util.ArrayList<>();
        return new CandidateQuestionDTO(
                question.getId(),
                question.getQuestionText(),
                options
        );
    }

    public List<java.util.Map<String, Object>> getCandidateQuestionPayload(Long roundId) {
        return questionRepository.findByRoundIdOrderByCreatedAtAsc(roundId)
                .stream()
                .map(question -> {
                    java.util.Map<String, Object> payload = new java.util.HashMap<>();
                    payload.put("id", question.getId());
                    payload.put("question", question.getQuestionText());
                    payload.put("options", question.getOptions());
                    return payload;
                })
                .collect(Collectors.toList());
    }
    
    /**
     * Determine maximum questions allowed for a round based on its configuration
     */
    private Integer getMaxQuestionsForRound(RoundResponse round) {
        // Check round type and return appropriate limit
        Round.RoundType roundType = round.getType();
        
        if (Round.RoundType.MCQS.equals(roundType)) {
            // For MCQ rounds, use mcqQuestions field
            return round.getMcqQuestions() != null ? round.getMcqQuestions() : 5; // Default to 5 if not set
        } else if (Round.RoundType.CODING.equals(roundType)) {
            // For coding rounds, use codingQuestions field
            return round.getCodingQuestions() != null ? round.getCodingQuestions() : 3; // Default to 3 if not set
        } else if (Round.RoundType.MCQS_CODING.equals(roundType)) {
            // For combined MCQ+Coding rounds, use totalQuestions field
            return round.getTotalQuestions() != null ? round.getTotalQuestions() : 8; // Default to 8 if not set
        } else {
            // For other round types, use totalQuestions or default
            return round.getTotalQuestions() != null ? round.getTotalQuestions() : 5; // Default to 5
        }
    }
}
