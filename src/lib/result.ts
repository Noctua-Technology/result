// BASELINE CODE FORKED FROM https://github.com/deebloo/ts-results
import { toString, wait } from "./util.js";

interface BaseResult<T, E> extends Iterable<T> {
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
   * Returns the contained `Ok` value or computes it from a closure.
   */
  unwrapOrElse<T2 extends T>(fn: (err: E) => T2): T | T2;

  /**
   * Calls `mapper` if the result is `Ok`, otherwise returns the `Err` value of self.
   * This function can be used for control flow based on `Result` values.
   */
  andThen<T2>(mapper: (val: T) => Ok<T2>): Result<T2, E>;
  andThen<E2>(mapper: (val: T) => Err<E2>): Result<T, E | E2>;
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

  /**
   * Calls `mapper` if the result is `Err`, otherwise returns the `Ok` value of self.
   */
  orElse<F>(mapper: (err: E) => Result<T, F>): Result<T, F>;

  /**
   * Returns the default value if `Err`, or applies the mapper function to the contained `Ok` value.
   */
  mapOr<U>(defaultVal: U, mapper: (val: T) => U): U;

  /**
   * Maps a `Result<T, E>` to `U` by applying `defaultFn` to a contained `Err` value,
   * or `mapper` to a contained `Ok` value.
   */
  mapOrElse<U>(defaultFn: (err: E) => U, mapper: (val: T) => U): U;
}

/**
 * Contains the error value
 */
export class Err<E> implements BaseResult<never, E> {
  readonly ok: false = false;
  readonly err: true = true;
  readonly val: E;

  attempted?: undefined | boolean;

  #stack: string = "";

  *[Symbol.iterator](): Generator<never, void, unknown> {
    // Err contains 0 elements
  }

  get stack(): string | undefined {
    return `${this}\n${this.#stack}`;
  }

  constructor(val: E) {
    this.val = val;

    if (Result.captureStackTrace) {
      try {
        const rawStack = new Error().stack;
        if (rawStack) {
          const stackLines = rawStack.split("\n").slice(2);
          if (stackLines.length > 0 && stackLines[0]?.includes("ErrImpl")) {
            stackLines.shift();
          }
          this.#stack = stackLines.join("\n");
        }
      } catch {
        this.#stack = "";
      }
    }
  }

  unwrapOr<T2>(val: T2): T2 {
    return val;
  }

  unwrapOrElse<T2>(fn: (err: E) => T2): T2 {
    return fn(this.val);
  }

  expect(msg: string): never {
    throw new Error(`${msg} - Error: ${toString(this.val)}\n${this.#stack}`);
  }

  expectErr(_msg: string): E {
    return this.val;
  }

  unwrap(): never {
    throw new Error(
      `Tried to unwrap Error: ${toString(this.val)}\n${this.#stack}`,
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

  orElse<T2, F>(mapper: (err: E) => Result<T2, F>): Result<T2, F> {
    return mapper(this.val);
  }

  mapOr<U>(defaultVal: U, _mapper: (val: never) => U): U {
    return defaultVal;
  }

  mapOrElse<U>(defaultFn: (err: E) => U, _mapper: (val: never) => U): U {
    return defaultFn(this.val);
  }

  toString(): string {
    return `Err(${toString(this.val)})`;
  }
}

/**
 * Contains the success value
 */
export class Ok<T> implements BaseResult<T, never> {
  readonly ok: true = true;
  readonly err: false = false;
  readonly val: T;

  *[Symbol.iterator](): Generator<T, void, unknown> {
    yield this.val;
  }

  constructor(val: T) {
    this.val = val;
  }

  unwrapOr(_val: unknown): T {
    return this.val;
  }

  unwrapOrElse(_fn: (err: never) => unknown): T {
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

  orElse<F>(_mapper: (err: never) => Result<T, F>): Ok<T> {
    return this;
  }

  mapOr<U>(_defaultVal: U, mapper: (val: T) => U): U {
    return mapper(this.val);
  }

  mapOrElse<U>(_defaultFn: (err: never) => U, mapper: (val: T) => U): U {
    return mapper(this.val);
  }

  toString(): string {
    return `Ok(${toString(this.val)})`;
  }
}

export type Result<T, E> = Ok<T> | Err<E>;

export namespace Result {
  export let captureStackTrace = true;

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
    op: () => Promise<T> | T,
  ): Promise<Result<T, E>> {
    try {
      const val = await op();
      return new Ok(val);
    } catch (e) {
      return new Err<E>(e as E);
    }
  }

  /**
   * Wrap an async function that returns a result. Attempts to retry if the callback returns Err.
   *
   * @param cb
   * @param param1
   */
  export async function attempt<T, E>(
    cb: () => Promise<Result<T, E>>,
    { attempts = 3, timeout = 1000, backoff = 0.5 } = {},
  ) {
    let count = 1;
    let waitTime = timeout;

    let res: Result<T, E>;

    try {
      res = await cb();
    } catch (e) {
      res = new Err<E>(e as E);
    }

    if (res.err && res.attempted === true) {
      return res;
    }

    while (res.err && count < attempts) {
      await wait(waitTime);

      try {
        res = await cb();
      } catch (e) {
        res = new Err<E>(e as E);
      }

      count++;
      waitTime = timeout * Math.pow(1 + backoff, count); // update wait time
    }

    if (res.err) {
      res.attempted = true;
    }

    return res;
  }

  export function isResult<T = any, E = any>(
    val: unknown,
  ): val is Result<T, E> {
    return val instanceof Err || val instanceof Ok;
  }

  /**
   * Takes an array (or tuple) of Results and returns an `Ok` containing all
   * success values in the same shape, or the first `Err` encountered.
   */
  export function all<T extends readonly Result<unknown, unknown>[]>(
    results: [...T],
  ): Result<
    { [K in keyof T]: T[K] extends Result<infer U, any> ? U : never },
    { [K in keyof T]: T[K] extends Result<any, infer F> ? F : never }[number]
  >;
  export function all<T, E>(results: Result<T, E>[]): Result<T[], E>;
  export function all(
    results: Result<unknown, unknown>[],
  ): Result<unknown[], unknown> {
    const values: unknown[] = [];
    for (const result of results) {
      if (result.err) {
        return result;
      }
      values.push(result.val);
    }
    return new Ok(values);
  }
}
