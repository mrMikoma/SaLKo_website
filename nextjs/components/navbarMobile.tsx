"use client";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ArrowDownIcon from "@/components/icons/arrowDown";
import XCrossIcon from "@/components/icons/xCross";
import MenuIcon from "@/components/icons/menu";
import { useNavbar } from "@/providers/NavbarContextProvider";
import Login from "@/components/auth/login";
import Logout from "@/components/auth/logout";
import { useSession } from "next-auth/react";

const NavbarMobile = () => {
  const { isMobileMenuOpen, setIsMobileMenuOpen } = useNavbar();
  const pathName = usePathname();
  const { data: session } = useSession();
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setAuthenticated(true);
      setIsAdmin(session.user.role === "admin");
    } else {
      setAuthenticated(false);
      setIsAdmin(false);
    }
  }, [session]);

  // Toggle menu visibility
  const handleToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close the menu
  const handleClose = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    router.refresh();
    setAuthenticated(false);
    handleClose();
  };

  // Close menu on navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathName, setIsMobileMenuOpen]);

  // Disable body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

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
            className="fixed top-4 right-4 text-swhite hover:text-sred hover:rotate-90 transition-all duration-300 z-[70] bg-sblued/40 backdrop-blur-md p-2 border border-swhite/20 hover:border-sred/70 shadow-lg"
          >
            <XCrossIcon size={32} />
          </button>

          <div
            className="relative flex flex-col items-stretch justify-start min-h-screen pt-16 pb-6 px-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Kerho (Club) */}
            <Disclosure>
              {({ open }) => (
                <div className="w-full my-2">
                  <DisclosureButton className="w-full py-3 text-left text-swhite text-xl font-bold hover:text-sbluel transition-all duration-300 hover:bg-sblue/30 backdrop-blur-sm border-b border-swhite/20">
                    <div className="flex flex-row items-center justify-between px-3">
                      <span>Kerho</span>
                      <span
                        className={`transition-transform duration-300 ${
                          open ? "rotate-180" : ""
                        }`}
                      >
                        <ArrowDownIcon size={24} />
                      </span>
                    </div>
                  </DisclosureButton>
                  <DisclosurePanel className="w-full bg-sblue/20 backdrop-blur-md mt-1 overflow-hidden border-l-2 border-sred/60 shadow-lg">
                    <span className="block w-full py-2.5 px-8 text-base text-swhite/40 cursor-not-allowed border-l-2 border-transparent backdrop-blur-sm">
                      Kerho
                    </span>
                    <Link
                      href="/kerho/jasenyys"
                      className="block w-full py-2.5 px-8 text-base text-swhite/95 hover:bg-sblue/40 hover:text-swhite hover:pl-10 transition-all duration-200 border-l-2 border-transparent hover:border-sred backdrop-blur-sm"
                      onClick={handleClose}
                    >
                      Jäsenyys
                    </Link>
                    <Link
                      href="/kerho/hinnasto"
                      className="block w-full py-2.5 px-8 text-base text-swhite/95 hover:bg-sblue/40 hover:text-swhite hover:pl-10 transition-all duration-200 border-l-2 border-transparent hover:border-sred backdrop-blur-sm"
                      onClick={handleClose}
                    >
                      Hinnasto
                    </Link>
                    <span className="block w-full py-2.5 px-8 text-base text-swhite/40 cursor-not-allowed border-l-2 border-transparent backdrop-blur-sm">
                      Kuvagalleria
                    </span>
                    <Link
                      href="/kerho/kentta"
                      className="block w-full py-2.5 px-8 text-base text-swhite/95 hover:bg-sblue/40 hover:text-swhite hover:pl-10 transition-all duration-200 border-l-2 border-transparent hover:border-sred backdrop-blur-sm"
                      onClick={handleClose}
                    >
                      {" "}
                      Kotikenttä
                    </Link>
                    <span className="block w-full py-2.5 px-8 text-base text-swhite/40 cursor-not-allowed border-l-2 border-transparent backdrop-blur-sm">
                      Hallit
                    </span>
                    <span className="block w-full py-2.5 px-8 text-base text-swhite/40 cursor-not-allowed border-l-2 border-transparent backdrop-blur-sm">
                      Historiaa
                    </span>
                  </DisclosurePanel>
                </div>
              )}
            </Disclosure>

            {/* Kalusto (Planes) */}
            <Disclosure>
              {({ open }) => (
                <div className="w-full mb-1">
                  <DisclosureButton className="w-full py-3 text-left text-swhite text-xl font-bold hover:text-sbluel transition-all duration-300 hover:bg-sblue/30 backdrop-blur-sm border-b border-swhite/20">
                    <div className="flex flex-row items-center justify-between px-3">
                      <span>Kalusto</span>
                      <span
                        className={`transition-transform duration-300 ${
                          open ? "rotate-180" : ""
                        }`}
                      >
                        <ArrowDownIcon size={24} />
                      </span>
                    </div>
                  </DisclosureButton>
                  <DisclosurePanel className="w-full bg-sblue/20 backdrop-blur-md mt-1 overflow-hidden border-l-2 border-sred/60 shadow-lg">
                    <Link
                      href="/kalusto"
                      className="block w-full py-2.5 px-8 text-base text-swhite/95 hover:bg-sblue/40 hover:text-swhite hover:pl-10 transition-all duration-200 border-l-2 border-transparent hover:border-sred backdrop-blur-sm"
                      onClick={handleClose}
                    >
                      Kalusto
                    </Link>
                    <Link
                      href="/kalusto/varauskalenteri"
                      className="block w-full py-2.5 px-8 text-base text-swhite/95 hover:bg-sblue/40 hover:text-swhite hover:pl-10 transition-all duration-200 border-l-2 border-transparent hover:border-sred backdrop-blur-sm"
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
              className="w-full py-3 px-3 text-left text-swhite text-xl font-bold hover:text-sbluel hover:bg-sblue/30 transition-all duration-300 border-b border-swhite/20 mb-1 backdrop-blur-sm"
              onClick={handleClose}
            >
              Koulutus
            </Link>

            {/* Esittelylennot (Demo Flights) */}
            <Link
              href="/esittelylennot"
              className="w-full py-3 px-3 text-left text-swhite text-xl font-bold hover:text-sbluel hover:bg-sblue/30 transition-all duration-300 border-b border-swhite/20 mb-1 backdrop-blur-sm"
              onClick={handleClose}
            >
              Esittelylennot
            </Link>

            {/* Yhteystiedot (Contact) */}
            <Link
              href="/yhteystiedot"
              className="w-full py-3 px-3 text-left text-swhite text-xl font-bold hover:text-sbluel hover:bg-sblue/30 transition-all duration-300 border-b border-swhite/20 mb-1 backdrop-blur-sm"
              onClick={handleClose}
            >
              Yhteystiedot
            </Link>

            {/* Jäsenalue (Member Area) - Conditional based on authentication */}
            {authenticated ? (
              <Disclosure>
                {({ open }) => (
                  <div className="w-full mb-1">
                    <DisclosureButton className="w-full py-3 text-left text-swhite text-xl font-bold hover:text-sbluel transition-all duration-300 hover:bg-sblue/30 backdrop-blur-sm border-b border-sred/80">
                      <div className="flex flex-row items-center justify-between px-3">
                        <span>Jäsenalue</span>
                        <span
                          className={`transition-transform duration-300 ${
                            open ? "rotate-180" : ""
                          }`}
                        >
                          <ArrowDownIcon size={24} />
                        </span>
                      </div>
                    </DisclosureButton>
                    <DisclosurePanel className="w-full bg-sblue/20 backdrop-blur-md mt-1 overflow-hidden border-l-2 border-sred/60 shadow-lg">
                      <Link
                        href="/jasenalue/profiili"
                        className="block w-full py-2.5 px-8 text-base text-swhite/95 hover:bg-sblue/40 hover:text-swhite hover:pl-10 transition-all duration-200 border-l-2 border-transparent hover:border-sred backdrop-blur-sm"
                        onClick={handleClose}
                      >
                        Omat tiedot
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="block w-full py-2.5 px-8 text-base text-purple-300 hover:bg-sblue/40 hover:text-purple-200 hover:pl-10 transition-all duration-200 border-l-2 border-transparent hover:border-purple-400 backdrop-blur-sm"
                          onClick={handleClose}
                        >
                          Admin sivut
                        </Link>
                      )}
                      <div className="block w-full py-2.5 px-8 text-base text-sred/95 hover:bg-sblue/40 hover:text-sred hover:pl-10 transition-all duration-200 border-l-2 border-transparent hover:border-sred backdrop-blur-sm">
                        <Logout onHandleLogout={handleLogout} />
                      </div>
                    </DisclosurePanel>
                  </div>
                )}
              </Disclosure>
            ) : (
              <Popover className="relative">
                {({ close: closePopover }) => (
                  <>
                    <PopoverButton className="w-full py-3 px-3 text-left text-swhite text-xl font-bold hover:text-sbluel hover:bg-sblue/30 transition-all duration-300 border-b border-sred/80 mb-1 backdrop-blur-sm">
                      Jäsenalue
                    </PopoverButton>
                    <PopoverPanel className="absolute left-0 right-0 top-full mt-1 glass rounded-xl shadow-2xl border-2 border-sred/30 transition-all duration-200 ease-out origin-top data-[closed]:scale-95 data-[closed]:opacity-0 z-[70]">
                      <div className="relative p-4">
                        <button
                          onClick={() => closePopover()}
                          className="absolute top-2 right-2 text-swhite hover:text-sred focus:outline-none transition-colors duration-200 z-10"
                          aria-label="Close"
                        >
                          <XCrossIcon size={28} />
                        </button>
                        <Login />
                      </div>
                    </PopoverPanel>
                  </>
                )}
              </Popover>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NavbarMobile;
