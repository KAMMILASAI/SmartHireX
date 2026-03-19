package com.SmartHireX.controller.job;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.dto.request.JobRequest;
import com.SmartHireX.dto.response.ShortlistedCandidateResponse;
import com.SmartHireX.entity.CandidateProgress;
import com.SmartHireX.entity.Round;
import com.SmartHireX.entity.User;
import com.SmartHireX.model.Application;
import com.SmartHireX.model.JobPosting;
import com.SmartHireX.repository.ApplicationRepository;
import com.SmartHireX.repository.CandidateProgressRepository;
import com.SmartHireX.repository.JobRepository;
import com.SmartHireX.repository.RoundRepository;
import com.SmartHireX.security.CurrentUser;
import com.SmartHireX.security.UserPrincipal;
import com.SmartHireX.service.CandidateShortlistingService;
import com.SmartHireX.service.EmailService;
import com.SmartHireX.service.UserService;

@RestController
@RequestMapping("/jobs")
public class JobController {

    private static final Logger logger = LoggerFactory.getLogger(JobController.class);

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private ApplicationRepository applicationRepository;

    @Autowired
    private RoundRepository roundRepository;

    @Autowired
    private CandidateProgressRepository candidateProgressRepository;

    @Autowired
    private CandidateShortlistingService shortlistingService;

    @Autowired
    private EmailService emailService;

    private static final String ACCESS_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int ACCESS_CODE_LENGTH = 8;
    private final SecureRandom secureRandom = new SecureRandom();

    private String resolveAccessCode(JobRequest request) {
        if (request.getAccessCode() != null && !request.getAccessCode().isBlank()) {
            return request.getAccessCode().trim().toUpperCase();
        }
        StringBuilder builder = new StringBuilder(ACCESS_CODE_LENGTH);
        for (int i = 0; i < ACCESS_CODE_LENGTH; i++) {
            int index = secureRandom.nextInt(ACCESS_CODE_ALPHABET.length());
            builder.append(ACCESS_CODE_ALPHABET.charAt(index));
        }
        return builder.toString();
    }

    @GetMapping
    public ResponseEntity<?> listMyJobs(@CurrentUser UserPrincipal principal) {
        try {
            User me = userService.findById(principal.getId()).orElseThrow();
            List<JobPosting> jobs = jobRepository.findByRecruiterOrderByCreatedAtDesc(me);

            // Debug: Log what we're returning
            for (JobPosting job : jobs) {
                System.out.println("DEBUG FETCH - Job: " + job.getTitle() +
                        ", startDate: " + job.getStartDate() +
                        ", endDate: " + job.getEndDate());
            }

            return ResponseEntity.ok(jobs);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to list jobs", "message", e.getMessage()));
        }
    }

