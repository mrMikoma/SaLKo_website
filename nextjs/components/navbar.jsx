"use client";
import Link from "next/link";
import Image from "next/image";
import NavbarMobile from "@/components/navbarMobile";
import ArrowDownIcon from "@/components/icons/arrowDown";
import { Menu, MenuButton, MenuItems, MenuItem } from "@headlessui/react";

const Navbar = () => {
  const isLoggedIn = true;
  return (
    <div className="w-full bg-blue-950">
      <nav className="container relative flex flex-wrap items-center justify-between p-4 px-4">
        {/* Logo and Desktop Navigation */}
        <div className="flex flex-wrap items-center justify-between w-full lg:w-auto">
          <Link href="/">
            <span className="flex items-center space-x-4 text-2xl font-medium">
              <Image
                src="/images/SaLKon Logo_vaakunaversio.png"
                alt="SaLKo"
                width={120}
                height={40}
              />
            </span>
          </Link>

          {/* Mobile menu toggle button */}
          <NavbarMobile />
        </div>

        {/* Desktop Navigation Menu */}
        <div className="hidden text-center lg:flex items-center justify-center">
          <ul className="items-center justify-center flex-1 pt-6 pl-6 list-none lg:pt-0 lg:flex">
            {/* Kerho (Club) */}
            <li className="mr-3 nav__item border-white hover:border-b-2">
              <Menu as="div" className="ml-auto relative">
                {({ open }) => (
                  <div className="relative">
                    <MenuButton className="group inline-block px-4 py-2 text-2xl uppercase no-underline text-center">
                      <div className="flex flex-row items-center">
                        <span>Kerho</span>
                        {/* Arrow Icon */}
                        <span
                          className={`transition-transform ${
                            open ? "rotate-180" : ""
                          } mt-1`}
                        >
                          <ArrowDownIcon size={30} />
                        </span>
                      </div>
                    </MenuButton>

                    {/* Menu Items*/}
                    <MenuItems
                      className={`${
                        open ? "block" : "hidden"
                      } absolute w-48 bg-blue-800 shadow-lg z-50 uppercase text-left`}
                    >
                      <MenuItem>
                        <Link
                          href="/kerho"
                          className="block py-4 pl-2 hover:bg-indigo-600"
                        >
                          Kerho
                        </Link>
                      </MenuItem>
                      <MenuItem>
                        <Link
                          href="/kerho/jasenyys"
                          className="block py-4 pl-2 hover:bg-indigo-600"
                        >
                          Jäsenyys
                        </Link>
                      </MenuItem>
                      <MenuItem>
                        <Link
                          href="/kerho/historiaa"
                          className="block py-4 pl-2 hover:bg-indigo-600"
                        >
                          Historiaa
                        </Link>
                      </MenuItem>
                      <MenuItem>
                        <Link
                          href="/kerho/hallit"
                          className="block py-4 pl-2 hover:bg-indigo-600"
                        >
                          hallit
                        </Link>
                      </MenuItem>
                    </MenuItems>
                  </div>
                )}
              </Menu>
            </li>

            {/* Kalusto (Planes) with Dropdown Menu */}
            <li className="mr-3 nav__item border-white hover:border-b-2">
              <Menu as="div" className="ml-auto relative">
                {({ open }) => (
                  <div className="relative">
                    <MenuButton className="group inline-block px-4 py-2 text-2xl uppercase no-underline text-center">
                      <div className="flex flex-row items-center">
                        <span>Kalusto</span>
                        {/* Arrow Icon */}
                        <span
                          className={`transition-transform ${
                            open ? "rotate-180" : ""
                          } mt-1`}
                        >
                          <ArrowDownIcon size={30} />
                        </span>
                      </div>
                    </MenuButton>

                    {/* Menu Items*/}
                    <MenuItems
                      className={`${
                        open ? "block" : "hidden"
                      } absolute w-48 bg-blue-800 shadow-lg z-50 uppercase text-left`}
                    >
                      <MenuItem>
                        <Link
                          href="/kalusto"
                          className="block py-4 pl-2 hover:bg-indigo-600"
                        >
                          Kalusto
                        </Link>
                      </MenuItem>
                      <MenuItem>
                        <Link
                          href="/kalusto/varauskalenteri"
                          className="block py-4 pl-2 hover:bg-indigo-600"
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
            <li className="mr-3 nav__item border-white hover:border-b-2">
              <Link
                href="/koulutus"
                className="inline-block px-6 py-2 text-2xl uppercase no-underline rounded-md"
              >
                Koulutus
              </Link>
            </li>

            {/* Kenttä */}
            <li className="mr-3 nav__item border-white hover:border-b-2">
              <Link
                href="/kentta"
                className="inline-block px-6 py-2 text-2xl uppercase no-underline rounded-md"
              >
                Kenttä
              </Link>
            </li>

            {/* Yhteystiedot */}
            <li className="mr-3 nav__item border-white hover:border-b-2">
              <Link
                href="/yhteystiedot"
                className="inline-block px-6 py-2 text-2xl uppercase no-underline rounded-md"
              >
                Yhteystiedot
              </Link>
            </li>
          </ul>
        </div>

        {/* Conditionally render Member Area Dropdown if the user is logged in */}
        {isLoggedIn && (
          <Menu as="div" className="ml-auto relative">
            {({ open }) => (
              <div className="relative">
                {/* Menu Button for Member Area */}
                <MenuButton className="px-6 py-2 text-white text-xl bg-indigo-600 rounded-md shadow-xl hover:border-2 border-indigo-200">
                  Jäsenalue
                </MenuButton>

                {/* Menu Items with "Profiili" and "Kirjaudu ulos" */}
                <MenuItems
                  className={`${
                    open ? "block" : "hidden"
                  } absolute right-0 w-48 mt-2 bg-white shadow-lg z-50 rounded-md`}
                >
                  <MenuItem>
                    <Link
                      href="/profiili"
                      className="block px-4 py-2 text-black rounded-t-md hover:bg-indigo-200"
                    >
                      Profiili
                    </Link>
                  </MenuItem>
                  <MenuItem>
                    <Link
                      href="/logout"
                      className="block px-4 py-2 text-black rounded-b-md hover:bg-indigo-200"
                    >
                      Kirjaudu ulos
                    </Link>
                  </MenuItem>
                </MenuItems>
              </div>
            )}
          </Menu>
        )}

        {/* Non-logged-in Member Area Button */}
        {!isLoggedIn && (
          <div className="hidden mr-3 space-x-4 lg:flex nav__item">
            <Link
              href="/login"
              className="px-6 py-2 text-white text-xl bg-indigo-900 rounded-md md:ml-5"
            >
              Jäsenalue
            </Link>
          </div>
        )}
      </nav>
    </div>
  );
};

export default Navbar;
