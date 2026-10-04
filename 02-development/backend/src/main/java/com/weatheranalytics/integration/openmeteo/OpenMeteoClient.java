package com.weatheranalytics.integration.openmeteo;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weatheranalytics.integration.CityLocation;
import com.weatheranalytics.integration.WeatherProviderException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Thin HTTP client for the Open-Meteo forecast API. It speaks only Open-Meteo's wire format
 * ({@link OpenMeteoForecast}); mapping to application types is done by {@link OpenMeteoWeatherProvider}.
 * Locations are batched (comma-separated coordinates) - the API then answers with one object per location.
 */
@Component
public class OpenMeteoClient {

    static final int MAX_LOCATIONS_PER_REQUEST = 50;

    static final String CURRENT_VARIABLES = "temperature_2m,apparent_temperature,precipitation,wind_speed_10m,"
            + "relative_humidity_2m,surface_pressure,snowfall,weather_code";

    static final String DAILY_VARIABLES = "temperature_2m_mean,apparent_temperature_mean,precipitation_sum,"
            + "wind_speed_10m_mean,relative_humidity_2m_mean,surface_pressure_mean,snowfall_sum,weather_code";

    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public OpenMeteoClient(RestClient openMeteoRestClient, ObjectMapper objectMapper) {
        this.restClient = openMeteoRestClient;
        this.objectMapper = objectMapper;
    }

    /** One entry per location, in request order. */
    public List<OpenMeteoForecast> fetchCurrent(List<CityLocation> locations) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("current", CURRENT_VARIABLES);
        return fetch(locations, params);
    }

    /** One entry per location, in request order; covers {@code pastDays} days back and {@code forecastDays} ahead. */
    public List<OpenMeteoForecast> fetchDaily(List<CityLocation> locations, int pastDays, int forecastDays) {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("daily", DAILY_VARIABLES);
        params.put("past_days", String.valueOf(pastDays));
        params.put("forecast_days", String.valueOf(forecastDays));
        return fetch(locations, params);
    }

    private List<OpenMeteoForecast> fetch(List<CityLocation> locations, Map<String, String> params) {
        List<OpenMeteoForecast> all = new ArrayList<>(locations.size());
        for (int from = 0; from < locations.size(); from += MAX_LOCATIONS_PER_REQUEST) {
            List<CityLocation> chunk = locations.subList(from, Math.min(from + MAX_LOCATIONS_PER_REQUEST, locations.size()));
            List<OpenMeteoForecast> parsed = parse(request(chunk, params));
            if (parsed.size() != chunk.size()) {
                throw new WeatherProviderException("Open-Meteo returned " + parsed.size()
                        + " results for " + chunk.size() + " locations");
            }
            all.addAll(parsed);
        }
        return all;
    }

    private JsonNode request(List<CityLocation> chunk, Map<String, String> params) {
        String latitudes = chunk.stream().map(l -> String.valueOf(l.lat())).collect(Collectors.joining(","));
        String longitudes = chunk.stream().map(l -> String.valueOf(l.lon())).collect(Collectors.joining(","));
        try {
            return restClient.get()
                    .uri(builder -> {
                        builder.path("/v1/forecast")
                                .queryParam("latitude", latitudes)
                                .queryParam("longitude", longitudes)
                                .queryParam("timezone", "UTC");
                        for (Map.Entry<String, String> param : params.entrySet()) {
                            builder.queryParam(param.getKey(), param.getValue());
                        }
                        return builder.build();
                    })
                    .retrieve()
                    .body(JsonNode.class);
        } catch (RestClientException e) {
            throw new WeatherProviderException("Open-Meteo request failed: " + e.getMessage(), e);
        }
    }

    /** A single location yields an object, several locations yield an array. */
    private List<OpenMeteoForecast> parse(JsonNode body) {
        if (body == null || body.isNull() || body.isMissingNode()) {
            throw new WeatherProviderException("Open-Meteo returned an empty response");
        }
        try {
            List<OpenMeteoForecast> result = new ArrayList<>();
            if (body.isArray()) {
                for (JsonNode element : body) {
                    result.add(objectMapper.treeToValue(element, OpenMeteoForecast.class));
                }
            } else {
                result.add(objectMapper.treeToValue(body, OpenMeteoForecast.class));
            }
            return result;
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new WeatherProviderException("Unexpected Open-Meteo response format", e);
        }
    }
}
