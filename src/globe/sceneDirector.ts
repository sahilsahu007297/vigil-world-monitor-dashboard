// Scene Director — Cinematic Camera Tours & Scripted Flythroughs
import * as Cesium from "cesium";

export interface CinematicWaypoint {
  lat: number;
  lng: number;
  height: number;
  heading: number;
  pitch: number;
  duration: number; // seconds
  title: string;
  description: string;
}

export interface CinematicTour {
  id: string;
  name: string;
  description: string;
  waypoints: CinematicWaypoint[];
}

export const CINEMATIC_TOURS: CinematicTour[] = [
  {
    id: "orbital-watch",
    name: "Orbital Global Watch",
    description: "Wide orbital pan across major geopolitical theater corridors",
    waypoints: [
      { lat: 25.0, lng: 55.0, height: 18000000, heading: 0, pitch: -88, duration: 4, title: "Global Operating Picture", description: "Synoptic view of Eurasia and maritime trade chokepoints." },
      { lat: 12.5, lng: 43.5, height: 850000, heading: 320, pitch: -45, duration: 5, title: "Bab-el-Mandeb Strait", description: "Southern gateway to the Red Sea and Suez Canal transit lane." },
      { lat: 26.5, lng: 56.2, height: 600000, heading: 35, pitch: -38, duration: 5, title: "Strait of Hormuz", description: "Critical energy corridor carrying ~20% of global petroleum consumption." },
      { lat: 1.3, lng: 103.8, height: 750000, heading: 110, pitch: -40, duration: 5, title: "Malacca Strait", description: "Principal maritime route connecting the Indian and Pacific Oceans." },
      { lat: 24.0, lng: 121.0, height: 900000, heading: 25, pitch: -42, duration: 5, title: "Taiwan Strait & Pacific Ridge", description: "Semiconductor supply chain epicenter and critical maritime corridor." },
    ],
  },
  {
    id: "tokyo-megacity",
    name: "Tokyo 3D Megacity",
    description: "Photorealistic descent into Tokyo Bay, Haneda, and Shibuya",
    waypoints: [
      { lat: 35.6895, lng: 139.6917, height: 25000, heading: 140, pitch: -60, duration: 4, title: "Tokyo Metropolitan Basin", description: "High-density urban infrastructure and coastal logistics." },
      { lat: 35.5494, lng: 139.7798, height: 2500, heading: 220, pitch: -25, duration: 5, title: "Tokyo Haneda (HND)", description: "Major trans-Pacific and domestic commercial aviation hub." },
      { lat: 35.6586, lng: 139.7454, height: 1200, heading: 340, pitch: -20, duration: 5, title: "Minato / Tokyo Tower", description: "Central commercial core and communications infrastructure." },
    ],
  },
  {
    id: "himalayan-ridge",
    name: "Himalayan Geostrategy",
    description: "High-altitude sweep across the Tibetan Plateau and border passes",
    waypoints: [
      { lat: 27.9881, lng: 86.9250, height: 45000, heading: 280, pitch: -30, duration: 5, title: "Mount Everest / Sagarmatha", description: "Crown of the Great Himalaya and high-altitude watershed." },
      { lat: 34.0, lng: 77.5, height: 35000, heading: 310, pitch: -25, duration: 5, title: "Ladakh & Pangong Tso", description: "High-altitude strategic border corridor and mountain passes." },
    ],
  },
];

export class SceneDirector {
  private viewer: Cesium.Viewer;
  private isRunning: boolean = false;
  private currentTour: CinematicTour | null = null;
  private currentWaypointIndex: number = 0;
  private onWaypointChange?: (tour: CinematicTour, index: number) => void;

  constructor(viewer: Cesium.Viewer) {
    this.viewer = viewer;
  }

  public setWaypointCallback(cb: (tour: CinematicTour, index: number) => void) {
    this.onWaypointChange = cb;
  }

  public playTour(tour: CinematicTour) {
    this.isRunning = true;
    this.currentTour = tour;
    this.currentWaypointIndex = 0;
    this.flyToNextWaypoint();
  }

  private flyToNextWaypoint() {
    if (!this.isRunning || !this.currentTour) return;
    if (this.currentWaypointIndex >= this.currentTour.waypoints.length) {
      // Loop or stop
      this.currentWaypointIndex = 0;
    }

    const wp = this.currentTour.waypoints[this.currentWaypointIndex];
    this.onWaypointChange?.(this.currentTour, this.currentWaypointIndex);

    this.viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(wp.lng, wp.lat, wp.height),
      orientation: {
        heading: Cesium.Math.toRadians(wp.heading),
        pitch: Cesium.Math.toRadians(wp.pitch),
        roll: 0,
      },
      duration: wp.duration,
      complete: () => {
        if (!this.isRunning) return;
        this.currentWaypointIndex++;
        // Wait 2 seconds at waypoint before moving
        setTimeout(() => {
          if (this.isRunning) this.flyToNextWaypoint();
        }, 2200);
      },
    });
  }

  public stop() {
    this.isRunning = false;
    this.viewer.camera.cancelFlight();
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getCurrentTour(): CinematicTour | null {
    return this.currentTour;
  }

  public getCurrentWaypointIndex(): number {
    return this.currentWaypointIndex;
  }
}
