import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { sanitizeMarkdownLinkHref } from "@/lib/sanitizeMarkdownLink";
import { cn } from "@/lib/utils";

type StructuredReplyProps = {
  content: string;
  className?: string;
};

const markdownComponents: Components = {
  a: ({ href, children, ...props }) => {
    const safeHref = href ? sanitizeMarkdownLinkHref(href) : null;
    if (!safeHref) {
      return <span>{children}</span>;
    }

    return (
      <a
        {...props}
        href={safeHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        {children}
      </a>
    );
  },
  pre: ({ children, ...props }) => (
    <pre
      {...props}
      className="overflow-x-auto rounded-md bg-black/5 px-3 py-2 font-mono text-[13px] leading-5"
    >
      {children}
    </pre>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return (
        <code {...props} className={className}>
          {children}
        </code>
      );
    }

    return (
      <code
        {...props}
        className="rounded bg-black/5 px-1 py-0.5 font-mono text-[13px]"
      >
        {children}
      </code>
    );
  },
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto">
      <table {...props} className="w-full min-w-max border-collapse text-left">
        {children}
      </table>
    </div>
  ),
  th: ({ children, ...props }) => (
    <th {...props} className="border border-black/10 px-2 py-1 font-semibold">
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td {...props} className="border border-black/10 px-2 py-1">
      {children}
    </td>
  ),
};

export function StructuredReply({ content, className }: StructuredReplyProps) {
  return (
    <div
      className={cn(
        "structured-reply min-w-0 space-y-2 break-words",
        "[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
        "[&_h1]:text-xl [&_h1]:font-semibold",
        "[&_h2]:text-lg [&_h2]:font-semibold",
        "[&_h3]:text-base [&_h3]:font-semibold",
        "[&_ol]:list-decimal [&_ol]:pl-5",
        "[&_ul]:list-disc [&_ul]:pl-5",
        "[&_li]:my-0.5",
        "[&_p]:leading-5",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
