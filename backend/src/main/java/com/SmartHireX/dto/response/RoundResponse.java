package com.SmartHireX.dto.response;

import lombok.Data;

import java.time.LocalDateTime;

import com.SmartHireX.entity.Round;

@Data
public class RoundResponse {
    
    private Long id;
    private String title;
    private String description;
    private Round.RoundType type;
    private Integer duration;
        private String instructions;
        private String topics;
    // Question count fields
    private Integer mcqQuestions;
    private Integer codingQuestions;
    private Integer totalQuestions;
    private Integer numAutoShortlistCandidates;
    private LocalDateTime startTime;
    private Boolean decisionsFinalized;
    private LocalDateTime decisionsFinalizedAt;
    private Integer roundOrder;
    private Long jobId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    public static RoundResponse fromEntity(Round round) {
        RoundResponse response = new RoundResponse();
        response.setId(round.getId());
        response.setTitle(round.getTitle());
        response.setDescription(round.getDescription());
        response.setType(round.getType());
        response.setDuration(round.getDuration());
                response.setInstructions(round.getInstructions());
                response.setTopics(round.getTopics());
        response.setMcqQuestions(round.getMcqQuestions());
        response.setCodingQuestions(round.getCodingQuestions());
        response.setTotalQuestions(round.getTotalQuestions());
        response.setNumAutoShortlistCandidates(round.getNumAutoShortlistCandidates());
        response.setStartTime(round.getStartTime());
        response.setDecisionsFinalized(round.getDecisionsFinalized());
        response.setDecisionsFinalizedAt(round.getDecisionsFinalizedAt());
        response.setRoundOrder(round.getRoundOrder());
        response.setJobId(round.getJob().getId());
        response.setCreatedAt(round.getCreatedAt());
        response.setUpdatedAt(round.getUpdatedAt());
        return response;
    }
}
