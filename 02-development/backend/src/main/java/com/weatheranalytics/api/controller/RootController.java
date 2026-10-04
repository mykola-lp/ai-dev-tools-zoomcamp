package com.weatheranalytics.api.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootController {

    /** Convenience: GET /api opens the API documentation. */
    @GetMapping({"", "/"})
    public ResponseEntity<Void> root() {
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, "/swagger-ui.html")
                .build();
    }
}
