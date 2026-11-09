// BASELINE CODE FORKED FROM https://github.com/deebloo/ts-results
import { UnreachableError } from "./errors.js";
import { isNormalObject, toString, wait } from "./util.js";
export { SyncOk as Ok, SyncErr as Err };
export const RESULT_BRAND = Symbol.for("noctuatech.result");

type ResultBrand = ResultBrandV0 | ResultBrandV1;

/** Values assigned to the {@link RESULT_BRAND} symbol to determine compatibility */
export interface ResultBrandV1 {
  version: 1;
  type: ResultTypeV1;
}

export enum ResultTypeV1 {
  /** Not a result */
  NONE = 0,
  /** Is a synchronous result */
  SYNC = 1,
  /** Is an asynchronous result */
  ASYNC = 2,
}

type ResultBrandV0 = true;

type Ok<T> = SyncOk<T> | AsyncOk<T>;
type Err<T> = SyncErr<T> | AsyncErr<T>;

type MaybePromise<T> = Promise<T> | T;

/**
 * Represents an operation that can fail. Results may be synchronous or asynchronous.
 * Asynchronous results are thenable, and can be awaited.
 */
export interface Result<T, E> {
  readonly [RESULT_BRAND]: ResultBrandV1;

  /** `true` when the result is Ok */
  readonly ok: MaybePromise<boolean>;

  /** `true` when the result is Err */
  readonly err: MaybePromise<boolean>;

  /** The contained value within the result */
  readonly val: MaybePromise<T | E>;

  /**
   * Returns the contained `Ok` value, if exists.  Throws an error if not.
   * @param msg the message to throw if no Ok value.
   */
  expect(msg: string): MaybePromise<T>;

  /**
   * Returns the contained `Ok` value, if does not exist.  Throws an error if it does.
   * @param msg the message to throw if Ok value.
   */
  expectErr(msg: string): MaybePromise<E>;

  /**
   * Returns the contained `Ok` value.
   * Because this function may throw, its use is generally discouraged.
   * Instead, prefer to handle the `Err` case explicitly.
   *
   * Throws if the value is an `Err`, with a message provided by the `Err`'s value.
   */
  unwrap(): MaybePromise<T>;

  /**
   * Returns the contained `Ok` value or a provided default.
   *
   *  (This is the `unwrap_or` in rust)
   */
  unwrapOr<U>(val: MaybePromise<U>): MaybePromise<T | U>;

  /**
   * Returns the contained `Ok` value or computes it from a closure.
   */
  unwrapOrElse<U>(fn: (err: E) => MaybePromise<U>): MaybePromise<T | U>;

  /**
   * Calls `mapper` if the result is `Ok`, otherwise returns the `Err` value of self.
   * This function can be used for control flow based on `Result` values.
   */
  andThen<U, F>(mapper: (val: T) => MaybePromise<Result<U, F>>): Result<U, E | F>;

  /**
   * Maps a `Result<T, E>` to `Result<U, E>` by applying a function to a contained `Ok` value,
   * leaving an `Err` value untouched.
   *
   * This function can be used to compose the results of two functions.
   */
  map<U>(fn: (val: T) => MaybePromise<U>): Result<U, E>;

  /**
   * Maps a `Result<T, E>` to `Result<T, F>` by applying a function to a contained `Err` value,
   * leaving an `Ok` value untouched.
   *
   * This function can be used to pass through a successful result while handling an error.
   */
  mapErr<F>(fn: (val: E) => MaybePromise<F>): Result<T, F>;

  /**
   * Calls `mapper` if the result is `Err`, otherwise returns the `Ok` value of self.
   */
  orElse<U, F>(fn: (val: E) => MaybePromise<Result<U, F>>): Result<T | U, F>;

  /**
   * Returns the default value if `Err`, or applies the mapper function to the contained `Ok` value.
   */
  mapOr<U>(
    defaultVal: MaybePromise<U>,
    fn: (val: T) => MaybePromise<U>,
  ): this["ok"] extends true
    ? ReturnType<typeof fn> extends Promise<U>
      ? Promise<U>
      : MaybePromise<U>
    : typeof defaultVal extends Promise<U>
      ? Promise<U>
      : MaybePromise<U>;
  /**
   * Maps a `Result<T, E>` to `U` by applying `defaultFn` to a contained `Err` value,
   * or `mapper` to a contained `Ok` value.
   */
  mapOrElse<U>(
    defaultFn: (err: E) => MaybePromise<U>,
    fn: (val: T) => MaybePromise<U>,
  ): MaybePromise<U>;

  /**
   * Maps a `Result<T, E>` to `Promise<Result<U, E>>` by applying an async function to a contained `Ok` value,
   * leaving an `Err` value untouched.
   * @deprecated Use {@link map} instead, which now natively handles async.
   */
  mapAsync<U>(fn: (val: T) => Promise<U>): AsyncResult<U, E>;

  /**
   * Calls `mapper` asynchronously if the result is `Ok`, otherwise returns the `Err` value of self.
   * @deprecated Use {@link andThen} instead, which now natively handles async.
   */
  andThenAsync<U, F>(fn: (val: T) => Promise<Err<F>>): AsyncErr<E | F>;
  andThenAsync<U, F>(fn: (val: T) => Promise<Ok<U>>): AsyncResult<U, E>;
  andThenAsync<U, F>(fn: (val: T) => Promise<Result<U, F>>): AsyncResult<U, E | F>;
  andThenAsync<U, F>(fn: (val: T) => AsyncErr<F>): AsyncErr<E | F>;
  andThenAsync<U, F>(fn: (val: T) => AsyncOk<U>): AsyncResult<U, E>;
  andThenAsync<U, F>(fn: (val: T) => AsyncResult<U, F>): AsyncResult<U, E | F>;
  andThenAsync<U, F>(
    fn: (val: T) => AsyncResult<U, F> | Promise<Result<U, F>>,
  ): AsyncResult<U, E | F>;

