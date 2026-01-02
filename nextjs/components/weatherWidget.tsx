"use client";
import { useState, useEffect } from "react";
import { getLatestMETAR } from "@/utilities/metarActions";

interface WeatherData {
  temperature: string;
  windSpeed: string;
  windDirection: string;
  visibility: string;
  clouds: string;
  qnh: string;
  raw: string;
  timestamp: string;
}

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true);
        setError(false);

        // Fetch METAR from database via server action
        const response = await getLatestMETAR();

        if (!response.success || !response.data) {
          console.log("Failed to fetch METAR data");
        }

        setWeather(response.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching METAR:", err);
        setError(true);
        setLoading(false);
      }
    };

    // Fetch immediately
    fetchWeather();

    // Refresh every 5 minutes
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-6 border border-sred/20 shadow-xl">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-sbluel/30 rounded w-3/4"></div>
          <div className="h-4 bg-sbluel/30 rounded w-1/2"></div>
          <div className="h-4 bg-sbluel/30 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error || !weather) {
    return (
      <div className="glass rounded-2xl p-6 border border-sred/20 shadow-xl text-center">
        <p className="text-swhite/70">Säätietoja ei voitu ladata</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-6 border border-sred/20 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-sred">
        <h3 className="text-xl font-bold text-swhite flex items-center gap-2">
          <svg
            className="w-6 h-6 text-sbluel"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
            />
          </svg>
          EFSA Sää
        </h3>
        <span className="text-sm text-swhite/70">{weather.timestamp}</span>
      </div>

      {/* Weather Info Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-sred">
            {weather.temperature}
          </div>
          <div className="text-sm text-swhite/70">Lämpötila</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-sred">
            {weather.windSpeed}
          </div>
          <div className="text-sm text-swhite/70">Tuuli</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-sbluel">
            {weather.windDirection}
          </div>
          <div className="text-sm text-swhite/70">Tuulen suunta</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold text-sbluel">
            {weather.visibility}
          </div>
          <div className="text-sm text-swhite/70">Näkyvyys</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-medium text-swhite">
            {weather.clouds}
          </div>
          <div className="text-sm text-swhite/70">Pilvisyys</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-medium text-swhite">{weather.qnh}</div>
          <div className="text-sm text-swhite/70">QNH</div>
        </div>
      </div>

      {/* METAR Raw */}
      <div className="mt-4 pt-4 border-t border-sbluel/30">
        <div className="text-xs text-swhite/60 font-mono bg-sblack/30 p-3 rounded-lg overflow-x-auto">
          {weather.raw}
        </div>
      </div>

      {/* Data Source */}
      <div className="mt-2 text-xs text-center text-swhite/40">
        Lähde: NOAA Aviation Weather Center
      </div>
    </div>
  );
};

export default WeatherWidget;
