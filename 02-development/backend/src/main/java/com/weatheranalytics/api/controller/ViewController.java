package com.weatheranalytics.api.controller;

import com.weatheranalytics.api.dto.PersonalDashboard;
import com.weatheranalytics.api.dto.SavedView;
import com.weatheranalytics.api.dto.ViewCreate;
import com.weatheranalytics.api.dto.ViewPatch;
import com.weatheranalytics.security.AuthenticatedUser;
import com.weatheranalytics.service.ViewService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestMapping;

@RestController
@RequestMapping
public class ViewController {

    private final ViewService viewService;

    public ViewController(ViewService viewService) {
        this.viewService = viewService;
    }

    @GetMapping("/views")
    public List<SavedView> list(@AuthenticationPrincipal AuthenticatedUser user) {
        return viewService.list(user.id());
    }

    @PostMapping("/views")
    @ResponseStatus(HttpStatus.CREATED)
    public SavedView create(@AuthenticationPrincipal AuthenticatedUser user, @Valid @RequestBody ViewCreate request) {
        return viewService.create(user.id(), request);
    }

    /** Authentication is optional here; user is null for anonymous callers. */
    @GetMapping("/views/{viewId}")
    public SavedView get(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String viewId) {
        return viewService.get(viewId, user == null ? null : user.id());
    }

    @PatchMapping("/views/{viewId}")
    public SavedView update(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String viewId,
                            @Valid @RequestBody ViewPatch patch) {
        return viewService.update(user.id(), viewId, patch);
    }

    @DeleteMapping("/views/{viewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@AuthenticationPrincipal AuthenticatedUser user, @PathVariable String viewId) {
        viewService.delete(user.id(), viewId);
    }

    @GetMapping("/personal-dashboard")
    public PersonalDashboard personalDashboard(@AuthenticationPrincipal AuthenticatedUser user) {
        return viewService.personalDashboard(user.id());
    }
}
