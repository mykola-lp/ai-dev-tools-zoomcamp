package com.weatheranalytics.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.weatheranalytics.support.ApiTestSupport;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class AnalyticsAndHistoryApiTest extends ApiTestSupport {

    private String body(List<String> cities, String period, List<String> metrics) throws Exception {
        return json.writeValueAsString(configBody(cities, period, metrics));
    }

    @Test
    void anonymousUsersCanAnalyzeWithoutPersisting() throws Exception {
        mvc.perform(post("/api/analytics/analyze").contentType(MediaType.APPLICATION_JSON)
                .content(body(List.of("lisbon", "london"), "last7", List.of("temperature", "precipitation"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aggregates.length()").value(4))
                .andExpect(jsonPath("$.aggregates[0].sum").doesNotExist())   // null for temperature
                .andExpect(jsonPath("$.aggregates[1].sum").isNumber())       // precipitation total
                .andExpect(jsonPath("$.trends.length()").value(4))
                .andExpect(jsonPath("$.insights").isNotEmpty());
    }

    @Test
    void analyzeValidatesInput() throws Exception {
        mvc.perform(post("/api/analytics/analyze").contentType(MediaType.APPLICATION_JSON)
                .content(body(List.of(), "last7", List.of("temperature")))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/analytics/analyze").contentType(MediaType.APPLICATION_JSON)
                .content(body(List.of("lisbon"), "last7", List.of("sunshine")))).andExpect(status().isBadRequest());
        mvc.perform(post("/api/analytics/analyze").contentType(MediaType.APPLICATION_JSON)
                .content(body(List.of("atlantis"), "last7", List.of("temperature")))).andExpect(status().isNotFound());
    }

    @Test
    void upstreamOutageDoesNotBreakAnalysisOfCachedData() throws Exception {
        mvc.perform(post("/api/analytics/analyze").contentType(MediaType.APPLICATION_JSON)
                .content(body(List.of("paris"), "last7", List.of("temperature")))).andExpect(status().isOk());
        provider.failing = true;
        mvc.perform(post("/api/analytics/analyze").contentType(MediaType.APPLICATION_JSON)
                .content(body(List.of("paris"), "last7", List.of("temperature")))).andExpect(status().isOk());
    }

    @Test
    void runsAreCreatedPerUserSnapshotsNewestFirst() throws Exception {
        Account me = register();
        Account other = register();
        String first = createRun(me, List.of("lisbon"));
        String second = createRun(me, List.of("london"));
        assertThat(first).isNotEqualTo(second);

        JsonNode list = read(mvc.perform(auth(get("/api/history/runs"), me)).andReturn());
        assertThat(list).hasSize(2);
        assertThat(list.get(0).get("id").asText()).isEqualTo(second);
        assertThat(list.get(0).get("cities").get(0).get("name").asText()).isEqualTo("London");
        assertThat(list.get(0).get("dataVersion").asText()).startsWith("historical@v");
        assertThat(list.get(0).get("userId").asText()).isEqualTo(me.id());

        mvc.perform(auth(get("/api/history/runs/" + first), me)).andExpect(status().isOk());
        mvc.perform(auth(get("/api/history/runs/" + first), other)).andExpect(status().isNotFound());
        mvc.perform(auth(get("/api/history/runs"), other)).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(auth(get("/api/history/runs/missing"), me)).andExpect(status().isNotFound());
    }

    @Test
    void runCreationValidatesAndRequiresExistingCities() throws Exception {
        Account me = register();
        mvc.perform(auth(post("/api/history/runs"), me).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        mvc.perform(auth(post("/api/history/runs"), me).contentType(MediaType.APPLICATION_JSON)
                .content(body(List.of("atlantis"), "last7", List.of("temperature")))).andExpect(status().isNotFound());
    }

    private String createRun(Account who, List<String> cities) throws Exception {
        return read(mvc.perform(auth(post("/api/history/runs"), who).contentType(MediaType.APPLICATION_JSON)
                .content(body(cities, "last7", List.of("temperature"))))
                .andExpect(status().isCreated()).andReturn()).get("id").asText();
    }
}
