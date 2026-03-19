package com.SmartHireX.service;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.dto.CodingProblemDTO;
import com.SmartHireX.dto.TestCaseDTO;
import com.SmartHireX.dto.request.CodingProblemRequest;
import com.SmartHireX.dto.request.TestCaseRequest;
import com.SmartHireX.entity.CodingProblem;
import com.SmartHireX.entity.TestCase;
import com.SmartHireX.repository.CodingProblemRepository;
import com.SmartHireX.repository.TestCaseRepository;

@Service
@Transactional
public class CodingProblemService {
    
    @Autowired
    private CodingProblemRepository codingProblemRepository;
    
    @Autowired
    private TestCaseRepository testCaseRepository;
    
    /**
     * Create a new coding problem with test cases
     */
    public CodingProblemDTO createCodingProblem(CodingProblemRequest request, String createdBy) {
        // Create coding problem
        CodingProblem codingProblem = new CodingProblem();
        codingProblem.setRoundId(request.getRoundId());
        codingProblem.setTitle(request.getTitle());
        codingProblem.setProblemStatement(request.getProblemStatement());
        codingProblem.setExplanation(request.getExplanation());
        codingProblem.setInputFormat(request.getInputFormat());
        codingProblem.setOutputFormat(request.getOutputFormat());
        codingProblem.setConstraints(request.getConstraints());
        codingProblem.setDifficulty(request.getDifficulty());
        codingProblem.setTimeLimit(request.getTimeLimit());
        codingProblem.setMemoryLimit(request.getMemoryLimit());
        codingProblem.setAllowedLanguages(request.getAllowedLanguages());
        codingProblem.setCreatedBy(createdBy);
        
        // Save coding problem
        CodingProblem savedCodingProblem = codingProblemRepository.save(codingProblem);
        
        // Create test cases
        List<TestCase> testCases = new ArrayList<>();
        if (request.getTestCases() != null && !request.getTestCases().isEmpty()) {
            testCases = request.getTestCases().stream()
                .map(tcRequest -> createTestCase(tcRequest, savedCodingProblem))
                .collect(Collectors.toList());
        }
        
        testCaseRepository.saveAll(testCases);
        
        // Return DTO
        return convertToDTO(savedCodingProblem, testCases);
    }
    
