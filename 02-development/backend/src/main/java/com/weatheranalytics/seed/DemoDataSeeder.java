package com.weatheranalytics.seed;

import com.weatheranalytics.api.dto.DashboardSettings;
import com.weatheranalytics.api.dto.ViewConfig;
import com.weatheranalytics.api.dto.ViewCreate;
import com.weatheranalytics.config.AppClock;
import com.weatheranalytics.config.AppProperties;
import com.weatheranalytics.domain.ChartType;
import com.weatheranalytics.domain.DataCategory;
import com.weatheranalytics.domain.Metric;
import com.weatheranalytics.domain.PeriodRange;
import com.weatheranalytics.domain.Visibility;
import com.weatheranalytics.entity.CityEntity;
import com.weatheranalytics.entity.UserEntity;
import com.weatheranalytics.integration.CurrentObservation;
import com.weatheranalytics.integration.DailyObservation;
import com.weatheranalytics.repository.CityRepository;
import com.weatheranalytics.repository.UserRepository;
import com.weatheranalytics.service.AnalysisService;
import com.weatheranalytics.service.AuthService;
import com.weatheranalytics.service.SavedCityService;
import com.weatheranalytics.service.ViewService;
import com.weatheranalytics.service.WeatherCache;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Gives a fresh database realistic content: cached weather for every city (so the UI works offline and before
 * the first upstream refresh), a demo account with saved cities, views and analysis runs.
 * Idempotent; the cities themselves come from the Flyway migration. Disable with {@code app.seed.enabled=false}.
 */
@Component
@ConditionalOnProperty(name = "app.seed.enabled", havingValue = "true")
public class DemoDataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final CityRepository cities;
    private final UserRepository users;
    private final WeatherCache weatherCache;
    private final SyntheticWeatherGenerator generator;
    private final AuthService authService;
    private final SavedCityService savedCityService;
    private final ViewService viewService;
    private final AnalysisService analysisService;
    private final AppProperties properties;
    private final AppClock clock;

    public DemoDataSeeder(CityRepository cities, UserRepository users, WeatherCache weatherCache,
                          SyntheticWeatherGenerator generator, AuthService authService,
                          SavedCityService savedCityService, ViewService viewService,
                          AnalysisService analysisService, AppProperties properties, AppClock clock) {
        this.cities = cities;
        this.users = users;
        this.weatherCache = weatherCache;
        this.generator = generator;
        this.authService = authService;
        this.savedCityService = savedCityService;
        this.viewService = viewService;
        this.analysisService = analysisService;
        this.properties = properties;
        this.clock = clock;
    }

    @Override
    public void run(ApplicationArguments args) {
        seedWeather();
        seedDemoAccount();
    }

    private void seedWeather() {
        List<CityEntity> all = cities.findAll();
        if (all.isEmpty()) {
            return;
        }
        // "stored a day ago": the scheduled refresh replaces the synthetic data with real data right after startup
        Instant seededAt = clock.now().minus(1, ChronoUnit.DAYS);
        LocalDate today = clock.today();

        if (weatherCache.freshness(DataCategory.CURRENT).lastUpdated().equals(WeatherCache.NEVER)) {
            Map<String, CurrentObservation> current = new LinkedHashMap<>();
            all.forEach(c -> current.put(c.getId(), new CurrentObservation(clock.now(), generator.forDay(c, today))));
            weatherCache.saveCurrent(current, seededAt);
        }
        if (weatherCache.freshness(DataCategory.HISTORICAL).lastUpdated().equals(WeatherCache.NEVER)) {
            weatherCache.replaceDaily(DataCategory.HISTORICAL,
                    days(all, today.minusDays(PeriodRange.MAX_HISTORICAL_DAYS), today.minusDays(1)), seededAt);
        }
        if (weatherCache.freshness(DataCategory.FORECAST).lastUpdated().equals(WeatherCache.NEVER)) {
            weatherCache.replaceDaily(DataCategory.FORECAST,
                    days(all, today.plusDays(1), today.plusDays(PeriodRange.MAX_FORECAST_DAYS)), seededAt);
        }
        log.info("Seeded demo weather for {} cities", all.size());
    }

    private Map<String, List<DailyObservation>> days(List<CityEntity> all, LocalDate from, LocalDate to) {
        Map<String, List<DailyObservation>> byCity = new LinkedHashMap<>();
        for (CityEntity city : all) {
            List<DailyObservation> days = new ArrayList<>();
            for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
                days.add(new DailyObservation(d, generator.forDay(city, d)));
            }
            byCity.put(city.getId(), days);
        }
        return byCity;
    }

    private void seedDemoAccount() {
        String email = properties.seed().demoEmail();
        if (users.existsByEmail(email)) {
            return;
        }
        UserEntity demo = authService.createUser(email, properties.seed().demoPassword());
        String userId = demo.getId();

        savedCityService.add(userId, "lisbon");
        savedCityService.add(userId, "london");
        savedCityService.add(userId, "kyiv");

        DashboardSettings lineWithAll = new DashboardSettings(ChartType.LINE, true, true);
        ViewCreate europeWeek = new ViewCreate("Europe this week", Visibility.PUBLIC,
                List.of("lisbon", "london", "kyiv", "berlin"), PeriodRange.LAST7,
                List.of(Metric.TEMPERATURE, Metric.PRECIPITATION, Metric.WIND_SPEED), lineWithAll);
        ViewCreate rain = new ViewCreate("Wet or dry? 30 days", Visibility.PRIVATE,
                List.of("london", "amsterdam", "oslo"), PeriodRange.LAST30,
                List.of(Metric.PRECIPITATION, Metric.HUMIDITY), new DashboardSettings(ChartType.BAR, true, true));
        ViewCreate forecast = new ViewCreate("Forecast: next two weeks", Visibility.PUBLIC,
                List.of("lviv", "kyiv", "warsaw"), PeriodRange.NEXT14,
                List.of(Metric.TEMPERATURE, Metric.APPARENT_TEMPERATURE), lineWithAll);
        viewService.create(userId, europeWeek);
        viewService.create(userId, rain);
        viewService.create(userId, forecast); // most recently updated -> opens as the personal dashboard

        analysisService.createRun(userId, europeWeek.toConfig());
        analysisService.createRun(userId, new ViewConfig(forecast.cityIds(), forecast.period(), forecast.metrics(),
                forecast.dashboard()));
        log.info("Seeded demo account {} (password from app.seed.demo-password)", email);
    }
}
