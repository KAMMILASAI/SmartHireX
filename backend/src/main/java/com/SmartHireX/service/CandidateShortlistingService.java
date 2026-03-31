package com.SmartHireX.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.SmartHireX.dto.response.ShortlistedCandidateResponse;
import com.SmartHireX.entity.EmailNotificationLog;
import com.SmartHireX.entity.Round;
import com.SmartHireX.model.Application;
import com.SmartHireX.model.JobPosting;
import com.SmartHireX.repository.ApplicationRepository;
import com.SmartHireX.repository.EmailNotificationLogRepository;

@Service
public class CandidateShortlistingService {

    private static final Logger logger = LoggerFactory.getLogger(CandidateShortlistingService.class);
    private static final double SKILL_SHORTLIST_THRESHOLD = 60.0;
    private static final DateTimeFormatter ROUND_START_FORMATTER = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy 'at' HH:mm z");
    private static final DateTimeFormatter ROUND_END_FORMATTER = DateTimeFormatter.ofPattern("HH:mm z");

    public CandidateShortlistingService() {}

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private EmailNotificationLogRepository emailNotificationLogRepository;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendBaseUrl;

    /**
     * Shortlist candidates based on job requirements
     * @param applications List of applications for the job
     * @param job Job posting with requirements
     * @return List of shortlisted candidates with scores
{{ ... }}
     */
    public List<ShortlistedCandidateResponse> shortlistCandidates(List<Application> applications, JobPosting job) {
        System.out.println("DEBUG SHORTLISTING - Starting shortlisting for job: " + job.getTitle());
        System.out.println("DEBUG SHORTLISTING - Total applications: " + applications.size());
        System.out.println("DEBUG SHORTLISTING - Required skills: " + job.getSkills());
        System.out.println("DEBUG SHORTLISTING - Min CGPA: " + job.getMinCgpa());
        
        List<ShortlistedCandidateResponse> shortlistedCandidates = new ArrayList<>();
        
        // Extract job requirements
        Set<String> requiredSkills = extractSkills(job.getSkills());
        Double minCgpa = job.getMinCgpa();
        
        System.out.println("DEBUG SHORTLISTING - Parsed required skills: " + requiredSkills);
        
        for (Application application : applications) {
            System.out.println("DEBUG SHORTLISTING - Evaluating candidate: " + application.getName() + 
                              " with skills: " + application.getSkills() + 
                              " and CGPA: " + application.getCgpa());
            
            ShortlistedCandidateResponse candidate = evaluateCandidate(application, requiredSkills, minCgpa);
            
            System.out.println("DEBUG SHORTLISTING - Candidate " + application.getName() + 
                              " qualified: " + candidate.isQualified() + 
                              " with total score: " + candidate.getTotalScore());
            
            if (candidate.isQualified()) {
                shortlistedCandidates.add(candidate);

                boolean statusChanged = application.getStatus() == null || !"shortlisted".equalsIgnoreCase(application.getStatus());

                if (statusChanged) {
                    application.setStatus("shortlisted");
                    applicationRepository.save(application);
                    sendJobShortlistEmailIfNeeded(application, job);
                }
            } else {
                boolean statusChanged = application.getStatus() == null || !"rejected".equalsIgnoreCase(application.getStatus());
                if (statusChanged) {
                    application.setStatus("rejected");
                    applicationRepository.save(application);
                    sendJobRejectionEmailIfNeeded(application, job);
                }
            }
        }
        
        // Sort by total score (descending)
        shortlistedCandidates.sort((a, b) -> Double.compare(b.getTotalScore(), a.getTotalScore()));
        
        return shortlistedCandidates;
    }
    
