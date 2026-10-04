package com.weatheranalytics.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.weatheranalytics.support.ApiTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;

/** Own Spring context (hence own database) with a long minimum age for the "current" category. */
@TestPropertySource(properties = "app.weather.min-age.current=PT1H")
class WeatherCachingTest extends ApiTestSupport {

    @Test
    void seriesIsFetchedOnceAndThenServedFromTheDatabase() throws Exception {
        for (int i = 0; i < 3; i++) {
            mvc.perform(get("/api/weather/series").param("cityIds", "tokyo,seoul").param("period", "last30"))
                    .andExpect(status().isOk());
        }
        assertThat(provider.dailyCalls.get()).isEqualTo(1);
        // the 7-day window is a subset of the cached 90 days
        mvc.perform(get("/api/weather/series").param("cityIds", "tokyo").param("period", "last7")).andExpect(status().isOk());
        assertThat(provider.dailyCalls.get()).isEqualTo(1);
    }

    @Test
    void refreshWithinMinimumAgeUsesCacheAndSaysSo() throws Exception {
        mvc.perform(post("/api/weather/refresh/current")).andExpect(status().isOk())
                .andExpect(jsonPath("$.fetchedFromSource").value(true));
        mvc.perform(post("/api/weather/refresh/current")).andExpect(status().isOk())
                .andExpect(jsonPath("$.fetchedFromSource").value(false));
        assertThat(provider.currentCalls.get()).isEqualTo(1);
    }

    @Test
    void missingDataWithUpstreamDownIsBadGateway() throws Exception {
        provider.failing = true;
        mvc.perform(get("/api/weather/series").param("cityIds", "reykjavik").param("period", "last7"))
                .andExpect(status().isBadGateway()).andExpect(jsonPath("$.code").value("UPSTREAM"));
    }
}
