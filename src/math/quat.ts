import type { Vec3 } from "./vec3.js";
import { vec3Cross, vec3Scale } from "./vec3.js";

export type Quat = readonly [x: number, y: number, z: number, w: number];

export const QUAT_IDENTITY: Quat = Object.freeze([0, 0, 0, 1]);

export function quat(x = 0, y = 0, z = 0, w = 1): Quat {
  return [x, y, z, w];
}

export function quatNormalize(q: Quat): Quat {
  const length = Math.hypot(q[0], q[1], q[2], q[3]);
  if (length <= Number.EPSILON) return QUAT_IDENTITY;
  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}

export function quatConjugate(q: Quat): Quat {
  return [-q[0], -q[1], -q[2], q[3]];
}

export function quatMul(a: Quat, b: Quat): Quat {
  const ax = a[0], ay = a[1], az = a[2], aw = a[3];
  const bx = b[0], by = b[1], bz = b[2], bw = b[3];
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function quatFromAxisAngle(axis: Vec3, radians: number): Quat {
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  if (length <= Number.EPSILON) return QUAT_IDENTITY;
  const half = radians * 0.5;
  const scale = Math.sin(half) / length;
  return quatNormalize([axis[0] * scale, axis[1] * scale, axis[2] * scale, Math.cos(half)]);
}

export function quatFromYawPitchRoll(yaw: number, pitch = 0, roll = 0): Quat {
  const hy = yaw * 0.5;
  const hp = pitch * 0.5;
  const hr = roll * 0.5;
  const cy = Math.cos(hy), sy = Math.sin(hy);
  const cp = Math.cos(hp), sp = Math.sin(hp);
  const cr = Math.cos(hr), sr = Math.sin(hr);

  return quatNormalize([
    sr * cp * cy - cr * sp * sy,
    cr * sp * cy + sr * cp * sy,
    cr * cp * sy - sr * sp * cy,
    cr * cp * cy + sr * sp * sy,
  ]);
}

export function quatRotateVec3(q: Quat, v: Vec3): Vec3 {
  const u: Vec3 = [q[0], q[1], q[2]];
  const s = q[3];
  const uv = vec3Cross(u, v);
  const uuv = vec3Cross(u, uv);
  return [
    v[0] + 2 * (s * uv[0] + uuv[0]),
    v[1] + 2 * (s * uv[1] + uuv[1]),
    v[2] + 2 * (s * uv[2] + uuv[2]),
  ];
}

export function quatSlerp(a: Quat, b: Quat, t: number): Quat {
  let end = b;
  let cosTheta = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];

  if (cosTheta < 0) {
    cosTheta = -cosTheta;
    end = [-b[0], -b[1], -b[2], -b[3]];
  }

  if (cosTheta > 0.9995) {
    return quatNormalize([
      a[0] + (end[0] - a[0]) * t,
      a[1] + (end[1] - a[1]) * t,
      a[2] + (end[2] - a[2]) * t,
      a[3] + (end[3] - a[3]) * t,
    ]);
  }

  const theta = Math.acos(Math.min(1, Math.max(-1, cosTheta)));
  const sinTheta = Math.sin(theta);
  const left = Math.sin((1 - t) * theta) / sinTheta;
  const right = Math.sin(t * theta) / sinTheta;
  return [
    a[0] * left + end[0] * right,
    a[1] * left + end[1] * right,
    a[2] * left + end[2] * right,
    a[3] * left + end[3] * right,
  ];
}

export function quatLookRotation(forward: Vec3, up: Vec3 = [0, 1, 0]): Quat {
  const f = vec3Scale(forward, 1 / Math.max(Number.EPSILON, Math.hypot(...forward)));
  const r = vec3Scale(vec3Cross(up, f), 1 / Math.max(Number.EPSILON, Math.hypot(...vec3Cross(up, f))));
  const u = vec3Cross(f, r);
  const trace = r[0] + u[1] + f[2];

  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2;
    return quatNormalize([(u[2] - f[1]) / s, (f[0] - r[2]) / s, (r[1] - u[0]) / s, 0.25 * s]);
  }
  if (r[0] > u[1] && r[0] > f[2]) {
    const s = Math.sqrt(1 + r[0] - u[1] - f[2]) * 2;
    return quatNormalize([0.25 * s, (u[0] + r[1]) / s, (f[0] + r[2]) / s, (u[2] - f[1]) / s]);
  }
  if (u[1] > f[2]) {
    const s = Math.sqrt(1 + u[1] - r[0] - f[2]) * 2;
    return quatNormalize([(u[0] + r[1]) / s, 0.25 * s, (f[1] + u[2]) / s, (f[0] - r[2]) / s]);
  }
  const s = Math.sqrt(1 + f[2] - r[0] - u[1]) * 2;
  return quatNormalize([(f[0] + r[2]) / s, (f[1] + u[2]) / s, 0.25 * s, (r[1] - u[0]) / s]);
}

export function quatAngleBetween(a: Quat, b: Quat): number {
  const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return 2 * Math.acos(Math.min(1, Math.max(-1, dot)));
}
