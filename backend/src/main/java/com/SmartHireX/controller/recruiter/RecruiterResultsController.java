package com.SmartHireX.controller.recruiter;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.SmartHireX.repository.CodingExamResultRepository;
import com.SmartHireX.service.ExamResultService;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

@RestController
@RequestMapping("/recruiter/results")
@CrossOrigin(origins = "*")
@PreAuthorize("hasRole('RECRUITER') or hasRole('ADMIN')")
public class RecruiterResultsController {

    private static final Logger logger = LoggerFactory.getLogger(RecruiterResultsController.class);

    @Autowired
    private ExamResultService examResultService;

    @Autowired
    private CodingExamResultRepository codingExamResultRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @GetMapping("/{roundId}/results")
    public ResponseEntity<?> getExamResults(@PathVariable Long roundId, Authentication authentication) {
        try {
            List<Map<String, Object>> mcqResults = examResultService.getExamResults(roundId);
            return ResponseEntity.ok(mcqResults);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch exam results: " + e.getMessage()));
        }
    }

    @GetMapping("/{roundId}/stats")
    public ResponseEntity<?> getExamStats(@PathVariable Long roundId, Authentication authentication) {
        try {
            Map<String, Object> mcqStats = examResultService.getExamStats(roundId);
            return ResponseEntity.ok(mcqStats);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch exam statistics: " + e.getMessage()));
        }
    }

    @GetMapping("/{roundId}/candidate/{candidateId}")
    public ResponseEntity<?> getCandidateExamDetails(@PathVariable Long roundId,
            @PathVariable Long candidateId, Authentication authentication) {
        try {
            Map<String, Object> candidateDetails = examResultService.getCandidateDetailedResults(roundId, candidateId);
            return ResponseEntity.ok(candidateDetails);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch candidate exam details: " + e.getMessage()));
        }
    }

