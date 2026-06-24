import assert from "node:assert";
import { describe, it } from "node:test";

import { Ok, Err, Result } from "./result.js";

describe("Result", () => {
  describe("Ok", () => {
    it("should create an Ok result with a value", () => {
      const result = new Ok(42);

      assert.strictEqual(result.ok, true);
      assert.strictEqual(result.err, false);
      assert.strictEqual(result.val, 42);
    });

    it("should unwrap Ok value correctly", () => {
      const result = new Ok("success");

      assert.strictEqual(result.unwrap(), "success");
    });

    it("should return value from unwrapOr when Ok", () => {
      const result = new Ok("original");

      assert.strictEqual(result.unwrapOr("default"), "original");
    });

    it("should return value from unwrapOrElse when Ok", () => {
      const result = new Ok("value");
      let called = false;

      const output = result.unwrapOrElse(() => {
        called = true;
        return "fallback";
      });

      assert.strictEqual(output, "value");
      assert.strictEqual(called, false);
    });

    it("should return value from expect when Ok", () => {
      const result = new Ok("test");

      assert.strictEqual(result.expect("should not throw"), "test");
    });

    it("should throw when expectErr is called on Ok", () => {
      const result = new Ok("test");

      assert.throws(() => result.expectErr("should throw"), {
        message: "should throw",
      });
    });

    it("should include custom message in expectErr error", () => {
      const result = new Ok("ok");

      assert.throws(
        () => result.expectErr("expected error"),
        (err) => err instanceof Error && err.message.includes("expected error"),
      );
    });

    it("should map Ok value correctly", () => {
      const result = new Ok(5);
      const mapped = result.map((x) => x * 2);

      assert.ok(mapped instanceof Ok);
      assert.strictEqual(mapped.unwrap(), 10);
    });

    it("should chain operations with andThen", () => {
      const result = new Ok(5);
      const chained = result.andThen((x) => new Ok(x * 2));

      assert.ok(chained instanceof Ok);
      assert.strictEqual(chained.unwrap(), 10);
    });

    it("should return Ok when mapErr is called on Ok", () => {
      const result = new Ok("success") as Result<string, string>;
      const mapped = result.mapErr((err) => `mapped: ${err}`);

      assert.ok(mapped instanceof Ok);
      assert.strictEqual(mapped.unwrap(), "success");
    });

    it("should convert to string correctly", () => {
      const result = new Ok("test");

      assert.strictEqual(result.toString(), "Ok(test)");
    });

    it("should be iterable and yield the inner value once when iterable", () => {
      const result = new Ok([1, 2, 3]);
      const values = [...result];

      assert.deepStrictEqual(values, [[1, 2, 3]]);
    });

    it("should be iterable and yield the inner value once when not iterable", () => {
      const result = new Ok(100);
      const values = [...result];

      assert.deepStrictEqual(values, [100]);
    });
  });

  describe("Err", () => {
    it("should create an Err result with an error", () => {
      const result = new Err("error message");

      assert.strictEqual(result.ok, false);
      assert.strictEqual(result.err, true);
      assert.strictEqual(result.val, "error message");
    });

    it("should throw when unwrap is called on Err", () => {
      const result = new Err("test error");

      assert.throws(() => result.unwrap());
    });

    it("should include error value in unwrap message", () => {
      const result = new Err("explode");

      assert.throws(
        () => result.unwrap(),
        (err) => err instanceof Error && err.message.includes("Tried to unwrap Error: explode"),
      );
    });

    it("should return default value from unwrapOr when Err", () => {
      const result = new Err("error");

      assert.strictEqual(result.unwrapOr("default"), "default");
    });

    it("should call unwrapOrElse with error when Err", () => {
      const result = new Err("missing");
      let seen: string | undefined;

      const output = result.unwrapOrElse((err) => {
        seen = err;
        return "fallback";
      });

      assert.strictEqual(output, "fallback");
      assert.strictEqual(seen, "missing");
    });

    it("should throw when expect is called on Err", () => {
      const result = new Err("test error");

      assert.throws(() => result.expect("custom message"));
    });

    it("should include custom message in expect error", () => {
      const result = new Err("boom");

      assert.throws(
        () => result.expect("failed"),
        (err) => err instanceof Error && err.message.includes("failed - Error: boom"),
      );
    });

    it("should return error value from expectErr when Err", () => {
      const result = new Err("test error");

      assert.strictEqual(result.expectErr("should not throw"), "test error");
    });

    it("should ignore message when expectErr is called on Err", () => {
      const result = new Err("original");

      assert.strictEqual(result.expectErr("ignored"), "original");
    });

    it("should return Err when map is called on Err", () => {
      const result = new Err("error") as Result<number, string>;
      const mapped = result.map((x) => x * 2);

      assert.ok(mapped instanceof Err);
      assert.strictEqual(mapped.val, "error");
    });

    it("should return Err when andThen is called on Err", () => {
      const result = new Err("error") as Result<number, string>;
      const chained = result.andThen((x) => new Ok(x * 2));

      assert.ok(chained instanceof Err);
      assert.strictEqual(chained.val, "error");
    });

    it("should map error value correctly", () => {
      const result = new Err("original error");
      const mapped = result.mapErr((err) => `mapped: ${err}`);

      assert.ok(mapped instanceof Err);
      assert.strictEqual(mapped.val, "mapped: original error");
    });

    it("should convert to string correctly", () => {
      const result = new Err("test error");

      assert.strictEqual(result.toString(), "Err(test error)");
    });

    it("should provide stack trace", () => {
      const result = new Err("error");

      assert.ok(result.stack?.includes("Err(error)"));
    });

    it("should not be iterable", () => {
      const result = new Err("error");
      const values = [...result];

      assert.deepStrictEqual(values, []);
    });
  });

  describe("Result utility functions", () => {
    describe("wrap", () => {
      it("should wrap successful operation in Ok", () => {
        const result = Result.wrap(() => 42);

        assert.ok(result instanceof Ok);
        assert.strictEqual(result.unwrap(), 42);
      });

      it("should wrap throwing operation in Err", () => {
        const result = Result.wrap(() => {
          throw new Error("test error");
        });

        assert.ok(result instanceof Err);
        assert.ok(result.val instanceof Error);
        assert.strictEqual((result.val as Error).message, "test error");
      });

      it("should wrap string error in Err", () => {
        const result = Result.wrap(() => {
          throw "string error";
        });

        assert.ok(result instanceof Err);
        assert.strictEqual(result.val, "string error");
      });
    });

    describe("wrapAsync", () => {
      it("should wrap successful async operation in Ok", async () => {
        const result = await Result.wrapAsync(async () => 42);

        assert.ok(result instanceof Ok);
        assert.strictEqual(result.unwrap(), 42);
      });

      it("should wrap rejected promise in Err", async () => {
        const result = await Result.wrapAsync(async () => {
          throw new Error("async error");
        });

        assert.ok(result instanceof Err);
        assert.ok(result.val instanceof Error);
        assert.strictEqual((result.val as Error).message, "async error");
      });

      it("should wrap synchronous throw in async operation", async () => {
        const result = await Result.wrapAsync(() => {
          throw "sync error in async";
        });

        assert.ok(result instanceof Err);
        assert.strictEqual(result.val, "sync error in async");
      });
    });

    describe("isResult", () => {
      it("should return true for Ok instances", () => {
        assert.strictEqual(Result.isResult(new Ok(42)), true);
      });

      it("should return true for Err instances", () => {
        assert.strictEqual(Result.isResult(new Err("error")), true);
      });

      it("should return true for cross-realm objects matching the result brand", () => {
        const brandSymbol = Symbol.for("noctuatech.result");
        const customObj = {
          [brandSymbol]: true,
          ok: true,
          err: false,
          val: "cross-realm success",
        };

        // Standard instanceof check would fail:
        assert.strictEqual(customObj instanceof Ok, false);
        assert.strictEqual(customObj instanceof Err, false);

        // But isResult should correctly identify it:
        assert.strictEqual(Result.isResult(customObj), true);
      });

      it("should return false for other values", () => {
        assert.strictEqual(Result.isResult(42), false);
        assert.strictEqual(Result.isResult("string"), false);
        assert.strictEqual(Result.isResult({}), false);
        assert.strictEqual(Result.isResult(null), false);
        assert.strictEqual(Result.isResult(undefined), false);
      });
    });

    describe("attempt", () => {
      it("should attempt the call a default of 3 times", async () => {
        let called = 0;
        const res = await Result.attempt(
          async () => {
            called++;
            return Result.err("error message");
          },
          { timeout: 0, backoff: 0 },
        );

        assert.strictEqual(res.err, true);
        assert.strictEqual(called, 3);
      });

      it("should attempt the number of times configured (5)", async () => {
        let called = 0;

        const res = await Result.attempt(
          async () => {
            called++;
            return Result.err("error message");
          },
          { attempts: 5, timeout: 0, backoff: 0 },
        );

        assert.strictEqual(res.err, true);
        assert.strictEqual(called, 5);
      });

      it("should stop retrying after a successful result", async () => {
        let called = 0;

        const res = await Result.attempt(
          async () => {
            called++;
            if (called < 3) {
              return Result.err("temporary error");
            }

            return Result.ok("done");
          },
          { attempts: 5, timeout: 0, backoff: 0 },
        );

        assert.strictEqual(res.ok, true);
        assert.strictEqual(res.val, "done");
        assert.strictEqual(called, 3);
      });

      it("should mark attempted when retries are exhausted", async () => {
        let called = 0;
        const res = await Result.attempt(
          async () => {
            called++;
            return Result.err("still failing");
          },
          { attempts: 2, timeout: 0, backoff: 0 },
        );

        assert.strictEqual(res.err, true);
        assert.strictEqual(res.attempted, true);
        assert.strictEqual(called, 2);
      });

      it("should not re-attempt an Err if it has already been attempted", async () => {
        let called = 0;

        const res = await Result.attempt(
          async () => {
            called++;

            const err = Result.err("error message");

            err.attempted = true;

            return err;
          },
          { timeout: 0, backoff: 0 },
        );

        assert.strictEqual(res.err, true);
        assert.strictEqual(called, 1);
      });

      it("should handle exceptions thrown in callback as Err", async () => {
        let called = 0;

        const res = await Result.attempt(
          async () => {
            called++;
            throw new Error("thrown error");
          },
          { attempts: 2, timeout: 0, backoff: 0 },
        );

        assert.strictEqual(res.err, true);
        assert.ok(res.val instanceof Error);
        assert.strictEqual((res.val as Error).message, "thrown error");
        assert.strictEqual(called, 2);
      });
    });
  });

  describe("Result.all", () => {
    it("should return Ok with all values when all results are Ok", () => {
      const result = Result.all([new Ok(1), new Ok(2), new Ok(3)]);

      assert.ok(result instanceof Ok);
      assert.deepStrictEqual(result.val, [1, 2, 3]);
    });

    it("should return the first Err when any result is Err", () => {
      const result = Result.all([new Ok(1), new Err("boom"), new Ok(3)]);

      assert.ok(result instanceof Err);
      assert.strictEqual(result.val, "boom");
    });

    it("should return the first Err and not continue evaluating", () => {
      const result = Result.all([new Err("first"), new Err("second")]);

      assert.ok(result instanceof Err);
      assert.strictEqual(result.val, "first");
    });

    it("should return Ok with an empty array for an empty input", () => {
      const result = Result.all([]);

      assert.ok(result instanceof Ok);
      assert.deepStrictEqual(result.val, []);
    });

    it("should preserve tuple types", () => {
      const a = new Ok(42) as Result<number, string>;
      const b = new Ok("hello") as Result<string, string>;
      const result = Result.all([a, b]);

      assert.ok(result instanceof Ok);
      assert.deepStrictEqual(result.val, [42, "hello"]);
    });
  });

  describe("Functional Combinators", () => {
    describe("orElse", () => {
      it("should return the original Ok", () => {
        const result = new Ok(42);
        const chained = result.orElse((err) => new Ok(100));

        assert.ok(chained instanceof Ok);
        assert.strictEqual(chained.unwrap(), 42);
      });

      it("should map Err to a new Result", () => {
        const result = new Err("error");
        const chained = result.orElse((err) => new Ok(100));

        assert.ok(chained instanceof Ok);
        assert.strictEqual(chained.unwrap(), 100);
      });
    });

    describe("mapOr", () => {
      it("should return mapped value on Ok", () => {
        const result = new Ok(5);
        const mapped = result.mapOr(10, (x) => x * 2);

        assert.strictEqual(mapped, 10);
      });

      it("should return default value on Err", () => {
        const result = new Err("error");
        const mapped = result.mapOr(10, (x: number) => x * 2);

        assert.strictEqual(mapped, 10);
      });
    });

    describe("mapOrElse", () => {
      it("should return mapped value on Ok", () => {
        const result = new Ok(5);
        const mapped = result.mapOrElse(
          (err) => 10,
          (x) => x * 2,
        );

        assert.strictEqual(mapped, 10);
      });

      it("should return default function value on Err", () => {
        const result = new Err("error");
        const mapped = result.mapOrElse(
          (err) => `default: ${err}`,
          (x: number) => `mapped: ${x}`,
        );

        assert.strictEqual(mapped, "default: error");
      });
    });
  });

  describe("Stack Trace Config", () => {
    it("should not capture stack trace if Result.captureStackTrace is false", () => {
      Result.captureStackTrace = false;
      const result = new Err("error");

      // Reset immediately to avoid affecting other tests
      Result.captureStackTrace = true;

      // Note: result.stack still prepends `${this}\n` so it will be "Err(error)\n"
      assert.strictEqual(result.stack, "Err(error)\n");
    });

    it("should handle stack retrieval errors when capturing stack trace", () => {
      const originalPrepare = Error.prepareStackTrace;
      Error.prepareStackTrace = () => {
        throw new Error("mock error");
      };

      try {
        const result = new Err("error");
        // Ensure result compiles and stack is built gracefully without crashing
        assert.ok(result.stack);
      } finally {
        Error.prepareStackTrace = originalPrepare;
      }
    });
  });

  describe("Harden toString tests", () => {
    it("should handle null-prototype objects in toString", () => {
      const obj = Object.create(null);
      obj.key = "value";

      const result = new Ok(obj);

      assert.strictEqual(result.toString(), 'Ok({"key":"value"})');
    });

    it("should handle null in toString", () => {
      const result = new Ok(null);
      assert.strictEqual(result.toString(), "Ok(null)");
    });

    it("should handle undefined in toString", () => {
      const result = new Ok(undefined);
      assert.strictEqual(result.toString(), "Ok(undefined)");
    });

    it("should handle unserializable object in toString", () => {
      const badObj = {
        toString() {
          throw new Error("cannot convert to string");
        },
      };
      const result = new Ok(badObj);
      assert.strictEqual(result.toString(), "Ok([Unserializable Value])");
    });
  });

  describe("Complex scenarios", () => {
    it("should handle chaining multiple operations", () => {
      const result = new Ok(5)
        .map((x) => x * 2)
        .andThen((x) => new Ok(x + 3))
        .map((x) => x.toString());

      assert.ok(result instanceof Ok);
      assert.strictEqual(result.val, "13");
    });

    it("should handle error propagation in chains", () => {
      const result = new Ok(5)
        .map((x) => x * 2)
        .andThen(() => new Err("chain error"))
        .map((x) => x + 3);

      assert.ok(result instanceof Err);
      assert.strictEqual(result.val, "chain error");
    });

    it("should handle custom error types", () => {
      const customError = { message: "custom error" };
      const result = new Err(customError);

      assert.strictEqual(result.val, customError);
      assert.strictEqual(result.val.message, "custom error");
    });

    it("should handle null and undefined values", () => {
      const nullResult = new Ok(null);
      const undefinedResult = new Ok(undefined);

      assert.strictEqual(nullResult.unwrap(), null);
      assert.strictEqual(undefinedResult.unwrap(), undefined);
    });

    it("should handle complex objects", () => {
      const complexObj = { id: 1, name: "test", data: [1, 2, 3] };
      const result = new Ok(complexObj);

      assert.deepStrictEqual(result.unwrap(), complexObj);
      assert.strictEqual(result.toString(), `Ok({"id":1,"name":"test","data":[1,2,3]})`);
    });
  });

  describe("Cloning and Stack Trace Preservation", () => {
    it("should shallow clone an Ok result", () => {
      const original = new Ok({ val: 42 });
      const cloned = original.clone();

      assert.ok(cloned instanceof Ok);
      assert.notStrictEqual(cloned, original);
      assert.deepStrictEqual(cloned.val, original.val);
    });

    it("should shallow clone an Err result and preserve its private stack trace", () => {
      const original = new Err("original error");
      const cloned = original.clone();

      assert.ok(cloned instanceof Err);
      assert.notStrictEqual(cloned, original);
      assert.strictEqual(cloned.val, original.val);
      assert.strictEqual(cloned.stack, original.stack);
    });

    it("should shallow clone an Err result and preserve its attempted property", () => {
      const original = new Err("original error");
      original.attempted = true;
      const cloned = original.clone();

      assert.ok(cloned instanceof Err);
      assert.notStrictEqual(cloned, original);
      assert.strictEqual(cloned.val, original.val);
      assert.strictEqual(cloned.attempted, true);
    });

    it("should preserve the original stack trace of a failed operation in Result.attempt", async () => {
      let originalErr: Err<string> | undefined;

      const res = await Result.attempt(
        async () => {
          originalErr = new Err("network issue");
          return originalErr;
        },
        { attempts: 2, timeout: 0, backoff: 0 },
      );

      assert.ok(res.err);
      assert.ok(originalErr);
      assert.strictEqual(res.stack, originalErr.stack);
      assert.strictEqual(res.attempted, true);
    });
  });

  describe("Async Chaining Combinators", () => {
    describe("mapAsync", () => {
      it("should map an Ok value using an async function", async () => {
        const result = new Ok(5);
        const mapped = await result.mapAsync(async (x) => x * 2);

        assert.ok(mapped instanceof Ok);
        assert.strictEqual(mapped.unwrap(), 10);
      });

      it("should bypass mapAsync on an Err value", async () => {
        const result = new Err("fail") as Result<number, string>;
        const mapped = await result.mapAsync(async (x) => x * 2);

        assert.ok(mapped instanceof Err);
        assert.strictEqual(mapped.val, "fail");
      });
    });

    describe("andThenAsync", () => {
      it("should chain an Ok value to another async Ok result", async () => {
        const result = new Ok(5);
        const chained = await result.andThenAsync(async (x) => new Ok(x * 2));

        assert.ok(chained instanceof Ok);
        assert.strictEqual(chained.unwrap(), 10);
      });

      it("should chain an Ok value to an async Err result", async () => {
        const result = new Ok(5);
        const chained = await result.andThenAsync(async (x) => new Err("failed chain"));

        assert.ok(chained instanceof Err);
        assert.strictEqual(chained.val, "failed chain");
      });

      it("should bypass andThenAsync on an Err value", async () => {
        const result = new Err("initial fail") as Result<number, string>;
        let called = false;
        const chained = await result.andThenAsync(async (x) => {
          called = true;
          return new Ok(x * 2);
        });

        assert.ok(chained instanceof Err);
        assert.strictEqual(chained.val, "initial fail");
        assert.strictEqual(called, false);
      });
    });
  });
});
