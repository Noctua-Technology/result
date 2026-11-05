// BASELINE CODE FORKED FROM https://github.com/deebloo/ts-results
import { toString, wait } from "./util.js";

export const RESULT_BRAND = Symbol.for("noctuatech.result");

interface BaseResult<T, E> extends Iterable<T> {
  readonly [RESULT_BRAND]: boolean;

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
  orElse<T2, F>(mapper: (err: E) => Result<T2, F>): Result<T | T2, F>;

  /**
   * Returns the default value if `Err`, or applies the mapper function to the contained `Ok` value.
   */
  mapOr<U>(defaultVal: U, mapper: (val: T) => U): U;

  /**
   * Maps a `Result<T, E>` to `U` by applying `defaultFn` to a contained `Err` value,
   * or `mapper` to a contained `Ok` value.
   */
  mapOrElse<U>(defaultFn: (err: E) => U, mapper: (val: T) => U): U;

  /**
   * Maps a `Result<T, E>` to `AsyncResult<U, E>` by applying an async function to a contained `Ok` value,
   * leaving an `Err` value untouched.
   */
  mapAsync<U>(mapper: (val: T) => Promise<U>): AsyncResult<U, E>;

  /**
   * Calls `mapper` asynchronously if the result is `Ok`, otherwise returns the `Err` value of self.
   */
  andThenAsync<T2>(mapper: (val: T) => Promise<Ok<T2>>): AsyncResult<T2, E>;
  andThenAsync<E2>(mapper: (val: T) => Promise<Err<E2>>): AsyncResult<T, E | E2>;
  andThenAsync<T2, E2>(mapper: (val: T) => Promise<Result<T2, E2>>): AsyncResult<T2, E | E2>;

  /**
   * Converts this Result to an AsyncResult.
   */
  toAsyncResult(): AsyncResult<T, E>;

  /**
   * Shallow clones the result, preserving any existing stack traces for errors.
   */
  clone(): Result<T, E>;
}

/**
 * Contains the error value
 */
export class Err<E> implements BaseResult<never, E> {
  readonly [RESULT_BRAND] = true;
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
    throw new Error(`Tried to unwrap Error: ${toString(this.val)}\n${this.#stack}`);
  }

  map(_mapper: unknown): Err<E> {
    return this;
  }

  mapAsync(_mapper: unknown): AsyncResult<never, E> {
    return new AsyncErr(this.val);
  }

  andThen(op: unknown): Err<E> {
    return this;
  }

  andThenAsync(op: unknown): AsyncResult<never, E> {
    return new AsyncErr(this.val);
  }

  toAsyncResult(): AsyncErr<E> {
    return new AsyncErr(this.val);
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

  clone(): Err<E> {
    const copy = new Err(this.val);
    copy.#stack = this.#stack;
    if (this.attempted !== undefined) {
      copy.attempted = this.attempted;
    }
    return copy;
  }

  toString(): string {
    return `Err(${toString(this.val)})`;
  }
}

/**
 * Contains the success value
 */
export class Ok<T> implements BaseResult<T, never> {
  readonly [RESULT_BRAND] = true;
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

  mapAsync<U>(mapper: (val: T) => Promise<U>): AsyncResult<U, never> {
    return new AsyncOk(mapper(this.val));
  }

  andThen<T2>(mapper: (val: T) => Ok<T2>): Ok<T2>;
  andThen<E2>(mapper: (val: T) => Err<E2>): Result<T, E2>;
  andThen<T2, E2>(mapper: (val: T) => Result<T2, E2>): Result<T2, E2>;
  andThen<T2, E2>(mapper: (val: T) => Result<T2, E2>): Result<T2, E2> {
    return mapper(this.val);
  }

