package com.weatheranalytics;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class WeatherAnalyticsApplication {

    public static void main(String[] args) {
        SpringApplication.run(WeatherAnalyticsApplication.class, args);
    }
}
