package com.SmartHireX.repository;

import com.SmartHireX.entity.ResumeAnalysisHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResumeAnalysisHistoryRepository extends JpaRepository<ResumeAnalysisHistory, Long> {
    
    @Query("SELECT h FROM ResumeAnalysisHistory h WHERE h.userEmail = :email ORDER BY h.createdAt DESC")
    List<ResumeAnalysisHistory> findByUserEmailOrderByCreatedAtDesc(@Param("email") String email);
    
    @Query("SELECT COUNT(h) FROM ResumeAnalysisHistory h WHERE h.userEmail = :email")
    Long countByUserEmail(@Param("email") String email);
    
    void deleteByUserEmailAndId(String userEmail, Long id);
    
    void deleteByUserEmail(String userEmail);
}
