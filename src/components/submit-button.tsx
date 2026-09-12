"use client";

import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import {
  useFormStatus,
} from "react-dom";


type SubmitButtonProps =
  ButtonHTMLAttributes<HTMLButtonElement> & {
    pendingLabel?: ReactNode;
  };


export default function SubmitButton({
  children,
  pendingLabel = "Please wait...",
  disabled,
  className = "",
  type = "submit",
  ...props
}: SubmitButtonProps) {
  const {
    pending,
  } = useFormStatus();

  const isDisabled =
    pending ||
    disabled;


  return (
    <button
      {...props}
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={pending}
      className={[
        className,
        "disabled:cursor-not-allowed disabled:opacity-60",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {
        pending
          ? pendingLabel
          : children
      }
    </button>
  );
}