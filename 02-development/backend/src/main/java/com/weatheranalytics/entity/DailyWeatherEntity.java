package com.weatheranalytics.entity;

import com.weatheranalytics.domain.DataCategory;
import com.weatheranalytics.domain.WeatherValues;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

/** One cached day for a city, either historical or forecast. */
@Entity
@Table(name = "daily_weather")
public class DailyWeatherEntity extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, updatable = false)
    private DataCategory category;

    @Column(name = "city_id", nullable = false, updatable = false)
    private String cityId;

    @Convert(converter = LocalDateStringConverter.class)
    @Column(name = "day", nullable = false, updatable = false)
    private LocalDate date;

    @Convert(converter = InstantStringConverter.class)
    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    @Embedded
    private WeatherValuesEmbeddable values;

    protected DailyWeatherEntity() {
    }

    public DailyWeatherEntity(String id, DataCategory category, String cityId, LocalDate date,
                              Instant fetchedAt, WeatherValues values) {
        super(id);
        this.category = category;
        this.cityId = cityId;
        this.date = date;
        this.fetchedAt = fetchedAt;
        this.values = WeatherValuesEmbeddable.from(values);
    }

    public DataCategory getCategory() {
        return category;
    }

    public String getCityId() {
        return cityId;
    }

    public LocalDate getDate() {
        return date;
    }

    public Instant getFetchedAt() {
        return fetchedAt;
    }

    public WeatherValues getValues() {
        return values.toDomain();
    }
}