    // Public: check if an email already applied to a job identified by linkId
    @GetMapping("/{linkId}/applied")
    public ResponseEntity<?> hasApplied(@PathVariable("linkId") String linkId, @RequestParam("email") String email) {
        try {
            if (email == null || email.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "email is required"));
            }
            Optional<JobPosting> opt = jobRepository.findByLinkId(linkId);
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "Invalid or expired link"));
            }
            JobPosting job = opt.get();
            boolean exists = applicationRepository.existsByJob_IdAndEmailLower(job.getId(), email.trim().toLowerCase());
            return ResponseEntity.ok(Map.of("applied", exists));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to check", "message", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createJob(@CurrentUser UserPrincipal principal, @RequestBody JobRequest request) {
        try {
            User me = userService.findById(principal.getId()).orElseThrow();

            JobPosting job = new JobPosting();
            job.setRecruiter(me);
            job.setTitle(request.getTitle());
            job.setDescription(request.getDescription());
            job.setSkills(request.getSkills());
            job.setCompany(request.getCompany());
            job.setLocation(request.getLocation());
            job.setMinCgpa(request.getMinCgpa());
            job.setMinBacklogs(request.getMinBacklogs());
            job.setCtc(request.getCtc());
            job.setEmploymentType(request.getEmploymentType());
            job.setStatus("active");
            if (Boolean.FALSE.equals(request.getIsPublic())) {
                job.setIsPublic(false);
                job.setAccessCode(resolveAccessCode(request));
            } else {
                job.setIsPublic(true);
                job.setAccessCode(null);
            }

            System.out.println("DEBUG - Received startDate: " + request.getStartDate());
            System.out.println("DEBUG - Received endDate: " + request.getEndDate());

            if (request.getStartDate() != null && !request.getStartDate().isEmpty()) {
                try {
                    job.setStartDate(Instant.parse(request.getStartDate() + "T00:00:00Z"));
                } catch (Exception e) {
                    System.out.println("Error parsing startDate: " + e.getMessage());
                }
            }
            if (request.getEndDate() != null && !request.getEndDate().isEmpty()) {
                try {
                    job.setEndDate(Instant.parse(request.getEndDate() + "T23:59:59Z"));
                } catch (Exception e) {
                    System.out.println("Error parsing endDate: " + e.getMessage());
                }
            }

            System.out.println("DEBUG - Set startDate: " + job.getStartDate());
            System.out.println("DEBUG - Set endDate: " + job.getEndDate());

            JobPosting saved = jobRepository.save(job);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to create job", "message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateJob(@CurrentUser UserPrincipal principal, @PathVariable("id") Long id,
            @RequestBody JobRequest request) {
        try {
            User me = userService.findById(principal.getId()).orElseThrow();
            JobPosting job = jobRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Job not found with id: " + id));

            if (job.getRecruiter() == null || !Objects.equals(job.getRecruiter().getId(), me.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Not allowed"));
            }

            job.setTitle(request.getTitle());
            job.setDescription(request.getDescription());
            job.setSkills(request.getSkills());
            job.setLocation(request.getLocation());
            job.setMinCgpa(request.getMinCgpa());
            job.setMinBacklogs(request.getMinBacklogs());
            job.setCtc(request.getCtc());
            job.setEmploymentType(request.getEmploymentType());
            if (Boolean.FALSE.equals(request.getIsPublic())) {
                job.setIsPublic(false);
                job.setAccessCode(resolveAccessCode(request));
            } else if (Boolean.TRUE.equals(request.getIsPublic())) {
                job.setIsPublic(true);
                job.setAccessCode(null);
            }

            System.out.println("DEBUG UPDATE - Received startDate: " + request.getStartDate());
            System.out.println("DEBUG UPDATE - Received endDate: " + request.getEndDate());

            if (request.getStartDate() != null && !request.getStartDate().isEmpty()) {
                try {
                    job.setStartDate(Instant.parse(request.getStartDate() + "T00:00:00Z"));
                } catch (Exception e) {
                    System.out.println("Error parsing startDate: " + e.getMessage());
                }
            }
            if (request.getEndDate() != null && !request.getEndDate().isEmpty()) {
                try {
                    job.setEndDate(Instant.parse(request.getEndDate() + "T23:59:59Z"));
                } catch (Exception e) {
                    System.out.println("Error parsing endDate: " + e.getMessage());
                }
            }

            System.out.println("DEBUG UPDATE - Set startDate: " + job.getStartDate());
            System.out.println("DEBUG UPDATE - Set endDate: " + job.getEndDate());

            JobPosting updatedJob = jobRepository.save(job);
            return ResponseEntity.ok(updatedJob);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to update job", "message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteJob(@CurrentUser UserPrincipal principal, @PathVariable("id") Long id) {
        try {
            User me = userService.findById(principal.getId()).orElseThrow();
            Optional<JobPosting> opt = jobRepository.findById(id);
            if (opt.isEmpty())
                return ResponseEntity.status(404).body(Map.of("error", "Job not found"));
            JobPosting job = opt.get();
            if (job.getRecruiter() == null || !Objects.equals(job.getRecruiter().getId(), me.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Not allowed"));
            }

            // Delete related records first to avoid foreign key constraint violations

            // 1. Delete candidate progress records
            try {
                List<CandidateProgress> progressRecords = candidateProgressRepository.findByJobIdOrderByOverallScoreDesc(id);
                if (!progressRecords.isEmpty()) {
                    candidateProgressRepository.deleteAll(progressRecords);
                }
            } catch (Exception cpEx) {
                System.err.println("Warning: Could not delete candidate progress for job " + id + ": " + cpEx.getMessage());
            }

            // 2. Delete all rounds for this job
            try {
                roundRepository.deleteAll(roundRepository.findByJobIdOrderByRoundOrder(id));
            } catch (Exception roundEx) {
                System.err.println("Warning: Could not delete rounds for job " + id + ": " + roundEx.getMessage());
            }

            // 3. Delete all applications for this job
            List<Application> applications = applicationRepository.findByJob_IdOrderByCreatedAtDesc(id);
            if (!applications.isEmpty()) {
                applicationRepository.deleteAll(applications);
            }

            // 4. Finally delete the job itself
            jobRepository.deleteById(id);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Job and all related data deleted successfully",
                    "deletedApplications", applications.size()));
        } catch (Exception e) {
            e.printStackTrace(); // Log the full stack trace
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to delete job",
                    "message", e.getMessage(),
                    "details", "Make sure all related data can be deleted"));
        }
    }

    // Optional: applications listing used by recruiter JobHistory UI
    @GetMapping("/{id}/applications")
    public ResponseEntity<?> listApplications(@CurrentUser UserPrincipal principal, @PathVariable("id") Long id) {
        try {
            User me = userService.findById(principal.getId()).orElseThrow();
            Optional<JobPosting> opt = jobRepository.findById(id);
            if (opt.isEmpty())
                return ResponseEntity.status(404).body(Map.of("error", "Job not found"));
            JobPosting job = opt.get();
            if (job.getRecruiter() == null || !Objects.equals(job.getRecruiter().getId(), me.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Not allowed"));
            }

            var apps = applicationRepository.findByJob_IdOrderByCreatedAtDesc(id);
            return ResponseEntity.ok(apps);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Failed to list applications", "message", e.getMessage()));
        }
    }
    @GetMapping("/{id}/candidates")
    public ResponseEntity<?> listCandidates(@CurrentUser UserPrincipal principal, @PathVariable("id") Long id) {
        try {
            User me = userService.findById(principal.getId()).orElseThrow();
            Optional<JobPosting> opt = jobRepository.findById(id);
            if (opt.isEmpty())
                return ResponseEntity.status(404).body(Map.of("error", "Job not found"));
            JobPosting job = opt.get();
            if (job.getRecruiter() == null || !Objects.equals(job.getRecruiter().getId(), me.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Not allowed"));
            }

            var applications = applicationRepository.findByJob_IdOrderByCreatedAtDesc(id);

            // Transform applications to candidate format
            List<Map<String, Object>> candidates = new ArrayList<>();
            for (Application app : applications) {
                Map<String, Object> candidate = new HashMap<>();
                candidate.put("id", app.getId());
                candidate.put("name", app.getName());
                candidate.put("email", app.getEmail());
                candidate.put("college", app.getCollege());
                candidate.put("cgpa", app.getCgpa());
                candidate.put("skills", app.getSkills());
                candidate.put("profileType", app.getProfileType());
                candidate.put("isFresher", app.getIsFresher());
                candidate.put("degree", app.getDegree());
                candidate.put("company", app.getCompany());
                candidate.put("lpa", app.getLpa());
                candidate.put("yearsExp", app.getYearsExp());
                candidate.put("appliedAt", app.getCreatedAt());
                candidate.put("status", app.getStatus());
                candidates.add(candidate);
            }

            return ResponseEntity.ok(candidates);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Failed to list candidates", "message", e.getMessage()));
        }
    }


    // Public: fetch job by shareable linkId for candidate apply page
    @GetMapping("/{linkId}")
    public ResponseEntity<?> getJobByLink(@PathVariable("linkId") String linkId) {
        try {
            Optional<JobPosting> opt = jobRepository.findByLinkId(linkId);
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "Invalid or expired link"));
            }
            JobPosting job = opt.get();
            // Validate status and expiry
            if (!"active".equalsIgnoreCase(job.getStatus())) {
                return ResponseEntity.status(404).body(Map.of("message", "Invalid or expired link"));
            }
            if (job.getEndDate() != null && !job.getEndDate().isAfter(Instant.now())) {
                return ResponseEntity.status(404).body(Map.of("message", "Invalid or expired link"));
            }
            return ResponseEntity.ok(job);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to fetch job", "message", e.getMessage()));
        }
    }

    // Public: accept application submission for a job via linkId
    @PostMapping("/{linkId}/apply")
    public ResponseEntity<?> applyToJob(@PathVariable("linkId") String linkId, @RequestBody Map<String, Object> body) {
        try {
            Optional<JobPosting> opt = jobRepository.findByLinkId(linkId);
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "Invalid or expired link"));
            }
            JobPosting job = opt.get();
            // Validate status and expiry
            if (!"active".equalsIgnoreCase(job.getStatus())) {
                return ResponseEntity.status(400).body(Map.of("message", "Job is not accepting applications"));
            }
            if (job.getEndDate() != null && !job.getEndDate().isAfter(Instant.now())) {
                return ResponseEntity.status(400).body(Map.of("message", "Job has expired"));
            }

            String name = Objects.toString(body.getOrDefault("name", "")).trim();
            String email = Objects.toString(body.getOrDefault("email", "")).trim();
            if (name.isEmpty() || email.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Name and email are required"));
            }

            // Prevent duplicate by email per job
            if (applicationRepository.existsByJob_IdAndEmailLower(job.getId(), email.toLowerCase())) {
                return ResponseEntity.ok(Map.of(
                        "success", true,
                        "alreadyApplied", true,
                        "message", "You have already applied to this job.",
                        "jobId", job.getId()));
            }

            Application app = new Application();
            app.setJob(job);
            app.setName(name);
            app.setEmail(email);
            app.setProfileType(Objects.toString(body.getOrDefault("profileType", "")));
            app.setCollege(Objects.toString(body.getOrDefault("college", "")));
            // parse numbers safely
            try {
                if (body.get("cgpa") != null)
                    app.setCgpa(Double.valueOf(body.get("cgpa").toString()));
            } catch (Exception ignored) {
            }
            try {
                if (body.get("lpa") != null)
                    app.setLpa(Double.valueOf(body.get("lpa").toString()));
            } catch (Exception ignored) {
            }
            try {
                if (body.get("yearsExp") != null)
                    app.setYearsExp(Double.valueOf(body.get("yearsExp").toString()));
            } catch (Exception ignored) {
            }

            // booleans
            if (body.get("isFresher") != null) {
                app.setIsFresher(Boolean.valueOf(body.get("isFresher").toString()));
            }
            app.setDegree(Objects.toString(body.getOrDefault("degree", "")));
            app.setCompany(Objects.toString(body.getOrDefault("company", "")));

            // skills array -> comma string
            Object skillsObj = body.get("skills");
            if (skillsObj instanceof Collection<?> col) {
                String skills = col.stream().filter(Objects::nonNull).map(Object::toString).map(String::trim)
                        .filter(s -> !s.isEmpty()).distinct().reduce((a, b) -> a + "," + b).orElse("");
                app.setSkills(skills);
            } else if (skillsObj instanceof String s) {
                app.setSkills(s);
            }

            Application saved = applicationRepository.save(app);

            try {
                emailService.sendJobApplicationConfirmationEmail(
                        saved.getEmail(),
                        saved.getName(),
                        job.getTitle(),
                        job.getCompany()
                );
            } catch (Exception emailException) {
                logger.warn("Application {} saved but confirmation email failed for {}", saved.getId(), saved.getEmail(), emailException);
            }

            // Automatic Shortlisting based on alignment
            try {
                List<Application> singleAppList = List.of(saved);
                shortlistingService.shortlistCandidates(singleAppList, job);
            } catch (Exception e) {
                // Log but don't fail the application if auto-shortlisting fails
                System.err.println("Auto-shortlisting failed for application " + saved.getId() + ": " + e.getMessage());
            }

            Map<String, Object> resp = new HashMap<>();
            resp.put("success", true);
            resp.put("message", "Application submitted! Check your email for confirmation.");
            resp.put("jobId", job.getId());
            resp.put("applicationId", saved.getId());
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to apply", "message", e.getMessage()));
        }
    }

    // Shortlist candidates for a job (only before Round 1 starts)
    @GetMapping("/{id}/shortlist")
    public ResponseEntity<?> shortlistCandidates(@CurrentUser UserPrincipal principal, @PathVariable("id") Long id) {
        try {
            Optional<JobPosting> opt = jobRepository.findById(id);
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Job not found"));
            }
            JobPosting job = opt.get();

            // Check if Round 1 has started
            List<Round> rounds = roundRepository.findByJobIdOrderByRoundOrder(id);
            Round firstRound = rounds.stream()
                    .filter(r -> r.getRoundOrder() != null && r.getRoundOrder() == 1)
                    .findFirst()
                    .orElse(null);

            boolean round1Started = false;
            boolean canShortlist = true;
            String statusMessage = "";

            if (firstRound != null && firstRound.getStartTime() != null) {
                java.time.LocalDateTime now = java.time.LocalDateTime.now();
                round1Started = now.isAfter(firstRound.getStartTime());

                if (round1Started) {
                    canShortlist = false;
                    statusMessage = "Round 1 has already started. Shortlisting is disabled to prevent re-shortlisting rejected candidates.";
                }
            }

            // Get all applications for this job
            List<Application> applications = applicationRepository.findByJob_IdOrderByCreatedAtDesc(id);

            if (applications.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "shortlistedCandidates", new ArrayList<>(),
                        "stats", Map.of(
                                "totalApplications", 0,
                                "shortlistedCandidates", 0,
                                "shortlistingRate", 0.0),
                        "canShortlist", canShortlist,
                        "round1Started", round1Started,
                        "statusMessage",
                        statusMessage.isEmpty() ? "No applications found for this job" : statusMessage));
            }

            List<ShortlistedCandidateResponse> shortlistedCandidates;

            if (canShortlist) {
                // Perform shortlisting only if Round 1 hasn't started
                shortlistedCandidates = shortlistingService.shortlistCandidates(applications, job);
                statusMessage = "Shortlisting completed successfully. Candidates have been evaluated and notified.";
            } else {
                // Just show existing shortlisted candidates without re-shortlisting
                shortlistedCandidates = shortlistingService.getExistingShortlistedCandidates(applications);
            }

            // Add ranking
            for (int i = 0; i < shortlistedCandidates.size(); i++) {
                shortlistedCandidates.get(i).setRank(i + 1);
            }

            // Get statistics
            Map<String, Object> stats = shortlistingService.getShortlistingStats(applications, job);

            Map<String, Object> response = new HashMap<>();
            response.put("shortlistedCandidates", shortlistedCandidates);
            response.put("stats", stats);
            response.put("jobRequirements", Map.of(
                    "skills", job.getSkills(),
                    "minCgpa", job.getMinCgpa(),
                    "minBacklogs", job.getMinBacklogs()));
            response.put("canShortlist", canShortlist);
            response.put("round1Started", round1Started);
            response.put("statusMessage", statusMessage);

            if (firstRound != null) {
                response.put("round1Details", Map.of(
                        "title", firstRound.getTitle(),
                        "startTime", firstRound.getStartTime(),
                        "status", round1Started ? "STARTED" : "UPCOMING"));
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Failed to process shortlist request", "message", e.getMessage()));
        }
    }

    // Public endpoint for candidates to view rounds for jobs they've been
    // shortlisted for
    @GetMapping("/{id}/rounds")
    public ResponseEntity<?> getJobRounds(@PathVariable("id") Long id) {
        try {
            Optional<JobPosting> opt = jobRepository.findById(id);
            if (opt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Job not found"));
            }

            JobPosting job = opt.get();

            // Get rounds for this job
            List<Round> rounds = roundRepository.findByJobIdOrderByRoundOrder(job.getId());

            // Convert to response format
            List<Map<String, Object>> roundsResponse = new ArrayList<>();
            for (Round round : rounds) {
                Map<String, Object> roundData = new HashMap<>();
                roundData.put("_id", round.getId());
                roundData.put("id", round.getId());
                roundData.put("title", round.getTitle());
                roundData.put("description", round.getDescription());
                roundData.put("type", round.getType());
                roundData.put("topics", round.getTopics());
                roundData.put("startTime", round.getStartTime());
                roundData.put("duration", round.getDuration());
                roundData.put("mcqQuestions", round.getMcqQuestions());
                roundData.put("codingQuestions", round.getCodingQuestions());
                roundData.put("totalQuestions", round.getTotalQuestions());
                roundData.put("instructions", round.getInstructions());
                roundData.put("createdAt", round.getCreatedAt());
                roundsResponse.add(roundData);
            }

            return ResponseEntity.ok(roundsResponse);
        } catch (Exception e) {
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Failed to fetch job rounds", "message", e.getMessage()));
        }
    }
}
