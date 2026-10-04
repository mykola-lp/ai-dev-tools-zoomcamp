package com.weatheranalytics.domain;

/** An enum whose wire representation (JSON / query parameter) differs from its Java constant name. */
public interface ApiEnum {
    String value();
}
