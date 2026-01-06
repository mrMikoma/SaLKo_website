import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const umamiUrl = process.env.UMAMI_INTERNAL_URL || "http://salko-umami:3000";

  try {
    const body = await request.text();
    const headers: Record<string, string> = {};

    request.headers.forEach((value, key) => {
      if (
        key.toLowerCase() !== "host" &&
        key.toLowerCase() !== "connection" &&
        key.toLowerCase() !== "content-length"
      ) {
        headers[key] = value;
      }
    });

    const response = await fetch(`${umamiUrl}/api/send`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: body,
    });

    if (!response.ok) {
      console.error(
        `Failed to forward to Umami: ${response.status} ${response.statusText}`
      );
      return new NextResponse("Failed to send tracking data", {
        status: response.status,
      });
    }

    const data = await response.text();

    return new NextResponse(data, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "text/plain",
      },
    });
  } catch (error) {
    console.error("Error proxying Umami tracking:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
