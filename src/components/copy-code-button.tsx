"use client";

import { useState } from "react";

type CopyCodeButtonProps = {
  code: string;
};

export default function CopyCodeButton({
  code,
}: CopyCodeButtonProps) {
  const [copied, setCopied] = useState(false);

  // Copy group code
  async function copyCode() {
    await navigator.clipboard.writeText(code);

    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  return (
    <button
      type="button"
      onClick={copyCode}
      className="cursor-pointer rounded-xl border border-line bg-surface-soft px-3.5 py-2 text-sm font-medium text-ink transition hover:border-line-strong hover:bg-surface-hover"
    >
      {copied ? "Copied" : "Copy code"}
    </button>
  );
}