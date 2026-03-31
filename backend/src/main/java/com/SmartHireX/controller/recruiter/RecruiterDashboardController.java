package com.SmartHireX.controller.recruiter;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.entity.User;
import com.SmartHireX.repository.UserRepository;
import com.SmartHireX.security.CurrentUser;
import com.SmartHireX.security.UserPrincipal;
import com.SmartHireX.service.RecruiterDashboardService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/recruiter")
public class RecruiterDashboardController {

    @Autowired
    private RecruiterDashboardService dashboardService;
    
    @Autowired
    private UserRepository userRepository;

    @GetMapping("/dashboard-stats")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<Map<String, Object>> getDashboardStats() {
        Map<String, Object> response = new HashMap<>();
        
        // Get total candidates
        long totalCandidates = dashboardService.getTotalCandidates();
        // Get active chats count
        int activeChats = dashboardService.getActiveChatsCount();
        // Get drives conducted
        int drivesConducted = dashboardService.getDrivesConductedCount();
        // Get total employees
        int totalEmployees = dashboardService.getTotalEmployees();
        
        // Get chart data
        Map<String, Object> charts = new HashMap<>();
        charts.put("candidatesByMonth", dashboardService.getCandidatesByMonth());
        charts.put("drivesByMonth", dashboardService.getDrivesByMonth());
        
        response.put("totalCandidates", totalCandidates);
        response.put("activeChats", activeChats);
        response.put("drivesConducted", drivesConducted);
        response.put("totalEmployees", totalEmployees);
        response.put("charts", charts);
        
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/profile")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<?> getProfile(@CurrentUser UserPrincipal userPrincipal) {
        try {
            User user = userRepository.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

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
            profile.put("image", user.getImageUrl() != null ? user.getImageUrl() : "");
            
            return ResponseEntity.ok(profile);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch profile");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}
