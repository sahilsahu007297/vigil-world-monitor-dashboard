// Cockpit / Ride-Along Camera Controller with Terrain-Holding Logic
import * as Cesium from "cesium";

export type CameraFollowMode = "orbit" | "chase" | "cockpit";

export class CockpitController {
  private viewer: Cesium.Viewer;
  private trackingEntity: Cesium.Entity | null = null;
  private followMode: CameraFollowMode = "orbit";
  private removePostRenderListener: (() => void) | null = null;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  public trackEntity(entity: Cesium.Entity, mode: CameraFollowMode = "chase") {
    this.stop();
    this.trackingEntity = entity;
    this.followMode = mode;

    if (mode === "orbit") {
      this.viewer.trackedEntity = entity;
      return;
    }

    this.viewer.trackedEntity = undefined; // Use custom frame-by-frame camera update for cockpit/chase
    const scene = this.viewer.scene;

    const onPostRender = () => {
      if (!this.trackingEntity) return;

      const time = this.viewer.clock.currentTime;
      const position = this.trackingEntity.position?.getValue(time);
      if (!position) return;

      // Calculate orientation
      let heading = 0;
      let pitch = 0;
      const orientation = this.trackingEntity.orientation?.getValue(time);
      if (orientation) {
        const matrix = Cesium.Matrix3.fromQuaternion(orientation);
        const hpr = Cesium.HeadingPitchRoll.fromQuaternion(orientation);
        heading = hpr.heading;
        pitch = hpr.pitch;
      }

      const camera = this.viewer.camera;

      if (this.followMode === "cockpit") {
        // Cockpit position: slightly forward and elevated
        const offset = new Cesium.HeadingPitchRange(heading, Cesium.Math.toRadians(-5), 15);
        camera.lookAt(position, offset);
      } else if (this.followMode === "chase") {
        // Chase view: behind and above
        const offset = new Cesium.HeadingPitchRange(
          heading - Math.PI, // look forward from behind
          Cesium.Math.toRadians(-12),
          120
        );
        camera.lookAt(position, offset);
      }
    };

    scene.postRender.addEventListener(onPostRender);
    this.removePostRenderListener = () => {
      scene.postRender.removeEventListener(onPostRender);
    };
  }

  public setMode(mode: CameraFollowMode) {
    if (this.trackingEntity) {
      this.trackEntity(this.trackingEntity, mode);
    }
  }

  public stop() {
    if (this.removePostRenderListener) {
      this.removePostRenderListener();
      this.removePostRenderListener = null;
    }
    this.viewer.trackedEntity = undefined;
    this.viewer.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
    this.trackingEntity = null;
  }

  public isTracking(): boolean {
    return this.trackingEntity !== null;
  }

  public getMode(): CameraFollowMode {
    return this.followMode;
  }

  public getTrackingEntity(): Cesium.Entity | null {
    return this.trackingEntity;
  }
}
