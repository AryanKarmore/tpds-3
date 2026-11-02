# Power BI Dashboard Setup Guide (Module 1)

This guide provides step-by-step instructions for connecting **Power BI Desktop** to the MySQL database and configuring the five executive analytical pages for **CivicTrack Nagpur**.

---

## 1. Database Connection Credentials

A dedicated read-only database user has been created in `db/schema.sql`:

| Property | Value | Note |
|---|---|---|
| **Server / Host** | `127.0.0.1` or `localhost` | If connecting from host to Docker, ensure port 3306 is mapped |
| **Port** | `3306` | Default MySQL port |
| **Database** | `civictrack` | CivicTrack database name |
| **Username** | `powerbi_ro` | Read-only reporting account |
| **Password** | `PowerBI@123` | Provisioned automatically |
| **Connection Mode** | `Import` or `DirectQuery` | Import is recommended for responsive slicing |

> **Prerequisite**: Ensure the **MySQL Connector / NET** (or ODBC Driver for MySQL) is installed on your Windows host machine if prompted by Power BI Desktop.

---

## 2. Steps to Connect Power BI to MySQL

1. Open **Power BI Desktop**.
2. Click **Get Data** $\rightarrow$ **MySQL Database**.
3. In the dialog, enter:
   - **Server**: `127.0.0.1:3306`
   - **Database**: `civictrack`
   - **Data Connectivity mode**: `Import`
4. When prompted for credentials, select the **Database** tab:
   - **User name**: `powerbi_ro`
   - **Password**: `PowerBI@123`
5. In the **Navigator** window, select the 5 pre-built SQL analytical views:
   - `v_ward_metrics`
   - `v_category_trend`
   - `v_hotspots`
   - `v_monthly_summary`
   - `v_complaints_flat`
6. Click **Load**.

---

## 3. SQL Views Reference

The database provides five denormalized, pre-aggregated views defined in `db/views.sql`:

### `v_ward_metrics`
- **Purpose**: High-level ward governance KPIs and performance scoring.
- **Key Columns**: `ward_id`, `ward_name`, `zone_id`, `zone_name`, `total_complaints`, `open_complaints`, `resolved_complaints`, `overdue_count`, `overdue_share`, `avg_resolution_days`, `reopened_complaints`, `reopen_rate`, `performance_score`.

### `v_category_trend`
- **Purpose**: Monthly volume and average resolution speed segmented by category.
- **Key Columns**: `month` (e.g. `2026-02`), `category_id`, `category_name`, `complaint_count`, `avg_resolution_days`.

### `v_hotspots`
- **Purpose**: Micro-locality clustering of complaints to identify recurring failure zones.
- **Key Columns**: `ward_id`, `ward_name`, `zone_name`, `locality`, `category_id`, `category_name`, `complaint_count`, `total_affected`, `avg_priority`.

### `v_monthly_summary`
- **Purpose**: Macro-level intake vs output over time.
- **Key Columns**: `month`, `created_count`, `closed_count`, `reopened_count`, `overdue_count`.

### `v_complaints_flat`
- **Purpose**: Granular complaint records for interactive drill-downs and geographical map plotting.
- **Key Columns**: `complaint_id`, `locality`, `latitude`, `longitude`, `status`, `affected_count`, `priority_score`, `is_overdue`, `age_days`, `resolution_days`, `ward_name`, `zone_name`, `category_name`.

---

## 4. The Five Dashboard Pages to Build

### Page 1: City Overview & Executive KPIs
- **KPI Cards**:
  - Total Complaints (`COUNT(complaints)`)
  - Currently Open Issues (`SUM(open_complaints)`)
  - City-Wide Overdue % (`overdue_share`)
  - Average Days to Resolve (`avg_resolution_days`)
- **Visuals**:
  - Donut Chart: Complaint status distribution (`Open`, `In Progress`, `Pending Confirmation`, `Closed`, `Reopened`).
  - Bar Chart: Complaint volume by NMC Zone (`Laxmi Nagar`, `Dharampeth`, etc.).
  - Slicer: Category selector (`Pothole`, `Garbage Pickup`, `Streetlight`, `Water Leak`).

### Page 2: Ward Performance Ranking
- **Bar Chart (Horizontal Ranked)**:
  - Y-axis: `ward_name`
  - X-axis: `performance_score` (sorted descending)
  - Color formatting: Conditional gradient (Red < 60%, Yellow 60-75%, Green > 75%).
- **Slicers**:
  - `zone_name` dropdown.
  - Performance score slider.
- **Table Visual**:
  - Columns: Ward Name, Zone, Total, Resolved, Overdue %, Reopen %, Performance Score.

### Page 3: Category Diagnostics & Resolution Efficiency
- **Clustered Column Chart**:
  - X-axis: `category_name`
  - Y-axis 1: `complaint_count`
  - Y-axis 2: `avg_resolution_days` vs `sla_days` benchmark line.
- **Matrix Visual**:
  - Rows: `zone_name`, `ward_name`
  - Columns: `category_name`
  - Values: `complaint_count` and `overdue_count`.

### Page 4: Longitudinal Intake vs. Closure Trends
- **Area / Line Chart**:
  - X-axis: `month` (e.g. Nov 2025 - Feb 2026)
  - Lines: `created_count` (intake) vs `closed_count` (throughput).
- **Bar Chart**:
  - Monthly citizen reopen volume (`reopened_count`).

### Page 5: Civic Hotspots & Geospatial Analysis
- **Map Visual (Power BI Azure Map or Map)**:
  - Latitude: `v_complaints_flat[latitude]`
  - Longitude: `v_complaints_flat[longitude]`
  - Bubble Size: `affected_count`
  - Bubble Color: `status`
  - Tooltips: `locality`, `category_name`, `age_days`, `priority_score`.
- **Hotspot Table**:
  - Top 10 worst localities ranked by `total_affected` citizens and `complaint_count`.
- **Reopen Rate Breakdown**:
  - Table identifying repeat failure points where citizens rejected the officer's initial fix.

