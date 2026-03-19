package com.SmartHireX.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.*;
import java.util.Base64;

@RestController
public class JudgeController {
    
    // Judge0 API Configuration
    @Value("${judge0.api-url:https://judge0-ce.p.rapidapi.com}")
    private String judge0ApiUrl;
    
    @Value("${judge0.rapidapi-key:}")
    private String rapidApiKey;
    
    @Value("${judge0.rapidapi-host:judge0-ce.p.rapidapi.com}")
    private String rapidApiHost;
    
    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/judge")
    public ResponseEntity<?> judge(@RequestBody Map<String, Object> body) {
        String language = String.valueOf(body.getOrDefault("language", ""));
        String code = String.valueOf(body.getOrDefault("code", ""));
        Object inputObj = body.get("input");
        String input = inputObj == null ? "" : (inputObj instanceof String ? (String) inputObj : String.valueOf(inputObj));

        Map<String, Object> res = new HashMap<>();
        res.put("language", language);

        if (code == null || code.trim().isEmpty()) {
            res.put("output", "");
            res.put("stderr", "");
            res.put("error", "No code provided");
            res.put("logs", List.of());
            return ResponseEntity.badRequest().body(res);
        }

        try {
            // Use remote execution via Judge0 API
            Map<String, Object> result = executeRemotely(language.toLowerCase(Locale.ROOT), code, input);
            res.putAll(result);
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            res.put("output", "");
            res.put("stderr", "");
            res.put("error", "Remote execution failed: " + e.getMessage());
            res.put("logs", List.of("Error: " + e.getMessage()));
            return ResponseEntity.status(500).body(res);
        }
    }
    
    private Map<String, Object> executeRemotely(String language, String code, String input) {
        try {
            // Map language names to Judge0 language IDs
            int languageId = getLanguageId(language);
            
            // Prepare submission
            Map<String, Object> submission = new HashMap<>();
            submission.put("source_code", Base64.getEncoder().encodeToString(code.getBytes()));
            submission.put("language_id", languageId);
            if (input != null && !input.trim().isEmpty()) {
                submission.put("stdin", Base64.getEncoder().encodeToString(input.getBytes()));
            }
            submission.put("wait", true); // Wait for result
            
            // Check if API key is configured
            if (rapidApiKey == null || rapidApiKey.trim().isEmpty()) {
                throw new RuntimeException("Judge0 API key not configured. Please set judge0.rapidapi-key in application.properties");
            }
            
            // Set headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("X-RapidAPI-Key", rapidApiKey);
            headers.set("X-RapidAPI-Host", rapidApiHost);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(submission, headers);
            
            // Submit to Judge0
            ResponseEntity<Map> response = restTemplate.postForEntity(
                judge0ApiUrl + "/submissions", entity, Map.class);
            
            if (response.getBody() == null) {
                throw new RuntimeException("No response from Judge0 API");
            }
            
            Map<String, Object> result = response.getBody();
            
            // Debug: Log the full response
            System.out.println("Judge0 API Response: " + result);
            
            // Parse Judge0 response
            Map<String, Object> execResult = new HashMap<>();
            
            // Decode base64 outputs
            String stdout = decodeBase64((String) result.get("stdout"));
            String stderr = decodeBase64((String) result.get("stderr"));
            String compileOutput = decodeBase64((String) result.get("compile_output"));
            String message = (String) result.get("message");
            
            // Debug output parsing
            System.out.println("Decoded stdout: '" + stdout + "'");
            System.out.println("Decoded stderr: '" + stderr + "'");
            System.out.println("Compile output: '" + compileOutput + "'");
            System.out.println("Message: '" + message + "'");
            
            execResult.put("output", stdout != null ? stdout : "");
            execResult.put("stderr", stderr != null ? stderr : "");
            
            // Get status information
            Map<String, Object> status = (Map<String, Object>) result.get("status");
            String statusDescription = "Unknown";
            Integer statusId = null;
            
            if (status != null) {
                statusDescription = (String) status.get("description");
                statusId = (Integer) status.get("id");
            }
            
            // If status is null, Judge0 API key is not configured or request failed
            // Force fallback to local execution
            if (statusId == null) {
                System.err.println("Judge0 returned null status - API key likely not configured, falling back to local");
                return executeLocally(language, code, input);
            }

            // Handle different status cases
            if (compileOutput != null && !compileOutput.trim().isEmpty()) {
                execResult.put("error", "Judge0 Error: " + message);
            } else if (statusId != null && statusId != 3) { // 3 = Accepted
                if (statusId == 6) { // Compilation Error
                    execResult.put("error", "Compilation Error: " + (compileOutput != null ? compileOutput : "Unknown compilation error"));
                } else if (statusId == 5) { // Time Limit Exceeded
                    execResult.put("error", "Time Limit Exceeded");
                } else if (statusId == 4) { // Wrong Answer (shouldn't happen for execution)
                    execResult.put("error", "Execution completed but may have issues");
                } else if (statusId == 11) { // Runtime Error
                    execResult.put("error", "Runtime Error: " + (stderr != null ? stderr : "Unknown runtime error"));
                } else if (statusId == 12) { // Runtime Error (SIGKILL)
                    execResult.put("error", "Runtime Error: Process killed (possibly infinite loop or memory limit)");
                } else if (statusId == 13) { // Runtime Error (SIGFPE)
                    execResult.put("error", "Runtime Error: Floating point exception (division by zero)");
                } else if (statusId == 14) { // Runtime Error (SIGSEGV)
                    execResult.put("error", "Runtime Error: Segmentation fault (invalid memory access)");
                } else {
                    execResult.put("error", "Execution Error: " + statusDescription + " (Status ID: " + statusId + ")");
                }
            }
            
            // Enhanced logging
            List<String> logs = new ArrayList<>();
            logs.add("Remote execution via Judge0");
            logs.add("Language ID: " + languageId);
            logs.add("Status: " + statusDescription + " (ID: " + statusId + ")");
            if (result.get("time") != null) {
                logs.add("Execution time: " + result.get("time") + "s");
            }
            if (result.get("memory") != null) {
                logs.add("Memory used: " + result.get("memory") + " KB");
            }
            
            execResult.put("logs", logs);
            
            return execResult;
            
        } catch (Exception e) {
            // Fallback to local execution if remote fails
            System.err.println("Remote execution failed, falling back to local: " + e.getMessage());
            return executeLocally(language, code, input);
        }
    }
    
