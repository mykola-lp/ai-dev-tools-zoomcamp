package com.weatheranalytics.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.weatheranalytics.domain.DataCategory;
import com.weatheranalytics.integration.openmeteo.OpenMeteoClient;
import com.weatheranalytics.integration.openmeteo.OpenMeteoWeatherProvider;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

class OpenMeteoClientTest {

    private static final List<CityLocation> TWO = List.of(
            new CityLocation("lisbon", 38.7223, -9.1393), new CityLocation("london", 51.5074, -0.1278));

    private MockRestServiceServer server;
    private OpenMeteoWeatherProvider provider;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://open-meteo.test");
        server = MockRestServiceServer.bindTo(builder).build();
        provider = new OpenMeteoWeatherProvider(new OpenMeteoClient(builder.build(), new ObjectMapper()));
    }

    private static String current(double temp) {
        return "{\"latitude\":1,\"longitude\":2,\"current\":{\"time\":\"2026-06-15T12:15\",\"temperature_2m\":" + temp
                + ",\"apparent_temperature\":" + (temp - 1) + ",\"precipitation\":0.4,\"wind_speed_10m\":11.5,"
                + "\"relative_humidity_2m\":70,\"surface_pressure\":1011.2,\"snowfall\":0.0,\"weather_code\":3}}";
    }

    @Test
    void batchedCurrentRequestIsMappedPerCityInRequestOrder() {
        server.expect(requestTo(containsString("/v1/forecast")))
                .andExpect(requestTo(containsString("latitude=38.7223,51.5074")))
                .andExpect(requestTo(containsString("longitude=-9.1393,-0.1278")))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("[" + current(20) + "," + current(11) + "]", MediaType.APPLICATION_JSON));

        Map<String, CurrentObservation> result = provider.fetchCurrent(TWO);

        assertThat(result.keySet()).containsExactly("lisbon", "london");
        assertThat(result.get("lisbon").values().temperature()).isEqualTo(20);
        assertThat(result.get("london").values().windSpeed()).isEqualTo(11.5);
        assertThat(result.get("london").values().weatherCode()).isEqualTo(3);
        assertThat(result.get("lisbon").observedAt()).isEqualTo(Instant.parse("2026-06-15T12:15:00Z"));
        server.verify();
    }

    @Test
    void singleLocationResponseIsAnObjectNotAnArray() {
        server.expect(requestTo(containsString("/v1/forecast")))
                .andRespond(withSuccess(current(5), MediaType.APPLICATION_JSON));
        assertThat(provider.fetchCurrent(List.of(TWO.get(0)))).containsKey("lisbon");
    }

    @Test
    void historicalDailyRequestAsksForPastDaysAndFillsGaps() {
        String daily = "{\"daily\":{\"time\":[\"2026-06-13\",\"2026-06-14\",\"2026-06-15\"],"
                + "\"temperature_2m_mean\":[10.0,null,12.0],\"apparent_temperature_mean\":[9,9,9],"
                + "\"precipitation_sum\":[null,1.5,0],\"wind_speed_10m_mean\":[5,5,5],"
                + "\"relative_humidity_2m_mean\":[60,60,60],\"surface_pressure_mean\":[1010,1010,1010],"
                + "\"snowfall_sum\":[0,0,0],\"weather_code\":[1,2,null]}}";
        server.expect(requestTo(containsString("past_days=90")))
                .andExpect(requestTo(containsString("forecast_days=1")))
                .andExpect(requestTo(containsString("daily=temperature_2m_mean")))
                .andRespond(withSuccess(daily, MediaType.APPLICATION_JSON));

        List<DailyObservation> days = provider.fetchDaily(List.of(TWO.get(0)), DataCategory.HISTORICAL).get("lisbon");

        assertThat(days).hasSize(3);
        assertThat(days.get(0).date()).isEqualTo(LocalDate.of(2026, 6, 13));
        assertThat(days.get(1).values().temperature()).isEqualTo(10.0);   // gap bridged with previous value
        assertThat(days.get(0).values().precipitation()).isZero();         // missing sum means no precipitation
        assertThat(days.get(2).values().weatherCode()).isZero();
    }

    @Test
    void httpErrorsBecomeProviderExceptions() {
        server.expect(requestTo(containsString("/v1/forecast"))).andRespond(withServerError());
        assertThatThrownBy(() -> provider.fetchCurrent(TWO)).isInstanceOf(WeatherProviderException.class);
    }

    @Test
    void wrongNumberOfResultsIsRejected() {
        server.expect(requestTo(containsString("/v1/forecast")))
                .andRespond(withSuccess("[" + current(1) + "]", MediaType.APPLICATION_JSON));
        assertThatThrownBy(() -> provider.fetchCurrent(TWO)).isInstanceOf(WeatherProviderException.class);
    }

    @Test
    void currentIsNotADailyCategory() {
        assertThatThrownBy(() -> provider.fetchDaily(TWO, DataCategory.CURRENT)).isInstanceOf(IllegalArgumentException.class);
    }
}
