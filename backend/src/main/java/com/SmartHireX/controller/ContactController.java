package com.SmartHireX.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.SmartHireX.dto.ApiResponse;
import com.SmartHireX.dto.ContactRequest;
import com.SmartHireX.service.EmailService;

@RestController
@RequestMapping("/contact")
public class ContactController {

    private final EmailService emailService;

    @Autowired
    public ContactController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping
    public ResponseEntity<ApiResponse> submitContactForm(@Valid @RequestBody ContactRequest contactRequest) {
        try {
            // Send the contact email
            emailService.sendContactEmail(contactRequest);
            
            // Return success response
            return ResponseEntity.ok(
                new ApiResponse(true, "Your message has been sent successfully! We'll get back to you soon.")
            );
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(
                new ApiResponse(false, "Failed to send your message. Please try again later.")
            );
        }
    }
}
