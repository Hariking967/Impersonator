import { NextResponse } from "next/server";
import { getLyrics } from "genius-lyrics-api";
import OpenAI from "openai";

type Body = {
  authorName: string;
  song: string;
  description: string;
};

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    const { authorName, song, description } = body;

    if (!authorName || !song) {
      return NextResponse.json(
        { error: "Missing authorName or song" },
        { status: 400 }
      );
    }

    // Fetch lyrics from Genius (server-side; keep API key in env)
    const geniusOptions = {
      apiKey: process.env.GENIUS_API_KEY,
      title: song,
      artist: authorName,
      optimizeQuery: true,
    };

    let originalLyrics = "";
    try {
      // getLyrics may return string or object; treat result as unknown and narrow safely
      const g: unknown = await getLyrics(geniusOptions);
      if (typeof g === "string") {
        originalLyrics = g;
      } else if (
        typeof g === "object" &&
        g !== null &&
        "lyrics" in g &&
        typeof (g as any).lyrics === "string"
      ) {
        // small cast to access property when shape is uncertain
        originalLyrics = (g as { lyrics: string }).lyrics;
      } else {
        originalLyrics = JSON.stringify(g).slice(0, 4000);
      }
    } catch (err) {
      // If Genius fails, continue with empty originalLyrics
      console.warn("Genius fetch failed:", err);
    }

    // Build prompt
    const prompt = `You are a creative assistant that writes song lyrics in the style of the provided artist/song.\n\nOriginal Lyrics:\n${originalLyrics}\n\nDescription/Mood:\n${description}\n\nPlease generate an original set of lyrics inspired by the above (do not reproduce copyrighted lyrics).`;

    const geminiKey =
      process.env.GEMINI_API_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENAI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY / OpenRouter API key" },
        { status: 500 }
      );
    }

    const defaultHeaders: Record<string, string> = {
      ...(process.env.SITE_URL ? { "HTTP-Referer": process.env.SITE_URL } : {}),
      ...(process.env.SITE_TITLE ? { "X-Title": process.env.SITE_TITLE } : {}),
    };

    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: geminiKey,
      defaultHeaders,
    });

    const model = process.env.GEMINI_MODEL || "google/gemini-2.5-flash";
    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text: "You are a helpful creative songwriting assistant.",
            },
          ],
        },
        {
          role: "user",
          content: [{ type: "text", text: prompt }],
        },
      ],
      max_tokens: 800,
    });

    const message = completion.choices?.[0]?.message;

    // Extract text safely
    let lyrics = "";
    if (!message) {
      lyrics = "";
    } else if (typeof message === "string") {
      lyrics = message;
    } else if (message?.content) {
      const c: unknown = (message as { content?: unknown }).content;
      if (typeof c === "string") {
        lyrics = c;
      } else if (Array.isArray(c)) {
        lyrics = c
          .map((it) => {
            if (typeof it === "string") return it;
            if (
              typeof it === "object" &&
              it !== null &&
              "text" in it &&
              typeof (it as any).text === "string"
            )
              return (it as { text: string }).text;
            return "";
          })
          .join("");
      } else {
        lyrics = String(c);
      }
    } else {
      lyrics = JSON.stringify(message);
    }

    return NextResponse.json({ lyrics });
  } catch (err: unknown) {
    console.error(err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message ?? "Server error" },
      { status: 500 }
    );
  }
}
