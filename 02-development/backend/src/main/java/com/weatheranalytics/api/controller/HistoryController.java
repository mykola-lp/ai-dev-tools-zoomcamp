package com.weatheranalytics.api.controller;

import com.weatheranalytics.api.dto.AnalysisRun;
import com.weatheranalytics.api.dto.ViewConfig;
import com.weatheranalytics.security.AuthenticatedUser;
import com.weatheranalytics.service.AnalysisService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/history/runs")
public class HistoryController {

    private final AnalysisService analysisService;

    public HistoryController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @GetMapping
    public List<AnalysisRun> list(@AuthenticationPrincipal AuthenticatedUser user) {
        return analysisService.listRuns(user.id());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AnalysisRun create(@AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody ViewConfig config) {
        return analysisService.createRun(user.id(), config);
    }

    @GetMapping("/{runId}")
    public AnalysisRun get(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String runId) {
        return analysisService.getRun(user.id(), runId);
    }
}
