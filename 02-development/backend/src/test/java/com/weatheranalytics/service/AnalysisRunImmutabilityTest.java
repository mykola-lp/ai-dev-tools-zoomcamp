package com.weatheranalytics.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.weatheranalytics.entity.AnalysisRunEntity;
import com.weatheranalytics.repository.AnalysisRunRepository;
import com.weatheranalytics.support.ApiTestSupport;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class AnalysisRunImmutabilityTest extends ApiTestSupport {

    @Test
    void editingTheViewOrRefreshingWeatherNeverChangesAStoredRun() throws Exception {
        Account me = register();
        String viewId = read(mvc.perform(auth(post("/api/views"), me).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(viewBody("Original", "private", List.of("lisbon", "london")))))
                .andExpect(status().isCreated()).andReturn()).get("id").asText();

        JsonNode run = read(mvc.perform(auth(post("/api/history/runs"), me).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(configBody(List.of("lisbon", "london"), "last7", List.of("temperature")))))
                .andExpect(status().isCreated()).andReturn());
        String runId = run.get("id").asText();

        // 1) edit the view
        mvc.perform(auth(patch("/api/views/" + viewId), me).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Changed\",\"cityIds\":[\"kyiv\"],\"metrics\":[\"windSpeed\"],\"period\":\"last30\"}"))
                .andExpect(status().isOk());
        // 2) upstream data changes and is refreshed
        provider.offset = 15;
        mvc.perform(post("/api/weather/refresh/historical")).andExpect(status().isOk());

        JsonNode after = read(mvc.perform(auth(get("/api/history/runs/" + runId), me))
                .andExpect(status().isOk()).andReturn());
        assertThat(after).isEqualTo(run);

        // a new run reflects the new data and does not replace the old one
        JsonNode newer = read(mvc.perform(auth(post("/api/history/runs"), me).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(configBody(List.of("lisbon", "london"), "last7", List.of("temperature")))))
                .andExpect(status().isCreated()).andReturn());
        assertThat(newer.get("id")).isNotEqualTo(run.get("id"));
        assertThat(newer.get("dataVersion")).isNotEqualTo(run.get("dataVersion"));
        assertThat(newer.get("result").get("aggregates").get(0).get("avg"))
                .isNotEqualTo(run.get("result").get("aggregates").get(0).get("avg"));
        assertThat(read(mvc.perform(auth(get("/api/history/runs"), me)).andReturn())).hasSize(2);
    }

    @Test
    void runEntityAndRepositoryExposeNoMutation() {
        assertThat(AnalysisRunEntity.class.isAnnotationPresent(org.hibernate.annotations.Immutable.class)).isTrue();
        assertThat(Arrays.stream(AnalysisRunEntity.class.getMethods()).map(Method::getName))
                .noneMatch(n -> n.startsWith("set") || n.startsWith("update"));
        assertThat(Arrays.stream(AnalysisRunRepository.class.getMethods()).map(Method::getName))
                .noneMatch(n -> n.startsWith("delete") || n.startsWith("update"));
    }
}
