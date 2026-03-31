package com.SmartHireX.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "coding_problems")
public class CodingProblem {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @NotNull
    @Column(name = "round_id")
    private Long roundId;
    
    @NotBlank
    @Column(name = "title", length = 200)
    private String title;
    
    @NotBlank
    @Column(name = "problem_statement", columnDefinition = "TEXT")
    private String problemStatement;
    
    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation;
    
    @Column(name = "input_format", columnDefinition = "TEXT")
    private String inputFormat;
    
    @Column(name = "output_format", columnDefinition = "TEXT")
    private String outputFormat;
    
    @Column(name = "constraints", columnDefinition = "TEXT")
    private String constraints;
    
    @Column(name = "difficulty")
    @Enumerated(EnumType.STRING)
    private Difficulty difficulty = Difficulty.MEDIUM;
    
    @Column(name = "time_limit")
    private Integer timeLimit = 2000; // in milliseconds
    
    @Column(name = "memory_limit")
    private Integer memoryLimit = 256; // in MB
    
    @Column(name = "allowed_languages")
    private String allowedLanguages = "java,python,cpp,javascript"; // comma separated
    
    @OneToMany(mappedBy = "codingProblem", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<TestCase> testCases;
    
    @Column(name = "created_by")
    private String createdBy;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    public enum Difficulty {
        EASY, MEDIUM, HARD
    }
}
