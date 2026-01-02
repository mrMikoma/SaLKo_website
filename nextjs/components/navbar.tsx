"use client";
import Link from "next/link";
import Image from "next/image";
import NavbarMobile from "@/components/navbarMobile";
import ArrowDownIcon from "@/components/icons/arrowDown";
import Login from "@/components/auth/login";
import {
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
  Popover,
  PopoverButton,
  PopoverPanel,
} from "@headlessui/react";
import XCrossIcon from "./icons/xCross";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Logout from "./auth/logout";
import type { Session } from "next-auth";
import { useNavbar } from "@/providers/NavbarContextProvider";

const Navbar = ({ session }: { session: Session | null }) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const router = useRouter();
  const { isFullscreenMode } = useNavbar();

  useEffect(() => {
    if (session?.user) {
      setAuthenticated(true);
      setUserName(session.user.name || "");
      setIsAdmin(session.user.role === "admin");
    } else {
      setAuthenticated(false);
      setUserName("");
      setIsAdmin(false);
    }
  }, [session]);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 10) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Scrolling down
        setIsVisible(false);
      } else {
        // Scrolling up
        setIsVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const handleLogout = async () => {
    router.refresh();
    setAuthenticated(false);
    setUserName("");
  };

  return (
    <div
      className={`w-full fixed top-0 z-50 bg-sblued/80  border-b border-sred/30 transition-all duration-300 ${
        isVisible && !isFullscreenMode ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <nav className="container relative flex flex-wrap items-center justify-between p-4 px-6 mx-auto">
        {/* Logo and Mobile Menu Toggle */}
        <div className="flex flex-wrap items-center justify-between w-full lg:w-auto">
          <Link href="/">
            <span className="flex items-center space-x-4 text-2xl font-medium">
              <Image
                src="/images/SaLKon Logo_vaakunaversio.png"
                alt="SaLKo"
                width={120}
                height={40}
                className="w-20 h-auto md:w-26"
              />
            </span>
          </Link>{" "}
          {/* Mobile menu toggle button */}
          <NavbarMobile />
        </div>

        {/* Desktop Navigation Menu */}
        <div className="hidden text-center lg:flex items-center justify-center">
          <ul className="items-center justify-center flex-1 pt-6 pl-6 list-none lg:pt-0 lg:flex">
            {/* Kerho (Club) */}
            <li className="mr-3 nav__item group">
              <Menu as="div" className="ml-auto relative">
                {({ open }) => (
                  <div className="relative">
                    <MenuButton className="group inline-block px-4 py-2 text-2xl font-medium no-underline text-center hover:text-sbluel transition-colors duration-200 relative">
                      <div className="flex flex-row items-center">
                        <span>Kerho</span>
                        {/* Arrow Icon */}
                        <span
                          className={`transition-transform duration-200 ${
                            open ? "rotate-180" : ""
                          } ml-1`}
                        >
                          <ArrowDownIcon size={20} />
                        </span>
                      </div>
                      {/* Hover underline effect */}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-sred transition-all duration-300 group-hover:w-full"></span>
                    </MenuButton>

                    {/* Menu Items*/}
                    <MenuItems
                      className={`${
                        open ? "block" : "hidden"
                      } absolute w-56 mt-2 bg-sblued/95 backdrop-blur-lg shadow-xl z-50 text-left rounded-lg border border-sred/20 overflow-hidden animate-slide-in`}
                    >
                      <MenuItem>
                        <span className="block py-3 px-4 text-swhite/40 cursor-not-allowed">
                          Kerho
                        </span>
                      </MenuItem>
                      <MenuItem>
                        <Link
                          href="/kerho/jasenyys"
                          className="block py-3 px-4 text-swhite hover:bg-sblue/50 hover:text-sbluel transition-all duration-200"
                        >
                          Jäsenyys
                        </Link>
                      </MenuItem>
                      <MenuItem>
                        <Link
                          href="/kerho/hinnasto"
                          className="block py-3 px-4 text-swhite hover:bg-sblue/50 hover:text-sbluel transition-all duration-200"
                        >
                          Hinnasto
                        </Link>
                      </MenuItem>
                      <MenuItem>
                        <span className="block py-3 px-4 text-swhite/40 cursor-not-allowed">
                          Kuvagalleria
                        </span>
                      </MenuItem>
                      <MenuItem>
                        <span className="block py-3 px-4 text-swhite/40 cursor-not-allowed">
                          Kotikenttä
                        </span>
                      </MenuItem>
                      <MenuItem>
                        <span className="block py-3 px-4 text-swhite/40 cursor-not-allowed">
                          Hallit
                        </span>
                      </MenuItem>
                      <MenuItem>
                        <span className="block py-3 px-4 text-swhite/40 cursor-not-allowed">
                          Historiaa
                        </span>
                      </MenuItem>
                    </MenuItems>
                  </div>
                )}
              </Menu>
            </li>

            {/* Kalusto (Planes) with Dropdown Menu */}
            <li className="mr-3 nav__item group">
              <Menu as="div" className="ml-auto relative">
                {({ open }) => (
                  <div className="relative">
                    <MenuButton className="group inline-block px-4 py-2 text-2xl font-medium no-underline text-center hover:text-sbluel transition-colors duration-200 relative">
                      <div className="flex flex-row items-center">
                        <span>Kalusto</span>
                        {/* Arrow Icon */}
                        <span
                          className={`transition-transform duration-200 ${
                            open ? "rotate-180" : ""
                          } ml-1`}
                        >
                          <ArrowDownIcon size={20} />
                        </span>
                      </div>
                      {/* Hover underline effect */}
                      <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-sred transition-all duration-300 group-hover:w-full"></span>
                    </MenuButton>

                    {/* Menu Items*/}
                    <MenuItems
                      className={`${
                        open ? "block" : "hidden"
                      } absolute w-56 mt-2 bg-sblued/95 backdrop-blur-lg shadow-xl z-50 text-left rounded-lg border border-sred/20 overflow-hidden animate-slide-in`}
                    >
                      <MenuItem>
                        <Link
                          href="/kalusto"
                          className="block py-3 px-4 text-swhite hover:bg-sblue/50 hover:text-sbluel transition-all duration-200"
                        >
                          Kalusto
                        </Link>
                      </MenuItem>
                      <MenuItem>
                        <Link
                          href="/kalusto/varauskalenteri"
                          className="block py-3 px-4 text-swhite hover:bg-sblue/50 hover:text-sbluel transition-all duration-200"
                        >
                          Varauskalenteri
                        </Link>
                      </MenuItem>
                    </MenuItems>
                  </div>
                )}
              </Menu>
            </li>

            {/* Koulutus */}
            <li className="mr-3 nav__item group">
              <Link
                href="/koulutus"
                className="inline-block px-4 py-2 text-2xl font-medium no-underline hover:text-sbluel transition-colors duration-200 relative"
              >
                Koulutus
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-sred transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </li>

            {/* Kenttä */}
            <li className="mr-3 nav__item group">
              <Link
                href="/esittelylennot"
                className="inline-block px-4 py-2 text-2xl font-medium no-underline hover:text-sbluel transition-colors duration-200 relative"
              >
                Esittelylennot
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-sred transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </li>

            {/* Yhteystiedot */}
            <li className="mr-3 nav__item group">
              <Link
                href="/yhteystiedot"
                className="inline-block px-4 py-2 text-2xl font-medium no-underline hover:text-sbluel transition-colors duration-200 relative"
              >
                Yhteystiedot
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-sred transition-all duration-300 group-hover:w-full"></span>
              </Link>
            </li>
          </ul>
        </div>

        {/* Conditionally render Member Area Dropdown if the user is logged in */}
        {authenticated && (
          <Menu as="div" className="relative ml-auto">
            {({ open }) => (
              <div className="relative">
                {/* Menu Button for Member Area */}
                <MenuButton className="px-3 py-1 md:px-6 md:py-2 text-swhite text-base md:text-xl font-bold bg-sblue rounded-lg shadow-xl hover:bg-sblue/90 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 border-2 border-sbluel/30 hover:border-sbluel">
                  Jäsenalue
                </MenuButton>

                {/* Menu Items with "Profiili" and "Kirjaudu ulos" */}
                <MenuItems
                  className={`${
                    open ? "block" : "hidden"
                  } absolute right-0 w-56 mt-3 glass shadow-2xl z-50 rounded-xl border-2 border-sred/30 overflow-hidden animate-slide-in`}
                >
                  <MenuItem>
                    <Link
                      href="/jasenalue/profiili"
                      className="block px-4 py-3 text-swhite font-semibold hover:bg-sblue/50 hover:text-sbluel transition-all duration-200"
                    >
                      Omat tiedot
                    </Link>
                  </MenuItem>
                  {isAdmin && (
                    <MenuItem>
                      <Link
                        href="/admin"
                        className="block px-4 py-3 text-swhite font-semibold hover:bg-sblue/50 hover:text-sbluel transition-all duration-200"
                      >
                        Admin sivut
                      </Link>
                    </MenuItem>
                  )}
                  <MenuItem>
                    <div className="block px-4 py-3 text-swhite font-semibold hover:bg-sblue/50 hover:text-sbluel transition-all duration-200">
                      <Logout onHandleLogout={handleLogout} />
                    </div>
                  </MenuItem>
                </MenuItems>
              </div>
            )}
          </Menu>
        )}

        {/* Non-logged-in Member Area Button */}
        {!authenticated && (
          <Popover className="relative ml-auto">
            <PopoverButton className="px-3 py-1 md:px-6 md:py-2 text-swhite text-sm md:text-xl font-bold bg-sblue rounded-lg shadow-xl hover:bg-sblue/90 hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 border-2 border-transparent hover:border-sred/50">
              Jäsenalue
            </PopoverButton>
            <PopoverPanel className="absolute right-0 top-full w-80 md:w-[450px] glass rounded-2xl shadow-2xl z-[60] mt-2 border-2 border-sred/30 transition-all duration-200 ease-out origin-top-right data-[closed]:scale-95 data-[closed]:opacity-0">
              {({ close }) => (
                <div className="relative p-6">
                  <button
                    onClick={() => close()}
                    className="absolute top-3 right-3 text-swhite hover:text-sred focus:outline-none transition-colors duration-200 z-10"
                    aria-label="Close"
                  >
                    <XCrossIcon size={36} />
                  </button>
                  <Login />
                </div>
              )}
            </PopoverPanel>
          </Popover>
        )}

        {/* Show User Name or Login if not authenticated */}
        <div className="absolute top-4 right-4">
          <span className="text-swhite text-md font-semibold whitespace-nowrap">
            {userName ? userName : "Et ole kirjautunut sisään"}
          </span>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
