package com.SmartHireX.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.entity.User;
import com.SmartHireX.exception.ResourceNotFoundException;
import com.SmartHireX.repository.UserRepository;

@Service
public class CustomUserDetailsService implements UserDetailsService {
    private static final Logger logger = LoggerFactory.getLogger(CustomUserDetailsService.class);

    private final UserRepository userRepository;

    @Autowired
    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        logger.debug("Loading user by email: {}", email);
        
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> {
                    logger.error("User not found with email: {}", email);
                    return new UsernameNotFoundException("User not found with email: " + email);
                });

        logger.debug("Successfully loaded user: {}", user.getEmail());
        return UserPrincipal.create(user);
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long id) {
        logger.debug("Loading user by ID: {}", id);
        
        User user = userRepository.findById(id).orElseThrow(
                () -> {
                    logger.error("User not found with ID: {}", id);
                    return new ResourceNotFoundException("User", "id", id);
                }
        );
        
        logger.debug("Successfully loaded user by ID: {}", user.getEmail());
        return UserPrincipal.create(user);
    }
}
