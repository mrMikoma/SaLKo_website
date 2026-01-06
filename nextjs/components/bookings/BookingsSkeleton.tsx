/**
 * Skeleton loader for bookings table
 * Displayed during initial data loading
 */
export const BookingsSkeleton = () => {
  const hours = Array.from({ length: 18 }, (_, i) => i + 6);
  const planes = Array(6).fill(0);

  // Pre-determined pattern for skeleton (deterministic, no Math.random())
  // This ensures server and client render the same HTML
  const shouldShowBooking = (hour: number, planeIndex: number) => {
    // Create a deterministic pattern based on indices
    return (hour + planeIndex) % 3 === 0;
  };

  return (
    <div className="w-full overflow-auto animate-pulse">
      <table className="w-full border-collapse bg-gray-50 table-fixed">
        <thead>
          <tr>
            <th className="border border-gray-300 p-2 bg-gray-100" style={{ width: "80px" }}>
              <div className="h-4 bg-gray-300 rounded w-16 mx-auto"></div>
            </th>
            {planes.map((_, index) => (
              <th
                key={index}
                className="border border-gray-300 p-2 bg-gray-100"
                style={{ height: "50px", width: "120px" }}
              >
                <div className="h-4 bg-gray-300 rounded w-16 mx-auto"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hours.map((hour) => (
            <tr key={hour}>
              <th
                className="border border-gray-300 p-2 bg-gray-100"
                style={{ height: "50px", width: "80px" }}
              >
                <div className="h-4 bg-gray-300 rounded w-12 mx-auto"></div>
              </th>
              {planes.map((_, planeIndex) => (
                <td
                  key={`${hour}-${planeIndex}`}
                  className="border border-gray-300 p-2"
                  style={{ height: "50px", width: "120px" }}
                >
                  {shouldShowBooking(hour, planeIndex) && (
                    <div className="h-full bg-gray-200 rounded"></div>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