    /**
     * Get existing shortlisted candidates without re-shortlisting
     * Used when Round 1 has already started to prevent re-shortlisting rejected candidates
     */
    public List<ShortlistedCandidateResponse> getExistingShortlistedCandidates(List<Application> applications) {
        logger.info("📋 Getting existing shortlisted candidates without re-evaluation");
        
        List<ShortlistedCandidateResponse> shortlistedCandidates = new ArrayList<>();
        
        for (Application application : applications) {
            // Only include candidates who are already shortlisted
            if ("shortlisted".equalsIgnoreCase(application.getStatus())) {
                ShortlistedCandidateResponse candidate = new ShortlistedCandidateResponse();
                
                // Basic candidate info
                candidate.setApplicationId(application.getId());
                candidate.setName(application.getName());
                candidate.setEmail(application.getEmail());
                candidate.setCollege(application.getCollege());
                candidate.setCgpa(application.getCgpa());
                candidate.setAppliedAt(application.getCreatedAt());
                
                // Additional candidate details
                candidate.setProfileType(application.getProfileType());
                candidate.setIsFresher(application.getIsFresher());
                candidate.setDegree(application.getDegree());
                candidate.setCompany(application.getCompany());
                candidate.setLpa(application.getLpa());
                candidate.setYearsExp(application.getYearsExp());
                
                // Extract candidate skills
                Set<String> candidateSkills = extractSkills(application.getSkills());
                candidate.setCandidateSkills(new ArrayList<>(candidateSkills));
                
                // Set default scores (since we're not re-evaluating)
                candidate.setSkillsScore(75.0); // Default good score
                candidate.setCgpaScore(80.0);
                candidate.setExperienceScore(70.0);
                candidate.setTotalScore(75.0);
                candidate.setQualified(true); // Already shortlisted, so qualified
                
                shortlistedCandidates.add(candidate);
            }
        }
        
        // Sort by name since we don't have real scores
        shortlistedCandidates.sort((a, b) -> a.getName().compareToIgnoreCase(b.getName()));
        
        logger.info("✅ Found {} existing shortlisted candidates", shortlistedCandidates.size());
        return shortlistedCandidates;
    }

    /**
     * Evaluate a single candidate against job requirements
     */
    private ShortlistedCandidateResponse evaluateCandidate(Application application, Set<String> requiredSkills,
                                                          Double minCgpa) {
        ShortlistedCandidateResponse candidate = new ShortlistedCandidateResponse();
        
        // Basic candidate info
        candidate.setApplicationId(application.getId());
        candidate.setName(application.getName());
        candidate.setEmail(application.getEmail());
        candidate.setCollege(application.getCollege());
        candidate.setCgpa(application.getCgpa());
        candidate.setAppliedAt(application.getCreatedAt());
        
        // Additional candidate details
        candidate.setProfileType(application.getProfileType());
        candidate.setIsFresher(application.getIsFresher());
        candidate.setDegree(application.getDegree());
        candidate.setCompany(application.getCompany());
        candidate.setLpa(application.getLpa());
        candidate.setYearsExp(application.getYearsExp());
        
        // Extract candidate skills
        Set<String> candidateSkills = extractSkills(application.getSkills());
        candidate.setCandidateSkills(new ArrayList<>(candidateSkills));
        
        // Calculate scores
        double skillsScore = calculateSkillsScore(candidateSkills, requiredSkills);
        double cgpaScore = calculateCgpaScore(application.getCgpa(), minCgpa);
        double experienceScore = calculateExperienceScore(application);
        
        candidate.setSkillsScore(skillsScore);
        candidate.setCgpaScore(cgpaScore);
        candidate.setExperienceScore(experienceScore);
        
        // Calculate total score (weighted)
        double totalScore = (skillsScore * 0.5) + (cgpaScore * 0.3) + (experienceScore * 0.2);
        candidate.setTotalScore(totalScore);
        
        // Determine qualification status
        boolean meetsSkillRequirements = skillsScore >= SKILL_SHORTLIST_THRESHOLD;
        boolean meetsCgpaBenchmark = minCgpa == null || application.getCgpa() == null || application.getCgpa() >= minCgpa;
        
        // Qualification is driven by skill match threshold to keep shortlisting behavior consistent.
        candidate.setQualified(meetsSkillRequirements);
        
        // Set matching details
        Set<String> matchingSkills = candidateSkills.stream()
                .filter(skill -> requiredSkills.contains(skill))
                .collect(Collectors.toSet());
        candidate.setMatchingSkills(new ArrayList<>(matchingSkills));
        
        // Calculate skill match percentage (avoid division by zero)
        double skillMatchPercentage = requiredSkills.isEmpty() ? 100.0 : 
                (double) matchingSkills.size() / requiredSkills.size() * 100;
        candidate.setSkillMatchPercentage(skillMatchPercentage);
        
        // Set qualification reasons
        List<String> qualificationReasons = new ArrayList<>();
        if (meetsSkillRequirements) {
            qualificationReasons.add("Skills match: " + String.format("%.1f%%", candidate.getSkillMatchPercentage()));
            qualificationReasons.add("Meets shortlist threshold: " + String.format("%.0f%%", SKILL_SHORTLIST_THRESHOLD));
        }
        if (meetsCgpaBenchmark && application.getCgpa() != null) {
            qualificationReasons.add("CGPA: " + application.getCgpa() + (minCgpa != null ? " (Required: " + minCgpa + ")" : ""));
        }
        if (!meetsSkillRequirements) {
            qualificationReasons.add("Insufficient skill match (below " + String.format("%.0f", SKILL_SHORTLIST_THRESHOLD) + "%)");
        }
        if (!meetsCgpaBenchmark) {
            qualificationReasons.add("CGPA below preferred benchmark");
        }
        
        candidate.setQualificationReasons(qualificationReasons);
        
        return candidate;
    }

