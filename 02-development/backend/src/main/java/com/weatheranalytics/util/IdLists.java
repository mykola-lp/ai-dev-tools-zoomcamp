package com.weatheranalytics.util;

import com.weatheranalytics.api.error.ApiException;
import java.util.LinkedHashSet;
import java.util.List;

public final class IdLists {

    private IdLists() {
    }

    /** Trims, drops blanks and duplicates (keeping first-seen order). Fails with VALIDATION when nothing is left. */
    public static List<String> normalize(List<String> raw, String parameterName) {
        LinkedHashSet<String> ids = new LinkedHashSet<>();
        if (raw != null) {
            raw.stream().filter(id -> id != null && !id.isBlank()).map(String::trim).forEach(ids::add);
        }
        if (ids.isEmpty()) {
            throw ApiException.validation("'" + parameterName + "' must contain at least one id");
        }
        return List.copyOf(ids);
    }
}
