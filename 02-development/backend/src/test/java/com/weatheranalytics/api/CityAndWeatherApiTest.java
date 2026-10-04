package com.weatheranalytics.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.weatheranalytics.support.ApiTestSupport;
import java.time.LocalDate;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class CityAndWeatherApiTest extends ApiTestSupport {

    @Test
    void searchMatchesNameAndCountryAndCapsAtEight() throws Exception {
        mvc.perform(get("/api/cities").param("q", "lis")).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("lisbon"));
        mvc.perform(get("/api/cities").param("q", "ukraine")).andExpect(jsonPath("$.length()").value(2));
        assertThat(read(mvc.perform(get("/api/cities").param("q", "o")).andReturn()).size()).isEqualTo(8);
    }

    @Test
    void blankSearchReturnsEmptyList() throws Exception {
        mvc.perform(get("/api/cities").param("q", "  ")).andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/cities")).andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION"));
    }

    @Test
    void mapCitiesAreASubsetOfAllCities() throws Exception {
        JsonNode map = read(mvc.perform(get("/api/cities/map")).andExpect(status().isOk()).andReturn());
        assertThat(map.size()).isBetween(10, 40);
    }

    @Test
    void lookupPreservesRequestedOrderAndRejectsUnknownIds() throws Exception {
        mvc.perform(get("/api/cities/lookup").param("ids", "london,lisbon"))
                .andExpect(jsonPath("$[0].id").value("london")).andExpect(jsonPath("$[1].id").value("lisbon"));
        mvc.perform(get("/api/cities/lookup").param("ids", "lisbon,atlantis"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.code").value("NOT_FOUND"));
    }

    @Test
    void historicalSeriesEndsYesterdayWithExactlyThePeriodLength() throws Exception {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        JsonNode body = read(mvc.perform(get("/api/weather/series").param("cityIds", "lisbon,london").param("period", "last7"))
                .andExpect(status().isOk()).andReturn());
        assertThat(body).hasSize(2);
        JsonNode points = body.get(0).get("points");
        assertThat(points).hasSize(7);
        assertThat(points.get(0).get("date").asText()).isEqualTo(today.minusDays(7).toString());
        assertThat(points.get(6).get("date").asText()).isEqualTo(today.minusDays(1).toString());
        assertThat(points.get(0).get("values").has("weatherCode")).isTrue();
    }

    @Test
    void forecastSeriesStartsTomorrow() throws Exception {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        JsonNode points = read(mvc.perform(get("/api/weather/series").param("cityIds", "kyiv").param("period", "next14"))
                .andExpect(status().isOk()).andReturn()).get(0).get("points");
        assertThat(points).hasSize(14);
        assertThat(points.get(0).get("date").asText()).isEqualTo(today.plusDays(1).toString());
    }

    @Test
    void seriesValidatesPeriodAndCities() throws Exception {
        mvc.perform(get("/api/weather/series").param("cityIds", "lisbon").param("period", "last3"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION"));
        mvc.perform(get("/api/weather/series").param("cityIds", "atlantis").param("period", "last7"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/weather/series").param("period", "last7")).andExpect(status().isBadRequest());
    }

    @Test
    void currentWeatherReturnsOneEntryPerCityInOrder() throws Exception {
        mvc.perform(get("/api/weather/current").param("cityIds", "paris,rome"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].cityId").value("paris")).andExpect(jsonPath("$[1].cityId").value("rome"))
                .andExpect(jsonPath("$[0].values.temperature").isNumber())
                .andExpect(jsonPath("$[0].observedAt").isNotEmpty());
    }

    @Test
    void freshnessAlwaysListsThreeCategories() throws Exception {
        mvc.perform(get("/api/weather/freshness")).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].category").value("current"))
                .andExpect(jsonPath("$[1].category").value("forecast"))
                .andExpect(jsonPath("$[2].category").value("historical"));
    }

    @Test
    void refreshReportsSourceAndMapsUpstreamFailureTo502() throws Exception {
        mvc.perform(post("/api/weather/refresh/forecast")).andExpect(status().isOk())
                .andExpect(jsonPath("$.category").value("forecast")).andExpect(jsonPath("$.fetchedFromSource").value(true));
        provider.failing = true;
        mvc.perform(post("/api/weather/refresh/forecast")).andExpect(status().isBadGateway())
                .andExpect(jsonPath("$.code").value("UPSTREAM"));
        mvc.perform(post("/api/weather/refresh/bogus")).andExpect(status().isBadRequest());
    }
}
