import type {
  Metadata,
} from "next";

import Link from "next/link";


export const metadata:
  Metadata = {
  title:
    "Privacy Notice | TripSync",

  description:
    "Learn how TripSync handles account information, trip content, photos and other personal data.",
};


const privacyEmailUrl =
  "https://mail.google.com/mail/?view=cm&fs=1&to=tripsync.app.emails@gmail.com&su=TripSync%20privacy%20request";


export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-canvas px-6 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Back navigation */}
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-brand-700 transition hover:text-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-100"
        >
          ← Back to TripSync
        </Link>


        {/* Page heading */}
        <header className="mt-8 border-b border-line pb-8">
          <p className="text-sm font-semibold text-brand-700">
            TripSync
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Privacy Notice
          </h1>

          <p className="mt-3 max-w-2xl leading-7 text-muted">
            This notice explains
            what information
            TripSync handles,
            why it is used and
            what choices you have
            when using the
            application.
          </p>

          <p className="mt-4 text-sm text-subtle">
            Last updated:{" "}
            <time dateTime="2026-09-13">
              13 September 2026
            </time>
          </p>
        </header>


        <div className="mt-10 space-y-8">
          {/* Overview */}
          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              Overview
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-muted">
              <p>
                TripSync is an
                independently
                developed travel
                planning application
                that helps individuals
                and groups organise
                trips together.
              </p>

              <p>
                TripSync only uses
                information that is
                needed to provide,
                secure and maintain
                the application and
                its collaborative
                features.
              </p>
            </div>
          </section>


          {/* Information handled */}
          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              Information TripSync handles
            </h2>

            <div className="mt-5 space-y-5 text-sm leading-7 text-muted">
              <div>
                <h3 className="font-semibold text-ink">
                  Account information
                </h3>

                <p className="mt-1">
                  This includes your
                  email address and
                  authentication
                  information required
                  to create and access
                  your account.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink">
                  Profile information
                </h3>

                <p className="mt-1">
                  This may include your
                  display name,
                  username, profile
                  picture and saved
                  appearance
                  preferences.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink">
                  Trips and groups
                </h3>

                <p className="mt-1">
                  TripSync stores the
                  information you and
                  your collaborators
                  add to trips and
                  groups, including
                  destinations, dates,
                  descriptions,
                  itineraries, saved
                  places, transport,
                  accommodation,
                  packing lists and
                  responsibilities.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink">
                  Collaborative content
                </h3>

                <p className="mt-1">
                  This may include
                  votes, discussions,
                  comments, task
                  activity,
                  notifications and
                  other actions made
                  while planning a
                  shared trip.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink">
                  Expense information
                </h3>

                <p className="mt-1">
                  TripSync can store
                  expense amounts,
                  currencies,
                  participants,
                  balances and
                  settlement
                  information that
                  users enter.
                  TripSync does not
                  process card
                  payments or require
                  payment card
                  details.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink">
                  Photos and uploaded files
                </h3>

                <p className="mt-1">
                  If you upload profile,
                  group or trip images,
                  those files are
                  stored so they can
                  be shown to the
                  appropriate users.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink">
                  Technical information
                </h3>

                <p className="mt-1">
                  Hosting,
                  authentication and
                  security services may
                  process standard
                  technical information
                  such as IP addresses,
                  browser information,
                  timestamps, request
                  information and
                  security logs when
                  you use TripSync.
                </p>
              </div>
            </div>
          </section>


          {/* Use of information */}
          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              How information is used
            </h2>

            <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-7 text-muted">
              <li>
                Create and secure your
                TripSync account.
              </li>

              <li>
                Provide personal and
                collaborative trip
                planning features.
              </li>

              <li>
                Show your profile to
                people you travel and
                collaborate with.
              </li>

              <li>
                Store and display trip
                photos and other
                user-created content.
              </li>

              <li>
                Provide maps, location
                search, routing and
                weather information.
              </li>

              <li>
                Generate activity
                updates and
                notifications.
              </li>

              <li>
                Detect, investigate and
                prevent misuse,
                security problems and
                technical failures.
              </li>

              <li>
                Maintain and improve
                the reliability of the
                application.
              </li>
            </ul>
          </section>


          {/* Collaboration visibility */}
          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              Who can see your content
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-muted">
              <p>
                TripSync is designed
                for collaboration.
                Information you add to
                a shared group or trip
                may be visible to
                other people who have
                access to that group
                or trip.
              </p>

              <p>
                Your display name,
                username and profile
                picture may also be
                shown alongside your
                contributions so other
                collaborators know who
                performed an action.
              </p>

              <p>
                Private trip and group
                images are made
                available through
                permission-controlled
                storage and temporary
                signed URLs where
                applicable.
              </p>

              <p>
                Only add information
                that you are
                comfortable sharing
                with the other members
                of the relevant trip or
                group.
              </p>
            </div>
          </section>


          {/* Third parties */}
          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              Services used by TripSync
            </h2>

            <p className="mt-4 text-sm leading-7 text-muted">
              TripSync relies on
              third-party services to
              operate. Depending on
              the feature you use,
              information may be
              processed by the
              following providers.
            </p>

            <div className="mt-5 space-y-4 text-sm leading-7 text-muted">
              <div>
                <h3 className="font-semibold text-ink">
                  Supabase
                </h3>

                <p className="mt-1">
                  Authentication,
                  PostgreSQL database,
                  realtime updates and
                  private file storage.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink">
                  Vercel
                </h3>

                <p className="mt-1">
                  Application hosting
                  and delivery of the
                  TripSync website.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink">
                  Geoapify
                </h3>

                <p className="mt-1">
                  Maps, location search,
                  geocoding and
                  location-related
                  services. Search
                  text and map requests
                  may be sent to
                  Geoapify when these
                  features are used.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink">
                  Open-Meteo
                </h3>

                <p className="mt-1">
                  Weather information
                  for trip
                  destinations.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink">
                  Google / Gmail
                </h3>

                <p className="mt-1">
                  Used to deliver
                  TripSync service
                  emails from the
                  application&apos;s
                  email account.
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-muted">
              These providers may
              process technical
              information in
              accordance with their
              own terms and privacy
              notices.
            </p>
          </section>


          {/* Cookies */}
          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              Cookies and sessions
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-muted">
              <p>
                TripSync uses
                essential
                authentication and
                session information so
                you can remain securely
                signed in and access
                the correct account
                data.
              </p>

              <p>
                TripSync does not
                currently contain
                advertising or
                advertising-tracking
                functionality.
              </p>
            </div>
          </section>


          {/* Retention */}
          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              Data retention and deletion
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-muted">
              <p>
                Information is kept
                for as long as it is
                reasonably needed to
                provide and secure
                TripSync or until it is
                deleted through
                available application
                controls.
              </p>

              <p>
                Trip and group owners
                can delete certain
                content using the
                controls available
                within TripSync.
              </p>

              <p>
                TripSync does not
                currently provide a
                self-service button
                for deleting an entire
                user account.
              </p>

              <p>
                To request deletion of
                your account and
                associated personal
                information, contact
                TripSync using the
                email address below.
                When possible, send
                the request from the
                email address
                associated with your
                account so ownership
                can be verified.
              </p>

              <p>
                Some information may
                remain temporarily in
                service-provider logs
                or backups where
                immediate deletion is
                not technically
                possible.
              </p>
            </div>
          </section>


          {/* Security */}
          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              Security
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-muted">
              <p>
                TripSync uses
                authenticated access,
                database Row Level
                Security, permission
                checks, private storage
                policies and signed
                file URLs to help
                protect user data.
              </p>

              <p>
                No internet service can
                guarantee absolute
                security. Avoid
                uploading highly
                sensitive information
                such as passwords,
                payment card numbers,
                passport details or
                other information that
                is not needed for trip
                planning.
              </p>
            </div>
          </section>


          {/* User choices */}
          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              Your choices and rights
            </h2>

            <div className="mt-4 space-y-4 text-sm leading-7 text-muted">
              <p>
                You can update certain
                profile and account
                information directly
                from TripSync
                Settings.
              </p>

              <p>
                You can also contact
                TripSync to ask about
                the personal
                information held about
                you or to request
                correction or
                deletion.
              </p>

              <p>
                Depending on the
                data-protection laws
                that apply to you, you
                may also have rights
                relating to access,
                restriction,
                objection, portability
                or complaints to an
                appropriate data
                protection authority.
              </p>
            </div>
          </section>


          {/* Changes */}
          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              Changes to this notice
            </h2>

            <p className="mt-4 text-sm leading-7 text-muted">
              This notice may be
              updated as TripSync
              develops or when the way
              information is handled
              changes. The date at the
              top of this page will be
              updated when material
              changes are made.
            </p>
          </section>


          {/* Contact */}
          <section className="rounded-2xl border border-line bg-surface p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-ink">
              Privacy contact
            </h2>

            <p className="mt-4 text-sm leading-7 text-muted">
              For privacy questions,
              account deletion
              requests or other
              personal-data requests,
              contact TripSync at:
            </p>

            <a
              href={
                privacyEmailUrl
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex break-all font-medium text-brand-700 transition hover:text-brand-800 focus:outline-none focus:ring-4 focus:ring-brand-100"
            >
              tripsync.app.emails@gmail.com
            </a>
          </section>
        </div>
      </div>
    </main>
  );
}