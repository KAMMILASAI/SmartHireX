package com.SmartHireX.controller.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import com.SmartHireX.dto.response.AuthResponse;
import com.SmartHireX.entity.User;
import com.SmartHireX.security.JwtTokenProvider;
import com.SmartHireX.security.UserPrincipal;
import com.SmartHireX.service.UserService;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletRequest;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/oauth2")
public class OAuth2Controller {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2Controller.class);

    @Value("${app.oauth2.redirect-uri}")
    private String redirectUri;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    private final JwtTokenProvider tokenProvider;
    private final UserService userService;

    @Autowired
    public OAuth2Controller(JwtTokenProvider tokenProvider, UserService userService) {
        this.tokenProvider = tokenProvider;
        this.userService = userService;
    }

    @GetMapping("/user")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {
        return getCurrentUserResponse(authentication);
    }
    
    @GetMapping("/me")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getCurrentUserMe(Authentication authentication) {
        return getCurrentUserResponse(authentication);
    }
    
    private ResponseEntity<?> getCurrentUserResponse(Authentication authentication) {
        logger.debug("Fetching current user details");
        
        if (authentication == null || !authentication.isAuthenticated()) {
            logger.warn("Unauthenticated access to user endpoint");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(Collections.singletonMap("authenticated", false));
        }

        try {
            Object principal = authentication.getPrincipal();
            Map<String, Object> response = new HashMap<>();
            response.put("authenticated", true);
            
            if (principal instanceof UserPrincipal) {
                UserPrincipal userPrincipal = (UserPrincipal) principal;
                User user = userService.findByEmail(userPrincipal.getEmail())
                    .orElseThrow(() -> new RuntimeException("User not found"));
                
                response.put("id", user.getId());
                response.put("email", user.getEmail());
                response.put("firstName", user.getFirstName());
                response.put("lastName", user.getLastName());
                response.put("role", user.getRole());
                response.put("emailVerified", user.isEmailVerified());
                response.put("oauth2Provider", user.getProvider());
            } else if (principal instanceof OAuth2User) {
                OAuth2User oauth2User = (OAuth2User) principal;
                response.putAll(oauth2User.getAttributes());
                
                // Try to get the user from the database
                String email = oauth2User.getAttribute("email");
                if (email != null) {
                    userService.findByEmail(email).ifPresent(user -> {
                        response.put("id", user.getId());
                        response.put("email", user.getEmail());
                        response.put("firstName", user.getFirstName());
                        response.put("lastName", user.getLastName());
                        response.put("role", user.getRole());
                        response.put("emailVerified", user.isEmailVerified());
                        response.put("oauth2Provider", user.getProvider());
                    });
                }
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error fetching user details", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Collections.singletonMap("error", "Error fetching user details: " + e.getMessage()));
        }
    }

    @GetMapping("/success")
    public ResponseEntity<?> oauth2Success() {
        logger.info("OAuth2 authentication successful, processing user data");
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            logger.error("OAuth2 authentication failed - no authentication found");
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("error", "Authentication failed")
            );
        }
        
        try {
            Object principal = authentication.getPrincipal();
            String token = tokenProvider.generateToken(authentication);
            User user;
            
            if (principal instanceof UserPrincipal) {
                UserPrincipal userPrincipal = (UserPrincipal) principal;
                user = userService.findByEmail(userPrincipal.getEmail())
                    .orElseThrow(() -> new RuntimeException("User not found"));
                
                return ResponseEntity.ok(new AuthResponse(token, "Bearer", user));
            } else if (principal instanceof OAuth2User) {
                OAuth2User oauth2User = (OAuth2User) principal;
                String email = oauth2User.getAttribute("email");
                
                if (email == null || email.isEmpty()) {
                    throw new RuntimeException("Email not found in OAuth2 user details");
                }
                
                user = userService.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found after OAuth2 authentication"));
                
                return ResponseEntity.ok(new AuthResponse(token, "Bearer", user));
            }
            
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("error", "Unsupported authentication type")
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                Collections.singletonMap("error", "Authentication failed: " + e.getMessage())
            );
        }
    }

    @GetMapping("/failure")
    public ResponseEntity<?> oauth2Failure(@RequestParam(value = "message", required = false) String message) {
        String errorMessage = "OAuth2 authentication failed. Please try again.";
        if (message != null && !message.isEmpty()) {
            errorMessage += " " + message;
        }
        return ResponseEntity.badRequest().body(Collections.singletonMap("error", errorMessage));
    }

    @GetMapping("/config")
    public Map<String, Object> getOAuth2Config() {
        Map<String, Object> config = new HashMap<>();
        config.put("redirectUri", redirectUri);
        config.put("frontendUrl", frontendUrl);
        config.put("googleClientId", "${spring.security.oauth2.client.registration.google.client-id}");
        return config;
    }

    @GetMapping("/authorize/google")
    public void authorizeGoogle(HttpServletResponse response, HttpServletRequest request,
            @RequestParam(value = "redirect_uri", required = false) String redirectUri) throws Exception {
        
        logger.info("OAuth2 Google authorization request - redirect_uri: {}", redirectUri);
        
        // Redirect to Spring Security's OAuth2 authorization endpoint
        response.sendRedirect("/oauth2/authorization/google");
    }

    @GetMapping("/authorize/github")
    public void authorizeGithub(HttpServletResponse response, 
                               HttpServletRequest request,
                               @RequestParam(value = "redirect_uri", required = false) String redirectUri) throws Exception {
        logger.info("OAuth2 GitHub authorization request - redirect_uri: {}", redirectUri);
        
        // Redirect to Spring Security's OAuth2 authorization endpoint
        response.sendRedirect("/oauth2/authorization/github");
    }

    @GetMapping("/authorize/apple")
    public void authorizeApple(HttpServletResponse response, 
                              HttpServletRequest request,
                              @RequestParam(value = "redirect_uri", required = false) String redirectUri) throws Exception {
        logger.info("OAuth2 Apple authorization request - redirect_uri: {}", redirectUri);
        
        // Redirect to Spring Security's OAuth2 authorization endpoint
        response.sendRedirect("/oauth2/authorization/apple");
    }
}
