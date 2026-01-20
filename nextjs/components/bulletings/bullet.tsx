"use client";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import { Bulletin } from "@/utilities/bulletings";

interface BulletProps {
  item: Bulletin;
}

const Bullet = ({ item }: BulletProps) => {
  const formattedDate = new Date(item.date * 1000).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Disclosure>
      {({ open }) => (
        <div className="overflow-hidden rounded-lg border border-sred/35 shadow-lg mb-3">
          <DisclosureButton className="flex justify-between items-center w-full px-6 py-4 bg-sblued/10 backdrop-blur-sm text-swhite hover:bg-sblued/80 transition-all duration-200">
            <span className="font-semibold tracking-wide truncate text-left">
              {item.title}
            </span>
            <div className="flex items-center gap-4 ml-4">
              <span
                className="text-sm text-swhite/80 whitespace-nowrap"
                suppressHydrationWarning={true}
              >
                {formattedDate}
              </span>
              <span
                className={`text-2xl font-bold transform transition-transform duration-200 ${
                  open ? "rotate-180" : "rotate-0"
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </span>
            </div>
          </DisclosureButton>
          <DisclosurePanel className="px-6 py-4 bg-sblued/35 backdrop-blur-sm text-swhite/90 max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto border-t border-sred/20">
            <div className="mb-3 pb-2 border-b border-sbluel/30">
              <span className="text-sm font-semibold text-sbluel">
                Kirjoittaja:{" "}
              </span>
              <span className="text-sm">{item.username || "Tuntematon"}</span>
            </div>
            <div className="text-base leading-relaxed">{item.content}</div>
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
};

export default Bullet;
