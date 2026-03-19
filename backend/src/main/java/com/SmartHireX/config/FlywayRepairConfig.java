package com.SmartHireX.config;

import org.flywaydb.core.Flyway;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class FlywayRepairConfig implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(FlywayRepairConfig.class);

    private final Flyway flyway;

    public FlywayRepairConfig(Flyway flyway) {
        this.flyway = flyway;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            log.info("Running Flyway repair before migration");
            flyway.repair();
        } catch (Exception ex) {
            log.warn("Flyway repair failed: {}", ex.getMessage());
        }
    }
}
