"use client";

import { useState } from "react";

interface Booking {
  id: number;
  user_id: string;
  plane: string;
  start_time: string;
  end_time: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
}

interface BookingsTableProps {
  bookings: Booking[];
}

const BookingsTable = ({ bookings }: BookingsTableProps) => {
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("all");
  const [expandedBooking, setExpandedBooking] = useState<number | null>(null);

  const now = new Date();
  const filteredBookings = bookings.filter((booking) => {
    const startTime = new Date(booking.start_time);
    if (filter === "upcoming") return startTime >= now;
    if (filter === "past") return startTime < now;
    return true;
  });

  const toggleExpand = (bookingId: number) => {
    setExpandedBooking(expandedBooking === bookingId ? null : bookingId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('fi-FI', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUpcoming = (startTime: string) => {
    return new Date(startTime) >= now;
  };

  return (
    <div>
      <div className="p-6 border-b border-gray-200">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Kaikki ({bookings.length})
          </button>
          <button
            onClick={() => setFilter("upcoming")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "upcoming"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Tulevat ({bookings.filter(b => isUpcoming(b.start_time)).length})
          </button>
          <button
            onClick={() => setFilter("past")}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              filter === "past"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Menneet ({bookings.filter(b => !isUpcoming(b.start_time)).length})
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tyyppi</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Otsikko</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alkaa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Päättyy</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Varaaja</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiedot</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredBookings.map((booking) => {
              const isGuest = !!booking.guest_name;
              const contactName = isGuest ? booking.guest_name : booking.user_name;
              const contactEmail = isGuest ? booking.guest_email : booking.user_email;
              const contactPhone = isGuest ? booking.guest_phone : booking.user_phone;

              return (
                <>
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {booking.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {booking.plane}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        isGuest ? 'bg-orange-100 text-orange-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {isGuest ? 'Vieras' : 'Käyttäjä'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {booking.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(booking.start_time)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(booking.end_time)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>{contactName}</div>
                      <div className="text-xs text-gray-500">{contactEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => toggleExpand(booking.id)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        {expandedBooking === booking.id ? 'Piilota' : 'Näytä'}
                      </button>
                    </td>
                  </tr>
                  {expandedBooking === booking.id && (
                    <tr>
                      <td colSpan={8} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-2 text-sm">
                          <div>
                            <strong className="text-gray-700">Kuvaus:</strong>
                            <p className="text-gray-600 mt-1">{booking.description || "Ei kuvausta"}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4 mt-4">
                            <div>
                              <strong className="text-gray-700">Yhteystiedot:</strong>
                              <div className="mt-1 text-gray-600">
                                <p>Nimi: {contactName}</p>
                                <p>Sähköposti: {contactEmail}</p>
                                <p>Puhelin: {contactPhone || "Ei asetettu"}</p>
                              </div>
                            </div>
                            <div>
                              <strong className="text-gray-700">Varauksen tiedot:</strong>
                              <div className="mt-1 text-gray-600">
                                <p>Luotu: {formatDate(booking.created_at)}</p>
                                <p>Varaustyyppi: {booking.type}</p>
                                <p>Status: {isUpcoming(booking.start_time) ?
                                  <span className="text-green-600 font-medium">Tuleva</span> :
                                  <span className="text-gray-500">Mennyt</span>}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {filteredBookings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Ei varauksia
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsTable;