  andThenAsync<T2>(mapper: (val: T) => Promise<Ok<T2>>): AsyncResult<T2, never>;
  andThenAsync<E2>(mapper: (val: T) => Promise<Err<E2>>): AsyncResult<T, E2>;
  andThenAsync<T2, E2>(mapper: (val: T) => Promise<Result<T2, E2>>): AsyncResult<T2, E2>;
  andThenAsync<T2, E2>(mapper: (val: T) => Promise<Result<T2, E2>>): AsyncResult<T2, E2> {
    return new AsyncResult(mapper(this.val));
  }

  toAsyncResult(): AsyncOk<T> {
    return new AsyncOk(this.val);
  }

  mapErr(_mapper: unknown): Ok<T> {
    return this;
  }

  orElse(_mapper: unknown): Ok<T> {
    return this;
  }

  mapOr<U>(_defaultVal: U, mapper: (val: T) => U): U {
    return mapper(this.val);
  }

  mapOrElse<U>(_defaultFn: (err: never) => U, mapper: (val: T) => U): U {
    return mapper(this.val);
  }

  clone(): Ok<T> {
    return new Ok(this.val);
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
  export function wrapAsync<T, E = unknown>(op: () => Promise<T> | T): AsyncResult<T, E> {
    return AsyncResult.wrap<T, E>(op);
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
      const finalErr = res.clone();
      finalErr.attempted = true;

      return finalErr;
    }

    return res;
  }

