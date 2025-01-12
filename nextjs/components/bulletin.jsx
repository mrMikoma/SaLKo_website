"use client";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";

const bulletinItems = [
  {
    title: "Tiedote 1",
    date: "2022-01-01",
    content:
      "Culpa mollit laborum ea officia eu aliqua ex veniam quis. Commodo laborum minim consequat Lorem proident elit cillum reprehenderit sit eu aliquip. Sit dolore nisi aliquip dolor ex. Velit sint ex consequat aliqua consequat nostrud. Aliqua eu do magna Lorem fugiat aliquip laboris do occaecat esse officia tempor. Nostrud laborum labore non minim incididunt magna incididunt qui officia. Dolore ut enim reprehenderit et consequat Lorem Lorem dolore officia laboris. Commodo cillum adipisicing proident pariatur nulla voluptate. Ex veniam proident proident ut dolore duis. Anim consectetur qui dolor nulla veniam sint mollit reprehenderit ut id consectetur. Voluptate quis voluptate eiusmod consectetur Lorem officia sit non culpa duis tempor. Qui veniam Lorem magna amet ullamco fugiat culpa qui velit minim voluptate velit.",
  },
  {
    title: "Tiedote 2",
    date: "2022-01-02",
    content:
      "Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas.",
  },
  {
    title: "Tiedote 3",
    date: "2022-01-03",
    content:
      "Vestibulum ac diam sit amet quam vehicula elementum sed sit amet dui.",
  },
  {
    title: "Tiedote 4",
    date: "2022-01-04",
    content:
      "Nulla porttitor accumsan tincidunt. Donec sollicitudin molestie malesuada.",
  },
  {
    title: "Tiedote 5",
    date: "2022-01-05",
    content: "Curabitur aliquet quam id dui posuere blandit.",
  },
];

const Bulletin = (props) => {
  return (
    <div className="w-full h-full flex flex-col gap-2">
      <span className="text-2xl text-center font-bold text-white mx-4 my-6 border-b border-white">
        Tiedotteet
      </span>
      {bulletinItems.map((item, index) => (
        <Disclosure key={index}>
          {({ open }) => (
            <div className="overflow-hidden shadow-md">
              <DisclosureButton
                className={
                  "flex justify-between items-center w-full px-6 py-2 min-h-96 bg-white bg-opacity-50 text-gray-800 hover:bg-gray-50 transition-all"
                }
              >
                <span className="font-semibold">{item.title}</span>
                <span className="text-sm text-gray-600">{item.date}</span>
                <span
                  className={`text-xl font-bold transform transition-transform ${
                    open ? "rotate-180" : "rotate-0"
                  }`}
                >
                  {open ? "−" : "+"}
                </span>
              </DisclosureButton>
              <DisclosurePanel className="px-6 py-4 bg-gray-50 text-gray-700">
                {item.content}
              </DisclosurePanel>
            </div>
          )}
        </Disclosure>
      ))}
    </div>
  );
};

export default Bulletin;
