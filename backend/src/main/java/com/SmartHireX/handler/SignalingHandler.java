package com.SmartHireX.handler;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class SignalingHandler extends TextWebSocketHandler {
    
    private final Map<String, Map<String, WebSocketSession>> rooms = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToUsername = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        log.info("✅ WebSocket connection established: {} from {}", session.getId(), session.getRemoteAddress());
        log.info("📡 WebSocket URI: {}", session.getUri());
    }
    
    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        log.info("Received message: {}", payload);
        
        try {
            Map<String, Object> data = objectMapper.readValue(payload, new TypeReference<Map<String, Object>>() {});
            String type = (String) data.get("type");
            String roomCode = (String) data.get("roomCode");
            String username = (String) data.get("username");
            
            switch (type) {
                case "join":
                    String password = (String) data.get("password");
                    handleJoin(session, roomCode, username, password);
                    break;
                case "offer":
                case "answer":
                case "ice-candidate":
                    handleSignaling(session, data, roomCode);
                    break;
                case "leave":
                    handleLeave(session, roomCode, username);
                    break;
                case "chat":
                    handleChat(session, data, roomCode, username);
                    break;
                default:
                    log.warn("Unknown message type: {}", type);
            }
        } catch (Exception e) {
            log.error("Error handling message: {}", e.getMessage());
        }
    }
    
    private void handleJoin(WebSocketSession session, String roomCode, String username, String password) throws IOException {
        // For now, we'll allow joining without password validation
        // In a production environment, you would validate the password against the database
        // TODO: Add password validation logic here
        
        // Store session to username mapping
        sessionToUsername.put(session.getId(), username);
        
        rooms.computeIfAbsent(roomCode, k -> new ConcurrentHashMap<>())
              .put(username, session);
        
        // Notify other participants
        Map<String, Object> joinMessage = Map.of(
            "type", "user-joined",
            "username", username
        );
        
        broadcastToRoom(roomCode, joinMessage, username);
        
        // Send existing participants list to new user
        Map<String, Object> participantsMessage = Map.of(
            "type", "participants",
            "users", rooms.get(roomCode).keySet()
        );
        
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(participantsMessage)));
        
        log.info("User {} joined room {} with password: {}", username, roomCode, password != null ? "[PROVIDED]" : "[NOT PROVIDED]");
    }
    
    private void handleSignaling(WebSocketSession session, Map<String, Object> data, String roomCode) throws IOException {
        String senderUsername = sessionToUsername.get(session.getId());
        String targetUser = (String) data.get("target");
        
        log.info("📡 Handling signaling from {} to {} in room {}: {}", senderUsername, targetUser, roomCode, data.get("type"));
        
        if (senderUsername == null) {
            log.warn("⚠️ No username found for session {}", session.getId());
            return;
        }
        
        // Add sender information to the message
        Map<String, Object> messageWithSender = new java.util.HashMap<>(data);
        messageWithSender.put("sender", senderUsername);
        
        if (targetUser != null) {
            // Direct message to specific user
            if (rooms.containsKey(roomCode) && rooms.get(roomCode).containsKey(targetUser)) {
                WebSocketSession targetSession = rooms.get(roomCode).get(targetUser);
                targetSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(messageWithSender)));
                log.info("✅ Forwarded {} from {} to {}", data.get("type"), senderUsername, targetUser);
            } else {
                log.warn("⚠️ Target user {} not found in room {}", targetUser, roomCode);
            }
        } else {
            // Broadcast to all other users in the room
            broadcastToRoom(roomCode, messageWithSender, senderUsername);
            log.info("✅ Broadcasted {} from {} to room {}", data.get("type"), senderUsername, roomCode);
        }
    }
    
    private void handleLeave(WebSocketSession session, String roomCode, String username) throws IOException {
        if (rooms.containsKey(roomCode)) {
            rooms.get(roomCode).remove(username);
            
            // Notify other participants
            Map<String, Object> leaveMessage = Map.of(
                "type", "user-left",
                "username", username
            );
            
            broadcastToRoom(roomCode, leaveMessage, null);
            
            // Remove room if empty
            if (rooms.get(roomCode).isEmpty()) {
                rooms.remove(roomCode);
            }
            
            log.info("User {} left room {}", username, roomCode);
        }
    }
    
    private void handleChat(WebSocketSession session, Map<String, Object> data, String roomCode, String username) throws IOException {
        String message = (String) data.get("message");
        
        // Create chat message
        Map<String, Object> chatMessage = Map.of(
            "type", "chat",
            "username", username,
            "message", message,
            "timestamp", System.currentTimeMillis()
        );
        
        // Broadcast to all participants in the room (including sender for confirmation)
        broadcastToRoom(roomCode, chatMessage, null);
        
        log.info("Chat message from {} in room {}: {}", username, roomCode, message);
    }
    
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        log.info("WebSocket connection closed: {}", session.getId());
        
        String username = sessionToUsername.get(session.getId());
        
        // Remove session from all rooms
        rooms.forEach((roomCode, participants) -> {
            participants.entrySet().removeIf(entry -> {
                if (entry.getValue().getId().equals(session.getId())) {
                    try {
                        Map<String, Object> leaveMessage = Map.of(
                            "type", "user-left",
                            "username", entry.getKey()
                        );
                        broadcastToRoom(roomCode, leaveMessage, null);
                        log.info("👋 User {} left room {} (connection closed)", entry.getKey(), roomCode);
                    } catch (IOException e) {
                        log.error("Error broadcasting leave message", e);
                    }
                    return true;
                }
                return false;
            });
        });
        
        // Clean up session mapping
        sessionToUsername.remove(session.getId());
        
        // Clean up empty rooms
        rooms.entrySet().removeIf(entry -> entry.getValue().isEmpty());
        
        if (username != null) {
            log.info("🧹 Cleaned up session for user: {}", username);
        }
    }
    
    private void broadcastToRoom(String roomCode, Map<String, Object> message, String excludeUser) throws IOException {
        if (!rooms.containsKey(roomCode)) {
            return;
        }
        
        String messageJson = objectMapper.writeValueAsString(message);
        
        for (Map.Entry<String, WebSocketSession> entry : rooms.get(roomCode).entrySet()) {
            if (excludeUser == null || !entry.getKey().equals(excludeUser)) {
                try {
                    entry.getValue().sendMessage(new TextMessage(messageJson));
                } catch (Exception e) {
                    log.error("Error sending message to user {}: {}", entry.getKey(), e.getMessage());
                }
            }
        }
    }
}
