"use client";

import { CalendarOutlined, UnorderedListOutlined, TableOutlined } from "@ant-design/icons";

export type ViewMode = "day" | "week" | "month";

interface ViewSelectorProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

const ViewSelector = ({ currentView, onViewChange }: ViewSelectorProps) => {
  const views: Array<{ mode: ViewMode; label: string; icon: React.ReactNode }> = [
    { mode: "day", label: "Päivä", icon: <UnorderedListOutlined /> },
    { mode: "week", label: "Viikko", icon: <TableOutlined /> },
    { mode: "month", label: "Kuukausi", icon: <CalendarOutlined /> },
  ];

  return (
    <div className="flex gap-2 justify-center" role="tablist" aria-label="Näkymän valinta">
      {views.map((view) => (
        <button
          key={view.mode}
          type="button"
          role="tab"
          aria-selected={currentView === view.mode}
          aria-label={`${view.label} näkymä`}
          onClick={() => onViewChange(view.mode)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
            ${
              currentView === view.mode
                ? "bg-sblue text-swhite shadow-md"
                : "bg-swhite text-sblack hover:bg-sgrey border border-sbluel"
            }
            focus:outline-none focus:ring-2 focus:ring-sbluel focus:ring-offset-2
          `}
        >
          <span className="text-lg">{view.icon}</span>
          <span>{view.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ViewSelector;
