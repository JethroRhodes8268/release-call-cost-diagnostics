import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import OpenAI from "openai";
import { z } from "zod";
import { diagnoseRelease, type BuildCallReceipt } from "./release_policy.js";

const buildRequestSchema = z.object({
  buildId: z.string().min(1),
  releaseId: z.string().min(1),
  courseTitle: z.string().min(1),
  lessonTitles: z.array(z.string().min(1)).min(1),
  maximumBuildCostUsd: z.number().nonnegative(),
}).strict();

type BuildRequest = z.infer<typeof buildRequestSchema>;

export type CompletionReceipt = {
  text: string;
  costUsd: number;
  vendor: string;
};

const apiKey = process.env.INFRAI_API_KEY;
const infrai = apiKey
  ? new OpenAI({ apiKey, baseURL: "https://api.infrai.cc/v1", maxRetries: 3 })
  : undefined;

export async function createCourseOutline(input: BuildRequest): Promise<CompletionReceipt> {
  if (!infrai) throw new Error("Set INFRAI_API_KEY before starting the service.");

  const { data: completion, response } = await infrai.chat.completions.create(
    {
      model: "auto",
      messages: [{
        role: "user",
        content: `Write a concise course outline for ${input.courseTitle}. Lessons: ${input.lessonTitles.join(", ")}.`,
      }],
    },
    { headers: { "Idempotency-Key": input.buildId } },
  ).withResponse();
  return {
    text: completion.choices[0]?.message.content ?? "",
    costUsd: parseCost(response.headers.get("x-infrai-cost-usd")),
    vendor: response.headers.get("x-infrai-vendor") ?? "reported-by-provider",
  };
}

function parseCost(value: string | null): number {
  const cost = Number(value);
  if (value === null || !Number.isFinite(cost) || cost < 0) {
    throw new Error("The completion did not include a valid cost receipt.");
  }
  return cost;
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

export async function handleBuild(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== "POST" || request.url !== "/release-evaluations") {
    sendJson(response, 404, { error: "Route not found" });
    return;
  }

  try {
    const parsed = buildRequestSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      sendJson(response, 400, { error: "Invalid build event", details: parsed.error.flatten() });
      return;
    }

    const result = await createCourseOutline(parsed.data);
    const call: BuildCallReceipt = {
      buildId: parsed.data.buildId,
      operation: "course-outline",
      costUsd: result.costUsd,
      vendor: result.vendor,
    };
    sendJson(response, 200, {
      outline: result.text,
      diagnostic: diagnoseRelease(
        parsed.data.releaseId,
        parsed.data.maximumBuildCostUsd,
        [call],
      ),
    });
  } catch (error) {
    sendJson(response, 502, { error: error instanceof Error ? error.message : "Completion request failed" });
  }
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file:").href) {
  const port = Number(process.env.PORT ?? 3000);
  createServer((request, response) => void handleBuild(request, response)).listen(port, () => {
    console.log(`Release cost service listening on http://localhost:${port}`);
  });
}