    /**
     * Calculate skills matching score (0-100)
     */
    private double calculateSkillsScore(Set<String> candidateSkills, Set<String> requiredSkills) {
        if (requiredSkills.isEmpty()) return 100.0;
        
        long matchingSkills = candidateSkills.stream()
                .mapToLong(skill -> requiredSkills.contains(skill) ? 1 : 0)
                .sum();
        
        double baseScore = (double) matchingSkills / requiredSkills.size() * 100;
        
        // Bonus for having more skills than required
        if (candidateSkills.size() > requiredSkills.size()) {
            double bonus = Math.min(10.0, (candidateSkills.size() - requiredSkills.size()) * 2.0);
            baseScore += bonus;
        }
        
        return Math.min(100.0, baseScore);
    }

    /**
     * Calculate CGPA score (0-100)
     */
    private double calculateCgpaScore(Double candidateCgpa, Double minCgpa) {
        if (candidateCgpa == null) return 0.0;
        if (minCgpa == null) return 70.0; // Default score when no CGPA requirement
        
        if (candidateCgpa < minCgpa) return 0.0;
        
        // Score based on how much above minimum CGPA
        double maxCgpa = 10.0; // Assuming 10-point scale
        double normalizedScore = ((candidateCgpa - minCgpa) / (maxCgpa - minCgpa)) * 100;
        
        return Math.min(100.0, Math.max(50.0, normalizedScore)); // Minimum 50 for meeting requirement
    }

    /**
     * Calculate experience score (0-100)
     */
    private double calculateExperienceScore(Application application) {
        double score = 50.0; // Base score
        
        // Add points for experience
        if (application.getYearsExp() != null && application.getYearsExp() > 0) {
            score += Math.min(30.0, application.getYearsExp() * 10); // Up to 30 points for experience
        }
        
        // Add points for company background
        if (application.getCompany() != null && !application.getCompany().trim().isEmpty()) {
            score += 10.0;
        }
        
        // Add points for higher education
        if ("postgraduate".equalsIgnoreCase(application.getProfileType())) {
            score += 10.0;
        }
        
        return Math.min(100.0, score);
    }

    /**
     * Extract and normalize skills from comma-separated string
     */
    private Set<String> extractSkills(String skillsString) {
        if (skillsString == null || skillsString.trim().isEmpty()) {
            return new HashSet<>();
        }
        
        return Arrays.stream(skillsString.split(","))
                .map(String::trim)
                .map(String::toLowerCase)
                .filter(skill -> !skill.isEmpty())
                .collect(Collectors.toSet());
    }

