"use client";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import ArrowDownIcon from "@/components/icons/arrowDown";
import XCrossIcon from "@/components/icons/xCross";
import MenuIcon from "@/components/icons/menu";

const NavbarMobile = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathName = usePathname();

  // Toggle menu visibility
  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  // Close the menu
  const handleClose = () => {
    setIsOpen(false);
  };

  // Close menu on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathName]);

  return (
    <div>
      {/* Mobile Menu Button (Hamburger) */}
      <Disclosure>
        {({ open }) => (
          <DisclosureButton
            aria-label="Toggle Menu"
            onClick={handleToggle}
            className="px-2 py-1 ml-auto rounded-md lg:hidden hover:text-indigo-500 focus:text-indigo-500"
          >
            <MenuIcon size={40}/>
          </DisclosureButton>
        )}
      </Disclosure>

      {/* Full-Screen Menu */}
      {isOpen && (
        <div
          className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-70 z-50 transform transition-transform text-2xl uppercase"
          onClick={handleClose}
        >
          <div
            className="flex flex-col items-center justify-center h-full space-y-6"
            onClick={(e) => e.stopPropagation()} // Prevents close when clicking inside the menu
          >
            {/* Close Button */}
            <button
              aria-label="Close Menu"
              onClick={handleClose}
              className="absolute top-4 right-4 text-white"
            >
              <XCrossIcon size={40} />
            </button>

            {/* Logo */}
            <Link href="/">
              <span className="flex justify-center mx-auto">
                <Image
                  src="/images/SaLKon Logo_vaakunaversio.png"
                  alt="SaLKo"
                  width={120}
                  height={40}
                />
              </span>
            </Link>

            {/* Kerho (Club) */}
            <Disclosure>
              {({ open }) => (
                <div className="w-full">
                  <DisclosureButton className="w-full px-6 py-4 text-center">
                    <div className="flex flex-row items-center justify-center">
                      <span className="uppercase">Kerho</span>
                      {/* Arrow Icon */}
                      <span
                        className={`transition-transform ${
                          open ? "rotate-180" : ""
                        } mt-1`}
                      >
                        <ArrowDownIcon size={30} />
                      </span>
                    </div>
                  </DisclosureButton>
                  <DisclosurePanel className="w-full text-xl text-center grid grid-cols-2 gap-2">
                    <Link
                      href="/kerho"
                      className="w-full px-6 py-4 hover:bg-indigo-600"
                      onClick={handleClose}
                    >
                      Kerho
                    </Link>
                    <Link
                      href="/kerho/jasenyys"
                      className="w-full px-6 py-4 hover:bg-indigo-600"
                      onClick={handleClose}
                    >
                      Jäsenyys
                    </Link>
                    <Link
                      href="/kerho/historiaa"
                      className="w-full px-6 py-4 hover:bg-indigo-600"
                      onClick={handleClose}
                    >
                      Historiaa
                    </Link>
                    <Link
                      href="/kerho/hallit"
                      className="w-full px-6 py-4 hover:bg-indigo-600"
                      onClick={handleClose}
                    >
                      Hallit
                    </Link>
                  </DisclosurePanel>
                </div>
              )}
            </Disclosure>

            {/* Kalusto (Planes) */}
            <Disclosure>
              {({ open }) => (
                <div className="w-full">
                  <DisclosureButton className="w-full px-6 py-4 text-center">
                    <div className="flex flex-row items-center justify-center">
                      <span className="uppercase">Kalusto</span>
                      {/* Arrow Icon */}
                      <span
                        className={`transition-transform ${
                          open ? "rotate-180" : ""
                        } mt-1`}
                      >
                        <ArrowDownIcon size={30} />
                      </span>
                    </div>
                  </DisclosureButton>
                  <DisclosurePanel className="w-full text-xl text-center grid grid-cols-2 gap-2">
                    <Link
                      href="/kalusto"
                      className="w-full px-6 py-4 hover:bg-indigo-600"
                      onClick={handleClose}
                    >
                      Kalusto
                    </Link>
                    <Link
                      href="/kalusto/varauskalenteri"
                      className="w-full px-6 py-4 hover:bg-indigo-600"
                      onClick={handleClose}
                    >
                      Varauskalenteri
                    </Link>
                  </DisclosurePanel>
                </div>
              )}
            </Disclosure>

            {/* Koulutus (Training) */}
            <Link
              href="/koulutus"
              className="w-full px-6 py-4 hover:bg-indigo-600 text-center"
              onClick={handleClose} // Close menu on link click
            >
              Koulutus
            </Link>

            {/* Kenttä (Field) */}
            <Link
              href="/kentta"
              className="w-full px-6 py-4 hover:bg-indigo-600 text-center"
              onClick={handleClose} // Close menu on link click
            >
              Kenttä
            </Link>

            {/* Yhteystiedot (Contact) */}
            <Link
              href="/yhteystiedot"
              className="w-full px-6 py-4 hover:bg-indigo-600 text-center"
              onClick={handleClose} // Close menu on link click
            >
              Yhteystiedot
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavbarMobile;
