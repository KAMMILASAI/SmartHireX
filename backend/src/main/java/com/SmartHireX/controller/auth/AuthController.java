package com.SmartHireX.controller.auth;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.dto.request.LoginRequest;
import com.SmartHireX.dto.request.OTPRequest;
import com.SmartHireX.dto.request.OTPVerificationRequest;
import com.SmartHireX.dto.request.RegisterRequest;
import com.SmartHireX.dto.request.ResetPasswordRequest;
import com.SmartHireX.dto.response.AuthResponse;
import com.SmartHireX.entity.OTP;
import com.SmartHireX.entity.User;
import com.SmartHireX.security.JwtTokenProvider;
import com.SmartHireX.security.oauth2.AuthProvider;
import com.SmartHireX.service.EmailService;
import com.SmartHireX.service.OTPService;
import com.SmartHireX.service.UserService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtTokenProvider tokenProvider;

    @Autowired
    private OTPService otpService;

    @Autowired
    private EmailService emailService;

    // Send OTP for registration
    @PostMapping("/send-registration-otp")
    public ResponseEntity<?> sendRegistrationOTP(@Valid @RequestBody OTPRequest otpRequest) {
        try {
            logger.info("Received OTP request for email: {}", otpRequest.getEmail());
            
            if (userService.existsByEmail(otpRequest.getEmail())) {
                logger.warn("Email already registered: {}", otpRequest.getEmail());
                return ResponseEntity.badRequest().body(
                    Collections.singletonMap("message", "Email is already registered!")
                );
            }
            
            String name = otpRequest.getName() != null ? otpRequest.getName() : "User";
            logger.info("Generating OTP for email: {} with name: {}", otpRequest.getEmail(), name);
            
            String message = otpService.generateAndSendOTP(otpRequest.getEmail(), name, OTP.OTPType.REGISTRATION);
            
            logger.info("OTP sent successfully for email: {}", otpRequest.getEmail());
            return ResponseEntity.ok(Collections.singletonMap("message", message));
        } catch (Exception e) {
            logger.error("Error sending registration OTP for email: {}", otpRequest.getEmail(), e);
            return ResponseEntity.status(500).body(
                Collections.singletonMap("message", "Failed to send OTP: " + e.getMessage())
            );
        }
    }

    // Verify OTP for registration
    @PostMapping("/verify-registration-otp")
    public ResponseEntity<?> verifyRegistrationOTP(@Valid @RequestBody OTPVerificationRequest request) {
        try {
            // For registration, we don't check if user exists since they're registering
            boolean isValid = otpService.verifyOTPWithType(request.getEmail(), request.getOtp(), OTP.OTPType.REGISTRATION);
            
            if (isValid) {
                return ResponseEntity.ok(Collections.singletonMap("message", "OTP verified successfully"));
            } else {
                return ResponseEntity.badRequest().body(
                    Collections.singletonMap("message", "Invalid or expired OTP")
                );
            }
        } catch (Exception e) {
            logger.error("Error verifying registration OTP", e);
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("message", e.getMessage())
            );
        }
    }

    // Verify OTP and register user
    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {
        try {
            if (userService.existsByEmail(registerRequest.getEmail())) {
                return ResponseEntity.badRequest().body(
                    Collections.singletonMap("message", "Email is already taken!")
                );
            }
            
            // OTP verification is handled separately via /verify-registration-otp endpoint
            // No need to verify OTP again here since it was already verified
            
            // Enforce verification policy based on role
            String role = registerRequest.getRole() != null ? registerRequest.getRole().trim().toLowerCase() : "candidate";
            boolean isRecruiter = "recruiter".equalsIgnoreCase(role);
            boolean isOAuth2 = Boolean.TRUE.equals(registerRequest.getOauth2());
            
            // Set verification status
            if (isOAuth2) {
                // OAuth2 users are considered verified
                registerRequest.setVerified(true);
            } else if (isRecruiter) {
                // Recruiters need admin approval
                registerRequest.setVerified(false);
            } else {
                // Regular users are verified by default after OTP verification
                registerRequest.setVerified(true);
            }
            
            registerRequest.setRole(role);

            // Validate fields conditionally
            String phone = registerRequest.getPhone();
            String password = registerRequest.getPassword();
            if (!isOAuth2) {
                if (phone == null || phone.trim().isEmpty()) {
                    return ResponseEntity.badRequest().body(
                        Collections.singletonMap("message", "Phone number is required")
                    );
                }
                if (password == null || password.trim().length() < 6) {
                    return ResponseEntity.badRequest().body(
                        Collections.singletonMap("message", "Password must be at least 6 characters long")
                    );
                }
            } else {
                // If OAuth2 flow and password provided, enforce minimal length
                if (password != null && !password.trim().isEmpty() && password.trim().length() < 6) {
                    return ResponseEntity.badRequest().body(
                        Collections.singletonMap("message", "Password must be at least 6 characters long")
                    );
                }
            }

            User user = userService.createUser(registerRequest);

            // Send appropriate email
            try {
                String firstName = user.getFirstName() != null ? user.getFirstName() : "User";
                if (!isRecruiter) {
                    emailService.sendWelcomeEmail(user.getEmail(), firstName);
                }
            } catch (Exception e) {
                logger.warn("Failed to send registration email to: {}", user.getEmail(), e);
            }

            // If user is verified (non-recruiter), authenticate and return JWT
            if (Boolean.TRUE.equals(user.isEnabled())) {
                if (!isOAuth2 && registerRequest.getPassword() != null) {
                    Authentication authentication = authenticationManager.authenticate(
                        new UsernamePasswordAuthenticationToken(
                            registerRequest.getEmail(),
                            registerRequest.getPassword()
                        )
                    );
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    String jwt = tokenProvider.generateToken(authentication);
                    return ResponseEntity.ok(new AuthResponse(jwt, "Bearer", user));
                }
                // OAuth2 registrations without password: return success without JWT
                return ResponseEntity.ok(Collections.singletonMap("message", "Registration completed successfully. Please login using OAuth2."));
            }

            // For recruiters (pending approval), return informational message
            return ResponseEntity.ok(Collections.singletonMap("message", "Registration successful. Your recruiter account is pending admin approval."));
        } catch (Exception e) {
            logger.error("Error during registration", e);
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("message", e.getMessage())
            );
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            // Normalize email to avoid case/space issues
            String email = loginRequest.getEmail() != null ? loginRequest.getEmail().trim().toLowerCase() : "";
            String password = loginRequest.getPassword() != null ? loginRequest.getPassword().trim() : "";

            logger.info("Attempting login for email: {}", email);

            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, password)
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = tokenProvider.generateToken(authentication);

            User user = userService.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

            logger.info("Login successful for email: {}", email);
            return ResponseEntity.ok(new AuthResponse(jwt, "Bearer", user));
        } catch (org.springframework.security.authentication.DisabledException ex) {
            logger.warn("Login failed (disabled) for email: {}", loginRequest.getEmail(), ex);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Collections.singletonMap("message", "User is disabled or not verified"));
        } catch (org.springframework.security.authentication.BadCredentialsException ex) {
            logger.warn("Login failed (bad credentials) for email: {}", loginRequest.getEmail());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Collections.singletonMap("message", "Invalid email or password"));
        } catch (Exception ex) {
            logger.error("Unexpected error during login for email: {}", loginRequest.getEmail(), ex);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Collections.singletonMap("message", "Authentication failed"));
        }
    }

    // Send OTP for forgot password
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody OTPRequest otpRequest) {
        try {
            String normalizedEmail = otpRequest.getEmail() == null ? "" : otpRequest.getEmail().trim().toLowerCase();
            if (normalizedEmail.isEmpty()) {
                return ResponseEntity.badRequest().body(
                    Collections.singletonMap("message", "Email is required")
                );
            }

            User user = userService.findByEmail(normalizedEmail)
                .orElse(null);

            if (user == null) {
                return ResponseEntity.badRequest().body(
                    Collections.singletonMap("message", "Only SmartHireX registered email can use forgot password")
                );
            }

            if (user.getProvider() != AuthProvider.LOCAL) {
                return ResponseEntity.badRequest().body(
                    Collections.singletonMap("message", "This account uses social login. Please sign in with Google/GitHub")
                );
            }
            
            String message = otpService.generateAndSendOTP(normalizedEmail, user.getFirstName(), OTP.OTPType.PASSWORD_RESET);
            
            return ResponseEntity.ok(Collections.singletonMap("message", message));
        } catch (Exception e) {
            logger.error("Error sending forgot password OTP", e);
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("message", e.getMessage())
            );
        }
    }

    // Verify OTP for forgot password
    @PostMapping("/verify-forgot-password-otp")
    public ResponseEntity<?> verifyForgotPasswordOTP(@Valid @RequestBody OTPVerificationRequest request) {
        try {
            String normalizedEmail = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
            User user = userService.findByEmail(normalizedEmail).orElse(null);
            if (user == null || user.getProvider() != AuthProvider.LOCAL) {
                return ResponseEntity.badRequest().body(
                    Collections.singletonMap("message", "Only SmartHireX registered email can verify forgot password OTP")
                );
            }
            
            boolean isValid = otpService.verifyOTPWithType(normalizedEmail, request.getOtp(), OTP.OTPType.PASSWORD_RESET);
            
            if (isValid) {
                return ResponseEntity.ok(Collections.singletonMap("message", "OTP verified successfully"));
            } else {
                return ResponseEntity.badRequest().body(
                    Collections.singletonMap("message", "Invalid or expired OTP")
                );
            }
        } catch (Exception e) {
            logger.error("Error verifying forgot password OTP", e);
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("message", e.getMessage())
            );
        }
    }

    // Reset password with OTP
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            String normalizedEmail = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
            User user = userService.findByEmail(normalizedEmail).orElse(null);
            if (user == null || user.getProvider() != AuthProvider.LOCAL) {
                return ResponseEntity.badRequest().body(
                    Collections.singletonMap("message", "Only SmartHireX registered email can reset password")
                );
            }
            
            // Verify OTP
            if (!otpService.verifyOTPWithType(normalizedEmail, request.getOtp(), OTP.OTPType.PASSWORD_RESET)) {
                return ResponseEntity.badRequest().body(
                    Collections.singletonMap("message", "Invalid or expired OTP")
                );
            }
            
            // Reset password
            userService.resetPassword(normalizedEmail, request.getNewPassword());

            try {
                String firstName = user.getFirstName() != null && !user.getFirstName().isBlank()
                    ? user.getFirstName()
                    : "User";
                emailService.sendPasswordResetSuccessEmail(normalizedEmail, firstName);
            } catch (Exception emailException) {
                logger.warn("Password reset succeeded but confirmation email failed for {}", normalizedEmail, emailException);
            }
            
            return ResponseEntity.ok(Collections.singletonMap("message", "Password reset successfully"));
        } catch (Exception e) {
            logger.error("Error resetting password", e);
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("message", e.getMessage())
            );
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();
        
        User user = userService.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
            
        return ResponseEntity.ok(user);
    }

    @GetMapping("/get-started")
    public ResponseEntity<?> getStarted() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Welcome to SmartHireX!");
        response.put("steps", Arrays.asList(
            "1. Register your account",
            "2. Verify your email with OTP",
            "3. Complete your profile",
            "4. Start applying for jobs or posting jobs"
        ));
        response.put("endpoints", Map.of(
            "register", "/api/auth/register",
            "login", "/api/auth/login",
            "sendOTP", "/api/auth/send-registration-otp",
            "verifyOTP", "/api/auth/verify-registration-otp"
        ));
        return ResponseEntity.ok(response);
    }
}