    /**
     * Get shortlisting statistics
     */
    public Map<String, Object> getShortlistingStats(List<Application> applications, JobPosting job) {
        List<ShortlistedCandidateResponse> shortlisted = shortlistCandidates(applications, job);
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalApplications", applications.size());
        stats.put("shortlistedCandidates", shortlisted.size());
        stats.put("shortlistingRate", !applications.isEmpty() ? 
                (double) shortlisted.size() / applications.size() * 100 : 0.0);
        
        if (!shortlisted.isEmpty()) {
            double avgScore = shortlisted.stream()
                    .mapToDouble(ShortlistedCandidateResponse::getTotalScore)
                    .average()
                    .orElse(0.0);
            stats.put("averageScore", avgScore);
            stats.put("topScore", shortlisted.get(0).getTotalScore());
        }
        
        return stats;
    }

    private void sendJobShortlistEmailIfNeeded(Application application, JobPosting job) {
        if (application.getEmail() == null || application.getEmail().isEmpty()) {
            return;
        }

        String notificationKey = String.format("JOB_SHORTLIST:%d:%d", job.getId(), application.getId());
        if (emailNotificationLogRepository.findByNotificationKey(notificationKey).isPresent()) {
            return;
        }

        try {
            String companyName = job.getCompany() != null && !job.getCompany().isBlank() ? job.getCompany() : "SmartHireX";
            String jobDetailsUrl = buildJobDetailsUrl(job.getId());

            emailService.sendJobShortlistedEmail(
                    application.getEmail(),
                    application.getName(),
                    job.getTitle(),
                    companyName,
                    jobDetailsUrl
            );

            EmailNotificationLog logEntry = new EmailNotificationLog();
            logEntry.setNotificationKey(notificationKey);
            logEntry.setNotificationType("JOB_SHORTLIST");
            logEntry.setCandidateId(application.getId());
            logEntry.setCandidateEmail(application.getEmail());
            logEntry.setJobId(job.getId());
            logEntry.setPayload(String.format("Shortlisted for job '%s'", job.getTitle()));
            logEntry.setSentAt(LocalDateTime.now());
            emailNotificationLogRepository.save(logEntry);
        } catch (Exception ex) {
            logger.warn("Failed to send job shortlist email to {} for job {}: {}", application.getEmail(), job.getTitle(), ex.getMessage());
        }
    }

    private void sendJobRejectionEmailIfNeeded(Application application, JobPosting job) {
        if (application.getEmail() == null || application.getEmail().isEmpty()) {
            return;
        }

        String notificationKey = String.format("JOB_REJECT:%d:%d", job.getId(), application.getId());
        if (emailNotificationLogRepository.findByNotificationKey(notificationKey).isPresent()) {
            return;
        }

        try {
            emailService.sendFinalRejectionEmail(
                    application.getEmail(),
                    application.getName(),
                    job.getTitle()
            );

            EmailNotificationLog logEntry = new EmailNotificationLog();
            logEntry.setNotificationKey(notificationKey);
            logEntry.setNotificationType("JOB_REJECT");
            logEntry.setCandidateId(application.getId());
            logEntry.setCandidateEmail(application.getEmail());
            logEntry.setJobId(job.getId());
            logEntry.setPayload(String.format("Rejected for job '%s' during shortlisting", job.getTitle()));
            logEntry.setSentAt(LocalDateTime.now());
            emailNotificationLogRepository.save(logEntry);
        } catch (Exception ex) {
            logger.warn("Failed to send rejection email to {} for job {}: {}", application.getEmail(), job.getTitle(), ex.getMessage());
        }
    }

    public void notifyShortlistedCandidatesOfRound(JobPosting job, Round round) {
        notifyShortlistedCandidatesOfRound(job, round, "ROUND_CREATED", false);
    }

    public void sendRoundReminder(JobPosting job, Round round) {
        notifyShortlistedCandidatesOfRound(job, round, "ROUND_REMINDER", true);
    }

