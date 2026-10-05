package com.weatheranalytics.api.controller;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.atomic.AtomicInteger;

@RestController
@RequestMapping("/api/interview-metrics")
public class InterviewMetricsController {

    private final Counter roomsCreated;
    private final Counter canvasElementsCreated;
    private final Counter componentCreationFailures;
    private final AtomicInteger activeParticipants;

    public InterviewMetricsController(MeterRegistry registry) {
        this.roomsCreated = Counter.builder("interview_rooms_created")
                .description("Number of interview rooms created")
                .register(registry);
                
        this.canvasElementsCreated = Counter.builder("canvas_elements_created")
                .description("Number of canvas elements created")
                .register(registry);
                
        this.componentCreationFailures = Counter.builder("component_creation_failures")
                .description("Number of failures in component creation")
                .register(registry);
                
        this.activeParticipants = registry.gauge("active_interview_participants", new AtomicInteger(0));
    }

    @PostMapping("/simulate-room")
    public String simulateRoomCreated() {
        roomsCreated.increment();
        return "Simulated room creation metric incremented";
    }

    @PostMapping("/simulate-canvas")
    public String simulateCanvasCreated() {
        canvasElementsCreated.increment();
        return "Simulated canvas element creation metric incremented";
    }

    @PostMapping("/simulate-failure")
    public String simulateComponentFailure() {
        componentCreationFailures.increment();
        return "Simulated component creation failure metric incremented";
    }

    @PostMapping("/participants")
    public String setParticipants(@RequestParam int count) {
        if (activeParticipants != null) {
            activeParticipants.set(count);
        }
        return "Set active participants metric to " + count;
    }
}
