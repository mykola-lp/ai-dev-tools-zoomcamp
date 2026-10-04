package com.weatheranalytics.entity;

import com.weatheranalytics.domain.ChartType;
import com.weatheranalytics.domain.Metric;
import com.weatheranalytics.domain.PeriodRange;
import com.weatheranalytics.domain.Visibility;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "views")
public class ViewEntity extends BaseEntity {

    @Column(name = "owner_id", nullable = false, updatable = false)
    private String ownerId;

    @Column(name = "name", nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility", nullable = false)
    private Visibility visibility;

    @Convert(converter = StringListConverter.class)
    @Column(name = "city_ids", nullable = false)
    private List<String> cityIds;

    @Enumerated(EnumType.STRING)
    @Column(name = "period", nullable = false)
    private PeriodRange period;

    @Convert(converter = MetricListConverter.class)
    @Column(name = "metrics", nullable = false)
    private List<Metric> metrics;

    @Enumerated(EnumType.STRING)
    @Column(name = "chart_type", nullable = false)
    private ChartType chartType;

    @Column(name = "show_table", nullable = false)
    private boolean showTable;

    @Column(name = "show_insights", nullable = false)
    private boolean showInsights;

    @Convert(converter = InstantStringConverter.class)
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Convert(converter = InstantStringConverter.class)
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    protected ViewEntity() {
    }

    public ViewEntity(String id, String ownerId, String name, Visibility visibility, List<String> cityIds,
                      PeriodRange period, List<Metric> metrics, ChartType chartType, boolean showTable,
                      boolean showInsights, Instant now) {
        super(id);
        this.ownerId = ownerId;
        this.name = name;
        this.visibility = visibility;
        this.cityIds = List.copyOf(cityIds);
        this.period = period;
        this.metrics = List.copyOf(metrics);
        this.chartType = chartType;
        this.showTable = showTable;
        this.showInsights = showInsights;
        this.createdAt = now;
        this.updatedAt = now;
    }

    public String getOwnerId() {
        return ownerId;
    }

    public String getName() {
        return name;
    }

    public Visibility getVisibility() {
        return visibility;
    }

    public List<String> getCityIds() {
        return cityIds;
    }

    public PeriodRange getPeriod() {
        return period;
    }

    public List<Metric> getMetrics() {
        return metrics;
    }

    public ChartType getChartType() {
        return chartType;
    }

    public boolean isShowTable() {
        return showTable;
    }

    public boolean isShowInsights() {
        return showInsights;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setName(String name) {
        this.name = name;
    }

    public void setVisibility(Visibility visibility) {
        this.visibility = visibility;
    }

    public void setCityIds(List<String> cityIds) {
        this.cityIds = List.copyOf(cityIds);
    }

    public void setPeriod(PeriodRange period) {
        this.period = period;
    }

    public void setMetrics(List<Metric> metrics) {
        this.metrics = List.copyOf(metrics);
    }

    public void setDashboard(ChartType chartType, boolean showTable, boolean showInsights) {
        this.chartType = chartType;
        this.showTable = showTable;
        this.showInsights = showInsights;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
}
