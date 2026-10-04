package com.weatheranalytics.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Import(StubWeatherConfig.class)
public abstract class ApiTestSupport {

    public record Account(String id, String email, String token) {
    }

    @Autowired
    protected MockMvc mvc;
    @Autowired
    protected ObjectMapper json;
    @Autowired
    protected StubWeatherProvider provider;

    @BeforeEach
    void resetStub() {
        provider.reset();
    }

    protected Account register() throws Exception {
        String email = "user-" + UUID.randomUUID() + "@example.com";
        MvcResult result = mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(Map.of("email", email, "password", "secret123"))))
                .andReturn();
        JsonNode body = json.readTree(result.getResponse().getContentAsString());
        return new Account(body.get("id").asText(), email, body.get("token").asText());
    }

    protected static MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder builder, Account account) {
        return builder.header("Authorization", "Bearer " + account.token());
    }

    protected Map<String, Object> viewBody(String name, String visibility, List<String> cityIds) {
        return Map.of("name", name, "visibility", visibility, "cityIds", cityIds, "period", "last7",
                "metrics", List.of("temperature", "precipitation"),
                "dashboard", Map.of("chartType", "line", "showTable", true, "showInsights", true));
    }

    protected Map<String, Object> configBody(List<String> cityIds, String period, List<String> metrics) {
        return Map.of("cityIds", cityIds, "period", period, "metrics", metrics,
                "dashboard", Map.of("chartType", "line", "showTable", true, "showInsights", true));
    }

    protected JsonNode read(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString());
    }
}
