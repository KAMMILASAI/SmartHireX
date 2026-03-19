package com.SmartHireX.controller.user;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.SmartHireX.entity.CandidateProfile;
import com.SmartHireX.entity.RecruiterProfile;
import com.SmartHireX.entity.Role;
import com.SmartHireX.entity.User;
import com.SmartHireX.repository.CandidateProfileRepository;
import com.SmartHireX.repository.RecruiterProfileRepository;
import com.SmartHireX.security.CurrentUser;
import com.SmartHireX.security.UserPrincipal;
import com.SmartHireX.service.UserService;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;

@RestController
@RequestMapping("/user")
public class UserController {
    
    @Autowired
    private UserService userService;
    
    
    
    @Autowired
    private Cloudinary cloudinary;
    
    @Autowired
    private CandidateProfileRepository candidateProfileRepository;
    
    @Autowired
    private RecruiterProfileRepository recruiterProfileRepository;
    
    @PatchMapping("/profile-photo")
    public ResponseEntity<?> updateProfilePhoto(@CurrentUser UserPrincipal userPrincipal,
                                              @RequestParam("image") MultipartFile image) {
        try {
            User user = userService.findById(userPrincipal.getId())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Handle image upload using Cloudinary
            String imageUrl = null;
            if (image != null && !image.isEmpty()) {
                imageUrl = uploadToCloudinary(image, user.getId());
                // Save to CandidateProfile if user is a candidate
                if (user.getRole() == Role.CANDIDATE) {
                    CandidateProfile profile = candidateProfileRepository.findByUser(user)
                        .orElseGet(() -> {
                            CandidateProfile cp = new CandidateProfile();
                            cp.setUser(user);
                            return cp;
                        });
                    profile.setProfileImage(imageUrl);
                    candidateProfileRepository.save(profile);
                } else if (user.getRole() == Role.RECRUITER) {
                    RecruiterProfile rp = recruiterProfileRepository.findByUser(user)
                        .orElseGet(() -> {
                            RecruiterProfile np = new RecruiterProfile();
                            np.setUser(user);
                            return np;
                        });
                    rp.setImage(imageUrl);
                    recruiterProfileRepository.save(rp);
                } else if (user.getRole() == Role.ADMIN) {
                    // Admin avatar is stored on the user record as platform profile image
                    user.setImageUrl(imageUrl);
                    userService.save(user);
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile photo updated successfully");
            // For now just return the uploaded URL; frontend uses this
            // Note: if not uploaded, these will be null
            response.put("image", imageUrl);
            response.put("userImage", imageUrl);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to update profile photo");
            error.put("message", e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    private String uploadToCloudinary(MultipartFile image, Long userId) throws IOException {
        try {
            // Upload to Cloudinary
            Map<String, Object> uploadResult = cloudinary.uploader().upload(image.getBytes(),
                ObjectUtils.asMap(
                    "folder", "smarthirex/profiles",
                    "public_id", "profile_" + userId + "_" + System.currentTimeMillis(),
                    "resource_type", "image"
                ));
            
            // Return the secure URL
            return (String) uploadResult.get("secure_url");
            
        } catch (Exception e) {
            throw new IOException("Failed to upload image to Cloudinary: " + e.getMessage(), e);
        }
    }
}