  /**
   * Shallow clones the result, preserving any existing stack traces for errors.
   */
  clone(): Result<T, E>;
}

/**
 * Not functional, only used to constrain our SyncOk and SyncErr values for compile time checking.
 */
interface SyncResult<T, E> extends Result<T, E>, Iterable<T> {
  readonly [RESULT_BRAND]: ResultBrandV1 & { type: ResultTypeV1.SYNC };

  readonly val: T | E;
  readonly ok: boolean;
  readonly err: boolean;

  expect(msg: string): T;

  expectErr(msg: string): E;

  unwrap(): T;

  unwrapOr<U>(val: Promise<U>): T | Promise<U>;
  unwrapOr<U>(val: U): T | U;
  unwrapOr<U>(val: MaybePromise<U>): T | MaybePromise<U>;

  unwrapOrElse<U>(fn: (err: E) => Promise<U>): T | Promise<U>;
  unwrapOrElse<U>(fn: (err: E) => U): T | U;
  unwrapOrElse<U>(fn: (err: E) => MaybePromise<U>): T | MaybePromise<U>;

  andThen<U, F>(mapper: (val: T) => MaybePromise<Result<U, F>>): Result<U, E | F>;

  map<U>(fn: (val: T) => MaybePromise<U>): Result<U, E>;

  mapErr<F>(fn: (val: E) => MaybePromise<F>): Result<T, F>;

  orElse<U, F>(fn: (val: E) => MaybePromise<Result<U, F>>): Result<T | U, F>;

  mapOr<U>(
    defaultVal: MaybePromise<U>,
    fn: (val: T) => MaybePromise<U>,
  ): this["ok"] extends true
    ? ReturnType<typeof fn> extends Promise<U>
      ? Promise<U>
      : U
    : typeof defaultVal extends Promise<U>
      ? Promise<U>
      : U;

  mapOrElse<U>(
    defaultFn: (err: E) => MaybePromise<U>,
    fn: (val: T) => MaybePromise<U>,
  ): this["ok"] extends true
    ? ReturnType<typeof fn> extends Promise<U>
      ? Promise<U>
      : U
    : ReturnType<typeof defaultFn> extends Promise<U>
      ? Promise<U>
      : U;

  clone(): Result<T, E>;
}

interface AsyncResult<T, E> extends Result<T, E>, PromiseLike<SyncKnownResult<T, E>> {
  readonly [RESULT_BRAND]: ResultBrandV1 & { type: ResultTypeV1.ASYNC };

  readonly val: Promise<T | E>;
  readonly ok: MaybePromise<boolean>;
  readonly err: MaybePromise<boolean>;

  /** The contained promise of the AsyncResult. This is equivalent to awaiting it. */
  readonly promise: PromiseLike<SyncKnownResult<T, E>>;

  expect(msg: string): Promise<T>;

  expectErr(msg: string): Promise<E>;

  unwrap(): Promise<T>;

  unwrapOr<U>(val: MaybePromise<U>): Promise<T | U>;

  unwrapOrElse<U>(fn: (err: E) => MaybePromise<U>): Promise<T | U>;

  andThen<U, F>(fn: (val: T) => MaybePromise<Err<F>>): AsyncErr<E | F>;
  andThen<U, F>(fn: (val: T) => MaybePromise<Ok<U>>): AsyncResult<U, E | F>;
  andThen<U, F>(fn: (val: T) => MaybePromise<Result<U, F>>): AsyncResult<U, E | F>;

  map<U>(fn: (val: T) => MaybePromise<U>): AsyncResult<U, E>;

  mapErr<F>(fn: (val: E) => MaybePromise<F>): AsyncResult<T, F>;

  orElse<U, F>(fn: (val: E) => MaybePromise<Ok<U>>): AsyncOk<T | U>;
  orElse<U, F>(fn: (val: E) => MaybePromise<Err<F>>): AsyncResult<T | U, F>;

  orElse<U, F>(fn: (val: E) => MaybePromise<Result<U, F>>): AsyncResult<T | U, F>;

  mapOr<U>(
    defaultVal: MaybePromise<U>,
    fn: (val: T) => MaybePromise<U>,
  ): this["ok"] extends true
    ? Promise<U>
    : typeof defaultVal extends Promise<U>
      ? Promise<U>
      : MaybePromise<U>;

  mapOrElse<U>(
    defaultFn: (err: E) => MaybePromise<U>,
    fn: (val: T) => MaybePromise<U>,
  ): this["ok"] extends true
    ? Promise<U>
    : ReturnType<typeof defaultFn> extends Promise<U>
      ? Promise<U>
      : MaybePromise<U>;
  clone(): AsyncResult<T, E>;
}

export type SyncKnownResult<T, E> = SyncOk<T> | SyncErr<E>;

export class SyncOk<T> implements SyncResult<T, never> {
  readonly [RESULT_BRAND] = {
    version: 1,
    type: ResultTypeV1.SYNC,
  } as const;

