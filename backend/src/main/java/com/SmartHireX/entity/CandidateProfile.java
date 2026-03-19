package com.SmartHireX.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Getter
@Setter
@Entity
@Table(name = "candidate_profiles")
public class CandidateProfile {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;
    
    @Column(length = 500)
    private String profileImage;
    
    @Column(length = 100)
    private String college;
    
    @Column(length = 50)
    private String regNo;
    
    @Column(length = 200)
    private String location;
    
    @Column(length = 500)
    private String portfolio;
    
    @Column(length = 500)
    private String github;
    
    @Column(length = 500)
    private String linkedin;
    
    @Column(length = 1000)
    private String skills;

    // Extended fields for application completeness and auto-apply
    @Column(length = 20)
    private String profileType; // 'student' | 'postgraduate'

    private Boolean isFresher; // only for postgraduate

    @Column(length = 50)
    private String degree; // for postgraduate fresher

    private Double cgpa; // for student or postgraduate fresher

    @Column(length = 150)
    private String company; // for postgraduate experienced

    private Double lpa; // for postgraduate experienced

    private Double yearsExp; // for postgraduate experienced
    
    private Integer resumeScore = 0;
    
    private Integer interviewsAttended = 0;
    
    private Integer practiceSessionsCompleted = 0;
    
    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
