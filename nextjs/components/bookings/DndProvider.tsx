"use client";

import { DndProvider as ReactDndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { ReactNode } from "react";

interface DndProviderProps {
  children: ReactNode;
}

/**
 * Drag and Drop Provider wrapper for booking calendar
 * Enables HTML5 drag and drop functionality
 */
export const DndProvider = ({ children }: DndProviderProps) => {
  return <ReactDndProvider backend={HTML5Backend}>{children}</ReactDndProvider>;
};
