package com.SmartHireX.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.SmartHireX.entity.Chat;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatRepository extends JpaRepository<Chat, Long> {
    // All chats where a user participates
    List<Chat> findByParticipants_Id(Long userId);

    // Try to find a 1:1 chat with both participants
    @Query("select c from Chat c join c.participants p1 join c.participants p2 where p1.id = :user1 and p2.id = :user2")
    Optional<Chat> findDirectChat(@Param("user1") Long user1, @Param("user2") Long user2);
}