  constructor(public readonly val: T) {}

  readonly ok = true as const;
  readonly err = false as const;

  *[Symbol.iterator](): Generator<T, void, unknown> {
    yield this.val;
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

  unwrapOr<U>(_val: MaybePromise<U>): T {
    return this.val;
  }

  unwrapOrElse<U>(_fn: (err: never) => MaybePromise<U>): T {
    return this.val;
  }

  andThen<U, F>(fn: (val: T) => Promise<Ok<U>>): AsyncOk<U>;
  andThen<U, F>(fn: (val: T) => Promise<Err<F>>): AsyncErr<F>;
  andThen<U, F>(fn: (val: T) => Promise<Result<U, F>>): AsyncResult<U, F>;
  andThen<U, F>(fn: (val: T) => AsyncOk<U>): AsyncOk<U>;
  andThen<U, F>(fn: (val: T) => AsyncErr<F>): AsyncErr<F>;
  andThen<U, F>(fn: (val: T) => AsyncResult<U, F>): AsyncResult<U, F>;
  andThen<U, F>(fn: (val: T) => Promise<Result<U, F>> | AsyncResult<U, F>): AsyncResult<U, F>;
  andThen<U, F>(fn: (val: T) => SyncOk<U>): SyncOk<U>;
  andThen<U, F>(fn: (val: T) => SyncErr<F>): SyncErr<F>;
  andThen<U, F>(fn: (val: T) => SyncKnownResult<U, F>): SyncKnownResult<U, F>;
  andThen<U, F>(fn: (val: T) => Ok<U>): Ok<U>;
  andThen<U, F>(fn: (val: T) => Err<F>): Err<F>;
  andThen<U, F>(fn: (val: T) => Result<U, F>): Result<U, F>;
  andThen<U, F>(fn: (val: T) => MaybePromise<Result<U, F>>): Result<U, F>;
  andThen<U, F>(fn: (val: T) => MaybePromise<Result<U, F>>): Result<U, F> {
    const ret = fn(this.val);
    if (ret instanceof Promise) {
      return new AsyncUnknownResult(ret);
    }
    return ret;
  }

  map<U>(fn: (val: T) => Promise<U>): AsyncOk<U>;
  map<U>(fn: (val: T) => U): SyncOk<U>;
  map<U>(fn: (val: T) => MaybePromise<U>): Ok<U>;
  map<U>(fn: (val: T) => MaybePromise<U>): Ok<U> {
    const ret = fn(this.val);
    if (ret instanceof Promise) {
      return new AsyncOk(ret);
    }
    return new SyncOk(ret);
  }

  mapErr<F>(_fn: (val: never) => F): this {
    return this;
  }

  orElse<U, F>(_fn: (val: never) => MaybePromise<Result<U, F>>): this {
    return this;
  }

  mapOr<U>(
    _defaultVal: MaybePromise<U>,
    fn: (val: T) => MaybePromise<U>,
  ): ReturnType<typeof fn> extends Promise<U> ? Promise<U> : U {
    return this.map(fn).val as ReturnType<typeof fn> extends Promise<U> ? Promise<U> : U;
  }

  mapOrElse<U>(
    _defaultFn: (err: never) => MaybePromise<U>,
    fn: (val: T) => MaybePromise<U>,
  ): ReturnType<typeof fn> extends Promise<U> ? Promise<U> : U {
    return this.map(fn).val as ReturnType<typeof fn> extends Promise<U> ? Promise<U> : U;
  }

  mapAsync<U>(mapper: (val: T) => Promise<U>): AsyncOk<U> {
    return this.map(mapper);
  }

  andThenAsync<U, F>(mapper: (val: T) => Promise<Ok<U>>): AsyncOk<U>;
  andThenAsync<U, F>(mapper: (val: T) => Promise<Err<F>>): AsyncErr<F>;
  andThenAsync<U, F>(mapper: (val: T) => Promise<Result<U, F>>): AsyncResult<U, F>;
  andThenAsync<U, F>(mapper: (val: T) => AsyncOk<U>): AsyncOk<U>;
  andThenAsync<U, F>(mapper: (val: T) => AsyncErr<F>): AsyncErr<F>;
  andThenAsync<U, F>(mapper: (val: T) => AsyncResult<U, F>): AsyncResult<U, F>;
  andThenAsync<U, F>(
    mapper: (val: T) => Promise<Result<U, F>> | AsyncResult<U, F>,
  ): AsyncResult<U, F> {
    return this.andThen(mapper);
  }

  clone(): SyncOk<T> {
    return new SyncOk(this.val);
  }

  toString(): string {
    return `Ok(${toString(this.val)})`;
  }
}

export class SyncErr<E> implements SyncResult<never, E> {
  readonly [RESULT_BRAND] = {
    version: 1,
    type: ResultTypeV1.SYNC,
  } as const;

