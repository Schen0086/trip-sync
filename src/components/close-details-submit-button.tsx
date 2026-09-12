"use client";

import type {
  ButtonHTMLAttributes,
  MouseEvent,
  ReactNode,
} from "react";

import {
  useFormStatus,
} from "react-dom";


type CloseDetailsSubmitButtonProps =
  Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "type" | "onClick"
  > & {
    children:
      ReactNode;

    pendingLabel?:
      ReactNode;
  };


export default function CloseDetailsSubmitButton({
  children,
  pendingLabel,
  disabled,
  ...buttonProps
}: CloseDetailsSubmitButtonProps) {
  const {
    pending,
  } =
    useFormStatus();


  const isDisabled =
    Boolean(
      disabled
    ) ||
    pending;


  function handleClick(
    event:
      MouseEvent<HTMLButtonElement>
  ) {
    if (
      pending
    ) {
      event.preventDefault();

      return;
    }


    const form =
      event.currentTarget.form;


    // Leave the editor open when normal
    // browser validation has not passed.
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
      disabled={
        isDisabled
      }
      aria-busy={
        pending
      }
      onClick={
        handleClick
      }
    >
      {pending
        ? pendingLabel ??
          children
        : children}
    </button>
  );
}