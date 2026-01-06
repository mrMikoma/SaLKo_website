import { NextResponse } from "next/server";

export async function GET() {
  const umamiUrl = process.env.UMAMI_INTERNAL_URL || "http://salko-umami:3000";

  console.log(`[Umami Script Proxy] Fetching from: ${umamiUrl}/script.js`);
  console.log(
    `[Umami Script Proxy] ENV UMAMI_INTERNAL_URL: ${process.env.UMAMI_INTERNAL_URL}`
  );

  try {
    const response = await fetch(`${umamiUrl}/script.js`, {
      method: "GET",
      headers: {
        "User-Agent": "Next.js Proxy",
      },
      // Add a timeout to prevent hanging
      signal: AbortSignal.timeout(5000),
    });

    console.log(`[Umami Script Proxy] Response status: ${response.status}`);

    if (!response.ok) {
      const errorMsg = `Failed to fetch script: ${response.status} ${response.statusText}`;
      console.error(`[Umami Script Proxy] ${errorMsg}`);
      return new NextResponse(errorMsg, { status: 502 });
    }

    const script = await response.text();
    console.log(`[Umami Script Proxy] Success! Fetched ${script.length} bytes`);

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
    const errorName = error instanceof Error ? error.name : "Error";
    const fullError = `${errorName}: ${errorMessage}`;

    console.error(`[Umami Script Proxy] Error:`, error);

    return new NextResponse(`Internal Server Error: ${fullError}`, {
      status: 500,
    });
  }
}
