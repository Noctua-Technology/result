export function toString(val: unknown): string {
  try {
    if (val === null) {
      return "null";
    }

    if (val === undefined) {
      return "undefined";
    }

    if (typeof val === "object" && Object.getPrototypeOf(val) === null) {
      return JSON.stringify(val);
    }

    let value = String(val);

    if (value === "[object Object]") {
      value = JSON.stringify(val);
    }

    return value;
  } catch {
    return "[Unserializable Value]";
  }
}

export function wait(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function isNormalObject(val: unknown): val is object {
  return typeof val === "object" && !Array.isArray(val) && val !== null;
}
