package com.SmartHireX.repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.entity.Message;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    List<Message> findByChat_IdOrderByCreatedAtAsc(Long chatId);

    @Modifying
    @Transactional
    long deleteBySender_Id(Long senderId);

    @Modifying
    @Transactional
    long deleteByChat_Id(Long chatId);
}
