# Geospatial provider fallback ADR

Status: `accepted launch baseline; advanced geography deferred`

## Decision

PostGIS is not a Lythaus launch requirement. The startup architecture uses
ordinary PostgreSQL 17 types and indexes for country, region, municipality,
community, numeric coordinates, and validated GeoJSON where needed.

The core migration therefore stores an optional `content.places.boundary_geojson`
value and adds the PostGIS `boundary geography(MultiPolygon, 4326)` column only
when the extension is actually installed. The JSON value is not used to claim
PostGIS query support; exact geometry queries and geography-dependent discovery
remain disabled.

## Re-enablement

When PlanetScale allows PostGIS:

1. Apply `database/planetscale/extensions/postgis.sql` through the direct
   administrative connection.
2. Apply a reviewed migration that converts validated GeoJSON boundaries to the
   PostGIS geography column.
3. Run geography precision, sensitive-location, and regional-feed tests.
4. Update the extension evidence and only then enable geography-dependent
   product behaviour.

This enhancement is optional. Polygon containment, distance search, advanced
spatial analysis, and location-based recommendations remain feature-flagged off
until the provider capability and product need are both proven.
