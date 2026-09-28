import { diagnoseRelease } from "./release_policy.js";

const diagnostic = diagnoseRelease("course-platform-2026-09", 0.05, [
  {
    buildId: "build-course-platform-184",
    operation: "course-outline",
    costUsd: 0.0124,
    vendor: "example-provider",
  },
  {
    buildId: "build-course-platform-184",
    operation: "lesson-feedback",
    costUsd: 0.0181,
    vendor: "example-provider",
  },
]);

console.log(JSON.stringify(diagnostic, null, 2));
