import {
  redirect,
} from "next/navigation";

import type {
  ReactNode,
} from "react";

import TripNavigation from "@/components/trip-navigation";

import {
  createClient,
} from "@/lib/supabase/server";


type TripLayoutProps = {
  children:
    ReactNode;

  params: Promise<{
    id: string;
  }>;
};


export default async function TripLayout({
  children,
  params,
}: TripLayoutProps) {
  const {
    id,
  } =
    await params;


  const supabase =
    await createClient();


  const {
    data,
    error,
  } =
    await supabase.auth
      .getClaims();


  if (
    error ||
    !data?.claims
  ) {
    redirect(
      "/login"
    );
  }


  // RLS ensures only users who currently
  // have access can load this trip.
  const {
    data:
      trip,

    error:
      tripError,
  } =
    await supabase
      .from(
        "trips"
      )
      .select(`
        id,
        name,
        trip_type
      `)
      .eq(
        "id",
        id
      )
      .maybeSingle();


  if (
    tripError
  ) {
    console.error(
      "Failed to load trip navigation:",
      tripError
    );
  }


  if (!trip) {
    redirect(
      `/dashboard?error=${encodeURIComponent(
        "This trip is unavailable or you no longer have access."
      )}`
    );
  }


  return (
    <>
      <div className="sticky top-[72px] z-30 border-b border-line bg-canvas/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <TripNavigation
            tripId={
              trip.id
            }
            tripName={
              trip.name
            }
            tripType={
              trip.trip_type
            }
          />
        </div>
      </div>

      {
        children
      }
    </>
  );
}