/**
 * The built-in parcel: a taped carton with a label. One unit long, centred on its bounding box.
 * Its height is `BUILT_IN_HEIGHT.parcel`.
 */
export function ParcelModel({ color }: { color: string }) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[1, 0.7, 0.8]} />
        <meshStandardMaterial color={color} roughness={0.9} />
      </mesh>
      <mesh>
        <boxGeometry args={[1.004, 0.704, 0.14]} />
        <meshStandardMaterial color="#e9dcc4" roughness={0.6} />
      </mesh>
      <mesh position={[0.22, 0.352, 0.22]}>
        <boxGeometry args={[0.32, 0.004, 0.22]} />
        <meshStandardMaterial color="#f7f7f5" roughness={0.8} />
      </mesh>
      <mesh position={[0.22, 0.355, 0.15]}>
        <boxGeometry args={[0.32, 0.004, 0.05]} />
        <meshStandardMaterial color="#5b9cff" roughness={0.6} />
      </mesh>
    </group>
  );
}
