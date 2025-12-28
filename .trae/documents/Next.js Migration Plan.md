I will proceed with the development of the new Next.js 14 application to replace the existing PHP solution. Based on the audit of the PHP codebase, here is the detailed implementation plan:

## 1. Project Initialization & Setup
- **Create Next.js Project**: Initialize a new project in `/Users/mathis/Documents/project/emby/next-app` (sibling to `emby-`).
- **Tech Stack**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Prisma, NextAuth.js.
- **Environment**: Configure `.env` with database connection and API keys (Emby, Jellyseerr, TMDB).

## 2. Database Layer (Prisma)
- **Schema Translation**: Port existing Laravel migrations to `schema.prisma`.
  - `User` & `Account` (NextAuth support).
  - `MediaRequest`: For tracking user requests (pending, approved, etc.).
  - `WatchEvent` & `WatchSession`: For Emby viewing history.
  - `Setting`: For dynamic configuration (API URLs, keys).
  - `MediaAvailabilityIndex`: For caching optimization.
- **Migration**: Run initial Prisma migration to set up the MySQL database.

## 3. Core Services Integration (Backend Logic)
- **Emby Service** (`lib/services/emby.ts`):
  - Port `EmbyService.php` logic.
  - Implement `getUserViewingHistory`, `getSessions`, and `getServerStats`.
  - Implement `syncFullWatchHistory` for tracking user activity.
- **Jellyseerr Service** (`lib/services/jellyseerr.ts`):
  - Port `JellyseerrService.php`.
  - Implement `getMediaAvailability` (checking status in Jellyseerr).
  - Implement `checkMediaRequests` and status mapping.
- **TMDB/Search Service**:
  - Implement optimized search and discovery logic.

## 4. API Routes Implementation
- **Auth**: Configure NextAuth.js with Credentials (and potentially Emby OAuth if feasible/desired).
- **Media API**:
  - `GET /api/media/search`: Proxy to Jellyseerr/TMDB.
  - `GET /api/media/availability/{id}`: Check availability status.
  - `POST /api/requests`: Handle new media requests.
- **User API**:
  - `GET /api/user/stats`: Return viewing statistics (graphs, heatmaps).
  - `GET /api/user/history`: Return watch history.

## 5. Frontend Development (UI/UX)
- **Layout**: Modern responsive layout with Sidebar/Navigation (App Router Layouts).
- **Dashboard**:
  - Replicate the detailed statistics view (Total play time, active users, heatmaps).
  - Show "Continue Watching" or "Recently Added".
- **Media Browser**:
  - Infinite scroll grid for Movies/Series.
  - Filter by Genre, Availability.
- **Request Flow**:
  - Modal/Page to request new media (Movies/Series).
  - Integration with Jellyseerr API to trigger the request.
- **Admin Panel**:
  - Manage requests (Approve/Deny).
  - System settings (configure API URLs).

## 6. Optimization & Performance
- **Caching**: Implement Redis (or in-memory cache) for external API calls (similar to `IntelligentCacheService`).
- **Image Optimization**: Use `next/image` for posters and backdrops.

I will start by initializing the project and setting up the Prisma schema to match your current data model.