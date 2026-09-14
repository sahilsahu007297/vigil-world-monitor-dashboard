import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { createSatelliteLayer, parseColor } from "./satellite-layer";
import type { GlobalFlight, GlobalSatellite } from "./services/global-feeds";
import type { FeatureCollection } from "geojson";
import { FLIGHT_PATH, aircraftColor } from "./flight-map-style";
import { SATELLITE_SOURCES, type SatelliteImagerySource } from "./services/satellite-imagery";
import type { CellTower } from "./services/cell-towers";

export type GeoMarker = {
  lon: number;
  lat: number;
  kind: "conflict" | "flight" | "vessel" | "hazard" | "cable" | "infra" | "base";
  label: string;
  detail?: string;
  mag?: number;
  heading?: number;
  flight?: GlobalFlight;
};

export const KIND_COLOR: Record<GeoMarker["kind"], string> = {
  conflict: "#c0392b",
  hazard: "#f4c430",
  flight: "#e6ddc9",
  vessel: "#d4af37",
  cable: "#987b20",
  infra: "#7fae9b",
  base: "#5aa9e6",
};

export default function Globe({
  markers,
  satellites = [],
  flat,
  zoom,
  target,
  mapView = "dark",
  satelliteEnabled = false,
  satelliteSource = "sentinel-hub",
  cellTowers = [],
  cellTowersEnabled = false,
  streetViewMode = false,
  onSelect,
  onSelectCellTower,
  onStreetViewClick,
  onMapCenter,
}: {
  markers: GeoMarker[];
  satellites?: GlobalSatellite[];
  flat: boolean;
  zoom: number;
  target?: [number, number];
  mapView?: "dark" | "satellite";
  satelliteEnabled?: boolean;
  satelliteSource?: SatelliteImagerySource;
  cellTowers?: CellTower[];
  cellTowersEnabled?: boolean;
  streetViewMode?: boolean;
  onMapCenter?: (center: [number, number]) => void;
  onSelect: (marker: GeoMarker, satellite?: GlobalSatellite) => void;
  onSelectCellTower?: (tower: CellTower) => void;
  onStreetViewClick?: (coords: [number, number]) => void;
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const satLayerRef = useRef<ReturnType<typeof createSatelliteLayer> | null>(null);
  const onSelectRef = useRef(onSelect);
  const onSelectCellTowerRef = useRef(onSelectCellTower);
  const onStreetViewClickRef = useRef(onStreetViewClick);
  const streetViewModeRef = useRef(streetViewMode);
  const satellitesRef = useRef(satellites);
  const cellTowersRef = useRef(cellTowers);
  const centerCallback = useRef(onMapCenter);

  useEffect(() => { centerCallback.current = onMapCenter; }, [onMapCenter]);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onSelectCellTowerRef.current = onSelectCellTower; }, [onSelectCellTower]);
  useEffect(() => { onStreetViewClickRef.current = onStreetViewClick; }, [onStreetViewClick]);
  useEffect(() => { streetViewModeRef.current = streetViewMode; }, [streetViewMode]);
  useEffect(() => { satellitesRef.current = satellites; }, [satellites]);
  useEffect(() => { cellTowersRef.current = cellTowers; }, [cellTowers]);

  // Update canvas cursor for Street View mode
  useEffect(() => {
    if (!map.current) return;
    const canvas = map.current.getCanvas();
    if (streetViewMode) {
      canvas.style.cursor = "crosshair";
    } else {
      canvas.style.cursor = "";
    }
  }, [streetViewMode]);

  useEffect(() => {
    if (map.current) return;

    const DARK_BASEMAP_STYLE: maplibregl.StyleSpecification = {
      version: 8,
      sources: {
        "esri-dark": {
          type: "raster",
          tiles: [
            "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "© Esri, HERE, Garmin, © OpenStreetMap contributors",
          maxzoom: 16,
        },
        "esri-dark-ref": {
          type: "raster",
          tiles: [
            "https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "© Esri",
          maxzoom: 16,
        },
      },
      layers: [
        {
          id: "background",
          type: "background",
          paint: {
            "background-color": "#060a10",
          },
        },
        {
          id: "esri-dark-tiles",
          type: "raster",
          source: "esri-dark",
          paint: {
            "raster-opacity": 1.0,
            "raster-fade-duration": 100,
          },
        },
        {
          id: "esri-dark-ref-tiles",
          type: "raster",
          source: "esri-dark-ref",
          paint: {
            "raster-opacity": 0.7,
            "raster-fade-duration": 100,
          },
        },
      ],
    };

    const baseOptions: maplibregl.MapOptions = {
      container: mapContainer.current!,
      style: DARK_BASEMAP_STYLE,
      center: [77.2, 22.0] as [number, number],
      zoom: 1.8,
      minZoom: 1,
      maxZoom: 19,
      pitch: 0,
      projection: { type: flat ? "mercator" : "globe" },
      attributionControl: { compact: true },
    };

    const attributeFallbacks: maplibregl.MapOptions['canvasContextAttributes'][] = [
      undefined,
      { powerPreference: 'low-power', failIfMajorPerformanceCaveat: false },
    ];

    let createdMap: maplibregl.Map | undefined;
    for (const canvasContextAttributes of attributeFallbacks) {
      try {
        createdMap = new maplibregl.Map(
          canvasContextAttributes ? { ...baseOptions, canvasContextAttributes } : baseOptions
        );
        break;
      } catch (e) {
        if (mapContainer.current) mapContainer.current.innerHTML = '';
        if (canvasContextAttributes === attributeFallbacks[attributeFallbacks.length - 1]) throw e;
        console.warn('WebGL context rejected, retrying with weaker attributes:', e);
      }
    }
    
    if (!createdMap) return;
    map.current = createdMap;
    
    // @ts-ignore
    window._globeMap = map.current;

    const handleResize = () => {
      if (map.current) {
        map.current.resize();
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (mapContainer.current) {
      resizeObserver.observe(mapContainer.current);
    }
    window.addEventListener("resize", handleResize);

    const t1 = setTimeout(handleResize, 80);
    const t2 = setTimeout(handleResize, 300);
    const t3 = setTimeout(handleResize, 800);

    const initLayers = () => {
      handleResize();
      if (!map.current || map.current.getSource("markers")) return;
      
      try {
        // Satellite Imagery raster source & layer (placed below markers)
        const initialTileUrl = SATELLITE_SOURCES[satelliteSource]?.defaultTileUrl || SATELLITE_SOURCES["sentinel-hub"].defaultTileUrl;
        if (!map.current.getSource("vigil-satellite-source")) {
          map.current.addSource("vigil-satellite-source", {
            type: "raster",
            tiles: [initialTileUrl],
            tileSize: 256,
            maxzoom: 18,
            attribution: SATELLITE_SOURCES[satelliteSource]?.attribution || "Copernicus Sentinel",
          });
          map.current.addLayer({
            id: "vigil-satellite-layer",
            type: "raster",
            source: "vigil-satellite-source",
            layout: { visibility: satelliteEnabled ? "visible" : "none" },
            paint: {
              "raster-opacity": 0.95,
              "raster-fade-duration": 150,
              "raster-resampling": "linear",
            },
          });
        }

        // Cell towers GeoJSON source & layer
        map.current.addSource("cell-towers", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        // Cell towers range circles (coverage)
        map.current.addLayer({
          id: "cell-towers-range",
          type: "circle",
          source: "cell-towers",
          layout: { visibility: cellTowersEnabled ? "visible" : "none" },
          paint: {
            "circle-color": "#38bdf8",
            "circle-opacity": 0.12,
            "circle-stroke-color": "#0284c7",
            "circle-stroke-width": 1,
            "circle-stroke-opacity": 0.45,
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 8, 12, 35, 16, 90],
          },
        });

        // Cell towers center mast icon / circle
        map.current.addLayer({
          id: "cell-towers-layer",
          type: "circle",
          source: "cell-towers",
          layout: { visibility: cellTowersEnabled ? "visible" : "none" },
          paint: {
            "circle-color": [
              "case",
              ["==", ["get", "radio"], "5G NR"], "#10b981",
              ["==", ["get", "radio"], "LTE"], "#00e5ff",
              "#f59e0b"
            ],
            "circle-radius": 5,
            "circle-stroke-width": 1.5,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-opacity": 0.9,
          },
        });

        // Cell towers label
        map.current.addLayer({
          id: "cell-towers-label",
          type: "symbol",
          source: "cell-towers",
          layout: {
            visibility: cellTowersEnabled ? "visible" : "none",
            "text-field": ["get", "operator"],
            "text-size": 9.5,
            "text-offset": [0, 1.4],
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#e0f2fe",
            "text-halo-color": "#000000",
            "text-halo-width": 1.2,
          },
        });

        // Add source for markers
        map.current.addSource("markers", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        // Add circles
        map.current.addLayer({
          id: "markers-layer",
          filter: ["!=", ["get", "kind"], "flight"],
          type: "circle",
          source: "markers",
          paint: {
            "circle-color": ["coalesce", ["get", "color"], "#ffffff"],
            "circle-radius": ["coalesce", ["get", "radius"], 4],
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-opacity": 0.8,
          },
        });

        // Add text labels
        map.current.addLayer({
          id: "markers-label",
          type: "symbol",
          source: "markers",
          layout: {
            "text-field": ["get", "label"],
            "text-size": 10,
            "text-offset": [0, 1.5],
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": ["get", "color"],
            "text-halo-color": "#000000",
            "text-halo-width": 1,
          },
        });

        if (!map.current.hasImage("flight-plane")) {
          const canvas = document.createElement("canvas");
          canvas.width = 32;
          canvas.height = 32;
          const context = canvas.getContext("2d");
          if (context) {
            context.scale(32 / 24, 32 / 24);
            context.fillStyle = "white";
            context.fill(new Path2D(FLIGHT_PATH));
            map.current.addImage("flight-plane", { width: 32, height: 32, data: context.getImageData(0, 0, 32, 32).data }, { pixelRatio: 1, sdf: true });
          }
        }

        map.current.addLayer({
          id: "flight-icons",
          type: "symbol",
          source: "markers",
          filter: ["==", ["get", "kind"], "flight"],
          layout: {
            "icon-image": "flight-plane",
            "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.55, 9, 1.0],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "icon-rotate": ["coalesce", ["get", "heading"], 0],
            "icon-rotation-alignment": "map",
            "text-allow-overlap": true,
            "text-ignore-placement": true,
          },
          paint: {
            "icon-opacity": 1,
            "icon-color": ["get", "color"],
          },
        });

        map.current.addSource("satellite-points", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
        map.current.addLayer({
          id: "satellite-points",
          type: "circle",
          source: "satellite-points",
          paint: {
            "circle-color": ["coalesce", ["get", "color"], "#00e5ff"],
            "circle-radius": 2.5,
            "circle-opacity": 0.9,
            "circle-stroke-color": "#b8f4ff",
            "circle-stroke-width": 0.5,
          },
        });

        if (!map.current.getLayer('sat-3d')) {
          satLayerRef.current = createSatelliteLayer('sat-3d');
          map.current.addLayer(satLayerRef.current as any);
        }

        if (!flat) {
          try {
            map.current.setSky({
              "sky-color": "#020408",
              "sky-horizon-blend": 0.25,
              "horizon-color": "#0e1a2f",
              "horizon-fog-blend": 0.1,
              "fog-color": "#020408",
              "fog-ground-blend": 0.0,
              "atmosphere-blend": 0.45,
            });
          } catch {}
        }
      } catch (e) {
        console.error("Failed to add layers to map", e);
      }

      map.current.on("moveend", () => {
        const c = map.current?.getCenter();
        if (c) centerCallback.current?.([((c.lng + 180) % 360 + 360) % 360 - 180, c.lat]);
      });

      // Map click handler with Street View mode check
      map.current.on("click", (e) => {
        if (streetViewModeRef.current) {
          onStreetViewClickRef.current?.([e.lngLat.lng, e.lngLat.lat]);
          return;
        }

        const satIndex = satLayerRef.current?.pick(e.point.x, e.point.y);
        const satellite = satIndex == null ? undefined : satellitesRef.current[satIndex];
        if (satellite) {
          onSelectRef.current({ lon: satellite.lng, lat: satellite.lat, kind: "infra", label: satellite.name, detail: `${satellite.category} satellite · ${satellite.alt.toLocaleString()} km altitude` }, satellite);
        }
      });

      map.current.on("click", ["markers-layer", "flight-icons"], (e) => {
        if (streetViewModeRef.current) {
          onStreetViewClickRef.current?.([e.lngLat.lng, e.lngLat.lat]);
          return;
        }
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          if (props && props.label) {
            let flight: GlobalFlight | undefined;
            try { flight = props.flight ? JSON.parse(props.flight) as GlobalFlight : undefined; } catch { flight = undefined; }
            onSelectRef.current({ lon: flight?.lng ?? e.lngLat.lng, lat: flight?.lat ?? e.lngLat.lat, kind: props.kind || "infra", label: props.label, detail: props.detail, heading: props.heading == null ? undefined : Number(props.heading), flight });
          }
        }
      });

      map.current.on("click", "cell-towers-layer", (e) => {
        if (streetViewModeRef.current) {
          onStreetViewClickRef.current?.([e.lngLat.lng, e.lngLat.lat]);
          return;
        }
        const towerId = e.features?.[0]?.properties?.id;
        if (towerId) {
          const tower = cellTowersRef.current.find(t => t.id === towerId);
          if (tower) {
            onSelectCellTowerRef.current?.(tower);
          }
        }
      });

      map.current.on("click", "satellite-points", (e) => {
        if (streetViewModeRef.current) return;
        const props = e.features?.[0]?.properties;
        const index = props?.index == null ? -1 : Number(props.index);
        const satellite = satellitesRef.current[index];
        if (!satellite) return;
        onSelectRef.current({ lon: satellite.lng, lat: satellite.lat, kind: "infra", label: satellite.name, detail: `${satellite.category} satellite · ${satellite.alt.toLocaleString()} km altitude` }, satellite);
      });
      
      map.current.on("mouseenter", "markers-layer", () => {
        if (map.current && !streetViewModeRef.current) map.current.getCanvas().style.cursor = "pointer";
      });
      
      map.current.on("mouseleave", "markers-layer", () => {
        if (map.current && !streetViewModeRef.current) map.current.getCanvas().style.cursor = "";
      });

      map.current.on("mouseenter", "cell-towers-layer", () => {
        if (map.current && !streetViewModeRef.current) map.current.getCanvas().style.cursor = "pointer";
      });

      map.current.on("mouseleave", "cell-towers-layer", () => {
        if (map.current && !streetViewModeRef.current) map.current.getCanvas().style.cursor = "";
      });
    };

    if (map.current.isStyleLoaded()) {
      initLayers();
    } else {
      map.current.once("style.load", initLayers);
      map.current.once("load", initLayers);
    }

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const safeSetProjection = (flatMode: boolean) => {
    if (!map.current) return;
    try {
      const container = mapContainer.current;
      if (!container || container.clientWidth === 0 || container.clientHeight === 0) {
        setTimeout(() => safeSetProjection(flatMode), 60);
        return;
      }
      map.current.resize();
      map.current.setProjection({ type: flatMode ? "mercator" : "globe" });
      map.current.easeTo({ pitch: 0, duration: 700 });
      if (!flatMode) {
        try {
          map.current.setSky({
            "sky-color": "#020408",
            "sky-horizon-blend": 0.2,
            "horizon-color": "#0b101b",
            "horizon-fog-blend": 0.08,
            "fog-color": "#020408",
            "fog-ground-blend": 0.0,
            "atmosphere-blend": 0.35,
          });
        } catch { /* Older MapLibre builds may not expose sky styling. */ }
      }
    } catch (err) {
      console.warn("MapLibre projection adjustment fallback:", err);
      try {
        map.current?.setProjection({ type: "mercator" });
        map.current?.easeTo({ pitch: flatMode ? 0 : 25, duration: 500 });
      } catch {}
    }
  };

  // Update projection (3D vs 2D)
  useEffect(() => {
    if (!map.current) return;
    const update = () => {
      safeSetProjection(flat);
    };
    if (map.current.isStyleLoaded()) update();
    else {
      map.current.once("style.load", update);
      map.current.once("load", update);
    }
  }, [flat]);

  // Handle zoom and target changes
  useEffect(() => {
    if (!map.current) return;
    const update = () => {
      const targetZoom = target
        ? Math.max(4.5, zoom * 2.5)
        : Math.min(19, Math.max(1.4, +(zoom * 1.8).toFixed(2)));
      const options: any = { zoom: targetZoom };
      if (target) {
        options.center = target;
      }
      map.current!.flyTo(options);
    };
    if (map.current.isStyleLoaded()) update();
    else map.current.once("style.load", update);
  }, [zoom, target]);

  // Handle Satellite Imagery Layer Toggle and Source Switching
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    const applySatelliteLayer = () => {
      try {
        const isVisible = satelliteEnabled || mapView === "satellite";
        const meta = SATELLITE_SOURCES[satelliteSource] || SATELLITE_SOURCES["sentinel-hub"];
        const tileUrl = meta.defaultTileUrl;

        // If source doesn't exist, create it
        if (!currentMap.getSource("vigil-satellite-source")) {
          currentMap.addSource("vigil-satellite-source", {
            type: "raster",
            tiles: [tileUrl],
            tileSize: 256,
            maxzoom: 18,
            attribution: meta.attribution,
          });
          currentMap.addLayer({
            id: "vigil-satellite-layer",
            type: "raster",
            source: "vigil-satellite-source",
            layout: { visibility: isVisible ? "visible" : "none" },
            paint: {
              "raster-opacity": 0.95,
              "raster-fade-duration": 150,
              "raster-resampling": "linear",
            },
          }, "markers-layer");
        } else {
          // Source exists: update visibility
          currentMap.setLayoutProperty(
            "vigil-satellite-layer",
            "visibility",
            isVisible ? "visible" : "none"
          );

          // If layer is visible, update tile URL for the active source
          if (isVisible) {
            const sourceObj = currentMap.getSource("vigil-satellite-source") as any;
            if (sourceObj && typeof sourceObj.setTiles === "function") {
              sourceObj.setTiles([tileUrl]);
            } else {
              // Re-create layer and source cleanly if setTiles is not exposed
              if (currentMap.getLayer("vigil-satellite-layer")) currentMap.removeLayer("vigil-satellite-layer");
              if (currentMap.getSource("vigil-satellite-source")) currentMap.removeSource("vigil-satellite-source");
              currentMap.addSource("vigil-satellite-source", {
                type: "raster",
                tiles: [tileUrl],
                tileSize: 256,
                maxzoom: 18,
                attribution: meta.attribution,
              });
              currentMap.addLayer({
                id: "vigil-satellite-layer",
                type: "raster",
                source: "vigil-satellite-source",
                layout: { visibility: "visible" },
                paint: {
                  "raster-opacity": 0.95,
                  "raster-fade-duration": 150,
                  "raster-resampling": "linear",
                },
              }, "markers-layer");
            }
          }
        }
      } catch (err) {
        console.warn("Satellite imagery overlay update error:", err);
      }
    };

    if (currentMap.isStyleLoaded()) applySatelliteLayer();
    else currentMap.once("style.load", applySatelliteLayer);
  }, [satelliteEnabled, satelliteSource, mapView]);

  // Handle Cell Towers Layer Data & Visibility
  useEffect(() => {
    const currentMap = map.current;
    if (!currentMap) return;

    const applyCellTowers = () => {
      try {
        const vis = cellTowersEnabled ? "visible" : "none";
        if (currentMap.getLayer("cell-towers-layer")) {
          currentMap.setLayoutProperty("cell-towers-layer", "visibility", vis);
          currentMap.setLayoutProperty("cell-towers-range", "visibility", vis);
          currentMap.setLayoutProperty("cell-towers-label", "visibility", vis);
        }

        const source = currentMap.getSource("cell-towers") as maplibregl.GeoJSONSource | undefined;
        if (source && cellTowersEnabled) {
          source.setData({
            type: "FeatureCollection",
            features: cellTowers.map(t => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [t.lon, t.lat] },
              properties: {
                id: t.id,
                operator: t.operator,
                radio: t.radio,
                rangeMeters: t.rangeMeters,
                mcc: t.mcc,
                mnc: t.mnc,
                cellId: t.cellId,
                lac: t.lac,
                height: t.height,
                signalDbm: t.signalDbm,
              },
            })),
          });
        }
      } catch (err) {
        console.warn("Cell tower layer update error:", err);
      }
    };

    if (currentMap.isStyleLoaded()) applyCellTowers();
    else currentMap.once("style.load", applyCellTowers);
  }, [cellTowers, cellTowersEnabled]);

  // Update markers
  useEffect(() => {
    if (!map.current) return;
    
    const data: FeatureCollection = {
      type: "FeatureCollection",
      features: markers.map((m) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [m.lon, m.lat] },
        properties: {
          label: m.label,
          detail: m.detail,
          kind: m.kind,
          heading: m.heading,
          flight: m.flight ? JSON.stringify(m.flight) : undefined,
          color: m.flight ? aircraftColor(m.flight.alt) : KIND_COLOR[m.kind] || "#ffffff",
          radius: m.kind === "conflict" ? 6 : m.kind === "hazard" ? (3 + (m.mag || 0)) : 4,
        },
      })),
    };

    let cancelled = false;
    let retry: ReturnType<typeof setTimeout>;
    const trySetData = () => {
      if (cancelled) return;
      const source = map.current?.getSource("markers") as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(data);
      } else {
        retry = setTimeout(trySetData, 500);
      }
    };
    
    trySetData();
    return () => { cancelled = true; clearTimeout(retry); };
  }, [markers]);

  // Update satellites
  useEffect(() => {
    if (!satLayerRef.current || !map.current) return;
    const pts = satellites.map(s => ({
      lat: s.lat,
      lng: s.lng,
      altKm: s.alt,
      color: parseColor(s.color),
      size: 3
    }));
    const trySetSats = () => {
      if (satLayerRef.current) {
        satLayerRef.current.setPoints(pts);
        const source = map.current?.getSource("satellite-points") as maplibregl.GeoJSONSource | undefined;
        source?.setData({
          type: "FeatureCollection",
          features: satellites.map((satellite, index) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [satellite.lng, satellite.lat] },
            properties: { index, color: satellite.color || "#00e5ff" },
          })),
        });
      } else {
        setTimeout(trySetSats, 500);
      }
    };
    trySetSats();
  }, [satellites]);

  return <div ref={mapContainer} style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0, zIndex: 1 }} />;
}
