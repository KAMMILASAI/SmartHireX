package com.SmartHireX.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.SmartHireX.entity.ExamAccessLock;

@Repository
public interface ExamAccessLockRepository extends JpaRepository<ExamAccessLock, Long> {

    Optional<ExamAccessLock> findByRoundIdAndCandidateEmailIgnoreCase(Long roundId, String candidateEmail);
}
