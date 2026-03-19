package com.SmartHireX.service.impl;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.SmartHireX.entity.OTP;
import com.SmartHireX.repository.OTPRepository;
import com.SmartHireX.service.EmailService;
import com.SmartHireX.service.OTPService;

@Service
public class OTPServiceImpl implements OTPService {

    private static final Logger logger = LoggerFactory.getLogger(OTPServiceImpl.class);
    private static final int OTP_LENGTH = 6;
    private static final int MAX_OTP_ATTEMPTS_PER_HOUR = 5;

    @Autowired
    private OTPRepository otpRepository;

    @Autowired
    private EmailService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    @Override
    public String generateAndSendOTP(String email, String userName, OTP.OTPType type) {
        try {
            String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
            if (normalizedEmail.isEmpty()) {
                throw new RuntimeException("Email is required");
            }

            logger.info("Starting OTP generation for email: {} and type: {}", email, type);
            
            // Check rate limiting
            LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
            long recentOTPCount = otpRepository.countOTPsCreatedSince(normalizedEmail, oneHourAgo);
            
            if (recentOTPCount >= MAX_OTP_ATTEMPTS_PER_HOUR) {
                logger.warn("Rate limit exceeded for email: {} (count: {})", normalizedEmail, recentOTPCount);
                throw new RuntimeException("Too many OTP requests. Please try again after an hour.");
            }

            // Invalidate existing OTPs for this email and type
            logger.info("Invalidating existing OTPs for email: {} and type: {}", normalizedEmail, type);
            otpRepository.markAllOTPsAsUsedForEmailAndType(normalizedEmail, type);

            // Generate new OTP
            String otpCode = generateOTPCode();
            logger.info("Generated OTP code for email: {}", normalizedEmail);
            
            // Save OTP to database
            OTP otp = new OTP(normalizedEmail, otpCode, type);
            OTP savedOtp = otpRepository.save(otp);
            logger.info("OTP saved to database with ID: {} for email: {}", savedOtp.getId(), normalizedEmail);

            // Send OTP via email
            logger.info("Attempting to send OTP email to: {}", normalizedEmail);
            try {
                emailService.sendOtpEmail(normalizedEmail, otpCode, userName != null ? userName : "User");
            } catch (Exception mailError) {
                // Roll back saved OTP if delivery failed, so users are not blocked by stale OTP records.
                otpRepository.delete(savedOtp);
                throw new RuntimeException("Unable to deliver OTP email. Please verify mail settings and try again.", mailError);
            }
            logger.info("OTP generated and sent successfully for email: {} and type: {}", normalizedEmail, type);
            return "OTP sent successfully to your email";
            
        } catch (Exception e) {
            logger.error("Failed to generate and send OTP for email: {} and type: {}", email, type, e);
            throw new RuntimeException(e.getMessage());
        }
    }

    @Override
    public boolean verifyOTP(String email, String otpCode) {
        try {
            String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
            Optional<OTP> otpOptional = otpRepository.findByEmailAndOtpCodeAndUsedFalse(normalizedEmail, otpCode);
            
            if (otpOptional.isEmpty()) {
                logger.warn("Invalid OTP attempt for email: {}", normalizedEmail);
                return false;
            }

            OTP otp = otpOptional.get();
            
            if (otp.isExpired()) {
                logger.warn("Expired OTP attempt for email: {}", normalizedEmail);
                return false;
            }

            // Mark OTP as used
            otp.setUsed(true);
            otpRepository.save(otp);
            
            logger.info("OTP verified successfully for email: {}", normalizedEmail);
            return true;
        } catch (Exception e) {
            logger.error("Error verifying OTP for email: {}", email, e);
            return false;
        }
    }

    @Override
    public boolean verifyOTPWithType(String email, String otpCode, OTP.OTPType type) {
        try {
            String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
            Optional<OTP> otpOptional = otpRepository.findByEmailAndOtpCodeAndTypeAndUsedFalse(normalizedEmail, otpCode, type);
            
            if (otpOptional.isEmpty()) {
                logger.warn("Invalid OTP attempt for email: {} and type: {}", normalizedEmail, type);
                return false;
            }

            OTP otp = otpOptional.get();
            
            if (otp.isExpired()) {
                logger.warn("Invalid or expired OTP attempt for email: {} and type: {}", normalizedEmail, type);
                return false;
            }

            // Mark OTP as used
            otp.setUsed(true);
            otpRepository.save(otp);
            
            logger.info("OTP verified successfully for email: {} and type: {}", normalizedEmail, type);
            return true;
        } catch (Exception e) {
            logger.error("Error verifying OTP for email: {} and type: {}", email, type, e);
            return false;
        }
    }

    @Override
    public boolean hasValidOTP(String email, OTP.OTPType type) {
        try {
            String normalizedEmail = email == null ? "" : email.trim().toLowerCase();
            Optional<OTP> otpOptional = otpRepository.findTopByEmailAndTypeAndUsedFalseOrderByCreatedAtDesc(normalizedEmail, type);
            return otpOptional.isPresent() && otpOptional.get().isValid();
        } catch (Exception e) {
            logger.error("Error checking valid OTP for email: {} and type: {}", email, type, e);
            return false;
        }
    }

    private String generateOTPCode() {
        StringBuilder otp = new StringBuilder();
        for (int i = 0; i < OTP_LENGTH; i++) {
            otp.append(secureRandom.nextInt(10));
        }
        return otp.toString();
    }

    // Clean up expired OTPs every hour
    @Scheduled(fixedRate = 3600000) // 1 hour in milliseconds
    public void cleanupExpiredOTPs() {
        try {
            otpRepository.deleteExpiredOTPs(LocalDateTime.now());
            logger.info("Expired OTPs cleaned up successfully");
        } catch (Exception e) {
            logger.error("Error cleaning up expired OTPs", e);
        }
    }
}
