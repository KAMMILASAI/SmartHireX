package com.SmartHireX.service;

import com.SmartHireX.dto.ChatMessageRequest;
import com.SmartHireX.dto.ChatMessageResponse;
import com.SmartHireX.model.ChatMessage;
import com.SmartHireX.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ChatService {
    
    private final ChatMessageRepository chatMessageRepository;
    
    public ChatMessageResponse sendMessage(ChatMessageRequest request) {
        ChatMessage chatMessage = new ChatMessage(
            request.getRoomCode(),
            request.getUsername(),
            request.getMessage()
        );
        
        ChatMessage saved = chatMessageRepository.save(chatMessage);
        return mapToResponse(saved);
    }
    
    public List<ChatMessageResponse> getChatHistory(String roomCode) {
        List<ChatMessage> messages = chatMessageRepository.findByRoomCodeOrderByTimestampAsc(roomCode);
        return messages.stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    
    @Transactional
    public void deleteChatHistory(String roomCode) {
        chatMessageRepository.deleteByRoomCode(roomCode);
    }
    
    private ChatMessageResponse mapToResponse(ChatMessage chatMessage) {
        return new ChatMessageResponse(
            chatMessage.getId(),
            chatMessage.getRoomCode(),
            chatMessage.getUsername(),
            chatMessage.getMessage(),
            chatMessage.getTimestamp()
        );
    }
}
