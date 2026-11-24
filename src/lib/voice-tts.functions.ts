import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const MODEL = "google/gemini-3.1-flash-tts-preview";
const VOICE = "Kore";
const STYLE: Record<string, string> = {
  pcm: "Speak warmly and smoothly, like a native Lagos speaker of Nigerian Pidgin, at a relaxed natural pace",
  yo: "Speak warmly and fluently in Yorùbá with native Lagos tone and rhythm",
  ig: "Speak warmly and fluently in Igbo with native tone and rhythm",
  ha: "Speak warmly and fluently in Hausa with native tone and rhythm",
  en: "Speak warmly and clearly in Nigerian English with a natural Lagos accent",
};

// Short agent prompts only; returns a base64 WAV or a safe error message.
export const speakAgentPhrase = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ text: z.string().trim().min(1).max(400), dialect: z.enum(["pcm", "yo", "ig", "ha", "en"]) }).parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { audio: null, error: "Voice isn't set up yet." };
    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        contents: [{ role: "user", parts: [{ text: `${STYLE[data.dialect]}: ${data.text}` }] }],
        generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } } },
        stream_format: "audio",
      }),
    });
    if (!res.ok) {
      console.error("speakAgentPhrase failed", res.status, await res.text().catch(() => ""));
      return { audio: null, error: res.status === 429 ? "Voice is busy, try again soon." : res.status === 402 ? "Voice paused: AI credits ran out." : "Voice unavailable right now." };
    }
    const bytes = new Uint8Array(await res.arrayBuffer());
    let bin = "";
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { audio: btoa(bin), error: null };
  });