  export function isResult<T = any, E = any>(val: unknown): val is Result<T, E> {
    return typeof val === "object" && val !== null && RESULT_BRAND in val;
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
  export function all(results: Result<unknown, unknown>[]): Result<unknown[], unknown> {
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

export const ASYNC_RESULT_BRAND = Symbol.for("noctuatech.async-result");

export class AsyncResult<T, E> implements PromiseLike<Result<T, E>> {
  readonly [ASYNC_RESULT_BRAND] = true;
  readonly #promise: Promise<Result<T, E>>;

  constructor(input: Result<T, E> | PromiseLike<Result<T, E>>) {
    this.#promise = Promise.resolve(input);
  }

  then<TResult1 = Result<T, E>, TResult2 = never>(
    onfulfilled?: ((value: Result<T, E>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.#promise.then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ): Promise<Result<T, E> | TResult> {
    return this.#promise.catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<Result<T, E>> {
    return this.#promise.finally(onfinally);
  }

  toPromise(): Promise<Result<T, E>> {
    return this.#promise;
  }

  map<U>(mapper: (val: T) => U | PromiseLike<U>): AsyncResult<U, E> {
    return new AsyncResult<U, E>(
      this.#promise.then(async (res) => {
        if (res.ok) {
          const mapped = await mapper(res.val);
          return new Ok(mapped);
        }
        return res;
      }),
    );
  }

  mapErr<F>(mapper: (err: E) => F | PromiseLike<F>): AsyncResult<T, F> {
    return new AsyncResult<T, F>(
      this.#promise.then(async (res) => {
        if (res.err) {
          const mapped = await mapper(res.val);
          return new Err(mapped);
        }
        return res;
      }),
    );
  }

  andThen<T2, E2>(
    mapper: (val: T) => Result<T2, E2> | AsyncResult<T2, E2> | PromiseLike<Result<T2, E2>>,
  ): AsyncResult<T2, E | E2> {
    return new AsyncResult<T2, E | E2>(
      this.#promise.then(async (res) => {
        if (res.ok) {
          return await mapper(res.val);
        }
        return res;
      }),
    );
  }

  orElse<T2, F>(
    mapper: (err: E) => Result<T2, F> | AsyncResult<T2, F> | PromiseLike<Result<T2, F>>,
  ): AsyncResult<T | T2, F> {
    return new AsyncResult<T | T2, F>(
      this.#promise.then(async (res) => {
        if (res.err) {
          return await mapper(res.val);
        }
        return res;
      }),
    );
  }

  async unwrap(): Promise<T> {
    const res = await this.#promise;
    return res.unwrap();
  }

  async unwrapOr<T2>(defaultVal: T2): Promise<T | T2> {
    const res = await this.#promise;
    return res.unwrapOr(defaultVal);
  }

  async unwrapOrElse<T2>(fn: (err: E) => T2 | PromiseLike<T2>): Promise<T | T2> {
    const res = await this.#promise;
    if (res.err) {
      return await fn(res.val);
    }
    return res.val;
  }

  async expect(msg: string): Promise<T> {
    const res = await this.#promise;
    return res.expect(msg);
  }

  async expectErr(msg: string): Promise<E> {
    const res = await this.#promise;
    return res.expectErr(msg);
  }

  async mapOr<U>(defaultVal: U, mapper: (val: T) => U | PromiseLike<U>): Promise<U> {
    const res = await this.#promise;
    if (res.ok) {
      return await mapper(res.val);
    }
    return defaultVal;
  }

  async mapOrElse<U>(
    defaultFn: (err: E) => U | PromiseLike<U>,
    mapper: (val: T) => U | PromiseLike<U>,
  ): Promise<U> {
    const res = await this.#promise;
    if (res.ok) {
      return await mapper(res.val);
    }
    return await defaultFn(res.val);
  }

  clone(): AsyncResult<T, E> {
    return new AsyncResult<T, E>(this.#promise.then((res) => res.clone()));
  }

  get [Symbol.toStringTag](): string {
    return "AsyncResult";
  }

  static ok<T, E = never>(val: T | PromiseLike<T>): AsyncOk<T> {
    return new AsyncOk(val);
  }

  static err<E, T = never>(err: E | PromiseLike<E>): AsyncErr<E> {
    return new AsyncErr(err);
  }

  static from<T, E>(input: Result<T, E> | PromiseLike<Result<T, E>>): AsyncResult<T, E> {
    return new AsyncResult(input);
  }

  static wrap<T, E = unknown>(op: () => Promise<T> | T): AsyncResult<T, E> {
    return new AsyncResult(
      (async () => {
        try {
          const val = await op();
          return new Ok(val);
        } catch (e) {
          return new Err<E>(e as E);
        }
      })(),
    );
  }

  static all<
    T extends readonly (Result<unknown, unknown> | PromiseLike<Result<unknown, unknown>>)[],
  >(
    results: [...T],
  ): AsyncResult<
    {
      [K in keyof T]: T[K] extends PromiseLike<Result<infer U, any>>
        ? U
        : T[K] extends Result<infer U, any>
          ? U
          : never;
    },
    {
      [K in keyof T]: T[K] extends PromiseLike<Result<any, infer F>>
        ? F
        : T[K] extends Result<any, infer F>
          ? F
          : never;
    }[number]
  >;
  static all<T, E>(results: (Result<T, E> | PromiseLike<Result<T, E>>)[]): AsyncResult<T[], E>;
  static all(
    results: (Result<unknown, unknown> | PromiseLike<Result<unknown, unknown>>)[],
  ): AsyncResult<unknown[], unknown> {
    return new AsyncResult(
      Promise.all(results.map((r) => Promise.resolve(r))).then((resolved) => Result.all(resolved)),
    );
  }
}

export class AsyncOk<T> extends AsyncResult<T, never> {
  constructor(val: T | Ok<T> | PromiseLike<T | Ok<T>>) {
    super(
      Promise.resolve(val).then((v) => {
        if (v instanceof Ok) {
          return v;
        }
        return new Ok(v);
      }),
    );
  }

  override get [Symbol.toStringTag](): string {
    return "AsyncOk";
  }
}

export class AsyncErr<E> extends AsyncResult<never, E> {
  constructor(err: E | Err<E> | PromiseLike<E | Err<E>>) {
    super(
      Promise.resolve(err).then((e) => {
        if (e instanceof Err) {
          return e;
        }
        return new Err(e);
      }),
    );
  }

  override get [Symbol.toStringTag](): string {
    return "AsyncErr";
  }
}

export function isAsyncResult<T = any, E = any>(val: unknown): val is AsyncResult<T, E> {
  return typeof val === "object" && val !== null && ASYNC_RESULT_BRAND in val;
}
