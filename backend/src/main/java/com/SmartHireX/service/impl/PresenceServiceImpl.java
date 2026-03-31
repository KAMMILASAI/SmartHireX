package com.SmartHireX.service.impl;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.SmartHireX.service.PresenceService;

@Service
public class PresenceServiceImpl implements PresenceService {

    // clientId -> lastSeenEpochMillis
    private final Map<String, Long> presenceMap = new ConcurrentHashMap<>();
    // userId -> lastSeenEpochMillis
    private final Map<Long, Long> userPresenceMap = new ConcurrentHashMap<>();

    // Consider users online if heartbeat within last N millis
    private static final long ONLINE_WINDOW_MS = 60_000; // 60s

    @Override
    public void heartbeat(String clientId) {
        heartbeat(clientId, null);
    }

    @Override
    public void heartbeat(String clientId, Long userId) {
        if (clientId == null || clientId.isBlank()) return;
        long now = Instant.now().toEpochMilli();
        presenceMap.put(clientId, now);
        if (userId != null && userId > 0) {
            userPresenceMap.put(userId, now);
        }
    }

    @Override
    public int getOnlineCount() {
        long now = Instant.now().toEpochMilli();
        return (int) presenceMap.values().stream()
                .filter(last -> (now - last) <= ONLINE_WINDOW_MS)
                .count();
    }

    @Override
    public boolean isUserOnline(Long userId) {
        if (userId == null) return false;
        Long lastSeen = userPresenceMap.get(userId);
        if (lastSeen == null) return false;
        long now = Instant.now().toEpochMilli();
        return (now - lastSeen) <= ONLINE_WINDOW_MS;
    }

    @Override
    public Long getUserLastSeen(Long userId) {
        if (userId == null) return null;
        return userPresenceMap.get(userId);
    }

    // Cleanup stale entries periodically (every 2 minutes)
    @Scheduled(fixedDelay = 120_000)
    public void cleanup() {
        long now = Instant.now().toEpochMilli();
        presenceMap.entrySet().removeIf(e -> (now - e.getValue()) > ONLINE_WINDOW_MS);
        userPresenceMap.entrySet().removeIf(e -> (now - e.getValue()) > ONLINE_WINDOW_MS);
    }
}
