"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, BarChart3 } from "lucide-react";

const links = [
  { href: "/analysis", label: "Analysis" },
  { href: "/methodology", label: "Methodology" },
  { href: "/paper", label: "Paper" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const ghUrl =
    process.env.NEXT_PUBLIC_GITHUB_URL ??
    "https://github.com/amsorrytola/scm-policy-india-";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-lg font-bold text-navy"
        >
          <BarChart3 className="h-5 w-5 text-amber" />
          <span>Bihar SCM</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-gray-700 transition-colors hover:text-navy"
            >
              {l.label}
            </Link>
          ))}
          <a
            href={ghUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-700 transition-colors hover:text-navy"
          >
            GitHub ↗
          </a>
        </nav>

        <button
          className="md:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-200 bg-cream md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-4">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-gray-700 hover:text-navy"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <a
              href={ghUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-700 hover:text-navy"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
