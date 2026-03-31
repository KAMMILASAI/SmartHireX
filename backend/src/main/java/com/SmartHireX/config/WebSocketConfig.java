package com.SmartHireX.config;

import com.SmartHireX.handler.SignalingHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketConfigurer {
    
    private final SignalingHandler signalingHandler;
    
    @Override
    public void registerWebSocketHandlers(@NonNull WebSocketHandlerRegistry registry) {
        // Register WebSocket handler - try both root level and under /api
        registry.addHandler(signalingHandler, "/ws/signaling")
                .setAllowedOrigins("*")
                .setAllowedOriginPatterns("*");
        
        // Also register under /api path in case servlet context affects it
        registry.addHandler(signalingHandler, "/api/ws/signaling")
                .setAllowedOrigins("*")
                .setAllowedOriginPatterns("*");
    }
}
