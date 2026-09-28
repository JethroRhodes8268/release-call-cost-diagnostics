import assert from "node:assert/strict";
import test from "node:test";
import { diagnoseRelease } from "../src/release_policy.js";

test("holds a course release when its build calls exceed the agreed ceiling", () => {
  const result = diagnoseRelease("course-v7", 0.02, [
    { buildId: "build-71", operation: "course-outline", costUsd: 0.012, vendor: "provider-a" },
    { buildId: "build-71", operation: "lesson-feedback", costUsd: 0.011, vendor: "provider-b" },
  ]);

  assert.equal(result.totalCostUsd, 0.023);
  assert.equal(result.decision, "hold");
  assert.equal(result.rollback.action, "keep-incumbent");
});
