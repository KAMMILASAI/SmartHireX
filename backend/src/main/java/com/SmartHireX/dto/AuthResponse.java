package com.SmartHireX.dto;

import java.util.Map;

public class AuthResponse {
    private String accessToken;
    private String tokenType = "Bearer";
    private Map<String, Object> userDetails;

    public AuthResponse(String accessToken, String tokenType, Map<String, Object> userDetails) {
        this.accessToken = accessToken;
        this.tokenType = tokenType;
        this.userDetails = userDetails;
    }

    // Getters and Setters
    public String getAccessToken() {
        return accessToken;
    }

    public void setAccessToken(String accessToken) {
        this.accessToken = accessToken;
    }

    public String getTokenType() {
        return tokenType;
    }

    public void setTokenType(String tokenType) {
        this.tokenType = tokenType;
    }

    public Map<String, Object> getUserDetails() {
        return userDetails;
    }

    public void setUserDetails(Map<String, Object> userDetails) {
        this.userDetails = userDetails;
    }
}
