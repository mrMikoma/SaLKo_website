import { NextRequest, NextResponse } from "next/server";

// An analytics event is a small JSON object. Anything larger is refused before
// it is read in full, so anonymous requests can't fill the server's memory.
const MAX_BODY_BYTES = 16 * 1024;

async function readCapped(request: NextRequest): Promise<string | null> {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function POST(request: NextRequest) {
  const umamiUrl = process.env.UMAMI_INTERNAL_URL || "http://salko-umami:3000";

  try {
    const body = await readCapped(request);
    if (body === null) {
      return new NextResponse(null, { status: 413 });
    }

    const response = await fetch(`${umamiUrl}/api/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": request.headers.get("user-agent") || "Next.js Proxy",
      },
      body,
      signal: AbortSignal.timeout(5000),
    });

    // The details stay in the log, not in the answer to an anonymous caller
    if (!response.ok) {
      console.error(`[Umami Send Proxy] Umami answered ${response.status} ${response.statusText}`);
      return new NextResponse(null, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[Umami Send Proxy] Error:", error);
    return new NextResponse(null, { status: 502 });
  }
}
