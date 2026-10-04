package com.weatheranalytics.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/** Discriminated by `source`: "saved" carries `view`, "default" carries `config`. */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record PersonalDashboard(String source, SavedView view, ViewConfig config) {

    public static PersonalDashboard saved(SavedView view) {
        return new PersonalDashboard("saved", view, null);
    }

    public static PersonalDashboard defaultConfig(ViewConfig config) {
        return new PersonalDashboard("default", null, config);
    }
}
