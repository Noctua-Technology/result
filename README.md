# Result

A Rust-like Result implementation for JavaScript and TypeScript that provides a safe way to handle operations that can succeed or fail.

## Table of Contents

- [Installation](#installation)
- [Overview](#overview)
- [Core Types](#core-types)
- [Ok Class](#ok-class)
- [Err Class](#err-class)
- [Result Namespace](#result-namespace)
- [Utility Functions](#utility-functions)
- [Examples](#examples)
- [Best Practices](#best-practices)

## Installation

```bash
npm install @noctuatech/result
```

## Overview

The Result library provides a type-safe way to handle operations that can either succeed or fail, inspired by Rust's `Result` type. Instead of throwing exceptions, functions return a `Result` that can be either `Ok(value)` or `Err(error)`.

### Key Benefits

- **Type Safety**: Compile-time guarantees about error handling
- **No Exceptions**: Explicit error handling without try-catch blocks
- **Composable**: Chain operations with `map`, `andThen`, etc.
- **Async Support**: Built-in support for async operations
- **Retry Logic**: Built-in retry mechanism with exponential backoff

## Core Types

### `Result<T, E>`

A union type representing either success (`Ok<T>`) or failure (`Err<E>`).

```typescript
type Result<T, E> = Ok<T> | Err<E>;
```

### `Ok<T>`

Represents a successful result containing a value of type `T`.

### `Err<E>`

Represents a failed result containing an error of type `E`.

## Ok Class

The `Ok` class represents a successful result.

### Properties

#### `ok: true`

Always `true` for `Ok` instances.

#### `err: false`

Always `false` for `Ok` instances.

#### `val: T`

The contained success value.

### Methods

#### `unwrap(): T`

Returns the contained `Ok` value.

```typescript
const result = new Ok(42);
console.log(result.unwrap()); // 42
```

#### `unwrapOr<T2>(val: T2): T | T2`

Returns the contained `Ok` value or a provided default. For `Ok` instances, always returns the contained value.

```typescript
const result = new Ok(42);
console.log(result.unwrapOr(0)); // 42
```

#### `expect(msg: string): T`

Returns the contained `Ok` value. For `Ok` instances, always returns the value without throwing.

```typescript
const result = new Ok("data");
console.log(result.expect("Should not fail")); // "data"
```

#### `expectErr(msg: string): never`

Throws an error with the provided message. This method is designed to be called on `Err` instances.

```typescript
const result = new Ok(42);
result.expectErr("This will throw"); // Throws: "This will throw"
```

#### `map<U>(mapper: (val: T) => U): Result<U, E>`

Maps a `Result<T, E>` to `Result<U, E>` by applying a function to the contained `Ok` value.

```typescript
const result = new Ok(5);
const doubled = result.map((x) => x * 2);
console.log(doubled.val); // 10
```

#### `andThen<T2, E2>(mapper: (val: T) => Result<T2, E2>): Result<T2, E | E2>`

Calls the mapper function if the result is `Ok`, otherwise returns the `Err` value.

```typescript
const result = new Ok(5);
const chained = result.andThen((x) => new Ok(x * 2));
console.log(chained.unwrap()); // 10

const errorResult = result.andThen(() => new Err("error"));
console.log(errorResult.err); // true
```

#### `mapErr<F>(mapper: (val: E) => F): Result<T, F>`

Maps a `Result<T, E>` to `Result<T, F>` by applying a function to a contained `Err` value. For `Ok` instances, returns the same `Ok` value.

```typescript
const result = new Ok(42) as Result<number, string>;
const mapped = result.mapErr((err) => `Error: ${err}`);
console.log(mapped.unwrap()); // 42 (unchanged)
```

#### `toString(): string`

Returns a string representation of the `Ok` value.

```typescript
const result = new Ok("hello");
console.log(result.toString()); // "Ok(hello)"
```

#### `[Symbol.iterator](): Iterator<T extends Iterable<infer U> ? U : never>`

Makes `Ok` instances iterable when the contained value is iterable.

```typescript
const result = new Ok([1, 2, 3]);
const values = [...result];
console.log(values); // [1, 2, 3]
```

## Err Class

The `Err` class represents a failed result.

### Properties

#### `ok: false`

Always `false` for `Err` instances.

#### `err: true`

Always `true` for `Err` instances.

#### `val: E`

The contained error value.

#### `attempted?: boolean`

Optional flag indicating if this error has been through retry attempts.

#### `stack: string`

The stack trace of the error.

### Methods

#### `unwrap(): never`

Throws an error with the contained error value and stack trace.

```typescript
const result = new Err("Something went wrong");
result.unwrap(); // Throws: "Tried to unwrap Error: Something went wrong"
```

#### `unwrapOr<T2>(val: T2): T2`

Returns the provided default value.

```typescript
const result = new Err("error");
console.log(result.unwrapOr("default")); // "default"
```

#### `expect(msg: string): never`

Throws an error with a custom message and the contained error value.

```typescript
const result = new Err("network error");
result.expect("Failed to fetch data"); // Throws: "Failed to fetch data - Error: network error"
```

#### `expectErr(msg: string): E`

Returns the contained error value.

```typescript
const result = new Err("validation failed");
console.log(result.expectErr("Should be an error")); // "validation failed"
```

#### `map<U>(mapper: (val: T) => U): Err<E>`

Returns the same `Err` instance without applying the mapper.

```typescript
const result = new Err("error") as Result<number, string>;
const mapped = result.map((x) => x * 2);
console.log(mapped.err); // true
console.log(mapped.val); // "error"
```

#### `andThen<T2, E2>(mapper: (val: T) => Result<T2, E2>): Err<E>`

Returns the same `Err` instance without calling the mapper.

```typescript
const result = new Err("error") as Result<number, string>;
const chained = result.andThen((x) => new Ok(x * 2));
console.log(chained.err); // true
console.log(chained.val); // "error"
```

#### `mapErr<F>(mapper: (val: E) => F): Err<F>`

Maps the error value using the provided function.

```typescript
const result = new Err("original error");
const mapped = result.mapErr((err) => `Mapped: ${err}`);
console.log(mapped.val); // "Mapped: original error"
```

#### `toString(): string`

Returns a string representation of the `Err` value.

```typescript
const result = new Err("error message");
console.log(result.toString()); // "Err(error message)"
```

## Result Namespace

The `Result` namespace provides utility functions for creating and working with `Result` instances.

### Static Methods

#### `Result.ok<T>(val: T): Ok<T>`

Creates a new `Ok` instance with the provided value.

```typescript
const result = Result.ok(42);
console.log(result.ok); // true
console.log(result.val); // 42
```

#### `Result.err<T>(val: T): Err<T>`

Creates a new `Err` instance with the provided error value.

```typescript
const result = Result.err("Something went wrong");
console.log(result.err); // true
console.log(result.val); // "Something went wrong"
```

#### `Result.wrap<T, E = unknown>(op: () => T): Result<T, E>`

Wraps a function that may throw an error into a `Result`. Catches any thrown errors and returns them as `Err`.

```typescript
// Successful operation
const success = Result.wrap(() => JSON.parse('{"valid": true}'));
console.log(success.ok); // true

// Operation that throws
const failure = Result.wrap(() => JSON.parse("invalid json"));
console.log(failure.err); // true
console.log(failure.val instanceof SyntaxError); // true
```

#### `Result.wrapAsync<T, E = unknown>(op: () => Promise<T>): Promise<Result<T, E>>`

Wraps an async function that may throw or reject into a `Result`. Catches both synchronous throws and promise rejections.

```typescript
// Successful async operation
const success = await Result.wrapAsync(async () => {
  const response = await fetch("/api/data");
  return response.json();
});
```

#### `Result.attempt<T, E>(cb: () => Promise<Result<T, E>>, options?: AttemptOptions): Promise<Result<T, E>>`

Attempts to execute a callback function multiple times with retry logic.

**Options:**

- `attempts: number` (default: 3) - Number of attempts
- `timeout: number` (default: 1000) - Initial timeout in milliseconds
- `backoff: number` (default: 0.5) - Backoff multiplier

```typescript
async function fetchData() {
  return Result.wrapAsync(async () => {
    const response = await fetch("/api/data");

    return response.json();
  });
}

const result = await Result.attempt(fetchData, {
  attempts: 5,
  timeout: 1000,
  backoff: 0.5,
});
```

#### `Result.isResult<T = any, E = any>(val: unknown): val is Result<T, E>`

Type guard that checks if a value is a `Result` instance.

```typescript
const result = Result.ok(42);
console.log(Result.isResult(result)); // true
console.log(Result.isResult(42)); // false
console.log(Result.isResult("string")); // false
```

## Examples

### Basic Usage

```typescript
import { Ok, Err, Result } from "@noctuatech/result";

// Creating results
const success = Result.ok(42);
const failure = Result.err("Something went wrong");

// Checking results
if (success.ok) {
  console.log(success.val); // 42
}

if (failure.err) {
  console.error(failure.val); // "Something went wrong"
}
```

### Error Handling

```typescript
// Safe unwrapping
const result = Result.ok(42);
const value = result.unwrapOr(0); // 42

// With error handling
const riskyResult = Result.wrap(() => JSON.parse(userInput));

if (riskyResult.err) {
  console.error("Invalid JSON:", riskyResult.val);
} else {
  console.log("Parsed data:", riskyResult.val);
}
```

### Chaining Operations

```typescript
const result = Result.ok(5)
  .map((x) => x * 2) // 10
  .andThen((x) => (x > 10 ? Result.ok(x) : Result.err("Too small")))
  .map((x) => x.toString()); // "10"

if (result.ok) {
  console.log(result.val); // "10"
}
```

### Async Operations

```typescript
const fetchUser = async (id: number) => {
  return Result.wrapAsync(async () => {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  });
};

const userResult = await fetchUser(123);
if (userResult.ok) {
  console.log("User:", userResult.val);
} else {
  console.error("Failed to fetch user:", userResult.val);
}
```

### Retry Logic

```typescript
async function fetchWithRetry(url: string) {
  return Result.attempt(async () => {
    return Result.wrapAsync(async () => {
      const response = await fetch(url);

      if (!response.ok) {
        return Result.err(`HTTP ${response.status}`);
      }

      return Result.ok(await response.json());
    });
  });
}
```

## Best Practices

### 1. Use Result Instead of Throwing

```typescript
// ❌ Don't throw
function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}

// ✅ Return Result
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) return Result.err("Division by zero");
  return Result.ok(a / b);
}
```

### 2. Handle Errors Explicitly

```typescript
// ❌ Don't ignore errors
const result = riskyOperation();
const value = result.unwrap(); // Might throw

// ✅ Handle errors properly
const result = riskyOperation();
if (result.ok) {
  console.log(result.val);
} else {
  console.error("Operation failed:", result.val);
}
```

### 3. Use map and andThen for Transformations

```typescript
// ✅ Chain operations
const result = Result.ok(5)
  .map((x) => x * 2)
  .andThen((x) => (x > 10 ? Result.ok(x) : Result.err("Too small")))
  .map((x) => x.toString());
```

### 4. Use wrap for Exception Safety

```typescript
// ✅ Wrap potentially throwing functions
const result = Result.wrap(() => JSON.parse(jsonString));
if (result.err) {
  // Handle parsing error
}
```

### 5. Use Type Guards

```typescript
// ✅ Check result types
if (Result.isResult(someValue)) {
  // someValue is definitely a Result
  if (someValue.ok) {
    // Handle success
  }
}
```
