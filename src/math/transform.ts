import type { Mat4 } from "./mat4.js";
import { mat4FromRotationTranslationScale, mat4Invert, mat4Mul, mat4TransformPoint } from "./mat4.js";
import type { Quat } from "./quat.js";
import { QUAT_IDENTITY, quatConjugate, quatMul, quatNormalize, quatRotateVec3 } from "./quat.js";
import type { Vec3 } from "./vec3.js";
import { VEC3_ONE, VEC3_ZERO, vec3Add, vec3Scale } from "./vec3.js";

export interface Transform3D {
  translation: Vec3;
  rotation: Quat;
  scale: Vec3;
}

export const TRANSFORM_IDENTITY: Transform3D = Object.freeze({
  translation: VEC3_ZERO,
  rotation: QUAT_IDENTITY,
  scale: VEC3_ONE,
});

export function transform3D(input: Partial<Transform3D> = {}): Transform3D {
  return {
    translation: input.translation ?? VEC3_ZERO,
    rotation: quatNormalize(input.rotation ?? QUAT_IDENTITY),
    scale: input.scale ?? VEC3_ONE,
  };
}

export function transformToMat4(transform: Transform3D): Mat4 {
  return mat4FromRotationTranslationScale(
    transform.rotation,
    transform.translation,
    transform.scale,
  );
}

export function transformPoint(transform: Transform3D, point: Vec3): Vec3 {
  return mat4TransformPoint(transformToMat4(transform), point);
}

export function composeTransforms(parent: Transform3D, child: Transform3D): Transform3D {
  const scaledChildTranslation: Vec3 = [
    child.translation[0] * parent.scale[0],
    child.translation[1] * parent.scale[1],
    child.translation[2] * parent.scale[2],
  ];
  return {
    translation: vec3Add(parent.translation, quatRotateVec3(parent.rotation, scaledChildTranslation)),
    rotation: quatNormalize(quatMul(parent.rotation, child.rotation)),
    scale: [
      parent.scale[0] * child.scale[0],
      parent.scale[1] * child.scale[1],
      parent.scale[2] * child.scale[2],
    ],
  };
}

export function invertTransform(transform: Transform3D): Transform3D | null {
  if (
    Math.abs(transform.scale[0]) <= Number.EPSILON ||
    Math.abs(transform.scale[1]) <= Number.EPSILON ||
    Math.abs(transform.scale[2]) <= Number.EPSILON
  ) {
    return null;
  }

  const inverseRotation = quatConjugate(quatNormalize(transform.rotation));
  const inverseScale: Vec3 = [
    1 / transform.scale[0],
    1 / transform.scale[1],
    1 / transform.scale[2],
  ];
  const inverseTranslation = quatRotateVec3(
    inverseRotation,
    vec3Scale(transform.translation, -1),
  );

  return {
    translation: [
      inverseTranslation[0] * inverseScale[0],
      inverseTranslation[1] * inverseScale[1],
      inverseTranslation[2] * inverseScale[2],
    ],
    rotation: inverseRotation,
    scale: inverseScale,
  };
}

export function composeTransformMatrices(parent: Transform3D, child: Transform3D): Mat4 {
  return mat4Mul(transformToMat4(parent), transformToMat4(child));
}

export function invertTransformMatrix(transform: Transform3D): Mat4 | null {
  return mat4Invert(transformToMat4(transform));
}
