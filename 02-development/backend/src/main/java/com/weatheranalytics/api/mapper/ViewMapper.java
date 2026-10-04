package com.weatheranalytics.api.mapper;

import com.weatheranalytics.api.dto.DashboardSettings;
import com.weatheranalytics.api.dto.SavedView;
import com.weatheranalytics.entity.ViewEntity;

public final class ViewMapper {

    private ViewMapper() {
    }

    public static SavedView toDto(ViewEntity e) {
        return new SavedView(
                e.getId(),
                e.getOwnerId(),
                e.getName(),
                e.getVisibility(),
                e.getCityIds(),
                e.getPeriod(),
                e.getMetrics(),
                new DashboardSettings(e.getChartType(), e.isShowTable(), e.isShowInsights()),
                e.getCreatedAt(),
                e.getUpdatedAt());
    }
}
