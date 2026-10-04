package com.weatheranalytics.api.controller;

import com.weatheranalytics.api.dto.City;
import com.weatheranalytics.service.CityService;
import com.weatheranalytics.util.IdLists;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/cities")
public class CityController {

    private final CityService cityService;

    public CityController(CityService cityService) {
        this.cityService = cityService;
    }

    @GetMapping
    public List<City> search(@RequestParam("q") String q) {
        return cityService.search(q);
    }

    @GetMapping("/map")
    public List<City> mapCities() {
        return cityService.mapCities();
    }

    @GetMapping("/lookup")
    public List<City> lookup(@RequestParam("ids") List<String> ids) {
        return cityService.requireAll(IdLists.normalize(ids, "ids"));
    }
}
