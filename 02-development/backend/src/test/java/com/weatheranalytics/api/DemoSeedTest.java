package com.weatheranalytics.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.weatheranalytics.support.ApiTestSupport;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;

@TestPropertySource(properties = "app.seed.enabled=true")
class DemoSeedTest extends ApiTestSupport {

    @Test
    void freshDatabaseHasDemoAccountWithViewsRunsAndOfflineWeather() throws Exception {
        String token = read(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", "demo@example.com", "password", "demo1234"))))
                .andExpect(status().isOk()).andReturn()).get("token").asText();
        Account demo = new Account("", "demo@example.com", token);

        mvc.perform(auth(get("/api/saved-cities"), demo)).andExpect(jsonPath("$.length()").value(3));
        mvc.perform(auth(get("/api/views"), demo)).andExpect(jsonPath("$.length()").value(3));
        mvc.perform(auth(get("/api/history/runs"), demo)).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(auth(get("/api/personal-dashboard"), demo)).andExpect(jsonPath("$.source").value("saved"));

        // seeded weather is served without any upstream call
        mvc.perform(get("/api/weather/series").param("cityIds", "tokyo").param("period", "last90")).andExpect(status().isOk());
        mvc.perform(get("/api/weather/series").param("cityIds", "tokyo").param("period", "next14")).andExpect(status().isOk());
        mvc.perform(get("/api/weather/current").param("cityIds", "tokyo")).andExpect(status().isOk());
        assertThat(provider.dailyCalls.get() + provider.currentCalls.get()).isZero();
    }
}