    private void notifyShortlistedCandidatesOfRound(JobPosting job, Round round,
                                                    String notificationType, boolean isReminder) {
        if (job == null || round == null) {
            logger.warn("Skipping round notification because job or round is null");
            return;
        }

        List<Application> shortlistedCandidates = applicationRepository
                .findByJob_IdAndStatusIgnoreCase(job.getId(), "shortlisted");

        if (shortlistedCandidates.isEmpty()) {
            logger.info("No shortlisted candidates found for job {}. Skipping {} notification.",
                    job.getId(), notificationType);
            return;
        }

        String schedule = buildRoundSchedule(round);
        String roundType = humanizeRoundType(round.getType());
        String topics = sanitizeTopics(round.getTopics());
        Integer durationMinutes = round.getDuration();
        String shortlistUrl = buildJobDetailsUrl(job.getId());

        for (Application application : shortlistedCandidates) {
            if (application.getEmail() == null || application.getEmail().isBlank()) {
                continue;
            }

            String notificationKey = String.format(
                    "%s:%d:%d:%d",
                    notificationType,
                    job.getId(),
                    round.getId(),
                    application.getId()
            );

            if (emailNotificationLogRepository.findByNotificationKey(notificationKey).isPresent()) {
                continue;
            }

            try {
                emailService.sendRoundCreatedNotification(
                        application.getEmail(),
                        application.getName(),
                        job.getTitle(),
                        round.getTitle(),
                        schedule,
                        roundType,
                        topics,
                        durationMinutes,
                        shortlistUrl,
                        isReminder
                );

                EmailNotificationLog logEntry = new EmailNotificationLog();
                logEntry.setNotificationKey(notificationKey);
                logEntry.setNotificationType(notificationType);
                logEntry.setCandidateId(application.getId());
                logEntry.setCandidateEmail(application.getEmail());
                logEntry.setJobId(job.getId());
                logEntry.setRoundId(round.getId());
                logEntry.setPayload(String.format(
                        "%s for round '%s': %s",
                        isReminder ? "Reminder" : "Round scheduled",
                        round.getTitle(),
                        schedule
                ));
                logEntry.setSentAt(LocalDateTime.now());
                emailNotificationLogRepository.save(logEntry);
            } catch (Exception ex) {
                logger.warn("Failed to send {} notification to {} for round {}: {}",
                        notificationType, application.getEmail(), round.getId(), ex.getMessage());
            }
        }
    }

    private String buildRoundSchedule(Round round) {
        LocalDateTime start = round.getStartTime();
        if (start == null) {
            return "Schedule will be announced soon";
        }

        ZoneId zone = ZoneId.systemDefault();
        ZonedDateTime startZoned = start.atZone(zone);
        ZonedDateTime endZoned = (round.getDuration() != null)
                ? startZoned.plusMinutes(round.getDuration())
                : null;

        if (endZoned != null) {
            return startZoned.format(ROUND_START_FORMATTER) + " — " + endZoned.format(ROUND_END_FORMATTER);
        }
        return startZoned.format(ROUND_START_FORMATTER);
    }

    private String humanizeRoundType(Round.RoundType type) {
        if (type == null) {
            return "Assessment Round";
        }
        String label = type.name().toLowerCase().replace('_', ' ');
        return Arrays.stream(label.split(" "))
                .filter(segment -> !segment.isBlank())
                .map(segment -> segment.substring(0, 1).toUpperCase() + segment.substring(1))
                .collect(Collectors.joining(" "));
    }

    private String sanitizeTopics(String topics) {
        if (topics == null || topics.isBlank()) {
            return "We will cover the core competencies for this role.";
        }
        String normalized = topics.replaceAll("\r\n", " ")
                .replace('\n', ' ')
                .replace('\r', ' ')
                .trim();
        if (normalized.length() > 250) {
            return normalized.substring(0, 247) + "...";
        }
        return normalized;
    }

    private String buildJobDetailsUrl(Long jobId) {
        String base = frontendBaseUrl;
        if (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        if (jobId == null) {
            return base + "/candidate/shortlisted-jobs";
        }
        return base + "/candidate/shortlisted-jobs?jobId=" + jobId;
    }
}
