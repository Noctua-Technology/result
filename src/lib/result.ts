// BASELINE CODE FORKED FROM https://github.com/deebloo/ts-results
import { toString } from "./util.js";

interface BaseResult<T, E>
  extends Iterable<T extends Iterable<infer U> ? U : never> {
  /** `true` when the result is Ok */ readonly ok: boolean;
  /** `true` when the result is Err */ readonly err: boolean;

  /**
   * Returns the contained `Ok` value, if exists.  Throws an error if not.
   * @param msg the message to throw if no Ok value.
   */
  expect(msg: string): T;

  /**
   * Returns the contained `Ok` value, if does not exist.  Throws an error if it does.
   * @param msg the message to throw if Ok value.
   */
  expectErr(msg: string): E;

  /**
   * Returns the contained `Ok` value.
   * Because this function may throw, its use is generally discouraged.
   * Instead, prefer to handle the `Err` case explicitly.
   *
   * Throws if the value is an `Err`, with a message provided by the `Err`'s value.
   */
  unwrap(): T;

  /**
   * Returns the contained `Ok` value or a provided default.
   *
   *  (This is the `unwrap_or` in rust)
   */
  unwrapOr<T2 extends T>(val: T2): T | T2;

  /**
   * Calls `mapper` if the result is `Ok`, otherwise returns the `Err` value of self.
   * This function can be used for control flow based on `Result` values.
   */
  andThen<T2>(mapper: (val: T) => Ok<T2>): Result<T2, E>;
  andThen<E2>(mapper: (val: T) => Err<E2>): Result<T, E | E2>;
  andThen<T2, E2>(mapper: (val: T) => Result<T2, E2>): Result<T2, E | E2>;
  andThen<T2, E2>(mapper: (val: T) => Result<T2, E2>): Result<T2, E | E2>;

  /**
   * Maps a `Result<T, E>` to `Result<U, E>` by applying a function to a contained `Ok` value,
   * leaving an `Err` value untouched.
   *
   * This function can be used to compose the results of two functions.
   */
  map<U>(mapper: (val: T) => U): Result<U, E>;

  /**
   * Maps a `Result<T, E>` to `Result<T, F>` by applying a function to a contained `Err` value,
   * leaving an `Ok` value untouched.
   *
   * This function can be used to pass through a successful result while handling an error.
   */
  mapErr<F>(mapper: (val: E) => F): Result<T, F>;

  retry(n: number): Result<T, E>;
}

/**
 * Contains the error value
 */
export class Err<E> implements BaseResult<never, E> {
  readonly ok: false = false;
  readonly err: true = true;
  readonly val: E;

  #stack: string = "";

  [Symbol.iterator](): Iterator<never, never, any> {
    return {
      next(): IteratorResult<never, never> {
        return { done: true, value: undefined! };
      },
    };
  }

  get stack(): string | undefined {
    return `${this}\n${this.#stack}`;
  }

  constructor(val: E) {
    this.val = val;

    const stackLines = new Error().stack!.split("\n").slice(2);
    if (
      stackLines &&
      stackLines.length > 0 &&
      stackLines[0].includes("ErrImpl")
    ) {
      stackLines.shift();
    }

    this.#stack = stackLines.join("\n");
  }

  unwrapOr<T2>(val: T2): T2 {
    return val;
  }

  expect(msg: string): never {
    throw new Error(`${msg} - Error: ${toString(this.val)}\n${this.#stack}`);
  }

  expectErr(_msg: string): E {
    return this.val;
  }

  unwrap(): never {
    throw new Error(
      `Tried to unwrap Error: ${toString(this.val)}\n${this.#stack}`
    );
  }

  map(_mapper: unknown): Err<E> {
    return this;
  }

  andThen(op: unknown): Err<E> {
    return this;
  }

  mapErr<E2>(mapper: (err: E) => E2): Err<E2> {
    return new Err(mapper(this.val));
  }

