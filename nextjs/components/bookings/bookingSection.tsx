"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Timeline from "@/components/bookings/timeline";
import AddBookingForm from "@/components/bookings/addBookingForm";
import DatePicker from "@/components/bookings/datePicker";
import { fetchDayBookings } from "@/utilities/bookings";

const planesTypes = ["OH-CON", "OH-PDX", "OH-816", "OH-829", "OH-475"];
const flightTypes = [
  { value: "local", label: "Paikallislento", color: "#ADD8E6" }, // Light Blue
  { value: "trip", label: "Matkalento", color: "#90EE90" }, // Light Green
  { value: "training", label: "Koululento", color: "#FFFFE0" }, // Light Yellow
  { value: "maintenance", label: "Huolto", color: "#FFA07A" }, // Light Coral (Soft Red)
  { value: "fire", label: "Palolento", color: "#FFECB3" }, // Light Amber (Soft Orange)
  { value: "other", label: "Muu", color: "#D3D3D3" }, // Light Gray
];

interface BookingSectionProps {
  isLoggedIn: boolean;
}

const BookingSection = (isLoggedIn: BookingSectionProps) => {
  const userId = "admin";
  const [bookings, setBookings] = useState([]);
  const [selectedPlane, setSelectedPlane] = useState(planesTypes[0]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [fullHours, setFullHours] = useState([]);
  const [previewBooking, setPreviewBooking] = useState(null);

  // Define the initial date as today with Finnish locale
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split("T")[0]; // Format date to YYYY-MM-DD
    setSelectedDate(formattedDate);
    console.log("Selected date set to today:", formattedDate); // debug
  }, []);

  // Create a list of full hours for the selected date, always start from 6 AM and end at 23 PM in Helsinki time
  // output as date objects:
  // summer time [2023-10-01T06:00:00+03:00, 2023-10-01T07:00:00+03:00, ...]
  // winter time [2023-10-01T06:00:00+02:00, 2023-10-01T07:00:00+02:00, ...]
  useEffect(() => {
    const startHour = 6; // 6 AM
    const endHour = 23; // 11 PM
    const hours = [];
    const date = new Date(selectedDate);
    const timezoneOffset = date.getTimezoneOffset() * 60 * 1000; // Convert to milliseconds
    const localDate = new Date(date.getTime() + timezoneOffset); // Adjust to local time
    const localDateString = localDate.toISOString().split("T")[0]; // Format date to YYYY-MM-DD
    for (let hour = startHour; hour <= endHour; hour++) {
      const fullHour = new Date(
        `${localDateString}T${String(hour).padStart(2, "0")}:00:00`
      );
      hours.push(fullHour);
    }
    setFullHours(hours);
  }, [selectedDate]);

  // Fetch bookings for the selected plane and date
  const fetchDayBookingsWithParams = fetchDayBookings.bind(
    null,
    selectedPlane,
    selectedDate
  );
  useEffect(() => {
    console.log("Fetching bookings for", selectedPlane, selectedDate); // debug

    const updateBookings = async () => {
      const { status, result } = await fetchDayBookingsWithParams();
      console.log("Bookings fetched:", result); // debug
      if (status === "success") {
        setBookings(result);
      } else if (status === "error") {
        console.error("Error fetching bookings:", result);
      } else {
        setBookings([]);
      }
    };

    if (selectedDate) {
      updateBookings();
    }
    console.log("Bookings fetched:", bookings); // debug
  }, [selectedPlane, selectedDate]);

  // Update the preview booking when the form changes
  const handleFormChange = (booking) => {
    setPreviewBooking({ ...booking, plane: selectedPlane });
  };

  // Add a new booking to the list
  const handleAddBooking = (newBooking) => {
    setBookings([...bookings, newBooking]);
    setPreviewBooking(null);
  };

  // Delete a booking from the list
  const handleDeleteBooking = (bookingToDelete) => {
    setBookings((prevBookings) =>
      prevBookings.filter((booking) => booking.id !== bookingToDelete.id)
    );
  };

  return (
    <div>
      {selectedDate ? (
        <div className="flex flex-col items-center justify-center w-full max-w-[1200px] mx-auto">
          <section className="flex flex-col items-center justify-center w-full max-w-4xl space-y-4">
            <div className="flex flex-row justify-center w-full border m-4">
              {planesTypes.map((plane, index) => (
                <button
                  key={plane}
                  onClick={() => setSelectedPlane(plane)}
                  className={`w-full text-center text-white p-2 ${
                    selectedPlane === plane ? "bg-sred" : "bg-sbluel"
                  } ${index > 0 ? "border-l border-white" : ""}`}
                >
                  {plane}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col items-center justify-center w-full max-w-4xl space-y-4 text-sred">
            <DatePicker
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
            />
          </section>

          <section className="flex flex-col items-center justify-center w-full max-w-4xl space-y-4 border my-4 bg-swhite">
            <div className="flex-1 relative w-full">
              <Timeline
                fullHours={fullHours}
                bookings={bookings}
                previewBooking={previewBooking}
                flightTypes={flightTypes}
                onDeleteBooking={handleDeleteBooking}
              />
            </div>
          </section>

          <section className="flex flex-col items-center justify-center w-full max-w-4xl space-y-4">
            {isLoggedIn ? (
              <div className="flex-1 relative w-full min-h-[400px] py-4">
                <AddBookingForm
                  userId={userId}
                  plane={selectedPlane}
                  selectedDate={selectedDate}
                  flightTypes={flightTypes}
                  fullHours={fullHours}
                  onAddBooking={handleAddBooking}
                  onChange={handleFormChange}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center w-1/2 max-w-4xl py-8">
                <span className="font-semibold text-sred">
                  Kirjaudu sisään jäsenalueelle varataksesi
                </span>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center w-full max-w-4xl py-8">
          <span className="font-semibold text-sred">
            Tapahtui virhe, yritä myöhemmin uudelleen tai ota yhteyttä
            järjestelmän valvojaan.
          </span>
          <button className="mt-4 bg-sred text-white p-2 rounded">
            <Link href="/yhteystiedot">Yhteystiedot</Link>
          </button>
        </div>
      )}
    </div>
  );
};

export default BookingSection;
