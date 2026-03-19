package com.SmartHireX.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "applications",
       uniqueConstraints = @UniqueConstraint(name = "uk_app_job_email", columnNames = {"job_id", "email_lower"}))
public class Application {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    @JsonIgnore
    private JobPosting job;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String email;

    // cached lowercase for uniqueness
    @Column(name = "email_lower", nullable = false)
    @JsonIgnore
    private String emailLower;

    private String college;
    private String profileType; // student | postgraduate
    private Boolean isFresher;  // for postgraduate
    private String degree;      // for postgraduate + fresher
    private String company;     // for postgraduate + not fresher

    private Double lpa;         // for postgraduate + not fresher
    private Double yearsExp;    // for postgraduate + not fresher

    private Double cgpa;        // for students or postgraduates (fresher)

    @Column(length = 1000)
    private String skills;      // comma separated

    @Column(nullable = false)
    private String status = "applied"; // applied | reviewed | interviewed | hired | rejected

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        if (this.email != null) this.emailLower = this.email.toLowerCase();
    }

    @PreUpdate
    protected void onUpdate() {
        if (this.email != null) this.emailLower = this.email.toLowerCase();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    // Also expose Mongo-like key for frontend tables
    @JsonProperty("_id")
    public Long getIdAlias() { return id; }

    public JobPosting getJob() { return job; }
    public void setJob(JobPosting job) { this.job = job; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getEmailLower() { return emailLower; }
    public void setEmailLower(String emailLower) { this.emailLower = emailLower; }

    public String getCollege() { return college; }
    public void setCollege(String college) { this.college = college; }

    public String getProfileType() { return profileType; }
    public void setProfileType(String profileType) { this.profileType = profileType; }

    public Boolean getIsFresher() { return isFresher; }
    public void setIsFresher(Boolean fresher) { isFresher = fresher; }

    public String getDegree() { return degree; }
    public void setDegree(String degree) { this.degree = degree; }

    public String getCompany() { return company; }
    public void setCompany(String company) { this.company = company; }

    public Double getLpa() { return lpa; }
    public void setLpa(Double lpa) { this.lpa = lpa; }

    public Double getYearsExp() { return yearsExp; }
    public void setYearsExp(Double yearsExp) { this.yearsExp = yearsExp; }

    public Double getCgpa() { return cgpa; }
    public void setCgpa(Double cgpa) { this.cgpa = cgpa; }

    public String getSkills() { return skills; }
    public void setSkills(String skills) { this.skills = skills; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
