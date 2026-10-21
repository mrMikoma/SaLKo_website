"use client";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DateTime } from "luxon";
import { Bulletin } from "@/utilities/bulletings";
import { bulletinMarkdown } from "./bulletinMarkdown";

interface BulletProps {
  item: Bulletin;
}

const Bullet = ({ item }: BulletProps) => {
  // Rendered on the server too, so the zone is explicit (the server runs in UTC)
  const formattedDate = DateTime.fromISO(item.publishedAt, {
    zone: "Europe/Helsinki",
  }).toFormat("d.M.yyyy");

  return (
    <Disclosure>
      {({ open }) => (
        <div className="overflow-hidden rounded-lg border border-sred/35 shadow-lg">
          <DisclosureButton className="flex justify-between items-center w-full px-6 py-4 bg-sblued/10 backdrop-blur-sm text-swhite hover:bg-sblued/80 transition-all duration-200">
            <span className="font-semibold tracking-wide text-left break-words min-w-0">
              {item.title}
            </span>
            <div className="flex items-center gap-4 ml-4 flex-shrink-0">
              <span className="text-sm text-swhite/80 whitespace-nowrap">
                {formattedDate}
              </span>
              <svg
                aria-hidden="true"
                className={`w-5 h-5 transform transition-transform duration-200 ${
                  open ? "rotate-180" : "rotate-0"
                }`}
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
            </div>
          </DisclosureButton>
          <DisclosurePanel className="px-6 py-4 bg-sblued/35 backdrop-blur-sm text-swhite/90 border-t border-sred/20">
            <div className="mb-3 pb-2 border-b border-sbluel/30">
              <span className="text-sm font-semibold text-sbluel">
                Kirjoittaja:{" "}
              </span>
              <span className="text-sm">{item.author || "Tuntematon"}</span>
            </div>
            <div className="text-base leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={bulletinMarkdown}
              >
                {item.content}
              </ReactMarkdown>
            </div>
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
};

export default Bullet;
