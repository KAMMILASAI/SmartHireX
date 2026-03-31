package com.SmartHireX.controller;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.service.PresenceService;

@RestController
@RequestMapping("/presence")
public class PresenceController {

    private final PresenceService presenceService;

    public PresenceController(PresenceService presenceService) {
        this.presenceService = presenceService;
    }

    @PostMapping("/heartbeat")
    public ResponseEntity<Map<String, Object>> heartbeat(@RequestBody Map<String, String> body) {
        String clientId = body.get("clientId");
        Long userId = null;
        try {
            String userIdRaw = body.get("userId");
            if (userIdRaw != null && !userIdRaw.isBlank()) {
                userId = Long.valueOf(userIdRaw.trim());
            }
        } catch (Exception ignored) {
            userId = null;
        }

        presenceService.heartbeat(clientId, userId);
        Map<String, Object> resp = new HashMap<>();
        resp.put("ok", true);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/count")
    public ResponseEntity<Map<String, Integer>> getCount() {
        int count = presenceService.getOnlineCount();
        Map<String, Integer> resp = new HashMap<>();
        resp.put("count", count);
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/user-status/{userId}")
    public ResponseEntity<Map<String, Object>> getUserStatus(@PathVariable Long userId) {
        boolean online = presenceService.isUserOnline(userId);
        Long lastSeen = presenceService.getUserLastSeen(userId);
        Map<String, Object> resp = new HashMap<>();
        resp.put("userId", userId);
        resp.put("online", online);
        resp.put("lastSeen", lastSeen);
        return ResponseEntity.ok(resp);
    }
}
