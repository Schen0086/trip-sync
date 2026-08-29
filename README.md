# TripSync

TripSync is a travel planning web application I designed for individuals and friend groups to organise trips in one place.

It combines itinerary planning, group voting and discussions, shared expenses, packing, responsibilities, maps, weather, notifications, and real-time collaboration into a single responsive application.

## Features

- Personal and group trip planning
- Group creation, private group pictures, membership, roles, ownership transfer, and invite codes
- Group overviews with current/upcoming trips and recent planning activity
- Day-by-day itineraries with activities, transport, and accommodation
- Drag-and-drop itinerary ordering and schedule conflict detection
- Group suggestions, voting, and discussion threads
- Suggestion acceptance, rejection, and archiving
- Saved places and location discovery
- Interactive trip maps with day, category, and planning-status filtering
- Direct itinerary-to-map marker focusing and map-to-itinerary deep linking
- Transport route connections for multi-city and multi-destination trips
- Live weather forecasts for upcoming trips
- Shared expense tracking and settlements
- Personal, required, and shared packing lists
- Tasks and responsibilities with categories, assignments, priorities, due dates, progress tracking, and filtering
- Personalised dashboard highlighting items that need attention
- Intelligent trip overviews with planning progress, upcoming events, personal action items, and expense balances
- Trip activity feeds for collaborative changes
- Personal notifications with unread tracking and management
- User profile pictures with device-native image selection and avatar fallbacks
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
- Supabase Storage

### Maps & External Services

- MapLibre GL
- Geoapify
- Open-Meteo

## Technical Highlights

- Server and Client Components using the Next.js App Router
- Secure database access using PostgreSQL Row Level Security
- Real-time updates across shared trip data
- Event-driven activity and notification system using PostgreSQL triggers
- Responsive, mobile-first interface
- Persistent user theme preferences
- Server-side authentication and route protection
- Collaborative permission models for trips, groups, expenses, packing, voting, discussions, tasks, and notifications
- Atomic group ownership transfer enforced through PostgreSQL functions and role-based permissions
- Private group images delivered through signed Supabase Storage URLs with member/owner Storage policies
- Database migrations, triggers, helper functions, and validation implemented through Supabase
- Secure user-managed profile images using Supabase Storage and Storage RLS policies
- Map and itinerary deep linking for location-focused trip navigation
- Multi-day transport visualisation for multi-destination itineraries