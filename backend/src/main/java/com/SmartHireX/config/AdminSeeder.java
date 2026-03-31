package com.SmartHireX.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.SmartHireX.entity.Role;
import com.SmartHireX.entity.User;
import com.SmartHireX.repository.UserRepository;
import com.SmartHireX.security.oauth2.AuthProvider;

import java.util.Optional;

@Component
public class AdminSeeder implements CommandLineRunner {
    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.email:smarthirex1@gmail.com}")
    private String adminEmail;

    @Value("${admin.default-password:cseateam9}")
    private String adminDefaultPassword;

    @Value("${app.admin.reset-password-on-startup:false}")
    private boolean resetPasswordOnStartup;

    @Value("${app.admin.ensure-default-password:false}")
    private boolean ensureDefaultPassword;

    public AdminSeeder(UserRepository userRepository, @Lazy PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) throws Exception {
        migrateExistingUsers();
        seedAdminUser();
    }

    private void migrateExistingUsers() {
        try {
            // Update all users with null provider to LOCAL
            int updatedCount = userRepository.updateNullProviders();
            if (updatedCount > 0) {
                log.info("Updated {} existing users with null provider to LOCAL", updatedCount);
            }
        } catch (Exception e) {
            log.error("Error migrating existing users with null providers", e);
        }
    }

    private void seedAdminUser() {
        try {
            if (adminEmail == null || adminEmail.trim().isEmpty()) {
                log.warn("Admin email not configured; skipping admin seeding");
                return;
            }
            String email = adminEmail.trim().toLowerCase();
            Optional<User> existingOpt;
            try {
                existingOpt = userRepository.findByEmail(email);
            } catch (Exception e) {
                log.error("Error querying database during admin seeding, possibly due to schema changes. Skipping admin seeding for now.", e);
                return;
            }
            if (existingOpt.isEmpty()) {
                // Create admin
                User admin = new User();
                admin.setEmail(email);
                admin.setFirstName("Admin");
                admin.setLastName("User");
                admin.setRole(Role.ADMIN);
                admin.setProvider(AuthProvider.LOCAL); // Set default provider for admin
                admin.setVerified(true);
                admin.setEmailVerified(true);
                admin.setPassword(passwordEncoder.encode(adminDefaultPassword));
                userRepository.save(admin);
                log.info("Seeded default admin user: {}", email);
            } else {
                // Update to ensure admin role and enabled flags
                User admin = existingOpt.get();
                boolean changed = false;
                if (admin.getRole() != Role.ADMIN) {
                    admin.setRole(Role.ADMIN);
                    changed = true;
                }
                if (admin.getProvider() == null) {
                    admin.setProvider(AuthProvider.LOCAL);
                    changed = true;
                }
                if (!admin.isVerified()) {
                    admin.setVerified(true);
                    changed = true;
                }
                if (!Boolean.TRUE.equals(admin.isEmailVerified())) {
                    admin.setEmailVerified(true);
                    changed = true;
                }
                if (resetPasswordOnStartup) {
                    admin.setPassword(passwordEncoder.encode(adminDefaultPassword));
                    changed = true;
                    log.warn("Admin password reset on startup is ENABLED. Consider disabling in production.");
                } else if (admin.getPassword() == null || admin.getPassword().isBlank()) {
                    admin.setPassword(passwordEncoder.encode(adminDefaultPassword));
                    changed = true;
                    log.info("Admin had no password; set a default one.");
                } else if (ensureDefaultPassword && !passwordEncoder.matches(adminDefaultPassword, admin.getPassword())) {
                    admin.setPassword(passwordEncoder.encode(adminDefaultPassword));
                    changed = true;
                    log.warn("Admin password did not match default and ensure-default-password=true; updated to default.");
                }
                if (changed) {
                    userRepository.save(admin);
                    log.info("Updated admin user to ensure role/verification: {}", email);
                } else {
                    log.info("Admin user already up-to-date: {}", email);
                }
            }
        } catch (Exception e) {
            log.error("Failed to seed/update admin user", e);
        }
    }
}
