# API Documentation (Postman Integration Guide)

This document provides a comprehensive API reference for the Industrial B2B Manufacturing and Supply Chain ERP. All endpoints, authentication workflows, payload schemas, and status codes are directly mapped to the provided Postman collection.

---

## 1. Postman Collection and Environment Setup

The repository includes a ready-to-use Postman test suite located in the `postman/` directory:
- Collection: `postman/industrial-erp.postman_collection.json`
- Environment: `postman/industrial-erp.postman_environment.json`

### Importing into Postman
1. Open the Postman desktop application or web interface.
2. In the top-left corner, click **Import**.
3. Select both `postman/industrial-erp.postman_collection.json` and `postman/industrial-erp.postman_environment.json`.
4. In the top-right environment dropdown, select **Industrial ERP Local** (or create a production environment).

### Postman Environment Variables

| Variable | Initial Value | Auto-Populated By | Description |
|---|---|---|---|
| `baseUrl` | `http://localhost:5001/api` | User Config | Base URL of the API gateway |
| `token` | `""` | Auth Login Requests | JWT Bearer token extracted after login |
| `quotationId` | `""` | Create Quotation | ID extracted after creating a quotation |
| `orderId` | `""` | Convert Quote to Order | ID extracted after converting quote to sales order |

### Automated Script Handlers in Postman
The Postman collection includes embedded pre-request and test scripts:
- **Auto-Token Capture:** When running `POST /auth/login` (Admin or Sales), the test script automatically parses `response.data.token` and stores it into `{{token}}`. Subsequent requests automatically pass this in the `Authorization: Bearer {{token}}` header.
- **Workflow State Chaining:** When creating a quotation, `quotationId` is stored in the environment. When converting to a sales order, `orderId` is stored automatically.

---

## 2. Authentication and Authorization Scheme

All protected endpoints require a JWT Bearer token in the HTTP `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

### Access Control Roles
- **PUBLIC:** No authentication required (e.g., `/health`).
- **SALES:** Accessible by both `SALES` and `ADMIN` users.
- **ADMIN:** Restricted to `ADMIN` users only. If a `SALES` token is presented, the server returns HTTP `403 Forbidden`.

---

## 3. API Endpoints Reference

### 3.1 System Health

#### GET /health
System telemetry and PostgreSQL database connectivity check.
- **Access:** PUBLIC
- **Headers:** None

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-09-27T00:20:00.000Z",
    "uptimeSeconds": 1420.55,
    "database": {
      "status": "connected"
    }
  }
}
```

---

### 3.2 Authentication

#### POST /auth/login
Authenticates a user and issues a signed JSON Web Token (JWT).
- **Access:** PUBLIC
- **Headers:** `Content-Type: application/json`

**Request Body:**
```json
{
  "email": "admin@industrial-erp.com",
  "password": "AdminPassword123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "e2f12c14-5d51-4f8e-9403-d9fa1c74ad63",
      "email": "admin@industrial-erp.com",
      "name": "System Administrator",
      "role": "ADMIN"
    }
  }
}
```

**Common Error Responses:**
- `400 Bad Request`: Invalid email format or missing fields.
- `401 Unauthorized`: Invalid email or incorrect password.

---

#### GET /auth/me
Returns profile details of the currently authenticated user.
- **Access:** SALES, ADMIN
- **Headers:** `Authorization: Bearer {{token}}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "e2f12c14-5d51-4f8e-9403-d9fa1c74ad63",
      "email": "admin@industrial-erp.com",
      "name": "System Administrator",
      "role": "ADMIN",
      "createdAt": "2026-09-26T18:00:00.000Z"
    }
  }
}
```

---

#### GET /auth/admin-only
Security test route verifying Role-Based Access Control (RBAC).
- **Access:** ADMIN ONLY
- **Headers:** `Authorization: Bearer {{token}}`

**Response (200 OK - Admin Token):**
```json
{
  "success": true,
  "message": "Welcome, Administrator. You have verified ADMIN-level authorization access.",
  "data": {
    "user": {
      "id": "e2f12c14-5d51-4f8e-9403-d9fa1c74ad63",
      "role": "ADMIN"
    }
  }
}
```

**Response (403 Forbidden - Sales Token):**
```json
{
  "success": false,
  "message": "Forbidden: Required role(s): ADMIN"
}
```

---

### 3.3 Products & Inventory

#### GET /products
Retrieves product catalog with current warehouse stock levels.
- **Access:** SALES, ADMIN
- **Headers:** `Authorization: Bearer {{token}}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "00c45d93-37f9-4d20-8057-d3516f85ace7",
        "productCode": "IND-MOT-001",
        "productName": "Three-Phase Induction Motor 5HP 1440RPM",
        "category": "Heavy Motors",
        "unit": "Units",
        "basePrice": "18500.00",
        "inventory": {
          "physicalQuantity": 100,
          "reservedQuantity": 20,
          "availableQuantity": 80
        }
      }
    ]
  }
}
```

