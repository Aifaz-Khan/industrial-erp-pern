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

## 2. Production Deployment and Infrastructure Architecture

The application is deployed across a multi-cloud production architecture:

| Tier | Cloud Provider | Technology & Runtime | Purpose & Configuration |
|---|---|---|---|
| **Frontend** | **Vercel** | React 18, Vite, Pure CSS3 | Global Edge CDN hosting the SPA with reverse proxy rewrites (`/api/*`) to AWS EC2 for seamless HTTPS security. |
| **Backend API** | **AWS EC2** | Ubuntu 24.04 LTS, Node.js 20, PM2 | Hosted on an AWS virtual machine instance. Managed 24/7 by PM2 process supervisor with automated crash recovery and boot persistence. |
| **Database** | **Neon** | Serverless PostgreSQL (v16) | Cloud-managed relational database cluster with SSL enforcement (`?sslmode=require`) and connection pooling. |

### Infrastructure Workflow
1. **AWS EC2 Hosting:** The Node.js Express API runs inside an AWS EC2 Ubuntu instance on port `5001`. PM2 ensures continuous uptime and background execution.
2. **Neon PostgreSQL:** Database transactions, table migrations, and relational locks (`SELECT ... FOR UPDATE`) execute over encrypted SSL connections.
3. **Vercel Edge Proxy:** Vercel serves the static React frontend over HTTPS and securely proxies API traffic to the AWS EC2 instance, eliminating browser mixed-content blocks and CORS overhead.

---

## 3. Database Schema and Entity-Relationship (ER) Diagram

### Entity-Relationship (ER) Diagram

```mermaid
erDiagram
    User ||--o{ Enquiry : "creates"
    User ||--o{ Quotation : "prepares"
    User ||--o{ SalesOrder : "confirms"
    User ||--o{ Dispatch : "dispatches"

    Customer ||--o{ Enquiry : "submits"
    Customer ||--o{ Quotation : "receives"
    Customer ||--o{ SalesOrder : "places"

    Product ||--|| Inventory : "tracks stock (1:1)"
    Product ||--o{ EnquiryItem : "requested in"
    Product ||--o{ QuotationItem : "quoted in"
    Product ||--o{ SalesOrderItem : "ordered in"
    Product ||--o{ DispatchItem : "shipped in"

    Enquiry ||--o{ EnquiryItem : "contains"
    Enquiry ||--o{ Quotation : "leads to"

    Quotation ||--o{ QuotationItem : "contains"
    Quotation ||--o| SalesOrder : "converts into (1:1)"

    SalesOrder ||--o{ SalesOrderItem : "contains"
    SalesOrder ||--o| Dispatch : "fulfilled by (1:1)"

    Dispatch ||--o{ DispatchItem : "contains"

    User {
        string id PK "UUID"
        string email UK "Unique corporate email"
        string password "bcrypt hash"
        string name "Employee name"
        Role role "ADMIN | SALES"
        datetime createdAt
        datetime updatedAt
    }

    Customer {
        string id PK "UUID"
        string companyName "Company name"
        string contactPerson "Procurement officer"
        string mobile "Phone number"
        string email UK "Unique email"
        string city "City location"
        datetime createdAt
        datetime updatedAt
    }

    Product {
        string id PK "UUID"
        string productCode UK "SKU code"
        string productName "Catalog title"
        string category "Industrial classification"
        string unit "Units | Pieces | Meters"
        decimal basePrice "Standard unit price"
        datetime createdAt
        datetime updatedAt
    }

    Inventory {
        string id PK "UUID"
        string productId FK "UNIQUE (1:1 with Product)"
        int physicalQuantity "Warehouse on-hand stock"
        int reservedQuantity "Committed to orders"
        datetime createdAt
        datetime updatedAt
    }

    Enquiry {
        string id PK "UUID"
        string enquiryNumber UK "ENQ-YYYY-XXXX"
        string customerId FK "References Customer"
        string createdById FK "References User"
        datetime enquiryDate
        datetime requiredDate
        string notes
        EnquiryStatus status "NEW | QUOTED | WON | LOST"
        datetime createdAt
        datetime updatedAt
    }

    EnquiryItem {
        string id PK "UUID"
        string enquiryId FK "References Enquiry"
        string productId FK "References Product"
        int quantity "Requested units"
        decimal targetPrice "Customer target price"
    }

    Quotation {
        string id PK "UUID"
        string quotationNumber UK "QT-YYYY-XXXX"
        string enquiryId FK "Optional Enquiry link"
        string customerId FK "References Customer"
        string createdById FK "References User"
        datetime validUntil "Expiration date"
        QuotationStatus status "DRAFT | SENT | ACCEPTED | REJECTED"
        decimal subtotal "Line items sum"
        decimal discountPercentage "Commercial discount %"
        decimal discountAmount "Discount value"
        decimal taxPercentage "GST % (18.00)"
        decimal taxAmount "Statutory tax value"
        decimal grandTotal "Final payable amount"
        string notes
        datetime createdAt
        datetime updatedAt
    }

    QuotationItem {
        string id PK "UUID"
        string quotationId FK "References Quotation"
        string productId FK "References Product"
        int quantity "Quoted units"
        decimal unitPrice "Offered unit price"
        decimal lineTotal "quantity * unitPrice"
    }

    SalesOrder {
        string id PK "UUID"
        string orderNumber UK "SO-YYYY-XXXX"
        string quotationId FK "UNIQUE (1:1 with Quotation)"
        string customerId FK "References Customer"
        datetime orderDate
        SalesOrderStatus status "PENDING | CONFIRMED | DISPATCHED | CANCELLED"
        decimal totalAmount "Grand total from quote"
        string confirmedById FK "References User (ADMIN)"
        datetime confirmedAt
        datetime createdAt
        datetime updatedAt
    }

    SalesOrderItem {
        string id PK "UUID"
        string salesOrderId FK "References SalesOrder"
        string productId FK "References Product"
        int quantity "Ordered units"
        decimal unitPrice "Locked unit price"
        decimal lineTotal "quantity * unitPrice"
    }

    Dispatch {
        string id PK "UUID"
        string dispatchNumber UK "DSP-YYYY-XXXX"
        string salesOrderId FK "UNIQUE (1:1 with SalesOrder)"
        datetime dispatchDate
        string vehicleNumber "Logistics carrier"
        string driverName "Driver name"
        string notes
        string dispatchedById FK "References User (ADMIN)"
        datetime createdAt
        datetime updatedAt
    }

    DispatchItem {
        string id PK "UUID"
        string dispatchId FK "References Dispatch"
        string productId FK "References Product"
        int quantity "Shipped units"
    }
```

