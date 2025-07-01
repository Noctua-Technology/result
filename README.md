# Result

Rust like Result implementation for JavaScript and TypeScript

## Installation

```sh
npm i @noctuatech/result
```

## Usage

```typescript
import { Ok, Err, Result } from "@noctuatech/result";

// Creating Ok and Err results
const success = Result.ok(42);
const failure = Result.err("Something went wrong");

// Handling results
if (success.ok) {
  console.log(success.val); // 42
}

if (failure.err) {
  console.error(failure.val); // "Something went wrong"
}

// Using utility functions
const wrapped = Result.wrap(() => JSON.parse('{"valid": true}'));

if (wrapped.ok) {
  console.log(wrapped.val);
} else {
  console.error(wrapped.val);
}

// Async example
const asyncResult = await Result.wrapAsync(async () => fetch("/api/data"));

if (asyncResult.ok) {
  // handle success
} else {
  // handle error
}
```

## API

- `Ok<T>(value: T)`: Represents a successful result.
- `Err<E>(error: E)`: Represents an error result.
- `Result.wrap(fn)`: Wraps a function that may throw, returning `Ok` or `Err`.
- `Result.wrapAsync(fn)`: Wraps an async function that may throw/reject, returning a Promise of `Ok` or `Err`.
- `Result.isResult(val)`: Checks if a value is a `Result`.

See the [tests](src/lib/result.test.ts) for