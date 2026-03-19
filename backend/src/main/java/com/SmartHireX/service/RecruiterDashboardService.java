package com.SmartHireX.service;

import java.util.List;
import java.util.Map;

public interface RecruiterDashboardService {
    long getTotalCandidates();
    int getActiveChatsCount();
    int getDrivesConductedCount();
    int getTotalEmployees();
    List<Map<String, Object>> getCandidatesByMonth();
    List<Map<String, Object>> getDrivesByMonth();
}