---

#### GET /inventory
Returns full stock telemetry across all catalog items.
- **Access:** SALES, ADMIN
- **Headers:** `Authorization: Bearer {{token}}`

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "id": "inv-001",
        "productId": "00c45d93-37f9-4d20-8057-d3516f85ace7",
        "productCode": "IND-MOT-001",
        "productName": "Three-Phase Induction Motor 5HP 1440RPM",
        "physicalQuantity": 100,
        "reservedQuantity": 20,
        "availableQuantity": 80
      }
    ]
  }
}
```

---

### 3.4 Customers

#### GET /customers
Lists all registered B2B clients with optional name search.
- **Access:** SALES, ADMIN
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Params:** `?search=Larsen` (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "810f49d1-fd10-4a3e-88c4-2d7d6a56d3ea",
        "companyName": "Larsen & Turbo Heavy Systems",
        "contactPerson": "Vikram Malhotra",
        "mobile": "+91 98220 11223",
        "email": "vikram@lnt-heavy.com",
        "city": "Vadodara"
      }
    ]
  }
}
```

---

#### POST /customers
Registers a new corporate customer into the system.
- **Access:** SALES, ADMIN
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body:**
```json
{
  "companyName": "Bharat Heavy Electricals Consortium",
  "contactPerson": "Anand Vardhan",
  "mobile": "+91 94432 87654",
  "email": "anand.vardhan@bhel-procure.in",
  "city": "Bhopal"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Customer created successfully",
  "data": {
    "customer": {
      "id": "d4e21a88-29ab-41d7-b861-5913e61a2931",
      "companyName": "Bharat Heavy Electricals Consortium",
      "contactPerson": "Anand Vardhan",
      "mobile": "+91 94432 87654",
      "email": "anand.vardhan@bhel-procure.in",
      "city": "Bhopal",
      "createdAt": "2026-09-27T00:25:00.000Z"
    }
  }
}
```

**Common Error Responses:**
- `400 Bad Request`: Validation failure on email format or missing required fields.
- `409 Conflict`: Customer email already exists.

---

### 3.5 Enquiries (RFQ)

#### POST /enquiries
Creates a new customer RFQ with multiple catalog product lines.
- **Access:** SALES, ADMIN
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body:**
```json
{
  "customerId": "810f49d1-fd10-4a3e-88c4-2d7d6a56d3ea",
  "requiredDate": "2026-10-30T00:00:00.000Z",
  "notes": "Requirement for plant expansion unit #3",
  "items": [
    {
      "productId": "00c45d93-37f9-4d20-8057-d3516f85ace7",
      "quantity": 5,
      "targetPrice": 18000
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Enquiry created successfully",
  "data": {
    "enquiry": {
      "id": "enq-9912",
      "enquiryNumber": "ENQ-2026-0001",
      "customerId": "810f49d1-fd10-4a3e-88c4-2d7d6a56d3ea",
      "status": "NEW",
      "items": [
        {
          "id": "enq-item-1",
          "productId": "00c45d93-37f9-4d20-8057-d3516f85ace7",
          "quantity": 5,
          "targetPrice": "18000.00"
        }
      ]
    }
  }
}
```

---

#### GET /enquiries
Lists all enquiries with customer and line item summaries.
- **Access:** SALES, ADMIN
- **Headers:** `Authorization: Bearer {{token}}`
- **Query Params:** `?status=NEW` (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "enquiries": [
      {
        "id": "enq-9912",
        "enquiryNumber": "ENQ-2026-0001",
        "status": "NEW",
        "customer": {
          "companyName": "Larsen & Turbo Heavy Systems"
        },
        "itemsCount": 1
      }
    ]
  }
}
```

---

### 3.6 Quotations

#### POST /quotations
Generates a formal commercial quotation. Subtotal, discount amount, GST (18%), and grand total are calculated server-side.
- **Access:** SALES, ADMIN
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body:**
```json
{
  "customerId": "810f49d1-fd10-4a3e-88c4-2d7d6a56d3ea",
  "enquiryId": null,
  "validUntil": "2026-11-30T00:00:00.000Z",
  "discountPercentage": 10.0,
  "taxPercentage": 18.0,
  "notes": "Commercial terms: 30 days credit",
  "items": [
    {
      "productId": "00c45d93-37f9-4d20-8057-d3516f85ace7",
      "quantity": 4,
      "unitPrice": 18500
    }
  ]
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Quotation created successfully",
  "data": {
    "quotation": {
      "id": "qt-7701",
      "quotationNumber": "QT-2026-0001",
      "status": "DRAFT",
      "subtotal": "74000.00",
      "discountPercentage": "10.00",
      "discountAmount": "7400.00",
      "taxPercentage": "18.00",
      "taxAmount": "11988.00",
      "grandTotal": "78588.00"
    }
  }
}
```

---

#### PATCH /quotations/:id/status
Updates the quotation review status (`DRAFT` -> `SENT` -> `ACCEPTED` / `REJECTED`).
- **Access:** SALES, ADMIN
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body:**
```json
{
  "status": "ACCEPTED"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Quotation status updated to ACCEPTED",
  "data": {
    "quotation": {
      "id": "qt-7701",
      "status": "ACCEPTED"
    }
  }
}
```

---

### 3.7 Sales Orders, Reservation & Dispatch

#### POST /quotations/:id/convert
Converts an `ACCEPTED` quotation into a confirmed sales order in `PENDING` status.
- **Access:** SALES, ADMIN
- **Headers:** `Authorization: Bearer {{token}}`

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Sales order created from quotation",
  "data": {
    "order": {
      "id": "so-3301",
      "orderNumber": "SO-2026-0001",
      "quotationId": "qt-7701",
      "status": "PENDING",
      "totalAmount": "78588.00"
    }
  }
}
```

