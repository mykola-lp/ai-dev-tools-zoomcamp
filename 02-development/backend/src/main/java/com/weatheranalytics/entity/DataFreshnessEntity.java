package com.weatheranalytics.entity;

import com.weatheranalytics.domain.DataCategory;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

/** When a data category was last stored from upstream, and how many times (version). id = category value. */
@Entity
@Table(name = "data_freshness")
public class DataFreshnessEntity extends BaseEntity {

    @Convert(converter = InstantStringConverter.class)
    @Column(name = "last_updated", nullable = false)
    private Instant lastUpdated;

    @Column(name = "version", nullable = false)
    private long version;

    protected DataFreshnessEntity() {
    }

    public DataFreshnessEntity(DataCategory category, Instant lastUpdated, long version) {
        super(category.value());
        this.lastUpdated = lastUpdated;
        this.version = version;
    }

    public void touch(Instant at) {
        this.lastUpdated = at;
        this.version++;
    }

    public Instant getLastUpdated() {
        return lastUpdated;
    }

    public long getVersion() {
        return version;
    }
}