  constructor(
    public readonly val: E,
    public attempted: boolean = false,
  ) {
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

  #stack = "";
  get stack(): string {
    return `${this}\n${this.#stack}`;
  }

  *[Symbol.iterator](): Generator<never, void, unknown> {
    // Err contains 0 elements
  }

  readonly ok = false as const;
  readonly err = true as const;

  expect(msg: string): never {
    throw new Error(`${msg} - Error: ${toString(this.val)}\n${this.#stack}`);
  }

  expectErr(msg: string): E {
    return this.val;
  }

  unwrap(): never {
    throw new Error(`Tried to unwrap Error: ${toString(this.val)}\n${this.#stack}`);
  }

  unwrapOr<U>(val: Promise<U>): Promise<U>;
  unwrapOr<U>(val: U): U;
  unwrapOr<U>(val: MaybePromise<U>): MaybePromise<U>;
  unwrapOr<U>(val: MaybePromise<U>): MaybePromise<U> {
    return this.orElse(() => Result.ok(val)).val;
  }

  unwrapOrElse<U>(fn: (err: E) => Promise<U>): Promise<U>;
  unwrapOrElse<U>(fn: (err: E) => U): U;
  unwrapOrElse<U>(fn: (err: E) => MaybePromise<U>): MaybePromise<U>;
  unwrapOrElse<U>(fn: (err: E) => MaybePromise<U>): MaybePromise<U> {
    return this.orElse((err) => Result.ok(fn(err))).val;
  }

  andThen<U, F>(_fn: (val: never) => MaybePromise<Result<U, F>>): this {
    return this;
  }

  map<U>(_fn: (val: never) => MaybePromise<U>): this {
    return this;
  }

  mapErr<F>(fn: (val: E) => Promise<F>): AsyncErr<F>;
  mapErr<F>(fn: (val: E) => F): SyncErr<F>;
  mapErr<F>(fn: (val: E) => MaybePromise<F>): Err<F>;
  mapErr<F>(fn: (val: E) => MaybePromise<F>): Err<F> {
    const ret = fn(this.val);
    if (ret instanceof Promise) {
      return new AsyncErr(ret);
    }
    return new SyncErr(ret);
  }

  orElse<U, F>(fn: (val: E) => Promise<Ok<U>>): AsyncOk<U>;
  orElse<U, F>(fn: (val: E) => Promise<Err<F>>): AsyncErr<F>;
  orElse<U, F>(fn: (val: E) => Promise<Result<U, F>>): AsyncResult<U, F>;
  orElse<U, F>(fn: (val: E) => AsyncOk<U>): AsyncOk<U>;
  orElse<U, F>(fn: (val: E) => AsyncErr<F>): AsyncErr<F>;
  orElse<U, F>(fn: (val: E) => AsyncResult<U, F>): AsyncResult<U, F>;
  orElse<U, F>(fn: (val: E) => Promise<Result<U, F>> | AsyncResult<U, F>): AsyncResult<U, F>;
  orElse<U, F>(fn: (val: E) => SyncOk<U>): SyncOk<U>;
  orElse<U, F>(fn: (val: E) => SyncErr<F>): SyncErr<F>;
  orElse<U, F>(fn: (val: E) => SyncKnownResult<U, F>): SyncKnownResult<U, F>;
  orElse<U, F>(fn: (val: E) => Ok<U>): Ok<U>;
  orElse<U, F>(fn: (val: E) => Err<F>): Err<F>;
  orElse<U, F>(fn: (val: E) => Result<U, F>): Result<U, F>;
  orElse<U, F>(fn: (val: E) => MaybePromise<Result<U, F>>): Result<U, F>;
  orElse<U, F>(fn: (val: E) => MaybePromise<Result<U, F>>): Result<U, F> {
    const ret = fn(this.val);
    if (ret instanceof Promise) {
      return new AsyncUnknownResult(ret);
    }
    return ret;
  }

  mapOr<U>(
    defaultVal: MaybePromise<U>,
    fn: (val: never) => MaybePromise<U>,
  ): typeof defaultVal extends Promise<U> ? Promise<U> : U {
    return defaultVal as typeof defaultVal extends Promise<U> ? Promise<U> : U;
  }

  mapOrElse<U>(
    defaultFn: (err: E) => MaybePromise<U>,
    _fn: (val: never) => MaybePromise<U>,
  ): ReturnType<typeof defaultFn> extends Promise<U> ? Promise<U> : U {
    return this.unwrapOrElse(defaultFn) as ReturnType<typeof defaultFn> extends Promise<U>
      ? Promise<U>
      : U;
  }

  mapAsync<U>(_mapper: (val: never) => Promise<U>): AsyncErr<E> {
    return new AsyncErr(Promise.resolve(this.val));
  }

  andThenAsync<U, F>(
    _mapper: (val: never) => Promise<Result<U, F>> | AsyncResult<U, F>,
  ): AsyncErr<E> {
    return new AsyncErr(Promise.resolve(this.val));
  }

  clone(): SyncErr<E> {
    const ret = new SyncErr(this.val, this.attempted);
    ret.#stack = this.#stack;
    return ret;
  }

  toString(): string {
    return `Err(${toString(this.val)})`;
  }
}

export class AsyncUnknownResult<T, E> implements AsyncResult<T, E> {
  readonly [RESULT_BRAND] = {
    version: 1,
    type: ResultTypeV1.ASYNC,
  } as const;

  public readonly promise: PromiseLike<SyncKnownResult<T, E>>;
  constructor(promise: PromiseLike<Result<T, E>>) {
    this.promise = promise.then((result) => {
      return resolveToPromiseSync(result);
    });
  }

  get val(): Promise<T | E> {
    return this.then((result) => result.val);
  }

  get ok(): Promise<boolean> {
    return this.then((result) => result.ok);
  }

  get err(): Promise<boolean> {
    return this.then((result) => result.err);
  }

  async expect(msg: string): Promise<T> {
    return (await this).expect(msg);
  }

