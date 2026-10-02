# Weather Analytics Dashboard — Product Specification

## 1. Product Overview

The product is a public weather analytics dashboard for collecting, analyzing, comparing, and visualizing weather data.

The system uses **Open-Meteo** as the initial external weather data provider. Open-Meteo is integrated by the backend and is not exposed as a frontend dependency.

The product supports anonymous exploration and authenticated persistence of personal data and configurations.

The product is designed around a public dashboard, configurable analytical views, city comparison, weather analytics, and persistent analysis history.

---

## 2. Access and User States

### 2.1 Anonymous User

The main dashboard shall be publicly accessible without authentication.

Anonymous users shall be able to:

- search for cities;
- select cities on a map;
- select multiple cities for comparison;
- select a time period and metrics;
- view current weather, forecasts, and historical data;
- view charts, tables, analytics, and textual insights;
- create temporary views;
- manually refresh weather data;
- open public saved views through shared URLs.

Anonymous users shall not be able to persist saved cities, dashboard settings, saved views, or analysis history.

Temporary views created by anonymous users shall not be persisted.

### 2.2 Authenticated User

Authentication shall be required for persistent personal data and configurations.

Authenticated users shall be able to:

- save cities independently of views;
- add and remove saved cities from views;
- create and save views;
- edit their saved views;
- save dashboard settings;
- access their analysis history;
- configure saved views as private or public;
- share public saved views through URLs.

Only the owner of a saved view shall be able to modify it.

### 2.3 First Login and Personal Dashboard

After successful registration or login, an authenticated user shall enter a **personal dashboard**.

For a user who has no saved view yet, the system shall create a **default view** automatically.

The default view shall provide a usable starting point and shall be immediately configurable by the user. The user shall be able to change its cities, period, metrics, and dashboard configuration.

The user shall be able to save the configured default view as their own saved view.

For subsequent sessions, the personal dashboard shall open the user's **last saved view**.

---

## 3. City Selection and Saved Cities

### 3.1 City Selection

Users shall be able to select cities by:

1. searching for a city by name;
2. selecting a city on a map.

Multiple cities shall be supported for comparison.

### 3.2 Saved Cities

Authenticated users shall be able to maintain a separate collection of saved cities.

Saved cities shall be independent from views and reusable across multiple views.

A saved city may be added to or removed from any saved or temporary view available to the user.

---

## 4. Views and Dashboard Configuration

A **view** represents a configured analytical presentation of weather data.

A view shall contain, at minimum:

- selected cities;
- selected time period;
- selected metrics;
- dashboard configuration.

### 4.1 Temporary Views

Anonymous users shall be able to create temporary views for exploration.

Temporary views shall not be persisted.

### 4.2 Saved Views

Authenticated users shall be able to persist views.

A saved view shall have one of two visibility states:

- **private** — accessible only to its owner;
- **public** — accessible through a shareable URL.

Only the owner may modify or delete a saved view.

Changing a saved view shall not modify any previously recorded analysis history.

---

## 5. Weather Data

The product shall support these weather data categories:

- current weather;
- forecast data;
- historical weather data.

The analytics model shall support the following metrics wherever the selected Open-Meteo data is available:

- temperature;
- apparent temperature;
- precipitation;
- wind speed;
- humidity;
- pressure;
- snowfall;
- weather code.

Users shall be able to select the time period and metrics used for an analysis.

The backend shall obtain weather data from Open-Meteo, normalize it into the application's own data model, persist the data, and expose it through the application's API.

Open-Meteo request and response formats shall remain an internal backend concern.

---

## 6. Analytics

The system shall analyze weather data and provide aggregations, anomaly detection, trends, and textual insights.

### 6.1 Aggregations

The system shall calculate applicable aggregate values, including:

- average;
- minimum;
- maximum;
- totals/sums where applicable.

Aggregations shall be calculated for the selected cities, period, and metrics.

### 6.2 Anomaly Detection

Anomalies shall be identified using a **hybrid analytical model** combining:

- historical baselines;
- seasonal and temporal context;
- standard rules specific to each metric.

The implementation shall account for the fact that the same raw value may have different significance depending on season, time period, city, and metric.

The backend shall return structured anomaly results that the frontend can display, including sufficient information to explain the detected anomaly.

A conceptual anomaly result may contain:

```json
{
  "type": "anomaly",
  "metric": "temperature",
  "severity": "high",
  "value": 17,
  "baseline": 10,
  "difference": 7,
  "message": "Temperature is significantly above the historical baseline."
}
```

