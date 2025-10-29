"use client";

import { useDrop } from "react-dnd";
import { BookingType } from "@/utilities/bookings";
import { DRAG_TYPE } from "./DraggableBooking";
import { DateTime } from "luxon";

interface DroppableCellProps {
  plane: string;
  hour: number;
  date: string;
  children: React.ReactNode;
  onDrop: (booking: BookingType, newPlane: string, newStartTime: string) => void;
  onCellClick?: () => void;
  className?: string;
  isLoggedIn: boolean;
}

/**
 * Droppable cell component that accepts dragged bookings
 * Highlights when a booking is hovering over it
 */
export const DroppableCell = ({
  plane,
  hour,
  date,
  children,
  onDrop,
  onCellClick,
  className = "",
  isLoggedIn,
}: DroppableCellProps) => {
  const [{ isOver, canDrop }, drop] = useDrop(
    () => ({
      accept: DRAG_TYPE,
      canDrop: () => isLoggedIn, // Only allow drop if user is logged in
      drop: (item: { booking: BookingType }) => {
        const newStartTime = DateTime.fromISO(date)
          .set({ hour })
          .toISO();

        if (newStartTime) {
          onDrop(item.booking, plane, newStartTime);
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [plane, hour, date, onDrop, isLoggedIn]
  );

  const dropClassName = `
    ${className}
    ${isOver && canDrop ? "bg-blue-100 ring-2 ring-blue-500" : ""}
    ${!canDrop && isOver ? "bg-red-100" : ""}
  `;

  return (
    <td
      ref={drop as any}
      className={dropClassName}
      onClick={onCellClick}
    >
      {children}
    </td>
  );
};
