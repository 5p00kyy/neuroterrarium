import { useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import { random } from "./sim/network";
import type { Frame, Mode, Specimen, Tool } from "./sim/experiment";
export const COLORS: Record<Mode, string> = {
  Biological: "#b9d891",
  Adaptive: "#72d7d0",
  Control: "#d6a3df",
};
function Rod({
  a,
  b,
  radius = 0.022,
  color = "#51452f",
}: {
  a: [number, number, number];
  b: [number, number, number];
  radius?: number;
  color?: string;
}) {
  const start = new THREE.Vector3(...a),
    end = new THREE.Vector3(...b),
    mid = start.clone().add(end).multiplyScalar(0.5),
    q = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      end.clone().sub(start).normalize(),
    );
  return (
    <mesh position={mid} quaternion={q} castShadow>
      <cylinderGeometry
        args={[radius * 0.7, radius, start.distanceTo(end), 6]}
      />
      <meshStandardMaterial color={color} roughness={0.8} />
    </mesh>
  );
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
  const root = useRef<THREE.Group>(null);
  useFrame(() => {
    if (root.current)
      root.current.rotation.y =
        Math.sin(
          specimen.distance * 23 + index * 2.1 + (side > 0 ? Math.PI : 0),
        ) *
        0.2 *
        Math.min(1, specimen.speed);
  });
  const z = 0.3 - index * 0.28;
  return (
    <group ref={root}>
      <Rod
        a={[side * 0.17, 0.24, z]}
        b={[side * 0.5, 0.22, z + (index === 0 ? 0.25 : -0.1)]}
      />
      <Rod
        a={[side * 0.5, 0.22, z + (index === 0 ? 0.25 : -0.1)]}
        b={[side * 0.77, 0.015, z + (index === 0 ? 0.55 : -0.3)]}
        radius={0.016}
      />
      <Rod
        a={[side * 0.77, 0.015, z + (index === 0 ? 0.55 : -0.3)]}
        b={[side * 0.86, 0.012, z + (index === 0 ? 0.65 : -0.4)]}
        radius={0.009}
      />
    </group>
  );
}
function Fly({
  specimen,
  ghost = false,
}: {
  specimen: Specimen;
  ghost?: boolean;
}) {
  const body = useRef<THREE.Group>(null);
  useFrame(() => {
    if (body.current) {
      body.current.position.set(specimen.x, 0.06, specimen.z);
      body.current.rotation.y = specimen.heading;
    }
  });
  return (
    <group ref={body}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.85, 0.875, 64]} />
        <meshBasicMaterial
          color={COLORS[specimen.mode]}
          transparent
          opacity={ghost ? 0.15 : 0.65}
        />
      </mesh>
      <group scale={ghost ? 0.82 : 1}>
        <mesh position={[0, 0.32, -0.36]} scale={[0.26, 0.22, 0.5]} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial
            color={ghost ? COLORS[specimen.mode] : "#887043"}
            roughness={0.72}
          />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            position={[0, 0.323, -0.17 - i * 0.14]}
            rotation={[Math.PI / 2, 0, 0]}
            scale={[1, 0.82, 1]}
          >
            <torusGeometry args={[0.25 - i * 0.023, 0.015, 6, 32]} />
            <meshStandardMaterial color="#3d3527" />
          </mesh>
        ))}
        <mesh position={[0, 0.37, 0.1]} scale={[0.27, 0.27, 0.32]} castShadow>
          <sphereGeometry args={[1, 24, 20]} />
          <meshStandardMaterial
            color={ghost ? COLORS[specimen.mode] : "#645839"}
            roughness={0.65}
          />
        </mesh>
        <mesh position={[0, 0.39, 0.45]} scale={[0.24, 0.2, 0.2]} castShadow>
          <sphereGeometry args={[1, 24, 16]} />
          <meshStandardMaterial color="#8b754c" />
        </mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh
              position={[side * 0.185, 0.425, 0.49]}
              scale={[0.115, 0.16, 0.145]}
            >
              <icosahedronGeometry args={[1, 3]} />
              <meshStandardMaterial
                color="#a54128"
                roughness={0.32}
                metalness={0.15}
              />
            </mesh>
            <Rod
              a={[side * 0.08, 0.49, 0.58]}
              b={[side * 0.17, 0.56, 0.8]}
              radius={0.012}
            />
            <group
              position={[side * 0.16, 0.56, 0.1]}
              rotation={[0, side * 0.4, side * -0.08]}
            >
              <mesh
                position={[side * 0.24, 0, -0.52]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[0.27, 0.69, 1]}
              >
                <circleGeometry args={[1, 40]} />
                <meshStandardMaterial
                  color="#e5e3c4"
                  transparent
                  opacity={0.46}
                  side={THREE.DoubleSide}
                  roughness={0.3}
                  depthWrite={false}
                />
              </mesh>
              {[0, 1, 2].map((i) => (
                <Rod
                  key={i}
                  a={[0, 0, 0]}
                  b={[side * (0.16 + i * 0.09), 0.005, -0.94 + i * 0.14]}
                  radius={0.005}
                  color="#aaa98e"
                />
              ))}
            </group>
            {[0, 1, 2].map((i) => (
              <Leg key={i} side={side} index={i} specimen={specimen} />
            ))}
          </group>
        ))}
        <mesh position={[0, 0.61, 0.1]}>
          <sphereGeometry args={[0.055, 12, 12]} />
          <meshStandardMaterial
            color={COLORS[specimen.mode]}
            emissive={COLORS[specimen.mode]}
            emissiveIntensity={Math.min(
              2,
              specimen.regions.reduce((s, n) => s + n, 0) * 2,
            )}
          />
        </mesh>
      </group>
    </group>
  );
}
function Plant({
  x,
  z,
  scale = 1,
  angle = 0,
}: {
  x: number;
  z: number;
  scale?: number;
  angle?: number;
}) {
  return (
    <group position={[x, 0, z]} scale={scale} rotation={[0, angle, 0]}>
      <Rod a={[0, 0, 0]} b={[0.05, 0.6, 0]} radius={0.028} color="#64704b" />
      {[0, 1, 2, 3, 4].map((i) => (
        <group
          key={i}
          rotation={[0, i * 2.4, 0]}
          position={[0, 0.1 + i * 0.07, 0]}
        >
          <mesh
            position={[0.2, 0.13, 0]}
            rotation={[0, 0, 0.55]}
            scale={[0.35, 0.065, 0.12]}
            castShadow
          >
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial
              color={i % 2 ? "#657652" : "#889069"}
              roughness={0.9}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function World({
  frame,
  mode,
  compare,
  onPlace,
}: {
  frame: Frame;
  mode: Mode;
  compare: boolean;
  tool: Tool;
  onPlace: (x: number, z: number) => void;
}) {
  const stones = useMemo(() => {
    const r = random(609);
    return Array.from({ length: 110 }, () => {
      const a = r() * Math.PI * 2,
        d = Math.sqrt(r()) * 4.65;
      return {
        x: Math.cos(a) * d,
        z: Math.sin(a) * d,
        size: 0.015 + r() * 0.06,
        c: r(),
      };
    });
  }, []);
  const selected = frame.specimens.find((s) => s.mode === mode)!;
  function place(e: ThreeEvent<MouseEvent>) {
    if (e.delta > 4) return;
    e.stopPropagation();
    if (Math.hypot(e.point.x, e.point.z) < 4.6) onPlace(e.point.x, e.point.z);
  }
  return (
    <>
      <color attach="background" args={["#151c19"]} />
      <fog attach="fog" args={["#151c19", 19, 36]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#cddbd2", "#695339", 1.6]} />
      <directionalLight
        position={[-3, 9, 4]}
        intensity={3.2}
        color="#ffe5b4"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-normalBias={0.025}
      />
      <pointLight position={[4, 4, -3]} color="#a6d9c5" intensity={20} />
      <mesh position={[0, -0.44, 0]} receiveShadow>
        <cylinderGeometry args={[5.02, 4.83, 0.65, 96]} />
        <meshStandardMaterial color="#35362b" roughness={0.9} />
      </mesh>
      <mesh
        position={[0, -0.085, 0]}
        receiveShadow
        onClick={place}
        onPointerOver={() => {
          document.body.style.cursor = "crosshair";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <cylinderGeometry args={[4.86, 4.86, 0.12, 96]} />
        <meshStandardMaterial color="#71654b" roughness={1} />
      </mesh>
      <mesh position={[0, -0.58, 0]}>
        <cylinderGeometry args={[5.06, 5.06, 0.11, 96]} />
        <meshStandardMaterial
          color="#9c977d"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      {[2.5, 4.7, 4.97].map((r, i) => (
        <mesh
          key={r}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, i === 2 ? 1.25 : 0.005, 0]}
        >
          <ringGeometry args={[r, r + 0.018, 100]} />
          <meshBasicMaterial
            color={i === 2 ? "#a8c0b0" : "#b8ac88"}
            transparent
            opacity={i === 2 ? 0.5 : 0.19}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[4.98, 4.98, 1.3, 96, 1, true]} />
        <meshPhysicalMaterial
          color="#a6cebb"
          transparent
          opacity={0.065}
          side={THREE.DoubleSide}
          roughness={0.1}
          depthWrite={false}
        />
      </mesh>
      {stones.map((s, i) => (
        <mesh
          key={i}
          position={[s.x, 0.006, s.z]}
          scale={[s.size, s.size * 0.4, s.size * 0.8]}
          rotation={[0, i, 0]}
          receiveShadow
        >
          <icosahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color={s.c > 0.5 ? "#928069" : "#504d3e"}
            roughness={1}
          />
        </mesh>
      ))}
      {[
        [-3.5, -2.1, 1.4],
        [-3.9, -1.1, 0.8],
        [-2.7, -3, 1],
        [3.5, -1.6, 1.15],
        [3.8, -0.6, 0.7],
        [-2.9, 2.8, 0.65],
      ].map(([x, z, s], i) => (
        <Plant key={i} x={x} z={z} scale={s} angle={i} />
      ))}
      {Array.from({ length: 40 }, (_, i) => {
        const a = (i * Math.PI) / 20;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 4.73, 0.008, Math.cos(a) * 4.73]}
            rotation={[-Math.PI / 2, 0, -a]}
          >
            <planeGeometry args={[0.016, i % 5 === 0 ? 0.22 : 0.1]} />
            <meshBasicMaterial color="#cdc29f" transparent opacity={0.5} />
          </mesh>
        );
      })}
      {(compare ? frame.specimens : [selected]).map((s) => (
        <group key={s.mode}>
          {s.path.length > 1 && (
            <Line
              points={s.path.map(([x, z]) => [x, 0.03, z])}
              color={COLORS[s.mode]}
              lineWidth={s.mode === mode ? 1.8 : 1}
              transparent
              opacity={0.65}
            />
          )}
          <Fly specimen={s} ghost={s.mode !== mode} />
        </group>
      ))}
      {frame.stimuli.map((s) => (
        <group key={s.tool} position={[s.x, 0.03, s.z]}>
          {s.tool === "light" && (
            <>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.6, 48]} />
                <meshBasicMaterial color="#e7d28c" transparent opacity={0.3} />
              </mesh>
              <mesh position={[0, 0.42, 0]}>
                <octahedronGeometry args={[0.17, 0]} />
                <meshStandardMaterial
                  color="#fff0b0"
                  emissive="#ebc95b"
                  emissiveIntensity={2}
                />
              </mesh>
              <pointLight
                position={[0, 0.8, 0]}
                color="#ffe7a0"
                intensity={3}
                distance={3}
              />
            </>
          )}
          {s.tool === "odor" && (
            <>
              <mesh scale={[0.4, 0.12, 0.35]} position={[0, 0.1, 0]}>
                <sphereGeometry args={[1, 24, 12]} />
                <meshStandardMaterial color="#b77649" roughness={0.9} />
              </mesh>
              {[0.5, 0.85, 1.2].map((r) => (
                <mesh key={r} rotation={[-Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[r, r + 0.015, 48]} />
                  <meshBasicMaterial
                    color="#aad694"
                    transparent
                    opacity={0.35}
                  />
                </mesh>
              ))}
            </>
          )}
          {s.tool === "obstacle" && (
            <mesh position={[0, 0.3, 0]} castShadow>
              <dodecahedronGeometry args={[0.65, 1]} />
              <meshStandardMaterial color="#68706a" roughness={1} />
            </mesh>
          )}
          {s.tool === "loom" && (
            <mesh position={[0, 1.3, 0]}>
              <sphereGeometry
                args={[0.2 + (frame.tick - s.start) * 0.008, 24, 16]}
              />
              <meshStandardMaterial color="#533730" roughness={0.4} />
            </mesh>
          )}
          {s.tool === "touch" && (
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.5, 0.55, 48]} />
              <meshBasicMaterial color="#e8a17c" />
            </mesh>
          )}
        </group>
      ))}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.68, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#18201b" roughness={0.9} />
      </mesh>
      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        minDistance={7}
        maxDistance={19}
        minPolarAngle={0.25}
        maxPolarAngle={1.25}
        enablePan={false}
      />
    </>
  );
}
export function Scene(props: {
  frame: Frame;
  mode: Mode;
  compare: boolean;
  tool: Tool;
  onPlace: (x: number, z: number) => void;
}) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [9, 10, 12], fov: 40 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      fallback={
        <div className="canvas-fallback">
          WebGL is unavailable. Neural simulation and experiment export still
          work.
        </div>
      }
    >
      <World {...props} />
    </Canvas>
  );
}
