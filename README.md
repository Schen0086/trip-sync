# TripSync

TripSync is a travel planning web application I designed for individuals and friend groups to organise trips in one place.

It combines itinerary planning, group voting, shared expenses, packing, responsibilities, maps, weather, and real-time collaboration into a single responsive application.

## Features

- Personal and group trip planning
- Group creation, membership, roles, and invite codes
- Day-by-day itineraries with activities, transport, and accommodation
- Drag-and-drop itinerary ordering and schedule conflict detection
- Group suggestions and voting
- Suggestion acceptance, rejection, and archiving
- Saved places and location discovery
- Interactive trip maps with filtering
- Live weather forecasts for upcoming trips
- Shared expense tracking and settlements
- Personal, required, and shared packing lists
- Tasks and responsibilities with assignments, priorities, and due dates
- Personalised dashboard highlighting items that need attention
- Real-time collaborative updates
- Responsive desktop and mobile layouts
- Light and dark themes

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Supabase
- PostgreSQL
- Supabase Authentication
- Row Level Security
- Supabase Realtime

### Maps & External Services

- MapLibre GL
- Geoapify
- Open-Meteo

## Technical Highlights

- Server and Client Components using the Next.js App Router
- Secure database access using PostgreSQL Row Level Security
- Real-time updates across shared trip data
- Responsive, mobile-first interface
- Persistent user theme preferences
- Server-side authentication and route protection
- Collaborative permission models for trips, groups, expenses, packing, voting, and tasks
- Database migrations, triggers, helper functions, and validation implemented through Supabase