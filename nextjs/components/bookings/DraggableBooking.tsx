"use client";

import { useDrag } from "react-dnd";
import { BookingType } from "@/utilities/bookings";
import { CSSProperties, MouseEvent } from "react";

interface DraggableBookingProps {
  booking: BookingType;
  children: React.ReactNode;
  onBookingClick?: () => void;
  style?: CSSProperties;
  className?: string;
}

const DRAG_TYPE = "BOOKING";

/**
 * Draggable booking component that wraps a booking display
 * Allows the booking to be dragged to different time slots
 * Double-click to open modal, single drag to move
 */
export const DraggableBooking = ({
  booking,
  children,
  onBookingClick,
  style,
  className,
}: DraggableBookingProps) => {
  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: DRAG_TYPE,
      item: { booking },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [booking]
  );

  const handleDoubleClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (onBookingClick) {
      onBookingClick();
    }
  };

  // Prevent single click from triggering when dragging
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      ref={drag as any}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      style={{
        ...style,
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? "grabbing" : "grab",
      }}
      className={className}
      title={`${booking.title} (Tuplaklikkaa muokataksesi, vedä siirtääksesi)`}
    >
      {children}
    </div>
  );
};

export { DRAG_TYPE };
