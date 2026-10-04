package com.weatheranalytics.api.controller;

import com.weatheranalytics.api.dto.City;
import com.weatheranalytics.security.AuthenticatedUser;
import com.weatheranalytics.service.SavedCityService;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/saved-cities")
public class SavedCityController {

    private final SavedCityService savedCityService;

    public SavedCityController(SavedCityService savedCityService) {
        this.savedCityService = savedCityService;
    }

    @GetMapping
    public List<City> list(@AuthenticationPrincipal AuthenticatedUser user) {
        return savedCityService.list(user.id());
    }

    @PutMapping("/{cityId}")
    public List<City> add(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String cityId) {
        return savedCityService.add(user.id(), cityId);
    }

    @DeleteMapping("/{cityId}")
    public List<City> remove(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String cityId) {
        return savedCityService.remove(user.id(), cityId);
    }
}
