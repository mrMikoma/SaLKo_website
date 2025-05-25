"use client";

import { DateTime } from "luxon";
import { Modal, Button } from "antd";
import { BookingType } from "@/utilities/bookings";

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
      title={mode === "create" ? "Add booking" : "Update booking"}
      open={true}
      onOk={mode === "create" ? onSave : onUpdate}
      onCancel={onCancel}
      okText={mode === "create" ? "Save" : "Update"}
      cancelText="Cancel"
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Cancel
        </Button>,
        mode === "update" && (
          <Button key="delete" danger onClick={onDelete}>
            Delete
          </Button>
        ),
        <Button
          key="submit"
          type="primary"
          onClick={mode === "create" ? onSave : onUpdate}
        >
          {mode === "create" ? "Save" : "Update"}
        </Button>,
      ]}
    >
      <p>Plane: {booking.plane}</p>
      <div className="mb-4">
        <label>Start Date:</label>
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
        <label>End Date:</label>
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
      <input
        type="text"
        placeholder="Enter booking description"
        value={booking.description || ""}
        onChange={(e) => handleChange("description", e.target.value)}
        className="border p-2 w-full mb-4"
      />
      <div className="mb-4">{/* Add something */}</div>
    </Modal>
  );
};

export default BookingModal;