Exact statistical formulas and thresholds may be refined during implementation, provided they preserve the product-level hybrid model defined here.

### 6.3 Trend Detection

Trends shall be identified using the same hybrid analytical principles:

- historical baselines;
- seasonal and temporal context;
- standard rules specific to each metric.

The backend shall return structured trend results that the frontend can display.

A conceptual trend result may contain:

```json
{
  "metric": "temperature",
  "direction": "up",
  "strength": "moderate",
  "message": "Average temperature shows an increasing trend."
}
```

Exact statistical formulas may be refined during implementation.

### 6.4 Textual Insights

The system shall generate concise textual insights based on calculated analytics.

Insights may describe:

- unusually high or low values;
- deviations from historical baselines;
- notable trends;
- meaningful differences between selected cities.

Textual insights shall be derived from structured analytical results rather than requiring the frontend to calculate analytical conclusions itself.

---

## 7. City Comparison

Users shall be able to compare multiple cities using a configurable set of metrics and a selected period.

A comparison shall provide:

- charts;
- a comparison table;
- automatic insights describing notable differences.

Users shall choose which metrics are included in the comparison.

Comparison analytics shall use the same aggregation, anomaly, trend, and textual-insight mechanisms defined for the general analytics system where applicable.

---

## 8. Analysis History

Analysis history shall consist of **independent, immutable analysis snapshots/runs**.

Each analysis run shall preserve the complete context and calculated results of an analysis at a specific point in time.

Each analysis run shall contain, at minimum:

```text
analysis run
├── cities
├── period
├── metrics
├── data timestamp/version
├── calculated aggregates
├── detected anomalies
├── trends
└── textual insights
```

The stored values and analytical results of an analysis run shall not be recalculated or modified automatically when underlying weather data changes or when a related view is edited.

If a user wants a new result using updated data or different parameters, the system shall create a **new analysis run**.

Editing a saved view shall therefore never modify previously recorded analysis runs.

History is not a list of saved views; saved views and analysis runs are separate domain concepts.

---

## 9. Data Refresh and Freshness

Weather data shall be refreshed automatically by the backend.

The backend shall determine an appropriate refresh policy for each weather data category. Different categories may use different update frequencies.

Users shall be able to manually request a refresh for:

- current weather;
- forecast data;
- historical weather data.

For a manual refresh, the backend shall determine whether a new request to Open-Meteo is necessary or whether sufficiently current cached/persisted data can be used.

The frontend shall expose data freshness and refresh state for each relevant data category. The user interface shall support these states:

- `last updated`;
- `updating`;
- `updated`;
- `failed`.

Exact refresh intervals are implementation decisions, provided that the backend applies a suitable policy to each data category.

---

## 10. System Architecture

The application shall use the following integration boundary:

```text
                    +-------------------+
                    |    Open-Meteo     |
                    |   External API    |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    |      Backend      |
                    |-------------------|
                    | Application API   |
                    | Authentication    |
                    | Data normalization|
                    | Persistence       |
                    | Analytics         |
                    | Data refresh      |
                    +---------+---------+
                              |
                              v
                    +-------------------+
                    |     Frontend      |
                    |     Dashboard     |
                    +---------+---------+
                              |
                              v
                         End users
```

The frontend shall communicate only with the application's backend API.

The backend shall be the integration boundary between the frontend and Open-Meteo and shall own the application's data model, persistence, data-refresh behavior, and analytical behavior.

Open-Meteo shall not be a direct dependency of the frontend.

---

## 11. Frontend / Backend Integration

The frontend shall be developed against the application's own API contract.

Before the real backend is available, frontend API interactions shall use mocks that follow the same behavior and data structures expected from the backend.

The mock API shall represent **the application's API**, not the Open-Meteo API.

The frontend-to-backend contract shall remain stable when the real backend replaces the mock implementation.


---

## 12. Backend Responsibilities

The backend shall be responsible for:

- exposing the application's API;
- authentication and authorization;
- integrating with Open-Meteo;
- normalizing external weather data;
- persisting weather and application data;
- applying data-refresh policies;
- handling manual refresh requests;
- calculating aggregations;
- detecting anomalies;
- calculating trends;
- generating textual insights;
- managing saved cities;
- managing temporary and saved views;
- enforcing private/public view access rules;
- creating and retrieving immutable analysis snapshots/runs;
- supporting public view URLs.

Database technology, containerization, deployment, and the concrete backend technology stack are implementation concerns and are not fixed by this specification.

---

