package com.weatheranalytics.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.Immutable;

/**
 * Immutable analysis snapshot. Everything needed to reproduce the run (configuration, the cities as they were,
 * the data version and the computed result) is copied into the row; there is no reference to the originating
 * view. The entity has no mutators, is marked {@link Immutable} (Hibernate never issues UPDATEs for it) and its
 * repository exposes no update/delete operations.
 */
@Entity
@Immutable
@Table(name = "analysis_runs")
public class AnalysisRunEntity extends BaseEntity {

    @Column(name = "user_id", nullable = false, updatable = false)
    private String userId;

    @Convert(converter = InstantStringConverter.class)
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "config_json", nullable = false, updatable = false)
    private String configJson;

    @Column(name = "cities_json", nullable = false, updatable = false)
    private String citiesJson;

    @Column(name = "data_version", nullable = false, updatable = false)
    private String dataVersion;

    @Column(name = "result_json", nullable = false, updatable = false)
    private String resultJson;

    protected AnalysisRunEntity() {
    }

    public AnalysisRunEntity(String id, String userId, Instant createdAt, String configJson,
                             String citiesJson, String dataVersion, String resultJson) {
        super(id);
        this.userId = userId;
        this.createdAt = createdAt;
        this.configJson = configJson;
        this.citiesJson = citiesJson;
        this.dataVersion = dataVersion;
        this.resultJson = resultJson;
    }

    public String getUserId() {
        return userId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getConfigJson() {
        return configJson;
    }

    public String getCitiesJson() {
        return citiesJson;
    }

    public String getDataVersion() {
        return dataVersion;
    }

    public String getResultJson() {
        return resultJson;
    }
}
