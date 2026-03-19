package com.SmartHireX.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "mixed_round_components")
public class MixedRoundComponent {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "round_id", nullable = false)
    private Long roundId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "component_type", nullable = false)
    private ComponentType componentType;
    
    @Column(name = "component_weight", precision = 5, scale = 2)
    private BigDecimal componentWeight = BigDecimal.valueOf(50.00);
    
    @Column(name = "mcq_count")
    private Integer mcqCount = 0;
    
    @Column(name = "coding_count")
    private Integer codingCount = 0;
    
    @Column(name = "time_limit_minutes")
    private Integer timeLimitMinutes = 60;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    public enum ComponentType {
        MCQ, CODING
    }
    
    // Constructors
    public MixedRoundComponent() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    public MixedRoundComponent(Long roundId, ComponentType componentType, BigDecimal componentWeight) {
        this();
        this.roundId = roundId;
        this.componentType = componentType;
        this.componentWeight = componentWeight;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getRoundId() {
        return roundId;
    }
    
    public void setRoundId(Long roundId) {
        this.roundId = roundId;
    }
    
    public ComponentType getComponentType() {
        return componentType;
    }
    
    public void setComponentType(ComponentType componentType) {
        this.componentType = componentType;
    }
    
    public BigDecimal getComponentWeight() {
        return componentWeight;
    }
    
    public void setComponentWeight(BigDecimal componentWeight) {
        this.componentWeight = componentWeight;
    }
    
    public Integer getMcqCount() {
        return mcqCount;
    }
    
    public void setMcqCount(Integer mcqCount) {
        this.mcqCount = mcqCount;
    }
    
    public Integer getCodingCount() {
        return codingCount;
    }
    
    public void setCodingCount(Integer codingCount) {
        this.codingCount = codingCount;
    }
    
    public Integer getTimeLimitMinutes() {
        return timeLimitMinutes;
    }
    
    public void setTimeLimitMinutes(Integer timeLimitMinutes) {
        this.timeLimitMinutes = timeLimitMinutes;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
