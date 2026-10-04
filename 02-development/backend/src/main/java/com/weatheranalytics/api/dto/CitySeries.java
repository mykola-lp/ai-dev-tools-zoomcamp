package com.weatheranalytics.api.dto;

import java.util.List;

public record CitySeries(String cityId, List<SeriesPoint> points) {
}
