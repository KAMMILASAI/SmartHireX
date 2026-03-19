package com.SmartHireX.controller;

import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.dto.ChatMessageRequest;
import com.SmartHireX.dto.ChatMessageResponse;
import com.SmartHireX.dto.JoinRoomRequest;
import com.SmartHireX.dto.RoomRequest;
import com.SmartHireX.dto.RoomResponse;
import com.SmartHireX.service.ChatService;
import com.SmartHireX.service.RoomService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/rooms")
@RequiredArgsConstructor
public class RoomController {
    
    private final RoomService roomService;
    private final ChatService chatService;
    
    @PostMapping("/create")
    public ResponseEntity<?> createRoom(@Valid @RequestBody RoomRequest request) {
        try {
            RoomResponse room = roomService.createRoom(request);
            return ResponseEntity.ok(room);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/join")
    public ResponseEntity<?> joinRoom(@Valid @RequestBody JoinRoomRequest request) {
        try {
            RoomResponse room = roomService.joinRoom(request);
            return ResponseEntity.ok(room);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/leave")
    public ResponseEntity<?> leaveRoom(@RequestBody Map<String, String> request) {
        try {
            String roomCode = request.get("roomCode");
            String username = request.get("username");
            roomService.leaveRoom(roomCode, username);
            return ResponseEntity.ok(Map.of("message", "Left room successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/reactivate")
    public ResponseEntity<?> reactivateRoom(@RequestBody Map<String, String> request) {
        try {
            String roomCode = request.get("roomCode");
            String username = request.get("username");
            roomService.reactivateRoom(roomCode, username);
            return ResponseEntity.ok(Map.of("message", "Room reactivated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    // Chat endpoints
    @PostMapping("/chat/send")
    public ResponseEntity<?> sendChatMessage(@RequestBody @Valid ChatMessageRequest request) {
        try {
            ChatMessageResponse response = chatService.sendMessage(request);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping("/chat/history/{roomCode}")
    public ResponseEntity<?> getChatHistory(@PathVariable String roomCode) {
        try {
            List<ChatMessageResponse> messages = chatService.getChatHistory(roomCode);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    @DeleteMapping("/chat/history/{roomCode}")
    public ResponseEntity<?> deleteChatHistory(@PathVariable String roomCode) {
        try {
            chatService.deleteChatHistory(roomCode);
            return ResponseEntity.ok(Map.of("message", "Chat history deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
    
    @PostMapping("/end-meeting")
    public ResponseEntity<?> endMeeting(@RequestBody Map<String, String> request) {
        try {
            String roomCode = request.get("roomCode");
            String username = request.get("username");
            
            // Delete chat history first
            chatService.deleteChatHistory(roomCode);
            
            // Delete the room
            roomService.deleteRoom(roomCode, username);
            
            return ResponseEntity.ok(Map.of("message", "Meeting ended successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", e.getMessage()));
        }
    }
}
