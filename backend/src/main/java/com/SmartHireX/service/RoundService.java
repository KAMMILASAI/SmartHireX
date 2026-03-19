package com.SmartHireX.service;

import java.util.Map;

import com.SmartHireX.dto.request.RoundRequest;
import com.SmartHireX.dto.response.RoundResponse;

import java.util.List;

public interface RoundService {
    
    List<RoundResponse> getRoundsByJobId(Long jobId);
    
    RoundResponse createRound(Long jobId, RoundRequest request);
    
    RoundResponse updateRound(Long roundId, RoundRequest request);
    
    void deleteRound(Long roundId);
    
    RoundResponse getRoundById(Long roundId);
    
    Map<String, Object> getRoundShortlist(Long roundId);
    
    Map<String, Object> getRoundDecisionStatus(Long roundId);
}
