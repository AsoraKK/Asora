-- Apply only after the provider allows PostGIS on the target branch.
-- The core migration intentionally continues without this extension so that
-- non-geospatial launch domains can be validated independently.
CREATE EXTENSION IF NOT EXISTS postgis;
