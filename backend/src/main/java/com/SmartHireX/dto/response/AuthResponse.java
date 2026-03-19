package com.SmartHireX.dto.response;

import com.SmartHireX.entity.User;

public class AuthResponse {
    private String accessToken;
    private String tokenType;
    private User user;

    public AuthResponse(String accessToken, String tokenType, User user) {
        this.accessToken = accessToken;
        this.tokenType = tokenType;
        this.user = user;
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

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }
}
