"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import AmbientEnergy from "./AmbientEnergy";
import ScrollController from "./ScrollController";
import AgentActivity from "./AgentActivity";
import { useExperienceMotion } from "../experience/ExperienceMotion";

const UPPER = new THREE.Vector3(-0.92, 0.55, 0);
const LOWER = new THREE.Vector3(0.18, -0.48, 0);
const TERMINALS: { position: [number, number, number]; length: number }[] = [
  { position: [0.86, 0.72, 0], length: 1.5 },
  { position: [1.6, -0.68, 0], length: 1.1 },
];
const TERMINAL_RADIUS = 0.18;

function seededRandom(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function PlasmaMaterial({ ring = false }: { ring?: boolean }) {
  const material = useMemo(() => {
    const result = new THREE.MeshPhysicalMaterial({
      color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.32,
      metalness: 0.38, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.3,
    });
    result.onBeforeCompile = shader => {
      shader.vertexShader = "varying vec3 vPlasmaPosition;\n" + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace("#include <begin_vertex>",
        "#include <begin_vertex>\nvPlasmaPosition = position;");
      shader.fragmentShader = "varying vec3 vPlasmaPosition;\n" + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace("#include <color_fragment>", `
        #include <color_fragment>
        float sweep = smoothstep(-0.65, 0.65, vPlasmaPosition.y - vPlasmaPosition.x * 0.45);
        float rim = ${ring ? "smoothstep(0.44, 0.6, length(vPlasmaPosition.xy)) * 0.14" : "0.0"};
        vec3 plasmaColor = mix(vec3(0.10, 0.008, 0.001), vec3(0.65, 0.115, 0.009), clamp(sweep + rim, 0.0, 1.0));
        diffuseColor.rgb *= plasmaColor;
      `);
      shader.fragmentShader = shader.fragmentShader.replace("#include <emissivemap_fragment>",
        "#include <emissivemap_fragment>\ntotalEmissiveRadiance *= plasmaColor;");
    };
    result.customProgramCacheKey = () => `plasma-gradient-${ring}`;
    return result;
  }, [ring]);
  useEffect(() => () => material.dispose(), [material]);
  return <primitive object={material} attach="material" />;
}

// Trace the reference silhouette as a single plate. The two concave shoulders
// form a tapered neck; there are no overlapping tubes or constant-width bridge.
function createPlasmaGeometry() {
  const shape = new THREE.Shape();
  const x = (pixel: number) => UPPER.x + (pixel - 80) * 1.1 / 71;
  const y = (pixel: number) => UPPER.y - (pixel - 54) * 1.03 / 64;
  const curve = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) =>
    shape.bezierCurveTo(x(ax), y(ay), x(bx), y(by), x(cx), y(cy));
  shape.moveTo(x(80), y(15));
  curve(102, 14, 117, 29, 120, 48);
  curve(122, 64, 125, 75, 140, 80);
  curve(147, 83, 155, 79, 164, 83);
  curve(181, 89, 189, 103, 189, 118);
  curve(189, 140, 173, 156, 152, 157);
  curve(130, 158, 112, 145, 109, 124);
  curve(107, 111, 105, 99, 94, 93);
  curve(83, 87, 74, 93, 61, 87);
  curve(45, 80, 39, 67, 40, 53);
  curve(41, 31, 57, 15, 80, 15);
  shape.closePath();
  for (const center of [UPPER, LOWER]) {
    const hole = new THREE.Path();
    hole.absellipse(center.x, center.y, 0.235, 0.255, 0, Math.PI * 2, true, 0);
    shape.holes.push(hole);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.24, steps: 1, curveSegments: 32,
    bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.045, bevelSegments: 3,
  });
  geometry.translate(0, 0, -0.12);
  return geometry;
}

function CoreLight({ center }: { center: THREE.Vector3 }) {
  return <group position={center}>
    <mesh position={[0, 0, -0.16]}>
      <sphereGeometry args={[0.022, 16, 16]} />
      <meshBasicMaterial color={[6, 1.8, 0.35]} toneMapped={false} />
    </mesh>
    <pointLight position={[0, 0, 0.4]} color="#ff5010" intensity={0.65} distance={1.5} />
  </group>;
}

