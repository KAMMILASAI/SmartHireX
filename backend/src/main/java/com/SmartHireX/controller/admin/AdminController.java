package com.SmartHireX.controller.admin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.entity.CandidateProfile;
import com.SmartHireX.entity.InterviewFeedback;
import com.SmartHireX.entity.Notification;
import com.SmartHireX.entity.Payment;
import com.SmartHireX.entity.RecruiterProfile;
import com.SmartHireX.entity.Role;
import com.SmartHireX.entity.User;
import com.SmartHireX.model.Application;
import com.SmartHireX.repository.ApplicationRepository;
import com.SmartHireX.repository.CandidateProfileRepository;
import com.SmartHireX.repository.CodingExamResultRepository;
import com.SmartHireX.repository.ExamResultRepository;
import com.SmartHireX.repository.InterviewFeedbackRepository;
import com.SmartHireX.repository.NotificationRepository;
import com.SmartHireX.repository.PaymentRepository;
import com.SmartHireX.repository.RecruiterProfileRepository;
import com.SmartHireX.repository.UserRepository;
import com.SmartHireX.service.AdminService;
import com.SmartHireX.service.EmailService;

@RestController
@RequestMapping("/admin")
public class AdminController {

    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final AdminService adminService;
    private final EmailService emailService;
    private final CandidateProfileRepository candidateProfileRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final ExamResultRepository examResultRepository;
    private final CodingExamResultRepository codingExamResultRepository;
    private final InterviewFeedbackRepository interviewFeedbackRepository;
    private final ApplicationRepository applicationRepository;

