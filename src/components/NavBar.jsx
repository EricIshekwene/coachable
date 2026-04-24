import { useState, useRef, useEffect } from 'react';
import logo from "../assets/logos/White_Full_Coachable.png";
import { Link } from "react-router-dom";
import { FiChevronDown } from "react-icons/fi";

const RESOURCES_ITEMS = [
    { label: "FAQs", to: "/faqs" },
    { label: "Contact Us", to: "/contact" },
    { label: "About Us", to: "/about" },
];

export default function NavBar() {
    const [resourcesOpen, setResourcesOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setResourcesOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    return (
        <>
            <nav className="flex items-center px-6 py-4 md:px-12 lg:px-20">
                {/* Left: Logo */}
                <div className="flex flex-1 items-center">
                    <img src={logo} alt="Coachable" className="h-10 md:h-12" />
                </div>

                {/* Center nav links */}
                <div className="hidden flex-1 items-center justify-center gap-8 md:flex">
                    <Link
                        to="/enterprise"
                        className="text-sm text-BrandGray transition hover:text-white"
                    >
                        Enterprise
                    </Link>
                    <Link
                        to="/product"
                        className="text-sm text-BrandGray transition hover:text-white"
                    >
                        Product
                    </Link>
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setResourcesOpen(!resourcesOpen)}
                            className="flex items-center gap-1 text-sm text-BrandGray transition hover:text-white"
                        >
                            Resources
                            <FiChevronDown className={`text-xs transition ${resourcesOpen ? "rotate-180" : ""}`} />
                        </button>
                        {resourcesOpen && (
                            <div className="absolute left-1/2 top-full z-30 mt-3 w-44 -translate-x-1/2 rounded-lg border border-BrandGray2/30 bg-BrandBlack2 shadow-xl">
                                <div className="py-1">
                                    {RESOURCES_ITEMS.map((item) => (
                                        <Link
                                            key={item.to}
                                            to={item.to}
                                            onClick={() => setResourcesOpen(false)}
                                            className="block px-4 py-2.5 text-sm text-BrandGray transition hover:bg-BrandOrange/10 hover:text-white"
                                        >
                                            {item.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right auth buttons */}
                <div className="flex flex-1 items-center justify-end gap-3">
                    <Link
                        to="/login"
                        className="rounded-lg px-4 py-2 text-sm text-BrandGray transition hover:text-white"
                    >
                        Log in
                    </Link>
                    <Link
                        to="/signup"
                        className="rounded-lg bg-BrandOrange px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.97]"
                    >
                        Get Started
                    </Link>
                </div>
            </nav>
        </>
    );
}