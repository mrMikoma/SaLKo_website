import { NextResponse } from "next/server";

export async function GET() {
  const umamiUrl = process.env.UMAMI_INTERNAL_URL || "http://salko-umami:3000";

  try {
    const response = await fetch(`${umamiUrl}/script.js`, {
      method: "GET",
      headers: {
        "User-Agent": "Next.js Proxy",
      },
      // Add a timeout to prevent hanging
      signal: AbortSignal.timeout(5000),
    });

    // The details stay in the log, not in the answer to an anonymous caller
    if (!response.ok) {
      console.error(`[Umami Script Proxy] Umami answered ${response.status} ${response.statusText}`);
      return new NextResponse(null, { status: 502 });
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
    console.error("[Umami Script Proxy] Error:", error);
    return new NextResponse(null, { status: 502 });
  }
}
