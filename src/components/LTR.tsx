import React from "react";

interface LTRProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * A true RTL-first utility component to isolate and correctly display
 * mixed English text, numbers, percentages, file formats, and AI models
 * without reversing text or breaking punctuation/parentheses.
 */
export default function LTR({ children, className = "" }: LTRProps) {
  if (!children) return null;
  return (
    <span
      dir="ltr"
      className={`inline-block [unicode-bidi:isolate] text-left ${className}`}
    >
      {children}
    </span>
  );
}