  async expectErr(msg: string): Promise<E> {
    return (await this).expectErr(msg);
  }

  async unwrap(): Promise<T> {
    return (await this).unwrap();
  }

  unwrapOr<U>(val: MaybePromise<U>): Promise<T | U> {
    return this.orElse(() => Result.ok(val)).val;
  }

  unwrapOrElse<U>(fn: (err: E) => MaybePromise<U>): Promise<T | U> {
    return this.orElse((err) => Result.ok(fn(err))).val;
  }

  map<U>(fn: (val: T) => MaybePromise<U>): AsyncUnknownResult<U, E> {
    const newPromise = this.then<SyncKnownResult<U, E>>(async (result) => {
      if (result.ok) {
        return new SyncOk(await fn(result.val));
      }
      return result;
    });
    return new AsyncUnknownResult<U, E>(newPromise);
  }

  mapErr<F>(fn: (val: E) => MaybePromise<F>): AsyncUnknownResult<T, F> {
    const newPromise = this.then<SyncKnownResult<T, F>>(async (result) => {
      if (result.err) {
        return new SyncErr(await fn(result.val));
      }
      return result;
    });
    return new AsyncUnknownResult<T, F>(newPromise);
  }

  andThen<U, F>(fn: (val: T) => MaybePromise<Ok<U>>): AsyncUnknownResult<U, E | F>;
  andThen<U, F>(fn: (val: T) => MaybePromise<Err<F>>): AsyncErr<E | F>;
  andThen<U, F>(fn: (val: T) => MaybePromise<Result<U, F>>): AsyncUnknownResult<U, E | F>;
  andThen<U, F>(fn: (val: T) => MaybePromise<Result<U, F>>): AsyncResult<U, E | F> {
    const newPromise = this.then<SyncKnownResult<U, E | F>>(async (result) => {
      if (result.ok) {
        return resolveToPromiseSync(await fn(result.val));
      }
      return result;
    });
    return new AsyncUnknownResult<U, E | F>(newPromise);
  }

  orElse<U, F>(fn: (val: E) => MaybePromise<Ok<U>>): AsyncOk<T | U>;
  orElse<U, F>(fn: (val: E) => MaybePromise<Err<F>>): AsyncUnknownResult<T | U, F>;
  orElse<U, F>(fn: (val: E) => MaybePromise<Result<U, F>>): AsyncUnknownResult<T | U, F>;
  orElse<U, F>(fn: (val: E) => MaybePromise<Result<U, F>>): AsyncResult<T | U, F> {
    const newPromise = this.then<SyncKnownResult<T | U, F>>(async (result) => {
      if (result.err) {
        const ret = await fn(result.val);
        return resolveToPromiseSync(ret);
      }
      return result;
    });
    return new AsyncUnknownResult<T | U, F>(newPromise);
  }

  mapOr<U>(defaultVal: MaybePromise<U>, fn: (val: T) => MaybePromise<U>): Promise<U> {
    return this.map(fn).orElse(() => Result.ok(defaultVal)).val;
  }

  mapOrElse<U>(
    defaultFn: (err: E) => MaybePromise<U>,
    fn: (val: T) => MaybePromise<U>,
  ): Promise<U> {
    return this.map(fn).orElse<U, never>((err) => Result.ok(defaultFn(err))).val;
  }

  mapAsync<U>(mapper: (val: T) => Promise<U>): AsyncUnknownResult<U, E> {
    return this.map(mapper);
  }

  andThenAsync<U, F>(mapper: (val: T) => Promise<Err<F>>): AsyncErr<E | F>;
  andThenAsync<U, F>(mapper: (val: T) => Promise<Ok<U>>): AsyncUnknownResult<U, E | F>;
  andThenAsync<U, F>(mapper: (val: T) => Promise<Result<U, F>>): AsyncUnknownResult<U, E | F>;
  andThenAsync<U, F>(mapper: (val: T) => AsyncErr<F>): AsyncErr<E | F>;
  andThenAsync<U, F>(mapper: (val: T) => AsyncOk<U>): AsyncUnknownResult<U, E | F>;
  andThenAsync<U, F>(mapper: (val: T) => AsyncResult<U, F>): AsyncUnknownResult<U, E | F>;
  andThenAsync<U, F>(
    mapper: (val: T) => AsyncResult<U, F> | Promise<Result<U, F>>,
  ): AsyncUnknownResult<U, E | F>;
  andThenAsync<U, F>(
    mapper: (val: T) => AsyncResult<U, F> | Promise<Result<U, F>>,
  ): AsyncResult<U, E | F> {
    return this.andThen(mapper);
  }

  clone(): AsyncResult<T, E> {
    return new AsyncUnknownResult<T, E>(this);
  }

  then<U = SyncKnownResult<T, E>, F = never>(
    onfulfilled?: ((ret: SyncKnownResult<T, E>) => U | PromiseLike<U>) | null | undefined,
    onrejected?: ((reason: any) => F | PromiseLike<F>) | undefined | null,
  ): Promise<U | F> {
    const resolved = resolveToPromiseSync(this);
    return resolved.then(onfulfilled, onrejected);
  }

  readonly [Symbol.toStringTag] = "AsyncUnknownResult";

  toString(): string {
    return `${this[Symbol.toStringTag]}([Promise])`;
  }
}

export class AsyncOk<T> implements AsyncResult<T, never>, PromiseLike<SyncOk<T>> {
  readonly [RESULT_BRAND] = {
    version: 1,
    type: ResultTypeV1.ASYNC,
  } as const;

