package com.weatheranalytics.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.weatheranalytics.support.ApiTestSupport;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

class ViewAndSavedCityApiTest extends ApiTestSupport {

    private String createView(Account owner, String name, String visibility) throws Exception {
        return read(mvc.perform(auth(post("/api/views"), owner).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(viewBody(name, visibility, List.of("lisbon", "london")))))
                .andExpect(status().isCreated()).andReturn()).get("id").asText();
    }

    @Test
    void createReturnsFullViewAndBlankNameBecomesUntitled() throws Exception {
        Account me = register();
        mvc.perform(auth(post("/api/views"), me).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(viewBody("   ", "private", List.of("lisbon")))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Untitled view"))
                .andExpect(jsonPath("$.ownerId").value(me.id()))
                .andExpect(jsonPath("$.period").value("last7"))
                .andExpect(jsonPath("$.metrics[1]").value("precipitation"))
                .andExpect(jsonPath("$.dashboard.chartType").value("line"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    void createValidatesBodyAndCities() throws Exception {
        Account me = register();
        mvc.perform(auth(post("/api/views"), me).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(viewBody("x", "private", List.of("atlantis")))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.code").value("VALIDATION"));
        mvc.perform(auth(post("/api/views"), me).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"x\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(auth(post("/api/views"), me).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"x\",\"visibility\":\"secret\"}")).andExpect(status().isBadRequest());
    }

    @Test
    void visibilityRulesForReading() throws Exception {
        Account owner = register();
        Account other = register();
        String pub = createView(owner, "Public", "public");
        String priv = createView(owner, "Private", "private");

        mvc.perform(get("/api/views/" + pub)).andExpect(status().isOk());                       // anonymous, public
        mvc.perform(auth(get("/api/views/" + pub), other)).andExpect(status().isOk());
        mvc.perform(get("/api/views/" + priv)).andExpect(status().isNotFound());               // anonymous, private
        mvc.perform(auth(get("/api/views/" + priv), other)).andExpect(status().isNotFound());  // other user, private
        mvc.perform(auth(get("/api/views/" + priv), owner)).andExpect(status().isOk());
        mvc.perform(get("/api/views/nope")).andExpect(status().isNotFound());
    }

    @Test
    void listContainsOnlyOwnViewsNewestUpdatedFirst() throws Exception {
        Account owner = register();
        Account other = register();
        String first = createView(owner, "First", "private");
        String second = createView(owner, "Second", "private");
        createView(other, "Not mine", "public");

        JsonNode list = read(mvc.perform(auth(get("/api/views"), owner)).andReturn());
        assertThat(list).hasSize(2);
        assertThat(list.get(0).get("id").asText()).isEqualTo(second);

        mvc.perform(auth(patch("/api/views/" + first), owner).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Renamed\"}"))
                .andExpect(status().isOk());
        list = read(mvc.perform(auth(get("/api/views"), owner)).andReturn());
        assertThat(list.get(0).get("id").asText()).isEqualTo(first);
    }

    @Test
    void ownerCanPatchPartiallyAndConfigStaysValid() throws Exception {
        Account owner = register();
        String id = createView(owner, "Before", "private");
        mvc.perform(auth(patch("/api/views/" + id), owner).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"After\",\"visibility\":\"public\",\"period\":\"last30\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("After"))
                .andExpect(jsonPath("$.visibility").value("public")).andExpect(jsonPath("$.period").value("last30"))
                .andExpect(jsonPath("$.cityIds[0]").value("lisbon"));          // untouched fields preserved
        mvc.perform(auth(patch("/api/views/" + id), owner).contentType(MediaType.APPLICATION_JSON).content("{\"cityIds\":[]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(auth(patch("/api/views/" + id), owner).contentType(MediaType.APPLICATION_JSON).content("{\"metrics\":[]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(auth(patch("/api/views/" + id), owner).contentType(MediaType.APPLICATION_JSON).content("{\"cityIds\":[\"atlantis\"]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void nonOwnersCannotModifyOrDelete() throws Exception {
        Account owner = register();
        Account other = register();
        String pub = createView(owner, "Public", "public");
        String priv = createView(owner, "Private", "private");

        mvc.perform(auth(patch("/api/views/" + pub), other).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"hack\"}"))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.code").value("FORBIDDEN"));
        mvc.perform(auth(delete("/api/views/" + pub), other)).andExpect(status().isForbidden());
        mvc.perform(auth(patch("/api/views/" + priv), other).contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"hack\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(auth(delete("/api/views/" + priv), other)).andExpect(status().isNotFound());
        mvc.perform(patch("/api/views/" + pub).contentType(MediaType.APPLICATION_JSON).content("{}")).andExpect(status().isUnauthorized());

        mvc.perform(auth(get("/api/views/" + pub), owner)).andExpect(jsonPath("$.name").value("Public"));
    }

    @Test
    void ownerCanDelete() throws Exception {
        Account owner = register();
        String id = createView(owner, "Temp", "public");
        mvc.perform(auth(delete("/api/views/" + id), owner)).andExpect(status().isNoContent());
        mvc.perform(get("/api/views/" + id)).andExpect(status().isNotFound());
        mvc.perform(auth(delete("/api/views/" + id), owner)).andExpect(status().isNotFound());
    }

    @Test
    void personalDashboardIsDefaultThenLastUpdatedView() throws Exception {
        Account me = register();
        mvc.perform(auth(get("/api/personal-dashboard"), me)).andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("default"))
                .andExpect(jsonPath("$.config.cityIds.length()").value(3))   // configured defaults
                .andExpect(jsonPath("$.view").doesNotExist());

        mvc.perform(auth(put("/api/saved-cities/tokyo"), me)).andExpect(status().isOk());
        mvc.perform(auth(get("/api/personal-dashboard"), me))
                .andExpect(jsonPath("$.config.cityIds[0]").value("tokyo"));  // built from saved cities

        createView(me, "Older", "private");
        String newer = createView(me, "Newer", "private");
        mvc.perform(auth(get("/api/personal-dashboard"), me))
                .andExpect(jsonPath("$.source").value("saved")).andExpect(jsonPath("$.view.id").value(newer));
    }

    @Test
    void savedCitiesAreIdempotentOrderedAndPerUser() throws Exception {
        Account me = register();
        Account other = register();
        mvc.perform(auth(put("/api/saved-cities/paris"), me)).andExpect(status().isOk());
        mvc.perform(auth(put("/api/saved-cities/rome"), me)).andExpect(status().isOk());
        mvc.perform(auth(put("/api/saved-cities/paris"), me)).andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].id").value("paris")).andExpect(jsonPath("$[1].id").value("rome"));
        mvc.perform(auth(put("/api/saved-cities/atlantis"), me)).andExpect(status().isNotFound());

        mvc.perform(auth(get("/api/saved-cities"), other)).andExpect(jsonPath("$.length()").value(0));

        mvc.perform(auth(delete("/api/saved-cities/paris"), me)).andExpect(jsonPath("$.length()").value(1));
        mvc.perform(auth(delete("/api/saved-cities/paris"), me)).andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("rome"));
    }
}
