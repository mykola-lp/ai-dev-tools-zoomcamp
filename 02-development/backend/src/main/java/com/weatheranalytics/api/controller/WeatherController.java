package com.weatheranalytics.api.controller;

import com.weatheranalytics.api.dto.CitySeries;
import com.weatheranalytics.api.dto.CurrentWeather;
import com.weatheranalytics.api.dto.Freshness;
import com.weatheranalytics.api.dto.RefreshResult;
import com.weatheranalytics.api.mapper.WeatherMapper;
import com.weatheranalytics.domain.DataCategory;
import com.weatheranalytics.domain.PeriodRange;
import com.weatheranalytics.service.WeatherService;
import com.weatheranalytics.util.IdLists;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/weather")
public class WeatherController {

    private final WeatherService weatherService;

    public WeatherController(WeatherService weatherService) {
        this.weatherService = weatherService;
    }

    @GetMapping("/current")
    public List<CurrentWeather> current(@RequestParam("cityIds") List<String> cityIds) {
        return weatherService.current(IdLists.normalize(cityIds, "cityIds")).stream().map(WeatherMapper::toDto).toList();
    }

    @GetMapping("/series")
    public List<CitySeries> series(@RequestParam("cityIds") List<String> cityIds,
                                   @RequestParam("period") PeriodRange period) {
        return weatherService.series(IdLists.normalize(cityIds, "cityIds"), period).stream()
                .map(WeatherMapper::toDto).toList();
    }

    @GetMapping("/freshness")
    public List<Freshness> freshness() {
        return weatherService.freshness();
    }

    @PostMapping("/refresh/{category}")
    public RefreshResult refresh(@PathVariable("category") DataCategory category) {
        return weatherService.refresh(category);
    }
}
