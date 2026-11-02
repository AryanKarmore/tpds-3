-- CivicTrack Nagpur Power BI Analytical Views (MySQL 8)
USE civictrack;

-- Drop existing views if any
DROP VIEW IF EXISTS v_ward_metrics;
DROP VIEW IF EXISTS v_category_trend;
DROP VIEW IF EXISTS v_hotspots;
DROP VIEW IF EXISTS v_monthly_summary;
DROP VIEW IF EXISTS v_complaints_flat;

-- 1. Ward Metrics & Performance Score
CREATE OR REPLACE VIEW v_ward_metrics AS
SELECT
    w.id AS ward_id,
    w.name AS ward_name,
    z.id AS zone_id,
    z.name AS zone_name,
    w.latitude,
    w.longitude,
    COUNT(c.id) AS total_complaints,
    SUM(CASE WHEN c.status IN ('Open', 'In Progress', 'Reopened') THEN 1 ELSE 0 END) AS open_complaints,
    SUM(CASE WHEN c.status IN ('Pending Confirmation', 'Closed') THEN 1 ELSE 0 END) AS resolved_complaints,
    SUM(CASE WHEN c.is_overdue = 1 THEN 1 ELSE 0 END) AS overdue_count,
    ROUND(
        CASE 
            WHEN COUNT(c.id) > 0 THEN SUM(CASE WHEN c.is_overdue = 1 THEN 1 ELSE 0 END) / COUNT(c.id)
            ELSE 0 
        END, 
        4
    ) AS overdue_share,
    ROUND(
        COALESCE(
            AVG(CASE WHEN c.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, c.created_at, c.resolved_at) / 86400.0 END),
            0
        ),
        2
    ) AS avg_resolution_days,
    SUM(CASE WHEN c.reopen_count > 0 THEN 1 ELSE 0 END) AS reopened_complaints,
    ROUND(
        CASE 
            WHEN SUM(CASE WHEN c.resolved_at IS NOT NULL THEN 1 ELSE 0 END) > 0 
            THEN SUM(CASE WHEN c.reopen_count > 0 THEN 1 ELSE 0 END) / SUM(CASE WHEN c.resolved_at IS NOT NULL THEN 1 ELSE 0 END)
            ELSE 0 
        END,
        4
    ) AS reopen_rate,
    CASE 
        WHEN COUNT(c.id) = 0 THEN NULL
        ELSE ROUND(
            GREATEST(0, LEAST(100, 
                100 
                - (30.0 * LEAST(COALESCE(AVG(CASE WHEN c.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, c.created_at, c.resolved_at) / 86400.0 END), 0), 14.0) / 14.0)
                - (30.0 * (SUM(CASE WHEN c.is_overdue = 1 THEN 1 ELSE 0 END) / COUNT(c.id)))
                - (40.0 * (
                    CASE 
                        WHEN SUM(CASE WHEN c.resolved_at IS NOT NULL THEN 1 ELSE 0 END) > 0 
                        THEN SUM(CASE WHEN c.reopen_count > 0 THEN 1 ELSE 0 END) / SUM(CASE WHEN c.resolved_at IS NOT NULL THEN 1 ELSE 0 END)
                        ELSE 0 
                    END
                  ))
            )),
            2
        )
    END AS performance_score
FROM wards w
JOIN zones z ON w.zone_id = z.id
LEFT JOIN complaints c ON w.id = c.ward_id AND c.parent_id IS NULL
GROUP BY w.id, w.name, z.id, z.name, w.latitude, w.longitude;

-- 2. Category Trend (Monthly complaint volume & resolution speed by category)
CREATE OR REPLACE VIEW v_category_trend AS
SELECT
    DATE_FORMAT(c.created_at, '%Y-%m') AS month,
    cat.id AS category_id,
    cat.name AS category_name,
    COUNT(c.id) AS complaint_count,
    ROUND(
        COALESCE(
            AVG(CASE WHEN c.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, c.created_at, c.resolved_at) / 86400.0 END),
            0
        ),
        2
    ) AS avg_resolution_days
FROM complaints c
JOIN categories cat ON c.category_id = cat.id
WHERE c.parent_id IS NULL
GROUP BY DATE_FORMAT(c.created_at, '%Y-%m'), cat.id, cat.name;

-- 3. Civic Hotspots (Locations with high complaint volume and affected citizens)
CREATE OR REPLACE VIEW v_hotspots AS
SELECT
    w.id AS ward_id,
    w.name AS ward_name,
    z.name AS zone_name,
    c.locality,
    cat.id AS category_id,
    cat.name AS category_name,
    COUNT(c.id) AS complaint_count,
    SUM(c.affected_count) AS total_affected,
    ROUND(AVG(c.priority_score), 2) AS avg_priority
FROM complaints c
JOIN wards w ON c.ward_id = w.id
JOIN zones z ON w.zone_id = z.id
JOIN categories cat ON c.category_id = cat.id
WHERE c.parent_id IS NULL
GROUP BY w.id, w.name, z.name, c.locality, cat.id, cat.name;

-- 4. Monthly Summary (Created vs Closed vs Reopened)
CREATE OR REPLACE VIEW v_monthly_summary AS
SELECT
    DATE_FORMAT(c.created_at, '%Y-%m') AS month,
    COUNT(c.id) AS created_count,
    SUM(CASE WHEN c.status = 'Closed' THEN 1 ELSE 0 END) AS closed_count,
    SUM(CASE WHEN c.reopen_count > 0 THEN 1 ELSE 0 END) AS reopened_count,
    SUM(CASE WHEN c.is_overdue = 1 THEN 1 ELSE 0 END) AS overdue_count
FROM complaints c
WHERE c.parent_id IS NULL
GROUP BY DATE_FORMAT(c.created_at, '%Y-%m');

-- 5. Denormalized Flat Complaints View (For Power BI Drilldown & Map Visual)
CREATE OR REPLACE VIEW v_complaints_flat AS
SELECT
    c.id AS complaint_id,
    c.parent_id,
    c.locality,
    c.description,
    c.latitude,
    c.longitude,
    c.status,
    c.affected_count,
    c.priority_score,
    c.is_overdue,
    c.reopen_count,
    c.closed_unverified,
    c.created_at,
    c.resolved_at,
    c.closed_at,
    ROUND(TIMESTAMPDIFF(SECOND, c.created_at, NOW()) / 86400.0, 1) AS age_days,
    ROUND(
        CASE 
            WHEN c.resolved_at IS NOT NULL THEN TIMESTAMPDIFF(SECOND, c.created_at, c.resolved_at) / 86400.0 
            ELSE NULL 
        END, 
        2
    ) AS resolution_days,
    w.id AS ward_id,
    w.name AS ward_name,
    z.id AS zone_id,
    z.name AS zone_name,
    cat.id AS category_id,
    cat.name AS category_name,
    cat.sla_days,
    cat.severity_weight,
    u.id AS citizen_user_id,
    u.name AS citizen_name
FROM complaints c
JOIN wards w ON c.ward_id = w.id
JOIN zones z ON w.zone_id = z.id
JOIN categories cat ON c.category_id = cat.id
JOIN users u ON c.user_id = u.id;

