package com.weatheranalytics.seed;

import com.weatheranalytics.domain.WeatherValues;
import com.weatheranalytics.entity.CityEntity;
import java.time.LocalDate;
import java.util.Objects;
import java.util.Random;
import org.springframework.stereotype.Component;

/**
 * Deterministic, climate-shaped demo weather (latitude and season drive temperature; rain is random but seeded
 * by city and day). It only exists so a fresh install shows plausible data before the first upstream refresh.
 */
@Component
public class SyntheticWeatherGenerator {

    public WeatherValues forDay(CityEntity city, LocalDate date) {
        Random random = new Random(Objects.hash(city.getId(), date.toEpochDay()));
        double latitude = city.getLat();
        double absLat = Math.abs(latitude);

        double annualMean = 27 - 0.33 * absLat;
        double amplitude = 1 + 0.12 * absLat;
        double season = Math.sin(2 * Math.PI * (date.getDayOfYear() - 110) / 365.0);
        double temperature = annualMean + (latitude >= 0 ? amplitude : -amplitude) * season + random.nextGaussian() * 2.2;

        boolean rainy = random.nextDouble() < 0.30;
        double precipitation = rainy ? -Math.log(1 - random.nextDouble()) * 5 : 0;
        double snowfall = temperature < 0.5 ? precipitation * 0.8 : 0;
        double wind = 8 + random.nextDouble() * 18 + (rainy ? 4 : 0);
        double humidity = clamp(62 + (rainy ? 18 : 0) + random.nextGaussian() * 8, 30, 100);
        double pressure = 1013 + random.nextGaussian() * 7 - precipitation * 0.4;
        double apparent = temperature - 0.07 * wind + (temperature > 24 ? 0.04 * (humidity - 50) : 0);

        return new WeatherValues(round1(temperature), round1(apparent), round1(precipitation), round1(wind),
                round1(humidity), round1(pressure), round1(snowfall), weatherCode(precipitation, snowfall, humidity));
    }

    private static int weatherCode(double precipitation, double snowfall, double humidity) {
        if (snowfall > 0.5) {
            return 71;
        }
        if (precipitation > 10) {
            return 65;
        }
        if (precipitation > 2) {
            return 61;
        }
        if (precipitation > 0.1) {
            return 51;
        }
        if (humidity > 82) {
            return 3;
        }
        return humidity > 68 ? 2 : 1;
    }

    private static double clamp(double v, double min, double max) {
        return Math.max(min, Math.min(max, v));
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }
}
