import { Line } from "@react-three/drei";
import type { Frame, Stimulus } from "./sim/experiment";
import { distanceEnvelope, stimulusEnvelope } from "./visualSignals";
import { Segment } from "./FlyAvatar";
import * as THREE from "three";

function Contour({
  radius,
  color,
  opacity = 0.3,
}: {
  radius: number;
  color: string;
  opacity?: number;
}) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius, radius + 0.012, 64]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}
export function StimulusField({
  stimulus: s,
  frame,
}: {
  stimulus: Stimulus;
  frame: Frame;
}) {
  const e = stimulusEnvelope(s, frame.tick),
    ref = frame.specimens[0];
  if (!e.active) return null;
  return (
    <group position={[s.x, 0.018, s.z]}>
      {s.tool === "light" && (
        <>
          <mesh position={[0, 1.6, 0]}>
            <sphereGeometry args={[0.085, 16, 12]} />
            <meshStandardMaterial
              color="#fff3cc"
              emissive="#ffdc8b"
              emissiveIntensity={2}
            />
          </mesh>
          <mesh position={[0, 0.81, 0]}>
            <coneGeometry args={[0.65, 1.6, 32, 1, true]} />
            <meshBasicMaterial
              color="#ffe4a1"
              transparent
              opacity={0.065}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.65, 48]} />
            <meshBasicMaterial
              color="#ffe4a1"
              transparent
              opacity={0.21}
              depthWrite={false}
            />
          </mesh>
          <pointLight
            position={[0, 0.8, 0]}
            intensity={5}
            color="#ffdf98"
            distance={4}
          />
          <Line
            points={[
              [0, 0.012, 0],
              [ref.x - s.x, 0.012, ref.z - s.z],
            ]}
            color="#e4c276"
            lineWidth={1}
            dashed
            dashSize={0.09}
            gapSize={0.07}
            transparent
            opacity={0.55}
          />
          <Contour radius={0.65} color="#e5c87f" />
        </>
      )}
      {s.tool === "odor" && (
        <>
          <mesh scale={[0.33, 0.09, 0.28]} position={[0, 0.09, 0]} castShadow>
            <sphereGeometry args={[1, 20, 12]} />
            <meshStandardMaterial color="#a56736" roughness={0.9} />
          </mesh>
          <mesh scale={[0.25, 0.035, 0.22]} position={[0, 0.17, 0]}>
            <sphereGeometry args={[1, 20, 10]} />
            <meshStandardMaterial color="#dcb979" roughness={0.85} />
          </mesh>
          {[0.65, 1.3, 2.1].map((r) => (
            <Contour
              key={r}
              radius={r}
              color="#bad28d"
              opacity={distanceEnvelope(r) * 0.28}
            />
          ))}
          {Array.from({ length: 18 }, (_, i) => {
            const phase = (e.phase + i / 18) % 1,
              angle = i * 2.39996,
              r = 0.22 + phase * 1.9;
            return (
              <mesh
                key={i}
                position={[
                  Math.cos(angle) * r,
                  0.08 + phase * 0.52,
                  Math.sin(angle) * r,
                ]}
              >
                <sphereGeometry args={[0.022, 6, 4]} />
                <meshBasicMaterial
                  color="#d1dca3"
                  transparent
                  opacity={distanceEnvelope(r) * (1 - phase) * 0.6}
                  depthWrite={false}
                />
              </mesh>
            );
          })}
        </>
      )}
      {s.tool === "obstacle" && (
        <>
          <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.72, 0.72, 0.5, 48]} />
            <meshStandardMaterial color="#585f59" roughness={0.86} />
          </mesh>
          <mesh position={[0, 0.505, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.62, 0.66, 48]} />
            <meshStandardMaterial color="#95937c" roughness={0.8} />
          </mesh>
          <Contour radius={0.72} color="#d1b99b" opacity={0.65} />
          <Contour radius={1.4} color="#d1b99b" opacity={0.2} />
        </>
      )}
      {s.tool === "loom" && (
        <>
          <mesh position={[0, 1.5, 0]} castShadow>
            <sphereGeometry args={[0.19 + e.age * 0.007, 24, 16]} />
            <meshStandardMaterial color="#342a25" roughness={0.37} />
          </mesh>
          <Contour
            radius={0.35 + e.age * 0.008}
            color="#d29b7f"
            opacity={Math.min(0.8, e.threat / 2)}
          />
          <Segment
            a={[0, 0, 0]}
            b={[0, 1.1, 0]}
            radius={0.004}
            color="#a57c65"
            shadow={false}
          />
        </>
      )}
      {s.tool === "touch" && (
        <>
          <Contour
            radius={0.18 + e.age * 0.035}
            color="#e9b38c"
            opacity={1 - e.age / 20}
          />
          <mesh position={[0, 0.17, 0]}>
            <octahedronGeometry args={[0.1, 0]} />
            <meshBasicMaterial color="#e8bc92" />
          </mesh>
          <Line
            points={[
              [0, 0.012, 0],
              [ref.x - s.x, 0.012, ref.z - s.z],
            ]}
            color="#e9b38c"
            lineWidth={1}
            transparent
            opacity={0.45}
          />
        </>
      )}
    </group>
  );
}
