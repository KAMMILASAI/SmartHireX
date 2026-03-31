package com.SmartHireX.service.impl;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.SmartHireX.dto.request.ProfileUpdateRequest;
import com.SmartHireX.dto.request.RegisterRequest;
import com.SmartHireX.entity.Role;
import com.SmartHireX.entity.User;
import com.SmartHireX.repository.UserRepository;
import com.SmartHireX.service.UserService;

import java.util.Optional;

@Service
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserServiceImpl(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public User createUser(RegisterRequest registerRequest) {
        User user = new User();
        user.setFirstName(registerRequest.getFirstName());
        user.setLastName(registerRequest.getLastName());
        user.setEmail(registerRequest.getEmail());
        // Allow null phone for OAuth2; persist empty string if null to avoid NPEs
        user.setPhone(registerRequest.getPhone() != null ? registerRequest.getPhone() : "");

        // If password is absent (OAuth2 registration), generate a secure random one
        String rawPassword = registerRequest.getPassword();
        if (rawPassword == null || rawPassword.trim().isEmpty()) {
            java.security.SecureRandom sr = new java.security.SecureRandom();
            byte[] bytes = new byte[12];
            sr.nextBytes(bytes);
            StringBuilder sb = new StringBuilder();
            for (byte b : bytes) {
                sb.append(String.format("%02x", b));
            }
            rawPassword = sb.toString();
        }
        user.setPassword(passwordEncoder.encode(rawPassword));
        // Convert String role to Role enum
        String roleStr = registerRequest.getRole();
        Role role = Role.CANDIDATE; // default
        if ("admin".equalsIgnoreCase(roleStr)) {
            role = Role.ADMIN;
        } else if ("recruiter".equalsIgnoreCase(roleStr)) {
            role = Role.RECRUITER;
        }
        user.setRole(role);
        user.setVerified(registerRequest.isVerified());
        
        return userRepository.save(user);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email);
    }

    @Override
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmailIgnoreCase(email);
    }

    @Override
    public User save(User user) {
        return userRepository.save(user);
    }

    @Override
    public void resetPassword(String email, String newPassword) {
        Optional<User> userOptional = userRepository.findByEmailIgnoreCase(email);
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
        } else {
            throw new RuntimeException("User not found with email: " + email);
        }
    }

    @Override
    public Optional<User> findById(Long id) {
        return userRepository.findById(id);
    }

    @Override
    public User updateUserProfile(Long userId, ProfileUpdateRequest updateRequest) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        
        // Name handling: allow either separate first/last or a combined 'name'
        if (updateRequest.getName() != null && !updateRequest.getName().trim().isEmpty()) {
            String name = updateRequest.getName().trim();
            String[] parts = name.split("\\s+", 2);
            user.setFirstName(parts[0]);
            user.setLastName(parts.length > 1 ? parts[1] : "");
        } else {
            if (updateRequest.getFirstName() != null) {
                user.setFirstName(updateRequest.getFirstName());
            }
            if (updateRequest.getLastName() != null) {
                user.setLastName(updateRequest.getLastName());
            }
        }

        if (updateRequest.getPhone() != null) {
            user.setPhone(updateRequest.getPhone());
        }

        if (updateRequest.getWebsite() != null) {
            user.setWebsite(updateRequest.getWebsite());
        }

        return userRepository.save(user);
    }
}