  readonly promise: Promise<SyncOk<T>>;
  constructor(public readonly val: Promise<T>) {
    this.promise = val.then((val) => new SyncOk(val));
  }

  readonly err = false as const;
  readonly ok = true as const;

  map<U>(fn: (val: T) => MaybePromise<U>): AsyncOk<U> {
    const newPromise = this.val.then(async (result) => {
      return await fn(result);
    });
    return new AsyncOk(newPromise);
  }

  mapErr<F>(_fn: (val: never) => MaybePromise<F>): this {
    return this;
  }

  andThen<U, F>(fn: (val: T) => MaybePromise<Ok<U>>): AsyncOk<U>;
  andThen<U, F>(fn: (val: T) => MaybePromise<Err<F>>): AsyncErr<F>;
  andThen<U, F>(fn: (val: T) => MaybePromise<Result<U, F>>): AsyncResult<U, F>;
  andThen<U, F>(fn: (val: T) => MaybePromise<Result<U, F>>): AsyncResult<U, F> {
    const newPromise = this.val.then<Result<U, F>>(async (result) => {
      return await fn(result);
    });
    return new AsyncUnknownResult(newPromise);
  }

  orElse<U, F>(_fn: (val: never) => MaybePromise<Result<U, F>>): this {
    return this;
  }

  async unwrap(): Promise<T> {
    return this.val;
  }

  async expect(msg: string): Promise<T> {
    return this.val;
  }

  async expectErr(msg: string): Promise<never> {
    return (await this).expectErr(msg);
  }

  unwrapOr<U>(val: MaybePromise<U>): Promise<T | U> {
    return this.orElse(() => Result.ok(val)).val;
  }

  unwrapOrElse<U>(fn: (err: never) => MaybePromise<U>): Promise<T | U> {
    return this.orElse((err) => Result.ok(fn(err))).val;
  }

  mapOr<U>(_defaultVal: MaybePromise<U>, fn: (val: T) => MaybePromise<U>): Promise<U> {
    return this.map(fn).val;
  }

  mapOrElse<U>(
    _defaultFn: (err: never) => MaybePromise<U>,
    fn: (val: T) => MaybePromise<U>,
  ): Promise<U> {
    return this.map(fn).val;
  }

  mapAsync<U>(mapper: (val: T) => Promise<U>): AsyncOk<U> {
    return this.map(mapper);
  }

  andThenAsync<U, F>(mapper: (val: T) => Promise<Ok<U>>): AsyncOk<U>;
  andThenAsync<U, F>(mapper: (val: T) => Promise<Err<F>>): AsyncErr<F>;
  andThenAsync<U, F>(mapper: (val: T) => Promise<Result<U, F>>): AsyncResult<U, F>;
  andThenAsync<U, F>(mapper: (val: T) => AsyncOk<U>): AsyncOk<U>;
  andThenAsync<U, F>(mapper: (val: T) => AsyncErr<F>): AsyncErr<F>;
  andThenAsync<U, F>(mapper: (val: T) => AsyncResult<U, F>): AsyncResult<U, F>;
  andThenAsync<U, F>(
    mapper: (val: T) => Promise<Result<U, F>> | AsyncResult<U, F>,
  ): AsyncResult<U, F> {
    return this.andThen(mapper);
  }

  clone(): AsyncOk<T> {
    return new AsyncOk(this.val);
  }

  then<U = SyncOk<T>, F = never>(
    onfulfilled?: ((ret: SyncOk<T>) => U | PromiseLike<U>) | null | undefined,
    onrejected?: ((reason: any) => F | PromiseLike<F>) | undefined | null,
  ): Promise<U | F> {
    return resolveToPromiseSync(this).then(onfulfilled, onrejected);
  }

  readonly [Symbol.toStringTag] = "AsyncOk";

  toString(): string {
    return `${this[Symbol.toStringTag]}([Promise])`;
  }
}

export class AsyncErr<E> implements AsyncResult<never, E>, PromiseLike<SyncErr<E>> {
  readonly [RESULT_BRAND] = {
    version: 1,
    type: ResultTypeV1.ASYNC,
  } as const;

  readonly promise: Promise<SyncErr<E>>;
  constructor(public readonly val: Promise<E>) {
    this.promise = val.then((val) => new SyncErr(val));
  }

  readonly err = true as const;

  readonly ok = false as const;

  map<U>(_mapper: (val: never) => MaybePromise<U>): this {
    return this;
  }

  mapErr<F>(mapper: (val: E) => MaybePromise<F>): AsyncErr<F> {
    const newPromise = this.val.then((result) => {
      return mapper(result);
    });
    return new AsyncErr(newPromise);
  }

  andThen<U, F>(_mapper: (val: never) => MaybePromise<Result<U, F>>): this {
    return this;
  }

  orElse<U, F>(mapper: (val: E) => MaybePromise<Ok<U>>): AsyncOk<U>;
  orElse<U, F>(mapper: (val: E) => MaybePromise<Err<F>>): AsyncErr<F>;
  orElse<U, F>(mapper: (val: E) => MaybePromise<Result<U, F>>): AsyncResult<U, F>;
  orElse<U, F>(mapper: (val: E) => MaybePromise<Result<U, F>>): AsyncResult<U, F> {
    const newPromise = this.val.then((result) => {
      return mapper(result);
    });
    return new AsyncUnknownResult(newPromise);
  }

