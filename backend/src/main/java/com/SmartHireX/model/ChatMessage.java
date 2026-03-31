package com.SmartHireX.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "chat_messages")
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String roomCode;
    private String username;
    private String message;
    private LocalDateTime timestamp;
    
    public ChatMessage(String roomCode, String username, String message) {
        this.roomCode = roomCode;
        this.username = username;
        this.message = message;
        this.timestamp = LocalDateTime.now();
    }
}
