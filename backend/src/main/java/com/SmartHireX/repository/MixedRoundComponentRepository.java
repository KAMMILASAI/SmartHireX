package com.SmartHireX.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.SmartHireX.entity.MixedRoundComponent;

import java.util.List;

@Repository
public interface MixedRoundComponentRepository extends JpaRepository<MixedRoundComponent, Long> {
    
    /**
     * Find all components for a specific round
     */
    List<MixedRoundComponent> findByRoundIdOrderByComponentType(Long roundId);
    
    /**
     * Find components by round ID and component type
     */
    List<MixedRoundComponent> findByRoundIdAndComponentType(Long roundId, MixedRoundComponent.ComponentType componentType);
    
    /**
     * Check if a round has mixed components
     */
    @Query("SELECT COUNT(mrc) > 1 FROM MixedRoundComponent mrc WHERE mrc.roundId = :roundId")
    boolean isMixedRound(@Param("roundId") Long roundId);
    
    /**
     * Get MCQ component for a round
     */
    @Query("SELECT mrc FROM MixedRoundComponent mrc WHERE mrc.roundId = :roundId AND mrc.componentType = 'MCQ'")
    MixedRoundComponent findMcqComponent(@Param("roundId") Long roundId);
    
    /**
     * Get Coding component for a round
     */
    @Query("SELECT mrc FROM MixedRoundComponent mrc WHERE mrc.roundId = :roundId AND mrc.componentType = 'CODING'")
    MixedRoundComponent findCodingComponent(@Param("roundId") Long roundId);
    
    /**
     * Delete all components for a round
     */
    void deleteByRoundId(Long roundId);
    
    /**
     * Check if round exists and has components
     */
    boolean existsByRoundId(Long roundId);
}
