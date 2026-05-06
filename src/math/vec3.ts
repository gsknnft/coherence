export type Vec3 = readonly [x: number, y: number, z: number];

export const VEC3_ZERO: Vec3 = Object.freeze([0, 0, 0]);
export const VEC3_ONE: Vec3 = Object.freeze([1, 1, 1]);

export function vec3(x = 0, y = 0, z = 0): Vec3 {
  return [x, y, z];
}

export function vec3Add(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function vec3Scale(v: Vec3, scalar: number): Vec3 {
  return [v[0] * scalar, v[1] * scalar, v[2] * scalar];
}

export function vec3Dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

export function vec3Length(v: Vec3): number {
  return Math.hypot(v[0], v[1], v[2]);
}

export function vec3Normalize(v: Vec3): Vec3 {
  const length = vec3Length(v);
  if (length <= Number.EPSILON) return VEC3_ZERO;
  return vec3Scale(v, 1 / length);
}

export function vec3Distance(a: Vec3, b: Vec3): number {
  return vec3Length(vec3Sub(a, b));
}

export function vec3Lerp(a: Vec3, b: Vec3, t: number): Vec3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export function vec3AlmostEqual(a: Vec3, b: Vec3, epsilon = 1e-9): boolean {
  return (
    Math.abs(a[0] - b[0]) <= epsilon &&
    Math.abs(a[1] - b[1]) <= epsilon &&
    Math.abs(a[2] - b[2]) <= epsilon
  );
}
