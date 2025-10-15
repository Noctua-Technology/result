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

    it("should be iterable when value is iterable", () => {
      const result = new Ok([1, 2, 3]);
      const values = [...result];

      assert.deepStrictEqual(values, [1, 2, 3]);
    });

    it("should not be iterable when value is not iterable", () => {
      const result = new Ok(100);
      const values = [...result];

      assert.deepStrictEqual(values, []);
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

    it("should return default value from unwrapOr when Err", () => {
      const result = new Err("error");

      assert.strictEqual(result.unwrapOr("default"), "default");
    });

    it("should throw when expect is called on Err", () => {
      const result = new Err("test error");

      assert.throws(() => result.expect("custom message"));
    });

    it("should return error value from expectErr when Err", () => {
      const result = new Err("test error");

      assert.strictEqual(result.expectErr("should not throw"), "test error");
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
          { timeout: 0, backoff: 0 }
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
          { attempts: 5, timeout: 0, backoff: 0 }
        );

        assert.strictEqual(res.err, true);
        assert.strictEqual(called, 5);
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
          { timeout: 0, backoff: 0 }
        );

        assert.strictEqual(res.err, true);
        assert.strictEqual(called, 1);
      });
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
      assert.strictEqual(
        result.toString(),
        `Ok({"id":1,"name":"test","data":[1,2,3]})`
      );
    });
  });
});
