package com.SmartHireX.controller.chat;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.entity.CandidateProfile;
import com.SmartHireX.entity.Chat;
import com.SmartHireX.entity.Message;
import com.SmartHireX.entity.RecruiterProfile;
import com.SmartHireX.entity.Role;
import com.SmartHireX.entity.User;
import com.SmartHireX.repository.CandidateProfileRepository;
import com.SmartHireX.repository.ChatRepository;
import com.SmartHireX.repository.MessageRepository;
import com.SmartHireX.repository.RecruiterProfileRepository;
import com.SmartHireX.repository.UserRepository;
import com.SmartHireX.security.CurrentUser;
import com.SmartHireX.security.UserPrincipal;
import com.SmartHireX.service.PresenceService;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatRepository chatRepository;
    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final CandidateProfileRepository candidateProfileRepository;
    private final RecruiterProfileRepository recruiterProfileRepository;
    private final PresenceService presenceService;
    private final Cloudinary cloudinary;

    // In-memory last seen message per user per chat: userId -> (chatId -> lastSeenMessageId)
    private final Map<Long, Map<Long, Long>> lastSeenByUser = new ConcurrentHashMap<>();

    @GetMapping("/unread-count")
    public ResponseEntity<?> getUnreadCount(@CurrentUser UserPrincipal userPrincipal) {
        try {
            Long currentUserId = userPrincipal.getId();
            List<Chat> userChats = chatRepository.findByParticipants_Id(currentUserId);
            int totalUnreadCount = 0;
            List<Map<String, Object>> unreadChats = new ArrayList<>();
            
            for (Chat chat : userChats) {
                List<Message> msgs = messageRepository.findByChat_IdOrderByCreatedAtAsc(chat.getId());
                long lastSeenId = lastSeenByUser
                        .getOrDefault(currentUserId, Collections.emptyMap())
                        .getOrDefault(chat.getId(), 0L);

                int unreadForChat = 0;
                for (Message m : msgs) {
                    if (m.getSender() != null
                            && !Objects.equals(m.getSender().getId(), currentUserId)
                            && safeId(m) > lastSeenId) {
                        unreadForChat++;
                    }
                }
                
                if (unreadForChat > 0) {
                    totalUnreadCount += unreadForChat;
                    Map<String, Object> unreadChat = new HashMap<>();
                    unreadChat.put("chatId", chat.getId());
                    unreadChat.put("chatName", chat.getChatName());
                    unreadChat.put("unreadCount", unreadForChat);
                    unreadChat.put("lastMessage", msgs.isEmpty() ? "" : msgs.get(msgs.size() - 1).getText());
                    unreadChats.add(unreadChat);
                }
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("totalUnreadCount", totalUnreadCount);
            response.put("unreadChats", unreadChats);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch unread count");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/chats")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> getChats(@CurrentUser UserPrincipal userPrincipal) {
        try {
            Long currentUserId = userPrincipal.getId();
            List<Chat> chats = chatRepository.findByParticipants_Id(currentUserId);
            List<Map<String, Object>> result = new ArrayList<>();
            for (Chat c : chats) {
                // Try to get last message text
                List<Message> msgs = messageRepository.findByChat_IdOrderByCreatedAtAsc(c.getId());
                String lastText = msgs.isEmpty() ? null : msgs.get(msgs.size() - 1).getText();
                long lastSeenId = lastSeenByUser
                        .getOrDefault(currentUserId, Collections.emptyMap())
                        .getOrDefault(c.getId(), 0L);
                int unreadCount = 0;
                for (Message m : msgs) {
                    if (m.getSender() != null && !Objects.equals(m.getSender().getId(), currentUserId)
                            && safeId(m) > lastSeenId) {
                        unreadCount++;
                    }
                }
                result.add(mapChat(c, lastText, unreadCount));
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch chats");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/messages/{chatId}")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> getMessages(@PathVariable Long chatId, @CurrentUser UserPrincipal userPrincipal) {
        try {
            List<Message> list = messageRepository.findByChat_IdOrderByCreatedAtAsc(chatId);
            List<Map<String, Object>> result = new ArrayList<>();
            for (Message m : list) {
                result.add(mapMessage(m));
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to fetch messages");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @GetMapping("/search-users")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> searchUsers(@RequestParam("query") String query) {
        try {
            List<User> found = userRepository.searchUsers(query);
            List<Map<String, Object>> result = new ArrayList<>();
            for (User u : found) result.add(mapUser(u));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to search users");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/create-chat")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> createChat(@RequestBody Map<String, Object> body, @CurrentUser UserPrincipal principal) {
        try {
            Long currentUserId = principal.getId();
            Long participantId = Long.valueOf(String.valueOf(body.get("participantId")));
            User me = userRepository.findById(currentUserId).orElseThrow();
            User other = userRepository.findById(participantId).orElseThrow();

            Optional<Chat> existing = chatRepository.findDirectChat(currentUserId, participantId);
            Chat chat = existing.orElseGet(() -> {
                Chat c = new Chat();
                c.getParticipants().add(me);
                c.getParticipants().add(other);
                c.setLastActivity(LocalDateTime.now());
                return chatRepository.save(c);
            });

            // Map with last message if any
            List<Message> msgs = messageRepository.findByChat_IdOrderByCreatedAtAsc(chat.getId());
            String lastText = msgs.isEmpty() ? null : msgs.get(msgs.size() - 1).getText();
            long lastSeenId = lastSeenByUser
                    .getOrDefault(currentUserId, Collections.emptyMap())
                    .getOrDefault(chat.getId(), 0L);
            int unreadCount = 0;
            for (Message m : msgs) {
                if (m.getSender() != null && !Objects.equals(m.getSender().getId(), currentUserId)
                        && safeId(m) > lastSeenId) {
                    unreadCount++;
                }
            }
            return ResponseEntity.ok(mapChat(chat, lastText, unreadCount));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to create chat");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/send-message")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> body, @CurrentUser UserPrincipal principal) {
        try {
            Long chatId = Long.valueOf(String.valueOf(body.get("chatId")));
            String text = String.valueOf(body.get("text"));
            User sender = userRepository.findById(principal.getId()).orElseThrow();
            Chat chat = chatRepository.findById(chatId).orElseThrow();

            Message msg = new Message();
            msg.setChat(chat);
            msg.setSender(sender);
            msg.setText(text);
            msg = messageRepository.save(msg);

            chat.setLastActivity(LocalDateTime.now());
            chatRepository.save(chat);

            return ResponseEntity.ok(mapMessage(msg));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to send message");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/mark-read")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> markRead(@RequestBody Map<String, Object> body, @CurrentUser UserPrincipal principal) {
        try {
            Long userId = principal.getId();
            Long chatId = Long.valueOf(String.valueOf(body.get("chatId")));
            List<Message> msgs = messageRepository.findByChat_IdOrderByCreatedAtAsc(chatId);
            long latestId = 0L;
            if (!msgs.isEmpty()) {
                latestId = safeId(msgs.get(msgs.size() - 1));
            }
            lastSeenByUser.computeIfAbsent(userId, k -> new ConcurrentHashMap<>()).put(chatId, latestId);

            Map<String, Object> res = new HashMap<>();
            res.put("status", "ok");
            res.put("chatId", chatId);
            res.put("lastSeenMessageId", latestId);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to mark as read");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @DeleteMapping("/delete-chat/{chatId}")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteChat(@PathVariable Long chatId, @CurrentUser UserPrincipal principal) {
        try {
            Long currentUserId = principal.getId();
            
            // Check if chat exists and user is a participant
            Optional<Chat> chatOpt = chatRepository.findById(chatId);
            if (chatOpt.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Chat not found");
                return ResponseEntity.status(404).body(error);
            }
            
            Chat chat = chatOpt.get();
            boolean isParticipant = chat.getParticipants().stream()
                .anyMatch(user -> Objects.equals(user.getId(), currentUserId));
            
            if (!isParticipant) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "You are not authorized to delete this chat");
                return ResponseEntity.status(403).body(error);
            }
            
            // Delete all messages in the chat first
            List<Message> messages = messageRepository.findByChat_IdOrderByCreatedAtAsc(chatId);
            if (!messages.isEmpty()) {
                messageRepository.deleteAll(messages);
            }
            
            // Remove from lastSeenByUser map
            lastSeenByUser.values().forEach(userMap -> userMap.remove(chatId));
            
            // Delete the chat
            chatRepository.delete(chat);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Chat deleted successfully");
            response.put("chatId", chatId);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to delete chat");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @DeleteMapping("/delete-message/{messageId}")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteMessage(@PathVariable Long messageId, @CurrentUser UserPrincipal principal) {
        try {
            Long currentUserId = principal.getId();
            
            // Check if message exists and user is the sender
            Optional<Message> messageOpt = messageRepository.findById(messageId);
            if (messageOpt.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Message not found");
                return ResponseEntity.status(404).body(error);
            }
            
            Message message = messageOpt.get();
            if (!Objects.equals(message.getSender().getId(), currentUserId)) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "You can only delete your own messages");
                return ResponseEntity.status(403).body(error);
            }
            
            // Delete the message
            messageRepository.delete(message);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "Message deleted successfully");
            response.put("messageId", messageId);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to delete message");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/toggle-save-message")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> toggleSaveMessage(@RequestBody Map<String, Object> body, @CurrentUser UserPrincipal principal) {
        try {
            Long messageId = Long.valueOf(String.valueOf(body.get("messageId")));
            
            Optional<Message> messageOpt = messageRepository.findById(messageId);
            if (messageOpt.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Message not found");
                return ResponseEntity.status(404).body(error);
            }
            
            Message message = messageOpt.get();
            message.setSaved(!message.isSaved()); // Toggle saved status
            messageRepository.save(message);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", message.isSaved() ? "Message saved" : "Message unsaved");
            response.put("messageId", messageId);
            response.put("savedByUser", message.isSaved());
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to toggle save message");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    @PostMapping("/upload-file")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> uploadFile(@RequestParam("file") org.springframework.web.multipart.MultipartFile file,
                                       @RequestParam("chatId") String chatId,
                                       @CurrentUser UserPrincipal principal) {
        try {
            System.out.println("File upload request received");
            System.out.println("File name: " + file.getOriginalFilename());
            System.out.println("File size: " + file.getSize());
            System.out.println("Chat ID: " + chatId);
            System.out.println("Principal: " + (principal != null ? principal.getId() : "null"));
            
            if (principal == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "User not authenticated");
                return ResponseEntity.status(401).body(error);
            }
            
            if (file.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "No file provided");
                return ResponseEntity.status(400).body(error);
            }
            
            // Validate file size (1MB limit)
            if (file.getSize() > 1024 * 1024) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "File size must be less than 1MB");
                return ResponseEntity.status(400).body(error);
            }
            
            // Validate file type
            String contentType = file.getContentType();
            if (contentType == null || 
                (!contentType.startsWith("image/") && !contentType.equals("application/pdf"))) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Only images and PDF files are allowed");
                return ResponseEntity.status(400).body(error);
            }
            
            // Upload file to Cloudinary
            String originalFileName = file.getOriginalFilename();
            System.out.println("Uploading file to Cloudinary: " + originalFileName);
            
            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = (Map<String, Object>) cloudinary.uploader().upload(file.getBytes(), 
                ObjectUtils.asMap(
                    "folder", "smarthirex/chat-files",
                    "resource_type", "auto",
                    "public_id", System.currentTimeMillis() + "_" + originalFileName
                ));
            
            String fileUrl = (String) uploadResult.get("secure_url");
            System.out.println("File uploaded successfully to: " + fileUrl);
            
            // Create message with file attachment
            System.out.println("Looking up user with ID: " + principal.getId());
            User sender = userRepository.findById(principal.getId()).orElseThrow(() -> 
                new RuntimeException("User not found with ID: " + principal.getId()));
            
            System.out.println("Looking up chat with ID: " + chatId);
            Chat chat = chatRepository.findById(Long.valueOf(chatId)).orElseThrow(() -> 
                new RuntimeException("Chat not found with ID: " + chatId));
            
            Message msg = new Message();
            msg.setChat(chat);
            msg.setSender(sender);
            msg.setText(originalFileName); // Store original filename as text
            
            // Set file attachment fields
            msg.setFileName(originalFileName);
            msg.setFileUrl(fileUrl);
            msg.setFileSize(file.getSize());
            msg.setContentType(contentType);
            msg.setMessageType(contentType != null && contentType.startsWith("image/") ? "image" : "file");
            
            System.out.println("Saving message to database...");
            msg = messageRepository.save(msg);
            System.out.println("Message saved with ID: " + msg.getId());
            
            chat.setLastActivity(java.time.LocalDateTime.now());
            chatRepository.save(chat);
            
            // Return the mapped message (attachment will be included automatically)
            Map<String, Object> response = mapMessage(msg);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("File upload error: " + e.getMessage());
            e.printStackTrace();
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to upload file");
            error.put("message", e.getMessage());
            error.put("details", e.getClass().getSimpleName());
            return ResponseEntity.status(500).body(error);
        }
    }

    @DeleteMapping("/delete-file/{messageId}")
    @PreAuthorize("hasRole('CANDIDATE') or hasRole('RECRUITER') or hasRole('ADMIN')")
    public ResponseEntity<?> deleteFileMessage(@PathVariable Long messageId, @CurrentUser UserPrincipal principal) {
        try {
            Long currentUserId = principal.getId();
            
            // Check if message exists and user is the sender
            Optional<Message> messageOpt = messageRepository.findById(messageId);
            if (messageOpt.isEmpty()) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "File message not found");
                return ResponseEntity.status(404).body(error);
            }
            
            Message message = messageOpt.get();
            if (!Objects.equals(message.getSender().getId(), currentUserId)) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "You can only delete your own files");
                return ResponseEntity.status(403).body(error);
            }
            
            // Delete the actual file from storage
            if (message.getFileUrl() != null) {
                try {
                    // Extract filename from URL (assuming format: /api/files/filename)
                    String fileName = message.getFileUrl().substring(message.getFileUrl().lastIndexOf("/") + 1);
                    java.nio.file.Path filePath = java.nio.file.Paths.get("uploads/chat-files/" + fileName);
                    if (java.nio.file.Files.exists(filePath)) {
                        java.nio.file.Files.delete(filePath);
                    }
                } catch (Exception fileDeleteError) {
                    // Log error but don't fail the entire operation
                    System.err.println("Failed to delete file: " + fileDeleteError.getMessage());
                }
            }
            
            // Delete the message record
            messageRepository.delete(message);
            
            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("message", "File message deleted successfully");
            response.put("messageId", messageId);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to delete file message");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }

    // File serving is now handled by Cloudinary - no local file serving needed

    // Helper mapping methods
    private Map<String, Object> mapUser(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("_id", String.valueOf(u.getId()));
        m.put("firstName", u.getFirstName());
        m.put("lastName", u.getLastName());
        m.put("role", u.getRole());
        m.put("email", u.getEmail());
        
        // Add computed name field for frontend compatibility
        String fullName = "";
        if (u.getFirstName() != null && !u.getFirstName().trim().isEmpty()) {
            fullName = u.getFirstName().trim();
            if (u.getLastName() != null && !u.getLastName().trim().isEmpty()) {
                fullName += " " + u.getLastName().trim();
            }
        } else if (u.getLastName() != null && !u.getLastName().trim().isEmpty()) {
            fullName = u.getLastName().trim();
        }
        
        // If no name available, use email prefix as fallback
        if (fullName.isEmpty() && u.getEmail() != null) {
            fullName = u.getEmail().split("@")[0];
        }
        
        m.put("name", fullName.isEmpty() ? null : fullName);
        m.put("isOnline", presenceService.isUserOnline(u.getId()));
        m.put("lastSeen", presenceService.getUserLastSeen(u.getId()));
        
        // Platform avatar only: use recruiter/candidate profile image, never OAuth/email provider image
        String profileImage = null;
        try {
            if (u.getRole() == Role.ADMIN) {
                // Admin platform profile image is stored on User.imageUrl
                if (u.getImageUrl() != null && !u.getImageUrl().isBlank()) {
                    profileImage = u.getImageUrl();
                }
            } else {
                Optional<RecruiterProfile> recruiterProfile = recruiterProfileRepository.findByUser(u);
                if (recruiterProfile.isPresent() && recruiterProfile.get().getImage() != null
                        && !recruiterProfile.get().getImage().isBlank()) {
                    profileImage = recruiterProfile.get().getImage();
                }

                if (profileImage == null || profileImage.isEmpty()) {
                    Optional<CandidateProfile> candidateProfile = candidateProfileRepository.findByUser(u);
                    if (candidateProfile.isPresent() && candidateProfile.get().getProfileImage() != null
                            && !candidateProfile.get().getProfileImage().isBlank()) {
                        profileImage = candidateProfile.get().getProfileImage();
                    }
                }
            }
        } catch (Exception e) {
            profileImage = null;
        }
        m.put("image", profileImage);
        return m;
    }

    private Map<String, Object> mapChat(Chat c, String lastMessageText, int unreadCount) {
        Map<String, Object> m = new HashMap<>();
        m.put("_id", String.valueOf(c.getId()));
        List<Map<String, Object>> participants = new ArrayList<>();
        for (User u : c.getParticipants()) participants.add(mapUser(u));
        m.put("participants", participants);
        Map<String, Object> last = new HashMap<>();
        last.put("text", lastMessageText);
        m.put("lastMessage", last);
        m.put("lastActivity", (c.getLastActivity() != null ? c.getLastActivity() : LocalDateTime.now()).toString());
        m.put("unreadCount", unreadCount);
        
        // Add chat type and name
        m.put("chatType", c.getChatType() != null ? c.getChatType() : "direct");
        m.put("chatName", c.getChatName());
        
        return m;
    }

    private Map<String, Object> mapMessage(Message msg) {
        Map<String, Object> m = new HashMap<>();
        m.put("_id", String.valueOf(msg.getId()));
        m.put("sender", mapUser(msg.getSender()));
        m.put("text", msg.getText());
        m.put("createdAt", (msg.getCreatedAt() != null ? msg.getCreatedAt() : LocalDateTime.now()).toString());
        m.put("messageType", msg.getMessageType() != null ? msg.getMessageType() : "text");
        m.put("isSaved", msg.isSaved());
        
        // Add attachment data if file exists
        if (msg.getFileName() != null && msg.getFileUrl() != null) {
            Map<String, Object> attachment = new HashMap<>();
            attachment.put("fileName", msg.getFileName());
            attachment.put("url", msg.getFileUrl());
            attachment.put("fileSize", msg.getFileSize());
            attachment.put("contentType", msg.getContentType());
            m.put("attachment", attachment);
        }
        
        return m;
    }

    private long safeId(Message m) {
        try {
            return m.getId() == null ? 0L : m.getId();
        } catch (Exception ignored) {
            return 0L;
        }
    }
}
