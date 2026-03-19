package com.SmartHireX.service;

import java.util.Optional;

import com.SmartHireX.dto.request.ProfileUpdateRequest;
import com.SmartHireX.dto.request.RegisterRequest;
import com.SmartHireX.entity.User;

public interface UserService {
    
    /**
     * Create a new user with the provided registration details
     * @param registerRequest The registration request containing user details
     * @return The created user
     */
    User createUser(RegisterRequest registerRequest);
    
    /**
     * Find a user by email
     * @param email The email to search for
     * @return An Optional containing the user if found
     */
    Optional<User> findByEmail(String email);
    
    /**
     * Find a user by ID
     * @param id The user ID to search for
     * @return An Optional containing the user if found
     */
    Optional<User> findById(Long id);
    
    /**
     * Check if a user with the given email exists
     * @param email The email to check
     * @return true if a user with the email exists, false otherwise
     */
    boolean existsByEmail(String email);
    
    /**
     * Save or update a user
     * @param user The user to save or update
     * @return The saved user
     */
    User save(User user);
    
    /**
     * Reset user password
     * @param email The email of the user
     * @param newPassword The new password
     */
    void resetPassword(String email, String newPassword);
    
    /**
     * Update user profile information
     * @param userId The ID of the user to update
     * @param updateRequest The update request containing new profile data
     * @return The updated user
     */
    User updateUserProfile(Long userId, ProfileUpdateRequest updateRequest);
}
