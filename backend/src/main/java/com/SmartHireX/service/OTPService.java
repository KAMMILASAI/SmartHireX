package com.SmartHireX.service;

import com.SmartHireX.entity.OTP;

public interface OTPService {
    
    /**
     * Generate and send OTP to the specified email
     * @param email The email address to send OTP to
     * @param userName The name of the user
     * @param type The type of OTP (REGISTRATION, LOGIN, PASSWORD_RESET)
     * @return Success message
     */
    String generateAndSendOTP(String email, String userName, OTP.OTPType type);
    
    /**
     * Verify OTP for the given email
     * @param email The email address
     * @param otpCode The OTP code to verify
     * @return true if OTP is valid, false otherwise
     */
    boolean verifyOTP(String email, String otpCode);
    
    /**
     * Verify OTP with specific type for the given email
     * @param email The email address
     * @param otpCode The OTP code to verify
     * @param type The type of OTP to verify
     * @return true if OTP is valid, false otherwise
     */
    boolean verifyOTPWithType(String email, String otpCode, OTP.OTPType type);
    
    /**
     * Check if user has a valid OTP of the specified type
     * @param email The email address
     * @param type The type of OTP
     * @return true if valid OTP exists, false otherwise
     */
    boolean hasValidOTP(String email, OTP.OTPType type);
}
