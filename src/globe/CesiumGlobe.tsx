// Photorealistic 3D Globe Frontend powered by CesiumJS
// Modeled on "God's Eye View" (bilawalsidhu/gods-eye-view) architecture & UX
import React, { useEffect, useRef, useState, useCallback } from "react";
import * as Cesium from "cesium";
import type { FeatureCollection } from "geojson";
import "cesium/Build/Cesium/Widgets/widgets.css";

import { MapStackController, type BasemapMode } from "./mapStackController";
import { SHADER_MODES, SHADER_SOURCES, type VisualStyleMode } from "./postProcessingShaders";
import { CockpitController, type CameraFollowMode } from "./cockpitController";
import { SceneDirector, CINEMATIC_TOURS, type CinematicTour } from "./sceneDirector";
import { computeHeadingPitchRollOrientation } from "./iconOrientation";
import type { GeoMarker, KIND_COLOR } from "../Globe";
import type { GlobalSatellite, GlobalFlight } from "../services/global-feeds";
import {
  type LiveRadioStation,
  type LiveSpaceLaunch,
  type LiveMilitarySite,
  type LiveCctvCamera,
  type LiveFirePoint,
} from "../data/godsEyeLayers";
import { getStoredClientKeys } from "../services/power-up";
import {
  Eye,
  Camera,
  Radio,
  Rocket,
  Shield,
  Video,
  Flame,
  Car,
  Compass,
  Layers,
  Crosshair,
  Volume2,
  Maximize2,
  Minimize2,
  Share2,
  Sparkles,
  Sliders,
  X,
  Play,
  Pause,
  ChevronRight,
  ExternalLink,
} from "lucide-react";

// Ensure Cesium assets resolve from public/cesium
if (typeof window !== "undefined") {
  (window as any).CESIUM_BASE_URL = "/cesium";
}

export interface CesiumGlobeProps {
  markers: GeoMarker[];
  satellites?: GlobalSatellite[];
  flat?: boolean;
  zoom?: number;
  dayNight?: boolean;
  cables?: FeatureCollection | null;
  target?: [number, number];
  onSelect?: (marker: GeoMarker, satellite?: GlobalSatellite) => void;
  onMapCenter?: (center: [number, number]) => void;
  onOpenPowerUp?: () => void;
}