  async unwrap(): Promise<never> {
    return (await this).unwrap();
  }

  async expect(msg: string): Promise<never> {
    return this.then((result) => result.expect(msg));
  }

  async expectErr(_msg: string): Promise<E> {
    return this.val;
  }

  unwrapOr<U>(val: MaybePromise<U>): Promise<U> {
    return this.orElse(() => Result.ok(val)).val;
  }

  unwrapOrElse<U>(fn: (err: E) => MaybePromise<U>): Promise<U> {
    return this.orElse((err) => Result.ok(fn(err))).val;
  }

  mapOr<U>(defaultVal: MaybePromise<U>, _mapper: (val: never) => MaybePromise<U>): Promise<U> {
    return this.unwrapOr(defaultVal);
  }

  mapOrElse<U>(
    defaultFn: (err: E) => MaybePromise<U>,
    _fn: (val: never) => MaybePromise<U>,
  ): Promise<U> {
    return this.unwrapOrElse(defaultFn);
  }

  mapAsync<U>(_mapper: (val: never) => Promise<U>): this {
    return this.map(_mapper);
  }

  andThenAsync<U, F>(_mapper: (val: never) => Promise<Result<U, F>> | AsyncResult<U, F>): this {
    return this.andThen(_mapper);
  }

  clone(): AsyncErr<E> {
    return new AsyncErr(this.val);
  }

  then<U = SyncErr<E>, F = never>(
    onfulfilled?: ((ret: SyncErr<E>) => U | PromiseLike<U>) | null | undefined,
    onrejected?: ((reason: any) => F | PromiseLike<F>) | undefined | null,
  ): Promise<U | F> {
    return resolveToPromiseSync(this).then(onfulfilled, onrejected);
  }

  readonly [Symbol.toStringTag] = "AsyncOk";

  toString(): string {
    return "AsyncErr([Promise])";
  }
}

/* eslint-disable @typescript-eslint/no-namespace */
export namespace Result {
  export let captureStackTrace = true;

  export function ok<T>(val: Promise<T>): AsyncOk<T>;
  export function ok<T>(val: Exclude<T, Promise<T>>): SyncOk<T>;
  export function ok<T>(val: MaybePromise<T>): Ok<T>;
  export function ok<T>(val: MaybePromise<T>): Ok<T> {
    if (val instanceof Promise) {
      return new AsyncOk(val);
    }
    return new SyncOk(val);
  }

  export function err<E>(val: Promise<E>): AsyncErr<E>;
  export function err<E>(val: Exclude<E, Promise<E>>): SyncErr<E>;
  export function err<E>(val: MaybePromise<E>): Err<E>;
  export function err<E>(val: MaybePromise<E>): Err<E> {
    if (val instanceof Promise) {
      return new AsyncErr(val);
    }
    return new SyncErr(val);
  }

  /**
   * Wrap an operation that may throw an Error (`try-catch` style) into checked exception style
   * @param op The operation function
   */
  export function wrap<T, E = unknown>(op: () => Promise<T>): AsyncResult<T, E>;
  export function wrap<T, E = unknown>(op: () => Exclude<T, Promise<T>>): SyncKnownResult<T, E>;
  export function wrap<T, E = unknown>(op: () => MaybePromise<T>): Result<T, E>;
  export function wrap<T, E = unknown>(op: () => MaybePromise<T>): Result<T, E> {
    try {
      const ret = op();
      if (ret instanceof Promise) {
        return new AsyncUnknownResult<T, E>(
          ret.then(
            (ok: T) => new SyncOk(ok),
            (err: E) => new SyncErr(err),
          ),
        );
      }
      return new SyncOk(ret);
    } catch (e) {
      return new SyncErr<E>(e as E);
    }
  }

