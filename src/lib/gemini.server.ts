import { GoogleGenAI } from "@google/genai";

const GEMINI_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash-lite",
];

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getGeminiKey() {
  const key = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "").trim();
  if (!key) {
    throw new Error(
      "Gemini API key not found. Create a .env file beside package.json and set GEMINI_API_KEY=your_key, then restart npm run dev.",
    );
  }
  return key;
}

function getClient() {
  return new GoogleGenAI({ apiKey: getGeminiKey() });
}

/**
 * Uses Gemini's stable Generate Content API with structured JSON output.
 * This keeps the existing EduPath agent contract intact while avoiding the
 * incorrect/changed Interactions response_format shape used previously.
 */
export async function callGemini(
  input: string,
  systemInstruction: string,
  options?: {
    schema?: object;
    thinkingLevel?: "low" | "medium" | "high";
  },
) {
  const failures: string[] = [];

  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const client = getClient();

        const response = await client.models.generateContent({
          model,
          contents: input,
          config: {
            systemInstruction,
            ...(options?.schema
              ? {
                  responseMimeType: "application/json",
                  responseSchema: options.schema,
                }
              : {}),
            ...(options?.thinkingLevel
              ? {
                  thinkingConfig: {
                    thinkingLevel: options.thinkingLevel,
                  },
                }
              : {}),
          },
        });

        const text = response.text?.trim();
        if (!text) {
          throw new Error("Gemini returned an empty response.");
        }

        return text;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const status = Number((error as { status?: number })?.status);
        failures.push(`${model}: ${message.slice(0, 220)}`);

        const retryable =
          RETRYABLE_STATUS.has(status) ||
          /503|429|408|temporarily unavailable|high demand|rate limit|overloaded/i.test(message);

        if (!retryable) {
          throw error;
        }

        if (attempt < 1) {
          await sleep(500 + Math.floor(Math.random() * 250));
        }
      }
    }
  }

  throw new Error(
    `Gemini is temporarily unavailable after automatic retries. ${failures.slice(-4).join(" | ")}`,
  );
}
