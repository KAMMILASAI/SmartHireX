package com.SmartHireX.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.SmartHireX.entity.EmailNotificationLog;

@Repository
public interface EmailNotificationLogRepository extends JpaRepository<EmailNotificationLog, Long> {

    Optional<EmailNotificationLog> findByNotificationKey(String notificationKey);

    void deleteByCandidateId(Long candidateId);
    void deleteByCandidateEmail(String candidateEmail);
    void deleteByJobId(Long jobId);
    void deleteByRoundId(Long roundId);
}
