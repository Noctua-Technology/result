import assert from "node:assert";
import { describe, it } from "node:test";

import { Ok, Err, Result } from "./result.js";
import {
  AsyncResult,
  AsyncOk,
  AsyncErr,
  isAsyncResult,
  ASYNC_RESULT_BRAND,
} from "./async-result.js";

describe("AsyncResult", () => {
  describe("AsyncOk", () => {
    it("should create an AsyncOk with a synchronous value", async () => {
      const result = new AsyncOk(42) as AsyncResult<number, string>;
      const inner = await result;

      assert.ok(inner instanceof Ok);
      assert.strictEqual(inner.unwrap(), 42);
    });

    it("should create an AsyncOk with a Promise value", async () => {
      const result = new AsyncOk(Promise.resolve("hello")) as AsyncResult<string, string>;
      const inner = await result;

      assert.ok(inner instanceof Ok);
      assert.strictEqual(inner.unwrap(), "hello");
    });

    it("should accept an existing Ok instance", async () => {
      const result = new AsyncOk(new Ok(100)) as AsyncResult<number, string>;
      const inner = await result;

      assert.ok(inner instanceof Ok);
      assert.strictEqual(inner.unwrap(), 100);
    });

    it("should unwrap Ok value correctly", async () => {
      const result = new AsyncOk("success") as AsyncResult<string, string>;

      assert.strictEqual(await result.unwrap(), "success");
    });

    it("should return value from unwrapOr when Ok", async () => {
      const result = new AsyncOk("original") as AsyncResult<string, string>;

      assert.strictEqual(await result.unwrapOr("default"), "original");
    });

    it("should return value from unwrapOrElse without calling fallback", async () => {
      let called = false;
      const result = new AsyncOk("value") as AsyncResult<string, string>;

      const output = await result.unwrapOrElse(() => {
        called = true;
        return "fallback";
      });

      assert.strictEqual(output, "value");
      assert.strictEqual(called, false);
    });

    it("should return value from expect when Ok", async () => {
      const result = new AsyncOk("test") as AsyncResult<string, string>;

      assert.strictEqual(await result.expect("should not throw"), "test");
    });

    it("should throw when expectErr is called on Ok", async () => {
      const result = new AsyncOk("test") as AsyncResult<string, string>;

      await assert.rejects(() => result.expectErr("should throw"), {
        message: "should throw",
      });
    });

    it("should map Ok value with synchronous function", async () => {
      const result = new AsyncOk(5) as AsyncResult<number, string>;
      const mapped = result.map((x) => x * 2);

      assert.strictEqual(await mapped.unwrap(), 10);
    });

    it("should map Ok value with asynchronous function", async () => {
      const result = new AsyncOk(5) as AsyncResult<number, string>;
      const mapped = result.map(async (x) => x * 3);

      assert.strictEqual(await mapped.unwrap(), 15);
    });

    it("should leave Ok value untouched on mapErr", async () => {
      let called = false;
      const result = new AsyncOk(42) as AsyncResult<number, string>;
      const mapped = result.mapErr((err) => {
        called = true;
        return `mapped: ${err}`;
      });

      assert.strictEqual(called, false);
      assert.strictEqual(await mapped.unwrap(), 42);
    });

    it("should chain with andThen returning sync Result", async () => {
      const result = new AsyncOk(5) as AsyncResult<number, string>;
      const chained = result.andThen((x) => new Ok(x * 2));

      assert.strictEqual(await chained.unwrap(), 10);
    });

    it("should chain with andThen returning AsyncResult", async () => {
      const result = new AsyncOk(5) as AsyncResult<number, string>;
      const chained = result.andThen((x) => new AsyncOk(x * 4));

      assert.strictEqual(await chained.unwrap(), 20);
    });

    it("should chain with andThen returning Promise<Result>", async () => {
      const result = new AsyncOk(5) as AsyncResult<number, string>;
      const chained = result.andThen(async (x) => new Ok(x * 5));

      assert.strictEqual(await chained.unwrap(), 25);
    });

    it("should leave Ok untouched on orElse", async () => {
      let called = false;
      const result = new AsyncOk(42) as AsyncResult<number, string>;
      const chained = result.orElse((err) => {
        called = true;
        return new AsyncOk(100);
      });

      assert.strictEqual(called, false);
      assert.strictEqual(await chained.unwrap(), 42);
    });

    it("should return mapped value from mapOr on Ok", async () => {
      const result = new AsyncOk(5) as AsyncResult<number, string>;

      assert.strictEqual(await result.mapOr(10, (x) => x * 2), 10);
      assert.strictEqual(await result.mapOr(10, async (x) => x * 3), 15);
    });

    it("should return mapped value from mapOrElse on Ok", async () => {
      const result = new AsyncOk(5) as AsyncResult<number, string>;

      assert.strictEqual(
        await result.mapOrElse(
          (err) => err.length,
          (x) => x * 2,
        ),
        10,
      );
    });

    it("should support direct .finally and .catch", async () => {
      let finallyCalled = false;
      const result = new AsyncOk(42) as AsyncResult<number, string>;

      const inner = await result.finally(() => {
        finallyCalled = true;
      });

      assert.strictEqual(inner.unwrap(), 42);
      assert.strictEqual(finallyCalled, true);

      const rejecting = new AsyncResult<number, string>(Promise.reject(new Error("raw error")));
      const caught = await rejecting.catch((err) => new Err(err.message));
      assert.ok(caught instanceof Err);
      assert.strictEqual(caught.val, "raw error");
    });

    it("should return the underlying promise from toPromise", async () => {
      const result = new AsyncOk(42) as AsyncResult<number, string>;
      const promise = result.toPromise();

      assert.ok(promise instanceof Promise);
      const inner = await promise;
      assert.ok(inner instanceof Ok);
      assert.strictEqual(inner.unwrap(), 42);
    });

    it("should have toStringTag AsyncOk and AsyncResult", () => {
      const okResult = new AsyncOk(42);
      assert.strictEqual(Object.prototype.toString.call(okResult), "[object AsyncOk]");

      const baseResult = new AsyncResult(new Ok(42));
      assert.strictEqual(Object.prototype.toString.call(baseResult), "[object AsyncResult]");
    });
  });

  describe("AsyncErr", () => {
    it("should create an AsyncErr with a synchronous error", async () => {
      const result = new AsyncErr("error message") as AsyncResult<number, string>;
      const inner = await result;

      assert.ok(inner instanceof Err);
      assert.strictEqual(inner.val, "error message");
    });

    it("should create an AsyncErr with a Promise error", async () => {
      const result = new AsyncErr(Promise.resolve("async error")) as AsyncResult<number, string>;
      const inner = await result;

      assert.ok(inner instanceof Err);
      assert.strictEqual(inner.val, "async error");
    });

    it("should accept an existing Err instance", async () => {
      const result = new AsyncErr(new Err("existing")) as AsyncResult<number, string>;
      const inner = await result;

      assert.ok(inner instanceof Err);
      assert.strictEqual(inner.val, "existing");
    });

    it("should throw when unwrap is called on Err", async () => {
      const result = new AsyncErr("boom") as AsyncResult<number, string>;

      await assert.rejects(
        () => result.unwrap(),
        (err) => err instanceof Error && err.message.includes("Tried to unwrap Error: boom"),
      );
    });

    it("should return default value from unwrapOr on Err", async () => {
      const result = new AsyncErr("fail") as AsyncResult<string, string>;

      assert.strictEqual(await result.unwrapOr("default"), "default");
    });

    it("should call fallback from unwrapOrElse on Err", async () => {
      const result = new AsyncErr("fail") as AsyncResult<string, string>;

      const output = await result.unwrapOrElse((err) => `handled: ${err}`);
      assert.strictEqual(output, "handled: fail");

      const asyncOutput = await result.unwrapOrElse(async (err) => `async: ${err}`);
      assert.strictEqual(asyncOutput, "async: fail");
    });

    it("should throw when expect is called on Err", async () => {
      const result = new AsyncErr("test error") as AsyncResult<number, string>;

      await assert.rejects(
        () => result.expect("failed msg"),
        (err) => err instanceof Error && err.message.includes("failed msg - Error: test error"),
      );
    });

    it("should return error value from expectErr on Err", async () => {
      const result = new AsyncErr("test error") as AsyncResult<number, string>;

      assert.strictEqual(await result.expectErr("should not throw"), "test error");
    });

    it("should bypass map on Err", async () => {
      let called = false;
      const result = new AsyncErr("fail") as AsyncResult<number, string>;
      const mapped = result.map((x) => {
        called = true;
        return x * 2;
      });

      const inner = await mapped;
      assert.strictEqual(called, false);
      assert.ok(inner instanceof Err);
      assert.strictEqual(inner.val, "fail");
    });

    it("should map error value with sync and async functions in mapErr", async () => {
      const result = new AsyncErr("err") as AsyncResult<number, string>;
      const mapped = result.mapErr((e) => `sync:${e}`);
      const inner = await mapped;

      assert.ok(inner instanceof Err);
      assert.strictEqual(inner.val, "sync:err");

      const asyncMapped = result.mapErr(async (e) => `async:${e}`);
      const asyncInner = await asyncMapped;

      assert.ok(asyncInner instanceof Err);
      assert.strictEqual(asyncInner.val, "async:err");
    });

    it("should bypass andThen on Err", async () => {
      let called = false;
      const result = new AsyncErr("fail") as AsyncResult<number, string>;
      const chained = result.andThen((x) => {
        called = true;
        return new AsyncOk(x * 2);
      });

      const inner = await chained;
      assert.strictEqual(called, false);
      assert.ok(inner instanceof Err);
      assert.strictEqual(inner.val, "fail");
    });

    it("should recover using orElse with sync Result, AsyncResult, or Promise<Result>", async () => {
      const r1 = new AsyncErr("fail") as AsyncResult<number, string>;
      const recovered1 = r1.orElse((err) => new Ok(err.length));
      assert.strictEqual(await recovered1.unwrap(), 4);

      const r2 = new AsyncErr("fail") as AsyncResult<number, string>;
      const recovered2 = r2.orElse((err) => new AsyncOk(err.length * 2));
      assert.strictEqual(await recovered2.unwrap(), 8);

      const r3 = new AsyncErr("fail") as AsyncResult<number, string>;
      const recovered3 = r3.orElse(async (err) => new Ok(err.length * 3));
      assert.strictEqual(await recovered3.unwrap(), 12);
    });

    it("should return default value from mapOr on Err", async () => {
      const result = new AsyncErr("fail") as AsyncResult<number, string>;

      assert.strictEqual(await result.mapOr(100, (x) => x * 2), 100);
    });

    it("should return defaultFn value from mapOrElse on Err", async () => {
      const result = new AsyncErr("fail") as AsyncResult<number, string>;

      assert.strictEqual(
        await result.mapOrElse(
          (err) => `default: ${err}`,
          (x) => `val: ${x}`,
        ),
        "default: fail",
      );

      assert.strictEqual(
        await result.mapOrElse(
          async (err) => `async default: ${err}`,
          (x) => `val: ${x}`,
        ),
        "async default: fail",
      );
    });

    it("should have toStringTag AsyncErr", () => {
      const result = new AsyncErr("error");
      assert.strictEqual(Object.prototype.toString.call(result), "[object AsyncErr]");
    });
  });

  describe("AsyncResult static utilities", () => {
    it("should create instances using AsyncResult.ok and AsyncResult.err", async () => {
      const okRes = AsyncResult.ok(10) as AsyncResult<number, string>;
      const errRes = AsyncResult.err("err") as AsyncResult<number, string>;

      assert.strictEqual(await okRes.unwrap(), 10);
      assert.strictEqual(await errRes.unwrapOr(0), 0);
    });

    it("should lift existing results or promises using AsyncResult.from", async () => {
      const syncResult: Result<number, string> = new Ok(50);
      const lifted = AsyncResult.from(syncResult);

      assert.strictEqual(await lifted.unwrap(), 50);

      const promiseResult = Promise.resolve(new Err("async error") as Result<number, string>);
      const liftedPromise = AsyncResult.from(promiseResult);

      assert.strictEqual(await liftedPromise.unwrapOr(0), 0);
    });

    describe("AsyncResult.wrap", () => {
      it("should wrap successful sync function", async () => {
        const res = AsyncResult.wrap(() => 42) as AsyncResult<number, unknown>;
        assert.strictEqual(await res.unwrap(), 42);
      });

      it("should wrap throwing sync function in Err", async () => {
        const res = AsyncResult.wrap(() => {
          throw new Error("sync crash");
        }) as AsyncResult<number, unknown>;

        const inner = await res;
        assert.ok(inner instanceof Err);
        assert.strictEqual((inner.val as Error).message, "sync crash");
      });

      it("should wrap successful async function", async () => {
        const res = AsyncResult.wrap(async () => 100) as AsyncResult<number, unknown>;
        assert.strictEqual(await res.unwrap(), 100);
      });

      it("should wrap rejecting async function in Err", async () => {
        const res = AsyncResult.wrap(async () => {
          throw new Error("async crash");
        }) as AsyncResult<number, unknown>;

        const inner = await res;
        assert.ok(inner instanceof Err);
        assert.strictEqual((inner.val as Error).message, "async crash");
      });
    });

    describe("AsyncResult.all", () => {
      it("should resolve all Ok values", async () => {
        const allRes = AsyncResult.all([
          new AsyncOk(1) as AsyncResult<number, string>,
          new AsyncOk(2) as AsyncResult<number, string>,
          new Ok(3) as Result<number, string>,
        ]);

        const inner = await allRes;
        assert.ok(inner instanceof Ok);
        assert.deepStrictEqual(inner.unwrap(), [1, 2, 3]);
      });

      it("should return the first Err", async () => {
        const allRes = AsyncResult.all([
          new AsyncOk(1) as AsyncResult<number, string>,
          new AsyncErr("first fail") as AsyncResult<number, string>,
          new AsyncErr("second fail") as AsyncResult<number, string>,
        ]);

        const inner = await allRes;
        assert.ok(inner instanceof Err);
        assert.strictEqual(inner.val, "first fail");
      });

      it("should handle empty list", async () => {
        const allRes = AsyncResult.all([]);
        const inner = await allRes;

        assert.ok(inner instanceof Ok);
        assert.deepStrictEqual(inner.unwrap(), []);
      });

      it("should preserve tuple types", async () => {
        const a = new AsyncOk(42) as AsyncResult<number, string>;
        const b = new AsyncOk("hello") as AsyncResult<string, boolean>;

        const combined = AsyncResult.all([a, b]);
        const inner = await combined;

        assert.ok(inner instanceof Ok);
        assert.deepStrictEqual(inner.unwrap(), [42, "hello"]);
      });
    });

    describe("isAsyncResult", () => {
      it("should return true for AsyncResult, AsyncOk, and AsyncErr", () => {
        assert.strictEqual(isAsyncResult(new AsyncResult(new Ok(1))), true);
        assert.strictEqual(isAsyncResult(new AsyncOk(1)), true);
        assert.strictEqual(isAsyncResult(new AsyncErr("err")), true);
      });

      it("should return true for brand-matching objects", () => {
        const custom = { [ASYNC_RESULT_BRAND]: true };
        assert.strictEqual(isAsyncResult(custom), true);
      });

      it("should return false for sync Results, promises, primitives", () => {
        assert.strictEqual(isAsyncResult(new Ok(1)), false);
        assert.strictEqual(isAsyncResult(new Err("err")), false);
        assert.strictEqual(isAsyncResult(Promise.resolve(new Ok(1))), false);
        assert.strictEqual(isAsyncResult(42), false);
        assert.strictEqual(isAsyncResult(null), false);
        assert.strictEqual(isAsyncResult(undefined), false);
      });
    });
  });

  describe("Cloning", () => {
    it("should clone an AsyncResult pipeline", async () => {
      const original = new AsyncOk(42) as AsyncResult<number, string>;
      const cloned = original.clone();

      assert.notStrictEqual(original, cloned);
      assert.strictEqual(await original.unwrap(), 42);
      assert.strictEqual(await cloned.unwrap(), 42);
    });
  });

  describe("Complex pipelines and fluent chaining", () => {
    it("should chain multiple transformations without intermediate awaits", async () => {
      const result = (new AsyncOk(5) as AsyncResult<number, string>)
        .map((x) => x * 2)
        .andThen((x) => new AsyncOk(x + 5))
        .map(async (x) => x * 3)
        .andThen(async (x) => new Ok(`result: ${x}`));

      assert.strictEqual(await result.unwrap(), "result: 45");
    });

    it("should short-circuit error in long chain without executing downstream mappers", async () => {
      let mapper1Called = false;
      let mapper2Called = false;

      const result = (new AsyncOk(5) as AsyncResult<number, string>)
        .andThen(() => new AsyncErr("halt"))
        .map((x) => {
          mapper1Called = true;
          return x * 2;
        })
        .andThen((x) => {
          mapper2Called = true;
          return new AsyncOk(x + 5);
        })
        .orElse((err) => new AsyncOk(`recovered from ${err}`));

      assert.strictEqual(await result.unwrap(), "recovered from halt");
      assert.strictEqual(mapper1Called, false);
      assert.strictEqual(mapper2Called, false);
    });
  });

  describe("Edge cases and union typing", () => {
    describe("falsy Ok values", () => {
      it("should handle 0 correctly in all async operators", async () => {
        const result = new AsyncOk(0) as AsyncResult<number, string>;

        assert.strictEqual(await result.unwrap(), 0);
        assert.strictEqual(await result.unwrapOr(10), 0);
        assert.strictEqual(await result.unwrapOrElse(() => 10), 0);
        assert.strictEqual(await result.mapOr(10, (x) => x + 5), 5);
        assert.strictEqual(
          await result.mapOrElse(
            () => 10,
            (x) => x + 5,
          ),
          5,
        );
        assert.strictEqual(await result.map((x) => x + 1).unwrap(), 1);
      });

      it("should handle empty string correctly in all async operators", async () => {
        const result = new AsyncOk("") as AsyncResult<string, string>;

        assert.strictEqual(await result.unwrap(), "");
        assert.strictEqual(await result.unwrapOr("default"), "");
        assert.strictEqual(await result.unwrapOrElse(() => "default"), "");
        assert.strictEqual(await result.mapOr("default", (s) => `val:${s}`), "val:");
        assert.strictEqual(
          await result.mapOrElse(
            () => "default",
            (s) => `val:${s}`,
          ),
          "val:",
        );
      });

      it("should handle false correctly in all async operators", async () => {
        const result = new AsyncOk(false) as AsyncResult<boolean, string>;

        assert.strictEqual(await result.unwrap(), false);
        assert.strictEqual(await result.unwrapOr(true), false);
        assert.strictEqual(await result.unwrapOrElse(() => true), false);
        assert.strictEqual(await result.mapOr(true, (b) => !b), true);
        assert.strictEqual(
          await result.mapOrElse(
            () => true,
            (b) => !b,
          ),
          true,
        );
      });

      it("should handle null and undefined in all async operators", async () => {
        const nullRes = new AsyncOk(null) as AsyncResult<null, string>;
        const undefinedRes = new AsyncOk(undefined) as AsyncResult<undefined, string>;

        assert.strictEqual(await nullRes.unwrap(), null);
        assert.strictEqual(await nullRes.unwrapOr(undefined), null);
        assert.strictEqual(await nullRes.unwrapOrElse(() => undefined), null);

        assert.strictEqual(await undefinedRes.unwrap(), undefined);
        assert.strictEqual(await undefinedRes.unwrapOr(null), undefined);
        assert.strictEqual(await undefinedRes.unwrapOrElse(() => null), undefined);
      });
    });

    describe("falsy Err values", () => {
      it("should handle 0 as error value correctly", async () => {
        const result = new AsyncErr(0) as AsyncResult<string, number>;

        assert.strictEqual(await result.expectErr("fail"), 0);
        assert.strictEqual(await result.unwrapOr("fallback"), "fallback");
        assert.strictEqual(await result.unwrapOrElse((err) => `err:${err}`), "err:0");
        assert.strictEqual((await result.mapErr((err) => err + 10)).val, 10);
        assert.strictEqual(await result.mapOr("default", (val) => val.toUpperCase()), "default");
        assert.strictEqual(
          await result.mapOrElse(
            (err) => `handled:${err}`,
            (val) => val.toUpperCase(),
          ),
          "handled:0",
        );
      });

      it("should handle empty string as error value correctly", async () => {
        const result = new AsyncErr("") as AsyncResult<number, string>;

        assert.strictEqual(await result.expectErr("fail"), "");
        assert.strictEqual(await result.unwrapOr(42), 42);
        assert.strictEqual(await result.unwrapOrElse((err) => err.length), 0);
        assert.strictEqual(
          await result.mapOrElse(
            (err) => err.length,
            (x) => x * 2,
          ),
          0,
        );
      });
    });
  });
});
