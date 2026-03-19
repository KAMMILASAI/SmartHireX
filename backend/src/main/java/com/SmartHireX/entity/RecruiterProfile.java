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
@Table(name = "recruiter_profiles")
public class RecruiterProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(length = 200)
    private String company;

    @Column(length = 500)
    private String companyLink;

    @Column(length = 500)
    private String linkedin;

    @Column(length = 500)
    private String github;

    @Column(length = 200)
    private String location;

    private String numEmployees;

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(length = 500)
    private String image;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
