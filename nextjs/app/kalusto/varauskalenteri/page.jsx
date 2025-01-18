"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Timeline from "@/components/bookings/timeline";
import AddBookingForm from "@/components/bookings/addBookingForm";
import DatePicker from "@/components/bookings/datePicker";
import { fetchDayBookings } from "@/utilities/bookings";

const planes = ["OH-CON", "OH-SEE", "OH-PDX", "OH-816", "OH-829", "OH-475"];
const flightTypes = [
  { value: "local", label: "Paikallislento", color: "blue" },
  { value: "trip", label: "Matkalento", color: "green" },
  { value: "training", label: "Koululento", color: "yellow" },
  { value: "maintenance", label: "Huolto", color: "red" },
  { value: "fire", label: "Palolento", color: "purple" },
  { value: "other", label: "Muu", color: "gray" },
];

const Scheduler = () => {
  const isLoggedIn = false;
  const [bookings, setBookings] = useState([]);
  const [selectedPlane, setSelectedPlane] = useState(planes[0]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [fullHours, setFullHours] = useState([]);
  const [previewBooking, setPreviewBooking] = useState(null);

  // Define the initial date as today
  useEffect(() => {
    setSelectedDate(new Date().toISOString().split("T")[0]);
  }, []);

  // Update full hours when the selected date changes
  useEffect(() => {
    const dayStart = new Date(selectedDate).setHours(0, 0, 0, 0) / 1000; // Midnight of the selected day
    setFullHours(
      Array.from({ length: 16 }, (_, i) => dayStart + (i + 6) * 3600)
    ); // Generate hours between 8:00 AM and 11:00 PM
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
      if (status === "success") {
        setBookings(result);
      } else {
        setBookings([]);
      }
    };

    if (selectedDate) {
      updateBookings();
    }
    console.log("Bookings fetched:", bookings); // debug
  }, [selectedPlane, selectedDate]);

  const handleFormChange = (booking) => {
    setPreviewBooking({ ...booking, plane: selectedPlane });
  };

  const handleAddBooking = (newBooking) => {
    setBookings([...bookings, newBooking]);
    setPreviewBooking(null);
  };

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
              {planes.map((plane, index) => (
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

          <section className="flex flex-col items-center justify-center w-full max-w-4xl space-y-4 border my-4">
            <div className="flex-1 relative w-full min-h-[400px] bg-sbluel">
              <Timeline
                fullHours={fullHours}
                bookings={bookings}
                previewBooking={previewBooking}
                selectedPlane={selectedPlane}
                flightTypes={flightTypes}
                onDeleteBooking={handleDeleteBooking}
              />
            </div>
          </section>

          <section className="flex flex-col items-center justify-center w-full max-w-4xl space-y-4">
            {isLoggedIn ? (
              <div className="flex-1 relative w-full min-h-[400px] py-4">
                <AddBookingForm
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
                <span className="font-semibold text-sred">Kirjaudu sisään varataksesi</span>
                <button className="bg-sred text-white p-2 mt-4 rounded w-full border">
                  <Link href="/login">Kirjaudu sisään</Link>
                </button>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="text-sred">Valitse päivä</div>
      )}
    </div>
  );
};

export default Scheduler;
