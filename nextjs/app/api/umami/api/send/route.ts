import { NextRequest, NextResponse } from "next/server";

// The tracker posts to `${data-host-url}/api/send`, and UmamiProvider sets the
// host URL to /api/umami, hence this route's path

// Umami tells visitors apart and finds their country by IP address, so pass on
// the visitor's, not this server's. Cloudflare sets cf-connecting-ip.
const CLIENT_IP_HEADERS = ["cf-connecting-ip", "x-forwarded-for", "x-real-ip"];

export async function POST(request: NextRequest) {
  const umamiUrl = process.env.UMAMI_INTERNAL_URL || "http://salko-umami:3000";

  try {
    const body = await request.text();

    console.log(`[Umami Send Proxy] Forwarding event to: ${umamiUrl}/api/send`);

    const response = await fetch(`${umamiUrl}/api/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": request.headers.get("user-agent") || "Next.js Proxy",
        ...Object.fromEntries(
          CLIENT_IP_HEADERS.flatMap((name) => {
            const value = request.headers.get(name);
            return value ? [[name, value]] : [];
          })
        ),
      },
      body,
      signal: AbortSignal.timeout(5000),
    });

    console.log(`[Umami Send Proxy] Response status: ${response.status}`);

    if (!response.ok) {
      const errorMsg = `Failed to send event: ${response.status} ${response.statusText}`;
      console.error(`[Umami Send Proxy] ${errorMsg}`);
      return new NextResponse(errorMsg, { status: response.status });
    }

    const data = await response.json();
    console.log(`[Umami Send Proxy] Success!`);

    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorName = error instanceof Error ? error.name : "Error";
    const fullError = `${errorName}: ${errorMessage}`;

    console.error(`[Umami Send Proxy] Error:`, error);

    return new NextResponse(`Internal Server Error: ${fullError}`, {
      status: 500,
    });
  }
}
