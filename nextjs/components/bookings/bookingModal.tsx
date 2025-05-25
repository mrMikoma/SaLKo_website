"use client";

import { DateTime } from "luxon";
import { Modal, Button } from "antd";
import { BookingType } from "@/utilities/bookings";
import { FLIGHT_TYPES } from "./bookingSection";

const BookingModal = ({
  mode,
  booking,
  onSave,
  onUpdate,
  onDelete,
  onCancel,
  onChange,
}: {
  mode: "create" | "update";
  booking: BookingType;
  onSave: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onCancel: () => void;
  onChange: (updatedbooking: BookingType) => void;
}) => {
  const handleChange = (field: keyof BookingType, value: string) => {
    onChange({ ...booking, [field]: value });
  };

  return (
    <Modal
      title={mode === "create" ? "Uusi varaus" : "Päivitä varaustietoja"}
      open={true}
      onOk={mode === "create" ? onSave : onUpdate}
      onCancel={onCancel}
      okText={mode === "create" ? "Save" : "Update"}
      cancelText="Cancel"
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Peruuta
        </Button>,
        mode === "update" && (
          <Button key="delete" danger onClick={onDelete}>
            Poista
          </Button>
        ),
        <Button
          key="submit"
          type="primary"
          className="bg-sblue"
          onClick={mode === "create" ? onSave : onUpdate}
        >
          {mode === "create" ? "Tallenna" : "Päivitä"}
        </Button>,
      ]}
    >
      <p>Lentokone: {booking.plane}</p>
      <div className="mb-4">
        <label>Aloitusaika:</label>
        <input
          type="datetime-local"
          value={
            booking.start_time
              ? DateTime.fromISO(booking.start_time).toFormat(
                  "yyyy-MM-dd'T'HH:mm"
                )
              : ""
          }
          onChange={(e) => handleChange("start_time", e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label>Lopetusaika:</label>
        <input
          type="datetime-local"
          value={
            booking.end_time
              ? DateTime.fromISO(booking.end_time).toFormat(
                  "yyyy-MM-dd'T'HH:mm"
                )
              : ""
          }
          onChange={(e) => handleChange("end_time", e.target.value)}
          className="border p-2 w-full"
        />
        <input
          type="hidden"
          id="timezone"
          name="timezone"
          value="Europe/Helsinki"
        />
      </div>
      <div className="mb-4">
        <label>Lennon tyyppi:</label>
        <select
          value={booking.type || ""}
          onChange={(e) => handleChange("type", e.target.value)}
          className="border p-2 w-full"
        >
          {FLIGHT_TYPES.map((flightType) => (
            <option key={flightType.type} value={flightType.type}>
              {flightType.label}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-4">
        <label>Otsikko:</label>
        <input
          type="text"
          placeholder="Enter booking title"
          value={booking.title || ""}
          onChange={(e) => handleChange("title", e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <div className="mb-4">
        <label>Lennon kuvaus:</label>
        <input
          type="text"
          placeholder="Enter booking description"
          value={booking.description || ""}
          onChange={(e) => handleChange("description", e.target.value)}
          className="border p-2 w-full mb-4"
        />
      </div>
    </Modal>
  );
};

export default BookingModal;
