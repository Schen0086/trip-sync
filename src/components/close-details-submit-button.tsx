"use client";

import type {
  ButtonHTMLAttributes,
  MouseEvent,
  ReactNode,
} from "react";


type CloseDetailsSubmitButtonProps =
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "onClick"
  > & {
    children: ReactNode;
  };


export default function CloseDetailsSubmitButton({
  children,
  ...buttonProps
}: CloseDetailsSubmitButtonProps) {
  function handleClick(
    event:
      MouseEvent<HTMLButtonElement>
  ) {
    const form =
      event.currentTarget.form;


    // Keep the editor open if native form
    // validation fails.
    if (
      form &&
      !form.checkValidity()
    ) {
      return;
    }


    const details =
      event.currentTarget.closest(
        "details"
      );


    if (
      details instanceof
      HTMLDetailsElement
    ) {
      details.open =
        false;
    }
  }


  return (
    <button
      {...buttonProps}
      type="submit"
      onClick={
        handleClick
      }
    >
      {children}
    </button>
  );
}