export default function CesiumGlobe({
  markers = [],
  satellites = [],
  flat = false,
  zoom = 1,
  dayNight = false,
  cables = null,
  target,
  onSelect,
  onMapCenter,
  onOpenPowerUp,
}: CesiumGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Cesium.Viewer | null>(null);
  const previousZoomRef = useRef(zoom);
  const mapStackRef = useRef<MapStackController | null>(null);
  const cockpitRef = useRef<CockpitController | null>(null);
  const directorRef = useRef<SceneDirector | null>(null);
  const currentPostProcessStage = useRef<Cesium.PostProcessStage | null>(null);
  const [viewerReady, setViewerReady] = useState(false);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed()) return;
    viewer.clock.currentTime = Cesium.JulianDate.now();
    viewer.scene.globe.enableLighting = dayNight;
    viewer.scene.requestRender();
  }, [dayNight, viewerReady]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !cables) return;
    let cancelled = false;
    let source: Cesium.GeoJsonDataSource | undefined;
    Cesium.GeoJsonDataSource.load(cables, { stroke: Cesium.Color.fromCssColorString("#70ddcb"), strokeWidth: 1.5 }).then(async loaded => {
      if (cancelled || viewer.isDestroyed()) return;
      source = loaded;
      await viewer.dataSources.add(loaded);
      if (cancelled && !viewer.isDestroyed()) viewer.dataSources.remove(loaded, true);
    }).catch(error => console.warn("Cable geometry unavailable", error));
    return () => { cancelled = true; if (source && !viewer.isDestroyed()) viewer.dataSources.remove(source, true); };
  }, [cables, viewerReady]);

  // UX & HUD States
  const [visualMode, setVisualMode] = useState<VisualStyleMode>("normal");
  const [basemapMode, setBasemapMode] = useState<BasemapMode>("esri");
  const [detectionActive, setDetectionActive] = useState(false);
  const [hudActive, setHudActive] = useState(false);
  const [cockpitMode, setCockpitMode] = useState<CameraFollowMode>("orbit");
  const [selectedEntityData, setSelectedEntityData] = useState<any | null>(null);
  const [nearbyContacts, setNearbyContacts] = useState<any[]>([]);
  const [showContactsPanel, setShowContactsPanel] = useState(false);
  const [showOpticsMenu, setShowOpticsMenu] = useState(false);
  const [showDirectorModal, setShowDirectorModal] = useState(false);
  const [activeTour, setActiveTour] = useState<CinematicTour | null>(null);
  const [activeWaypoint, setActiveWaypoint] = useState<number>(0);
  const [shareToast, setShareToast] = useState<string | null>(null);

  // Live Layer Data
  const [radioStations, setRadioStations] = useState<LiveRadioStation[]>([]);
  const [spaceLaunches, setSpaceLaunches] = useState<LiveSpaceLaunch[]>([]);
  const [militarySites, setMilitarySites] = useState<LiveMilitarySite[]>([]);
  const [cctvCameras, setCctvCameras] = useState<LiveCctvCamera[]>([]);
  const [activeFires, setActiveFires] = useState<LiveFirePoint[]>([]);

  // Layer Toggles
  const [enabledLayers, setEnabledLayers] = useState<Record<string, boolean>>({
    radio: false,
    launches: false,
    military: false,
    cctv: false,
    fires: false,
    traffic: false,
    bikeshare: false,
    aircraft: true,
    satellites: true,
  });

  // Telemetry HUD Readout
  const [cameraTelemetry, setCameraTelemetry] = useState<{
    lat: number;
    lng: number;
    alt: number;
    heading: number;
    pitch: number;
  }>({ lat: 0, lng: 0, alt: 10000000, heading: 0, pitch: -90 });

  // Screen-space bounding boxes for detection overlay
  const [detectionBoxes, setDetectionBoxes] = useState<
    { id: string; x: number; y: number; label: string; kind: string; tag: string }[]
  >([]);

  // ─────────────────────────────────────────────────────────────
  // 1. Initialize Cesium Viewer
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || viewerRef.current) return;

    const keys = getStoredClientKeys();
    if (keys.CESIUM_ION_TOKEN) {
      Cesium.Ion.defaultAccessToken = keys.CESIUM_ION_TOKEN;
    }

    const viewer = new Cesium.Viewer(containerRef.current, {
      animation: false,
      baseLayerPicker: false,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      navigationHelpButton: false,
      scene3DOnly: false,
      shouldAnimate: true,
      requestRenderMode: false,
    });

    // Dark atmosphere background
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString("#060a11");
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString("#060a11");
    viewer.scene.globe.enableLighting = dayNight;

    // Atmospheric fog styling
    if (viewer.scene.fog) {
      viewer.scene.fog.enabled = true;
      viewer.scene.fog.density = 0.00015;
      viewer.scene.fog.screenSpaceErrorFactor = 2.0;
    }

    // Initialize MapStackController
    const mapStack = new MapStackController(viewer, {
      cesiumIonToken: keys.CESIUM_ION_TOKEN,
      googleMapsKey: keys.GOOGLE_MAPS_KEY,
      basemapMode: "esri",
      is2d: flat,
    });
    mapStack.applyBasemap("esri");
    mapStackRef.current = mapStack;

    // Initialize CockpitController
    cockpitRef.current = new CockpitController(viewer);

    // Initialize SceneDirector
    const director = new SceneDirector(viewer);
    director.setWaypointCallback((tour, index) => {
      setActiveTour(tour);
      setActiveWaypoint(index);
    });
    directorRef.current = director;

    viewerRef.current = viewer;

    // Camera listener for telemetry & map center
    const onCameraChange = () => {
      const camera = viewer.camera;
      const carto = Cesium.Cartographic.fromCartesian(camera.positionWC);
      if (carto) {
        const lat = Cesium.Math.toDegrees(carto.latitude);
        const lng = Cesium.Math.toDegrees(carto.longitude);
        const alt = carto.height;
        const heading = Cesium.Math.toDegrees(camera.heading);
        const pitch = Cesium.Math.toDegrees(camera.pitch);

        setCameraTelemetry({ lat, lng, alt, heading, pitch });
        onMapCenter?.([lng, lat]);
      }
    };
    viewer.camera.changed.addEventListener(onCameraChange);

    // Entity Click-to-Track Handler
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
    handler.setInputAction((click: any) => {
      const pickedObject = viewer.scene.pick(click.position);
      if (Cesium.defined(pickedObject) && pickedObject.id) {
        const entity: Cesium.Entity = pickedObject.id;
        const entityData = (entity as any)._customData;
        if (entityData) {
          if (entityData.satellite) {
            onSelect?.(entityData.geoMarker, entityData.satellite);
            return;
          }
          setSelectedEntityData(entityData);
          cockpitRef.current?.trackEntity(entity, "orbit");
          setCockpitMode("orbit");

          if (entityData.geoMarker) {
            onSelect?.(entityData.geoMarker, entityData.satellite);
          }
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Set initial view
    viewer.camera.setView({
      destination: Cesium.Cartesian3.fromDegrees(target ? target[0] : 77.2, target ? target[1] : 28.6, 9500000),
    });
    setViewerReady(true);

    return () => {
      handler.destroy();
      viewer.destroy();
      viewerRef.current = null;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Public observations are supplied by the parent dashboard's sourced layers.
  // ─────────────────────────────────────────────────────────────
  // ─────────────────────────────────────────────────────────────
  // 3. GLSL Sensor Shader Post-Processing (CRT, NVG, FLIR, etc.)
  // ─────────────────────────────────────────────────────────────
  const applyVisualShader = useCallback((mode: VisualStyleMode) => {
    setVisualMode(mode);
    const viewer = viewerRef.current;
    if (!viewer) return;

    const stages = viewer.scene.postProcessStages;
    if (currentPostProcessStage.current) {
      stages.remove(currentPostProcessStage.current);
      currentPostProcessStage.current = null;
    }

    if (mode === "normal") return;

    const glsl = SHADER_SOURCES[mode];
    if (glsl) {
      const stage = new Cesium.PostProcessStage({
        fragmentShader: glsl,
      });
      stages.add(stage);
      currentPostProcessStage.current = stage;
    }
  }, []);

  // Hotkey listener for 1–7 optics, H (HUD), D (Detection), C (Cockpit), Esc (Exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger when typing in inputs
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === "1") applyVisualShader("normal");
      else if (e.key === "2") applyVisualShader("crt");
      else if (e.key === "3") applyVisualShader("nvg");
      else if (e.key === "4") applyVisualShader("flir");
      else if (e.key === "5") applyVisualShader("noir");
      else if (e.key === "6") applyVisualShader("snow");
      else if (e.key === "7") applyVisualShader("tactical");
      else if (e.key.toLowerCase() === "h") setHudActive((h) => !h);
      else if (e.key.toLowerCase() === "d") setDetectionActive((d) => !d);
      else if (e.key.toLowerCase() === "c") {
        if (selectedEntityData) {
          const nextMode: CameraFollowMode = cockpitMode === "orbit" ? "chase" : cockpitMode === "chase" ? "cockpit" : "orbit";
          setCockpitMode(nextMode);
          const entity = cockpitRef.current?.getTrackingEntity();
          if (entity) cockpitRef.current?.trackEntity(entity, nextMode);
        }
      } else if (e.key === "Escape") {
        cockpitRef.current?.stop();
        setSelectedEntityData(null);
        setCockpitMode("orbit");
        directorRef.current?.stop();
        setActiveTour(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [applyVisualShader, cockpitMode, selectedEntityData]);

  // ─────────────────────────────────────────────────────────────
  // 4. Update Camera on Target / Flat Changes
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    const previousZoom = previousZoomRef.current;
    previousZoomRef.current = zoom;
    if (!viewer || viewer.isDestroyed()) return;

    if (target) {
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(target[0], target[1], Math.max(150000, 9500000 / (zoom * zoom))),
        duration: 0.9,
      });
      return;
    }

    if (zoom !== previousZoom) {
      viewer.camera.cancelFlight();
      const height = viewer.camera.positionCartographic.height;
      const nextHeight = Math.max(150000, Math.min(30000000, height * previousZoom / zoom));
      if (nextHeight < height) viewer.camera.zoomIn(height - nextHeight);
      else viewer.camera.zoomOut(nextHeight - height);
      viewer.scene.requestRender();
    }
  }, [target, zoom]);

  useEffect(() => {
    mapStackRef.current?.set2DMode(flat);
  }, [flat]);

  // ─────────────────────────────────────────────────────────────
  // 5. Render Entities onto Cesium Globe
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    viewer.entities.removeAll();

    // A. Markers (Flights, Vessels, Hazards, Base, Infra, Conflict)
    markers.forEach((m) => {
      const isFlight = m.kind === "flight" || !!m.flight;
      const isVessel = m.kind === "vessel";
      const alt = isFlight && m.flight?.alt ? m.flight.alt : isFlight ? 10000 : 0;
      const position = Cesium.Cartesian3.fromDegrees(m.lon, m.lat, alt);

      let color = Cesium.Color.fromCssColorString(
        m.kind === "conflict" ? "#ef4444" :
        m.kind === "hazard" ? "#f59e0b" :
        m.kind === "flight" ? "#38bdf8" :
        m.kind === "vessel" ? "#34d399" :
        m.kind === "cable" ? "#a855f7" :
        "#94a3b8"
      );

      const entityOptions: Cesium.Entity.ConstructorOptions = {
        name: m.label,
        position,
        point: {
          pixelSize: isFlight || isVessel ? 7 : 6,
          color,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 1.5,
          scaleByDistance: new Cesium.NearFarScalar(1.5e2, 1.4, 8.0e6, 0.7),
        },
      };

      // If flight, orient model / icon along true real-world heading
      if (isFlight && m.heading !== undefined) {
        entityOptions.orientation = computeHeadingPitchRollOrientation(position, m.heading);
      }

      // Add fading telemetry trail if tracked
      if (isFlight || isVessel) {
        entityOptions.path = {
          resolution: 1,
          material: new Cesium.PolylineGlowMaterialProperty({
            glowPower: 0.25,
            color: color.withAlpha(0.65),
          }),
          width: 2.5,
          leadTime: 0,
          trailTime: 120,
        };
      }

      const entity = viewer.entities.add(entityOptions);
      (entity as any)._customData = {
        title: m.label,
        kind: m.kind,
        lat: m.lat,
        lng: m.lon,
        alt: alt,
        heading: m.heading,
        speed: m.flight?.speed_knots,
        detail: m.detail,
        geoMarker: m,
      };
    });

    // C. Radio Stations
    if (enabledLayers.radio) {
      radioStations.forEach((r) => {
        const pos = Cesium.Cartesian3.fromDegrees(r.lng, r.lat, 0);
        const entity = viewer.entities.add({
          name: r.name,
          position: pos,
          point: {
            pixelSize: 5,
            color: Cesium.Color.fromCssColorString("#ec4899"),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
          },
        });
        (entity as any)._customData = {
          title: r.name,
          kind: "radio",
          country: r.country,
          tags: r.tags,
          url: r.url,
          lat: r.lat,
          lng: r.lng,
        };
      });
    }

    // D. Space Launches
    if (enabledLayers.launches) {
      spaceLaunches.forEach((l) => {
        const pos = Cesium.Cartesian3.fromDegrees(l.lng, l.lat, 0);
        const entity = viewer.entities.add({
          name: l.name,
          position: pos,
          point: {
            pixelSize: 8,
            color: Cesium.Color.fromCssColorString("#f97316"),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1.5,
          },
        });
        (entity as any)._customData = {
          title: l.name,
          kind: "launch",
          status: l.status,
          pad: l.padName,
          net: l.net,
          lat: l.lat,
          lng: l.lng,
        };
      });
    }

    // E. Military Sites
    if (enabledLayers.military) {
      militarySites.forEach((m) => {
        const pos = Cesium.Cartesian3.fromDegrees(m.lng, m.lat, 0);
        const entity = viewer.entities.add({
          name: m.name,
          position: pos,
          point: {
            pixelSize: 7,
            color: Cesium.Color.fromCssColorString("#06b6d4"),
            outlineColor: Cesium.Color.BLACK,
            outlineWidth: 1,
          },
        });
        (entity as any)._customData = {
          title: m.name,
          kind: "military",
          type: m.type,
          operator: m.operator,
          country: m.country,
          lat: m.lat,
          lng: m.lng,
        };
      });
    }

    // F. Active Fires
    if (enabledLayers.fires) {
      activeFires.forEach((f) => {
        const pos = Cesium.Cartesian3.fromDegrees(f.lng, f.lat, 0);
        const entity = viewer.entities.add({
          name: `Thermal Anomaly · ${f.satellite}`,
          position: pos,
          point: {
            pixelSize: 6,
            color: Cesium.Color.fromCssColorString("#dc2626"),
            outlineColor: Cesium.Color.YELLOW,
            outlineWidth: 1,
          },
        });
        (entity as any)._customData = {
          title: `Active Fire (${f.confidence})`,
          kind: "fire",
          frp: f.frp,
          brightness: f.brightness,
          lat: f.lat,
          lng: f.lng,
        };
      });
    }

    // G. CCTV Cameras
    if (enabledLayers.cctv) {
      cctvCameras.forEach((c) => {
        const pos = Cesium.Cartesian3.fromDegrees(c.lng, c.lat, 10);
        const entity = viewer.entities.add({
          name: c.name,
          position: pos,
          point: {
            pixelSize: 6,
            color: Cesium.Color.fromCssColorString("#8b5cf6"),
            outlineColor: Cesium.Color.WHITE,
            outlineWidth: 1,
          },
        });
        (entity as any)._customData = {
          title: c.name,
          kind: "cctv",
          city: c.city,
          imageUrl: c.imageUrl,
          lat: c.lat,
          lng: c.lng,
        };
      });
    }
  }, [markers, radioStations, spaceLaunches, militarySites, activeFires, cctvCameras, enabledLayers]);

  // One GPU batch for the complete catalog. Ordinary marker updates do not
  // rebuild thousands of satellite entities.
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || viewer.isDestroyed() || !enabledLayers.satellites) return;
    const points = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection());
    for (const sat of satellites) {
      if (![sat.lat, sat.lng, sat.alt].every(Number.isFinite) || sat.alt <= 0) continue;
      const geoMarker: GeoMarker = { lon:sat.lng, lat:sat.lat, kind:"infra", label:sat.name, detail:`NORAD ${sat.noradId} · ${sat.alt.toFixed(0)} km · ${sat.category}` };
      points.add({
        position: Cesium.Cartesian3.fromDegrees(sat.lng, sat.lat, sat.alt * 1000),
        pixelSize: sat.category === "station" ? 6 : 2.5,
        color: Cesium.Color.fromCssColorString(sat.color || "#83d4ff").withAlpha(0.85),
        id: { _customData: { satellite:sat, geoMarker } },
      });
    }
    viewer.scene.requestRender();
    return () => { if (!viewer.isDestroyed()) viewer.scene.primitives.remove(points); };
  }, [satellites, enabledLayers.satellites, viewerReady]);

  // ─────────────────────────────────────────────────────────────
  // 6. Screen-Space Detection Overlay Projection
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !detectionActive) {
      setDetectionBoxes([]);
      return;
    }

    const scene = viewer.scene;
    const updateDetection = () => {
      const boxes: any[] = [];
      const entities = viewer.entities.values;

      for (let i = 0; i < Math.min(entities.length, 60); i++) {
        const ent = entities[i];
        const data = (ent as any)._customData;
        if (!data) continue;

        const pos = ent.position?.getValue(viewer.clock.currentTime);
        if (!pos) continue;

        const winPos = Cesium.SceneTransforms.worldToWindowCoordinates(scene, pos);
        if (winPos && winPos.x > 80 && winPos.x < scene.canvas.clientWidth - 80 && winPos.y > 80 && winPos.y < scene.canvas.clientHeight - 80) {
          boxes.push({
            id: ent.id,
            x: Math.round(winPos.x),
            y: Math.round(winPos.y),
            label: data.title || "ENTITY",
            kind: data.kind || "TGT",
            tag: data.alt ? `${Math.round(data.alt)}m` : data.status || "TRACKED",
          });
        }
      }
      setDetectionBoxes((previous) =>
        previous.length === boxes.length && previous.every((box, index) =>
          box.id === boxes[index].id &&
          box.x === boxes[index].x &&
          box.y === boxes[index].y &&
          box.label === boxes[index].label &&
          box.tag === boxes[index].tag
        ) ? previous : boxes
      );
    };

    scene.postRender.addEventListener(updateDetection);
    return () => {
      scene.postRender.removeEventListener(updateDetection);
    };
  }, [detectionActive]);

  // ─────────────────────────────────────────────────────────────
  // 7. Calculate 250km Contacts Roster
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedEntityData) {
      setNearbyContacts([]);
      return;
    }

    const centerLat = selectedEntityData.lat;
    const centerLng = selectedEntityData.lng;

    // Filter markers within ~250km (roughly 2.25 degrees)
    const contacts = markers
      .filter((m) => {
        const dLat = Math.abs(m.lat - centerLat);
        const dLng = Math.abs(m.lon - centerLng);
        return dLat < 2.5 && dLng < 2.5 && m.label !== selectedEntityData.title;
      })
      .slice(0, 10);

    setNearbyContacts(contacts);
  }, [selectedEntityData, markers]);

  // ─────────────────────────────────────────────────────────────
  // 8. Share Link Generator
  // ─────────────────────────────────────────────────────────────
  const copyShareLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set("lat", cameraTelemetry.lat.toFixed(4));
    url.searchParams.set("lng", cameraTelemetry.lng.toFixed(4));
    url.searchParams.set("alt", Math.round(cameraTelemetry.alt).toString());
    url.searchParams.set("heading", Math.round(cameraTelemetry.heading).toString());
    url.searchParams.set("optic", visualMode);
    if (selectedEntityData) {
      url.searchParams.set("tgt", selectedEntityData.title);
    }
    navigator.clipboard.writeText(url.toString());
    setShareToast("Shareable Tactical Link Copied to Clipboard!");
    setTimeout(() => setShareToast(null), 3000);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden" }}>
      {/* Cesium WebGL Canvas Container */}
      <div ref={containerRef} style={{ width: "100%", height: "100%", position: "absolute", inset: 0 }} />

      {/* ─────────────────────────────────────────────────────────────
          HUD OVERLAY: Screen-Space Detection Boxes (Hotkey D)
          ───────────────────────────────────────────────────────────── */}
      {detectionActive && (
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 15, overflow: "hidden" }}>
          {detectionBoxes.map((box) => (
            <div
              key={box.id}
              style={{
                position: "absolute",
                left: box.x,
                top: box.y,
                transform: "translate(-50%, -50%)",
                width: 44,
                height: 44,
                border: "1px dashed rgba(56, 189, 248, 0.4)",
                borderRadius: 4,
                pointerEvents: "none",
              }}
            >
              {/* Corner brackets */}
              <div style={{ position: "absolute", top: -2, left: -2, width: 6, height: 6, borderTop: "2px solid #38bdf8", borderLeft: "2px solid #38bdf8" }} />
              <div style={{ position: "absolute", top: -2, right: -2, width: 6, height: 6, borderTop: "2px solid #38bdf8", borderRight: "2px solid #38bdf8" }} />
              <div style={{ position: "absolute", bottom: -2, left: -2, width: 6, height: 6, borderBottom: "2px solid #38bdf8", borderLeft: "2px solid #38bdf8" }} />
              <div style={{ position: "absolute", bottom: -2, right: -2, width: 6, height: 6, borderBottom: "2px solid #38bdf8", borderRight: "2px solid #38bdf8" }} />

              {/* Tag Label */}
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginTop: 4,
                  whiteSpace: "nowrap",
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontWeight: 700,
                  color: "#38bdf8",
                  background: "rgba(10, 18, 30, 0.85)",
                  padding: "1px 5px",
                  borderRadius: 3,
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                }}
              >
                {box.label.slice(0, 18)} · {box.tag}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          INTELLIGENCE HUD / TACTICAL TELEMETRY READOUT (Hotkey H)
          ───────────────────────────────────────────────────────────── */}
      {hudActive && (
        <div
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 25,
            pointerEvents: "none",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "#94a3b8",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: "rgba(10, 16, 26, 0.72)",
            backdropFilter: "blur(16px)",
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#38bdf8", fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 8px #38bdf8" }} />
            <span>GOD'S EYE SPATIAL HUD</span>
            <span style={{ marginLeft: "auto", fontSize: 9, color: "#cbd5e1" }}>OPTIC: {visualMode.toUpperCase()}</span>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <span>LAT: <strong style={{ color: "#ffffff" }}>{cameraTelemetry.lat.toFixed(4)}°</strong></span>
            <span>LON: <strong style={{ color: "#ffffff" }}>{cameraTelemetry.lng.toFixed(4)}°</strong></span>
            <span>ALT: <strong style={{ color: "#ffffff" }}>{Math.round(cameraTelemetry.alt).toLocaleString()}m</strong></span>
          </div>

          <div style={{ display: "flex", gap: 12, fontSize: 9, color: "#64748b" }}>
            <span>HDG: {Math.round(cameraTelemetry.heading)}°</span>
            <span>PITCH: {Math.round(cameraTelemetry.pitch)}°</span>
            <span>HOTKEYS: [1-7] OPTICS · [H] HUD · [D] DETECT · [C] COCKPIT · [ESC]</span>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TOP QUICK CONTROLS BAR (Optics, 3D Basemaps, Director, Share, Power Up)
          ───────────────────────────────────────────────────────────── */}
      <div
        className="cesium-quick-controls"
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          zIndex: 28,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {/* Basemap Switcher */}
        <select
          value={basemapMode}
          onChange={(e) => {
            const mode = e.target.value as BasemapMode;
            setBasemapMode(mode);
            mapStackRef.current?.applyBasemap(mode);
          }}
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#ffffff",
            fontSize: 11,
            fontWeight: 600,
            padding: "7px 12px",
            borderRadius: 999,
            cursor: "pointer",
            outline: "none",
          }}
          title="Basemap Tier & 3D Mode"
        >
          <option value="esri">Earth imagery (auto)</option>
          <option value="osm">🗺️ OpenStreetMap (Fallback)</option>
          <option value="google3d">🏢 Google Photorealistic 3D</option>
          <option value="ion3d">🏔️ Cesium World Terrain (Ion)</option>
        </select>

        {/* Visual Sensor Optics Button */}
        <button
          onClick={() => setShowOpticsMenu((v) => !v)}
          style={{
            background: visualMode !== "normal" ? "rgba(56, 189, 248, 0.25)" : "rgba(15, 23, 42, 0.8)",
            borderColor: visualMode !== "normal" ? "#38bdf8" : "rgba(255, 255, 255, 0.12)",
            backdropFilter: "blur(16px)",
            border: "1px solid",
            color: "#ffffff",
            fontSize: 11,
            fontWeight: 600,
            padding: "7px 14px",
            borderRadius: 999,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Eye size={13} color={visualMode !== "normal" ? "#38bdf8" : "#94a3b8"} />
          <span>Optics: {visualMode.toUpperCase()}</span>
        </button>

        {/* Scene Director Tours */}
        <button
          onClick={() => setShowDirectorModal(true)}
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#ffffff",
            fontSize: 11,
            fontWeight: 600,
            padding: "7px 14px",
            borderRadius: 999,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          title="Cinematic Tours Director"
        >
          <Play size={13} color="#f59e0b" />
          <span>Director</span>
        </button>

        {/* Share Link */}
        <button
          onClick={copyShareLink}
          style={{
            background: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#ffffff",
            padding: "8px",
            borderRadius: "50%",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
          }}
          title="Share View Link"
        >
          <Share2 size={14} color="#94a3b8" />
        </button>

        {/* POWER UP chip */}
        <button
          onClick={onOpenPowerUp}
          style={{
            background: "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)",
            border: "none",
            color: "#ffffff",
            fontSize: 11,
            fontWeight: 700,
            padding: "7px 14px",
            borderRadius: 999,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 0 16px rgba(56, 189, 248, 0.4)",
          }}
          title="Add Optional API Keys"
        >
          <Sparkles size={13} />
          <span>POWER UP</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          OPTICS SENSOR SHADERS POPUP MENU
          ───────────────────────────────────────────────────────────── */}
      {showOpticsMenu && (
        <div
          className="cesium-optics-menu"
          style={{
            position: "absolute",
            top: 56,
            right: 140,
            zIndex: 35,
            background: "rgba(15, 23, 42, 0.95)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
            borderRadius: 16,
            padding: 12,
            width: 280,
            boxShadow: "0 20px 40px rgba(0,0,0,0.6)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#ffffff", marginBottom: 4 }}>
            <span>SENSOR OPTICS (GLSL)</span>
            <button onClick={() => setShowOpticsMenu(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>✕</button>
          </div>
          {SHADER_MODES.map((sm) => (
            <button
              key={sm.id}
              onClick={() => {
                applyVisualShader(sm.id);
                setShowOpticsMenu(false);
              }}
              style={{
                background: visualMode === sm.id ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.04)",
                border: visualMode === sm.id ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.06)",
                borderRadius: 8,
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div style={{ display: "flex", width: "100%", justifyContent: "space-between" }}>
                <strong style={{ color: visualMode === sm.id ? "#38bdf8" : "#ffffff", fontSize: 12 }}>{sm.name}</strong>
                <span style={{ fontFamily: "monospace", fontSize: 10, color: "#94a3b8" }}>[{sm.key}]</span>
              </div>
              <small style={{ color: "#94a3b8", fontSize: 10, marginTop: 2 }}>{sm.description}</small>
            </button>
          ))}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TRACKED CONTACT TELEMETRY CARD & COCKPIT CONTROLLER
          ───────────────────────────────────────────────────────────── */}
      {selectedEntityData && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 92,
            zIndex: 32,
            background: "rgba(15, 23, 42, 0.94)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(56, 189, 248, 0.4)",
            borderRadius: 18,
            padding: 16,
            width: 320,
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7)",
            color: "#ffffff",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#38bdf8", boxShadow: "0 0 10px #38bdf8" }} />
              <strong style={{ fontSize: 14 }}>{selectedEntityData.title}</strong>
            </div>
            <button
              onClick={() => {
                cockpitRef.current?.stop();
                setSelectedEntityData(null);
                setCockpitMode("orbit");
              }}
              style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 14 }}
            >
              ✕
            </button>
          </div>

          <p style={{ fontSize: 11, color: "#94a3b8", margin: "0 0 10px", lineHeight: 1.4 }}>
            {selectedEntityData.detail || `Active tracked target in live sector.`}
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 10, fontFamily: "monospace", marginBottom: 12 }}>
            <div><span style={{ color: "#64748b" }}>LAT/LNG: </span>{selectedEntityData.lat?.toFixed(3)}°, {selectedEntityData.lng?.toFixed(3)}°</div>
            <div><span style={{ color: "#64748b" }}>ALT: </span>{selectedEntityData.alt ? `${Math.round(selectedEntityData.alt)}m` : "—"}</div>
            <div><span style={{ color: "#64748b" }}>SPEED: </span>{selectedEntityData.speed ? `${Math.round(selectedEntityData.speed)}kt` : "—"}</div>
            <div><span style={{ color: "#64748b" }}>HDG: </span>{selectedEntityData.heading ? `${Math.round(selectedEntityData.heading)}°` : "—"}</div>
          </div>

          {/* Action Row: Cockpit Toggle & Contacts */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => {
                const nextMode: CameraFollowMode = cockpitMode === "orbit" ? "chase" : cockpitMode === "chase" ? "cockpit" : "orbit";
                setCockpitMode(nextMode);
                const entity = cockpitRef.current?.getTrackingEntity();
                if (entity) cockpitRef.current?.trackEntity(entity, nextMode);
              }}
              style={{
                flex: 1,
                background: cockpitMode !== "orbit" ? "linear-gradient(135deg, #0284c7 0%, #38bdf8 100%)" : "rgba(255, 255, 255, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                color: "#ffffff",
                padding: "8px 0",
                borderRadius: 999,
                fontWeight: 700,
                fontSize: 11,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span>🛩️ {cockpitMode === "orbit" ? "ENTER COCKPIT" : cockpitMode === "chase" ? "CHASE VIEW" : "ORBIT CAM"}</span>
            </button>

            {nearbyContacts.length > 0 && (
              <button
                onClick={() => setShowContactsPanel((p) => !p)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "#38bdf8",
                  padding: "8px 12px",
                  borderRadius: 999,
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: "pointer",
                }}
                title="Contacts within 250km"
              >
                📡 {nearbyContacts.length} Near
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          250KM CONTACTS ROSTER PANEL
          ───────────────────────────────────────────────────────────── */}
      {showContactsPanel && nearbyContacts.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 140,
            left: 92,
            zIndex: 33,
            background: "rgba(11, 18, 28, 0.96)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            borderRadius: 16,
            padding: 12,
            width: 300,
            boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 11, fontWeight: 700, color: "#38bdf8" }}>
            <span>CONTACTS WITHIN 250 KM</span>
            <button onClick={() => setShowContactsPanel(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>✕</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
            {nearbyContacts.map((c) => (
              <div
                key={c.label}
                onClick={() => {
                  const ent = viewerRef.current?.entities.values.find((e) => (e as any)._customData?.title === c.label);
                  if (ent) {
                    cockpitRef.current?.trackEntity(ent, cockpitMode);
                    setSelectedEntityData((ent as any)._customData);
                  }
                }}
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  padding: "6px 8px",
                  borderRadius: 6,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  fontSize: 10,
                  color: "#cbd5e1",
                }}
              >
                <strong>{c.label}</strong>
                <span style={{ color: "#38bdf8" }}>{c.kind.toUpperCase()} ➔</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          SCENE DIRECTOR MODAL
          ───────────────────────────────────────────────────────────── */}
      {showDirectorModal && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.65)",
            backdropFilter: "blur(14px)",
            zIndex: 60,
            display: "grid",
            placeItems: "center",
          }}
          onClick={() => setShowDirectorModal(false)}
        >
          <div
            style={{
              background: "rgba(15, 23, 42, 0.96)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 20,
              padding: 24,
              width: 480,
              boxShadow: "0 25px 60px rgba(0,0,0,0.8)",
              color: "#ffffff",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Play size={16} color="#f59e0b" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>SCENE DIRECTOR · CAMERA TOURS</h3>
              </div>
              <button onClick={() => setShowDirectorModal(false)} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>

            <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 16px" }}>
              Experience high-altitude scripted drone tours and orbital pan sweeps across critical geostrategic corridors.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {CINEMATIC_TOURS.map((tour) => (
                <div
                  key={tour.id}
                  style={{
                    background: activeTour?.id === tour.id ? "rgba(245, 158, 11, 0.15)" : "rgba(255, 255, 255, 0.04)",
                    border: activeTour?.id === tour.id ? "1px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: 12,
                    padding: 14,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13, display: "block" }}>{tour.name}</strong>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{tour.description}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (activeTour?.id === tour.id && directorRef.current?.getIsRunning()) {
                        directorRef.current?.stop();
                        setActiveTour(null);
                      } else {
                        directorRef.current?.playTour(tour);
                        setShowDirectorModal(false);
                      }
                    }}
                    style={{
                      background: activeTour?.id === tour.id ? "#ef4444" : "#f59e0b",
                      border: "none",
                      color: "#0f172a",
                      fontWeight: 700,
                      fontSize: 11,
                      padding: "6px 14px",
                      borderRadius: 999,
                      cursor: "pointer",
                    }}
                  >
                    {activeTour?.id === tour.id ? "STOP" : "FLY TOUR"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Share Toast */}
      {shareToast && (
        <div
          style={{
            position: "absolute",
            bottom: 30,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#38bdf8",
            color: "#0f172a",
            fontWeight: 700,
            fontSize: 12,
            padding: "8px 18px",
            borderRadius: 999,
            boxShadow: "0 10px 30px rgba(56, 189, 248, 0.5)",
            zIndex: 70,
          }}
        >
          {shareToast}
        </div>
      )}
    </div>
  );
}
