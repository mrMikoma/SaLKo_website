import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import { BookingsLoadError } from "@/hooks/useBookings";
import { FAILURE_TEXT, failureKind } from "@/utilities/errorText";

interface BookingsErrorProps {
  error: Error | null;
  onRetry?: () => void;
}

/**
 * Error component for bookings
 * Displays error message with retry option, or a reload when the page is from
 * before a deploy: fetching again would use the same old code
 */
export const BookingsError = ({ error, onRetry }: BookingsErrorProps) => {
  // The hook's own errors are Finnish; anything else is described by its kind
  const kind = error instanceof BookingsLoadError ? error.failure : failureKind(error);
  const outdated = kind === "outdated";
  const message =
    error instanceof BookingsLoadError
      ? error.message
      : kind && kind !== "other"
        ? FAILURE_TEXT[kind]
        : "Tapahtui odottamaton virhe. Yritä uudelleen.";

  return (
    <div
      className="w-full p-8 bg-red-50 border border-red-200 rounded-lg"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex items-center justify-center gap-3 mb-4">
        <FiAlertCircle className="text-red-600 text-3xl" aria-hidden="true" />
        <h3 className="text-xl font-semibold text-red-900">
          Varausten lataaminen epäonnistui
        </h3>
      </div>

      <p className="text-red-700 text-center mb-4">
        {message}
      </p>

      {outdated ? (
        <div className="flex justify-center">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <FiRefreshCw aria-hidden="true" />
            Lataa sivu uudelleen
          </button>
        </div>
      ) : onRetry && (
        <div className="flex justify-center">
          <button
            onClick={onRetry}
            className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            aria-label="Yritä ladata varaukset uudelleen"
          >
            <FiRefreshCw aria-hidden="true" />
            Yritä uudelleen
          </button>
        </div>
      )}
    </div>
  );
};
