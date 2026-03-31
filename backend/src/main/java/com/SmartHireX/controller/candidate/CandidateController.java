package com.SmartHireX.controller.candidate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.SmartHireX.dto.CodingChallenge;
import com.SmartHireX.entity.CandidateProfile;
import com.SmartHireX.entity.ResumeAnalysisHistory;
import com.SmartHireX.entity.User;
import com.SmartHireX.model.Application;
import com.SmartHireX.model.JobPosting;
import com.SmartHireX.repository.ApplicationRepository;
import com.SmartHireX.repository.CandidateProfileRepository;
import com.SmartHireX.repository.JobRepository;
import com.SmartHireX.repository.ResumeAnalysisHistoryRepository;
import com.SmartHireX.security.CurrentUser;
import com.SmartHireX.security.UserPrincipal;
import com.SmartHireX.service.GeminiQuestionService;
import com.SmartHireX.service.PracticeSessionService;
import com.SmartHireX.service.RoundService;
import com.SmartHireX.service.UserService;

@RestController
@RequestMapping("/candidate")
public class CandidateController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private CandidateProfileRepository candidateProfileRepository;
    
    
    @Autowired
    private PracticeSessionService practiceSessionService;

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private ApplicationRepository applicationRepository;
    
    @Autowired
    private com.SmartHireX.service.ApplicationService applicationService;

    @Autowired
    private GeminiQuestionService geminiQuestionService;
    
    @Autowired
    private RoundService roundService;

    @Autowired
    private ResumeAnalysisHistoryRepository resumeAnalysisHistoryRepository;

    @GetMapping("/test")
    public ResponseEntity<?> testEndpoint() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "Candidate endpoint is working!");
        response.put("timestamp", new java.util.Date().toString());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/applications")
    public ResponseEntity<?> getMyApplications(@CurrentUser UserPrincipal userPrincipal) {
        try {
            User user = userService.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String emailLower = user.getEmail() != null ? user.getEmail().toLowerCase() : null;
            if (emailLower == null || emailLower.isBlank()) {
                return ResponseEntity.ok(List.of());
            }

            List<Application> apps = applicationRepository.findByEmailLowerOrderByCreatedAtDesc(emailLower);

            List<Map<String, Object>> response = new ArrayList<>();
            for (Application a : apps) {
                Map<String, Object> item = new HashMap<>();
                item.put("_id", a.getId());
                item.put("id", a.getId());

                item.put("status", a.getStatus());

                item.put("appliedAt", a.getCreatedAt());
                item.put("updatedAt", null);

                JobPosting j = a.getJob();
                Map<String, Object> job = new HashMap<>();
                if (j != null) {
                    job.put("id", j.getId());
                    job.put("_id", j.getId());
                    job.put("title", j.getTitle());
                    job.put("company", j.getCompany());
                    job.put("location", j.getLocation());
                    job.put("linkId", j.getLinkId());
                    job.put("ctc", j.getCtc());
                    job.put("employmentType", j.getEmploymentType());
                }
                item.put("job", job);

                response.add(item);
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch applications");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PutMapping("/applications/update-interview-status")
    @PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> updateInterviewStatusForApplications(@RequestBody Map<String, Object> body) {
        try {
            Object emailsObj = body.get("candidateEmails");
            Object jobIdObj = body.get("jobId");
            String status = Objects.toString(body.getOrDefault("status", "")).trim();

            if (!(emailsObj instanceof List<?> emailList) || emailList.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "candidateEmails is required"));
            }
            if (jobIdObj == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "jobId is required"));
            }
            if (status.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "status is required"));
            }

            Long jobId = Long.valueOf(jobIdObj.toString());
            int updated = 0;

            for (Object e : emailList) {
                if (e == null) continue;
                String email = e.toString().trim().toLowerCase();
                if (email.isEmpty()) continue;

                List<Application> apps = applicationRepository.findByEmailLowerOrderByCreatedAtDesc(email);
                for (Application app : apps) {
                    if (app.getJob() != null && Objects.equals(app.getJob().getId(), jobId)) {
                        app.setStatus(status);
                        applicationRepository.save(app);
                        updated++;
                    }
                }
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "updatedCount", updated,
                    "status", status,
                    "jobId", jobId
            ));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to update interview status",
                    "message", e.getMessage()
            ));
        }
    }

    @GetMapping("/shortlisted-jobs")
    public ResponseEntity<?> getShortlistedJobs(@CurrentUser UserPrincipal userPrincipal) {
        try {
            User user = userService.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String emailLower = user.getEmail() != null ? user.getEmail().toLowerCase() : null;
            if (emailLower == null || emailLower.isBlank()) {
                return ResponseEntity.ok(List.of());
            }

            // Get shortlisted applications
            List<Application> shortlistedApps = applicationRepository.findByEmailLowerOrderByCreatedAtDesc(emailLower)
                    .stream()
                    .filter(app -> "shortlisted".equals(app.getStatus()))
                    .collect(Collectors.toList());

            List<Map<String, Object>> response = new ArrayList<>();
            for (Application app : shortlistedApps) {
                JobPosting job = app.getJob();
                if (job != null) {
                    Map<String, Object> jobData = new HashMap<>();
                    jobData.put("id", job.getId());
                    jobData.put("_id", job.getId());
                    jobData.put("title", job.getTitle());
                    jobData.put("company", job.getCompany());
                    jobData.put("location", job.getLocation());
                    jobData.put("ctc", job.getCtc());
                    jobData.put("employmentType", job.getEmploymentType());
                    
                    // Add rounds information
                    List<Map<String, Object>> rounds = new ArrayList<>();
                    try {
                        var jobRounds = roundService.getRoundsByJobId(job.getId());
                        for (var round : jobRounds) {
                            Map<String, Object> roundData = new HashMap<>();
                            roundData.put("id", round.getId());
                            roundData.put("_id", round.getId());
                            roundData.put("title", round.getTitle());
                            roundData.put("description", round.getDescription());
                            roundData.put("type", round.getType());
                            roundData.put("duration", round.getDuration());
                            roundData.put("startTime", round.getStartTime());
                            roundData.put("mcqQuestions", round.getMcqQuestions());
                            roundData.put("codingQuestions", round.getCodingQuestions());
                            roundData.put("totalQuestions", round.getTotalQuestions());
                            rounds.add(roundData);
                        }
                    } catch (Exception e) {
                        System.out.println("Error fetching rounds for job " + job.getId() + ": " + e.getMessage());
                    }
                    jobData.put("rounds", rounds);
                    
                    response.add(jobData);
                }
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch shortlisted jobs");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // --- Practice: MCQs generation ---
    @PostMapping("/practice/mcqs")
    public ResponseEntity<?> generateMcqs(@CurrentUser UserPrincipal userPrincipal,
                                          @RequestBody Map<String, Object> body) {
        try {
            // Ensure user exists
            User user = userService.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String tech = String.valueOf(body.getOrDefault("tech", ""));
            int num = 5;
            try { num = Integer.parseInt(String.valueOf(body.getOrDefault("num", 5))); } catch (Exception ignored) {}
            String difficulty = String.valueOf(body.getOrDefault("difficulty", "Medium"));

            // Derive technologies
            List<String> techs = Arrays.stream(tech.split(","))
                    .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
            // If not provided, fallback to user's skills or General
            if (techs.isEmpty()) {
                CandidateProfile candidateProfile = candidateProfileRepository.findByUser(user).orElse(null);
                if (candidateProfile != null && candidateProfile.getSkills() != null && !candidateProfile.getSkills().isBlank()) {
                    techs = Arrays.stream(candidateProfile.getSkills().split(","))
                            .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
                }
            }
            if (techs.isEmpty()) techs = List.of("General");

            // Fetch candidate profile for personalization
            CandidateProfile profile = candidateProfileRepository.findByUser(user).orElse(null);

            var mcqs = geminiQuestionService.generateMcqs(user, profile, techs, difficulty, Math.max(1, num));

            // Map to existing response shape expected by frontend
            List<Map<String, Object>> questions = new ArrayList<>();
            for (var q : mcqs) {
                Map<String, Object> item = new HashMap<>();
                item.put("q", q.getQuestion());
                item.put("options", q.getOptions());
                item.put("answer", q.getAnswer());
                item.put("technology", q.getTechnology());
                questions.add(item);
            }

            return ResponseEntity.ok(questions);
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of(
                    "error", "Failed to generate MCQs",
                    "message", e.getMessage()
            ));
        }
    }

    // Frontend compatibility endpoint: GET with query params
    @GetMapping("/mcqs")
    public ResponseEntity<?> generateMcqsGet(@CurrentUser UserPrincipal userPrincipal,
                                             @RequestParam(name = "topic", required = false, defaultValue = "") String topic,
                                             @RequestParam(name = "level", required = false, defaultValue = "Medium") String level,
                                             @RequestParam(name = "count", required = false, defaultValue = "5") int count) {
        try {
            User user = userService.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            List<String> techs = Arrays.stream(topic.split(","))
                    .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
            if (techs.isEmpty()) {
                CandidateProfile candidateProfile = candidateProfileRepository.findByUser(user).orElse(null);
                if (candidateProfile != null && candidateProfile.getSkills() != null && !candidateProfile.getSkills().isBlank()) {
                    techs = Arrays.stream(candidateProfile.getSkills().split(","))
                            .map(String::trim).filter(s -> !s.isEmpty()).collect(Collectors.toList());
                }
            }
            if (techs.isEmpty()) techs = List.of("General");

            CandidateProfile profile = candidateProfileRepository.findByUser(user).orElse(null);

            var mcqs = geminiQuestionService.generateMcqs(user, profile, techs, level, Math.max(1, count));

            List<Map<String, Object>> questions = new ArrayList<>();
            for (var q : mcqs) {
                Map<String, Object> item = new HashMap<>();
                item.put("q", q.getQuestion());
                item.put("options", q.getOptions());
                item.put("answer", q.getAnswer());
                item.put("technology", q.getTechnology());
                questions.add(item);
            }
            return ResponseEntity.ok(questions);
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of(
                    "error", "Failed to generate MCQs",
                    "message", e.getMessage()
            ));
        }
    }

    // --- Practice: Coding challenge generation ---
    @PostMapping("/practice/coding")
    public ResponseEntity<?> generateCoding(@CurrentUser UserPrincipal userPrincipal,
                                            @RequestBody Map<String, Object> body) {
        try {
            User user = userService.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String tech = String.valueOf(body.getOrDefault("tech", "General"));
            String difficulty = String.valueOf(body.getOrDefault("difficulty", "Medium"));
            Integer testCases = (Integer) body.getOrDefault("testCases", 10);
            String primary = Arrays.stream(tech.split(",")).map(String::trim).filter(s -> !s.isEmpty()).findFirst().orElse("General");
            CandidateProfile profile = candidateProfileRepository.findByUser(user).orElse(null);

            CodingChallenge challenge = geminiQuestionService.generateCoding(user, profile, primary, difficulty, testCases);

            Map<String, Object> coding = new HashMap<>();
            coding.put("title", challenge.getTitle());
            coding.put("description", challenge.getDescription());
            coding.put("technology", challenge.getTechnology());
            coding.put("examples", challenge.getExamples());
            coding.put("constraints", challenge.getConstraints());
            coding.put("timeComplexity", challenge.getTimeComplexity());
            coding.put("spaceComplexity", challenge.getSpaceComplexity());
            coding.put("starter", challenge.getStarter());
            coding.put("hints", challenge.getHints());

            return ResponseEntity.ok(coding);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of(
                    "error", "Failed to generate coding challenge",
                    "message", e.getMessage()
            ));
        }
    }


    @GetMapping("/jobs")
    public ResponseEntity<?> getAvailableJobs(@CurrentUser UserPrincipal userPrincipal) {
        try {
            // Ensure user exists (auth already validated)
            userService.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            List<JobPosting> allJobs = jobRepository.findByStatusOrderByCreatedAtDesc("active");
            
            // Filter to only show public jobs
            List<JobPosting> jobs = allJobs.stream()
                    .filter(job -> job.getIsPublic() != null && job.getIsPublic())
                    .collect(Collectors.toList());

            List<Map<String, Object>> response = new ArrayList<>();
            for (JobPosting j : jobs) {
                Map<String, Object> item = new HashMap<>();
                item.put("_id", j.getId());
                item.put("id", j.getId());
                item.put("title", j.getTitle());
                item.put("description", j.getDescription());
                item.put("company", j.getCompany());
                item.put("location", j.getLocation());
                // Convert comma-separated skills to array
                if (j.getSkills() != null && !j.getSkills().isBlank()) {
                    String[] parts = j.getSkills().split(",");
                    List<String> skills = new ArrayList<>();
                    for (String p : parts) {
                        String s = p.trim();
                        if (!s.isEmpty()) skills.add(s);
                    }
                    item.put("skills", skills);
                } else {
                    item.put("skills", Collections.emptyList());
                }
                item.put("startDate", j.getStartDate() != null ? j.getStartDate().toString() : null);
                item.put("endDate", j.getEndDate() != null ? j.getEndDate().toString() : null);
                item.put("posted", j.getCreatedAt() != null ? j.getCreatedAt().toString() : null);
                item.put("status", "not_applied"); // default for listing
                item.put("linkId", j.getLinkId());
                // Add expired status
                boolean isExpired = j.getEndDate() != null && j.getEndDate().isBefore(Instant.now());
                item.put("isExpired", isExpired);
                response.add(item);
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch jobs");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/jobs/access-code")
    public ResponseEntity<?> getJobByAccessCode(@CurrentUser UserPrincipal userPrincipal, @RequestBody Map<String, String> request) {
        try {
            // Ensure user exists (auth already validated)
            userService.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String accessCode = request.get("accessCode");
            if (accessCode == null || accessCode.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Access code is required"));
            }

            // Find job by access code
            List<JobPosting> allJobs = jobRepository.findActiveNonExpired(Instant.now());
            JobPosting job = allJobs.stream()
                    .filter(j -> accessCode.trim().equalsIgnoreCase(j.getAccessCode()))
                    .findFirst()
                    .orElse(null);

            if (job == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Invalid access code or job not found"));
            }

            // Check if job is private
            if (job.getIsPublic() == null || job.getIsPublic()) {
                return ResponseEntity.badRequest().body(Map.of("message", "This job is public and doesn't require an access code"));
            }

            // Return job details
            Map<String, Object> response = new HashMap<>();
            response.put("_id", job.getId());
            response.put("id", job.getId());
            response.put("title", job.getTitle());
            response.put("description", job.getDescription());
            response.put("company", job.getCompany());
            response.put("location", job.getLocation());
            
            // Convert comma-separated skills to array
            if (job.getSkills() != null && !job.getSkills().isBlank()) {
                String[] parts = job.getSkills().split(",");
                List<String> skills = new ArrayList<>();
                for (String p : parts) {
                    String s = p.trim();
                    if (!s.isEmpty()) skills.add(s);
                }
                response.put("skills", skills);
            } else {
                response.put("skills", Collections.emptyList());
            }
            
            response.put("startDate", job.getStartDate() != null ? job.getStartDate().toString() : null);
            response.put("endDate", job.getEndDate() != null ? job.getEndDate().toString() : null);
            response.put("posted", job.getCreatedAt() != null ? job.getCreatedAt().toString() : null);
            response.put("status", "not_applied");
            response.put("linkId", job.getLinkId());
            response.put("isPrivate", true);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to access job");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getProfile(@CurrentUser UserPrincipal userPrincipal) {
        try {
            User user = userService.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get or create candidate profile
            CandidateProfile candidateProfile = candidateProfileRepository.findByUser(user)
                    .orElse(new CandidateProfile());

            Map<String, Object> profile = new HashMap<>();
            profile.put("id", user.getId());
            profile.put("name", (user.getFirstName() != null ? user.getFirstName() : "") + " " + (user.getLastName() != null ? user.getLastName() : ""));
            profile.put("firstName", user.getFirstName());
            profile.put("lastName", user.getLastName());
            profile.put("email", user.getEmail());
            profile.put("phone", user.getPhone());
            profile.put("verified", user.isVerified());
            profile.put("emailVerified", user.isEmailVerified());
            profile.put("role", user.getRole().toString());
            
            // Extended profile fields from CandidateProfile entity
            profile.put("image", candidateProfile.getProfileImage() != null ? candidateProfile.getProfileImage() : "");
            profile.put("college", candidateProfile.getCollege() != null ? candidateProfile.getCollege() : "");
            profile.put("regNo", candidateProfile.getRegNo() != null ? candidateProfile.getRegNo() : "");
            profile.put("location", candidateProfile.getLocation() != null ? candidateProfile.getLocation() : "");
            profile.put("portfolio", candidateProfile.getPortfolio() != null ? candidateProfile.getPortfolio() : "");
            profile.put("github", candidateProfile.getGithub() != null ? candidateProfile.getGithub() : "");
            profile.put("linkedin", candidateProfile.getLinkedin() != null ? candidateProfile.getLinkedin() : "");
            profile.put("skills", candidateProfile.getSkills() != null ? candidateProfile.getSkills() : "");

            // Newly added fields to support application completeness
            profile.put("profileType", candidateProfile.getProfileType());
            profile.put("isFresher", candidateProfile.getIsFresher());
            profile.put("degree", candidateProfile.getDegree());
            profile.put("cgpa", candidateProfile.getCgpa());
            profile.put("company", candidateProfile.getCompany());
            profile.put("lpa", candidateProfile.getLpa());
            profile.put("yearsExp", candidateProfile.getYearsExp());
            
            return ResponseEntity.ok(profile);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch profile");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@CurrentUser UserPrincipal userPrincipal,
                                         @RequestParam Map<String, String> params,
                                         @RequestParam(required = false) MultipartFile image) {
        try {
            System.out.println("DEBUG - Profile update request received");
            System.out.println("DEBUG - Params: " + params);
            
            User user = userService.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Extract parameters from the map
            String name = params.get("name");
            String email = params.get("email");
            String phone = params.get("phone");
            String college = params.get("college");
            String regNo = params.get("regNo");
            String location = params.get("location");
            String portfolio = params.get("portfolio");
            String github = params.get("github");
            String linkedin = params.get("linkedin");
            String skills = params.get("skills");
            String profileType = params.get("profileType");
            String isFresherStr = params.get("isFresher");
            String degree = params.get("degree");
            String cgpaStr = params.get("cgpa");
            String company = params.get("company");
            String lpaStr = params.get("lpa");
            String yearsExpStr = params.get("yearsExp");

            // Update basic user fields
            if (name != null && !name.trim().isEmpty()) {
                String[] nameParts = name.trim().split(" ", 2);
                user.setFirstName(nameParts[0]);
                if (nameParts.length > 1) {
                    user.setLastName(nameParts[1]);
                } else {
                    user.setLastName("");
                }
            }
            
            if (email != null && !email.trim().isEmpty()) {
                user.setEmail(email.trim());
            }

            if (phone != null) {
                user.setPhone(phone.trim());
            }

            // Save user basic changes (name/email)
            user = userService.save(user);

            // Get or create candidate profile
            CandidateProfile candidateProfile = candidateProfileRepository.findByUser(user)
                    .orElse(new CandidateProfile());
            
            if (candidateProfile.getUser() == null) {
                candidateProfile.setUser(user);
            }

            // Update candidate profile fields
            if (college != null) candidateProfile.setCollege(college.trim());
            if (regNo != null) candidateProfile.setRegNo(regNo.trim());
            if (location != null) candidateProfile.setLocation(location.trim());
            if (portfolio != null) candidateProfile.setPortfolio(portfolio.trim());
            if (github != null) candidateProfile.setGithub(github.trim());
            if (linkedin != null) candidateProfile.setLinkedin(linkedin.trim());
            if (skills != null) candidateProfile.setSkills(skills.trim());

            // Extended fields with proper parsing
            if (profileType != null && !profileType.isBlank()) candidateProfile.setProfileType(profileType.trim());
            if (isFresherStr != null) {
                try {
                    candidateProfile.setIsFresher(Boolean.parseBoolean(isFresherStr));
                } catch (Exception ignored) {}
            }
            if (degree != null) candidateProfile.setDegree(degree.trim());
            if (cgpaStr != null && !cgpaStr.trim().isEmpty()) {
                try {
                    candidateProfile.setCgpa(Double.parseDouble(cgpaStr.trim()));
                } catch (Exception ignored) {}
            }
            if (company != null) candidateProfile.setCompany(company.trim());
            if (lpaStr != null && !lpaStr.trim().isEmpty()) {
                try {
                    candidateProfile.setLpa(Double.parseDouble(lpaStr.trim()));
                } catch (Exception ignored) {}
            }
            if (yearsExpStr != null && !yearsExpStr.trim().isEmpty()) {
                try {
                    candidateProfile.setYearsExp(Double.parseDouble(yearsExpStr.trim()));
                } catch (Exception ignored) {}
            }

            // Handle image upload
            if (image != null && !image.isEmpty()) {
                String imagePath = saveProfileImage(image, user.getId());
                candidateProfile.setProfileImage(imagePath);
            }

            // Save candidate profile
            candidateProfile = candidateProfileRepository.save(candidateProfile);

            // Return updated profile
            Map<String, Object> profile = new HashMap<>();
            profile.put("id", user.getId());
            profile.put("name", (user.getFirstName() != null ? user.getFirstName() : "") + " " + (user.getLastName() != null ? user.getLastName() : ""));
            profile.put("firstName", user.getFirstName());
            profile.put("lastName", user.getLastName());
            profile.put("email", user.getEmail());
            profile.put("phone", user.getPhone());
            profile.put("verified", user.isVerified());
            profile.put("emailVerified", user.isEmailVerified());
            profile.put("role", user.getRole().toString());
            
            // Include the updated candidate profile fields
            profile.put("image", candidateProfile.getProfileImage() != null ? candidateProfile.getProfileImage() : "");
            profile.put("college", candidateProfile.getCollege() != null ? candidateProfile.getCollege() : "");
            profile.put("regNo", candidateProfile.getRegNo() != null ? candidateProfile.getRegNo() : "");
            profile.put("location", candidateProfile.getLocation() != null ? candidateProfile.getLocation() : "");
            profile.put("portfolio", candidateProfile.getPortfolio() != null ? candidateProfile.getPortfolio() : "");
            profile.put("github", candidateProfile.getGithub() != null ? candidateProfile.getGithub() : "");
            profile.put("linkedin", candidateProfile.getLinkedin() != null ? candidateProfile.getLinkedin() : "");
            profile.put("skills", candidateProfile.getSkills() != null ? candidateProfile.getSkills() : "");

            // Newly added fields
            profile.put("profileType", candidateProfile.getProfileType());
            profile.put("isFresher", candidateProfile.getIsFresher());
            profile.put("degree", candidateProfile.getDegree());
            profile.put("cgpa", candidateProfile.getCgpa());
            profile.put("company", candidateProfile.getCompany());
            profile.put("lpa", candidateProfile.getLpa());
            profile.put("yearsExp", candidateProfile.getYearsExp());
            
            return ResponseEntity.ok(profile);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to update profile");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(@CurrentUser UserPrincipal userPrincipal) {
        try {
            User user = userService.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get candidate profile
            CandidateProfile candidateProfile = candidateProfileRepository.findByUser(user)
                    .orElse(new CandidateProfile());
            
            if (candidateProfile.getUser() == null) {
                candidateProfile.setUser(user);
                candidateProfile = candidateProfileRepository.save(candidateProfile);
            }

            Map<String, Object> dashboard = new HashMap<>();
            dashboard.put("id", user.getId());
            dashboard.put("name", (user.getFirstName() != null ? user.getFirstName() : "") + " " + (user.getLastName() != null ? user.getLastName() : ""));
            dashboard.put("email", user.getEmail());
            dashboard.put("college", candidateProfile.getCollege() != null ? candidateProfile.getCollege() : "");
            dashboard.put("regNo", candidateProfile.getRegNo() != null ? candidateProfile.getRegNo() : "");
            dashboard.put("location", candidateProfile.getLocation() != null ? candidateProfile.getLocation() : "");
            dashboard.put("portfolio", candidateProfile.getPortfolio() != null ? candidateProfile.getPortfolio() : "");
            dashboard.put("github", candidateProfile.getGithub() != null ? candidateProfile.getGithub() : "");
            dashboard.put("linkedin", candidateProfile.getLinkedin() != null ? candidateProfile.getLinkedin() : "");
            dashboard.put("skills", candidateProfile.getSkills() != null ? candidateProfile.getSkills() : "");
            dashboard.put("image", candidateProfile.getProfileImage() != null ? candidateProfile.getProfileImage() : "");
            dashboard.put("resumeScore", candidateProfile.getResumeScore() != null ? candidateProfile.getResumeScore() : 0);
            dashboard.put("interviewsAttended", candidateProfile.getInterviewsAttended() != null ? candidateProfile.getInterviewsAttended() : 0);
            dashboard.put("practiceSessionsCompleted", (int) practiceSessionService.getTotalSessionCount(user));
            dashboard.put("dailyStreak", practiceSessionService.calculateDailyStreak(user));
            
            return ResponseEntity.ok(dashboard);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch dashboard data");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }


    @GetMapping("/resume-score-history")
    public ResponseEntity<?> getResumeScoreHistory(@CurrentUser UserPrincipal userPrincipal) {
        try {
            User user = userService.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            CandidateProfile candidateProfile = candidateProfileRepository.findByUser(user)
                    .orElse(new CandidateProfile());

            // Prefer real analysis history from resume_analysis_history table.
            List<Map<String, Object>> history = new ArrayList<>();

            List<ResumeAnalysisHistory> savedHistory =
                    resumeAnalysisHistoryRepository.findByUserEmailOrderByCreatedAtDesc(user.getEmail());

            if (savedHistory != null && !savedHistory.isEmpty()) {
                for (int i = savedHistory.size() - 1; i >= 0; i--) {
                    ResumeAnalysisHistory item = savedHistory.get(i);
                    Integer scoreValue = item.getOverallScore() == null ? Integer.valueOf(0) : item.getOverallScore();
                    Map<String, Object> record = new HashMap<>();
                    record.put("period", "Analysis " + (savedHistory.size() - i));
                    record.put("score", scoreValue);
                    record.put("overallScore", scoreValue);
                    record.put("label", item.getCreatedAt() != null ? item.getCreatedAt().toLocalDate().toString() : "Latest");
                    record.put("createdAt", item.getCreatedAt());
                    history.add(record);
                }
            } else if (candidateProfile.getResumeScore() != null && candidateProfile.getResumeScore() > 0) {
                // Fallback for old data where only candidate_profiles.resume_score exists.
                Map<String, Object> current = new HashMap<>();
                current.put("period", "Current Resume");
                current.put("score", candidateProfile.getResumeScore());
                current.put("overallScore", candidateProfile.getResumeScore());
                current.put("label", "Latest");
                current.put("createdAt", candidateProfile.getUpdatedAt());
                history.add(current);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("history", history);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch resume score history");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/resume-check")
    public ResponseEntity<?> checkResume(
            @RequestParam("resume") MultipartFile resume,
            @RequestParam("jobDescription") String jobDescription,
            @CurrentUser User currentUser) {
        try {
            // Return error - AI resume analysis not implemented
            Map<String, Object> response = new HashMap<>();
            response.put("error", "AI resume analysis service is not available");
            response.put("message", "This feature requires AI service integration");
            response.put("score", 0);
            response.put("strengths", new ArrayList<>());
            response.put("weaknesses", new ArrayList<>());
            
            return ResponseEntity.status(503).body(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to analyze resume");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    private String saveProfileImage(MultipartFile image, Long userId) throws IOException {
        // Create uploads directory if it doesn't exist
        String uploadDir = "uploads/profiles/";
        Path uploadPath = Paths.get(uploadDir);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Generate unique filename
        String originalFilename = image.getOriginalFilename();
        String extension = originalFilename != null ? originalFilename.substring(originalFilename.lastIndexOf(".")) : ".jpg";
        String filename = "profile_" + userId + "_" + System.currentTimeMillis() + extension;
        
        // Save file
        Path filePath = uploadPath.resolve(filename);
        Files.copy(image.getInputStream(), filePath);
        
        // Return relative path
        return "/uploads/profiles/" + filename;
    }
    
    /**
     * Manual endpoint to trigger auto-rejection process for testing
     * This will process all ended rounds and reject applications for non-attempts
     */
    @PostMapping("/process-ended-rounds")
    public ResponseEntity<?> processEndedRounds(@CurrentUser UserPrincipal userPrincipal) {
        try {
            // Trigger the auto-rejection process manually
            applicationService.processEndedRounds();
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Auto-rejection process completed successfully");
            response.put("status", "success");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to process ended rounds");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}
