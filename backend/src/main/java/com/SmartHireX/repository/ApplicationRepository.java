package com.SmartHireX.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.SmartHireX.model.Application;
import com.SmartHireX.model.JobPosting;

import java.util.List;

public interface ApplicationRepository extends JpaRepository<Application, Long> {
    boolean existsByJob_IdAndEmailLower(Long jobId, String emailLower);
    List<Application> findByJob_IdOrderByCreatedAtDesc(Long jobId);
    List<Application> findByEmailLowerOrderByCreatedAtDesc(String emailLower);
    List<Application> findByJob_IdAndStatusIgnoreCase(Long jobId, String status);
    List<Application> findByJobAndStatus(JobPosting job, String status);
    
    // Additional method for workflow management
    List<Application> findByJobId(Long jobId);
}