// One uninterrupted face per ring, with only a shallow bevel to catch the light.
function SmoothRing({ center }: { center: THREE.Vector3 }) {
  const face = useMemo(() => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, 0.568, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absellipse(0, 0, 0.25, 0.27, 0, Math.PI * 2, true, 0);
    shape.holes.push(hole);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.04, steps: 1, curveSegments: 64,
      bevelEnabled: true, bevelThickness: 0.022, bevelSize: 0.025, bevelSegments: 4,
    });
    geometry.translate(0, 0, 0.16);
    return geometry;
  }, []);
  useEffect(() => () => face.dispose(), [face]);
  return <group position={center}>
    <mesh geometry={face}>
      <PlasmaMaterial ring />
    </mesh>
  </group>;
}

function Terminal({ position, length }: { position: [number, number, number]; length: number }) {
  return <group position={position}>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <capsuleGeometry args={[TERMINAL_RADIUS, length, 16, 48]} />
      <meshPhysicalMaterial color="#bdc2c7" metalness={0.08} roughness={0.23}
        transmission={0.68} thickness={0.32} ior={1.28}
        transparent opacity={0.68} depthWrite={false}
        envMapIntensity={0.65} clearcoat={0.3} clearcoatRoughness={0.25} />
    </mesh>
  </group>;
}

