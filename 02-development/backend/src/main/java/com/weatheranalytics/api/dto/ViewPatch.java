package com.weatheranalytics.api.dto;

import com.weatheranalytics.domain.Metric;
import com.weatheranalytics.domain.PeriodRange;
import com.weatheranalytics.domain.Visibility;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** Any subset of the view fields; absent (null) fields are left unchanged. */
public record ViewPatch(
        @Size(max = 200) String name,
        Visibility visibility,
        @Size(min = 1) List<@NotBlank String> cityIds,
        PeriodRange period,
        @Size(min = 1) List<@NotNull Metric> metrics,
        @Valid DashboardSettings dashboard) {

    public boolean isEmpty() {
        return name == null && visibility == null && cityIds == null && period == null
                && metrics == null && dashboard == null;
    }
}
