export default function AppLoading() {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="px-6 py-8"
    >
      <div className="mx-auto max-w-6xl">
        <span className="sr-only">
          Loading TripSync…
        </span>

        <div className="animate-pulse">
          <div className="h-8 w-48 rounded-lg bg-surface-soft" />

          <div className="mt-3 h-4 w-72 max-w-full rounded bg-surface-soft" />

          <div className="mt-8 h-32 rounded-2xl border border-line bg-surface" />

          <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="h-44 rounded-2xl border border-line bg-surface" />

            <div className="h-44 rounded-2xl border border-line bg-surface" />

            <div className="h-44 rounded-2xl border border-line bg-surface" />
          </div>
        </div>
      </div>
    </main>
  );
}