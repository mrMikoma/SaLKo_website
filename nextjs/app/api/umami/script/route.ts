import { NextResponse } from "next/server";

export async function GET() {
  const umamiUrl = process.env.UMAMI_INTERNAL_URL || "http://salko-umami:3000";

  try {
    const response = await fetch(`${umamiUrl}/script.js`, {
      method: "GET",
      headers: {
        "User-Agent": "Next.js Proxy",
      },
    });

    if (!response.ok) {
      return new NextResponse(
        `Failed to fetch script: ${response.statusText}`,
        { status: 502 }
      );
    }

    const script = await response.text();

    return new NextResponse(script, {
      status: 200,
      headers: {
        "Content-Type": "application/javascript",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new NextResponse(`Internal Server Error: ${errorMessage}`, {
      status: 500,
    });
  }
}
