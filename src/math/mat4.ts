import type { Quat } from "./quat.js";
import type { Vec3 } from "./vec3.js";

export type Mat4 = readonly [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
];

export const MAT4_IDENTITY: Mat4 = Object.freeze([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

export function mat4Identity(): Mat4 {
  return [...MAT4_IDENTITY] as Mat4;
}

export function mat4Mul(a: Mat4, b: Mat4): Mat4 {
  const out = new Array<number>(16).fill(0);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return [
    out[0], out[1], out[2], out[3],
    out[4], out[5], out[6], out[7],
    out[8], out[9], out[10], out[11],
    out[12], out[13], out[14], out[15],
  ];
}

export function mat4FromRotationTranslationScale(rotation: Quat, translation: Vec3, scale: Vec3 = [1, 1, 1]): Mat4 {
  const x = rotation[0], y = rotation[1], z = rotation[2], w = rotation[3];
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  const sx = scale[0], sy = scale[1], sz = scale[2];

  return [
    (1 - (yy + zz)) * sx,
    (xy + wz) * sx,
    (xz - wy) * sx,
    0,
    (xy - wz) * sy,
    (1 - (xx + zz)) * sy,
    (yz + wx) * sy,
    0,
    (xz + wy) * sz,
    (yz - wx) * sz,
    (1 - (xx + yy)) * sz,
    0,
    translation[0],
    translation[1],
    translation[2],
    1,
  ];
}

export function mat4TransformPoint(m: Mat4, point: Vec3): Vec3 {
  const x = point[0], y = point[1], z = point[2];
  const w = m[3] * x + m[7] * y + m[11] * z + m[15];
  const invW = Math.abs(w) > Number.EPSILON ? 1 / w : 1;
  return [
    (m[0] * x + m[4] * y + m[8] * z + m[12]) * invW,
    (m[1] * x + m[5] * y + m[9] * z + m[13]) * invW,
    (m[2] * x + m[6] * y + m[10] * z + m[14]) * invW,
  ];
}

export function mat4TransformDirection(m: Mat4, direction: Vec3): Vec3 {
  const x = direction[0], y = direction[1], z = direction[2];
  return [
    m[0] * x + m[4] * y + m[8] * z,
    m[1] * x + m[5] * y + m[9] * z,
    m[2] * x + m[6] * y + m[10] * z,
  ];
}

export function mat4Invert(m: Mat4): Mat4 | null {
  const out = new Array<number>(16);
  const b00 = m[0] * m[5] - m[1] * m[4];
  const b01 = m[0] * m[6] - m[2] * m[4];
  const b02 = m[0] * m[7] - m[3] * m[4];
  const b03 = m[1] * m[6] - m[2] * m[5];
  const b04 = m[1] * m[7] - m[3] * m[5];
  const b05 = m[2] * m[7] - m[3] * m[6];
  const b06 = m[8] * m[13] - m[9] * m[12];
  const b07 = m[8] * m[14] - m[10] * m[12];
  const b08 = m[8] * m[15] - m[11] * m[12];
  const b09 = m[9] * m[14] - m[10] * m[13];
  const b10 = m[9] * m[15] - m[11] * m[13];
  const b11 = m[10] * m[15] - m[11] * m[14];
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

  if (Math.abs(det) <= Number.EPSILON) return null;
  const invDet = 1 / det;

  out[0] = (m[5] * b11 - m[6] * b10 + m[7] * b09) * invDet;
  out[1] = (m[2] * b10 - m[1] * b11 - m[3] * b09) * invDet;
  out[2] = (m[13] * b05 - m[14] * b04 + m[15] * b03) * invDet;
  out[3] = (m[10] * b04 - m[9] * b05 - m[11] * b03) * invDet;
  out[4] = (m[6] * b08 - m[4] * b11 - m[7] * b07) * invDet;
  out[5] = (m[0] * b11 - m[2] * b08 + m[3] * b07) * invDet;
  out[6] = (m[14] * b02 - m[12] * b05 - m[15] * b01) * invDet;
  out[7] = (m[8] * b05 - m[10] * b02 + m[11] * b01) * invDet;
  out[8] = (m[4] * b10 - m[5] * b08 + m[7] * b06) * invDet;
  out[9] = (m[1] * b08 - m[0] * b10 - m[3] * b06) * invDet;
  out[10] = (m[12] * b04 - m[13] * b02 + m[15] * b00) * invDet;
  out[11] = (m[9] * b02 - m[8] * b04 - m[11] * b00) * invDet;
  out[12] = (m[5] * b07 - m[4] * b09 - m[6] * b06) * invDet;
  out[13] = (m[0] * b09 - m[1] * b07 + m[2] * b06) * invDet;
  out[14] = (m[13] * b01 - m[12] * b03 - m[14] * b00) * invDet;
  out[15] = (m[8] * b03 - m[9] * b01 + m[10] * b00) * invDet;

  return [
    out[0], out[1], out[2], out[3],
    out[4], out[5], out[6], out[7],
    out[8], out[9], out[10], out[11],
    out[12], out[13], out[14], out[15],
  ];
}

export function mat4AlmostEqual(a: Mat4, b: Mat4, epsilon = 1e-9): boolean {
  return a.every((value, index) => Math.abs(value - b[index]) <= epsilon);
}
