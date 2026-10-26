import { AdditiveBlending, Color, DoubleSide, ShaderMaterial, Vector2 } from 'three';

/**
 * The two materials a noise contour is drawn with. Both share these uniforms, which the contour
 * updates every frame: the mission time, where the sound comes from across the ground, and how
 * loud it is here, from 0 when the carrier is far away to 1 when it is overhead.
 */
const uniforms = (color: string, unitsPerMeter: number) => ({
  uColor: { value: new Color(color) },
  uTime: { value: 0 },
  uSource: { value: new Vector2() },
  uLoud: { value: 0 },
  uMeter: { value: unitsPerMeter },
});

export type NoiseUniforms = ReturnType<typeof uniforms>;

/**
 * The ground inside the contour: a faint wash of its colour, and rings of sound travelling out
 * from the carrier. The rings fade with distance and with the carrier's, so the area lights up
 * as the flight arrives over it and settles as it leaves.
 */
export function groundMaterial(color: string, unitsPerMeter: number) {
  return new ShaderMaterial({
    uniforms: uniforms(color, unitsPerMeter),
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    vertexShader: /* glsl */ `
      varying vec2 vGround;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vGround = world.xz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform vec2 uSource;
      uniform float uLoud;
      uniform float uMeter;
      varying vec2 vGround;
      void main() {
        float metres = distance(vGround, uSource) / uMeter;
        // Rings 16 m apart, moving outwards, with a sharp front and a soft tail behind it.
        float phase = fract(metres / 16.0 - uTime * 0.8);
        float ring = smoothstep(0.45, 0.96, phase) * (1.0 - smoothstep(0.96, 1.0, phase));
        float carry = 1.0 / (1.0 + metres / 140.0);
        float wave = ring * carry * uLoud;
        gl_FragColor = vec4(uColor * (1.0 + wave), 0.1 + 0.06 * uLoud + 0.5 * wave);
        #include <colorspace_fragment>
      }`,
  });
}

/**
 * A glowing curtain standing on the contour's edge: the line the sound does not cross. It glows
 * brightest at the foot, fades upwards, and shimmers along its length while the flight is near.
 */
export function edgeMaterial(color: string, unitsPerMeter: number) {
  return new ShaderMaterial({
    uniforms: uniforms(color, unitsPerMeter),
    transparent: true,
    depthWrite: false,
    side: DoubleSide,
    blending: AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute float rise;
      attribute float along;
      varying float vRise;
      varying float vAlong;
      void main() {
        vRise = rise;
        vAlong = along;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uTime;
      uniform float uLoud;
      varying float vRise;
      varying float vAlong;
      void main() {
        float glow = pow(1.0 - vRise, 2.4);
        float shimmer = 0.8 + 0.2 * sin(vAlong * 0.5 - uTime * 4.0) * uLoud;
        gl_FragColor = vec4(uColor * glow * shimmer * (0.35 + 0.4 * uLoud), 1.0);
        #include <colorspace_fragment>
      }`,
  });
}
