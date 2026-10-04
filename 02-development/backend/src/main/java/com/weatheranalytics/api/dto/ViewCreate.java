package com.weatheranalytics.api.dto;

import com.weatheranalytics.domain.Metric;
import com.weatheranalytics.domain.PeriodRange;
import com.weatheranalytics.domain.Visibility;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

/** ViewConfig + name + visibility (flattened, as in the contract's allOf). */
public record ViewCreate(
        @NotNull @Size(max = 200) String name,
        @NotNull Visibility visibility,
        @NotEmpty List<@NotBlank String> cityIds,
        @NotNull PeriodRange period,
        @NotEmpty List<@NotNull Metric> metrics,
        @NotNull @Valid DashboardSettings dashboard) {

    public ViewConfig toConfig() {
        return new ViewConfig(cityIds, period, metrics, dashboard);
    }
}
