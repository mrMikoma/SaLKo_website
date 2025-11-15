/**
 * METAR Update API Route
 * This can be called by external cron services like Vercel Cron or cron-job.org
 *
 * For Vercel, add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/metar",
 *     "schedule": "0,15,30,45 * * * *"
 *   }]
 * }
 */

// import { NextRequest, NextResponse } from "next/server";
// import { update-metarData } from "@/services/metarService";
//
// export async function GET(request: NextRequest) {
//   // Verify the request is from a cron job (optional security)
//   const authHeader = request.headers.get("authorization");
//   if (
//     process.env.CRON_SECRET &&
//     authHeader !== `Bearer ${process.env.CRON_SECRET}`
//   ) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }
//
//   try {
//     console.log(`[${new Date().toISOString()}] METAR cron job triggered`);
//
//     await update-metarData();
//
//     return NextResponse.json({
//       success: true,
//       message: "METAR data updated successfully",
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     console.error("METAR update failed:", error);
//
//     return NextResponse.json(
//       {
//         success: false,
//         error: "Failed to update METAR data",
//         message: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 }
//     );
//   }
// }
//
// // Allow POST as well for flexibility
// export async function POST(request: NextRequest) {
//   return GET(request);
// }
//
