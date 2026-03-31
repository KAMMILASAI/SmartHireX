package com.SmartHireX.controller;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.SmartHireX.entity.Notification;
import com.SmartHireX.entity.NotificationRead;
import com.SmartHireX.repository.NotificationRepository;
import com.SmartHireX.repository.NotificationReadRepository;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private static final Logger logger = LoggerFactory.getLogger(NotificationController.class);

    private final NotificationRepository notificationRepository;
    private final NotificationReadRepository notificationReadRepository;

    public NotificationController(NotificationRepository notificationRepository, 
                                NotificationReadRepository notificationReadRepository) {
        this.notificationRepository = notificationRepository;
        this.notificationReadRepository = notificationReadRepository;
    }

    /**
     * Get notifications filtered by audience (role)
     * Used by frontend DashboardLayout.jsx
     */
    @GetMapping
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<List<Notification>> getNotifications(@RequestParam(value = "audience", required = false) String audience) {
        try {
            List<Notification> notifications;
            
            if (audience == null || audience.isBlank() || "all".equalsIgnoreCase(audience)) {
                // Return all notifications
                notifications = notificationRepository.findAllByOrderByCreatedAtDesc();
            } else {
                // Get notifications for specific audience OR "all" audience using optimized query
                notifications = notificationRepository.findByAudienceOrAllOrderByCreatedAtDesc(audience);
            }
            
            logger.debug("Retrieved {} notifications for audience: {} (including 'all' audience notifications)", notifications.size(), audience);
            return ResponseEntity.ok(notifications);
            
        } catch (Exception e) {
            logger.error("Error retrieving notifications for audience: {}", audience, e);
            return ResponseEntity.ok(List.of()); // Return empty list on error
        }
    }

    /**
     * Get read notification IDs for a specific user
     * Used by frontend DashboardLayout.jsx to determine read status
     */
    @GetMapping("/read-ids")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<List<Long>> getReadNotificationIds(@RequestParam("email") String userEmail) {
        try {
            if (userEmail == null || userEmail.trim().isEmpty()) {
                logger.warn("Empty email provided for read notification IDs");
                return ResponseEntity.ok(List.of());
            }
            
            List<Long> readIds = notificationReadRepository.findNotificationIdsByUserEmail(userEmail.trim());
            logger.debug("Retrieved {} read notification IDs for user: {}", readIds.size(), userEmail);
            return ResponseEntity.ok(readIds);
            
        } catch (Exception e) {
            logger.error("Error retrieving read notification IDs for user: {}", userEmail, e);
            return ResponseEntity.ok(List.of()); // Return empty list on error
        }
    }

    /**
     * Mark a notification as read for a specific user
     * Used by frontend DashboardLayout.jsx when user clicks on notification
     */
    @PostMapping("/{id}/read")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> markNotificationAsRead(@PathVariable("id") Long notificationId, 
                                                      @RequestParam("email") String userEmail) {
        try {
            if (userEmail == null || userEmail.trim().isEmpty()) {
                logger.warn("Empty email provided for marking notification as read");
                return ResponseEntity.badRequest().build();
            }
            
            if (notificationId == null) {
                logger.warn("Null notification ID provided");
                return ResponseEntity.badRequest().build();
            }
            
            // Check if notification exists
            if (!notificationRepository.existsById(notificationId)) {
                logger.warn("Notification not found with ID: {}", notificationId);
                return ResponseEntity.notFound().build();
            }
            
            // Check if already marked as read
            if (notificationReadRepository.existsByNotificationIdAndUserEmail(notificationId, userEmail.trim())) {
                logger.debug("Notification {} already marked as read for user: {}", notificationId, userEmail);
                return ResponseEntity.noContent().build(); // Already marked as read
            }
            
            // Create new read record
            NotificationRead notificationRead = new NotificationRead();
            notificationRead.setNotificationId(notificationId);
            notificationRead.setUserEmail(userEmail.trim());
            
            logger.debug("Attempting to save NotificationRead: notificationId={}, userEmail={}", notificationId, userEmail.trim());
            NotificationRead saved = notificationReadRepository.save(notificationRead);
            logger.debug("Successfully saved NotificationRead with ID: {}", saved.getId());
            
            logger.info("Marked notification {} as read for user: {}", notificationId, userEmail);
            return ResponseEntity.noContent().build();
            
        } catch (Exception e) {
            logger.error("Error marking notification {} as read for user: {}", notificationId, userEmail, e);
            // Return more detailed error information for debugging
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to mark notification as read");
            errorResponse.put("message", e.getMessage());
            errorResponse.put("notificationId", notificationId);
            errorResponse.put("userEmail", userEmail);
            return ResponseEntity.status(500).body(errorResponse);
        }
    }

    /**
     * Get a specific notification by ID
     * Used for debugging and detailed views
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<Notification> getNotificationById(@PathVariable("id") Long id) {
        try {
            return notificationRepository.findById(id)
                    .map(notification -> {
                        logger.debug("Retrieved notification with ID: {}", id);
                        return ResponseEntity.ok(notification);
                    })
                    .orElseGet(() -> {
                        logger.warn("Notification not found with ID: {}", id);
                        return ResponseEntity.notFound().build();
                    });
        } catch (Exception e) {
            logger.error("Error retrieving notification with ID: {}", id, e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Debug endpoint to check notification read status
     * Used for troubleshooting read status issues
     */
    @GetMapping("/debug/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> debugNotificationReadStatus(@PathVariable("id") Long notificationId,
                                                                          @RequestParam(value = "email", required = false) String userEmail) {
        try {
            Map<String, Object> debug = new HashMap<>();
            
            // Check if notification exists
            boolean notificationExists = notificationRepository.existsById(notificationId);
            debug.put("notificationExists", notificationExists);
            debug.put("notificationId", notificationId);
            
            if (userEmail != null && !userEmail.trim().isEmpty()) {
                // Check read status for specific user
                boolean isRead = notificationReadRepository.existsByNotificationIdAndUserEmail(notificationId, userEmail.trim());
                debug.put("userEmail", userEmail.trim());
                debug.put("isRead", isRead);
                
                // Get all read records for this user
                List<NotificationRead> userReads = notificationReadRepository.findByUserEmail(userEmail.trim());
                debug.put("totalReadByUser", userReads.size());
            } else {
                // Get all read records for this notification
                List<NotificationRead> allReads = notificationReadRepository.findAll().stream()
                        .filter(nr -> nr.getNotificationId().equals(notificationId))
                        .toList();
                debug.put("totalReadsForNotification", allReads.size());
            }
            
            logger.debug("Debug info for notification {}: {}", notificationId, debug);
            return ResponseEntity.ok(debug);
            
        } catch (Exception e) {
            logger.error("Error debugging notification {}", notificationId, e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * Get notification statistics
     * Used for admin dashboard and monitoring
     */
    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getNotificationStats() {
        try {
            Map<String, Object> stats = new HashMap<>();
            
            long totalNotifications = notificationRepository.count();
            long totalReads = notificationReadRepository.count();
            
            List<Notification> allNotifications = notificationRepository.findAllByOrderByCreatedAtDesc();
            long candidateNotifications = allNotifications.stream()
                    .filter(n -> "candidate".equalsIgnoreCase(n.getAudience()))
                    .count();
            long recruiterNotifications = allNotifications.stream()
                    .filter(n -> "recruiter".equalsIgnoreCase(n.getAudience()))
                    .count();
            long allAudienceNotifications = allNotifications.stream()
                    .filter(n -> "all".equalsIgnoreCase(n.getAudience()))
                    .count();
            
            stats.put("totalNotifications", totalNotifications);
            stats.put("totalReads", totalReads);
            stats.put("candidateNotifications", candidateNotifications);
            stats.put("recruiterNotifications", recruiterNotifications);
            stats.put("allAudienceNotifications", allAudienceNotifications);
            
            // Calculate read rate if there are notifications
            if (totalNotifications > 0) {
                double readRate = (double) totalReads / totalNotifications * 100;
                stats.put("readRate", Math.round(readRate * 100.0) / 100.0); // Round to 2 decimal places
            } else {
                stats.put("readRate", 0.0);
            }
            
            logger.debug("Notification stats: {}", stats);
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            logger.error("Error retrieving notification stats", e);
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Clear all read notifications for a user
     * Used for testing and user preference management
     */
    @DeleteMapping("/read-status")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> clearUserReadStatus(@RequestParam("email") String userEmail) {
        try {
            if (userEmail == null || userEmail.trim().isEmpty()) {
                logger.warn("Empty email provided for clearing read status");
                return ResponseEntity.badRequest().build();
            }
            
            long deletedCount = notificationReadRepository.deleteByUserEmail(userEmail.trim());
            
            Map<String, Object> result = new HashMap<>();
            result.put("message", "Read status cleared successfully");
            result.put("deletedCount", deletedCount);
            
            logger.info("Cleared {} read notifications for user: {}", deletedCount, userEmail);
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            logger.error("Error clearing read status for user: {}", userEmail, e);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "Failed to clear read status: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}
