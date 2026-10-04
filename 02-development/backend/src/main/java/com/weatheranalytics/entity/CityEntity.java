package com.weatheranalytics.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "cities")
public class CityEntity extends BaseEntity {

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "country", nullable = false)
    private String country;

    @Column(name = "lat", nullable = false)
    private double lat;

    @Column(name = "lon", nullable = false)
    private double lon;

    @Column(name = "on_map", nullable = false)
    private boolean onMap;

    protected CityEntity() {
    }

    public CityEntity(String id, String name, String country, double lat, double lon, boolean onMap) {
        super(id);
        this.name = name;
        this.country = country;
        this.lat = lat;
        this.lon = lon;
        this.onMap = onMap;
    }

    public String getName() {
        return name;
    }

    public String getCountry() {
        return country;
    }

    public double getLat() {
        return lat;
    }

    public double getLon() {
        return lon;
    }

    public boolean isOnMap() {
        return onMap;
    }
}
