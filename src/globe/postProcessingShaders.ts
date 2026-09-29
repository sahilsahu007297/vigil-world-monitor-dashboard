// GLSL Post-Processing Shaders for Sensor & Visual Style Modes
// 1: Normal, 2: CRT, 3: NVG, 4: FLIR (Ironbow Thermal), 5: Noir, 6: Snow, 7: Tactical Phosphor

export type VisualStyleMode = "normal" | "crt" | "nvg" | "flir" | "noir" | "snow" | "tactical";

export const SHADER_MODES: { id: VisualStyleMode; name: string; key: string; description: string }[] = [
  { id: "normal", name: "NATURAL", key: "1", description: "Standard True-Color Satellite & 3D Optics" },
  { id: "crt", name: "CRT / MONITOR", key: "2", description: "Raster Scanlines, Tube Curvature & Chromatic Aberration" },
  { id: "nvg", name: "NVG / NIGHT VISION", key: "3", description: "Gen-3 Phosphor Green, Grain Scintillation & Vignette" },
  { id: "flir", name: "FLIR / THERMAL", key: "4", description: "Ironbow Radiometric Thermal False-Color Mapping" },
  { id: "noir", name: "NOIR / RECON", key: "5", description: "High-Contrast Panchromatic Monochrome with Film Grain" },
  { id: "snow", name: "ARCTIC / SNOW", key: "6", description: "Frost-Glazed Polar Desaturation & Haze" },
  { id: "tactical", name: "TACTICAL AMBER", key: "7", description: "Military HUD Vector Phosphor Glow" },
];

export const SHADER_SOURCES: Record<VisualStyleMode, string> = {
  normal: `
    uniform sampler2D colorTexture;
    in vec2 v_textureCoordinates;
    out vec4 fragColor;
    void main() {
      fragColor = texture(colorTexture, v_textureCoordinates);
    }
  `,

  crt: `
    uniform sampler2D colorTexture;
    in vec2 v_textureCoordinates;
    out vec4 fragColor;

    vec2 curve(vec2 uv) {
      uv = (uv - 0.5) * 2.0;
      uv *= 1.1;
      uv.x *= 1.0 + pow((abs(uv.y) / 5.0), 2.0);
      uv.y *= 1.0 + pow((abs(uv.x) / 4.0), 2.0);
      uv = (uv / 2.0) + 0.5;
      return uv;
    }

    void main() {
      vec2 uv = curve(v_textureCoordinates);
      if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
        fragColor = vec4(0.02, 0.03, 0.05, 1.0);
        return;
      }

      // Chromatic Aberration
      float shift = 0.0018;
      float r = texture(colorTexture, uv + vec2(shift, 0.0)).r;
      float g = texture(colorTexture, uv).g;
      float b = texture(colorTexture, uv - vec2(shift, 0.0)).b;
      vec3 color = vec3(r, g, b);

      // Scanlines
      float scanline = sin(uv.y * 700.0) * 0.12;
      color -= scanline;

      // Subtle vignette
      float vignette = uv.x * (1.0 - uv.x) * uv.y * (1.0 - uv.y) * 16.0;
      color *= clamp(pow(vignette, 0.25), 0.0, 1.0);

      // Contrast boost
      color = pow(color, vec3(0.92));
      fragColor = vec4(color, 1.0);
    }
  `,

  nvg: `
    uniform sampler2D colorTexture;
    in vec2 v_textureCoordinates;
    out vec4 fragColor;

    float pseudoNoise(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec4 base = texture(colorTexture, v_textureCoordinates);
      float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));

      // Intensifier gain boost
      lum = pow(lum * 1.55, 0.78);

      // Night vision phosphor color palette (P43 Phosphor Green)
      vec3 nvgGreen = vec3(0.18, 0.98, 0.32);
      vec3 color = lum * nvgGreen;

      // Scintillation / photocathode grain
      float noise = pseudoNoise(v_textureCoordinates * 800.0);
      color += (noise - 0.5) * 0.08;

      // Peripheral intensifier tube vignette
      vec2 uv = v_textureCoordinates - 0.5;
      float dist = length(uv);
      float vig = smoothstep(0.48, 0.15, dist);
      color *= vig;

      fragColor = vec4(color, 1.0);
    }
  `,

  flir: `
    uniform sampler2D colorTexture;
    in vec2 v_textureCoordinates;
    out vec4 fragColor;

    // Ironbow false color gradient mapping (Thermal radiometric palette)
    vec3 ironbow(float t) {
      t = clamp(t, 0.0, 1.0);
      vec3 c0 = vec3(0.04, 0.02, 0.12); // Deep Black/Purple (Cold)
      vec3 c1 = vec3(0.36, 0.05, 0.48); // Violet
      vec3 c2 = vec3(0.85, 0.20, 0.15); // Crimson
      vec3 c3 = vec3(0.98, 0.65, 0.08); // Hot Amber
      vec3 c4 = vec3(1.00, 0.98, 0.70); // White Hot

      if (t < 0.25) return mix(c0, c1, t / 0.25);
      if (t < 0.50) return mix(c1, c2, (t - 0.25) / 0.25);
      if (t < 0.75) return mix(c2, c3, (t - 0.50) / 0.25);
      return mix(c3, c4, (t - 0.75) / 0.25);
    }

    void main() {
      vec4 base = texture(colorTexture, v_textureCoordinates);
      float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));
      
      // Dynamic radiometric thermal curve
      float temp = pow(lum, 1.15);
      vec3 thermalColor = ironbow(temp);

      fragColor = vec4(thermalColor, 1.0);
    }
  `,

  noir: `
    uniform sampler2D colorTexture;
    in vec2 v_textureCoordinates;
    out vec4 fragColor;

    void main() {
      vec4 base = texture(colorTexture, v_textureCoordinates);
      float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));

      // High contrast S-curve
      lum = smoothstep(0.12, 0.88, lum);

      // Subtle vignette
      vec2 uv = v_textureCoordinates - 0.5;
      float vig = clamp(1.0 - length(uv) * 0.75, 0.0, 1.0);
      lum *= vig;

      fragColor = vec4(vec3(lum), 1.0);
    }
  `,

  snow: `
    uniform sampler2D colorTexture;
    in vec2 v_textureCoordinates;
    out vec4 fragColor;

    void main() {
      vec4 base = texture(colorTexture, v_textureCoordinates);
      float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));

      // Frost desaturation with cold blue-white lift
      vec3 arctic = mix(base.rgb, vec3(lum), 0.75);
      arctic = mix(arctic, vec3(0.78, 0.88, 1.0), 0.28);
      arctic = clamp(arctic * 1.12, 0.0, 1.0);

      fragColor = vec4(arctic, 1.0);
    }
  `,

  tactical: `
    uniform sampler2D colorTexture;
    in vec2 v_textureCoordinates;
    out vec4 fragColor;

    void main() {
      vec4 base = texture(colorTexture, v_textureCoordinates);
      float lum = dot(base.rgb, vec3(0.299, 0.587, 0.114));
      lum = pow(lum, 1.25);

      // Amber tactical phosphor
      vec3 amber = vec3(1.0, 0.72, 0.18) * lum * 1.35;

      // Fine grid reticle
      vec2 grid = fract(v_textureCoordinates * 120.0);
      float line = step(0.96, grid.x) + step(0.96, grid.y);
      amber += line * vec3(0.15, 0.10, 0.02);

      fragColor = vec4(amber, 1.0);
    }
  `,
};
