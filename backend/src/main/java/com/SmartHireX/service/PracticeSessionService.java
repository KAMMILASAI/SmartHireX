package com.SmartHireX.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import com.SmartHireX.entity.PracticeSession;
import com.SmartHireX.entity.User;
import com.SmartHireX.repository.PracticeSessionRepository;

import jakarta.persistence.EntityNotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;

@Service
public class PracticeSessionService {

    @Autowired
    private PracticeSessionRepository practiceSessionRepository;
    
    private final ObjectMapper objectMapper = new ObjectMapper();

    public PracticeSession saveSession(PracticeSession session) {
        return practiceSessionRepository.save(session);
    }

    public List<PracticeSession> generateDynamicPracticeSessions(User user, int count) {
        List<PracticeSession> existingSessions = practiceSessionRepository.findByUserOrderByCreatedAtDesc(user);
        
        // If user has no practice sessions, generate some dynamic ones
        if (existingSessions.isEmpty()) {
            List<PracticeSession> sessions = new ArrayList<>();
            Random random = new Random();
            String[] types = {"mcq", "coding", "interview"};
            
            for (int i = 0; i < count; i++) {
                PracticeSession session = new PracticeSession();
                session.setUser(user);
                session.setType(types[random.nextInt(types.length)]);
                
                // Generate realistic scores
                int baseScore = 60 + random.nextInt(35); // 60-95%
                session.setPercentage(baseScore);
                session.setScore(baseScore);
                
                // Generate questions based on type
                int totalQuestions = switch (session.getType()) {
                    case "mcq" -> 20 + random.nextInt(10); // 20-30 questions
                    case "coding" -> 3 + random.nextInt(3); // 3-5 questions
                    case "interview" -> 5 + random.nextInt(5); // 5-10 questions
                    default -> 10;
                };
                
                session.setTotalQuestions(totalQuestions);
                session.setCorrectAnswers((int) (totalQuestions * (baseScore / 100.0)));
                
                // Set creation time (spread over last 30 days)
                LocalDateTime createdAt = LocalDateTime.now().minusDays(random.nextInt(30));
                session.setCreatedAt(createdAt);
                
                sessions.add(session);
            }
            
            // Save all sessions
            sessions = practiceSessionRepository.saveAll(sessions);
            return sessions;
        }
        
        return existingSessions;
    }

    public List<PracticeSession> getPracticeHistory(User user, int limit) {
        // Return only persisted sessions from DB
        List<PracticeSession> sessions = practiceSessionRepository.findByUserWithLimit(user, PageRequest.of(0, limit));
        
        // Deserialize questions from JSON for each session
        for (PracticeSession session : sessions) {
            if (session.getQuestionsJson() != null && !session.getQuestionsJson().isEmpty()) {
                try {
                    TypeReference<List<PracticeSession.PracticeQuestion>> typeRef = new TypeReference<List<PracticeSession.PracticeQuestion>>() {};
                    List<PracticeSession.PracticeQuestion> questions = objectMapper.readValue(session.getQuestionsJson(), typeRef);
                    session.setQuestions(questions);
                } catch (JsonProcessingException e) {
                    System.err.println("Error deserializing questions for session " + session.getId() + ": " + e.getMessage());
                    session.setQuestions(new ArrayList<>());
                }
            }
        }
        
        return sessions;
    }

    public long getTotalSessionCount(User user) {
        // Report persisted session count only
        return practiceSessionRepository.countByUser(user);
    }

    public int calculateDailyStreak(User user) {
        List<PracticeSession> sessions = practiceSessionRepository.findByUserOrderByCreatedAtDesc(user);
        if (sessions.isEmpty()) return 0;
        
        int streak = 0;
        LocalDateTime currentDate = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        
        for (PracticeSession session : sessions) {
            LocalDateTime sessionDate = session.getCreatedAt().withHour(0).withMinute(0).withSecond(0).withNano(0);
            long daysDiff = java.time.Duration.between(sessionDate, currentDate).toDays();
            
            if (daysDiff == streak) {
                streak++;
                currentDate = currentDate.minusDays(1);
            } else if (daysDiff > streak) {
                break;
            }
        }
        
        return streak;
    }

    public PracticeSession findByIdAndUser(Long id, User user) {
        PracticeSession session = practiceSessionRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new EntityNotFoundException("Practice session not found"));
        
        // Deserialize questions from JSON
        if (session.getQuestionsJson() != null && !session.getQuestionsJson().isEmpty()) {
            try {
                TypeReference<List<PracticeSession.PracticeQuestion>> typeRef = new TypeReference<List<PracticeSession.PracticeQuestion>>() {};
                List<PracticeSession.PracticeQuestion> questions = objectMapper.readValue(session.getQuestionsJson(), typeRef);
                session.setQuestions(questions);
            } catch (JsonProcessingException e) {
                System.err.println("Error deserializing questions for session " + session.getId() + ": " + e.getMessage());
                session.setQuestions(new ArrayList<>());
            }
        }
        
        return session;
    }

    public PracticeSession saveSessionWithQuestions(PracticeSession session, List<PracticeSession.PracticeQuestion> questions) {
        // Serialize questions to JSON
        try {
            String questionsJson = objectMapper.writeValueAsString(questions);
            session.setQuestionsJson(questionsJson);
        } catch (JsonProcessingException e) {
            System.err.println("Error serializing questions: " + e.getMessage());
        }
        
        session.setQuestions(questions);
        session.setTotalQuestions(questions.size());
        session.setCorrectAnswers((int) questions.stream().filter(q -> Boolean.TRUE.equals(q.getIsCorrect())).count());
        session.setScore(session.getCorrectAnswers());
        session.setPercentage((int) ((session.getScore() * 100.0) / session.getTotalQuestions()));
        return practiceSessionRepository.save(session);
    }

    public List<PracticeSession> getPracticeSessionsWithLimit(User user, int limit) {
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt"));
        return practiceSessionRepository.findByUserWithLimit(user, pageable);
    }
}
