export type BuildCallReceipt = {
  buildId: string;
  operation: "course-outline" | "lesson-feedback";
  costUsd: number;
  vendor: string;
};

export type ReleaseDiagnostic = {
  releaseId: string;
  decision: "release" | "hold";
  totalCostUsd: number;
  calls: BuildCallReceipt[];
  message: string;
  rollback: { action: "keep-incumbent" | "restore-incumbent"; releaseId: string };
};

export function diagnoseRelease(
  releaseId: string,
  maximumBuildCostUsd: number,
  calls: BuildCallReceipt[],
): ReleaseDiagnostic {
  const totalCostUsd = Number(calls.reduce((sum, call) => sum + call.costUsd, 0).toFixed(8));
  const decision = totalCostUsd <= maximumBuildCostUsd ? "release" : "hold";

  return {
    releaseId,
    decision,
    totalCostUsd,
    calls,
    message: decision === "release"
      ? `Release ${releaseId} is inside its build-call budget.`
      : `Release ${releaseId} is held for a cost review.`,
    rollback: {
      action: decision === "release" ? "restore-incumbent" : "keep-incumbent",
      releaseId,
    },
  };
}
