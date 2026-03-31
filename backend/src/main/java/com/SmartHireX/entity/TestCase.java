package com.SmartHireX.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "test_cases")
public class TestCase {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "coding_problem_id", nullable = false)
    private CodingProblem codingProblem;
    
    @NotBlank
    @Column(name = "input", columnDefinition = "TEXT")
    private String input;
    
    @NotBlank
    @Column(name = "expected_output", columnDefinition = "TEXT")
    private String expectedOutput;
    
    @Column(name = "is_sample")
    private Boolean isSample = false; // true for example test cases shown to candidates
    
    @Column(name = "is_hidden")
    private Boolean isHidden = false; // true for hidden test cases used for evaluation
    
    @Column(name = "explanation", columnDefinition = "TEXT")
    private String explanation; // explanation for sample test cases
    
    @Column(name = "test_case_order")
    private Integer order = 0;
    
    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
