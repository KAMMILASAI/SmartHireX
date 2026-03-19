package com.SmartHireX.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebMvc
public class WebMvcConfig implements WebMvcConfigurer {

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Configure CORS
        config.setAllowCredentials(true);
        // Allow both main frontend and video call frontend
        config.setAllowedOrigins(List.of(
            frontendUrl,
            "https://smarthirexvideocall.netlify.app"
        ));
        config.setAllowedHeaders(Arrays.asList("Origin", "Content-Type", "Accept", "Authorization"));
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setExposedHeaders(List.of("Authorization"));
        
        // Register CORS configuration for all endpoints
        source.registerCorsConfiguration("/**", config);
        
        // Register specific CORS configuration for OAuth2 endpoints
        CorsConfiguration oauth2Config = new CorsConfiguration();
        oauth2Config.setAllowCredentials(true);
        oauth2Config.setAllowedOrigins(List.of(
            frontendUrl,
            "https://smarthirexvideocall.netlify.app"
        ));
        oauth2Config.setAllowedMethods(Arrays.asList("GET", "POST"));
        oauth2Config.setAllowedHeaders(Arrays.asList("Content-Type", "Authorization"));
        oauth2Config.setExposedHeaders(List.of("Authorization"));
        source.registerCorsConfiguration("/oauth2/**", oauth2Config);
        source.registerCorsConfiguration("/login/oauth2/**", oauth2Config);
        
        return new CorsFilter(source);
    }

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // Map /uploads/** to the local uploads directory
        // With context-path=/api, this will be available at /api/uploads/**
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }
}