package com.SmartHireX.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.entity.Chat;
import com.SmartHireX.entity.Round;
import com.SmartHireX.entity.CodingProblem;
import com.SmartHireX.entity.InterviewFeedback;
import com.SmartHireX.model.InterviewRound;
import com.SmartHireX.model.JobPosting;
import com.SmartHireX.model.Application;
import com.SmartHireX.repository.*;

import java.util.List;

@Service
public class AdminService {
    private static final Logger log = LoggerFactory.getLogger(AdminService.class);

    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final PracticeSessionRepository practiceSessionRepository;
    private final PaymentRepository paymentRepository;
    private final NotificationReadRepository notificationReadRepository;
    private final MessageRepository messageRepository;
    private final ChatRepository chatRepository;
    private final JobRepository jobRepository;
    private final RoundRepository roundRepository;
    private final ApplicationRepository applicationRepository;
    private final ExamResultRepository examResultRepository;
    private final CodingExamResultRepository codingExamResultRepository;
    private final CandidateProgressRepository candidateProgressRepository;
    private final QuestionRepository questionRepository;
    private final CodingProblemRepository codingProblemRepository;
    private final TestCaseRepository testCaseRepository;
    private final InterviewFeedbackRepository interviewFeedbackRepository;
    private final InterviewRoundRepository interviewRoundRepository;
    private final ResumeAnalysisHistoryRepository resumeAnalysisHistoryRepository;
    private final OTPRepository otpRepository;
    private final EmailNotificationLogRepository emailNotificationLogRepository;
    private final MixedExamResultRepository mixedExamResultRepository;

    public AdminService(UserRepository userRepository,
            CandidateProfileRepository candidateProfileRepository,
            RecruiterProfileRepository recruiterProfileRepository,
            PracticeSessionRepository practiceSessionRepository,
            PaymentRepository paymentRepository,
            NotificationReadRepository notificationReadRepository,
            MessageRepository messageRepository,
            ChatRepository chatRepository,
            JobRepository jobRepository,
            RoundRepository roundRepository,
            ApplicationRepository applicationRepository,
            ExamResultRepository examResultRepository,
            CodingExamResultRepository codingExamResultRepository,
            CandidateProgressRepository candidateProgressRepository,
            QuestionRepository questionRepository,
            CodingProblemRepository codingProblemRepository,
            TestCaseRepository testCaseRepository,
            InterviewFeedbackRepository interviewFeedbackRepository,
            InterviewRoundRepository interviewRoundRepository,
            ResumeAnalysisHistoryRepository resumeAnalysisHistoryRepository,
            OTPRepository otpRepository,
            EmailNotificationLogRepository emailNotificationLogRepository,
            MixedExamResultRepository mixedExamResultRepository) {
        this.userRepository = userRepository;
        this.candidateProfileRepository = candidateProfileRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.practiceSessionRepository = practiceSessionRepository;
        this.paymentRepository = paymentRepository;
        this.notificationReadRepository = notificationReadRepository;
        this.messageRepository = messageRepository;
        this.chatRepository = chatRepository;
        this.jobRepository = jobRepository;
        this.roundRepository = roundRepository;
        this.applicationRepository = applicationRepository;
        this.examResultRepository = examResultRepository;
        this.codingExamResultRepository = codingExamResultRepository;
        this.candidateProgressRepository = candidateProgressRepository;
        this.questionRepository = questionRepository;
        this.codingProblemRepository = codingProblemRepository;
        this.testCaseRepository = testCaseRepository;
        this.interviewFeedbackRepository = interviewFeedbackRepository;
        this.interviewRoundRepository = interviewRoundRepository;
        this.resumeAnalysisHistoryRepository = resumeAnalysisHistoryRepository;
        this.otpRepository = otpRepository;
        this.emailNotificationLogRepository = emailNotificationLogRepository;
        this.mixedExamResultRepository = mixedExamResultRepository;
    }

