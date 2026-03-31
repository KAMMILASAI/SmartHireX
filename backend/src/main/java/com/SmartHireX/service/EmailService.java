package com.SmartHireX.service;

import com.SmartHireX.dto.ContactRequest;

public interface EmailService {
    
    /**
     * Send OTP email to the specified email address
     * @param toEmail The recipient email address
     * @param otp The OTP code to send
     * @param userName The name of the user
     */
    void sendOtpEmail(String toEmail, String otp, String userName);
    
    /**
     * Send welcome email to new users
     * @param toEmail The recipient email address
     * @param userName The name of the user
     */
    void sendWelcomeEmail(String toEmail, String userName);

    /**
     * Send email indicating recruiter registration is pending admin approval
     * @param toEmail The recipient email address
     * @param userName The name of the user
     */
    void sendRecruiterPendingEmail(String toEmail, String userName);

    /**
     * Send simple text email
     * @param toEmail The recipient email address
     * @param subject The email subject
     * @param text The email content
     */
    void sendSimpleEmail(String toEmail, String subject, String text);

    /**
     * Send email when candidate is shortlisted for a job after application screening
     * @param toEmail Candidate email address
     * @param candidateName Candidate name
     * @param jobTitle Job title they applied for
     * @param companyName Company name extending the invitation
     * @param jobDetailsUrl URL to view job/shortlisted details
     */
    void sendJobShortlistedEmail(String toEmail, String candidateName, String jobTitle,
                                 String companyName, String jobDetailsUrl);

    /**
     * Notify shortlisted candidates that a new round has been scheduled.
     * @param toEmail Candidate email address
     * @param candidateName Candidate name
     * @param jobTitle Job title they are shortlisted for
     * @param roundTitle Round title (e.g., Technical Interview)
     * @param roundStartTime Human readable time window
     * @param roundType Type of round (MCQ, Coding, Interview, etc.)
     * @param roundTopics Topics that will be covered
     * @param durationMinutes Duration of the round in minutes (nullable)
     * @param shortlistUrl Direct URL to the shortlisted jobs page
     * @param reminder Whether this notification is a reminder (true) or initial schedule (false)
     */
    void sendRoundCreatedNotification(String toEmail, String candidateName, String jobTitle,
                                      String roundTitle, String roundStartTime, String roundType,
                                      String roundTopics, Integer durationMinutes, String shortlistUrl,
                                      boolean reminder);

    /**
     * Send password reset success confirmation email.
     * @param toEmail Recipient email address
     * @param userName User name
     */
    void sendPasswordResetSuccessEmail(String toEmail, String userName);

    /**
     * Send recruiter rejection email.
     * @param toEmail Recipient email address
     * @param userName Recruiter name
     * @param reason Optional rejection reason
     */
    void sendRecruiterRejectionEmail(String toEmail, String userName, String reason);

    /**
     * Send job application submitted confirmation email.
     * @param toEmail Candidate email address
     * @param candidateName Candidate name
     * @param jobTitle Job title
     * @param companyName Company name
     */
    void sendJobApplicationConfirmationEmail(String toEmail, String candidateName, String jobTitle, String companyName);

    /**
     * Send interview invitation email.
     * @param toEmail Candidate email address
     * @param candidateName Candidate name
     * @param jobTitle Job title
     * @param interviewTitle Interview title
     * @param interviewType Interview type label
     * @param scheduledDateTime Human readable scheduled date/time
     * @param durationMinutes Duration in minutes
     * @param recruiterEmail Recruiter email address
     * @param description Optional interview description
     * @param roomCode Optional room code
     * @param roomPassword Optional room password
     */
    void sendInterviewInvitationEmail(String toEmail, String candidateName, String jobTitle,
                                      String interviewTitle, String interviewType, String scheduledDateTime,
                                      Integer durationMinutes, String recruiterEmail, String description,
                                      String roomCode, String roomPassword);
    
    /**
     * Send contact form submission to admin and confirmation to the sender
     * @param contactRequest The contact form data
     */
    void sendContactEmail(ContactRequest contactRequest);
    
    /**
     * Send email when candidate is selected for next round
     * @param toEmail Candidate email address
     * @param candidateName Candidate name
     * @param jobTitle Job title
     * @param nextRound Next round number
     */
    void sendRoundSelectionEmail(String toEmail, String candidateName, String jobTitle, Integer nextRound);

    /**
     * Send final selection email.
     * @param toEmail Candidate email address
     * @param candidateName Candidate name
     * @param jobTitle Job title
     */
    void sendFinalSelectionEmail(String toEmail, String candidateName, String jobTitle);
    
    /**
     * Send email when candidate is rejected from a round
     * @param toEmail Candidate email address
     * @param candidateName Candidate name
     * @param jobTitle Job title
     * @param roundName Round name where rejected
     */
    void sendRoundRejectionEmail(String toEmail, String candidateName, String jobTitle, String roundName);

    /**
     * Send final rejection email.
     * @param toEmail Candidate email address
     * @param candidateName Candidate name
     * @param jobTitle Job title
     */
    void sendFinalRejectionEmail(String toEmail, String candidateName, String jobTitle);
}
