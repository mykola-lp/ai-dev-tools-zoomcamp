package com.weatheranalytics.domain;

import java.util.List;

public record CitySeriesData(String cityId, List<DailyPoint> points) {
}
