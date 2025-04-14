# P2P Network Prototype

A full-stack TypeScript application that explores peer-to-peer networking principles using a modern web stack.

## Stack

- **Frontend**: React + Vite + TailwindCSS
- **Backend**: Node.js (ESM) + Express
- **ORM**: Drizzle + PostgreSQL
- **Styling**: TailwindCSS + PostCSS
- **Build Tools**: Vite, ESBuild

## Project Structure

/client      → frontend UI
/server      → backend API (Node.js)
/shared      → types and database schema

## Getting Started

```bash
# 1. Clone the repo
git clone https://github.com/your-username/p2pnetwork.git

# 2. Install dependencies
npm install

# 3. Setup your database URL
cp .env.example .env

# 4. Push schema to DB
npm run db:push

# 5. Start development server
npm run dev

Scripts
	•	npm run dev – start development server
	•	npm run build – bundle backend + frontend
	•	npm run start – start production build
	•	npm run db:push – push schema using Drizzle ORM

License

MIT