### Relational Integrity and Architectural Guarantees
- **1-to-1 Product to Inventory:** Every product SKU maps to exactly one inventory balance record (`Inventory.productId` is unique). Available stock is computed as `physicalQuantity - reservedQuantity`.
- **1-to-1 Quotation to Sales Order:** An accepted quotation can produce at most one sales order (`SalesOrder.quotationId` is unique), preventing duplicate order booking.
- **1-to-1 Sales Order to Dispatch:** A confirmed sales order can generate at most one dispatch record (`Dispatch.salesOrderId` is unique).
- **Concurrency-Safe Stock Reservation:** Order confirmations utilize PostgreSQL transaction isolation with `SELECT ... FOR UPDATE` row-level locking. If concurrent orders compete for remaining stock, requests evaluate sequentially; any order exceeding available stock is rejected with an HTTP 409 Conflict.
- **Financial Precision:** All pricing, subtotals, tax (18% GST), discounts, and totals are computed server-side using `DECIMAL(12, 2)` to eliminate floating-point rounding errors.

---

## 4. Project Setup

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

## 5. Database Setup

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

## 6. Environment Variables

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

## 7. Migration and Seed Instructions

Run all Prisma migrations and populate the database with initial master data (roles, users, products, inventory, and customers).

Run these commands from the `backend` directory:

```bash
cd backend

# Generate Prisma Client
npx prisma generate

# Apply Database Migrations (or sync schema directly to Neon)
npx prisma db push
# or: npx prisma migrate deploy

# Seed Master Data (Users, Products, Initial Inventory, Customers)
node prisma/seed.js
```

---

## 8. How to Run Frontend and Backend

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

## 9. How to Run Tests

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

## 10. Test Login Credentials

The seed script creates the following pre-configured user accounts:

| Role | Email | Password | Access Scope / Permissions |
|---|---|---|---|
| ADMIN | admin@industrial-erp.com | AdminPassword123! | Full administrative access: Manage inventory stock, create and approve sales orders, generate and approve commercial quotations, oversee customer accounts, and access system telemetry. |
| SALES | sales@industrial-erp.com | SalesPassword123! | Commercial access: Customer ingestion, RFQ enquiry management, commercial quotation draft generation, and dispatch tracking. Restricted from administrative overrides and direct inventory baseline adjustments. |
