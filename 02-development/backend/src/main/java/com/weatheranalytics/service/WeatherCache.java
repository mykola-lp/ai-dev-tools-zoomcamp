package com.weatheranalytics.service;

import com.weatheranalytics.domain.DataCategory;
import com.weatheranalytics.entity.CurrentWeatherEntity;
import com.weatheranalytics.entity.DailyWeatherEntity;
import com.weatheranalytics.entity.DataFreshnessEntity;
import com.weatheranalytics.integration.CurrentObservation;
import com.weatheranalytics.integration.DailyObservation;
import com.weatheranalytics.repository.CurrentWeatherRepository;
import com.weatheranalytics.repository.DailyWeatherRepository;
import com.weatheranalytics.repository.DataFreshnessRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Persistence side of the weather data: every method is one short transaction, so upstream HTTP calls made by
 * {@link WeatherService} never hold a database connection.
 */
@Component
public class WeatherCache {

    /** Freshness of a category that has never been stored. */
    public static final Instant NEVER = Instant.EPOCH;

    public record Freshness(Instant lastUpdated, long version) {
    }

    private final CurrentWeatherRepository current;
    private final DailyWeatherRepository daily;
    private final DataFreshnessRepository freshness;

    public WeatherCache(CurrentWeatherRepository current, DailyWeatherRepository daily,
                        DataFreshnessRepository freshness) {
        this.current = current;
        this.daily = daily;
        this.freshness = freshness;
    }

    @Transactional(readOnly = true)
    public Map<String, CurrentWeatherEntity> loadCurrent(Collection<String> cityIds) {
        return current.findAllById(cityIds).stream()
                .collect(Collectors.toMap(CurrentWeatherEntity::getCityId, Function.identity()));
    }

    @Transactional(readOnly = true)
    public List<DailyWeatherEntity> loadDaily(DataCategory category, Collection<String> cityIds) {
        return daily.findByCategoryAndCityIdIn(category, cityIds);
    }

    /** Inserts or updates the current observation of each city and bumps the category's freshness. */
    @Transactional
    public void saveCurrent(Map<String, CurrentObservation> observations, Instant fetchedAt) {
        Map<String, CurrentWeatherEntity> existing = loadCurrent(observations.keySet());
        List<CurrentWeatherEntity> toSave = new ArrayList<>();
        observations.forEach((cityId, obs) -> {
            CurrentWeatherEntity entity = existing.get(cityId);
            if (entity == null) {
                entity = new CurrentWeatherEntity(cityId, obs.observedAt(), fetchedAt, obs.values());
            } else {
                entity.update(obs.observedAt(), fetchedAt, obs.values());
            }
            toSave.add(entity);
        });
        current.saveAll(toSave);
        touch(DataCategory.CURRENT, fetchedAt);
    }

    /** Replaces all cached days of the given cities for the category and bumps the category's freshness. */
    @Transactional
    public void replaceDaily(DataCategory category, Map<String, List<DailyObservation>> byCity, Instant fetchedAt) {
        if (byCity.isEmpty()) {
            return;
        }
        daily.deleteByCategoryAndCityIds(category, byCity.keySet());
        List<DailyWeatherEntity> rows = new ArrayList<>();
        byCity.forEach((cityId, days) -> days.forEach(day -> rows.add(new DailyWeatherEntity(
                UUID.randomUUID().toString(), category, cityId, day.date(), fetchedAt, day.values()))));
        daily.saveAll(rows);
        touch(category, fetchedAt);
    }

    @Transactional(readOnly = true)
    public Freshness freshness(DataCategory category) {
        return freshness.findById(category.value())
                .map(f -> new Freshness(f.getLastUpdated(), f.getVersion()))
                .orElse(new Freshness(NEVER, 0));
    }

    private void touch(DataCategory category, Instant at) {
        DataFreshnessEntity entity = freshness.findById(category.value())
                .orElseGet(() -> new DataFreshnessEntity(category, NEVER, 0));
        entity.touch(at);
        freshness.save(entity);
    }
}
