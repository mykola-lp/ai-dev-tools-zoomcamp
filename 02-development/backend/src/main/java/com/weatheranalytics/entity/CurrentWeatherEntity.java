package com.weatheranalytics.entity;

import com.weatheranalytics.domain.WeatherValues;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

/** Latest cached observation of a city (id = city id). */
@Entity
@Table(name = "current_weather")
public class CurrentWeatherEntity extends BaseEntity {

    @Convert(converter = InstantStringConverter.class)
    @Column(name = "observed_at", nullable = false)
    private Instant observedAt;

    @Convert(converter = InstantStringConverter.class)
    @Column(name = "fetched_at", nullable = false)
    private Instant fetchedAt;

    @Embedded
    private WeatherValuesEmbeddable values;

    protected CurrentWeatherEntity() {
    }

    public CurrentWeatherEntity(String cityId, Instant observedAt, Instant fetchedAt, WeatherValues values) {
        super(cityId);
        update(observedAt, fetchedAt, values);
    }

    public void update(Instant observedAt, Instant fetchedAt, WeatherValues values) {
        this.observedAt = observedAt;
        this.fetchedAt = fetchedAt;
        this.values = WeatherValuesEmbeddable.from(values);
    }

    public String getCityId() {
        return getId();
    }

    public Instant getObservedAt() {
        return observedAt;
    }

    public Instant getFetchedAt() {
        return fetchedAt;
    }

    public WeatherValues getValues() {
        return values.toDomain();
    }
}
