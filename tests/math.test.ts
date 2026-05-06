import { describe, expect, it } from "vitest";
import {
  composeTransformMatrices,
  composeTransforms,
  invertTransform,
  mat4AlmostEqual,
  mat4Invert,
  mat4Mul,
  mat4TransformPoint,
  quatFromAxisAngle,
  quatMul,
  quatRotateVec3,
  quatSlerp,
  transform3D,
  transformToMat4,
  vec3,
  vec3AlmostEqual,
  vec3Cross,
  vec3Dot,
  vec3Normalize,
} from "../src/math/index";

describe("math primitives", () => {
  it("computes canonical vector operations", () => {
    expect(vec3Dot(vec3(1, 2, 3), vec3(4, -5, 6))).toBe(12);
    expect(vec3Cross(vec3(1, 0, 0), vec3(0, 1, 0))).toEqual(vec3(0, 0, 1));
    expect(vec3AlmostEqual(vec3Normalize(vec3(0, 3, 4)), vec3(0, 0.6, 0.8))).toBe(true);
  });

  it("rotates vectors with quaternions and composes rotations", () => {
    const quarterTurnY = quatFromAxisAngle(vec3(0, 1, 0), Math.PI / 2);
    const rotated = quatRotateVec3(quarterTurnY, vec3(1, 0, 0));

    expect(vec3AlmostEqual(rotated, vec3(0, 0, -1), 1e-9)).toBe(true);

    const halfTurnY = quatMul(quarterTurnY, quarterTurnY);
    expect(vec3AlmostEqual(quatRotateVec3(halfTurnY, vec3(1, 0, 0)), vec3(-1, 0, 0), 1e-9)).toBe(true);
  });

  it("slerps halfway between identity and a half turn", () => {
    const halfTurnY = quatFromAxisAngle(vec3(0, 1, 0), Math.PI);
    const halfway = quatSlerp([0, 0, 0, 1], halfTurnY, 0.5);
    expect(vec3AlmostEqual(quatRotateVec3(halfway, vec3(1, 0, 0)), vec3(0, 0, -1), 1e-9)).toBe(true);
  });

  it("builds and inverts transform matrices", () => {
    const transform = transform3D({
      translation: vec3(2, 3, 4),
      rotation: quatFromAxisAngle(vec3(0, 1, 0), Math.PI / 2),
      scale: vec3(2, 2, 2),
    });
    const matrix = transformToMat4(transform);
    const inverse = mat4Invert(matrix);

    expect(inverse).not.toBeNull();
    expect(mat4AlmostEqual(mat4Mul(matrix, inverse!), [
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1,
    ], 1e-9)).toBe(true);
    expect(vec3AlmostEqual(mat4TransformPoint(matrix, vec3(1, 0, 0)), vec3(2, 3, 2), 1e-9)).toBe(true);
  });

  it("keeps transform composition aligned with matrix composition", () => {
    const parent = transform3D({
      translation: vec3(1, 0, 0),
      rotation: quatFromAxisAngle(vec3(0, 1, 0), Math.PI / 2),
      scale: vec3(1, 1, 1),
    });
    const child = transform3D({
      translation: vec3(0, 0, 2),
      rotation: quatFromAxisAngle(vec3(0, 0, 1), Math.PI / 2),
      scale: vec3(1, 1, 1),
    });

    const composed = composeTransforms(parent, child);
    const composedMatrix = composeTransformMatrices(parent, child);

    expect(vec3AlmostEqual(
      mat4TransformPoint(transformToMat4(composed), vec3(1, 0, 0)),
      mat4TransformPoint(composedMatrix, vec3(1, 0, 0)),
      1e-9,
    )).toBe(true);
  });

  it("inverts uniform transforms without matrix decomposition", () => {
    const transform = transform3D({
      translation: vec3(2, 0, 0),
      rotation: quatFromAxisAngle(vec3(0, 1, 0), Math.PI / 2),
      scale: vec3(2, 2, 2),
    });
    const inverse = invertTransform(transform);

    expect(inverse).not.toBeNull();
    const point = vec3(4, 0, 0);
    const local = mat4TransformPoint(transformToMat4(inverse!), mat4TransformPoint(transformToMat4(transform), point));
    expect(vec3AlmostEqual(local, point, 1e-9)).toBe(true);
  });
});
