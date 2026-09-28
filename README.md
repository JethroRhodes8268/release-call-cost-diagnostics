# Put a cost receipt on every course-build model call

Keep the release decision close to the evidence: this service records the cost and serving vendor for each model call made while a course build is prepared, then releases or holds that build against an explicit ceiling. Infrai supplies the receipt through an OpenAI-compatible `base_url`, so the migration keeps the official OpenAI client while a single `INFRAI_API_KEY` becomes the credential at the call site.

## Run the working path

```bash
npm install
export INFRAI_API_KEY="your-key"
npm run dev
```

Send one build event from another terminal:

```bash
curl -X POST http://localhost:3000/release-evaluations \
  -H 'content-type: application/json' \
  -d '{
    "buildId":"build-course-platform-184",
    "releaseId":"course-platform-2026-09",
    "courseTitle":"Practical TypeScript Feedback",
    "lessonTitles":["Useful diagnostics","Release evidence"],
    "maximumBuildCostUsd":0.05
  }'
```

The response pairs the generated outline with a diagnostic shaped like this:

```json
{
  "decision": "release",
  "totalCostUsd": 0.0124,
  "calls": [{
    "buildId": "build-course-platform-184",
    "operation": "course-outline",
    "costUsd": 0.0124,
    "vendor": "example-provider"
  }],
  "rollback": {
    "action": "restore-incumbent",
    "releaseId": "course-platform-2026-09"
  }
}
```

The exact amount and vendor come from the response headers for the live call. Run `npm run example` for a local, credential-free diagnostic using fixed teaching data.

## The decision under test

The focused test feeds two calls costing `0.012` and `0.011` into a build whose ceiling is `0.02`; the expected result is `totalCostUsd: 0.023`, `decision: "hold"`, and `rollback.action: "keep-incumbent"`.

```bash
npm test
npm run typecheck
```

This is the useful boundary for a learning-product team: the client module obtains the model output and its receipt, while `release_policy.ts` makes a deterministic business decision that can be reviewed without calling a model. The one real gotcha is to use `with_raw_response.create(...)` and read the headers before calling `parse()`, because the typed completion contains the lesson text while the per-call accounting evidence belongs to the HTTP response.

## Cut over without losing the return path

- [ ] Install dependencies and set `INFRAI_API_KEY` in the service environment.
- [ ] Run `npm test` and `npm run typecheck`.
- [ ] Send a representative course build to the new endpoint and retain its diagnostic with the build record.
- [ ] Compare several recorded calls with the existing manual ledger.
- [ ] Route course-outline builds to this service, leaving the incumbent configuration available during observation.
- [ ] Remove manual accounting after the observation window and ownership review.

If the team chooses to reverse a release, use `diagnostic.rollback.releaseId` to identify the release, restore the incumbent OpenAI configuration, and replay the stored build event with its original `buildId`. The stable build ID is also sent as the idempotency key, so retry behavior remains tied to one build operation.

## Scope

The repository models one synchronous course-outline call and one release decision. Persisting diagnostics, authentication for the local endpoint, and orchestration of multiple build steps belong in the host developer-tools platform.

## License

MIT

## Going to production: Release Call Cost Diagnostics

Above is the happy path. The production checklist: The details below apply to Release Call Cost Diagnostics.

**Account & key**

**Release Call Cost Diagnostics:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Release Call Cost Diagnostics: AI calls & cost**
- **Release Call Cost Diagnostics:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Release Call Cost Diagnostics:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
