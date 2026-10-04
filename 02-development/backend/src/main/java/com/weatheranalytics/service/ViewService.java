package com.weatheranalytics.service;

import com.weatheranalytics.api.dto.DashboardSettings;
import com.weatheranalytics.api.dto.PersonalDashboard;
import com.weatheranalytics.api.dto.SavedView;
import com.weatheranalytics.api.dto.ViewConfig;
import com.weatheranalytics.api.dto.ViewCreate;
import com.weatheranalytics.api.dto.ViewPatch;
import com.weatheranalytics.api.error.ApiException;
import com.weatheranalytics.api.mapper.ViewMapper;
import com.weatheranalytics.config.AppClock;
import com.weatheranalytics.config.AppProperties;
import com.weatheranalytics.domain.ChartType;
import com.weatheranalytics.domain.Metric;
import com.weatheranalytics.domain.PeriodRange;
import com.weatheranalytics.domain.Visibility;
import com.weatheranalytics.entity.ViewEntity;
import com.weatheranalytics.repository.ViewRepository;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Saved views. Views are mutable configuration; analysis runs only ever copy a view's configuration, so editing
 * or deleting a view can never affect stored runs.
 */
@Service
public class ViewService {

    static final String DEFAULT_NAME = "Untitled view";
    private static final int DEFAULT_DASHBOARD_MAX_CITIES = 5;

    private final ViewRepository views;
    private final CityService cityService;
    private final SavedCityService savedCityService;
    private final AppProperties properties;
    private final AppClock clock;

    public ViewService(ViewRepository views, CityService cityService, SavedCityService savedCityService,
                       AppProperties properties, AppClock clock) {
        this.views = views;
        this.cityService = cityService;
        this.savedCityService = savedCityService;
        this.properties = properties;
        this.clock = clock;
    }

    @Transactional
    public SavedView create(String userId, ViewCreate request) {
        ViewConfig config = request.toConfig().normalized();
        cityService.ensureExist(config.cityIds());
        ViewEntity entity = new ViewEntity(UUID.randomUUID().toString(), userId, displayName(request.name()),
                request.visibility(), config.cityIds(), config.period(), config.metrics(),
                config.dashboard().chartType(), config.dashboard().showTable(), config.dashboard().showInsights(),
                clock.now());
        return ViewMapper.toDto(views.save(entity));
    }

    @Transactional(readOnly = true)
    public List<SavedView> list(String userId) {
        return views.findByOwnerIdOrderByUpdatedAtDesc(userId).stream().map(ViewMapper::toDto).toList();
    }

    /**
     * Public views are readable by anyone; private views only by their owner. Everyone else gets NOT_FOUND so the
     * existence of private views is not revealed.
     */
    @Transactional(readOnly = true)
    public SavedView get(String viewId, String requesterId) {
        ViewEntity view = views.findById(viewId).orElseThrow(() -> notFound(viewId));
        boolean owner = view.getOwnerId().equals(requesterId);
        if (!owner && view.getVisibility() != Visibility.PUBLIC) {
            throw notFound(viewId);
        }
        return ViewMapper.toDto(view);
    }

    @Transactional
    public SavedView update(String userId, String viewId, ViewPatch patch) {
        ViewEntity view = requireOwned(viewId, userId);
        if (patch.isEmpty()) {
            return ViewMapper.toDto(view);
        }
        if (patch.name() != null) {
            view.setName(displayName(patch.name()));
        }
        if (patch.visibility() != null) {
            view.setVisibility(patch.visibility());
        }
        if (patch.cityIds() != null) {
            List<String> ids = List.copyOf(new LinkedHashSet<>(patch.cityIds().stream().map(String::trim).toList()));
            cityService.ensureExist(ids);
            view.setCityIds(ids);
        }
        if (patch.period() != null) {
            view.setPeriod(patch.period());
        }
        if (patch.metrics() != null) {
            view.setMetrics(List.copyOf(new LinkedHashSet<>(patch.metrics())));
        }
        if (patch.dashboard() != null) {
            DashboardSettings d = patch.dashboard();
            view.setDashboard(d.chartType(), d.showTable(), d.showInsights());
        }
        view.setUpdatedAt(clock.now());
        return ViewMapper.toDto(views.save(view));
    }

    @Transactional
    public void delete(String userId, String viewId) {
        views.delete(requireOwned(viewId, userId));
    }

    /**
     * The user's most recently updated view, or - when there is none - a default configuration (built from the
     * user's saved cities when available). The default is not persisted.
     */
    @Transactional(readOnly = true)
    public PersonalDashboard personalDashboard(String userId) {
        return views.findFirstByOwnerIdOrderByUpdatedAtDesc(userId)
                .map(view -> PersonalDashboard.saved(ViewMapper.toDto(view)))
                .orElseGet(() -> PersonalDashboard.defaultConfig(defaultConfig(userId)));
    }

    private ViewConfig defaultConfig(String userId) {
        List<String> cityIds = savedCityService.list(userId).stream()
                .map(c -> c.id()).limit(DEFAULT_DASHBOARD_MAX_CITIES).toList();
        if (cityIds.isEmpty()) {
            cityIds = cityService.filterExisting(properties.dashboard().defaultCityIds());
        }
        if (cityIds.isEmpty()) {
            cityIds = cityService.mapCities().stream().map(c -> c.id()).limit(3).toList();
        }
        return new ViewConfig(cityIds, PeriodRange.LAST7, List.of(Metric.TEMPERATURE, Metric.PRECIPITATION),
                new DashboardSettings(ChartType.LINE, true, true));
    }

    /**
     * Owner-only access. A private view of somebody else is NOT_FOUND (not revealed);
     * a public view of somebody else is FORBIDDEN (it is visible, but not yours to change).
     */
    private ViewEntity requireOwned(String viewId, String userId) {
        ViewEntity view = views.findById(viewId).orElseThrow(() -> notFound(viewId));
        if (view.getOwnerId().equals(userId)) {
            return view;
        }
        if (view.getVisibility() == Visibility.PUBLIC) {
            throw ApiException.forbidden("Only the owner can modify this view");
        }
        throw notFound(viewId);
    }

    private static String displayName(String name) {
        return name == null || name.isBlank() ? DEFAULT_NAME : name.trim();
    }

    private static ApiException notFound(String viewId) {
        return ApiException.notFound("View not found: " + viewId);
    }
}
