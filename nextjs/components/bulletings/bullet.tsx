"use client";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bulletin } from "@/utilities/bulletings";

interface BulletProps {
  item: Bulletin;
}

const mdComponents = {
  p: ({ children }: React.ComponentProps<"p">) => (
    <p className="mb-2 last:mb-0">{children}</p>
  ),
  strong: ({ children }: React.ComponentProps<"strong">) => (
    <strong className="font-bold text-swhite">{children}</strong>
  ),
  em: ({ children }: React.ComponentProps<"em">) => (
    <em className="italic text-swhite/80">{children}</em>
  ),
  ul: ({ children }: React.ComponentProps<"ul">) => (
    <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
  ),
  ol: ({ children }: React.ComponentProps<"ol">) => (
    <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
  ),
  li: ({ children }: React.ComponentProps<"li">) => (
    <li className="leading-relaxed">{children}</li>
  ),
  h2: ({ children }: React.ComponentProps<"h2">) => (
    <h2 className="text-base font-bold text-swhite mb-1 mt-3 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }: React.ComponentProps<"h3">) => (
    <h3 className="text-sm font-semibold text-swhite mb-1 mt-2">{children}</h3>
  ),
  hr: () => <hr className="border-sbluel/30 my-3" />,
  a: ({ href, children }: React.ComponentProps<"a">) => (
    <a
      href={href}
      className="text-sbluel underline hover:text-swhite transition-colors"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }: React.ComponentProps<"blockquote">) => (
    <blockquote className="border-l-2 border-sbluel/50 pl-3 italic text-swhite/70 my-2">
      {children}
    </blockquote>
  ),
};

const Bullet = ({ item }: BulletProps) => {
  const formattedDate = new Date(item.date * 1000).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <Disclosure>
      {({ open }) => (
        <div className="overflow-hidden rounded-lg border border-sred/35 shadow-lg">
          <DisclosureButton className="flex justify-between items-center w-full px-6 py-4 bg-sblued/10 backdrop-blur-sm text-swhite hover:bg-sblued/80 transition-all duration-200">
            <span className="font-semibold tracking-wide truncate text-left">
              {item.title}
            </span>
            <div className="flex items-center gap-4 ml-4 flex-shrink-0">
              <span
                className="text-sm text-swhite/80 whitespace-nowrap"
                suppressHydrationWarning={true}
              >
                {formattedDate}
              </span>
              <svg
                className={`w-5 h-5 transform transition-transform duration-200 ${
                  open ? "rotate-180" : "rotate-0"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </DisclosureButton>
          <DisclosurePanel className="px-6 py-4 bg-sblued/35 backdrop-blur-sm text-swhite/90 border-t border-sred/20">
            <div className="mb-3 pb-2 border-b border-sbluel/30">
              <span className="text-sm font-semibold text-sbluel">
                Kirjoittaja:{" "}
              </span>
              <span className="text-sm">{item.username || "Tuntematon"}</span>
            </div>
            <div className="text-base leading-relaxed">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={mdComponents}
              >
                {item.content}
              </ReactMarkdown>
            </div>
          </DisclosurePanel>
        </div>
      )}
    </Disclosure>
  );
};

export default Bullet;
