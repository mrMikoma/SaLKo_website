"use client";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";

const Bullet = ({ item }) => {
  return (
    <Disclosure>
      {({ open }) => (
        <div className="overflow-hidden shadow-md">
          <DisclosureButton
            className={
              "flex justify-between items-center w-full px-6 py-2 min-h-96 bg-sgrey bg-opacity-80 text-sblack hover:bg-gray-50 transition-all"
            }
          >
            <span className="font-semibold">{item.title}</span>
            <span className="text-sm text-sblack">{item.date}</span>
            <span
              className={`text-xl font-bold transform transition-transform ${
                open ? "rotate-180" : "rotate-0"
              }`}
            >
              {open ? "−" : "+"}
            </span>
          </DisclosureButton>
          <DisclosurePanel className="px-6 py-4 bg-sgrey text-sblack">
            {item.content}
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
};

export default Bullet;
