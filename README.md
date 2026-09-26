# Industrial B2B Manufacturing and Supply Chain ERP

## 1. Tech Stack

### Backend
- Runtime: Node.js (v18+)
- Framework: Express.js
- ORM: Prisma ORM (v5)
- Database: PostgreSQL (Neon Serverless / Local PostgreSQL)
- Authentication: JSON Web Tokens (jsonwebtoken) and bcryptjs password hashing
- Testing: Vitest and Supertest
- Architecture: Controller-Service-Repository Pattern, Centralized Error Handling, Decimal-Safe Financial Math

### Frontend
- Framework: React 18
- Build Tool: Vite
- Routing: React Router DOM (v6)
- HTTP Client: Axios (with request/response interceptors)
- Icons: Lucide React
- Styling: Pure CSS3 (Custom Responsive Enterprise Design System, CSS Variables, Flexbox/Grid)

---

## 2. Project Setup

### Prerequisites
- Node.js (v18.x or v20.x recommended)
- npm (v9+ or v10+)
- PostgreSQL instance (local or cloud provider like Neon)
- Git

### Clone the Repository
```bash
git clone <repository-url>
cd inventory_system
```

### Install Dependencies
Install dependencies for both backend and frontend applications:

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
cd ..
```

---

## 3. Database Setup

The project uses PostgreSQL with Prisma ORM. You can use a local PostgreSQL instance or a managed cloud database such as Neon PostgreSQL.

1. Ensure PostgreSQL is running and create a database named `industrial_erp` (or use the default database provided by Neon).
2. Note your PostgreSQL connection string in the following format:
   ```
   postgresql://<username>:<password>@<host>:<port>/<database>?schema=public
   ```
   For cloud providers like Neon requiring SSL, append `?sslmode=require`:
   ```
   postgresql://<username>:<password>@<host>/<database>?sslmode=require
   ```

---

## 4. Environment Variables

### Backend Configuration
Create a `.env` file inside the `backend` directory:

```bash
cp backend/.env.example backend/.env
```

Set the values in `backend/.env`:

```env
# Server Port (Port 5001 is recommended to avoid macOS AirPlay Receiver on port 5000)
PORT=5001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# Database Connection URL (PostgreSQL / Neon)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/industrial_erp?schema=public"

# JWT Authentication
JWT_SECRET=super_secret_jwt_signing_key_replace_in_production
JWT_EXPIRES_IN=24h
```

### Frontend Configuration
Create a `.env` file inside the `frontend` directory:

```bash
touch frontend/.env
```

Set the value in `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

---

## 5. Migration and Seed Instructions

Run all Prisma migrations and populate the database with initial master data (roles, users, products, inventory, and customers).

Run these commands from the `backend` directory:

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Apply Database Migrations
npx prisma migrate dev --name init

# For production/cloud deployment (e.g. Neon), apply migrations without creating new ones:
# npx prisma migrate deploy

# Seed Master Data (Users, Products, Initial Inventory, Customers)
npm run seed
```

---

## 6. How to Run Frontend and Backend

### Terminal 1: Backend Server
```bash
cd backend
npm run dev
```
The backend API server will start on `http://localhost:5001`.
Health check endpoint: `http://localhost:5001/api/health`

### Terminal 2: Frontend Client
```bash
cd frontend
npm run dev
```
The frontend Vite development server will start on `http://localhost:5173`.
Open `http://localhost:5173` in your browser to view the application.

---

## 7. How to Run Tests

The backend includes a comprehensive integration test suite built with Vitest and Supertest covering:
- Authentication and Role-Based Access Control (RBAC)
- Customer Enquiries and Quotation Engine with GST/Discount math
- Concurrency-safe Sales Orders, Stock Reservation (`SELECT ... FOR UPDATE`), and Dispatch
- Health endpoints and centralized error handling

Execute the test suite from the `backend` directory:

```bash
cd backend
npm test
```

---

## 8. Test Login Credentials

The seed script creates the following pre-configured user accounts:

| Role | Email | Password | Access Scope / Permissions |
|---|---|---|---|
| ADMIN | admin@industrial-erp.com | AdminPassword123! | Full administrative access: Manage inventory stock, create and approve sales orders, generate and approve commercial quotations, oversee customer accounts, and access system telemetry. |
| SALES | sales@industrial-erp.com | SalesPassword123! | Commercial access: Customer ingestion, RFQ enquiry management, commercial quotation draft generation, and dispatch tracking. Restricted from administrative overrides and direct inventory baseline adjustments. |
