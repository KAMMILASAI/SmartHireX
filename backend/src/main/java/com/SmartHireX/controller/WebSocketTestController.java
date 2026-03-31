package com.SmartHireX.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/ws")
@CrossOrigin(origins = "*")
public class WebSocketTestController {
    
    @GetMapping("/test")
    public ResponseEntity<?> testWebSocketEndpoint() {
        return ResponseEntity.ok(Map.of(
            "status", "WebSocket endpoint is accessible",
            "endpoint", "/ws/signaling",
            "message", "WebSocket server is running",
            "timestamp", System.currentTimeMillis()
        ));
    }
    
    @GetMapping("/status")
    public ResponseEntity<?> getWebSocketStatus() {
        return ResponseEntity.ok(Map.of(
            "websocket_url", "ws://localhost:8080/ws/signaling",
            "http_test_url", "http://localhost:8080/api/ws/test",
            "server_running", true,
            "context_path", "/api"
        ));
    }
}