  toString(): string {
    return `Err(${toString(this.val)})`;
  }

  retry(n: number): Err<E> {
    return this;
  }
}

/**
 * Contains the success value
 */
export class Ok<T> implements BaseResult<T, never> {
  readonly ok: true = true;
  readonly err: false = false;
  readonly val: T;

  /**
   * Helper function if you know you have an Ok<T> and T is iterable
   */
  [Symbol.iterator](): Iterator<T extends Iterable<infer U> ? U : never> {
    const obj = Object(this.val) as Iterable<any>;

    return Symbol.iterator in obj
      ? obj[Symbol.iterator]()
      : {
          next(): IteratorResult<never, never> {
            return { done: true, value: undefined! };
          },
        };
  }

  constructor(val: T) {
    this.val = val;
  }

  unwrapOr(_val: unknown): T {
    return this.val;
  }

  expect(_msg: string): T {
    return this.val;
  }

  expectErr(msg: string): never {
    throw new Error(msg);
  }

  unwrap(): T {
    return this.val;
  }

  map<T2>(mapper: (val: T) => T2): Ok<T2> {
    return new Ok(mapper(this.val));
  }

  andThen<T2>(mapper: (val: T) => Ok<T2>): Ok<T2>;
  andThen<E2>(mapper: (val: T) => Err<E2>): Result<T, E2>;
  andThen<T2, E2>(mapper: (val: T) => Result<T2, E2>): Result<T2, E2>;
  andThen<T2, E2>(mapper: (val: T) => Result<T2, E2>): Result<T2, E2> {
    return mapper(this.val);
  }

  mapErr(_mapper: unknown): Ok<T> {
    return this;
  }

  /**
   * Returns the contained `Ok` value, but never throws.
   * Unlike `unwrap()`, this method doesn't throw and is only callable on an Ok<T>
   *
   * Therefore, it can be used instead of `unwrap()` as a maintainability safeguard
   * that will fail to compile if the error type of the Result is later changed to an error that can actually occur.
   *
   * (this is the `into_ok()` in rust)
   */
  safeUnwrap(): T {
    return this.val;
  }

  toString(): string {
    return `Ok(${toString(this.val)})`;
  }

  retry(n: number): Ok<T> {
    return this;
  }
}

export type Result<T, E> = Ok<T> | Err<E>;

export namespace Result {
  export function ok<T>(val: T): Ok<T> {
    return new Ok(val);
  }

  export function err<T>(val: T): Err<T> {
    return new Err(val);
  }

  /**
   * Wrap an operation that may throw an Error (`try-catch` style) into checked exception style
   * @param op The operation function
   */
  export function wrap<T, E = unknown>(op: () => T): Result<T, E> {
    try {
      return new Ok(op());
    } catch (e) {
      return new Err<E>(e as E);
    }
  }

  /**
   * Wrap an async operation that may throw an Error (`try-catch` style) into checked exception style
   * @param op The operation function
   */
  export async function wrapAsync<T, E = unknown>(
    op: () => Promise<T>
  ): Promise<Result<T, E>> {
    try {
      return op()
        .then((val) => new Ok(val))
        .catch((e) => new Err(e));
    } catch (e) {
      return new Err(e as E);
    }
  }

  export async function attempt<T, E>(
    cb: () => Promise<Result<T, E>>,
    { attempts = 3, timeout = 1000, backoff = 0.5 } = {}
  ) {
    let count = 1;
    let waitTime = timeout;

    let res = await cb();

    while (res.err && count < attempts) {
      await wait(waitTime);

      res = await cb();

      count++;
      waitTime = timeout * Math.pow(1 + backoff, count); // update wait time
    }

    return res;
  }

  export function isResult<T = any, E = any>(
    val: unknown
  ): val is Result<T, E> {
    return val instanceof Err || val instanceof Ok;
  }
}

function wait(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