    @Transactional
    public boolean hardDeleteUser(Long userId) {
        return userRepository.findById(userId).map(user -> {
            String email = user.getEmail();
            String emailLower = (email != null) ? email.toLowerCase() : null;

            log.info("Starting hard delete for user {} ({}) - role: {}", userId, email, user.getRole());

            // 1. Common Cleanups
            try {
                notificationReadRepository.deleteByUserEmail(email);
                log.info("Deleted notification_reads");
            } catch (Exception e) {
                log.warn("notification_reads cleanup failed: {}", e.getMessage());
            }
            try {
                otpRepository.deleteByEmail(email);
                log.info("Deleted OTPs");
            } catch (Exception e) {
                log.warn("OTP cleanup failed: {}", e.getMessage());
            }
            try {
                resumeAnalysisHistoryRepository.deleteByUserEmail(email);
                log.info("Deleted resume_analysis_history");
            } catch (Exception e) {
                log.warn("resume_analysis_history cleanup failed: {}", e.getMessage());
            }
            try {
                candidateProfileRepository.deleteByUserId(userId);
                log.info("Deleted candidate profile");
            } catch (Exception e) {
                log.warn("candidate_profile cleanup failed: {}", e.getMessage());
            }
            try {
                recruiterProfileRepository.deleteByUserId(userId);
                log.info("Deleted recruiter profile");
            } catch (Exception e) {
                log.warn("recruiter_profile cleanup failed: {}", e.getMessage());
            }
            try {
                practiceSessionRepository.deleteByUser_Id(userId);
                log.info("Deleted practice_sessions");
            } catch (Exception e) {
                log.warn("practice_sessions cleanup failed: {}", e.getMessage());
            }
            try {
                paymentRepository.deleteByUser_Id(userId);
                log.info("Deleted payments");
            } catch (Exception e) {
                log.warn("payments cleanup failed: {}", e.getMessage());
            }
            try {
                messageRepository.deleteBySender_Id(userId);
                log.info("Deleted messages as sender");
            } catch (Exception e) {
                log.warn("messages cleanup failed: {}", e.getMessage());
            }

            // Chat cleanup
            try {
                List<Chat> chats = chatRepository.findByParticipants_Id(userId);
                for (Chat c : chats) {
                    c.getParticipants().removeIf(u -> u.getId().equals(userId));
                    if (c.getParticipants().isEmpty()) {
                        messageRepository.deleteByChat_Id(c.getId());
                        chatRepository.delete(c);
                    } else {
                        chatRepository.save(c);
                    }
                }
            } catch (Exception e) {
                log.warn("chat cleanup failed: {}", e.getMessage());
            }

            // 2. Role-Specific Cleanups
            String firstName = user.getFirstName();
            String lastName = user.getLastName();
            String fullName = (firstName != null ? firstName : "") +
                    (lastName != null ? " " + lastName : "");
            fullName = fullName.trim();
            if (user.getRole().name().equals("CANDIDATE")) {
                // Candidate results
                try {
                    examResultRepository.deleteByCandidateId(userId);
                    log.info("Deleted exam results");
                } catch (Exception e) {
                    log.warn("exam_results cleanup failed: {}", e.getMessage());
                }
                try {
                    codingExamResultRepository.deleteByCandidateId(userId);
                    log.info("Deleted coding exam results");
                } catch (Exception e) {
                    log.warn("coding_exam_results cleanup failed: {}", e.getMessage());
                }
                try {
                    mixedExamResultRepository.deleteByCandidateId(userId);
                    log.info("Deleted mixed exam results");
                } catch (Exception e) {
                    log.warn("mixed_exam_results cleanup failed: {}", e.getMessage());
                }
                try {
                    emailNotificationLogRepository.deleteByCandidateId(userId);
                    emailNotificationLogRepository.deleteByCandidateEmail(email);
                    log.info("Deleted email notification logs for candidate");
                } catch (Exception e) {
                    log.warn("email_notification_log cleanup failed: {}", e.getMessage());
                }

                // Interview cleanup for candidate
                try {
                    if (!fullName.isEmpty()) {
                        List<InterviewFeedback> feedbacks = interviewFeedbackRepository.findByCandidateName(fullName);
                        if (feedbacks != null && !feedbacks.isEmpty()) {
                            interviewFeedbackRepository.deleteAll(feedbacks);
                        }
                    }

                    if (email != null) {
                        List<InterviewRound> interviews = interviewRoundRepository.findInterviewsForCandidate(email);
                        if (interviews != null && !interviews.isEmpty()) {
                            interviewRoundRepository.deleteAll(interviews);
                        }
                    }
                    log.info("Deleted candidate interviews and feedback");
                } catch (Exception e) {
                    log.warn("interview cleanup failed: {}", e.getMessage());
                }

                // Applications (by email)
                if (emailLower != null) {
                    try {
                        List<Application> apps = applicationRepository.findByEmailLowerOrderByCreatedAtDesc(emailLower);
                        for (Application app : apps) {
                            candidateProgressRepository.findByJobIdAndApplicationId(app.getJob().getId(), app.getId())
                                    .ifPresent(candidateProgressRepository::delete);
                            applicationRepository.delete(app);
                        }
                        log.info("Deleted {} applications and related progress", apps.size());
                    } catch (Exception e) {
                        log.warn("application cleanup failed: {}", e.getMessage());
                    }
                }
            } else if (user.getRole().name().equals("RECRUITER")) {
                // Interview cleanup for recruiter
                try {
                    if (!fullName.isEmpty()) {
                        List<InterviewFeedback> feedbacks = interviewFeedbackRepository.findByRecruiterName(fullName);
                        if (feedbacks != null && !feedbacks.isEmpty()) {
                            interviewFeedbackRepository.deleteAll(feedbacks);
                        }
                    }

                    if (email != null) {
                        List<InterviewRound> interviews = interviewRoundRepository
                                .findByRecruiterEmailOrderByScheduledDateTimeDesc(email);
                        if (interviews != null && !interviews.isEmpty()) {
                            interviewRoundRepository.deleteAll(interviews);
                        }
                    }
                    log.info("Deleted recruiter interviews and feedback");
                } catch (Exception e) {
                    log.warn("interview cleanup failed: {}", e.getMessage());
                }

                // Jobs and everything under them (Rounds, Questions, Problems, Applications)
                try {
                    List<JobPosting> jobs = jobRepository.findByRecruiterOrderByCreatedAtDesc(user);
                    for (JobPosting job : jobs) {
                        // Delete all interviews for this job
                        try {
                            interviewRoundRepository.deleteByJobId(job.getId());
                            log.info("Deleted interviews for job {}", job.getId());
                        } catch (Exception intEx) {
                            log.warn("interview cleanup for job {} failed: {}", job.getId(), intEx.getMessage());
                        }

                        // Delete all applications for this job
                        try {
                            candidateProgressRepository.deleteByJobId(job.getId());
                            List<Application> apps = applicationRepository
                                    .findByJob_IdOrderByCreatedAtDesc(job.getId());
                            for (Application app : apps) {
                                applicationRepository.delete(app);
                            }
                        } catch (Exception appEx) {
                            log.warn("applications cleanup for job {} failed: {}", job.getId(), appEx.getMessage());
                        }

                        // Delete all rounds for this job
                        try {
                            List<Round> rounds = roundRepository.findByJobIdOrderByRoundOrder(job.getId());
                            for (Round round : rounds) {
                                // Delete exam results for this round
                                try {
                                    examResultRepository.deleteByRoundId(round.getId());
                                    codingExamResultRepository.deleteByRoundId(round.getId());
                                    mixedExamResultRepository.deleteByRoundId(round.getId());
                                    emailNotificationLogRepository.deleteByRoundId(round.getId());
                                } catch (Exception resEx) {
                                    log.warn("exam results/logs cleanup for round {} failed: {}", round.getId(),
                                            resEx.getMessage());
                                }

                                // Delete questions and coding problems for this round
                                try {
                                    questionRepository.deleteByRoundId(round.getId());
                                    List<CodingProblem> problems = codingProblemRepository
                                            .findByRoundIdOrderByCreatedAtAsc(round.getId());
                                    for (CodingProblem problem : problems) {
                                        testCaseRepository.deleteByCodingProblemId(problem.getId());
                                        codingProblemRepository.delete(problem);
                                    }
                                } catch (Exception qpEx) {
                                    log.warn("questions/problems cleanup for round {} failed: {}", round.getId(),
                                            qpEx.getMessage());
                                }

                                roundRepository.delete(round);
                            }
                        } catch (Exception roundEx) {
                            log.warn("rounds cleanup for job {} failed: {}", job.getId(), roundEx.getMessage());
                        }

                        try {
                            emailNotificationLogRepository.deleteByJobId(job.getId());
                        } catch (Exception e) {
                            log.warn("email log cleanup for job {} failed: {}", job.getId(), e.getMessage());
                        }

                        // Finally delete the job
                        jobRepository.delete(job);
                    }
                    log.info("Deleted {} jobs and all associated rounds/questions/problems/applications", jobs.size());
                } catch (Exception e) {
                    log.warn("job cleanup failed: {}", e.getMessage());
                }
            }

            // 3. Final User Deletion
            try {
                userRepository.deleteById(userId);
                log.info("Finalized hard-delete for user {}", userId);
            } catch (Exception e) {
                log.error("CRITICAL: Failed to delete user record from database: {}", e.getMessage(), e);
                throw new RuntimeException("Final user deletion failed: " + e.getMessage());
            }
            return true;
        }).orElse(false);
    }
}