    private int getLanguageId(String language) {
        // Judge0 language IDs
        switch (language) {
            case "java": return 62; // Java (OpenJDK 13.0.1)
            case "python": return 71; // Python (3.8.1)
            case "cpp": case "c++": return 54; // C++ (GCC 9.2.0)
            case "c": return 50; // C (GCC 9.2.0)
            case "javascript": case "js": return 63; // JavaScript (Node.js 12.14.0)
            default: return 62; // Default to Java
        }
    }
    
    private String decodeBase64(String encoded) {
        if (encoded == null || encoded.trim().isEmpty() || "null".equals(encoded)) {
            return null;
        }
        try {
            byte[] decoded = Base64.getDecoder().decode(encoded);
            String result = new String(decoded, StandardCharsets.UTF_8);
            return result.trim().isEmpty() ? null : result;
        } catch (Exception e) {
            // If it's not valid base64, return the original string
            System.out.println("Failed to decode base64: " + encoded + ", error: " + e.getMessage());
            return encoded;
        }
    }
    
    private Map<String, Object> executeLocally(String language, String code, String input) {
        Map<String, Object> result = new HashMap<>();
        try {
            ExecResult r = execute(language, code, input, 10, TimeUnit.SECONDS);
            result.put("output", r.stdout != null ? r.stdout : "");
            result.put("stderr", r.stderr != null ? r.stderr : "");
            if (r.errorMessage != null && !r.errorMessage.isBlank()) {
                result.put("error", r.errorMessage);
            }
            result.put("logs", r.logs);
        } catch (Exception e) {
            result.put("output", "");
            result.put("stderr", "");
            result.put("error", "Local execution failed: " + e.getMessage());
            result.put("logs", List.of("Local execution error: " + e.getMessage()));
        }
        return result;
    }

    static class ExecResult {
        String stdout;
        String stderr;
        String errorMessage; // null if success
        List<String> logs = new ArrayList<>();
    }

    private ExecResult execute(String lang, String code, String input, long timeout, TimeUnit unit) throws Exception {
        ExecResult result = new ExecResult();
        Path tempDir = Files.createTempDirectory("judge-");
        result.logs.add("TempDir: " + tempDir);
        try {
            switch (lang) {
                case "java":
                    return runJava(tempDir, code, input, timeout, unit, result);
                case "python":
                    return runPython(tempDir, code, input, timeout, unit, result);
                case "cpp":
                    return runCpp(tempDir, code, input, timeout, unit, result);
                case "c":
                    return runC(tempDir, code, input, timeout, unit, result);
                default:
                    result.errorMessage = "Unsupported language: " + lang;
                    return result;
            }
        } finally {
            // Cleanup temp dir
            try {
                Files.walk(tempDir)
                        .sorted(Comparator.reverseOrder())
                        .forEach(p -> {
                            try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                        });
            } catch (IOException ignored) {}
        }
    }

