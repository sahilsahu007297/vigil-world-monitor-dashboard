// World-Stable Icon Orientation & Motion Dead-Reckoning Interpolation
import * as Cesium from "cesium";

/**
 * Calculates a Cesium Quaternion that aligns a model or billboard with a given heading, pitch, and roll in ENU space.
 */
export function computeHeadingPitchRollOrientation(
  position: Cesium.Cartesian3,
  headingDegrees: number,
  pitchDegrees: number = 0,
  rollDegrees: number = 0
): Cesium.Quaternion {
  const heading = Cesium.Math.toRadians(headingDegrees);
  const pitch = Cesium.Math.toRadians(pitchDegrees);
  const roll = Cesium.Math.toRadians(rollDegrees);
  const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
  return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
}

export interface TelemetryFix {
  lat: number;
  lng: number;
  altMeters: number;
  heading: number;
  speedKnots: number;
  timestamp: number;
}

export class EntityMotionInterpolator {
  private lastFix: TelemetryFix | null = null;
  private currentFix: TelemetryFix | null = null;

  public updateFix(fix: TelemetryFix) {
    if (!this.currentFix) {
      this.currentFix = fix;
      this.lastFix = fix;
    } else {
      this.lastFix = this.currentFix;
      this.currentFix = fix;
    }
  }

  /**
   * Evaluates estimated position at time `now`, dead-reckoning forward based on speed and heading.
   */
  public evaluate(now: number = Date.now()): { lat: number; lng: number; altMeters: number; heading: number } | null {
    if (!this.currentFix) return null;
    if (!this.lastFix) return this.currentFix;

    const timeSinceFixSec = Math.max(0, (now - this.currentFix.timestamp) / 1000);
    // If fix is recent (under 60s), dead-reckon forward along heading
    if (timeSinceFixSec > 0 && timeSinceFixSec < 60 && this.currentFix.speedKnots > 0) {
      const speedMetersPerSec = this.currentFix.speedKnots * 0.514444;
      const distanceMeters = speedMetersPerSec * timeSinceFixSec;
      
      const radHeading = Cesium.Math.toRadians(this.currentFix.heading);
      const earthRadius = 6378137.0; // meters

      const dLat = (distanceMeters * Math.cos(radHeading)) / earthRadius;
      const dLng = (distanceMeters * Math.sin(radHeading)) / (earthRadius * Math.cos(Cesium.Math.toRadians(this.currentFix.lat)));

      const estimatedLat = this.currentFix.lat + Cesium.Math.toDegrees(dLat);
      const estimatedLng = this.currentFix.lng + Cesium.Math.toDegrees(dLng);

      return {
        lat: estimatedLat,
        lng: estimatedLng,
        altMeters: this.currentFix.altMeters,
        heading: this.currentFix.heading,
      };
    }

    return {
      lat: this.currentFix.lat,
      lng: this.currentFix.lng,
      altMeters: this.currentFix.altMeters,
      heading: this.currentFix.heading,
    };
  }
}
