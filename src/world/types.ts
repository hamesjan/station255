// A 2D axis-aligned collider on the platform floor. Player movement stays at a
// fixed height, so collision is resolved purely in the X/Z plane.
export interface Box2D {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}
