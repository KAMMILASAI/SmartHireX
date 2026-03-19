package com.SmartHireX.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.ResponseEntity;
import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = "*")
public class RootController {

    @Value("${support.upi:}")
    private String supportUpi;

    @GetMapping("/")
    public ResponseEntity<Map<String, Object>> root() {
        Map<String, Object> response = new HashMap<>();
        response.put("message", "SmartHireX API is running");
        response.put("version", "1.0.0");
        response.put("status", "OK");
        response.put("frontend_url", "http://localhost:5173");
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        Map<String, String> response = new HashMap<>();
        response.put("status", "UP");
        response.put("service", "SmartHireX API");
        return ResponseEntity.ok(response);
    }

    @GetMapping({"/config/support-upi", "/api/config/support-upi"})
    public ResponseEntity<Map<String, String>> getSupportUpi() {
        Map<String, String> response = new HashMap<>();
        response.put("upi", supportUpi);
        return ResponseEntity.ok(response);
    }
}
