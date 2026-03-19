package com.SmartHireX.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.SmartHireX.entity.User;
import com.SmartHireX.model.JobPosting;

import java.util.List;
import java.time.Instant;

public interface JobRepository extends JpaRepository<JobPosting, Long> {
    List<JobPosting> findByRecruiterOrderByCreatedAtDesc(User recruiter);

    @Query("SELECT j FROM JobPosting j WHERE j.status = 'active' AND (j.endDate IS NULL OR j.endDate > :now) ORDER BY j.createdAt DESC")
    List<JobPosting> findActiveNonExpired(@Param("now") Instant now);

    // Find all jobs by status including expired ones
    List<JobPosting> findByStatusOrderByCreatedAtDesc(String status);

    // Public job access via unique shareable link
    java.util.Optional<JobPosting> findByLinkId(String linkId);
}
