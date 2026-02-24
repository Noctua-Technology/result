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
  return Number.isInteger(value) && value > 0
    ? Result.ok(value)
    : Result.err("Invalid port");
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
import { Ok, Err, type Result } from "@noctuatech/result";

const a: Result<number, string> = new Ok(42);
const b: Result<number, string> = new Err("boom");
```

## Most useful operations

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

You can also pass a function to compute a fallback from the error.

```ts
const timeoutMs = Result.err("missing config").unwrapOr((err) => {
  console.warn(err);
  return 5000;
});
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
  }
);

console.log(result.toString()); // Ok(done)
```

Notes:

- `attempts` default is `3`
- `timeout` is the initial wait between retries in milliseconds
- `backoff` increases wait time after each retry
- final failed result is marked with `attempted = true`

## Runtime checks

```ts
const maybe = Math.random() > 0.5 ? Result.ok(1) : "not a result";

if (Result.isResult(maybe)) {
  console.log(maybe.toString());
}
```

## API summary

- Constructors: `new Ok(value)`, `new Err(error)`
- Helpers: `Result.ok(value)`, `Result.err(error)`
- Transform: `map`, `andThen`, `mapErr`
- Read values: `unwrap`, `unwrapOr` (value or function), `expect`, `expectErr`
- Wrappers: `Result.wrap`, `Result.wrapAsync`
- Retry: `Result.attempt`
- Type guard: `Result.isResult`

## Development

```bash
npm run build
npm test
```

## License

MIT
