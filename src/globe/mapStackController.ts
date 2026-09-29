// Map Stack Controller — Basemap switching, Photorealistic 3D Tiles, Keyless Terrain & Fallbacks
import * as Cesium from "cesium";

export type BasemapMode = "esri" | "osm" | "google3d" | "ion3d";

export interface MapStackConfig {
  cesiumIonToken?: string;
  googleMapsKey?: string;
  basemapMode: BasemapMode;
  is2d: boolean;
}

export class MapStackController {
  private viewer: Cesium.Viewer;
  private currentTileset: Cesium.Cesium3DTileset | null = null;
  private currentImageryLayer: Cesium.ImageryLayer | null = null;
  private config: MapStackConfig;

  constructor(viewer: Cesium.Viewer, initialConfig: MapStackConfig) {
    this.viewer = viewer;
    this.config = initialConfig;
  }

  public async applyBasemap(mode: BasemapMode): Promise<void> {
    if (this.viewer.isDestroyed()) return;
    this.config.basemapMode = mode;
    const scene = this.viewer.scene;

    // Remove existing 3D tileset if present
    if (this.currentTileset) {
      scene.primitives.remove(this.currentTileset);
      this.currentTileset = null;
    }

    // Set Cesium Ion token if present
    if (this.config.cesiumIonToken) {
      Cesium.Ion.defaultAccessToken = this.config.cesiumIonToken;
    }

    switch (mode) {
      case "google3d": {
        try {
          // Attempt Google Photorealistic 3D Tiles
          const options: any = {};
          if (this.config.googleMapsKey) {
            options.key = this.config.googleMapsKey;
          }
          const tileset = await Cesium.createGooglePhotorealistic3DTileset(options);
          if (this.viewer.isDestroyed()) { tileset.destroy(); return; }
          this.currentTileset = scene.primitives.add(tileset);
          this.viewer.scene.globe.show = false; // Hide base globe under photorealistic 3D
          return;
        } catch (err) {
          if (this.viewer.isDestroyed()) return;
          console.warn("[MapStack] Google 3D Tiles unavailable, falling back to Esri Satellite:", err);
          // Fallback to Esri
          return this.applyBasemap("esri");
        }
      }

      case "ion3d": {
        try {
          if (!this.config.cesiumIonToken) {
            throw new Error("Cesium Ion token required for ion3d mode");
          }
          const terrain = await Cesium.createWorldTerrainAsync();
          if (this.viewer.isDestroyed()) return;
          this.viewer.terrainProvider = terrain;
          this.viewer.scene.globe.show = true;
          await this.setBaseImagery("esri");
          return;
        } catch (err) {
          if (this.viewer.isDestroyed()) return;
          console.warn("[MapStack] Cesium Ion World Terrain unavailable, falling back to keyless ellipsoid:", err);
          return this.applyBasemap("esri");
        }
      }

      case "osm": {
        this.viewer.scene.globe.show = true;
        this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        await this.setBaseImagery("osm");
        return;
      }

      case "esri":
      default: {
        this.viewer.scene.globe.show = true;
        this.viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
        await this.setBaseImagery("esri");
        return;
      }
    }
  }

  private async setBaseImagery(source: "esri" | "osm"): Promise<void> {
    if (this.viewer.isDestroyed()) return;
    const layers = this.viewer.imageryLayers;
    layers.removeAll();

    // Keep a bundled Earth basemap visible even when external imagery is slow or blocked.
    try {
      const localEarth = await Cesium.TileMapServiceImageryProvider.fromUrl('/cesium/Assets/Textures/NaturalEarthII');
      if (this.viewer.isDestroyed()) return;
      layers.addImageryProvider(localEarth);
    } catch (error) {
      console.warn('[MapStack] Bundled Earth imagery unavailable:', error);
    }

    if (source === "esri") {
      try {
        const esriProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
          "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer",
          { enablePickFeatures: false }
        );
        if (this.viewer.isDestroyed()) return;
        this.currentImageryLayer = layers.addImageryProvider(esriProvider);
      } catch (err) {
        if (this.viewer.isDestroyed()) return;
        console.warn("[MapStack] Esri World Imagery failed, falling back to OSM:", err);
        await this.setBaseImagery("osm");
      }
    } else {
      const osmProvider = new Cesium.UrlTemplateImageryProvider({
        url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        credit: new Cesium.Credit("© OpenStreetMap contributors"),
        maximumLevel: 19,
      });
      this.currentImageryLayer = layers.addImageryProvider(osmProvider);
    }
  }

  public set2DMode(is2d: boolean) {
    if (this.viewer.isDestroyed()) return;
    this.config.is2d = is2d;
    if (is2d) {
      this.viewer.scene.mode = Cesium.SceneMode.SCENE2D;
    } else {
      this.viewer.scene.mode = Cesium.SceneMode.SCENE3D;
    }
  }

  public updateCredentials(ionToken?: string, googleKey?: string) {
    if (ionToken !== undefined) this.config.cesiumIonToken = ionToken;
    if (googleKey !== undefined) this.config.googleMapsKey = googleKey;
    if (this.config.cesiumIonToken) {
      Cesium.Ion.defaultAccessToken = this.config.cesiumIonToken;
    }
  }

  public getCurrentMode(): BasemapMode {
    return this.config.basemapMode;
  }
}
