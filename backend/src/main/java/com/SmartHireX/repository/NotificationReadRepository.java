package com.SmartHireX.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.entity.NotificationRead;

import java.util.List;
import java.util.Optional;

@Repository
public interface NotificationReadRepository extends JpaRepository<NotificationRead, Long> {
    @Query("SELECT nr.notificationId FROM NotificationRead nr WHERE nr.userEmail = :userEmail")
    List<Long> findNotificationIdsByUserEmail(@Param("userEmail") String userEmail);
    boolean existsByNotificationIdAndUserEmail(Long notificationId, String userEmail);
    Optional<NotificationRead> findByNotificationIdAndUserEmail(Long notificationId, String userEmail);
    List<NotificationRead> findByUserEmail(String userEmail);

    @Modifying
    @Transactional
    long deleteByUserEmail(String userEmail);
}
