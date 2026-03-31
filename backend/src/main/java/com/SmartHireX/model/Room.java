package com.SmartHireX.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "rooms")
public class Room {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String roomCode;
    private String password;
    private String roomName;
    private String creator; // Track who created the room
    private LocalDateTime createdAt;
    
    @ElementCollection
    @CollectionTable(name = "room_participants", joinColumns = @JoinColumn(name = "room_id"))
    @Column(name = "participant")
    private Set<String> participants = new HashSet<>();
    
    private boolean active;
    
    public Room(String roomCode, String password, String roomName, String creator) {
        this.roomCode = roomCode;
        this.password = password;
        this.roomName = roomName;
        this.creator = creator;
        this.createdAt = LocalDateTime.now();
        this.active = true;
        this.participants = new HashSet<>();
    }
}