## 13. Core Domain Model

The initial domain shall contain these concepts:

```text
User
  |
  +--> Saved Cities
  |
  +--> Saved Views
  |       |
  |       +--> selected cities
  |       +--> selected period
  |       +--> selected metrics
  |       +--> dashboard configuration
  |       +--> visibility
  |
  +--> Analysis History
          |
          +--> Analysis Snapshot / Run
```

Key relationships:

- A saved city is independent from views and reusable across multiple views.
- A saved view belongs to a user.
- A saved view is either private or public.
- A public saved view can be accessed through a shareable URL.
- An analysis snapshot/run is an independent immutable historical record.
- Editing a saved view does not alter existing analysis snapshots/runs.

---

## 14. Initial User Flows

### 14.1 Anonymous Entry

```text
Open application
      |
      v
Public Dashboard
      |
      +--> Search/select cities
      +--> Select period
      +--> Select metrics
      +--> View weather data
      +--> View analytics
      +--> Compare cities
      +--> Create temporary view
      +--> Manually refresh data
```

### 14.2 Authentication for Persistence

```text
Anonymous user
      |
      v
Uses temporary view
      |
      v
Chooses to save persistent data
      |
      v
Register / Login
      |
      v
Personal Dashboard
```

After authentication, the user's persistent personal features become available.

### 14.3 New Authenticated User

```text
Register / Login
      |
      v
No saved views yet
      |
      v
System creates Default View
      |
      v
User configures cities / period / metrics / dashboard
      |
      v
User saves view
```

### 14.4 Returning Authenticated User

```text
Login
  |
  v
Personal Dashboard
  |
  v
Last saved view
```

### 14.5 Analysis History

```text
Configured View
      |
      v
Run Analysis
      |
      v
Analysis Snapshot / Run
      |
      +--> immutable historical record
      |
      +--> later view edits do not change it
      |
      +--> new analysis = new run
```

### 14.6 Public View Sharing

```text
Owner
  |
  v
Saved View
  |
  +--> Private
  |
  +--> Public
        |
        v
   Shareable URL
        |
        v
   Anonymous users can view
```

---

## 15. MVP Scope

The MVP shall include the complete product flow defined in this specification, with **minimal viable implementations** of each capability rather than postponing entire product areas.

The MVP shall include:

- public anonymous dashboard;
- city search and map-based city selection;
- multiple-city comparison;
- current weather;
- forecast data;
- historical weather data;
- all defined weather metrics where supported by the selected data source;
- configurable periods and metrics;
- charts and comparison tables;
- aggregations;
- hybrid anomaly detection;
- hybrid trend detection;
- textual insights;
- temporary anonymous views;
- user registration and login;
- saved cities;
- saved views;
- private/public saved views;
- public view URLs;
- personal dashboard;
- automatic creation of a default view for new users;
- opening the last saved view for returning users;
- immutable analysis snapshots/runs;
- automatic data refresh;
- manual refresh for current, forecast, and historical data;
- data freshness and refresh states.

MVP implementations may use simple rules, limited configuration, and a focused UI, but each capability shall be functional end-to-end.

---

## 16. Post-MVP Scope

Post-MVP work shall focus primarily on improving rather than redefining the core product capabilities.

Potential areas include:

- more sophisticated statistical models for anomalies and trends;
- richer analytical visualizations;
- improved textual insight generation;
- more advanced dashboard customization;
- improved comparison workflows;
- richer map interactions;
- improved authentication/account management;
- performance and caching improvements;
- scaling data ingestion and processing;
- enhanced data-quality handling;
- expanded supported weather data and providers;
- broader usability and accessibility improvements.

Post-MVP work shall preserve the core frontend/backend contract unless a deliberate API evolution is required.

---

## 17. Implementation Constraints and Open Decisions

The following details are intentionally left open for detailed design and implementation:

- exact API endpoint names;
- request and response schemas;
- exact authentication mechanism;
- database technology and schema;
- exact city-geocoding implementation;
- exact default city selection for the new-user default view;
- exact default period and default metric selection;
- exact dashboard layout and visual design;
- exact historical baseline calculation;
- exact statistical formulas and thresholds for anomaly and trend detection;
- exact refresh intervals for each weather data category;
- cache strategy;
- data retention policy;
- analysis-history retention limits;
- limits for saved cities and saved views;
- validation and error-handling details;
- deployment and containerization strategy.

These decisions shall be resolved consistently during detailed implementation design and reflected in the frontend/backend API where they affect application behavior.
