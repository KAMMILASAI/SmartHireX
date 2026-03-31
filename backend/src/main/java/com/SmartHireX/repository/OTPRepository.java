package com.SmartHireX.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.entity.OTP;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OTPRepository extends JpaRepository<OTP, Long> {
    
    Optional<OTP> findByEmailAndOtpCodeAndUsedFalse(String email, String otpCode);
    
    Optional<OTP> findByEmailAndOtpCodeAndTypeAndUsedFalse(String email, String otpCode, OTP.OTPType type);
    
    List<OTP> findByEmailAndUsedFalseOrderByCreatedAtDesc(String email);
    
    Optional<OTP> findTopByEmailAndTypeAndUsedFalseOrderByCreatedAtDesc(String email, OTP.OTPType type);
    
    @Modifying
    @Transactional
    @Query("UPDATE OTP o SET o.used = true WHERE o.email = :email AND o.used = false")
    void markAllOTPsAsUsedForEmail(@Param("email") String email);
    
    @Modifying
    @Transactional
    @Query("UPDATE OTP o SET o.used = true WHERE o.email = :email AND o.type = :type AND o.used = false")
    void markAllOTPsAsUsedForEmailAndType(@Param("email") String email, @Param("type") OTP.OTPType type);
    
    @Modifying
    @Transactional
    @Query("DELETE FROM OTP o WHERE o.expiresAt < :now")
    void deleteExpiredOTPs(@Param("now") LocalDateTime now);
    
    @Query("SELECT COUNT(o) FROM OTP o WHERE o.email = :email AND o.createdAt > :since")
    long countOTPsCreatedSince(@Param("email") String email, @Param("since") LocalDateTime since);

    void deleteByEmail(String email);
}
