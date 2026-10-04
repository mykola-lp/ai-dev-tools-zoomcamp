package com.weatheranalytics.config;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Component;

/** Single source of "now" (UTC). Timestamps are truncated to the precision persisted in the database. */
@Component
public class AppClock {

    private final Clock clock;

    public AppClock(Clock clock) {
        this.clock = clock;
    }

    public Instant now() {
        return Instant.now(clock).truncatedTo(ChronoUnit.MICROS);
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }
}
