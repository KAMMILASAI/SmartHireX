package com.SmartHireX.service.impl;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import com.SmartHireX.dto.ContactRequest;
import com.SmartHireX.service.EmailService;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailServiceImpl implements EmailService {

    private static final Logger logger = LoggerFactory.getLogger(EmailServiceImpl.class);

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Override
    public void sendOtpEmail(String toEmail, String otp, String userName) {
        try {
            logger.info("Preparing to send OTP email to: {} for user: {}", toEmail, userName);
            
            if (mailSender == null) {
                logger.error("JavaMailSender is null - email configuration issue");
                throw new RuntimeException("Email service not properly configured");
            }
            
            if (fromEmail == null || fromEmail.isEmpty()) {
                logger.error("From email is not configured");
                throw new RuntimeException("From email not configured");
            }
            
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("SmartHireX - Your OTP Code");

            String htmlContent = buildOtpEmailTemplate(userName, otp);
            helper.setText(htmlContent, true);

            logger.info("Sending OTP email from: {} to: {}", fromEmail, toEmail);
            mailSender.send(message);
            logger.info("OTP email sent successfully to: {}", toEmail);
        } catch (MessagingException e) {
            logger.error("MessagingException while sending OTP email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send OTP email due to messaging error: " + e.getMessage(), e);
        } catch (Exception e) {
            logger.error("Unexpected error while sending OTP email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send OTP email: " + e.getMessage(), e);
        }
    }

    @Override
    public void sendWelcomeEmail(String toEmail, String userName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Welcome to SmartHireX!");

            String htmlContent = buildWelcomeEmailTemplate(userName);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("Welcome email sent successfully to: {}", toEmail);
        } catch (MessagingException e) {
            logger.error("Failed to send welcome email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send welcome email", e);
        }
    }

    @Override
    public void sendRecruiterPendingEmail(String toEmail, String userName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("SmartHireX - Recruiter Registration Pending Approval");

            String htmlContent = buildRecruiterPendingEmailTemplate(userName);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("Recruiter pending approval email sent successfully to: {}", toEmail);
        } catch (MessagingException e) {
            logger.error("Failed to send recruiter pending email to: {}", toEmail, e);
            throw new RuntimeException("Failed to send recruiter pending email", e);
        }
    }

    @Override
    public void sendSimpleEmail(String toEmail, String subject, String text) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(text);
        mailSender.send(message);
    }

    @Override
    public void sendJobShortlistedEmail(String toEmail, String candidateName, String jobTitle,
                                        String companyName, String jobDetailsUrl) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Congratulations! You're shortlisted for " + jobTitle + " at " + companyName);

            String htmlContent = buildJobShortlistEmailTemplate(candidateName, jobTitle, companyName, jobDetailsUrl);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("Job shortlist email sent to {} for job {}", toEmail, jobTitle);
        } catch (MessagingException e) {
            logger.error("Failed to send job shortlist email to {} for job {}", toEmail, jobTitle, e);
            throw new RuntimeException("Failed to send job shortlist email", e);
        }
    }

    @Override
    public void sendRoundCreatedNotification(String toEmail, String candidateName, String jobTitle,
                                             String roundTitle, String roundStartTime, String roundType,
                                             String roundTopics, Integer durationMinutes, String shortlistUrl,
                                             boolean reminder) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true);

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            String subject = reminder
                    ? "Reminder: " + roundTitle + " for " + jobTitle + " begins soon"
                    : "New " + jobTitle + " round scheduled: " + roundTitle;
            helper.setSubject(subject);

            String htmlContent = buildRoundCreatedEmailTemplate(
                    candidateName,
                    jobTitle,
                    roundTitle,
                    roundStartTime,
                    roundType,
                    roundTopics,
                    durationMinutes,
                    shortlistUrl,
                    reminder
            );
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info("Round created notification sent to {} for job {}", toEmail, jobTitle);
        } catch (MessagingException e) {
            logger.error("Failed to send round created notification to {} for job {}", toEmail, jobTitle, e);
            throw new RuntimeException("Failed to send round created notification email", e);
        }
    }

    @Override
    public void sendPasswordResetSuccessEmail(String toEmail, String userName) {
        String subject = "SmartHireX - Your password was reset successfully";
        String htmlContent = buildPasswordResetSuccessEmailTemplate(userName, toEmail);
        sendHtmlEmail(toEmail, subject, htmlContent,
                "Password reset success email sent successfully to: {}",
                "Failed to send password reset success email to: {}");
    }

    @Override
    public void sendRecruiterRejectionEmail(String toEmail, String userName, String reason) {
        String subject = "SmartHireX - Recruiter application update";
        String htmlContent = buildRecruiterRejectionEmailTemplate(userName, reason, toEmail);
        sendHtmlEmail(toEmail, subject, htmlContent,
                "Recruiter rejection email sent successfully to: {}",
                "Failed to send recruiter rejection email to: {}");
    }

    @Override
    public void sendJobApplicationConfirmationEmail(String toEmail, String candidateName, String jobTitle, String companyName) {
        String subject = "Application received for " + jobTitle;
        String htmlContent = buildJobApplicationConfirmationEmailTemplate(candidateName, jobTitle, companyName, toEmail);
        sendHtmlEmail(toEmail, subject, htmlContent,
                "Job application confirmation email sent successfully to: {}",
                "Failed to send job application confirmation email to: {}");
    }

    @Override
    public void sendInterviewInvitationEmail(String toEmail, String candidateName, String jobTitle,
                                             String interviewTitle, String interviewType, String scheduledDateTime,
                                             Integer durationMinutes, String recruiterEmail, String description,
                                             String roomCode, String roomPassword) {
        String subject = "Interview invitation: " + interviewTitle + " for " + jobTitle;
        String htmlContent = buildInterviewInvitationEmailTemplate(
                candidateName,
                jobTitle,
                interviewTitle,
                interviewType,
                scheduledDateTime,
                durationMinutes,
                recruiterEmail,
                description,
                roomCode,
                roomPassword,
                toEmail
        );
        sendHtmlEmail(toEmail, subject, htmlContent,
                "Interview invitation email sent successfully to: {}",
                "Failed to send interview invitation email to: {}");
    }

    @Override
    public void sendContactEmail(ContactRequest contactRequest) {
        try {
            sendContactConfirmationEmail(contactRequest);
            sendContactNotificationToAdmin(contactRequest);
            logger.info("Contact form submission processed successfully from: {}", contactRequest.getEmail());
        } catch (Exception e) {
            logger.error("Failed to process contact form submission from: {}", contactRequest.getEmail(), e);
            throw new RuntimeException("Failed to process contact form submission", e);
        }
    }

    private void sendContactNotificationToAdmin(ContactRequest contactRequest) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);

        helper.setFrom(fromEmail);
        helper.setTo(fromEmail);
        helper.setSubject("New Contact Form Submission: " + contactRequest.getSubject());

        String htmlContent = buildContactNotificationEmail(contactRequest);
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }

    private void sendContactConfirmationEmail(ContactRequest contactRequest) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true);

        helper.setFrom(fromEmail);
        helper.setTo(contactRequest.getEmail());
        helper.setSubject("Thank you for contacting SmartHireX");

        String htmlContent = buildContactConfirmationEmail(contactRequest);
        helper.setText(htmlContent, true);

        mailSender.send(message);
    }

    private String buildContactConfirmationEmail(ContactRequest contactRequest) {
        return "<div style='font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;'>" +
               "    <h2 style='color: #4f46e5;'>Thank you for contacting SmartHireX!</h2>" +
               "    <p>Dear " + contactRequest.getName() + ",</p>" +
               "    <p>We have received your message and our team will get back to you as soon as possible.</p>" +
               "    <div style='background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;'>" +
               "        <p><strong>Your Message:</strong></p>" +
               "        <p>" + contactRequest.getMessage().replace("\n", "<br>") + "</p>" +
               "    </div>" +
               "    <p>If you have any further questions, please don't hesitate to reply to this email.</p>" +
               "    <p>Best regards,<br>The SmartHireX Team</p>" +
               "    <div style='margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280;'>" +
               "        <p>This is an automated message. Please do not reply to this email.</p>" +
               "    </div>" +
               "</div>";
    }

    private String buildContactNotificationEmail(ContactRequest contactRequest) {
        return "<div style='font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto;'>" +
               "    <h2 style='color: #4f46e5;'>New Contact Form Submission</h2>" +
               "    <p>You have received a new message from the SmartHireX contact form:</p>" +
               "    <div style='background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;'>" +
               "        <p><strong>From:</strong> " + contactRequest.getName() + " &lt;" + contactRequest.getEmail() + "&gt;</p>" +
               "        <p><strong>Subject:</strong> " + contactRequest.getSubject() + "</p>" +
               "        <p><strong>Message:</strong></p>" +
               "        <p>" + contactRequest.getMessage().replace("\n", "<br>") + "</p>" +
               "    </div>" +
               "    <p>Please respond to this inquiry at your earliest convenience.</p>" +
               "    <p>Best regards,<br>SmartHireX System</p>" +
               "</div>";
    }

    private String buildJobShortlistEmailTemplate(String candidateName, String jobTitle,
                                                 String companyName, String jobDetailsUrl) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>Shortlisted for %s</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #f0f0f0; background: #121826; }
                    .container { max-width: 600px; margin: 0 auto; padding: 24px; background: #1c2233; border-radius: 12px; }
                    h1 { color: #60a5fa; }
                    p { color: #d1d5db; }
                    a.cta { display: inline-block; margin-top: 20px; padding: 12px 28px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; }
                </style>
            </head>
            <body>
                <div class=\"container\">
                    <h1>Congratulations, %s!</h1>
                    <p>You've been shortlisted for the <strong>%s</strong> role at <strong>%s</strong>. Your profile stood out to our team and we'd love to move you forward in the hiring journey.</p>
                    <p>To review the job details, your status, and upcoming steps, visit your candidate portal.</p>
                    <a class=\"cta\" href=\"%s\" target=\"_blank\" rel=\"noopener\">View Job & Next Steps</a>
                    <p style=\"margin-top: 24px;\">Best of luck!<br/>%s Talent Team</p>
                </div>
            </body>
            </html>
            """, jobTitle, candidateName, jobTitle, companyName, jobDetailsUrl, companyName);
    }

    private String buildRoundCreatedEmailTemplate(String candidateName, String jobTitle,
                                                  String roundTitle, String roundStartTime, String roundType,
                                                  String roundTopics, Integer durationMinutes, String shortlistUrl,
                                                  boolean reminder) {
        String displayTime = (roundStartTime == null || roundStartTime.isBlank()) ? "(Schedule to be announced)" : roundStartTime;
        String displayType = (roundType == null || roundType.isBlank()) ? "Upcoming Assessment" : roundType;
        String displayTopics = (roundTopics == null || roundTopics.isBlank()) ? "Key focus areas will be shared on your portal." : roundTopics;
        String displayDuration = durationMinutes != null && durationMinutes > 0
                ? durationMinutes + " minute session"
                : "Flexible duration";
        String greeting = reminder
                ? "This is a friendly reminder that your next round is about to begin."
                : "You're receiving this update because you've been shortlisted for the role.";
        String prepLine = reminder
                ? "Please join a few minutes early, review the instructions, and ensure your environment is ready."
                : "A new round has just been scheduled and we want you to feel fully prepared.";
        String ctaLabel = reminder ? "Join & Review Instructions" : "View Shortlisted Jobs";

        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset=\"UTF-8\">
                <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">
                <title>Upcoming %s round</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #f0f0f0; background: #121826; margin: 0; padding: 0; }
                    .container { max-width: 640px; margin: 0 auto; padding: 28px; background: #1c2233; border-radius: 12px; }
                    h1 { color: #60a5fa; margin-bottom: 12px; }
                    p { color: #d1d5db; }
                    .round-info { background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.35); border-radius: 10px; padding: 20px; margin: 24px 0; }
                    .round-info p { margin: 6px 0; }
                    .cta { display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #2563eb, #7c3aed); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
                    .footer { margin-top: 28px; font-size: 12px; color: #6b7280; text-align: center; }
                </style>
            </head>
            <body>
                <div class=\"container\">
                    <h1>New round scheduled for %s</h1>
                    <p>Hi %s,</p>
                    <p>%s <strong>%s</strong>. %s</p>

                    <div class=\"round-info\">
                        <p><strong>Round:</strong> %s</p>
                        <p><strong>Schedule:</strong> %s</p>
                        <p><strong>Duration:</strong> %s</p>
                        <p><strong>Format:</strong> %s</p>
                        <p><strong>Focus Areas:</strong> %s</p>
                    </div>

                    <p>Head over to your SmartHireX candidate portal to review the full brief, instructions, and preparation resources. Please ensure you test your setup and arrive at least 10 minutes early for check-in.</p>

                    <a class=\"cta\" href=\"%s\" target=\"_blank\" rel=\"noopener\">%s</a>

                    <div class=\"footer\">
                        <p>This reminder was sent automatically by SmartHireX. For support, reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
            """, jobTitle, jobTitle, candidateName, greeting, jobTitle, prepLine, roundTitle, displayTime, displayDuration, displayType, displayTopics, shortlistUrl, ctaLabel);
    }

    private String buildOtpEmailTemplate(String userName, String otp) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>SmartHireX OTP</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
                    .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SmartHireX</h1>
                        <p>Your OTP Verification Code</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <p>You requested an OTP for authentication. Please use the code below to complete your verification:</p>
                        
                        <div class="otp-box">
                            <div class="otp-code">%s</div>
                        </div>
                        
                        <p><strong>Important:</strong></p>
                        <ul>
                            <li>This OTP is valid for 10 minutes only</li>
                            <li>Do not share this code with anyone</li>
                            <li>If you didn't request this code, please ignore this email</li>
                        </ul>
                        
                        <p>If you have any questions, please contact our support team.</p>
                        
                        <div class="footer">
                            <p>© 2024 SmartHireX. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, userName, otp);
    }

    private String buildWelcomeEmailTemplate(String userName) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Welcome to SmartHireX</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .welcome-box { background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; border: 1px solid #ddd; }
                    .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Welcome to SmartHireX!</h1>
                        <p>Your journey to smart hiring begins now</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <p>Welcome to SmartHireX! We're excited to have you on board.</p>
                        
                        <div class="welcome-box">
                            <h3>🎉 Account Successfully Created!</h3>
                            <p>Your account has been successfully created and verified. You can now access all features of SmartHireX.</p>
                        </div>
                        
                        <p><strong>What's next?</strong></p>
                        <ul>
                            <li>Complete your profile to get better job matches</li>
                            <li>Browse through thousands of job opportunities</li>
                            <li>Connect with top employers</li>
                            <li>Track your application progress</li>
                        </ul>
                        
                        <div style="text-align: center;">
                            <a href="http://localhost:5173/dashboard" class="cta-button">Get Started</a>
                        </div>
                        
                        <p>If you have any questions or need assistance, our support team is here to help!</p>
                        
                        <div class="footer">
                            <p>© 2024 SmartHireX. All rights reserved.</p>
                            <p>This email was sent to %s</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, userName, userName);
    }

    private String buildRecruiterPendingEmailTemplate(String userName) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Recruiter Registration Pending</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #f59e0b 0%%, #ef4444 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .status-box { background: white; padding: 20px; text-align: left; margin: 20px 0; border-radius: 10px; border: 1px solid #ddd; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>SmartHireX</h1>
                        <p>Recruiter Registration Pending Approval</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <p>Thank you for registering as a recruiter on SmartHireX.</p>
                        <div class="status-box">
                            <p>Your account is currently <strong>pending admin approval</strong>. Our team will review your request shortly.</p>
                            <p>You'll receive a confirmation email once your account is approved and activated.</p>
                        </div>
                        <p>In the meantime, feel free to explore our platform. You will gain full recruiter access after approval.</p>
                        <p>If you have any questions, contact our support team.</p>
                        <div class="footer">
                            <p>© 2024 SmartHireX. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, userName);
    }
    
    @Override
    public void sendRoundSelectionEmail(String toEmail, String candidateName, String jobTitle, Integer nextRound) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("🎉 Congratulations! You've been selected for Round " + nextRound);
            
            String htmlContent = buildRoundSelectionEmailTemplate(candidateName, jobTitle, nextRound, toEmail);
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
            logger.info("Round selection email sent successfully to: {}", toEmail);
            
        } catch (Exception e) {
            logger.error("Failed to send round selection email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send round selection email", e);
        }
    }

    @Override
    public void sendFinalSelectionEmail(String toEmail, String candidateName, String jobTitle) {
        String subject = "Final selection update for " + jobTitle;
        String htmlContent = buildFinalSelectionEmailTemplate(candidateName, jobTitle, toEmail);
        sendHtmlEmail(toEmail, subject, htmlContent,
                "Final selection email sent successfully to: {}",
                "Failed to send final selection email to: {}");
    }
    
    @Override
    public void sendRoundRejectionEmail(String toEmail, String candidateName, String jobTitle, String roundName) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("Update on your application for " + jobTitle);
            
            String htmlContent = buildRoundRejectionEmailTemplate(candidateName, jobTitle, roundName, toEmail);
            helper.setText(htmlContent, true);
            
            mailSender.send(message);
            logger.info("Round rejection email sent successfully to: {}", toEmail);
            
        } catch (Exception e) {
            logger.error("Failed to send round rejection email to {}: {}", toEmail, e.getMessage());
            throw new RuntimeException("Failed to send round rejection email", e);
        }
    }

    @Override
    public void sendFinalRejectionEmail(String toEmail, String candidateName, String jobTitle) {
        String subject = "Final update on your application for " + jobTitle;
        String htmlContent = buildFinalRejectionEmailTemplate(candidateName, jobTitle, toEmail);
        sendHtmlEmail(toEmail, subject, htmlContent,
                "Final rejection email sent successfully to: {}",
                "Failed to send final rejection email to: {}");
    }

    private void sendHtmlEmail(String toEmail, String subject, String htmlContent,
                               String successLogMessage, String failureLogMessage) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            logger.info(successLogMessage, toEmail);
        } catch (Exception e) {
            logger.error(failureLogMessage, toEmail, e);
            throw new RuntimeException("Failed to send email", e);
        }
    }
    
    private String buildRoundSelectionEmailTemplate(String candidateName, String jobTitle, Integer nextRound, String toEmail) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Selected for Next Round</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #10b981 0%%, #3b82f6 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .success-box { background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; border: 2px solid #10b981; }
                    .cta-button { background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎉 Congratulations!</h1>
                        <p>You've been selected for the next round</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <p>Great news! You have successfully cleared the previous round and have been selected to proceed further.</p>
                        
                        <div class="success-box">
                            <h3>✅ Selected for Round %d</h3>
                            <p><strong>Position:</strong> %s</p>
                            <p>You have demonstrated excellent skills and we're excited to see you progress in our hiring process.</p>
                        </div>
                        
                        <p><strong>What's next?</strong></p>
                        <ul>
                            <li>Check your dashboard for round details and schedule</li>
                            <li>Prepare for the upcoming assessment</li>
                            <li>You'll receive further instructions soon</li>
                        </ul>
                        
                        <div style="text-align: center;">
                            <a href="http://localhost:5173/candidate/shortlisted-jobs" class="cta-button">View Dashboard</a>
                        </div>
                        
                        <p>Best of luck for the next round!</p>
                        
                        <div class="footer">
                            <p>© 2024 SmartHireX. All rights reserved.</p>
                            <p>This email was sent to %s</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, candidateName, nextRound, jobTitle, toEmail);
    }

    private String buildPasswordResetSuccessEmailTemplate(String userName, String toEmail) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Password Reset Successful</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #2563eb 0%%, #10b981 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border: 1px solid #d1d5db; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Updated</h1>
                        <p>Your SmartHireX account is secured with a new password</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <div class="info-box">
                            <p>Your password was reset successfully.</p>
                            <p>If you made this change, you can continue signing in with your new password immediately.</p>
                        </div>
                        <p>If you did not reset your password, please contact SmartHireX support right away and secure your email account as well.</p>
                        <div class="footer">
                            <p>© 2024 SmartHireX. All rights reserved.</p>
                            <p>This email was sent to %s</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, userName, toEmail);
    }

    private String buildRecruiterRejectionEmailTemplate(String userName, String reason, String toEmail) {
        String reviewNote = (reason == null || reason.isBlank())
                ? "At this time, we are unable to approve your recruiter registration."
                : "At this time, we are unable to approve your recruiter registration for the following reason: " + reason;

        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Recruiter Application Update</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #6b7280 0%%, #374151 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border: 1px solid #d1d5db; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Recruiter Application Update</h1>
                        <p>Thank you for your interest in SmartHireX</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <div class="info-box">
                            <p>%s</p>
                        </div>
                        <p>You are welcome to register again in the future once the required details are available or updated.</p>
                        <p>If you believe this was a mistake, please contact the SmartHireX support team.</p>
                        <div class="footer">
                            <p>© 2024 SmartHireX. All rights reserved.</p>
                            <p>This email was sent to %s</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, userName, reviewNote, toEmail);
    }

    private String buildJobApplicationConfirmationEmailTemplate(String candidateName, String jobTitle,
                                                                String companyName, String toEmail) {
        String displayCompanyName = (companyName == null || companyName.isBlank()) ? "the hiring team" : companyName;

        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Application Received</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #1d4ed8 0%%, #06b6d4 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border: 1px solid #d1d5db; }
                    .cta-button { background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Application Received</h1>
                        <p>We have received your application successfully</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <div class="info-box">
                            <p>Your application for <strong>%s</strong> with <strong>%s</strong> has been submitted successfully.</p>
                        </div>
                        <p>Our team will review your profile and contact you if you are shortlisted for the next step.</p>
                        <div style="text-align: center;">
                            <a href="http://localhost:5173/candidate/applications" class="cta-button">Track Applications</a>
                        </div>
                        <div class="footer">
                            <p>© 2024 SmartHireX. All rights reserved.</p>
                            <p>This email was sent to %s</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, candidateName, jobTitle, displayCompanyName, toEmail);
    }

    private String buildInterviewInvitationEmailTemplate(String candidateName, String jobTitle,
                                                         String interviewTitle, String interviewType,
                                                         String scheduledDateTime, Integer durationMinutes,
                                                         String recruiterEmail, String description,
                                                         String roomCode, String roomPassword, String toEmail) {
        String displayDuration = durationMinutes != null && durationMinutes > 0
                ? durationMinutes + " minutes"
                : "Flexible duration";
        String displayDescription = (description == null || description.isBlank())
                ? "Please review the role details and be ready a few minutes before the scheduled time."
                : description;
        String roomDetails = (roomCode == null || roomCode.isBlank())
                ? "Interview joining details will be shared on your dashboard."
                : "Room Code: <strong>" + roomCode + "</strong>" +
                  ((roomPassword == null || roomPassword.isBlank()) ? "" : "<br/>Room Password: <strong>" + roomPassword + "</strong>");

        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Interview Invitation</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 640px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #0f766e 0%%, #2563eb 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border: 1px solid #d1d5db; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Interview Invitation</h1>
                        <p>You have been invited to the next hiring stage</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <p>You have been invited to attend <strong>%s</strong> for the <strong>%s</strong> role.</p>
                        <div class="info-box">
                            <p><strong>Interview:</strong> %s</p>
                            <p><strong>Format:</strong> %s</p>
                            <p><strong>Scheduled time:</strong> %s</p>
                            <p><strong>Duration:</strong> %s</p>
                            <p><strong>Recruiter contact:</strong> %s</p>
                        </div>
                        <div class="info-box">
                            <p><strong>Notes:</strong><br/>%s</p>
                        </div>
                        <div class="info-box">
                            <p><strong>Joining details:</strong><br/>%s</p>
                        </div>
                        <p>Please be available at least 10 minutes before the scheduled time and keep your setup ready.</p>
                        <div class="footer">
                            <p>© 2024 SmartHireX. All rights reserved.</p>
                            <p>This email was sent to %s</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, candidateName, interviewTitle, jobTitle, interviewTitle, interviewType, scheduledDateTime,
                displayDuration, recruiterEmail, displayDescription, roomDetails, toEmail);
    }

    private String buildFinalSelectionEmailTemplate(String candidateName, String jobTitle, String toEmail) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Final Selection</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #059669 0%%, #2563eb 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .success-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border: 2px solid #10b981; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Congratulations</h1>
                        <p>You have been finally selected</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <div class="success-box">
                            <p>We are pleased to inform you that you have been finally selected for the <strong>%s</strong> role.</p>
                        </div>
                        <p>The recruiter or hiring team will contact you with the next formal steps shortly.</p>
                        <div class="footer">
                            <p>© 2024 SmartHireX. All rights reserved.</p>
                            <p>This email was sent to %s</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, candidateName, jobTitle, toEmail);
    }
    
    private String buildRoundRejectionEmailTemplate(String candidateName, String jobTitle, String roundName, String toEmail) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Application Update</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #6b7280 0%%, #374151 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; border: 1px solid #d1d5db; }
                    .cta-button { background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Application Update</h1>
                        <p>Thank you for your interest</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <p>Thank you for your participation in our hiring process for the <strong>%s</strong> position.</p>
                        
                        <div class="info-box">
                            <h3>Update on %s</h3>
                            <p>After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current requirements.</p>
                        </div>
                        
                        <p>We want to thank you for the time and effort you invested in this process. Your skills and experience are valuable, and we encourage you to:</p>
                        <ul>
                            <li>Continue exploring opportunities on our platform</li>
                            <li>Apply for future positions that match your profile</li>
                            <li>Keep enhancing your skills and experience</li>
                        </ul>
                        
                        <div style="text-align: center;">
                            <a href="http://localhost:5173/candidate/jobs" class="cta-button">Explore More Jobs</a>
                        </div>
                        
                        <p>We wish you all the best in your career journey!</p>
                        
                        <div class="footer">
                            <p>© 2024 SmartHireX. All rights reserved.</p>
                            <p>This email was sent to %s</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, candidateName, jobTitle, roundName, toEmail);
    }

    private String buildFinalRejectionEmailTemplate(String candidateName, String jobTitle, String toEmail) {
        return String.format("""
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Final Application Update</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #6b7280 0%%, #374151 100%%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                    .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; border: 1px solid #d1d5db; }
                    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Final Application Update</h1>
                        <p>Thank you for completing the SmartHireX process</p>
                    </div>
                    <div class="content">
                        <h2>Hello %s!</h2>
                        <div class="info-box">
                            <p>Thank you for your time and effort throughout the hiring process for the <strong>%s</strong> role.</p>
                            <p>After final review, we have decided to move forward with another candidate.</p>
                        </div>
                        <p>We appreciate your interest and encourage you to continue applying for future roles on SmartHireX.</p>
                        <div class="footer">
                            <p>© 2024 SmartHireX. All rights reserved.</p>
                            <p>This email was sent to %s</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """, candidateName, jobTitle, toEmail);
    }
}
