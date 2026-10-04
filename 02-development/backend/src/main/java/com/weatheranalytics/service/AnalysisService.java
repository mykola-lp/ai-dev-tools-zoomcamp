package com.weatheranalytics.service;

import com.weatheranalytics.api.dto.AnalysisResult;
import com.weatheranalytics.api.dto.AnalysisRun;
import com.weatheranalytics.api.dto.City;
import com.weatheranalytics.api.dto.ViewConfig;
import com.weatheranalytics.api.error.ApiException;
import com.weatheranalytics.config.AppClock;
import com.weatheranalytics.domain.CitySeriesData;
import com.weatheranalytics.entity.AnalysisRunEntity;
import com.weatheranalytics.repository.AnalysisRunRepository;
import com.weatheranalytics.service.analytics.AnalyticsEngine;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Computes analytics for a configuration and (for signed-in users) stores immutable run snapshots.
 * A run copies everything it needs - configuration, cities, data version and result - so later edits to views
 * or refreshes of weather data never change it. Runs are only ever inserted and read.
 */
@Service
public class AnalysisService {

    private final CityService cityService;
    private final WeatherService weatherService;
    private final AnalyticsEngine engine;
    private final AnalysisRunRepository runs;
    private final RunSnapshotCodec codec;
    private final AppClock clock;

    public AnalysisService(CityService cityService, WeatherService weatherService, AnalyticsEngine engine,
                           AnalysisRunRepository runs, RunSnapshotCodec codec, AppClock clock) {
        this.cityService = cityService;
        this.weatherService = weatherService;
        this.engine = engine;
        this.runs = runs;
        this.codec = codec;
        this.clock = clock;
    }

    private record Computation(ViewConfig config, List<City> cities, String dataVersion, AnalysisResult result) {
    }

    /** Analytics for a configuration; nothing is persisted. */
    public AnalysisResult analyze(ViewConfig config) {
        return compute(config).result();
    }

    /** Always creates a NEW run. */
    public AnalysisRun createRun(String userId, ViewConfig config) {
        Computation c = compute(config);
        AnalysisRunEntity saved = runs.save(new AnalysisRunEntity(
                UUID.randomUUID().toString(),
                userId,
                clock.now(),
                codec.write(c.config()),
                codec.write(c.cities()),
                c.dataVersion(),
                codec.write(c.result())));
        return toDto(saved);
    }

    public List<AnalysisRun> listRuns(String userId) {
        return runs.findByUserIdOrderByCreatedAtDesc(userId).stream().map(this::toDto).toList();
    }

    /** NOT_FOUND for runs that do not exist or belong to somebody else. */
    public AnalysisRun getRun(String userId, String runId) {
        return runs.findByIdAndUserId(runId, userId).map(this::toDto)
                .orElseThrow(() -> ApiException.notFound("Analysis run not found: " + runId));
    }

    private Computation compute(ViewConfig raw) {
        ViewConfig config = raw.normalized();
        List<City> cities = cityService.requireAll(config.cityIds());
        List<CitySeriesData> series = weatherService.series(config.cityIds(), config.period());
        AnalysisResult result = engine.analyze(cities, series, config.metrics());
        String version = weatherService.dataVersion(config.period().category());
        return new Computation(config, cities, version, result);
    }

    private AnalysisRun toDto(AnalysisRunEntity e) {
        return new AnalysisRun(
                e.getId(),
                e.getUserId(),
                e.getCreatedAt(),
                codec.read(e.getConfigJson(), ViewConfig.class),
                codec.readCities(e.getCitiesJson()),
                e.getDataVersion(),
                codec.read(e.getResultJson(), AnalysisResult.class));
    }
}
