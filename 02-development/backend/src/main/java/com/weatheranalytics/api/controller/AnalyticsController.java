package com.weatheranalytics.api.controller;

import com.weatheranalytics.api.dto.AnalysisResult;
import com.weatheranalytics.api.dto.ViewConfig;
import com.weatheranalytics.service.AnalysisService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/analytics")
public class AnalyticsController {

    private final AnalysisService analysisService;

    public AnalyticsController(AnalysisService analysisService) {
        this.analysisService = analysisService;
    }

    @PostMapping("/analyze")
    public AnalysisResult analyze(@Valid @RequestBody ViewConfig config) {
        return analysisService.analyze(config);
    }
}
