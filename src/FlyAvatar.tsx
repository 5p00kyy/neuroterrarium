import { useMemo } from "react";
import * as THREE from "three";
import type { Specimen } from "./sim/experiment";

type V3 = [number, number, number];
const rodGeometry = new THREE.CylinderGeometry(0.65, 1, 1, 6);
export function Segment({
  a,
  b,
  radius = 0.018,
  color = "#816238",
  shadow = true,
}: {
  a: V3;
  b: V3;
  radius?: number;
  color?: string;
  shadow?: boolean;
}) {
  const { position, quaternion, length } = useMemo(() => {
    const start = new THREE.Vector3(...a),
      end = new THREE.Vector3(...b);
    return {
      position: start.clone().add(end).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        end.clone().sub(start).normalize(),
      ),
      length: start.distanceTo(end),
    };
  }, [...a, ...b]);
  return (
    <mesh
      geometry={rodGeometry}
      position={position}
      quaternion={quaternion}
      scale={[radius, length, radius]}
      castShadow={shadow}
    >
      <meshStandardMaterial color={color} roughness={0.63} />
    </mesh>
  );
}
/** Distance-driven tripod gait. This is presentation, not biomechanics or neural state. */
export function legPose(
  side: number,
  index: number,
  distance: number,
  speed: number,
): V3[] {
  const phase =
    distance * 19 + (index === 1 ? Math.PI : 0) + (side < 0 ? Math.PI : 0);
  const swing = Math.sin(phase) * 0.14 * Math.min(1, speed);
  const lift = Math.max(0, Math.cos(phase)) * 0.13 * Math.min(1, speed);
  const z = [0.27, 0.03, -0.19][index],
    reach = [0.58, 0.02, -0.64][index];
  return [
    [side * 0.16, 0.39, z],
    [side * 0.33, 0.31, z + 0.06],
    [side * 0.54, 0.26, z + reach * 0.38 + swing * 0.4],
    [side * 0.78, 0.015 + lift, z + reach + swing],
    [side * 0.89, 0.012 + lift, z + reach + swing + 0.06],
  ];
}
function Leg({
  side,
  index,
  specimen,
}: {
  side: number;
  index: number;
  specimen: Specimen;
}) {
  const p = legPose(side, index, specimen.distance, specimen.speed);
  return (
    <group>
      {p.slice(1).map((b, i) => (
        <Segment
          key={i}
          a={p[i]}
          b={b}
          radius={[0.033, 0.026, 0.017, 0.009][i]}
        />
      ))}
      <mesh position={p[2]}>
        <sphereGeometry args={[0.029, 8, 6]} />
        <meshStandardMaterial color="#372a1c" />
      </mesh>
    </group>
  );
}
function Wing({
  side,
  tick,
  speed,
}: {
  side: number;
  tick: number;
  speed: number;
}) {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0);
    s.bezierCurveTo(0.3, -0.08, 0.57, -0.4, 0.51, -0.81);
    s.bezierCurveTo(0.49, -1.12, 0.25, -1.2, 0.13, -0.91);
    s.bezierCurveTo(0.04, -0.64, -0.02, -0.2, 0, 0);
    return s;
  }, []);
  const ribs: V3[][] = [
    [
      [0, 0, 0],
      [0.34, 0, -0.37],
      [0.45, 0, -0.84],
    ],
    [
      [0.03, 0, -0.12],
      [0.21, 0, -0.58],
      [0.28, 0, -1.07],
    ],
    [
      [0.01, 0, -0.08],
      [0.11, 0, -0.52],
      [0.14, 0, -0.86],
    ],
    [
      [0.11, 0, -0.52],
      [0.21, 0, -0.58],
      [0.42, 0, -0.61],
    ],
  ];
  return (
    <group
      position={[side * 0.15, 0.67, 0.1]}
      scale={[side, 1, 1]}
      rotation={[
        0.025 + Math.sin(tick * 0.012) * 0.008,
        side * (0.2 + Math.min(speed, 1) * 0.07),
        side * 0.04,
      ]}
    >
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[shape, 20]} />
        <meshPhysicalMaterial
          color="#d7d5b5"
          transparent
          opacity={0.46}
          side={THREE.DoubleSide}
          roughness={0.25}
          metalness={0.15}
          depthWrite={false}
        />
      </mesh>
      {ribs.map((rib, i) => (
        <group key={i}>
          {rib.slice(1).map((b, k) => (
            <Segment
              key={k}
              a={rib[k]}
              b={b}
              radius={0.0045}
              color="#a59a74"
              shadow={false}
            />
          ))}
        </group>
      ))}
    </group>
  );
}
export function FlyAvatar({
  specimen,
  tick,
  color,
}: {
  specimen: Specimen;
  tick: number;
  color: string;
}) {
  const abdomen = useMemo(
    () =>
      [
        [-0.67, 0.025],
        [-0.57, 0.13],
        [-0.43, 0.22],
        [-0.25, 0.265],
        [-0.04, 0.26],
        [0.16, 0.21],
        [0.26, 0.12],
      ].map(([y, r]) => new THREE.Vector2(r, y)),
    [],
  );
  const breath = Math.sin(tick * 0.016) * 0.007;
  return (
    <group
      position={[specimen.x, -0.025, specimen.z]}
      rotation={[0, specimen.heading, 0]}
    >
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[0.98, 0.989, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.42} />
      </mesh>
      <group position={[0, breath, 0]}>
        <mesh
          position={[0, 0.42, -0.28]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <latheGeometry args={[abdomen, 32]} />
          <meshStandardMaterial color="#af8544" roughness={0.6} />
        </mesh>
        {[-0.18, -0.35, -0.5, -0.65, -0.8].map((z, i) => (
          <mesh key={z} position={[0, 0.42, z]}>
            <torusGeometry
              args={[[0.224, 0.26, 0.264, 0.238, 0.16][i], 0.019, 6, 32]}
            />
            <meshStandardMaterial color="#473321" roughness={0.58} />
          </mesh>
        ))}
        <mesh position={[0, 0.45, 0.07]} scale={[0.26, 0.275, 0.34]} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#947044" roughness={0.58} />
        </mesh>
        {[-0.08, 0.08].map((x) => (
          <mesh key={x} position={[x, 0.707, 0.1]} scale={[0.022, 0.007, 0.19]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshStandardMaterial color="#4d3826" />
          </mesh>
        ))}
        <mesh position={[0, 0.46, 0.47]} scale={[0.29, 0.22, 0.22]} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#b29458" roughness={0.64} />
        </mesh>
        <mesh position={[0, 0.36, 0.65]} scale={[0.07, 0.07, 0.12]}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshStandardMaterial color="#685137" />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh
              position={[side * 0.226, 0.48, 0.49]}
              scale={[0.132, 0.19, 0.18]}
              rotation={[0, side * 0.18, side * 0.13]}
            >
              <icosahedronGeometry args={[1, 3]} />
              <meshStandardMaterial
                color="#b52f19"
                roughness={0.32}
                metalness={0.1}
                flatShading
              />
            </mesh>
            <group
              position={[side * 0.095, 0.48, 0.65]}
              rotation={[Math.sin(tick * 0.035 + side) * 0.09, side * 0.3, 0]}
            >
              <mesh scale={[0.04, 0.05, 0.07]}>
                <sphereGeometry args={[1, 12, 8]} />
                <meshStandardMaterial color="#d1ac63" />
              </mesh>
              <Segment
                a={[0, 0, 0]}
                b={[side * 0.09, 0.09, 0.13]}
                radius={0.007}
              />
              {[0, 1, 2, 3].map((i) => (
                <Segment
                  key={i}
                  a={[
                    side * (0.03 + i * 0.015),
                    0.03 + i * 0.015,
                    0.04 + i * 0.022,
                  ]}
                  b={[
                    side * (0.08 + i * 0.016),
                    0.09 + i * 0.015,
                    0.07 + i * 0.026,
                  ]}
                  radius={0.0025}
                  shadow={false}
                />
              ))}
            </group>
            <Wing side={side} tick={tick} speed={specimen.speed} />
            <Segment
              a={[side * 0.22, 0.43, -0.14]}
              b={[side * 0.35, 0.52, -0.25]}
              radius={0.01}
            />
            <mesh position={[side * 0.35, 0.52, -0.25]}>
              <sphereGeometry args={[0.038, 10, 8]} />
              <meshStandardMaterial color="#d7bc7d" />
            </mesh>
            {[0, 1, 2].map((i) => (
              <Leg key={i} side={side} index={i} specimen={specimen} />
            ))}
            {[0, 1, 2, 3].map((i) => (
              <Segment
                key={i}
                a={[side * 0.15, 0.65, 0.23 - i * 0.105]}
                b={[side * 0.23, 0.8, 0.23 - i * 0.13]}
                radius={0.004}
                color="#30291f"
                shadow={false}
              />
            ))}
          </group>
        ))}
      </group>
      <mesh position={[0, 0.745, 0.08]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={specimen.spikes.reduce((s, n) => s + n, 0) / 12}
        />
      </mesh>
    </group>
  );
}