    private ExecResult runJava(Path dir, String code, String input, long timeout, TimeUnit unit, ExecResult res) throws Exception {
        // Expect class Main with main method
        Path file = dir.resolve("Main.java");
        Files.writeString(file, code, StandardCharsets.UTF_8);
        res.logs.add("javac Main.java");
        ExecResult compile = runProcess(List.of("javac", "Main.java"), dir, null, timeout, unit);
        if (compile.errorMessage != null || (compile.stderr != null && !compile.stderr.isBlank())) {
            return compile;
        }
        res.logs.add("java Main");
        return runProcess(javaCmd(), dir, input, timeout, unit);
    }

    private List<String> javaCmd() {
        // On Windows, 'java' should be on PATH if JDK/JRE installed
        return List.of("java", "Main");
    }

    private ExecResult runPython(Path dir, String code, String input, long timeout, TimeUnit unit, ExecResult res) throws Exception {
        Path file = dir.resolve("main.py");
        Files.writeString(file, code, StandardCharsets.UTF_8);
        // Try python3 then python
        ExecResult r = runProcess(List.of("python", "main.py"), dir, input, timeout, unit);
        if (r.errorMessage != null && r.errorMessage.toLowerCase(Locale.ROOT).contains("cannot run program")) {
            return runProcess(List.of("python3", "main.py"), dir, input, timeout, unit);
        }
        return r;
    }

    private ExecResult runCpp(Path dir, String code, String input, long timeout, TimeUnit unit, ExecResult res) throws Exception {
        Path src = dir.resolve("main.cpp");
        Files.writeString(src, code, StandardCharsets.UTF_8);
        Path exe = dir.resolve("a.exe"); // Windows; on *nix it's typically a.out
        ExecResult compile = runProcess(List.of("g++", "-O2", "-std=c++17", "main.cpp", "-o", exe.toString()), dir, null, timeout, unit);
        if (compile.errorMessage != null || (compile.stderr != null && !compile.stderr.isBlank())) {
            return compile;
        }
        return runProcess(List.of(exe.toString()), dir, input, timeout, unit);
    }

    private ExecResult runC(Path dir, String code, String input, long timeout, TimeUnit unit, ExecResult res) throws Exception {
        Path src = dir.resolve("main.c");
        Files.writeString(src, code, StandardCharsets.UTF_8);
        Path exe = dir.resolve("a.exe");
        ExecResult compile = runProcess(List.of("gcc", "-O2", "main.c", "-o", exe.toString()), dir, null, timeout, unit);
        if (compile.errorMessage != null || (compile.stderr != null && !compile.stderr.isBlank())) {
            return compile;
        }
        return runProcess(List.of(exe.toString()), dir, input, timeout, unit);
    }

    private ExecResult runProcess(List<String> command, Path workDir, String input, long timeout, TimeUnit unit) {
        ExecResult res = new ExecResult();
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(workDir.toFile());
        pb.redirectErrorStream(false);
        try {
            Process p = pb.start();

            // Feed input
            if (input != null) {
                try (OutputStream os = p.getOutputStream()) {
                    os.write(input.getBytes(StandardCharsets.UTF_8));
                    os.flush();
                } catch (IOException ignored) {}
            }

            // Capture stdout/stderr concurrently
            Future<String> outF = Executors.newSingleThreadExecutor().submit(() -> readAll(p.getInputStream()));
            Future<String> errF = Executors.newSingleThreadExecutor().submit(() -> readAll(p.getErrorStream()));

            boolean finished = p.waitFor(timeout, unit);
            if (!finished) {
                p.destroyForcibly();
                res.stdout = safeGet(outF);
                res.stderr = safeGet(errF);
                res.errorMessage = "Execution timed out";
                return res;
            }

            res.stdout = safeGet(outF);
            res.stderr = safeGet(errF);
            res.errorMessage = null;
            return res;
        } catch (IOException e) {
            res.stdout = "";
            res.stderr = "";
            res.errorMessage = e.getMessage();
            return res;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            res.stdout = "";
            res.stderr = "";
            res.errorMessage = "Execution interrupted";
            return res;
        }
    }

    private static String readAll(InputStream is) {
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            String line;
            boolean first = true;
            while ((line = br.readLine()) != null) {
                if (!first) sb.append('\n');
                sb.append(line);
                first = false;
            }
            return sb.toString();
        } catch (IOException e) {
            return "";
        }
    }

    private static String safeGet(Future<String> f) {
        try {
            return f.get(100, TimeUnit.MILLISECONDS);
        } catch (Exception ignored) {
            return "";
        }
    }
}
