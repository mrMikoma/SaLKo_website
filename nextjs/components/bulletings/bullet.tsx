"use client";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";

const Bullet = ({ item }) => {
  const formattedDate = new Date(item.date * 1000).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Disclosure>
      {({ open }) => (
        <div className="overflow-hidden shadow-md">
          <DisclosureButton
            className={
              "flex justify-between items-center w-full px-6 py-2 min-h-96 bg-sgrey bg-opacity-80 text-sblack hover:bg-gray-50 transition-all"
            }
          >
            <span className="font-semibold uppercase tracking-wide truncate">
              {item.title}
            </span>
            <div className="flex items-center">
              <span className="text-md text-right text-sblack mr-4 min-w-64 whitespace-nowrap" suppressHydrationWarning={true}>
                {formattedDate}
              </span>
              <span
                className={`text-xl font-bold transform transition-transform ${
                  open ? "rotate-180" : "rotate-0"
                }`}
              >
                {open ? "−" : "+"}
              </span>
            </div>
          </DisclosureButton>
          <DisclosurePanel className="px-6 py-4 bg-sgrey text-sblack max-h-64 sm:max-h-80 lg:max-h-96 overflow-y-auto scrollbar-thin">
            <div className="mb-2">
              <span className="font-semibold">Kirjoittaja: </span>
              <span>{item.username}</span>
            </div>
            {item.content}
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
};

export default Bullet;
