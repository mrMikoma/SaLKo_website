"use client";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import ArrowDownIcon from "@/components/icons/arrowDown";
import XCrossIcon from "@/components/icons/xCross";
import MenuIcon from "@/components/icons/menu";
import { useNavbar } from "@/providers/NavbarContextProvider";

const NavbarMobile = () => {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useNavbar();
  const pathName = usePathname();

  // Toggle menu visibility
  const handleToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close the menu
  const handleClose = () => {
    setIsMobileMenuOpen(false);
  };

  // Close menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathName, setIsMobileMenuOpen]);

  return (
    <div>
      {/* Mobile Menu Button (Hamburger) */}
      <button
        aria-label="Toggle Menu"
        onClick={handleToggle}
        className="px-2 pt-4 ml-auto rounded-md lg:hidden hover:text-sbluel focus:text-sbluel transition-colors duration-200"
      >
        <MenuIcon size={48} />
      </button>

      {/* Full-Screen Menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 w-screen h-screen bg-gradient-to-br from-sblued/75 via-sblued/65 to-sblue/70 backdrop-blur-lg z-[60] transform transition-all duration-300 animate-fade-in overflow-y-auto"
          onClick={handleClose}
        >
          {/* Decorative gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-sblue/5 to-sblued/20 pointer-events-none"></div>

          {/* Close Button - Fixed at top */}
          <button
            aria-label="Close Menu"
            onClick={handleClose}
            className="fixed top-6 right-6 text-swhite hover:text-sred hover:rotate-90 transition-all duration-300 z-[70] bg-sblued/40 backdrop-blur-md p-2 border border-swhite/20 hover:border-sred/70 shadow-lg"
          >
            <XCrossIcon size={40} />
          </button>

          <div
            className="relative flex flex-col items-stretch justify-start min-h-screen pt-24 pb-12 px-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Kerho (Club) */}
            <Disclosure>
              {({ open }) => (
                <div className="w-full mb-2">
                  <DisclosureButton className="w-full py-4 text-left text-swhite text-2xl font-bold hover:text-sbluel transition-all duration-300 hover:bg-sblue/30 backdrop-blur-sm border-b border-swhite/20">
                    <div className="flex flex-row items-center justify-between px-4">
                      <span>Kerho</span>
                      <span
                        className={`transition-transform duration-300 ${
                          open ? "rotate-180" : ""
                        }`}
                      >
                        <ArrowDownIcon size={28} />
                      </span>
                    </div>
                  </DisclosureButton>
                  <DisclosurePanel className="w-full bg-sblue/20 backdrop-blur-md mt-1 overflow-hidden border-l-2 border-sred/60 shadow-lg">
                    <span className="block w-full py-4 px-10 text-lg text-swhite/40 cursor-not-allowed border-l-2 border-transparent backdrop-blur-sm">
                      Kerho
                    </span>
                    <Link
                      href="/kerho/jasenyys"
                      className="block w-full py-4 px-10 text-lg text-swhite/95 hover:bg-sblue/40 hover:text-swhite hover:pl-12 transition-all duration-200 border-l-2 border-transparent hover:border-sred backdrop-blur-sm"
                      onClick={handleClose}
                    >
                      Jäsenyys
                    </Link>
                    <Link
                      href="/kerho/hinnasto"
                      className="block w-full py-4 px-10 text-lg text-swhite/95 hover:bg-sblue/40 hover:text-swhite hover:pl-12 transition-all duration-200 border-l-2 border-transparent hover:border-sred backdrop-blur-sm"
                      onClick={handleClose}
                    >
                      Hinnasto
                    </Link>
                    <span className="block w-full py-4 px-10 text-lg text-swhite/40 cursor-not-allowed border-l-2 border-transparent backdrop-blur-sm">
                      Kuvagalleria
                    </span>
                    <span className="block w-full py-4 px-10 text-lg text-swhite/40 cursor-not-allowed border-l-2 border-transparent backdrop-blur-sm">
                      Kotikenttä
                    </span>
                    <span className="block w-full py-4 px-10 text-lg text-swhite/40 cursor-not-allowed border-l-2 border-transparent backdrop-blur-sm">
                      Hallit
                    </span>
                    <span className="block w-full py-4 px-10 text-lg text-swhite/40 cursor-not-allowed border-l-2 border-transparent backdrop-blur-sm">
                      Historiaa
                    </span>
                  </DisclosurePanel>
                </div>
              )}
            </Disclosure>

            {/* Kalusto (Planes) */}
            <Disclosure>
              {({ open }) => (
                <div className="w-full mb-2">
                  <DisclosureButton className="w-full py-4 text-left text-swhite text-2xl font-bold hover:text-sbluel transition-all duration-300 hover:bg-sblue/30 backdrop-blur-sm border-b border-swhite/20">
                    <div className="flex flex-row items-center justify-between px-4">
                      <span>Kalusto</span>
                      <span
                        className={`transition-transform duration-300 ${
                          open ? "rotate-180" : ""
                        }`}
                      >
                        <ArrowDownIcon size={28} />
                      </span>
                    </div>
                  </DisclosureButton>
                  <DisclosurePanel className="w-full bg-sblue/20 backdrop-blur-md mt-1 overflow-hidden border-l-2 border-sred/60 shadow-lg">
                    <Link
                      href="/kalusto"
                      className="block w-full py-4 px-10 text-lg text-swhite/95 hover:bg-sblue/40 hover:text-swhite hover:pl-12 transition-all duration-200 border-l-2 border-transparent hover:border-sred backdrop-blur-sm"
                      onClick={handleClose}
                    >
                      Kalusto
                    </Link>
                    <Link
                      href="/kalusto/varauskalenteri"
                      className="block w-full py-4 px-10 text-lg text-swhite/95 hover:bg-sblue/40 hover:text-swhite hover:pl-12 transition-all duration-200 border-l-2 border-transparent hover:border-sred backdrop-blur-sm"
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
              className="w-full py-4 px-4 text-left text-swhite text-2xl font-bold hover:text-sbluel hover:bg-sblue/30 transition-all duration-300 border-b border-swhite/20 mb-2 backdrop-blur-sm"
              onClick={handleClose}
            >
              Koulutus
            </Link>

            {/* Esittelylennot (Demo Flights) */}
            <Link
              href="/esittelylennot"
              className="w-full py-4 px-4 text-left text-swhite text-2xl font-bold hover:text-sbluel hover:bg-sblue/30 transition-all duration-300 border-b border-swhite/20 mb-2 backdrop-blur-sm"
              onClick={handleClose}
            >
              Esittelylennot
            </Link>

            {/* Yhteystiedot (Contact) */}
            <Link
              href="/yhteystiedot"
              className="w-full py-4 px-4 text-left text-swhite text-2xl font-bold hover:text-sbluel hover:bg-sblue/30 transition-all duration-300 border-b border-swhite/20 mb-2 backdrop-blur-sm"
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
