import { createFileRoute } from "@tanstack/react-router";
import { geminiCoachText } from "@/lib/edupath.functions";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            messages?: Array<{ role?: string; parts?: Array<{ type?: string; text?: string }> }>;
            context?: unknown;
          };
          const messages = Array.isArray(body.messages) ? body.messages : [];
          const last = [...messages].reverse().find((message) => message.role === "user");
          const message = last?.parts
            ?.filter((part) => part.type === "text")
            .map((part) => part.text ?? "")
            .join(" ")
            .trim();
          if (!message) return new Response("A message is required.", { status: 400 });

          const text = await geminiCoachText(
            message,
            `You are EduPath's personal learning coach. Ground your answer in the learner context below. Be concise but useful, give ordered steps when appropriate, and never invent learner facts.\n\nLEARNER CONTEXT\n${typeof body.context === "string" ? body.context : "No learner context was supplied."}`,
          );

          return Response.json({ text });
        } catch (error) {
          return new Response(error instanceof Error ? error.message : "Coach request failed.", {
            status: 503,
          });
        }
      },
    },
  },
});
