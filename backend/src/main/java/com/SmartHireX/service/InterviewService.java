package com.SmartHireX.service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.dto.CreateInterviewRoundRequest;
import com.SmartHireX.dto.InterviewRoundResponse;
import com.SmartHireX.model.Application;
import com.SmartHireX.model.InterviewRound;
import com.SmartHireX.model.JobPosting;
import com.SmartHireX.repository.ApplicationRepository;
import com.SmartHireX.repository.InterviewRoundRepository;
import com.SmartHireX.repository.JobRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class InterviewService {

    private static final DateTimeFormatter INTERVIEW_DATE_FORMATTER = DateTimeFormatter.ofPattern("EEE, dd MMM yyyy 'at' hh:mm a");
    
    private final InterviewRoundRepository interviewRoundRepository;
    private final JobRepository jobRepository;
    private final ApplicationRepository applicationRepository;
    private final EmailService emailService;
    
    // Using internal video call system - no external room service needed
    @Transactional
    public InterviewRoundResponse createInterviewRound(CreateInterviewRoundRequest request) {
        log.info("Creating interview round: {} for job: {}", request.getTitle(), request.getJobId());
        
        // Validate job exists
        JobPosting job = jobRepository.findById(request.getJobId())
            .orElseThrow(() -> new RuntimeException("Job not found with ID: " + request.getJobId()));
        
        // Create interview round
        InterviewRound interviewRound = new InterviewRound();
        interviewRound.setTitle(request.getTitle());
        interviewRound.setRoundType(request.getRoundType());
        interviewRound.setJobId(request.getJobId());
        interviewRound.setRecruiterEmail(request.getRecruiterEmail());
        interviewRound.setDescription(request.getDescription());
        interviewRound.setScheduledDateTime(request.getScheduledDateTime());
        interviewRound.setDurationMinutes(request.getDurationMinutes());
        interviewRound.setCandidateEmails(request.getCandidateEmails());
        
        // Create video call room if requested
        if (request.isCreateVideoRoom()) {
            // Generate room code and password for internal video call system
            String roomCode = generateMeetingCode();
            String roomPassword = request.getCustomRoomPassword() != null ? 
                request.getCustomRoomPassword() : generateRoomPassword();
            
            interviewRound.setRoomCode(roomCode);
            interviewRound.setRoomPassword(roomPassword);
            
            log.info("Generated video room code: {} for interview: {}", roomCode, request.getTitle());
            
            // Note: The actual video call session will be created when participants join
            // using the existing VideoCallController endpoints
        }
        
        // Save interview round
        InterviewRound saved = interviewRoundRepository.save(interviewRound);
        
        // Send email notifications to candidates (simplified)
        sendInterviewInvitations(saved, job);
        
        return mapToResponse(saved, job);
    }
    
    public List<InterviewRoundResponse> getInterviewsByRecruiter(String recruiterEmail) {
        List<InterviewRound> interviews = interviewRoundRepository
            .findByRecruiterEmailOrderByScheduledDateTimeDesc(recruiterEmail);
        
        return interviews.stream()
            .map(interview -> {
                JobPosting job = jobRepository.findById(interview.getJobId()).orElse(null);
                return mapToResponse(interview, job);
            })
            .collect(Collectors.toList());
    }
    
    public List<InterviewRoundResponse> getUpcomingInterviewsByRecruiter(String recruiterEmail) {
        List<InterviewRound> interviews = interviewRoundRepository
            .findUpcomingInterviewsByRecruiter(recruiterEmail, LocalDateTime.now());
        
        return interviews.stream()
            .map(interview -> {
                JobPosting job = jobRepository.findById(interview.getJobId()).orElse(null);
                return mapToResponse(interview, job);
            })
            .collect(Collectors.toList());
    }
    
    public List<InterviewRoundResponse> getTodaysInterviewsByRecruiter(String recruiterEmail) {
        List<InterviewRound> interviews = interviewRoundRepository
            .findTodaysInterviewsByRecruiter(recruiterEmail, LocalDateTime.now());
        
        return interviews.stream()
            .map(interview -> {
                JobPosting job = jobRepository.findById(interview.getJobId()).orElse(null);
                return mapToResponse(interview, job);
            })
            .collect(Collectors.toList());
    }
    
    public Optional<InterviewRoundResponse> getInterviewByRoomCode(String roomCode) {
        return interviewRoundRepository.findByRoomCode(roomCode)
            .map(interview -> {
                JobPosting job = jobRepository.findById(interview.getJobId()).orElse(null);
                return mapToResponse(interview, job);
            });
    }
    
    @Transactional
    public InterviewRoundResponse updateInterviewStatus(Long interviewId, InterviewRound.InterviewStatus status) {
        InterviewRound interview = interviewRoundRepository.findById(interviewId)
            .orElseThrow(() -> new RuntimeException("Interview not found"));
        
        interview.setStatus(status);
        InterviewRound updated = interviewRoundRepository.save(interview);
        
        JobPosting job = jobRepository.findById(interview.getJobId()).orElse(null);
        return mapToResponse(updated, job);
    }
    
    private void sendInterviewInvitations(InterviewRound interview, JobPosting job) {
        try {
            String roomDetails = interview.getRoomCode() != null ? 
                String.format("Video Call Details: Room Code: %s, Password: %s", 
                    interview.getRoomCode(), 
                    interview.getRoomPassword()) : "No video call room created";
            
            log.info("Interview invitation details:");
            log.info("Job: {}", job.getTitle());
            log.info("Interview: {}", interview.getTitle());
            log.info("Type: {}", interview.getRoundType().getDisplayName());
            log.info("Date: {}", interview.getScheduledDateTime());
            log.info("Duration: {} minutes", interview.getDurationMinutes());
            log.info("Room Details: {}", roomDetails);
            log.info("Candidates: {}", interview.getCandidateEmails());

            String formattedSchedule = interview.getScheduledDateTime() != null
                    ? interview.getScheduledDateTime().format(INTERVIEW_DATE_FORMATTER)
                    : "To be announced";

            for (String candidateEmail : interview.getCandidateEmails()) {
                try {
                    String candidateName = resolveCandidateName(candidateEmail, job.getId());
                    emailService.sendInterviewInvitationEmail(
                            candidateEmail,
                            candidateName,
                            job.getTitle(),
                            interview.getTitle(),
                            interview.getRoundType().getDisplayName(),
                            formattedSchedule,
                            interview.getDurationMinutes(),
                            interview.getRecruiterEmail(),
                            interview.getDescription(),
                            interview.getRoomCode(),
                            interview.getRoomPassword()
                    );
                } catch (Exception emailException) {
                    log.warn("Failed to send interview invitation to {}", candidateEmail, emailException);
                }
            }

            log.info("Interview invitations processed for {} candidates", interview.getCandidateEmails().size());
            
        } catch (Exception e) {
            log.error("Failed to send interview invitations: {}", e.getMessage());
        }
    }

    private String resolveCandidateName(String candidateEmail, Long jobId) {
        List<Application> applications = applicationRepository.findByEmailLowerOrderByCreatedAtDesc(candidateEmail.toLowerCase());

        return applications.stream()
                .filter(application -> application.getJob() != null && jobId.equals(application.getJob().getId()))
                .map(Application::getName)
                .filter(name -> name != null && !name.isBlank())
                .findFirst()
                .orElseGet(() -> {
                    int separatorIndex = candidateEmail.indexOf('@');
                    String fallback = separatorIndex > 0 ? candidateEmail.substring(0, separatorIndex) : candidateEmail;
                    return fallback.replace('.', ' ').trim();
                });
    }
    
    private InterviewRoundResponse mapToResponse(InterviewRound interview, JobPosting job) {
        InterviewRoundResponse response = new InterviewRoundResponse();
        response.setId(interview.getId());
        response.setTitle(interview.getTitle());
        response.setRoundType(interview.getRoundType());
        response.setJobId(interview.getJobId());
        response.setJobTitle(job != null ? job.getTitle() : "Unknown Job");
        response.setRecruiterEmail(interview.getRecruiterEmail());
        response.setDescription(interview.getDescription());
        response.setScheduledDateTime(interview.getScheduledDateTime());
        response.setDurationMinutes(interview.getDurationMinutes());
        response.setRoomCode(interview.getRoomCode());
        response.setRoomPassword(interview.getRoomPassword());
        response.setRoomId(interview.getRoomId());
        response.setStatus(interview.getStatus());
        response.setCandidateEmails(interview.getCandidateEmails());
        response.setCandidateCount(interview.getCandidateEmails().size());
        response.setCreatedAt(interview.getCreatedAt());
        response.setUpdatedAt(interview.getUpdatedAt());
        
        // Set display fields
        LocalDateTime now = LocalDateTime.now();
        response.setUpcoming(interview.getScheduledDateTime().isAfter(now));
        response.setToday(interview.getScheduledDateTime().toLocalDate().equals(now.toLocalDate()));
        response.setStatusDisplayName(interview.getStatus().name().replace("_", " "));
        response.setRoundTypeDisplayName(interview.getRoundType().getDisplayName());
        
        return response;
    }
    
    public List<InterviewRoundResponse> getInterviewsForCandidateAndJob(String candidateEmail, Long jobId) {
        try {
            // Find all interviews for the candidate, then filter by jobId
            List<InterviewRound> allInterviews = interviewRoundRepository.findInterviewsForCandidate(candidateEmail);
            List<InterviewRound> jobInterviews = allInterviews.stream()
                .filter(interview -> interview.getJobId().equals(jobId))
                .collect(Collectors.toList());
            
            // Get job details
            JobPosting job = jobRepository.findById(jobId).orElse(null);
            
            return jobInterviews.stream()
                .map(interview -> mapToResponse(interview, job))
                .collect(Collectors.toList());
                
        } catch (Exception e) {
            log.error("Error fetching interviews for candidate {} and job {}: {}", candidateEmail, jobId, e.getMessage());
            return List.of();
        }
    }
    
    public List<InterviewRoundResponse> getInterviewsForRecruiterAndJob(String recruiterEmail, Long jobId) {
        try {
            // Find interviews created by this recruiter for this job
            List<InterviewRound> interviews = interviewRoundRepository.findByRecruiterEmailAndJobIdOrderByScheduledDateTimeDesc(recruiterEmail, jobId);
            
            // Get job details
            JobPosting job = jobRepository.findById(jobId).orElse(null);
            
            return interviews.stream()
                .map(interview -> mapToResponse(interview, job))
                .collect(Collectors.toList());
                
        } catch (Exception e) {
            log.error("Error fetching interviews for recruiter {} and job {}: {}", recruiterEmail, jobId, e.getMessage());
            return List.of();
        }
    }
    
    @Transactional
    public boolean markInterviewAsCompleted(Long interviewId) {
        try {
            Optional<InterviewRound> interviewOpt = interviewRoundRepository.findById(interviewId);
            if (interviewOpt.isPresent()) {
                InterviewRound interview = interviewOpt.get();
                log.info("Marking interview round as completed: {} (ID: {})", interview.getTitle(), interviewId);
                
                // Update status to COMPLETED
                interview.setStatus(InterviewRound.InterviewStatus.COMPLETED);
                interview.setUpdatedAt(LocalDateTime.now());
                interviewRoundRepository.save(interview);
                
                log.info("Successfully marked interview round as completed: {}", interview.getTitle());
                return true;
            } else {
                log.warn("Interview round not found with ID: {}", interviewId);
                return false;
            }
        } catch (Exception e) {
            log.error("Error marking interview round {} as completed: {}", interviewId, e.getMessage());
            return false;
        }
    }
    
    @Transactional
    public boolean deleteInterviewRound(Long interviewId) {
        try {
            Optional<InterviewRound> interviewOpt = interviewRoundRepository.findById(interviewId);
            if (interviewOpt.isPresent()) {
                InterviewRound interview = interviewOpt.get();
                log.info("Deleting interview round: {} (ID: {})", interview.getTitle(), interviewId);
                
                // Delete the interview round
                interviewRoundRepository.deleteById(interviewId);
                
                log.info("Successfully deleted interview round: {}", interview.getTitle());
                return true;
            } else {
                log.warn("Interview round not found with ID: {}", interviewId);
                return false;
            }
        } catch (Exception e) {
            log.error("Error deleting interview round {}: {}", interviewId, e.getMessage());
            return false;
        }
    }
    
    private String generateMeetingCode() {
        // Generate a 6-character alphanumeric code
        return UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase();
    }
    
    private String generateRoomPassword() {
        return UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}
