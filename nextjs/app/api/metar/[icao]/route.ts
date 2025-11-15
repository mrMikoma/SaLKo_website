import { NextRequest, NextResponse } from "next/server";
import { getLatestMETARFromDB } from "@/utilities/metarService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ icao: string }> }
) {
  try {
    const { icao } = await params;

    // Validate ICAO code format (4 letters)
    if (!icao || !/^[A-Z]{4}$/i.test(icao)) {
      return NextResponse.json(
        {
          error: "Invalid ICAO code",
          message: "ICAO code must be exactly 4 letters (e.g., EFSA)"
        },
        { status: 400 }
      );
    }

    const stationCode = icao.toUpperCase();
    const metarData = await getLatestMETARFromDB(stationCode);

    if (!metarData) {
      return NextResponse.json(
        {
          error: "No data found",
          message: `No METAR data available for station ${stationCode}`
        },
        { status: 404 }
      );
    }

    // Return the full METAR data
    return NextResponse.json({
      stationCode: metarData.stationCode,
      rawMetar: metarData.rawMetar,
      parsed: {
        temperature: metarData.temperature,
        windSpeed: metarData.windSpeed,
        windDirection: metarData.windDirection,
        visibility: metarData.visibility,
        clouds: metarData.clouds,
        qnh: metarData.qnh,
      },
      observationTime: metarData.observationTime,
      fetchedAt: metarData.fetchedAt,
    });
  } catch (error) {
    console.error("METAR API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