// Fine luminous grains follow the actual surfaces, so they stay attached during rotation.
function SurfaceGrains({ surface }: { surface: THREE.BufferGeometry }) {
  const { compact } = useExperienceMotion();
  const geometry = useMemo(() => {
    const random = seededRandom(913);
    const positions: number[] = [];
    const colors: number[] = [];
    const add = (x: number, y: number, z: number, silver = false) => {
      positions.push(x, y, z);
      const intensity = silver ? 0.15 + random() * 0.65 : 0.18 + Math.pow(random(), 4) * 1.2;
      colors.push(intensity, intensity * (silver ? 1 : 0.25), intensity * (silver ? 1 : 0.015));
    };
    const vertices = surface.getAttribute("position");
    const normals = surface.getAttribute("normal");
    const triangle = new THREE.Triangle();
    const areas: number[] = [];
    let totalArea = 0;
    for (let i = 0; i < vertices.count; i += 3) {
      triangle.a.fromBufferAttribute(vertices, i);
      triangle.b.fromBufferAttribute(vertices, i + 1);
      triangle.c.fromBufferAttribute(vertices, i + 2);
      totalArea += triangle.getArea();
      areas.push(totalArea);
    }
    const point = new THREE.Vector3();
    const normal = new THREE.Vector3();
    for (let i = 0; i < (compact ? 2500 : 7000); i++) {
      const target = random() * totalArea;
      let low = 0;
      let high = areas.length - 1;
      while (low < high) {
        const mid = (low + high) >>> 1;
        if (areas[mid] < target) low = mid + 1;
        else high = mid;
      }
      const index = low * 3;
      triangle.a.fromBufferAttribute(vertices, index);
      triangle.b.fromBufferAttribute(vertices, index + 1);
      triangle.c.fromBufferAttribute(vertices, index + 2);
      const u = Math.sqrt(random());
      const v = random();
      point.copy(triangle.a).multiplyScalar(1 - u)
        .addScaledVector(triangle.b, u * (1 - v)).addScaledVector(triangle.c, u * v);
      normal.fromBufferAttribute(normals, index);
      point.addScaledVector(normal, 0.003);
      add(point.x, point.y, point.z);
    }
    for (const center of [UPPER, LOWER]) {
      for (let i = 0; i < (compact ? 350 : 1200); i++) {
        const angle = random() * Math.PI * 2;
        const radius = Math.sqrt(0.295 ** 2 + random() * (0.555 ** 2 - 0.295 ** 2));
        add(center.x + Math.cos(angle) * radius, center.y + Math.sin(angle) * radius, 0.225);
      }
    }
    for (const { position: [x, y, z], length } of TERMINALS) {
      for (let i = 0; i < (compact ? 500 : 1800); i++) {
        const angle = random() * Math.PI * 2;
        const along = (random() - 0.5) * (length + TERMINAL_RADIUS * 2);
        const cap = Math.max(0, Math.abs(along) - length / 2);
        const radius = Math.sqrt(TERMINAL_RADIUS ** 2 - cap ** 2) + 0.002;
        add(x + along, y + Math.cos(angle) * radius, z + Math.sin(angle) * radius, true);
      }
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    result.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    return result;
  }, [surface, compact]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <points geometry={geometry}>
    <pointsMaterial vertexColors size={0.008} transparent opacity={0.85}
      depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
  </points>;
}

const SOFT_PARTICLE_FRAGMENT = `
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    float radius = length(gl_PointCoord - 0.5) * 2.0;
    if (radius > 1.0) discard;
    float core = exp(-radius * radius * 12.0);
    float halo = (1.0 - smoothstep(0.15, 1.0, radius)) * 0.18;
    gl_FragColor = vec4(vColor, (core + halo) * vOpacity);
  }
`;

function StarField() {
  const { motion, compact } = useExperienceMotion();
  const { size, viewport } = useThree();
  const { geometry, material } = useMemo(() => {
    const random = seededRandom(541);
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];
    const phases: number[] = [];
    for (let i = 0; i < 1500; i++) {
      positions.push((random() - 0.5) * 22, (random() - 0.5) * 15, -1.8 - random() * 7);
      const color = new THREE.Color(random() > 0.18 ? "#bbd4e9" : "#e9cda8");
      color.multiplyScalar(0.45 + random() * 1.8);
      colors.push(color.r, color.g, color.b);
      sizes.push(0.018 + Math.pow(random(), 4) * 0.07);
      phases.push(random() * Math.PI * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("aSize", new THREE.Float32BufferAttribute(sizes, 1));
    geometry.setAttribute("aPhase", new THREE.Float32BufferAttribute(phases, 1));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uScale: { value: 800 } },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uScale;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = clamp(aSize * uScale / -viewPosition.z, 1.5, 14.0);
          vColor = color;
          vOpacity = 0.55 + 0.25 * sin(uTime * 0.55 + aPhase);
        }
      `,
      fragmentShader: SOFT_PARTICLE_FRAGMENT,
      transparent: true, depthWrite: false, vertexColors: true,
      blending: THREE.AdditiveBlending, toneMapped: false,
    });
    return { geometry, material };
  }, []);
  useEffect(() => { material.uniforms.uScale.value = size.height * viewport.dpr; }, [material, size.height, viewport.dpr]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useEffect(() => { geometry.setDrawRange(0, compact ? 500 : 1500); }, [geometry, compact]);
  useFrame((_, delta) => { if (!motion.current.reducedMotion) material.uniforms.uTime.value += Math.min(delta, 0.05); });
  return <points geometry={geometry} material={material} />;
}

// Particles start along each ring's trailing semicircle, at its full diameter.
// The wake contracts, loses saturation, and fades as it travels to the left.
// The motion runs on the GPU; no per-frame buffers or React updates are needed.
function TravelingTrails() {
  const { motion, compact } = useExperienceMotion();
  const { size, viewport } = useThree();
  const { geometry, material } = useMemo(() => {
    const random = seededRandom(7204);
    const positions: number[] = [];
    const seeds: number[] = [];
    const colors: number[] = [];
    for (const center of [UPPER, LOWER]) {
      for (let i = 0; i < (compact ? 450 : 1500); i++) {
        positions.push(center.x, center.y, -0.10);
        seeds.push(random(), random(), random(), random());
        const color = new THREE.Color(i % 11 === 0 ? "#ffc477" : i % 3 === 0 ? "#e74708" : "#ff7b16");
        color.multiplyScalar(1.2 + random() * 2.5);
        colors.push(color.r, color.g, color.b);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("aSeed", new THREE.Float32BufferAttribute(seeds, 4));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uScale: { value: 800 } },
      vertexShader: `
        attribute vec4 aSeed;
        uniform float uTime;
        uniform float uScale;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float age = fract(aSeed.x + uTime * (0.09 + aSeed.y * 0.08));
          float radius = 0.65;
          float sourceY = (aSeed.z * 2.0 - 1.0) * radius;
          float sourceX = -sqrt(max(0.0, radius * radius - sourceY * sourceY));
          float taper = pow(1.0 - age, 1.35);
          vec3 particle = position;
          particle.x += sourceX - age * 3.2;
          particle.y += sourceY * taper;
          particle.z += (aSeed.y - 0.5) * 0.06 * taper - age * 0.15;
          vec4 viewPosition = modelViewMatrix * vec4(particle, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          float particleSize = (0.012 + aSeed.w * aSeed.w * 0.04) * mix(1.0, 0.35, age);
          gl_PointSize = clamp(particleSize * uScale / -viewPosition.z, 1.0, 12.0);
          float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
          float colorLoss = smoothstep(0.04, 0.72, age);
          vColor = mix(color, vec3(luminance * 0.5), colorLoss) * mix(1.0, 0.25, age);
          vOpacity = smoothstep(0.0, 0.012, age) * pow(1.0 - age, 2.0) * 0.9;
        }
      `,
      fragmentShader: SOFT_PARTICLE_FRAGMENT,
      transparent: true, depthWrite: false, vertexColors: true,
      blending: THREE.AdditiveBlending, toneMapped: false,
    });
    return { geometry, material };
  }, [compact]);
  useEffect(() => { material.uniforms.uScale.value = size.height * viewport.dpr; }, [material, size.height, viewport.dpr]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  useFrame((_, delta) => { if (!motion.current.reducedMotion) material.uniforms.uTime.value += Math.min(delta, 0.05); });
  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
function FulcrumNode() {
  const { motion } = useExperienceMotion();
  const root = useRef<THREE.Group>(null);
  const surface = useMemo(createPlasmaGeometry, []);
  useEffect(() => () => surface.dispose(), [surface]);
  useFrame(({ clock }) => {
    if (root.current) root.current.position.y = motion.current.reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.55) * 0.018;
  });
  return <group ref={root} rotation={[0.06, -0.1, 0]}>
    <mesh geometry={surface}>
      <PlasmaMaterial />
    </mesh>
    <SmoothRing center={UPPER} />
    <SmoothRing center={LOWER} />
    <CoreLight center={UPPER} />
    <CoreLight center={LOWER} />
    {TERMINALS.map(terminal => <Terminal key={terminal.position[1]} {...terminal} />)}
    <SurfaceGrains surface={surface} />
    <TravelingTrails />
  </group>;
}

function Framing() {
  const { compact } = useExperienceMotion();
  const { camera, size } = useThree();
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const aspect = size.width / size.height;
    const distance = Math.max(2.5, (compact ? 2.35 : 4.3) / aspect) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height, compact]);
  return null;
}

export default function FulcrumWorld() {
  const { compact } = useExperienceMotion();
  return <Canvas camera={{ position: [0, 0, 9], fov: 34 }} dpr={compact ? 1 : [1, 1.5]}
    gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
    <color attach="background" args={["#020304"]} />
    <Framing />
    <StarField />
    <AmbientEnergy />
    <ambientLight intensity={0.25} />
    <directionalLight position={[-3, 5, 5]} intensity={3} color="#fff0df" />
    <directionalLight position={[4, 1, 3]} intensity={2} color="#ffffff" />
    <ScrollController><FulcrumNode /></ScrollController>
    <AgentActivity />
    <Environment resolution={128}>
      <Lightformer position={[0, 4, 3]} intensity={2.5} scale={[8, 2, 1]} />
      <Lightformer position={[3, 0, 4]} intensity={1.5} color="#ffffff" scale={[2, 6, 1]} />
      <Lightformer position={[-4, 1, 2]} intensity={1} color="#ffffff" scale={[2, 4, 1]} />
    </Environment>
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.85} luminanceThreshold={0.85} luminanceSmoothing={0.3} mipmapBlur />
      <Vignette eskil={false} offset={0.15} darkness={0.6} />
    </EffectComposer>
  </Canvas>;
}
