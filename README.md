# @noctuatech/result

A small Rust-style `Result` for TypeScript/JavaScript.

Use it when you want predictable error handling without relying on thrown exceptions in your app logic.

## Install

```bash
npm install @noctuatech/result
```

## Quick start

```ts
import { Result } from "@noctuatech/result";

function parsePort(input: string) {
  const value = Number(input);
  return Number.isInteger(value) && value > 0 ? Result.ok(value) : Result.err("Invalid port");
}

const port = parsePort("3000")
  .map((n) => n + 1)
  .unwrapOr(8080);

console.log(port); // 3001
```

## Core idea

A result is always one of these two shapes:

- `Ok<T>`: success value
- `Err<E>`: error value

```ts
import { Result } from "@noctuatech/result";

const a: Result<number, string> = Result.ok(42);
const b: Result<number, string> = Result.err("boom");
```

## Operations

### `map`

Transform success values only.

```ts
const r = Result.ok(10).map((n) => n * 2); // Ok(20)
```

### `andThen`

Chain operations that each return a result.

```ts
function toNumber(input: string) {
  const n = Number(input);
  return Number.isFinite(n) ? Result.ok(n) : Result.err("Not a number");
}

function positive(n: number) {
  return n > 0 ? Result.ok(n) : Result.err("Must be positive");
}

const res = toNumber("12").andThen(positive); // Ok(12)
```

### `mapErr`

Transform error values only.

```ts
const res = Result.err("timeout").mapErr((e) => `Network error: ${e}`);
// Err("Network error: timeout")
```

### `unwrapOr`

Get a safe fallback value.

```ts
const timeoutMs = Result.err("missing config").unwrapOr(5000); // 5000
```

### `unwrapOrElse`

Compute a fallback from the error using a closure.

```ts
const timeoutMs = Result.err("missing config").unwrapOrElse((err) => {
  console.warn(err);
  return 5000;
});
```

### `orElse`

Chain operations on error results. Returns the original `Ok` value, or calls the mapper with the error value and returns its result if it is an `Err`.

```ts
const res = Result.err("timeout").orElse((err) => Result.ok(3000)); // Ok(3000)
```

### `mapOr`

Returns the default value if `Err`, or applies the mapper function to the contained `Ok` value.

```ts
const len = Result.ok("hello").mapOr(0, (s) => s.length); // 5
const lenFallback = Result.err("error").mapOr(0, (s) => s.length); // 0
```

### `mapOrElse`

Maps a `Result<T, E>` to `U` by applying a fallback function to a contained `Err`, or a mapper function to a contained `Ok` value.

```ts
const len = Result.ok("hello").mapOrElse(
  (err) => 0,
  (s) => s.length,
); // 5
const lenFallback = Result.err("error").mapOrElse(
  (err) => err.length,
  (s) => s.length,
); // 5
```

### Async Operations (`mapAsync` and `andThenAsync`)

Transform and chain async operations directly on Results:

```ts
// mapAsync: map the success value asynchronously
const mapped = await Result.ok(5).mapAsync(async (x) => x * 2); // Ok(10)

// andThenAsync: chain an async operation returning another Result
const chained = await Result.ok(5).andThenAsync(async (x) => Result.ok(x * 2)); // Ok(10)
```

## Wrapping throwing code

### `Result.wrap` for sync code

```ts
const parsed = Result.wrap(() => JSON.parse('{"ok":true}'));

if (parsed.ok) {
  console.log(parsed.val.ok);
} else {
  console.error(parsed.val);
}
```

### `Result.wrapAsync` for async code

```ts
const userResult = await Result.wrapAsync(async () => {
  const response = await fetch("https://example.com/user");
  if (!response.ok) throw new Error("Request failed");
  return response.json();
});
```

## Retry helper

Use `Result.attempt` when your async function returns a `Result` and you want retry behavior.

```ts
let tries = 0;

const result = await Result.attempt(
  async () => {
    tries++;
    return tries < 3 ? Result.err("temporary error") : Result.ok("done");
  },
  {
    attempts: 5,
    timeout: 200,
    backoff: 0.5,
  },
);

console.log(result.toString()); // Ok(done)
```

Notes:

- `attempts` default is `3`
- `timeout` is the initial wait between retries in milliseconds
- `backoff` increases wait time after each retry
- final failed result is marked with `attempted = true`

## Collecting multiple results

Use `Result.all` to combine an array (or tuple) of Results into a single Result. It returns `Ok` with all values if every result succeeded, or the first `Err` it encounters.

```ts
const results = Result.all([
  Result.wrap(() => JSON.parse('{"port":3000}')),
  Result.wrap(() => JSON.parse('{"host":"localhost"}')),
]);

if (results.ok) {
  const [portConfig, hostConfig] = results.val;
}
```

Tuple types are fully preserved, so each element's type is inferred independently.

## Runtime checks

```ts
const maybe = Math.random() > 0.5 ? Result.ok(1) : "not a result";

if (Result.isResult(maybe)) {
  console.log(maybe.toString());
}
```

## Stack trace configuration

By default, `Err` objects capture the stack trace from where they were constructed. If you are using results in a performance-critical hot path, you can disable stack trace capturing globally:

```ts
import { Result } from "@noctuatech/result";

Result.captureStackTrace = false;
```

## API summary

- Constructors: `new Ok(value)`, `new Err(error)`
- Helpers: `Result.ok(value)`, `Result.err(error)`
- Transform: `map`, `andThen`, `mapErr`, `orElse`, `mapOr`, `mapOrElse`, `mapAsync`, `andThenAsync`
- Read values: `unwrap`, `unwrapOr`, `unwrapOrElse`, `expect`, `expectErr`
- Clone: `clone`
- Wrappers: `Result.wrap`, `Result.wrapAsync`
- Retry: `Result.attempt`
- Collect: `Result.all`
- Type guard: `Result.isResult`
- Configuration: `Result.captureStackTrace`

## Development

```bash
npm run build
npm test
```

## License

MIT
