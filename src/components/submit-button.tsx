"use client";

import type {
  ButtonHTMLAttributes,
  ReactNode,
} from "react";

import {
  useFormStatus,
} from "react-dom";


type SubmitButtonProps =
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "type"
  > & {
    children:
      ReactNode;

    pendingLabel?:
      ReactNode;
  };


export default function SubmitButton({
  children,
  pendingLabel,
  disabled,
  ...buttonProps
}: SubmitButtonProps) {
  const {
    pending,
  } =
    useFormStatus();


  const isDisabled =
    Boolean(
      disabled
    ) ||
    pending;


  return (
    <button
      {...buttonProps}
      type="submit"
      disabled={
        isDisabled
      }
      aria-busy={
        pending
      }
    >
      {pending
        ? pendingLabel ??
          children
        : children}
    </button>
  );
}