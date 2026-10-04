package com.weatheranalytics.integration.openmeteo;

import com.weatheranalytics.domain.DataCategory;
import com.weatheranalytics.domain.PeriodRange;
import com.weatheranalytics.domain.WeatherValues;
import com.weatheranalytics.integration.CityLocation;
import com.weatheranalytics.integration.CurrentObservation;
import com.weatheranalytics.integration.DailyObservation;
import com.weatheranalytics.integration.WeatherProvider;
import com.weatheranalytics.integration.WeatherProviderException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Maps Open-Meteo wire models to the application's provider-neutral observation types. */
@Component
public class OpenMeteoWeatherProvider implements WeatherProvider {

    private final OpenMeteoClient client;

    public OpenMeteoWeatherProvider(OpenMeteoClient client) {
        this.client = client;
    }

    @Override
    public Map<String, CurrentObservation> fetchCurrent(Collection<CityLocation> cities) {
        List<CityLocation> locations = List.copyOf(cities);
        if (locations.isEmpty()) {
            return Map.of();
        }
        List<OpenMeteoForecast> responses = client.fetchCurrent(locations);
        Map<String, CurrentObservation> result = new LinkedHashMap<>();
        for (int i = 0; i < locations.size(); i++) {
            OpenMeteoForecast.Current current = responses.get(i).current();
            if (current == null) {
                throw new WeatherProviderException("Open-Meteo response has no 'current' block");
            }
            result.put(locations.get(i).id(), new CurrentObservation(parseInstant(current.time()), toValues(current)));
        }
        return result;
    }

    @Override
    public Map<String, List<DailyObservation>> fetchDaily(Collection<CityLocation> cities, DataCategory category) {
        List<CityLocation> locations = List.copyOf(cities);
        if (locations.isEmpty()) {
            return Map.of();
        }
        List<OpenMeteoForecast> responses = switch (category) {
            // past days plus today
            case HISTORICAL -> client.fetchDaily(locations, PeriodRange.MAX_HISTORICAL_DAYS, 1);
            // today plus the days ahead
            case FORECAST -> client.fetchDaily(locations, 0, PeriodRange.MAX_FORECAST_DAYS + 1);
            case CURRENT -> throw new IllegalArgumentException("CURRENT is not a daily category");
        };
        Map<String, List<DailyObservation>> result = new LinkedHashMap<>();
        for (int i = 0; i < locations.size(); i++) {
            OpenMeteoForecast.Daily daily = responses.get(i).daily();
            if (daily == null || daily.time() == null) {
                throw new WeatherProviderException("Open-Meteo response has no 'daily' block");
            }
            result.put(locations.get(i).id(), toDailyObservations(daily));
        }
        return result;
    }

    private static List<DailyObservation> toDailyObservations(OpenMeteoForecast.Daily daily) {
        int n = daily.time().size();
        double[] temperature = fillGaps(daily.temperature2mMean(), n, "temperature_2m_mean");
        double[] apparent = fillGaps(daily.apparentTemperatureMean(), n, "apparent_temperature_mean");
        double[] precipitation = zeroGaps(daily.precipitationSum(), n, "precipitation_sum");
        double[] wind = fillGaps(daily.windSpeed10mMean(), n, "wind_speed_10m_mean");
        double[] humidity = fillGaps(daily.relativeHumidity2mMean(), n, "relative_humidity_2m_mean");
        double[] pressure = fillGaps(daily.surfacePressureMean(), n, "surface_pressure_mean");
        double[] snowfall = zeroGaps(daily.snowfallSum(), n, "snowfall_sum");
        List<Integer> codes = daily.weatherCode();
        if (codes == null || codes.size() != n) {
            throw new WeatherProviderException("Open-Meteo daily 'weather_code' has unexpected length");
        }

        List<DailyObservation> result = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            LocalDate date = parseDate(daily.time().get(i));
            Integer code = codes.get(i);
            result.add(new DailyObservation(date, new WeatherValues(
                    temperature[i], apparent[i], precipitation[i], wind[i], humidity[i], pressure[i], snowfall[i],
                    code == null ? 0 : code)));
        }
        return result;
    }

    private static WeatherValues toValues(OpenMeteoForecast.Current c) {
        return new WeatherValues(
                required(c.temperature2m(), "temperature_2m"),
                required(c.apparentTemperature(), "apparent_temperature"),
                orZero(c.precipitation()),
                required(c.windSpeed10m(), "wind_speed_10m"),
                required(c.relativeHumidity2m(), "relative_humidity_2m"),
                required(c.surfacePressure(), "surface_pressure"),
                orZero(c.snowfall()),
                c.weatherCode() == null ? 0 : c.weatherCode());
    }

    /** Sums (precipitation, snowfall) that are missing mean "nothing measured". */
    private static double[] zeroGaps(List<Double> source, int n, String name) {
        checkLength(source, n, name);
        double[] out = new double[n];
        for (int i = 0; i < n; i++) {
            out[i] = orZero(source.get(i));
        }
        return out;
    }

    /** Gaps in continuous measurements are bridged with the previous (else next) known value. */
    private static double[] fillGaps(List<Double> source, int n, String name) {
        checkLength(source, n, name);
        double[] out = new double[n];
        boolean[] known = new boolean[n];
        for (int i = 0; i < n; i++) {
            Double v = source.get(i);
            if (v != null) {
                out[i] = v;
                known[i] = true;
            }
        }
        Double last = null;
        for (int i = 0; i < n; i++) {
            if (known[i]) {
                last = out[i];
            } else if (last != null) {
                out[i] = last;
                known[i] = true;
            }
        }
        Double next = null;
        for (int i = n - 1; i >= 0; i--) {
            if (known[i]) {
                next = out[i];
            } else if (next != null) {
                out[i] = next;
                known[i] = true;
            }
        }
        for (int i = 0; i < n; i++) {
            if (!known[i]) {
                throw new WeatherProviderException("Open-Meteo returned no values for '" + name + "'");
            }
        }
        return out;
    }

    private static void checkLength(List<Double> source, int n, String name) {
        if (source == null || source.size() != n) {
            throw new WeatherProviderException("Open-Meteo daily '" + name + "' has unexpected length");
        }
    }

    private static double required(Double value, String name) {
        if (value == null) {
            throw new WeatherProviderException("Open-Meteo returned no value for '" + name + "'");
        }
        return value;
    }

    private static double orZero(Double value) {
        return value == null ? 0.0 : value;
    }

    private static java.time.Instant parseInstant(String time) {
        try {
            return LocalDateTime.parse(time).toInstant(ZoneOffset.UTC);
        } catch (DateTimeParseException | NullPointerException e) {
            throw new WeatherProviderException("Unparseable Open-Meteo timestamp: " + time, e);
        }
    }

    private static LocalDate parseDate(String date) {
        try {
            return LocalDate.parse(date);
        } catch (DateTimeParseException | NullPointerException e) {
            throw new WeatherProviderException("Unparseable Open-Meteo date: " + date, e);
        }
    }
}
