/**
 * Deep equality for plain objects, arrays, and primitives.
 *
 * Adapted from `deepEqual` in [fast-equals](https://github.com/planttheidea/fast-equals)
 * (MIT, Copyright (c) 2025 Tony Quetano). Map, Set, TypedArray, circular, and strict
 * variants are omitted; MediaTrackConstraints only need this path.
 */

export function deepEqual(a: unknown, b: unknown): boolean {
  return isEqual(a, b);
}

function isEqual(a: unknown, b: unknown): boolean {
  if (sameValueZeroEqual(a, b)) {
    return true;
  }

  if (!isObject(a) || !isObject(b) || a.constructor !== b.constructor) {
    return false;
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    return areArraysEqual(a, b);
  }

  return areObjectsEqual(a, b);
}

function sameValueZeroEqual(a: unknown, b: unknown): boolean {
  return a === b || (a !== a && b !== b);
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function areArraysEqual(a: unknown[], b: unknown[]): boolean {
  let index = a.length;

  if (b.length !== index) {
    return false;
  }

  while (index-- > 0) {
    if (!isEqual(a[index], b[index])) {
      return false;
    }
  }

  return true;
}

function areObjectsEqual(a: object, b: object): boolean {
  let properties = Object.keys(a);

  if (Object.keys(b).length !== properties.length) {
    return false;
  }

  for (let property of properties) {
    if (
      !Object.hasOwn(b, property) ||
      !isEqual(Reflect.get(a, property), Reflect.get(b, property))
    ) {
      return false;
    }
  }

  return true;
}
