package com.SmartHireX.service;

import java.time.LocalDateTime;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.SmartHireX.entity.Round;
import com.SmartHireX.model.JobPosting;
import com.SmartHireX.repository.RoundRepository;

@Component
public class RoundReminderScheduler {

    private static final Logger logger = LoggerFactory.getLogger(RoundReminderScheduler.class);

    private final RoundRepository roundRepository;
    private final CandidateShortlistingService candidateShortlistingService;

    @Value("${app.round.reminder.window.minutes:10}")
    private int reminderWindowMinutes;

    @Autowired
    public RoundReminderScheduler(RoundRepository roundRepository,
                                  CandidateShortlistingService candidateShortlistingService) {
        this.roundRepository = roundRepository;
        this.candidateShortlistingService = candidateShortlistingService;
    }

    @Scheduled(fixedDelayString = "${app.round.reminder.interval.ms:60000}")
    @Transactional
    public void sendUpcomingRoundReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime windowEnd = now.plusMinutes(Math.max(reminderWindowMinutes, 1));

        List<Round> upcomingRounds = roundRepository.findByStartTimeBetween(now, windowEnd);
        if (upcomingRounds.isEmpty()) {
            return;
        }

        for (Round round : upcomingRounds) {
            if (round.getStartTime() == null || round.getStartTime().isBefore(now)) {
                continue;
            }
            if (round.getNextReminderSentAt() != null) {
                continue;
            }

            JobPosting job = round.getJob();
            if (job == null) {
                logger.warn("Skipping reminder for round {} because job is not available", round.getId());
                continue;
            }

            try {
                candidateShortlistingService.sendRoundReminder(job, round);
                round.setNextReminderSentAt(LocalDateTime.now());
                roundRepository.save(round);
            } catch (Exception ex) {
                logger.warn("Failed to send reminder for round {}: {}", round.getId(), ex.getMessage());
            }
        }
    }
}