  /**
   * Wrap an async function that returns a result. Attempts to retry if the callback returns Err.
   *
   * @param cb
   * @param param1
   */
  export async function attempt<T, E>(
    cb: () => MaybePromise<Result<T, E>>,
    { attempts = 3, timeout = 1000, backoff = 0.5 } = {},
  ) {
    let count = 1;
    let waitTime = timeout;

    let res: SyncKnownResult<T, E>;

    try {
      res = await resolveToPromiseSync(cb());
    } catch (e) {
      res = new SyncErr<E>(e as E);
    }

    if (res.err && res.attempted === true) {
      return res;
    }

    while (res.err && count < attempts) {
      await wait(waitTime);

      try {
        res = await resolveToPromiseSync(cb());
      } catch (e) {
        res = new SyncErr<E>(e as E);
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

  /**
   * Wrap an async operation that may throw an Error (`try-catch` style) into checked exception style
   * @param op The operation function
   * @deprecated use {@link wrap} instead, which now handles async natively.
   */
  export function wrapAsync<T, E = unknown>(op: () => MaybePromise<T>): Promise<Result<T, E>> {
    return Promise.resolve(Result.wrap(op));
  }

  export function isResult<T, E>(result: unknown): result is Result<T, E> {
    if (isNormalObject(result) && RESULT_BRAND in result) {
      if (isResultBrandV1(result[RESULT_BRAND])) {
        return result[RESULT_BRAND].type !== ResultTypeV1.NONE;
      }
      if (isResultBrandV0(result[RESULT_BRAND])) {
        return true;
      }
    }
    return false;
  }

  export function isSyncResult<T, E>(result: Result<T, E>): result is SyncKnownResult<T, E>;
  export function isSyncResult<T, E>(result: unknown): result is SyncKnownResult<T, E>;
  export function isSyncResult<T, E>(result: unknown): result is SyncKnownResult<T, E> {
    if (isNormalObject(result) && RESULT_BRAND in result) {
      if (isResultBrandV1(result[RESULT_BRAND])) {
        return result[RESULT_BRAND].type === ResultTypeV1.SYNC;
      }
      if (isResultBrandV0(result[RESULT_BRAND])) {
        return true;
      }
    }
    return false;
  }

  export function isAsyncResult<T, E>(result: Result<T, E>): result is AsyncResult<T, E>;
  export function isAsyncResult<T, E>(result: unknown): result is AsyncResult<T, E>;
  export function isAsyncResult<T, E>(result: unknown): result is AsyncResult<T, E> {
    if (isNormalObject(result) && RESULT_BRAND in result) {
      if (isResultBrandV1(result[RESULT_BRAND])) {
        return result[RESULT_BRAND].type === ResultTypeV1.ASYNC;
      }
      if (isResultBrandV0(result[RESULT_BRAND])) {
        return false;
      }
    }
    return false;
  }

  /**
   * Takes an array (or tuple) of Results and returns an `Ok` containing all
   * success values in the same shape, or the first `Err` encountered.
   */
  export function all<T extends readonly SyncKnownResult<unknown, unknown>[]>(
    results: [...T],
  ): SyncKnownResult<
    { [K in keyof T]: T[K] extends SyncKnownResult<infer U, any> ? U : never },
    { [K in keyof T]: T[K] extends SyncKnownResult<any, infer F> ? F : never }[number]
  >;
  export function all<T, E>(results: SyncKnownResult<T, E>[]): SyncKnownResult<T[], E>;
  export function all<T extends readonly MaybePromise<Result<unknown, unknown>>[]>(
    results: [...T],
  ): AsyncResult<
    { [K in keyof T]: T[K] extends MaybePromise<Result<infer U, any>> ? U : never },
    { [K in keyof T]: T[K] extends MaybePromise<Result<any, infer F>> ? F : never }[number]
  >;
  export function all<T, E>(results: MaybePromise<Result<T, E>>[]): AsyncResult<T[], E>;
  export function all(
    results: MaybePromise<Result<unknown, unknown>>[],
  ): Result<unknown[], unknown> {
    if (results.every(isSyncResult)) {
      const values: unknown[] = [];

      for (const result of results) {
        if (result.err) {
          return result;
        }

        values.push(result.val);
      }

      return new SyncOk(values);
    } else if (results.some(isAsyncResult)) {
      return new AsyncUnknownResult(
        Promise.all(results.map(resolveToPromiseSync)).then((syncResults) => {
          const values: unknown[] = [];

          for (const result of syncResults) {
            if (result.err) {
              return result;
            }

            values.push(result.val);
          }

          return new SyncOk(values);
        }),
      );
    } else {
      throw new UnreachableError(results as never);
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

async function resolveToPromiseSync<T, E>(result: Promise<SyncOk<T>>): Promise<SyncOk<T>>;
async function resolveToPromiseSync<T, E>(result: Promise<SyncErr<E>>): Promise<SyncErr<E>>;
async function resolveToPromiseSync<T, E>(result: Promise<AsyncOk<T>>): Promise<SyncOk<T>>;
async function resolveToPromiseSync<T, E>(result: Promise<AsyncErr<E>>): Promise<SyncErr<E>>;
async function resolveToPromiseSync<T, E>(result: SyncOk<T>): Promise<SyncOk<T>>;
async function resolveToPromiseSync<T, E>(result: SyncErr<E>): Promise<SyncErr<E>>;
async function resolveToPromiseSync<T, E>(result: AsyncOk<T>): Promise<SyncOk<T>>;
async function resolveToPromiseSync<T, E>(result: AsyncErr<E>): Promise<SyncErr<E>>;
async function resolveToPromiseSync<T, E>(
  result: AsyncUnknownResult<T, E>,
): Promise<SyncKnownResult<T, E>>;
async function resolveToPromiseSync<T, E>(result: MaybePromise<Ok<T>>): Promise<SyncOk<T>>;
async function resolveToPromiseSync<T, E>(result: MaybePromise<Err<E>>): Promise<SyncErr<E>>;
async function resolveToPromiseSync<T, E>(
  result: MaybePromise<Result<T, E>>,
): Promise<SyncKnownResult<T, E>>;
async function resolveToPromiseSync<T, E>(
  result: MaybePromise<Result<T, E>>,
): Promise<SyncKnownResult<T, E>> {
  let ret = result;
  if (!Result.isResult(ret)) {
    ret = await result;
  }
  if (Result.isAsyncResult(ret)) {
    return ret.promise;
  }
  if (Result.isSyncResult(ret)) {
    return ret;
  }
  throw new UnreachableError(result as never);
}

function isResultBrandV1(brand: unknown): brand is ResultBrandV1 {
  return (
    isNormalObject(brand) &&
    "version" in brand &&
    brand.version === 1 &&
    "type" in brand &&
    [ResultTypeV1.NONE, ResultTypeV1.SYNC, ResultTypeV1.ASYNC].includes(brand.type as ResultTypeV1)
  );
}

function isResultBrandV0(brand: unknown): brand is ResultBrandV0 {
  return brand === true;
}
