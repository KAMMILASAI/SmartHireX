package com.SmartHireX.service;

public interface PresenceService {
    void heartbeat(String clientId);
    void heartbeat(String clientId, Long userId);
    int getOnlineCount();
    boolean isUserOnline(Long userId);
    Long getUserLastSeen(Long userId);
}
