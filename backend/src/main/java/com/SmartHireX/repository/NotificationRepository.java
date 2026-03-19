package com.SmartHireX.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.SmartHireX.entity.Notification;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findAllByOrderByCreatedAtDesc();
    List<Notification> findByAudienceIgnoreCaseOrderByCreatedAtDesc(String audience);
    
    // Find notifications for specific audience OR "all" audience
    @Query("SELECT n FROM Notification n WHERE LOWER(n.audience) = LOWER(:audience) OR LOWER(n.audience) = 'all' ORDER BY n.createdAt DESC")
    List<Notification> findByAudienceOrAllOrderByCreatedAtDesc(@Param("audience") String audience);
}
