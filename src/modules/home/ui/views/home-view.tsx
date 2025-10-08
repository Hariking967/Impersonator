"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

const formSchema = z.object({
  authorName: z.string().min(1, "Author name is required"),
  song: z.string().min(1, "Song is required"),
  description: z.string().min(1, "Description is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function HomeView() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Controlled inputs
  const [authorName, setAuthorName] = useState("");
  const [song, setSong] = useState("");
  const [description, setDescription] = useState("");

  // The handleSubmit function requested: accepts the three fields as args
  async function handleSubmit(
    authorName: string,
    song: string,
    description: string
  ) {
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      // Placeholder implementation: in a real app you'd call your backend / Gemini API here.
      // For now we simulate a short async operation and return a generated-lyrics string.
      // Call server API route which performs Genius + OpenAI work server-side
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      try {
        const res = await fetch("/api/generate-lyrics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ authorName, song, description }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || `Server returned ${res.status}`);
        }
        const data = await res.json();
        setResult(data?.lyrics ?? "");
      } catch (err: any) {
        if (err.name === "AbortError") {
          setError("Request timed out. Try again.");
        } else {
          throw err;
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to generate lyrics. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const formSchema = z.object({
    authorName: z.string().min(1, "Author name is required"),
    song: z.string().min(1, "Song is required"),
    description: z.string().min(1, "Description is required"),
  });

  // onSubmit for the HTML form: validate with zod then call handleSubmit
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    const parsed = formSchema.safeParse({ authorName, song, description });
    if (!parsed.success) {
      const first = parsed.error.errors[0];
      setError(first?.message ?? "Invalid input");
      return;
    }
    await handleSubmit(authorName, song, description);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <main className="p-8">
        <h1 className="text-3xl font-bold text-white">Impersonator</h1>
        <p className="mt-2 text-sm text-neutral-300">
          Enter an author name, a song title, and a short description to create
          lyrics in a similar style.
        </p>

        {result && (
          <Card className="mt-6 bg-neutral-900 border border-neutral-800 text-white">
            <CardContent>
              <h2 className="font-semibold text-white">Generated Lyrics</h2>
              <pre className="whitespace-pre-wrap mt-2 text-sm text-neutral-200">
                {result}
              </pre>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom-fixed form: always visible at the bottom of the viewport */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        <Card className="shadow-xl bg-neutral-900/95 border-t border-neutral-800">
          <CardContent>
            <form
              onSubmit={onSubmit}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
            >
              <div>
                <label className="text-sm font-medium">Author Name</label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Author (e.g. Taylor Swift)"
                  className="bg-neutral-800 text-white border-neutral-700 placeholder:text-neutral-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Song</label>
                <Input
                  value={song}
                  onChange={(e) => setSong(e.target.value)}
                  placeholder="Song title"
                  className="bg-neutral-800 text-white border-neutral-700 placeholder:text-neutral-400"
                />
              </div>

              <div className="md:col-span-3">
                <label className="text-sm font-medium">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-neutral-800 text-white border border-neutral-700 rounded px-3 py-2 min-h-[60px] resize-y placeholder:text-neutral-400"
                  placeholder="Short description / mood / themes"
                />
              </div>

              {!!error && (
                <div className="md:col-span-3">
                  <Alert className="bg-red-700/10 border-none text-sm p-2 text-red-200">
                    {error}
                  </Alert>
                </div>
              )}

              <div className="md:col-span-3 flex justify-end gap-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-36 bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 focus:ring-2 focus:ring-pink-400/30"
                >
                  {loading ? "Generating..." : "Generate Lyrics"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
