"use client";

import {
  useEffect,
  useState,
} from "react";

type LocationResult = {
  id: string;
  name: string;
  formatted: string;
  latitude: number | null;
  longitude: number | null;
};

type LocationSearchInputProps = {
  label: string;

  inputName: string;
  addressName: string;
  latitudeName: string;
  longitudeName: string;

  defaultValue?: string | null;
  defaultAddress?: string | null;
  defaultLatitude?: number | null;
  defaultLongitude?: number | null;

  placeholder?: string;
  required?: boolean;
};

export default function LocationSearchInput({
  label,
  inputName,
  addressName,
  latitudeName,
  longitudeName,
  defaultValue = "",
  defaultAddress = "",
  defaultLatitude = null,
  defaultLongitude = null,
  placeholder = "Search for a place",
  required = false,
}: LocationSearchInputProps) {
  const [query, setQuery] =
    useState(defaultValue ?? "");

  const [address, setAddress] =
    useState(defaultAddress ?? "");

  const [latitude, setLatitude] =
    useState<number | null>(
      defaultLatitude
    );

  const [longitude, setLongitude] =
    useState<number | null>(
      defaultLongitude
    );

  const [results, setResults] =
    useState<LocationResult[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [open, setOpen] =
    useState(false);

  // Search locations after typing
  useEffect(() => {
    if (query.trim().length < 3) {
      setResults([]);
      return;
    }

    const controller =
      new AbortController();

    const timeout =
      window.setTimeout(
        async () => {
          try {
            setLoading(true);

            const response = await fetch(
              `/api/location-search?q=${encodeURIComponent(
                query
              )}`,
              {
                signal:
                  controller.signal,
              }
            );

            if (!response.ok) {
              setResults([]);
              return;
            }

            const data =
              (await response.json()) as {
                results?: LocationResult[];
              };

            setResults(
              data.results ?? []
            );

            setOpen(true);
          } catch (error) {
            if (
              error instanceof DOMException &&
              error.name ===
                "AbortError"
            ) {
              return;
            }

            setResults([]);
          } finally {
            setLoading(false);
          }
        },
        350
      );

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  // Select API result
  function selectLocation(
    result: LocationResult
  ) {
    setQuery(result.name);
    setAddress(result.formatted);
    setLatitude(result.latitude);
    setLongitude(result.longitude);

    setResults([]);
    setOpen(false);
  }

  // Clear selected metadata when manually editing
  function handleChange(
    value: string
  ) {
    setQuery(value);
    setAddress("");
    setLatitude(null);
    setLongitude(null);
  }

  return (
    <div className="relative">
      <label
        htmlFor={inputName}
        className="mb-1.5 block text-sm font-medium text-ink"
      >
        {label}
      </label>

      <input
        id={inputName}
        name={inputName}
        type="text"
        value={query}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) =>
          handleChange(
            event.target.value
          )
        }
        onFocus={() =>
          results.length > 0 &&
          setOpen(true)
        }
        className="w-full rounded-xl border border-line bg-surface-soft px-3.5 py-2.5 text-ink outline-none transition placeholder:text-subtle focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
      />

      <input
        type="hidden"
        name={addressName}
        value={address}
      />

      <input
        type="hidden"
        name={latitudeName}
        value={
          latitude !== null
            ? String(latitude)
            : ""
        }
      />

      <input
        type="hidden"
        name={longitudeName}
        value={
          longitude !== null
            ? String(longitude)
            : ""
        }
      />

      {loading && (
        <p className="mt-1.5 text-xs text-subtle">
          Searching...
        </p>
      )}

      {/* Search results */}
      {open &&
        results.length > 0 && (
          <div className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
            {results.map(
              (result) => (
                <button
                  key={result.id}
                  type="button"
                  onClick={() =>
                    selectLocation(
                      result
                    )
                  }
                  className="block w-full cursor-pointer border-b border-line px-4 py-3 text-left last:border-b-0 hover:bg-surface-hover"
                >
                  <p className="text-sm font-medium text-ink">
                    {result.name}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-muted">
                    {
                      result.formatted
                    }
                  </p>
                </button>
              )
            )}

            <div className="px-4 py-2 text-right text-[11px] text-subtle">
              Powered by Geoapify
            </div>
          </div>
        )}
    </div>
  );
}