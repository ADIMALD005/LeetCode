# LeetCode (Online Code Runner)

A small LeetCode-style app. Users submit code, a queue holds the job, and a worker runs it and saves the result.

## How it works

1. The frontend sends code and language to the backend (`POST /submission`).
2. The backend saves the submission in Postgres with status `Processing` and pushes a job onto a Redis queue.
3. The worker takes the job off the queue, runs the code, and updates the row with `Success` or `Failure` and the output.
4. The frontend polls `GET /submission/:id` until the status changes.

## Tech stack

- Frontend: React, Vite, Tailwind, shadcn/ui
- Backend: Node.js, Express, TypeScript
- Database: PostgreSQL with Prisma 6
- Queue: Redis
- Local services: Docker

## Folders

- `backend/` - Express API
- `worker/` - queue worker that runs the code
- `frontend/` - React app

## Run locally

1. Start Docker, then the database and Redis:

       docker run -d --name compiler-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=onlinecompiler -p 5432:5432 -v compiler-data:/var/lib/postgresql postgres
       docker run -d --name my-redis -p 6379:6379 redis

2. Create `.env` in `backend/` and `worker/`:

       DATABASE_URL="postgres://postgres:postgres@localhost:5432/onlinecompiler"

3. Backend:

       cd backend
       npm install
       npx prisma migrate dev --name init
       npm run dev

4. Worker (in a new terminal):

       cd worker
       npm install
       npx prisma generate
       npm run dev

5. Frontend (in a new terminal):

       cd frontend
       npm install
       npm run dev

## Supported languages

`js`, `cpp` (needs g++ installed), `py` (needs Python installed)

## Warning

The worker runs submitted code directly on the machine, with only a 5-second time limit. Do not expose it publicly without sandboxing each run in a container.
