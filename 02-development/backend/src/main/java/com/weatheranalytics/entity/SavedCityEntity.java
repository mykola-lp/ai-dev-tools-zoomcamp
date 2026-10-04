package com.weatheranalytics.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "saved_cities")
public class SavedCityEntity extends BaseEntity {

    @Column(name = "user_id", nullable = false, updatable = false)
    private String userId;

    @Column(name = "city_id", nullable = false, updatable = false)
    private String cityId;

    @Column(name = "position", nullable = false)
    private int position;

    protected SavedCityEntity() {
    }

    public SavedCityEntity(String id, String userId, String cityId, int position) {
        super(id);
        this.userId = userId;
        this.cityId = cityId;
        this.position = position;
    }

    public String getUserId() {
        return userId;
    }

    public String getCityId() {
        return cityId;
    }

    public int getPosition() {
        return position;
    }
}
