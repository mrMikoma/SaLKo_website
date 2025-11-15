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
            <MenuIcon size={60}/>
          </DisclosureButton>
        )}
      </Disclosure>

      {/* Full-Screen Menu */}
      {isOpen && (
        <div
          className="fixed top-0 left-0 w-full h-full bg-gradient-to-b from-sblued via-sblack to-sblued z-50 transform transition-transform animate-fade-in"
          onClick={handleClose}
        >
          <div
            className="flex flex-col items-center justify-start h-full pt-20 space-y-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              aria-label="Close Menu"
              onClick={handleClose}
              className="absolute top-6 right-6 text-swhite hover:text-sred transition-colors duration-200"
            >
              <XCrossIcon size={40} />
            </button>

            {/* Logo */}
            <Link href="/" onClick={handleClose}>
              <span className="flex justify-center mx-auto mb-8">
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
                <div className="w-full px-6">
                  <DisclosureButton className="w-full py-4 text-center text-swhite text-lg font-medium hover:text-sbluel transition-colors duration-200 border-b border-sred/30">
                    <div className="flex flex-row items-center justify-center gap-2">
                      <span>Kerho</span>
                      <span
                        className={`transition-transform duration-200 ${
                          open ? "rotate-180" : ""
                        }`}
                      >
                        <ArrowDownIcon size={20} />
                      </span>
                    </div>
                  </DisclosureButton>
                  <DisclosurePanel className="w-full text-base text-center mt-2 mb-4 space-y-2">
                    <Link
                      href="/kerho"
                      className="block w-full py-3 px-4 rounded-lg text-swhite hover:bg-sblue/50 hover:text-sbluel transition-all duration-200"
                      onClick={handleClose}
                    >
                      Kerho
                    </Link>
                    <Link
                      href="/kerho/jasenyys"
                      className="block w-full py-3 px-4 rounded-lg text-swhite hover:bg-sblue/50 hover:text-sbluel transition-all duration-200"
                      onClick={handleClose}
                    >
                      Jäsenyys
                    </Link>
                    <Link
                      href="/kerho/historiaa"
                      className="block w-full py-3 px-4 rounded-lg text-swhite hover:bg-sblue/50 hover:text-sbluel transition-all duration-200"
                      onClick={handleClose}
                    >
                      Historiaa
                    </Link>
                    <Link
                      href="/kerho/hallit"
                      className="block w-full py-3 px-4 rounded-lg text-swhite hover:bg-sblue/50 hover:text-sbluel transition-all duration-200"
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
                <div className="w-full px-6">
                  <DisclosureButton className="w-full py-4 text-center text-swhite text-lg font-medium hover:text-sbluel transition-colors duration-200 border-b border-sred/30">
                    <div className="flex flex-row items-center justify-center gap-2">
                      <span>Kalusto</span>
                      <span
                        className={`transition-transform duration-200 ${
                          open ? "rotate-180" : ""
                        }`}
                      >
                        <ArrowDownIcon size={20} />
                      </span>
                    </div>
                  </DisclosureButton>
                  <DisclosurePanel className="w-full text-base text-center mt-2 mb-4 space-y-2">
                    <Link
                      href="/kalusto"
                      className="block w-full py-3 px-4 rounded-lg text-swhite hover:bg-sblue/50 hover:text-sbluel transition-all duration-200"
                      onClick={handleClose}
                    >
                      Kalusto
                    </Link>
                    <Link
                      href="/kalusto/varauskalenteri"
                      className="block w-full py-3 px-4 rounded-lg text-swhite hover:bg-sblue/50 hover:text-sbluel transition-all duration-200"
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
              className="w-full px-6 py-4 text-center text-swhite text-lg font-medium hover:text-sbluel transition-colors duration-200 border-b border-sred/30"
              onClick={handleClose}
            >
              Koulutus
            </Link>

            {/* Kenttä (Field) */}
            <Link
              href="/kentta"
              className="w-full px-6 py-4 text-center text-swhite text-lg font-medium hover:text-sbluel transition-colors duration-200 border-b border-sred/30"
              onClick={handleClose}
            >
              Kenttä
            </Link>

            {/* Yhteystiedot (Contact) */}
            <Link
              href="/yhteystiedot"
              className="w-full px-6 py-4 text-center text-swhite text-lg font-medium hover:text-sbluel transition-colors duration-200 border-b border-sred/30"
              onClick={handleClose}
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