    /**
     * Get all coding problems for a round
     */
    public List<CodingProblemDTO> getCodingProblemsByRoundId(Long roundId) {
        List<CodingProblem> problems = codingProblemRepository.findByRoundIdWithTestCases(roundId);
        return problems.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    /**
     * Get a specific coding problem by ID
     */
    public CodingProblemDTO getCodingProblemById(Long id) {
        CodingProblem problem = codingProblemRepository.findByIdWithTestCases(id)
            .orElseThrow(() -> new IllegalArgumentException("Coding problem not found with id: " + id));
        
        return convertToDTO(problem);
    }
    
    /**
     * Get coding problem for candidate (with only sample test cases)
     */
    public CodingProblemDTO getCodingProblemForCandidate(Long id) {
        CodingProblem problem = codingProblemRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Coding problem not found with id: " + id));
        
        return convertToCandidateDTO(problem);
    }
    
    /**
     * Update a coding problem
     */
    public CodingProblemDTO updateCodingProblem(Long id, CodingProblemRequest request, String updatedBy) {
        CodingProblem problem = codingProblemRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Coding problem not found with id: " + id));
        
        // Update problem details
        problem.setTitle(request.getTitle());
        problem.setProblemStatement(request.getProblemStatement());
        problem.setExplanation(request.getExplanation());
        problem.setInputFormat(request.getInputFormat());
        problem.setOutputFormat(request.getOutputFormat());
        problem.setConstraints(request.getConstraints());
        problem.setDifficulty(request.getDifficulty());
        problem.setTimeLimit(request.getTimeLimit());
        problem.setMemoryLimit(request.getMemoryLimit());
        problem.setAllowedLanguages(request.getAllowedLanguages());
        
        // Delete existing test cases
        testCaseRepository.deleteByCodingProblemId(id);
        
        // Save updated problem first
        CodingProblem savedProblem = codingProblemRepository.save(problem);
        
        // Create new test cases
        List<TestCase> testCases = new ArrayList<>();
        if (request.getTestCases() != null && !request.getTestCases().isEmpty()) {
            testCases = request.getTestCases().stream()
                .map(tcRequest -> createTestCase(tcRequest, savedProblem))
                .collect(Collectors.toList());
        }
        
        testCaseRepository.saveAll(testCases);
        
        return convertToDTO(savedProblem, testCases);
    }
    
    /**
     * Delete a coding problem
     */
    public void deleteCodingProblem(Long id) {
        if (!codingProblemRepository.existsById(id)) {
            throw new IllegalArgumentException("Coding problem not found with id: " + id);
        }
        
        // Delete associated test cases first (cascade should handle this, but being explicit)
        testCaseRepository.deleteByCodingProblemId(id);
        
        // Delete the coding problem
        codingProblemRepository.deleteById(id);
    }
    
    /**
     * Get coding problems for candidates (only sample test cases)
     */
    public List<CodingProblemDTO> getCodingProblemsForCandidates(Long roundId) {
        System.out.println("=== BACKEND: Fetching coding problems for round: " + roundId);
        List<CodingProblem> problems = codingProblemRepository.findByRoundIdWithTestCases(roundId);
        System.out.println("=== BACKEND: Found " + problems.size() + " problems");
        
        for (CodingProblem problem : problems) {
            System.out.println("Problem: " + problem.getTitle() + " (ID: " + problem.getId() + ")");
        }
        
        List<CodingProblemDTO> result = problems.stream()
            .map(this::convertToCandidateDTO)
            .collect(Collectors.toList());
            
        System.out.println("=== BACKEND: Returning " + result.size() + " problem DTOs");
        return result;
    }
    
    /**
     * Check if coding problems exist for a round
     */
    public boolean existsByRoundId(Long roundId) {
        return codingProblemRepository.existsByRoundId(roundId);
    }
    
    /**
     * Get test cases for evaluation (all test cases)
     */
    public List<TestCaseDTO> getTestCasesForEvaluation(Long codingProblemId) {
        List<TestCase> testCases = testCaseRepository.findAllTestCasesForEvaluation(codingProblemId);
        return testCases.stream()
            .map(this::convertTestCaseToDTO)
            .collect(Collectors.toList());
    }
    
    // Helper methods
    
    private TestCase createTestCase(TestCaseRequest request, CodingProblem codingProblem) {
        TestCase testCase = new TestCase();
        testCase.setCodingProblem(codingProblem);
        testCase.setInput(request.getInput());
        testCase.setExpectedOutput(request.getExpectedOutput());
        testCase.setIsSample(request.getIsSample());
        testCase.setIsHidden(request.getIsHidden());
        testCase.setExplanation(request.getExplanation());
        testCase.setOrder(request.getOrder());
        return testCase;
    }
    
    private CodingProblemDTO convertToDTO(CodingProblem problem) {
        List<TestCase> testCases = testCaseRepository.findByCodingProblemIdOrderByOrderAsc(problem.getId());
        return convertToDTO(problem, testCases);
    }
    
    private CodingProblemDTO convertToDTO(CodingProblem problem, List<TestCase> testCases) {
        CodingProblemDTO dto = new CodingProblemDTO();
        dto.setId(problem.getId());
        dto.setRoundId(problem.getRoundId());
        dto.setTitle(problem.getTitle());
        dto.setProblemStatement(problem.getProblemStatement());
        dto.setExplanation(problem.getExplanation());
        dto.setInputFormat(problem.getInputFormat());
        dto.setOutputFormat(problem.getOutputFormat());
        dto.setConstraints(problem.getConstraints());
        dto.setDifficulty(problem.getDifficulty());
        dto.setTimeLimit(problem.getTimeLimit());
        dto.setMemoryLimit(problem.getMemoryLimit());
        dto.setAllowedLanguages(problem.getAllowedLanguages());
        dto.setCreatedBy(problem.getCreatedBy());
        dto.setCreatedAt(problem.getCreatedAt());
        dto.setUpdatedAt(problem.getUpdatedAt());
        
        // Convert test cases
        List<TestCaseDTO> testCaseDTOs = testCases.stream()
            .map(this::convertTestCaseToDTO)
            .collect(Collectors.toList());
        
        dto.setTestCases(testCaseDTOs);
        
        // Statistics
        dto.setTotalTestCases((long) testCases.size());
        dto.setSampleTestCasesCount(testCases.stream()
            .filter(tc -> tc.getIsSample() != null && tc.getIsSample())
            .count());
        
        return dto;
    }
    
    private CodingProblemDTO convertToCandidateDTO(CodingProblem problem) {
        CodingProblemDTO dto = new CodingProblemDTO();
        dto.setId(problem.getId());
        dto.setRoundId(problem.getRoundId());
        dto.setTitle(problem.getTitle());
        dto.setProblemStatement(problem.getProblemStatement());
        dto.setExplanation(problem.getExplanation());
        dto.setInputFormat(problem.getInputFormat());
        dto.setOutputFormat(problem.getOutputFormat());
        dto.setConstraints(problem.getConstraints());
        dto.setDifficulty(problem.getDifficulty());
        dto.setTimeLimit(problem.getTimeLimit());
        dto.setMemoryLimit(problem.getMemoryLimit());
        dto.setAllowedLanguages(problem.getAllowedLanguages());
        dto.setCreatedAt(problem.getCreatedAt());
        
        // Include all test cases for candidates (both sample and hidden)
        List<TestCase> allTestCases = testCaseRepository.findByCodingProblemIdOrderByOrderAsc(problem.getId());
        System.out.println("=== BACKEND: Problem '" + problem.getTitle() + "' has " + allTestCases.size() + " test cases");
        
        List<TestCaseDTO> testCaseDTOs = allTestCases.stream()
            .map(this::convertTestCaseToDTO)
            .collect(Collectors.toList());
        
        // Separate sample and all test cases
        List<TestCaseDTO> sampleTestCaseDTOs = testCaseDTOs.stream()
            .filter(tc -> tc.getIsSample())
            .collect(Collectors.toList());
        
        System.out.println("=== BACKEND: Sample test cases: " + sampleTestCaseDTOs.size() + ", All test cases: " + testCaseDTOs.size());
        
        dto.setSampleTestCases(sampleTestCaseDTOs);
        dto.setTestCases(testCaseDTOs); // Include all test cases
        
        return dto;
    }
    
    private TestCaseDTO convertTestCaseToDTO(TestCase testCase) {
        TestCaseDTO dto = new TestCaseDTO();
        dto.setId(testCase.getId());
        dto.setCodingProblemId(testCase.getCodingProblem().getId());
        dto.setInput(testCase.getInput());
        dto.setExpectedOutput(testCase.getExpectedOutput());
        dto.setIsSample(testCase.getIsSample());
        dto.setIsHidden(testCase.getIsHidden());
        dto.setExplanation(testCase.getExplanation());
        dto.setOrder(testCase.getOrder());
        dto.setCreatedAt(testCase.getCreatedAt());
        return dto;
    }
    
    /**
     * Calculate score for a coding problem solution
     */
    public int calculateScore(Long problemId, String solution, String language) {
        System.out.println("=== CALCULATING CODING SCORE ===");
        System.out.println("Problem ID: " + problemId);
        System.out.println("Language: " + language);
        System.out.println("Solution length: " + (solution == null ? 0 : solution.length()));

        throw new UnsupportedOperationException("Local heuristic scoring is disabled. Use Judge0-based evaluation endpoints for real scoring.");
    }
}