    @GetMapping("/{roundId}/coding-results")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getCodingExamResults(@PathVariable Long roundId, Authentication authentication) {
        try {
            logger.debug("Fetching coding results for roundId={}", roundId);
            
            // First check if round exists and has any results
            long count = codingExamResultRepository.countByRoundId(roundId);
            logger.debug("Found {} coding results for roundId={}", count, roundId);
            
            if (count == 0) {
                logger.debug("No coding results found for roundId={}, returning empty list", roundId);
                return ResponseEntity.ok(new ArrayList<>());
            }

            logger.debug("Executing coding results JPQL query for roundId={}", roundId);
            @SuppressWarnings("unchecked")
            List<Object[]> rows = entityManager.createQuery(
                "SELECT r.id, r.candidateName, r.candidateEmail, r.totalScore, r.timeSpent, r.language, r.status, r.submittedAt " +
                "FROM CodingExamResult r WHERE r.roundId = :roundId ORDER BY r.totalScore DESC, r.timeSpent ASC")
                .setParameter("roundId", roundId)
                .getResultList();

            logger.debug("Coding results query returned {} rows for roundId={}", rows.size(), roundId);
            
            List<Map<String, Object>> results = new ArrayList<>();
            for (int i = 0; i < rows.size(); i++) {
                Object[] row = rows.get(i);
                logger.trace("Processing coding result row {} ({} columns)", i, row.length);
                
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("id", row[0] != null ? row[0] : 0);
                m.put("candidateName", row[1] != null ? row[1] : "");
                m.put("candidateEmail", row[2] != null ? row[2] : "");
                m.put("score", row[3] != null ? row[3] : 0);
                m.put("totalScore", row[3] != null ? row[3] : 0);
                m.put("timeSpent", row[4] != null ? row[4] : 0);
                m.put("language", row[5] != null ? row[5] : "");
                m.put("status", row[6] != null ? row[6].toString() : "COMPLETED");
                m.put("submittedAt", row[7] != null ? row[7].toString() : null);
                m.put("problemScores", new HashMap<>());
                results.add(m);
            }
            logger.debug("Processed {} coding results for roundId={}", results.size(), roundId);
            return ResponseEntity.ok(results);
        } catch (Exception e) {
            logger.error("Failed to fetch coding results for roundId={}", roundId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch coding results: " + e.getMessage()));
        }
    }

    /**
     * Get coding exam stats — uses raw JPQL to avoid lazy-loading issues
     */
    @GetMapping("/{roundId}/coding-stats")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getCodingExamStats(@PathVariable Long roundId, Authentication authentication) {
        try {
            logger.debug("Fetching coding stats for roundId={}", roundId);
            
            long total = codingExamResultRepository.countByRoundId(roundId);
            logger.debug("Found total {} coding results for roundId={}", total, roundId);
            
            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("totalCandidates", total);
            stats.put("completedExams",  total);
            stats.put("pendingExams",    0);

            if (total > 0) {
                try {
                    logger.debug("Fetching aggregate coding stats for roundId={}", roundId);
                    Double avg  = codingExamResultRepository.getAverageScoreByRoundId(roundId);
                    Integer hi  = codingExamResultRepository.getHighestScoreByRoundId(roundId);
                    Integer lo  = codingExamResultRepository.getLowestScoreByRoundId(roundId);
                    logger.debug("Aggregate stats for roundId={}: avg={}, high={}, low={}", roundId, avg, hi, lo);
                    
                    stats.put("averageScore",  avg != null ? avg : 0.0);
                    stats.put("highestScore",  hi  != null ? hi  : 0);
                    stats.put("lowestScore",   lo  != null ? lo  : 0);

                    // Average time via JPQL (no lazy collections touched)
                    logger.debug("Fetching average coding time for roundId={}", roundId);
                    Object avgTime = entityManager.createQuery(
                        "SELECT COALESCE(AVG(r.timeSpent), 0) FROM CodingExamResult r WHERE r.roundId = :rid")
                        .setParameter("rid", roundId)
                        .getSingleResult();
                    stats.put("averageTimeSpent", avgTime instanceof Number ? ((Number) avgTime).intValue() : 0);
                    logger.debug("Average coding time for roundId={}: {}", roundId, stats.get("averageTimeSpent"));

                    // Language distribution
                    try {
                        logger.debug("Fetching language distribution for roundId={}", roundId);
                        List<Object[]> langs = codingExamResultRepository.getLanguageDistributionByRoundId(roundId);
                        Map<String, Long> langMap = new LinkedHashMap<>();
                        if (langs != null) {
                            for (Object[] row : langs) {
                                if (row[0] != null && row[1] != null) {
                                    langMap.put((String) row[0], (Long) row[1]);
                                }
                            }
                        }
                        stats.put("languageDistribution", langMap);
                        logger.debug("Language distribution for roundId={}: {}", roundId, langMap);
                    } catch (Exception e) {
                        logger.warn("Failed to fetch language distribution for roundId={}", roundId, e);
                        stats.put("languageDistribution", new HashMap<>());
                    }

                    // Score distribution
                    Map<String, Long> scoreDist = new LinkedHashMap<>();
                    try {
                        logger.debug("Fetching score distribution for roundId={}", roundId);
                        scoreDist.put("90-100",   codingExamResultRepository.countByRoundIdAndScoreRange(roundId, 90, 101));
                        scoreDist.put("80-89",    codingExamResultRepository.countByRoundIdAndScoreRange(roundId, 80, 90));
                        scoreDist.put("70-79",    codingExamResultRepository.countByRoundIdAndScoreRange(roundId, 70, 80));
                        scoreDist.put("60-69",    codingExamResultRepository.countByRoundIdAndScoreRange(roundId, 60, 70));
                        scoreDist.put("below-60", codingExamResultRepository.countByRoundIdAndScoreRange(roundId, 0, 60));
                        logger.debug("Score distribution for roundId={}: {}", roundId, scoreDist);
                    } catch (Exception e) {
                        logger.warn("Failed to fetch score distribution for roundId={}", roundId, e);
                        scoreDist.put("90-100",   0L);
                        scoreDist.put("80-89",    0L);
                        scoreDist.put("70-79",    0L);
                        scoreDist.put("60-69",    0L);
                        scoreDist.put("below-60", 0L);
                    }
                    stats.put("scoreDistribution", scoreDist);
                } catch (Exception e) {
                    logger.warn("Failed while computing coding stats details for roundId={}", roundId, e);
                    // If any individual query fails, set default values
                    stats.put("averageScore", 0.0);
                    stats.put("highestScore", 0);
                    stats.put("lowestScore",  0);
                    stats.put("averageTimeSpent", 0);
                    stats.put("languageDistribution", new HashMap<>());
                    stats.put("scoreDistribution",    new HashMap<>());
                }
            } else {
                logger.debug("No coding results found for roundId={}, returning default stats", roundId);
                stats.put("averageScore", 0.0);
                stats.put("highestScore", 0);
                stats.put("lowestScore",  0);
                stats.put("averageTimeSpent", 0);
                stats.put("languageDistribution", new HashMap<>());
                stats.put("scoreDistribution",    new HashMap<>());
            }
            logger.debug("Returning coding stats response for roundId={}", roundId);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("Failed to fetch coding stats for roundId={}", roundId, e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch coding stats: " + e.getMessage()));
        }
    }
}
