package com.weatheranalytics.entity;

import com.weatheranalytics.util.Instants;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.time.Instant;

/** Persists instants as fixed-width UTC ISO strings (sortable, independent of the JDBC driver's date handling). */
@Converter
public class InstantStringConverter implements AttributeConverter<Instant, String> {

    @Override
    public String convertToDatabaseColumn(Instant attribute) {
        return attribute == null ? null : Instants.toStorage(attribute);
    }

    @Override
    public Instant convertToEntityAttribute(String dbData) {
        return dbData == null ? null : Instants.fromStorage(dbData);
    }
}
