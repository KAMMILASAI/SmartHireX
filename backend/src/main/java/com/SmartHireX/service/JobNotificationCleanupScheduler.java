package com.SmartHireX.service;

import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.repository.JobRepository;
import com.SmartHireX.repository.NotificationRepository;

@Component
public class JobNotificationCleanupScheduler {

    private static final Logger logger = LoggerFactory.getLogger(JobNotificationCleanupScheduler.class);
    private static final String JOB_POSTED_NOTIFICATION_TYPE = "job_posted";

    private final JobRepository jobRepository;
    private final NotificationRepository notificationRepository;

    public JobNotificationCleanupScheduler(JobRepository jobRepository, NotificationRepository notificationRepository) {
        this.jobRepository = jobRepository;
        this.notificationRepository = notificationRepository;
    }

    // Runs every 5 minutes by default and removes notifications for expired jobs.
    @Scheduled(fixedDelayString = "${app.jobs.notification.cleanup.interval.ms:60000}")
    @Transactional
    public void cleanupExpiredJobNotifications() {
        Instant now = Instant.now();
        List<Long> expiredJobIds = jobRepository.findExpiredJobIds(now);
        if (expiredJobIds.isEmpty()) {
            return;
        }

        long deleted = notificationRepository
                .deleteByNotificationTypeIgnoreCaseAndRelatedJobIdIn(JOB_POSTED_NOTIFICATION_TYPE, expiredJobIds);

        if (deleted > 0) {
            logger.info("Deleted {} expired job notifications", deleted);
        }
    }
}
