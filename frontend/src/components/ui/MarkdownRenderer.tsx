"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Check, Copy, Table as TableIcon } from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content text-zinc-200 text-sm md:text-base leading-relaxed space-y-4 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          // Headers
          h1: ({ children, ...props }) => (
            <h1
              {...props}
              className="text-xl md:text-2xl font-bold text-white tracking-tight mt-6 mb-3 pb-2 border-b border-white/[0.1] flex items-center gap-2"
            >
              <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-purple-500 inline-block" />
              <span>{children}</span>
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              {...props}
              className="text-lg md:text-xl font-bold text-zinc-100 tracking-tight mt-5 mb-2.5 flex items-center gap-2"
            >
              <span className="w-1 h-4 rounded-full bg-cyan-400 inline-block" />
              <span>{children}</span>
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              {...props}
              className="text-base md:text-lg font-semibold text-zinc-200 mt-4 mb-2 flex items-center gap-1.5"
            >
              <span className="w-1 h-3 rounded-full bg-purple-400 inline-block" />
              <span>{children}</span>
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4 {...props} className="text-sm md:text-base font-semibold text-zinc-300 mt-3 mb-1.5">
              {children}
            </h4>
          ),

          // Paragraphs
          p: ({ children, ...props }) => (
            <p {...props} className="leading-relaxed text-zinc-300 font-sans text-sm md:text-base my-2">
              {children}
            </p>
          ),

          // Strong & Emphasis
          strong: ({ children, ...props }) => (
            <strong {...props} className="font-bold text-white tracking-tight">
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em {...props} className="italic text-zinc-300">
              {children}
            </em>
          ),

          // Lists
          ul: ({ children, ...props }) => (
            <ul {...props} className="my-3 space-y-2 list-none pl-1">
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className="my-3 space-y-2 list-decimal list-inside pl-1 text-zinc-300">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li {...props} className="text-sm md:text-base text-zinc-300 leading-relaxed flex items-start gap-2">
              <span className="text-cyan-400 font-mono font-bold shrink-0 mt-1 text-xs">•</span>
              <div className="flex-1 space-y-1">{children}</div>
            </li>
          ),

          // Tables (Rich Styled & Horizontal Scrollable)
          table: ({ children, ...props }) => (
            <div className="my-5 w-full overflow-hidden rounded-xl border border-white/[0.1] bg-[#0E0F13] shadow-xl">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#14151B] border-b border-white/[0.08] text-xs font-mono text-zinc-400">
                <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                  <TableIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Structured Comparative Matrix</span>
                </div>
                <span className="text-[11px] text-zinc-400">Scrollable Table</span>
              </div>
              <div className="overflow-x-auto no-scrollbar">
                <table {...props} className="w-full text-left text-xs md:text-sm border-collapse">
                  {children}
                </table>
              </div>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead {...props} className="bg-[#181920] border-b border-white/[0.12] text-zinc-200">
              {children}
            </thead>
          ),
          tbody: ({ children, ...props }) => (
            <tbody {...props} className="divide-y divide-white/[0.05]">
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr
              {...props}
              className="even:bg-white/[0.015] hover:bg-cyan-500/[0.04] transition-colors duration-150"
            >
              {children}
            </tr>
          ),
          th: ({ children, ...props }) => (
            <th
              {...props}
              className="px-4 py-3.5 font-mono text-xs uppercase tracking-wider text-cyan-300 font-bold whitespace-nowrap bg-[#16171E]"
            >
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td {...props} className="px-4 py-3 text-zinc-300 align-top leading-relaxed">
              {children}
            </td>
          ),

          // Blockquotes
          blockquote: ({ children, ...props }) => (
            <blockquote
              {...props}
              className="my-3 pl-4 py-2 border-l-2 border-cyan-400/70 bg-cyan-500/[0.05] rounded-r-lg italic text-zinc-300 text-sm font-serif"
            >
              {children}
            </blockquote>
          ),

          // Code blocks & Inline Code
          code: ({ className: codeClassName, children, ...props }) => {
            const match = /language-(\w+)/.exec(codeClassName || "");
            const isInline = !match && !String(children).includes("\n");

            if (isInline) {
              return (
                <code
                  {...props}
                  className="px-1.5 py-0.5 rounded bg-white/[0.08] text-cyan-300 font-mono text-xs border border-white/[0.08]"
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock language={match ? match[1] : "text"} code={String(children).replace(/\n$/, "")} />;
          },

          // Horizontal rule
          hr: () => <hr className="my-6 border-t border-white/[0.1]" />,

          // Links
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              {...props}
              className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2 transition-colors cursor-pointer"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-white/[0.08] bg-[#0A0B0E] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-[#121318] border-b border-white/[0.06] text-xs font-mono text-zinc-400">
        <span className="uppercase text-cyan-400 font-bold">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span className={copied ? "text-emerald-400" : ""}>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs font-mono text-zinc-200 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}