**Common Error Responses:**
- `400 Bad Request`: Quotation is not in `ACCEPTED` status (e.g., `DRAFT` or `REJECTED`).
- `409 Conflict`: Quotation has already been converted into a sales order.

---

#### POST /sales-orders/:id/confirm
Confirms order and reserves warehouse inventory using PostgreSQL concurrency locks (`SELECT ... FOR UPDATE`).
- **Access:** ADMIN ONLY
- **Headers:** `Authorization: Bearer {{token}}`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Sales order confirmed and inventory reserved",
  "data": {
    "order": {
      "id": "so-3301",
      "orderNumber": "SO-2026-0001",
      "status": "CONFIRMED",
      "confirmedAt": "2026-09-27T00:26:00.000Z"
    }
  }
}
```

**Common Error Responses:**
- `403 Forbidden`: User has role `SALES`.
- `409 Conflict`: Insufficient available inventory (`requested > physicalQuantity - reservedQuantity`).

---

#### POST /sales-orders/:id/dispatch
Records carrier details and executes inventory dispatch. Permanently deducts physical stock and releases reserved allocation.
- **Access:** ADMIN ONLY
- **Headers:** `Content-Type: application/json`, `Authorization: Bearer {{token}}`

**Request Body:**
```json
{
  "vehicleNumber": "MH-12-AB-9876",
  "driverName": "Ramesh Patil",
  "notes": "Dispatched via express road logistics"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Sales order successfully dispatched",
  "data": {
    "dispatch": {
      "id": "dsp-1101",
      "dispatchNumber": "DSP-2026-0001",
      "salesOrderId": "so-3301",
      "vehicleNumber": "MH-12-AB-9876",
      "driverName": "Ramesh Patil",
      "dispatchDate": "2026-09-27T00:27:00.000Z"
    },
    "orderStatus": "DISPATCHED"
  }
}
```

**Common Error Responses:**
- `400 Bad Request`: Order is not in `CONFIRMED` status.
- `403 Forbidden`: User has role `SALES`.
- `409 Conflict`: Order has already been dispatched.

---

#### POST /sales-orders/:id/cancel
Cancels an order and automatically releases any reserved inventory back into available stock.
- **Access:** ADMIN ONLY
- **Headers:** `Authorization: Bearer {{token}}`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Sales order cancelled and reserved inventory released",
  "data": {
    "order": {
      "id": "so-3301",
      "status": "CANCELLED"
    }
  }
}
```

---

## 4. End-to-End Postman Execution Flow

Follow this sequence to test the complete B2B manufacturing lifecycle in Postman:

1. **System Health Check:**
   - Execute `System Health > Health Telemetry` to verify the server and database are operational.
2. **Authenticate as Admin:**
   - Execute `Auth > 1. Login as Admin`.
   - The test script extracts the bearer token into `{{token}}`.
3. **Check Catalog & Stock:**
   - Execute `Products & Inventory > 1. Get All Products` and `2. Get Inventory Stock Overview`.
4. **Register Customer:**
   - Execute `Customers > 2. Create New Customer`.
5. **Create Quotation:**
   - Execute `Quotations > 1. Create Quotation`.
   - The test script stores the quotation ID into `{{quotationId}}`.
6. **Accept Quotation:**
   - Execute `Quotations > 3. Update Quotation Status` with `status: "ACCEPTED"`.
7. **Convert to Sales Order:**
   - Execute `Sales Orders & Dispatch > 1. Convert Accepted Quotation to Sales Order`.
   - The test script stores the order ID into `{{orderId}}`.
8. **Confirm Order & Lock Stock:**
   - Execute `Sales Orders & Dispatch > 4. Confirm Sales Order & Reserve Inventory`.
   - Stock is reserved; available stock decreases immediately.
9. **Dispatch Order:**
   - Execute `Sales Orders & Dispatch > 5. Dispatch Confirmed Sales Order`.
   - Physical and reserved quantities are decremented, and the order transitions to `DISPATCHED`.
