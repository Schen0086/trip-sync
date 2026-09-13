import Link from "next/link";


export default function AppFooter() {
  const currentYear =
    new Date().getFullYear();


  return (
    <footer className="border-t border-line bg-canvas">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
        {/* TripSync branding */}
        <div>
          <p className="text-base font-semibold tracking-tight text-ink">
            TripSync
          </p>

          <p className="mt-1 text-sm text-muted">
            Plan together. Travel better.
          </p>

          <p className="mt-2 text-xs text-subtle">
            © {currentYear} TripSync
          </p>
        </div>


        {/* Privacy, contact and social links */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          {/* Privacy */}
          <Link
            href="/privacy"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-ink focus:outline-none focus:ring-4 focus:ring-brand-100"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 shrink-0"
            >
              <path d="M12 3 5 6v5c0 4.6 2.9 8.7 7 10 4.1-1.3 7-5.4 7-10V6l-7-3Z" />

              <path d="m9.5 12 1.7 1.7 3.5-3.7" />
            </svg>

            <span>
              Privacy Notice
            </span>
          </Link>


          {/* Instagram */}
          <a
            href="https://www.instagram.com/tripsync_webapp/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-ink focus:outline-none focus:ring-4 focus:ring-brand-100"
            aria-label="Follow TripSync on Instagram"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 shrink-0"
            >
              <rect
                x="3"
                y="3"
                width="18"
                height="18"
                rx="5"
                ry="5"
              />

              <circle
                cx="12"
                cy="12"
                r="4"
              />

              <circle
                cx="17.5"
                cy="6.5"
                r="0.75"
                fill="currentColor"
                stroke="none"
              />
            </svg>

            <span>
              @tripsync_webapp
            </span>
          </a>


          {/* Email */}
          <a
            href="https://mail.google.com/mail/?view=cm&fs=1&to=tripsync.app.emails@gmail.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted transition hover:text-ink focus:outline-none focus:ring-4 focus:ring-brand-100"
            aria-label="Email TripSync using Gmail"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5 shrink-0"
            >
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
              />

              <path
                d="m3 7 9 6 9-6"
              />
            </svg>

            <span>
              tripsync.app.emails@gmail.com
            </span>
          </a>
        </div>
      </div>
    </footer>
  );
}