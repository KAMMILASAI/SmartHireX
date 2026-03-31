package com.SmartHireX.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.SmartHireX.entity.Role;
import com.SmartHireX.entity.User;
import com.SmartHireX.model.JobPosting;
import com.SmartHireX.repository.ChatRepository;
import com.SmartHireX.repository.JobRepository;
import com.SmartHireX.repository.RecruiterProfileRepository;
import com.SmartHireX.repository.UserRepository;
import com.SmartHireX.service.RecruiterDashboardService;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecruiterDashboardServiceImpl implements RecruiterDashboardService {

    @Autowired private UserRepository userRepository;
    @Autowired private JobRepository jobRepository;
    @Autowired private ChatRepository chatRepository;
    @Autowired private RecruiterProfileRepository recruiterProfileRepository;

    private User getCurrentRecruiter() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return null;
        return userRepository.findByEmailIgnoreCase(auth.getName()).orElse(null);
    }

    @Override
    public long getTotalCandidates() {
        // Count all users with CANDIDATE role
        return userRepository.findAll().stream()
            .filter(u -> u.getRole() == Role.CANDIDATE)
            .count();
    }

    @Override
    public int getActiveChatsCount() {
        User recruiter = getCurrentRecruiter();
        if (recruiter == null) return 0;
        return chatRepository.findByParticipants_Id(recruiter.getId()).size();
    }

    @Override
    public int getDrivesConductedCount() {
        User recruiter = getCurrentRecruiter();
        if (recruiter == null) return 0;
        return jobRepository.findByRecruiterOrderByCreatedAtDesc(recruiter).size();
    }

    @Override
    public int getTotalEmployees() {
        User recruiter = getCurrentRecruiter();
        if (recruiter == null) return 0;
        return recruiterProfileRepository.findByUser(recruiter)
            .map(rp -> {
                String ne = rp.getNumEmployees();
                if (ne == null || ne.isBlank()) return 0;
                // Parse range like "1-10" → take lower bound
                try { return Integer.parseInt(ne.split("-")[0].replace("+", "").trim()); }
                catch (Exception e) { return 0; }
            }).orElse(0);
    }

    @Override
    public List<Map<String, Object>> getCandidatesByMonth() {
        List<Map<String, Object>> result = new ArrayList<>();
        String[] months = {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};

        List<User> candidates = userRepository.findAll().stream()
            .filter(u -> u.getRole() == Role.CANDIDATE && u.getCreatedAt() != null)
            .collect(Collectors.toList());

        for (int i = 5; i >= 0; i--) {
            LocalDate target = LocalDate.now().minusMonths(i);
            int m = target.getMonthValue();
            int y = target.getYear();
            long count = candidates.stream().filter(u -> {
                LocalDate d = u.getCreatedAt().toLocalDate();
                return d.getMonthValue() == m && d.getYear() == y;
            }).count();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("month", months[m - 1]);
            entry.put("count", count);
            result.add(entry);
        }
        return result;
    }

    @Override
    public List<Map<String, Object>> getDrivesByMonth() {
        User recruiter = getCurrentRecruiter();
        List<Map<String, Object>> result = new ArrayList<>();
        String[] months = {"Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"};

        List<JobPosting> jobs = recruiter != null
            ? jobRepository.findByRecruiterOrderByCreatedAtDesc(recruiter)
            : Collections.emptyList();

        for (int i = 5; i >= 0; i--) {
            LocalDate target = LocalDate.now().minusMonths(i);
            int m = target.getMonthValue();
            int y = target.getYear();
            long count = jobs.stream().filter(j -> {
                if (j.getCreatedAt() == null) return false;
                LocalDate d = j.getCreatedAt().atZone(ZoneId.systemDefault()).toLocalDate();
                return d.getMonthValue() == m && d.getYear() == y;
            }).count();
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("month", months[m - 1]);
            entry.put("count", count);
            result.add(entry);
        }
        return result;
    }
}
