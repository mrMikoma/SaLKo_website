import type { Components } from "react-markdown";

/**
 * How bulletin Markdown looks on the site's dark background. The admin
 * preview uses the same components, so it shows exactly what members see.
 */
export const bulletinMarkdown: Components = {
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
