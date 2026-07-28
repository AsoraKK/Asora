# Geospatial provider fallback ADR

Status: `development-only fallback; geography capability blocked`

## Decision

PostGIS remains a required Lythaus launch capability for geometry-backed place
queries. PlanetScale currently exposes PostGIS in the catalog but excludes it
from the immutable extension allowlist, so the development baseline must not
pretend that the extension is installed.

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

This fallback does not change the production architecture or remove the
required capability; it keeps independent development work moving while Gate 3
and the geography portion of Gate 4 remain blocked.