    public AdminController(PaymentRepository paymentRepository, UserRepository userRepository, NotificationRepository notificationRepository, AdminService adminService, EmailService emailService, CandidateProfileRepository candidateProfileRepository, RecruiterProfileRepository recruiterProfileRepository, ExamResultRepository examResultRepository, CodingExamResultRepository codingExamResultRepository, InterviewFeedbackRepository interviewFeedbackRepository, ApplicationRepository applicationRepository) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.adminService = adminService;
        this.emailService = emailService;
        this.candidateProfileRepository = candidateProfileRepository;
        this.recruiterProfileRepository = recruiterProfileRepository;
        this.examResultRepository = examResultRepository;
        this.codingExamResultRepository = codingExamResultRepository;
        this.interviewFeedbackRepository = interviewFeedbackRepository;
        this.applicationRepository = applicationRepository;
    }

    // Payments
    @GetMapping("/payments")
    public ResponseEntity<List<Payment>> getAllPayments() {
        List<Payment> payments = paymentRepository.findAllWithUser();
        return ResponseEntity.ok(payments);
    }

    @DeleteMapping("/payments/{id}")
    public ResponseEntity<Void> deletePayment(@PathVariable("id") Long id) {
        if (!paymentRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        paymentRepository.deleteById(id);
        logger.info("Deleted payment with id {}", id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/payments/total")
    public ResponseEntity<Map<String, Object>> getTotalPayments() {
        List<Payment> payments = paymentRepository.findAll();
        BigDecimal total = payments.stream()
                .map(p -> p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> body = new HashMap<>();
        body.put("total", total);
        return ResponseEntity.ok(body);
    }

    // Users by role
    @GetMapping("/candidates")
    public ResponseEntity<List<Map<String, Object>>> getCandidates() {
        List<User> users = userRepository.findByRoleOrderByCreatedAtDesc(Role.CANDIDATE);
        List<Map<String, Object>> list = users.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("_id", u.getId());
            m.put("firstName", u.getFirstName());
            m.put("lastName", u.getLastName());
            m.put("email", u.getEmail());
            m.put("role", u.getRole());
            m.put("createdAt", u.getCreatedAt());
            
            // Get complete candidate profile information
            CandidateProfile profile = candidateProfileRepository.findByUser(u).orElse(null);
            if (profile != null) {
                m.put("image", profile.getProfileImage());
                m.put("college", profile.getCollege());
                m.put("cgpa", profile.getCgpa());
                m.put("degree", profile.getDegree());
                m.put("skills", profile.getSkills());
                m.put("location", profile.getLocation());
                m.put("profileType", profile.getProfileType());
                m.put("portfolio", profile.getPortfolio());
                m.put("linkedin", profile.getLinkedin());
                m.put("github", profile.getGithub());
                m.put("resumeScore", profile.getResumeScore());
                m.put("interviewsAttended", profile.getInterviewsAttended());
                m.put("practiceSessionsCompleted", profile.getPracticeSessionsCompleted());
            } else {
                m.put("image", null);
                m.put("college", null);
                m.put("cgpa", null);
                m.put("degree", null);
                m.put("skills", null);
                m.put("location", null);
                m.put("profileType", null);
                m.put("portfolio", null);
                m.put("linkedin", null);
                m.put("github", null);
                m.put("resumeScore", 0);
                m.put("interviewsAttended", 0);
                m.put("practiceSessionsCompleted", 0);
            }
            
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @GetMapping("/recruiters")
    public ResponseEntity<List<Map<String, Object>>> getRecruiters() {
        List<User> users = userRepository.findByRoleOrderByCreatedAtDesc(Role.RECRUITER);
        List<Map<String, Object>> list = users.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", u.getId());
            m.put("_id", u.getId());
            m.put("firstName", u.getFirstName());
            m.put("lastName", u.getLastName());
            m.put("email", u.getEmail());
            m.put("role", u.getRole());
            m.put("createdAt", u.getCreatedAt());
            String image = recruiterProfileRepository.findByUser(u)
                    .map(RecruiterProfile::getImage)
                    .orElse(null);
            m.put("image", image);
            return m;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    @DeleteMapping("/candidates/{id}")
    public ResponseEntity<Void> deleteCandidate(@PathVariable("id") Long id) {
        boolean ok = adminService.hardDeleteUser(id);
        if (!ok) return ResponseEntity.notFound().build();
        logger.info("Hard-deleted candidate with id {}", id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/recruiters/{id}")
    public ResponseEntity<Void> deleteRecruiter(@PathVariable("id") Long id) {
        boolean ok = adminService.hardDeleteUser(id);
        if (!ok) return ResponseEntity.notFound().build();
        logger.info("Hard-deleted recruiter with id {}", id);
        return ResponseEntity.noContent().build();
    }

    // Pending recruiters overview for Requests and sidebar count
    @GetMapping("/pending-recruiters")
    public ResponseEntity<Map<String, Object>> getPendingRecruiters() {
        // Define "pending" as recruiters who are not yet verified
        List<User> allRecruiters = userRepository.findByRoleOrderByCreatedAtDesc(Role.RECRUITER);
        List<User> pending = allRecruiters.stream()
                .filter(u -> !Boolean.TRUE.equals(u.isVerified())) // not verified
                .collect(Collectors.toList());

        List<Map<String, Object>> requests = pending.stream().map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("_id", u.getId());
            m.put("firstName", u.getFirstName());
            m.put("lastName", u.getLastName());
            m.put("email", u.getEmail());
            m.put("createdAt", u.getCreatedAt());
            // Frontend expects these occasionally; provide nulls if unknown
            m.put("phone", u.getPhone());
            m.put("company", null);
            m.put("companyLink", null);
            m.put("numEmployees", null);
            m.put("location", null);
            return m;
        }).collect(Collectors.toList());

        Map<String, Object> body = new HashMap<>();
        body.put("count", requests.size());
        body.put("requests", requests);
        return ResponseEntity.ok(body);
    }

    // Approve a recruiter: mark as verified
    @PostMapping("/approve-recruiter/{id}")
    public ResponseEntity<?> approveRecruiter(@PathVariable("id") Long id,
                                              @RequestBody(required = false) Map<String, Object> payload) {
        return userRepository.findById(id).map(user -> {
            if (user.getRole() != Role.RECRUITER) {
                Map<String, Object> err = new HashMap<>();
                err.put("message", "User is not a recruiter");
                return ResponseEntity.badRequest().body(err);
            }
            // Mark verified and return
            user.setVerified(true);
            userRepository.save(user);
            try {
                String firstName = user.getFirstName() != null ? user.getFirstName() : "User";
                emailService.sendWelcomeEmail(user.getEmail(), firstName);
            } catch (Exception e) {
                logger.warn("Failed to send welcome email after recruiter approval to: {}", user.getEmail(), e);
            }
            logger.info("Approved recruiter with id {}", id);
            Map<String, Object> body = new HashMap<>();
            body.put("message", "Recruiter approved successfully");
            return ResponseEntity.ok(body);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Reject a recruiter: remove account for now (can be adapted to a soft-status later)
    @PostMapping("/reject-recruiter/{id}")
    public ResponseEntity<?> rejectRecruiter(@PathVariable("id") Long id,
                                             @RequestBody(required = false) Map<String, Object> payload) {
        return userRepository.findById(id).map(user -> {
            if (user.getRole() != Role.RECRUITER) {
                Map<String, Object> err = new HashMap<>();
                err.put("message", "User is not a recruiter");
                return ResponseEntity.badRequest().body(err);
            }
            try {
                String firstName = user.getFirstName() != null && !user.getFirstName().isBlank() ? user.getFirstName() : "User";
                String reason = payload != null && payload.get("reason") != null
                        ? payload.get("reason").toString().trim()
                        : null;
                emailService.sendRecruiterRejectionEmail(user.getEmail(), firstName, reason);
            } catch (Exception e) {
                logger.warn("Failed to send recruiter rejection email to: {}", user.getEmail(), e);
            }
            boolean ok = adminService.hardDeleteUser(id);
            if (!ok) return ResponseEntity.notFound().build();
            logger.info("Rejected (hard-deleted) recruiter with id {}", id);
            Map<String, Object> body = new HashMap<>();
            body.put("message", "Recruiter rejected and removed");
            return ResponseEntity.ok(body);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Promote candidate to recruiter role
    @PostMapping("/promote-to-recruiter/{id}")
    public ResponseEntity<?> promoteToRecruiter(@PathVariable("id") Long id,
                                               @RequestBody(required = false) Map<String, Object> payload) {
        return userRepository.findById(id).map(user -> {
            if (user.getRole() != Role.CANDIDATE) {
                Map<String, Object> err = new HashMap<>();
                err.put("message", "User is not a candidate");
                return ResponseEntity.badRequest().body(err);
            }
            
            // Update role to RECRUITER and set as verified (admin approved)
            user.setRole(Role.RECRUITER);
            user.setVerified(true);
            userRepository.save(user);
            
            try {
                String firstName = user.getFirstName() != null ? user.getFirstName() : "User";
                emailService.sendWelcomeEmail(user.getEmail(), firstName);
            } catch (Exception e) {
                logger.warn("Failed to send welcome email after promotion to: {}", user.getEmail(), e);
            }
            
            logger.info("Promoted candidate to recruiter with id {}", id);
            Map<String, Object> body = new HashMap<>();
            body.put("message", "User promoted to recruiter successfully");
            body.put("user", Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "role", user.getRole(),
                "verified", user.isVerified()
            ));
            return ResponseEntity.ok(body);
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Admin dashboard statistics
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getAdminStats() {
        Map<String, Object> result = new HashMap<>();

        // Basic counts
        long totalUsers = userRepository.count();
        List<User> candidates = userRepository.findByRoleOrderByCreatedAtDesc(Role.CANDIDATE);
        List<User> recruiters = userRepository.findByRoleOrderByCreatedAtDesc(Role.RECRUITER);

        result.put("total", totalUsers);
        result.put("candidates", candidates.size());
        result.put("recruiters", recruiters.size());

        // Payments summary
        List<Payment> payments = paymentRepository.findAll();
        BigDecimal totalRevenue = payments.stream()
                .map(p -> p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Map<String, Object> paymentStats = new HashMap<>();
        paymentStats.put("totalRevenue", totalRevenue);
        result.put("paymentStats", paymentStats);

        // Monthly data for current year (names only with counts)
        String[] months = Arrays.stream(java.time.Month.values())
                .map(m -> m.getDisplayName(TextStyle.SHORT, Locale.ENGLISH))
                .toArray(String[]::new);
        List<Map<String, Object>> monthlyData = new ArrayList<>();
        // Very simple monthly aggregation (counts and revenue) by month number
        for (int i = 1; i <= 12; i++) {
            int monthIndex = i; // 1-12
            long candCount = candidates.stream()
                    .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().getMonthValue() == monthIndex)
                    .count();
            long recCount = recruiters.stream()
                    .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().getMonthValue() == monthIndex)
                    .count();
            BigDecimal revenue = payments.stream()
                    .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().getMonthValue() == monthIndex)
                    .map(p -> p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            Map<String, Object> row = new HashMap<>();
            row.put("month", months[i - 1]);
            row.put("candidates", candCount);
            row.put("recruiters", recCount);
            row.put("revenue", revenue);
            monthlyData.add(row);
        }
        result.put("monthlyData", monthlyData);

        // Daily registrations (last 7 days)
        List<Map<String, Object>> dailyData = new ArrayList<>();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = LocalDate.now().minusDays(i);
            long cand = candidates.stream().filter(u -> u.getCreatedAt() != null && u.getCreatedAt().toLocalDate().isEqual(day)).count();
            long rec = recruiters.stream().filter(u -> u.getCreatedAt() != null && u.getCreatedAt().toLocalDate().isEqual(day)).count();
            Map<String, Object> row = new HashMap<>();
            row.put("day", day.getMonthValue() + "/" + day.getDayOfMonth());
            row.put("candidates", cand);
            row.put("recruiters", rec);
            dailyData.add(row);
        }
        result.put("dailyData", dailyData);

        // Growth metrics based on current vs previous month
        LocalDate nowDate = LocalDate.now();
        int currentMonth = nowDate.getMonthValue();
        int previousMonth = nowDate.minusMonths(1).getMonthValue();

        long currentMonthCandidates = candidates.stream()
            .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().getMonthValue() == currentMonth)
            .count();
        long previousMonthCandidates = candidates.stream()
            .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().getMonthValue() == previousMonth)
            .count();

        long currentMonthRecruiters = recruiters.stream()
            .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().getMonthValue() == currentMonth)
            .count();
        long previousMonthRecruiters = recruiters.stream()
            .filter(u -> u.getCreatedAt() != null && u.getCreatedAt().getMonthValue() == previousMonth)
            .count();

        long currentMonthUsers = currentMonthCandidates + currentMonthRecruiters;
        long previousMonthUsers = previousMonthCandidates + previousMonthRecruiters;

        BigDecimal currentMonthRevenue = payments.stream()
            .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().getMonthValue() == currentMonth)
            .map(p -> p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal previousMonthRevenue = payments.stream()
            .filter(p -> p.getCreatedAt() != null && p.getCreatedAt().getMonthValue() == previousMonth)
            .map(p -> p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        result.put("totalGrowth", calculateGrowthPercent(currentMonthUsers, previousMonthUsers));
        result.put("candidateGrowth", calculateGrowthPercent(currentMonthCandidates, previousMonthCandidates));
        result.put("recruiterGrowth", calculateGrowthPercent(currentMonthRecruiters, previousMonthRecruiters));
        result.put("revenueGrowth", calculateGrowthPercent(currentMonthRevenue, previousMonthRevenue));

        // Recent users (last 10 by createdAt desc)
        List<User> allUsers = new ArrayList<>();
        allUsers.addAll(candidates);
        allUsers.addAll(recruiters);
        allUsers.sort(Comparator.comparing(User::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())).reversed());
        List<Map<String, Object>> recentUsers = allUsers.stream().limit(10).map(u -> {
            Map<String, Object> m = new HashMap<>();
            m.put("name", (u.getFirstName() != null ? u.getFirstName() : "") + (u.getLastName() != null ? (" " + u.getLastName()) : ""));
            m.put("email", u.getEmail());
            m.put("role", u.getRole());
            m.put("createdAt", u.getCreatedAt());
            // Frontend checks isApproved to display status; derive from verified flag for recruiters
            boolean approved = u.getRole() != Role.RECRUITER || Boolean.TRUE.equals(u.isVerified());
            m.put("isApproved", approved);
            return m;
        }).collect(Collectors.toList());
        result.put("recentUsers", recentUsers);

        List<Map<String, Object>> activityData = new ArrayList<>();
        int candidateRatio = totalUsers == 0 ? 0 : (int) Math.round((candidates.size() * 100.0) / totalUsers);
        int recruiterRatio = totalUsers == 0 ? 0 : (int) Math.round((recruiters.size() * 100.0) / totalUsers);
        int verifiedRecruiters = (int) recruiters.stream().filter(User::isVerified).count();
        int recruiterVerifiedRatio = recruiters.isEmpty() ? 0 : (int) Math.round((verifiedRecruiters * 100.0) / recruiters.size());

        activityData.add(Map.of(
            "name", "Total Users",
            "value", totalUsers,
            "change", calculateGrowthLabel(calculateGrowthPercent(currentMonthUsers, previousMonthUsers)),
            "percentage", 100));
        activityData.add(Map.of(
            "name", "Candidate Share",
            "value", candidates.size(),
            "change", calculateGrowthLabel(calculateGrowthPercent(currentMonthCandidates, previousMonthCandidates)),
            "percentage", candidateRatio));
        activityData.add(Map.of(
            "name", "Recruiter Verified",
            "value", verifiedRecruiters,
            "change", calculateGrowthLabel(calculateGrowthPercent(currentMonthRecruiters, previousMonthRecruiters)),
            "percentage", recruiterVerifiedRatio > 0 ? recruiterVerifiedRatio : recruiterRatio));
        result.put("activityData", activityData);

        return ResponseEntity.ok(result);
    }

    // ================= Notifications =================
    @GetMapping("/notifications")
    public ResponseEntity<List<Notification>> getNotifications(@RequestParam(value = "audience", required = false) String audience) {
        List<Notification> list;
        if (audience == null || audience.isBlank() || "all".equalsIgnoreCase(audience)) {
            list = notificationRepository.findAllByOrderByCreatedAtDesc();
        } else {
            // filter by audience: candidate or recruiter
            list = notificationRepository.findByAudienceIgnoreCaseOrderByCreatedAtDesc(audience);
        }
        return ResponseEntity.ok(list);
    }

    @PostMapping("/notifications")
    public ResponseEntity<?> createNotification(@RequestBody Map<String, Object> payload) {
        String title = String.valueOf(payload.getOrDefault("title", "")).trim();
        String message = String.valueOf(payload.getOrDefault("message", "")).trim();
        String audience = String.valueOf(payload.getOrDefault("audience", "all")).trim().toLowerCase();

        if (title.isEmpty() || message.isEmpty()) {
            Map<String, Object> err = new HashMap<>();
            err.put("message", "Title and message are required");
            return ResponseEntity.badRequest().body(err);
        }
        if (!("all".equals(audience) || "candidate".equals(audience) || "recruiter".equals(audience))) {
            audience = "all";
        }

        Notification n = new Notification();
        n.setTitle(title);
        n.setMessage(message);
        n.setAudience(audience);
        Notification saved = notificationRepository.save(n);

        logger.info("Created notification id={}, audience={}", saved.getId(), audience);
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/notifications/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable("id") Long id) {
        if (!notificationRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        notificationRepository.deleteById(id);
        logger.info("Deleted notification id={}", id);
        return ResponseEntity.noContent().build();
    }

    // ================= Exam Results Management =================
    @DeleteMapping("/exam-results/clear-all")
    public ResponseEntity<?> clearAllExamResults() {
        try {
            // Count before deletion
            long examResultsDeleted = examResultRepository.count();
            long codingResultsDeleted = codingExamResultRepository.count();
            
            // Delete exam results (this should cascade to related tables)
            examResultRepository.deleteAll();
            codingExamResultRepository.deleteAll();
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "All exam results cleared successfully");
            response.put("deletedCounts", Map.of(
                "examResults", examResultsDeleted,
                "codingResults", codingResultsDeleted
            ));
            
            logger.info("Cleared all exam results - MCQ: {}, Coding: {}", 
                       examResultsDeleted, codingResultsDeleted);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to clear exam results", e);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "Failed to clear exam results: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // Temporary feedback endpoint until InterviewFeedbackController is fixed
    @PostMapping("/interview-feedback/submit")
    public ResponseEntity<?> submitInterviewFeedback(@RequestBody Map<String, Object> feedbackData) {
        try {
            logger.info("Received interview feedback: {}", feedbackData);
            
            // Validate required fields
            if (!feedbackData.containsKey("roomCode") || !feedbackData.containsKey("candidateName")) {
                return ResponseEntity.badRequest().body(Map.of("error", "Room code and candidate name are required"));
            }
            
            // Create and save InterviewFeedback entity
            InterviewFeedback feedback = new InterviewFeedback();
            feedback.setRoomCode((String) feedbackData.get("roomCode"));
            feedback.setCandidateName((String) feedbackData.get("candidateName"));
            feedback.setRecruiterName((String) feedbackData.get("recruiterName"));
            
            // Set scores (with defaults if missing)
            feedback.setCommunication((Integer) feedbackData.getOrDefault("communication", 0));
            feedback.setConfidence((Integer) feedbackData.getOrDefault("confidence", 0));
            feedback.setTechnical((Integer) feedbackData.getOrDefault("technical", 0));
            feedback.setSoftSkills((Integer) feedbackData.getOrDefault("softSkills", 0));
            feedback.setProblemSolving((Integer) feedbackData.getOrDefault("problemSolving", 0));
            feedback.setAnalytics((Integer) feedbackData.getOrDefault("analytics", 0));
            
            feedback.setOverallComments((String) feedbackData.get("overallComments"));
            feedback.setInterviewDate((String) feedbackData.get("interviewDate"));
            
            // Handle jobId conversion safely
            Object jobIdObj = feedbackData.get("jobId");
            if (jobIdObj != null) {
                if (jobIdObj instanceof Integer) {
                    feedback.setJobId(((Integer) jobIdObj).longValue());
                } else if (jobIdObj instanceof Long) {
                    feedback.setJobId((Long) jobIdObj);
                } else if (jobIdObj instanceof String) {
                    try {
                        feedback.setJobId(Long.parseLong((String) jobIdObj));
                    } catch (NumberFormatException e) {
                        logger.warn("Invalid jobId format: {}", jobIdObj);
                    }
                }
            }
            
            feedback.setSubmittedAt(LocalDateTime.now());
            
            // Save to database
            InterviewFeedback savedFeedback = interviewFeedbackRepository.save(feedback);
            
            // Calculate average score
            double averageScore = 0.0;
            int scoreCount = 0;
            
            for (String key : new String[]{"communication", "confidence", "technical", "softSkills", "problemSolving", "analytics"}) {
                if (feedbackData.containsKey(key) && feedbackData.get(key) instanceof Integer) {
                    averageScore += (Integer) feedbackData.get(key);
                    scoreCount++;
                }
            }
            
            if (scoreCount > 0) {
                averageScore = averageScore / scoreCount;
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Feedback submitted successfully");
            response.put("feedbackId", savedFeedback.getId());
            response.put("averageScore", averageScore);
            
            logger.info("Feedback saved to database with ID: {} and average score: {}", savedFeedback.getId(), averageScore);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error processing feedback", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to submit feedback: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // Get feedback by job ID
    @GetMapping("/interview-feedback/job/{jobId}")
    public ResponseEntity<?> getFeedbackByJobId(@PathVariable Long jobId) {
        try {
            logger.info("Fetching feedback for job ID: {}", jobId);
            
            List<InterviewFeedback> feedbackList = interviewFeedbackRepository.findByJobId(jobId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("feedback", feedbackList);
            response.put("count", feedbackList.size());
            
            logger.info("Found {} feedback entries for job ID: {}", feedbackList.size(), jobId);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching feedback for job ID: {}", jobId, e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to fetch feedback: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // Get all feedback (for filtering)
    @GetMapping("/interview-feedback/all")
    public ResponseEntity<?> getAllFeedback() {
        try {
            logger.info("Fetching all feedback");
            
            List<InterviewFeedback> feedbackList = interviewFeedbackRepository.findAll();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("feedback", feedbackList);
            response.put("count", feedbackList.size());
            
            logger.info("Found {} total feedback entries", feedbackList.size());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching all feedback", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to fetch feedback: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // Update candidate selection status
    @PostMapping("/interview-feedback/candidate-selection")
    public ResponseEntity<?> updateCandidateStatus(@RequestBody Map<String, Object> selectionData) {
        try {
            logger.info("Updating candidate selection status: {}", selectionData);
            
            String roomCode = (String) selectionData.get("roomCode");
            String candidateName = (String) selectionData.get("candidateName");
            String status = (String) selectionData.get("status");
            String recruiterEmail = (String) selectionData.get("recruiterEmail");
            
            // Validate required fields
            if (roomCode == null || candidateName == null || status == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Room code, candidate name, and status are required"));
            }
            
            // Find feedback by room code and candidate name
            List<InterviewFeedback> feedbackList = interviewFeedbackRepository.findByRoomCodeAndCandidateName(roomCode, candidateName)
                .map(List::of)
                .orElse(List.of());
            
            if (feedbackList.isEmpty()) {
                // If not found by room code and candidate name, try to find by room code only
                feedbackList = interviewFeedbackRepository.findByRoomCode(roomCode)
                    .stream()
                    .filter(f -> f.getCandidateName().equals(candidateName))
                    .toList();
            }
            
            if (feedbackList.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "No feedback found for the specified candidate and room"));
            }
            
            // Update selection status for all matching feedback entries
            int updatedCount = 0;
            Long jobId = null;
            String candidateEmail = null;
            
            for (InterviewFeedback feedback : feedbackList) {
                feedback.setSelectionStatus(status);
                feedback.setUpdatedAt(LocalDateTime.now());
                interviewFeedbackRepository.save(feedback);
                updatedCount++;
                
                // Get jobId for application update
                if (jobId == null && feedback.getJobId() != null) {
                    jobId = feedback.getJobId();
                }
            }
            
            // Update application status if we have jobId and candidate info
            if (jobId != null) {
                try {
                    // Try to find application by jobId and candidate name
                    // Note: We need candidate email, but we only have candidate name from feedback
                    // This is a limitation - ideally feedback should store candidate email too
                    
                    // For now, try to find by candidate name (this is not ideal but works as fallback)
                    List<Application> applications = applicationRepository.findByJobId(jobId);
                    
                    for (Application app : applications) {
                        // Enhanced name matching logic
                        String appName = app.getName().toLowerCase().trim();
                        String feedbackName = candidateName.toLowerCase().trim();
                        
                        // Remove role suffixes for comparison
                        feedbackName = feedbackName.replaceAll("\\s*\\((recruiter|candidate)\\)$", "");
                        
                        // Try multiple matching strategies
                        boolean nameMatches = false;
                        
                        // 1. Exact match
                        if (appName.equals(feedbackName)) {
                            nameMatches = true;
                        }
                        // 2. Feedback name contains application name
                        else if (feedbackName.contains(appName)) {
                            nameMatches = true;
                        }
                        // 3. Application name contains feedback name
                        else if (appName.contains(feedbackName)) {
                            nameMatches = true;
                        }
                        // 4. First and last name match (split by space)
                        else {
                            String[] appWords = appName.split("\\s+");
                            String[] feedbackWords = feedbackName.split("\\s+");
                            
                            if (appWords.length >= 2 && feedbackWords.length >= 2) {
                                // Check if first and last names match
                                if (appWords[0].equals(feedbackWords[0]) && 
                                    appWords[appWords.length-1].equals(feedbackWords[feedbackWords.length-1])) {
                                    nameMatches = true;
                                }
                            }
                        }
                        
                        logger.info("Name matching attempt - App: '{}', Feedback: '{}', Match: {}", 
                            app.getName(), candidateName, nameMatches);
                        
                        if (nameMatches) {
                            String applicationStatus = status.equals("selected") ? "hired" : "rejected";
                            app.setStatus(applicationStatus);
                            applicationRepository.save(app);
                            candidateEmail = app.getEmail();
                            logger.info("✅ Updated application status for candidate: {} to: {}", candidateName, applicationStatus);
                            break;
                        }
                    }
                } catch (Exception appError) {
                    logger.warn("Failed to update application status for candidate: {}, error: {}", candidateName, appError.getMessage());
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Candidate status updated successfully");
            response.put("updatedCount", updatedCount);
            response.put("status", status);
            response.put("candidateName", candidateName);
            response.put("applicationUpdated", candidateEmail != null);
            
            logger.info("Updated selection status for {} feedback entries. Candidate: {}, Status: {}, Application Updated: {}", 
                updatedCount, candidateName, status, candidateEmail != null);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error updating candidate selection status", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to update candidate status: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // Dashboard stats for recruiters
    @GetMapping("/recruiter/dashboard-stats")
    public ResponseEntity<?> getDashboardStats() {
        try {
            logger.info("Fetching dashboard stats for recruiter");

            List<Application> applications = applicationRepository.findAll();
            long totalCandidates = applications.stream()
                    .map(Application::getEmail)
                    .filter(email -> email != null && !email.isBlank())
                    .map(String::toLowerCase)
                    .distinct()
                    .count();

            long activeChats = 0;

            long drivesConducted = applications.stream()
                    .map(Application::getJob)
                    .filter(job -> job != null && job.getId() != null)
                    .map(job -> job.getId())
                    .distinct()
                    .count();

            long totalEmployees = userRepository.findByRoleOrderByCreatedAtDesc(Role.CANDIDATE).size();

            // Monthly data for charts (last 6 months) based on persisted records
            List<Map<String, Object>> candidatesByMonth = new ArrayList<>();
            List<Map<String, Object>> drivesByMonth = new ArrayList<>();

            LocalDateTime now = LocalDateTime.now();
            String[] monthNames = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", 
                                 "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};

            for (int i = 5; i >= 0; i--) {
                LocalDate monthDate = now.minusMonths(i).toLocalDate();
                int monthValue = monthDate.getMonthValue();
                int yearValue = monthDate.getYear();
                String monthName = monthNames[monthValue - 1];

                Set<String> monthCandidateEmails = new HashSet<>();
                Set<Long> monthDriveIds = new HashSet<>();

                for (Application app : applications) {
                    if (app.getCreatedAt() == null) {
                        continue;
                    }
                    LocalDateTime createdAt = LocalDateTime.ofInstant(app.getCreatedAt(), ZoneId.systemDefault());
                    if (createdAt.getMonthValue() == monthValue && createdAt.getYear() == yearValue) {
                        if (app.getEmail() != null && !app.getEmail().isBlank()) {
                            monthCandidateEmails.add(app.getEmail().toLowerCase());
                        }
                        if (app.getJob() != null && app.getJob().getId() != null) {
                            monthDriveIds.add(app.getJob().getId());
                        }
                    }
                }
                int candidateCount = monthCandidateEmails.size();
                int driveCount = monthDriveIds.size();
                
                Map<String, Object> candidateData = new HashMap<>();
                candidateData.put("month", monthName);
                candidateData.put("count", candidateCount);
                candidatesByMonth.add(candidateData);
                
                Map<String, Object> driveData = new HashMap<>();
                driveData.put("month", monthName);
                driveData.put("count", driveCount);
                drivesByMonth.add(driveData);
                
                logger.info("Month {}: {} candidates, {} drives", monthName, candidateCount, driveCount);
            }
            
            Map<String, Object> charts = new HashMap<>();
            charts.put("candidatesByMonth", candidatesByMonth);
            charts.put("drivesByMonth", drivesByMonth);
            
            Map<String, Object> response = new HashMap<>();
            response.put("totalCandidates", totalCandidates);
            response.put("activeChats", activeChats);
            response.put("drivesConducted", drivesConducted);
            response.put("totalEmployees", totalEmployees);
            response.put("charts", charts);
            
            logger.info("Dashboard stats: {} candidates, {} chats, {} drives, {} employees", 
                totalCandidates, activeChats, drivesConducted, totalEmployees);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("Error fetching dashboard stats", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to fetch dashboard stats: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    private int calculateGrowthPercent(long current, long previous) {
        if (previous <= 0) {
            return current > 0 ? 100 : 0;
        }
        return (int) Math.round(((current - previous) * 100.0) / previous);
    }

    private int calculateGrowthPercent(BigDecimal current, BigDecimal previous) {
        if (previous == null || BigDecimal.ZERO.compareTo(previous) == 0) {
            return (current != null && current.compareTo(BigDecimal.ZERO) > 0) ? 100 : 0;
        }
        BigDecimal diff = current.subtract(previous);
        return (int) Math.round(diff.multiply(BigDecimal.valueOf(100)).divide(previous, 2, java.math.RoundingMode.HALF_UP).doubleValue());
    }

    private String calculateGrowthLabel(int growth) {
        return (growth >= 0 ? "+" : "") + growth + "%";
    }
}
