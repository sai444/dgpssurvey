# DGPS Survey Management System — Project Instructions

## 1. Overview

A full-stack web application for a **land survey (DGPS) company** to manage projects, clients, surveyors, billing, quotations, documents, and AutoCAD file visualization. The system supports role-based access for **Admin**, **Surveyor**, and **Client** users.

---

## 2. Tech Stack

| Layer        | Technology                                  |
|--------------|---------------------------------------------|
| **Backend**  | Python 3.12 + FastAPI                       |
| **Database** | PostgreSQL 16                               |
| **ORM**      | SQLAlchemy 2.x + Alembic (migrations)       |
| **Auth**     | JWT (access + refresh tokens)               |
| **Frontend** | React 18 + Vite + Tailwind CSS + shadcn/ui  |
| **Maps**     | Leaflet.js / OpenLayers (AutoCAD → GeoJSON) |
| **PDF**      | pdf.js (viewer) + ReportLab (generation)    |
| **Storage**  | Local volume (Docker) or S3-compatible      |
| **Container**| Docker + Docker Compose                     |
| **Proxy**    | Nginx (HTTPS reverse proxy)                 |
| **Domain**   | https://dgpssurvey.com                      |
| **SSL**      | Let's Encrypt / Certbot (auto-renew)        |
| **API Docs** | Swagger UI (auto via FastAPI)               |

---

## 3. Architecture

```
                        https://dgpssurvey.com
                               │
                        ┌──────▼───────┐
                        │   Nginx      │
                        │  (SSL/TLS)   │
                        │  Port 443    │
                        └──┬───────┬───┘
               /           │       │  /api/*
          ┌────────────────┘       └────────────────┐
          ▼                                         ▼
┌─────────────────┐       ┌──────────────┐       ┌────────────┐
│  React SPA      │       │  FastAPI     │──────▶│ PostgreSQL │
│  (static build) │       │  (Uvicorn)   │  ORM  │   16       │
│  Port 6000      │       │  Port 6001   │       │  Port 5423 │
└─────────────────┘       └──────┬───────┘       └────────────┘
                                 │
                          ┌──────▼───────┐
                          │ File Storage │
                          │ /uploads/    │
                          └──────────────┘
```

- **Nginx** is the existing reverse proxy that terminates SSL and routes traffic:
  - `https://dgpssurvey.com/` → React SPA (port 6000)
  - `https://dgpssurvey.com/api/` → FastAPI backend (port 6001)
- All services run via **Docker Compose**.

---

## 4. Database Schema (PostgreSQL)

### 4.1 `users`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID PK      | Default gen_random_uuid()                 |
| email           | VARCHAR(255) | UNIQUE, NOT NULL                          |
| password_hash   | TEXT         | bcrypt hash                               |
| full_name       | VARCHAR(255) | NOT NULL                                  |
| phone           | VARCHAR(20)  |                                           |
| role            | ENUM         | `admin`, `surveyor`, `client`             |
| is_active       | BOOLEAN      | Default TRUE                              |
| avatar_url      | TEXT         |                                           |
| created_at      | TIMESTAMPTZ  | Default NOW()                             |
| updated_at      | TIMESTAMPTZ  | Auto-update trigger                       |

### 4.2 `clients`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID PK      |                                           |
| user_id         | UUID FK      | → users.id (nullable, linked on invite)   |
| company_name    | VARCHAR(255) |                                           |
| contact_person  | VARCHAR(255) |                                           |
| email           | VARCHAR(255) | NOT NULL                                  |
| phone           | VARCHAR(20)  |                                           |
| address         | TEXT         |                                           |
| gst_number      | VARCHAR(20)  |                                           |
| created_at      | TIMESTAMPTZ  |                                           |

### 4.3 `surveyors`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID PK      |                                           |
| user_id         | UUID FK      | → users.id, NOT NULL                      |
| license_number  | VARCHAR(50)  |                                           |
| specialization  | VARCHAR(255) | e.g., "DGPS", "Total Station"             |
| is_available    | BOOLEAN      | Default TRUE                              |
| created_at      | TIMESTAMPTZ  |                                           |

### 4.4 `projects`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID PK      |                                           |
| project_number  | VARCHAR(50)  | UNIQUE, auto-generated (e.g., PRJ-2026-001)|
| title           | VARCHAR(255) | NOT NULL                                  |
| description     | TEXT         |                                           |
| client_id       | UUID FK      | → clients.id                              |
| surveyor_id     | UUID FK      | → surveyors.id (nullable)                 |
| status          | ENUM         | `draft`, `quoted`, `approved`, `in_progress`, `completed`, `on_hold`, `cancelled` |
| priority        | ENUM         | `low`, `medium`, `high`, `urgent`         |
| location        | TEXT         | Address / area description                |
| latitude        | DECIMAL(10,7)|                                           |
| longitude       | DECIMAL(10,7)|                                           |
| area_sqm        | DECIMAL(12,2)| Survey area in square meters              |
| start_date      | DATE         |                                           |
| end_date        | DATE         |                                           |
| created_at      | TIMESTAMPTZ  |                                           |
| updated_at      | TIMESTAMPTZ  |                                           |

### 4.5 `project_documents`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID PK      |                                           |
| project_id      | UUID FK      | → projects.id                             |
| uploaded_by     | UUID FK      | → users.id                                |
| file_name       | VARCHAR(255) |                                           |
| file_path       | TEXT         | Server path / S3 key                      |
| file_type       | ENUM         | `pdf`, `autocad_dwg`, `autocad_dxf`, `image`, `geojson`, `other` |
| file_size_bytes | BIGINT       |                                           |
| description     | TEXT         |                                           |
| created_at      | TIMESTAMPTZ  |                                           |

### 4.6 `quotations`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID PK      |                                           |
| quotation_number| VARCHAR(50)  | UNIQUE, auto-generated (e.g., QUO-2026-001)|
| project_id      | UUID FK      | → projects.id                             |
| client_id       | UUID FK      | → clients.id                              |
| status          | ENUM         | `draft`, `sent`, `accepted`, `rejected`, `expired` |
| subtotal        | DECIMAL(12,2)|                                           |
| tax_percent     | DECIMAL(5,2) | e.g., 18.00 for GST                      |
| tax_amount      | DECIMAL(12,2)|                                           |
| discount        | DECIMAL(12,2)| Default 0                                |
| total_amount    | DECIMAL(12,2)|                                           |
| valid_until     | DATE         |                                           |
| notes           | TEXT         |                                           |
| created_at      | TIMESTAMPTZ  |                                           |
| updated_at      | TIMESTAMPTZ  |                                           |

### 4.7 `quotation_items`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID PK      |                                           |
| quotation_id    | UUID FK      | → quotations.id, ON DELETE CASCADE        |
| description     | TEXT         | Line item description                     |
| quantity        | DECIMAL(10,2)|                                           |
| unit            | VARCHAR(20)  | e.g., "sqm", "hectare", "hour", "fixed"  |
| unit_price      | DECIMAL(12,2)|                                           |
| amount          | DECIMAL(12,2)| quantity × unit_price                     |

### 4.8 `invoices`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID PK      |                                           |
| invoice_number  | VARCHAR(50)  | UNIQUE, auto-generated (e.g., INV-2026-001)|
| project_id      | UUID FK      | → projects.id                             |
| client_id       | UUID FK      | → clients.id                              |
| quotation_id    | UUID FK      | → quotations.id (nullable)               |
| status          | ENUM         | `draft`, `sent`, `paid`, `partial`, `overdue`, `cancelled` |
| subtotal        | DECIMAL(12,2)|                                           |
| tax_percent     | DECIMAL(5,2) |                                           |
| tax_amount      | DECIMAL(12,2)|                                           |
| discount        | DECIMAL(12,2)|                                           |
| total_amount    | DECIMAL(12,2)|                                           |
| amount_paid     | DECIMAL(12,2)| Default 0                                |
| due_date        | DATE         |                                           |
| paid_date       | DATE         |                                           |
| notes           | TEXT         |                                           |
| created_at      | TIMESTAMPTZ  |                                           |
| updated_at      | TIMESTAMPTZ  |                                           |

### 4.9 `invoice_items`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID PK      |                                           |
| invoice_id      | UUID FK      | → invoices.id, ON DELETE CASCADE          |
| description     | TEXT         |                                           |
| quantity        | DECIMAL(10,2)|                                           |
| unit            | VARCHAR(20)  |                                           |
| unit_price      | DECIMAL(12,2)|                                           |
| amount          | DECIMAL(12,2)|                                           |

### 4.10 `payments`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID PK      |                                           |
| invoice_id      | UUID FK      | → invoices.id                             |
| amount          | DECIMAL(12,2)|                                           |
| payment_method  | ENUM         | `cash`, `bank_transfer`, `upi`, `cheque`, `online` |
| reference_number| VARCHAR(100) |                                           |
| payment_date    | DATE         |                                           |
| notes           | TEXT         |                                           |
| created_at      | TIMESTAMPTZ  |                                           |

### 4.11 `tickets`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID PK      |                                           |
| ticket_number   | VARCHAR(50)  | UNIQUE, auto-generated (e.g., TKT-2026-001)|
| project_id      | UUID FK      | → projects.id                             |
| created_by      | UUID FK      | → users.id                                |
| assigned_to     | UUID FK      | → users.id (nullable)                     |
| subject         | VARCHAR(255) | NOT NULL                                  |
| description     | TEXT         |                                           |
| status          | ENUM         | `open`, `in_progress`, `resolved`, `closed` |
| priority        | ENUM         | `low`, `medium`, `high`, `urgent`         |
| category        | ENUM         | `re_survey`, `correction`, `dispute`, `general`, `billing` |
| created_at      | TIMESTAMPTZ  |                                           |
| updated_at      | TIMESTAMPTZ  |                                           |

### 4.12 `ticket_comments`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | UUID PK      |                                           |
| ticket_id       | UUID FK      | → tickets.id, ON DELETE CASCADE           |
| user_id         | UUID FK      | → users.id                                |
| comment         | TEXT         | NOT NULL                                  |
| created_at      | TIMESTAMPTZ  |                                           |

### 4.13 `audit_log`
| Column          | Type         | Notes                                     |
|-----------------|--------------|-------------------------------------------|
| id              | BIGSERIAL PK |                                           |
| user_id         | UUID FK      | → users.id                                |
| action          | VARCHAR(50)  | e.g., "create", "update", "delete"        |
| entity_type     | VARCHAR(50)  | e.g., "project", "invoice"                |
| entity_id       | UUID         |                                           |
| details         | JSONB        | Changed fields                            |
| ip_address      | INET         |                                           |
| created_at      | TIMESTAMPTZ  |                                           |

---

## 5. User Roles & Permissions

| Feature                | Admin | Surveyor | Client |
|------------------------|:-----:|:--------:|:------:|
| User management        |  ✅   |    ❌    |   ❌   |
| Add/edit surveyors     |  ✅   |    ❌    |   ❌   |
| Add/edit clients       |  ✅   |    ❌    |   ❌   |
| Create project         |  ✅   |    ❌    |   ❌   |
| View all projects      |  ✅   |    ❌    |   ❌   |
| View assigned projects |  ✅   |    ✅    |   ✅   |
| Update project status  |  ✅   |    ✅    |   ❌   |
| Upload documents       |  ✅   |    ✅    |   ❌   |
| View/download documents|  ✅   |    ✅    |   ✅   |
| Upload AutoCAD files   |  ✅   |    ✅    |   ❌   |
| View map               |  ✅   |    ✅    |   ✅   |
| Create quotation       |  ✅   |    ❌    |   ❌   |
| View quotation         |  ✅   |    ✅    |   ✅   |
| Accept/reject quotation|  ❌   |    ❌    |   ✅   |
| Create invoice         |  ✅   |    ❌    |   ❌   |
| View invoice           |  ✅   |    ✅    |   ✅   |
| Record payment         |  ✅   |    ❌    |   ❌   |
| Create ticket          |  ✅   |    ✅    |   ✅   |
| View tickets           |  ✅   |    ✅    |   ✅   |
| Assign ticket          |  ✅   |    ❌    |   ❌   |
| Dashboard & reports    |  ✅   |    ✅*   |   ✅*  |

*\*Limited to own data*

---

## 6. API Endpoints

### 6.1 Auth
```
POST   /api/v1/auth/signup            – Register new user
POST   /api/v1/auth/login             – Login (returns JWT)
POST   /api/v1/auth/refresh           – Refresh access token
POST   /api/v1/auth/logout            – Invalidate refresh token
POST   /api/v1/auth/forgot-password   – Send reset email
POST   /api/v1/auth/reset-password    – Reset password with token
GET    /api/v1/auth/me                – Current user profile
PUT    /api/v1/auth/me                – Update own profile
```

### 6.2 User Management (Admin)
```
GET    /api/v1/users                  – List users (paginated, filterable)
POST   /api/v1/users                  – Create user
GET    /api/v1/users/{id}             – Get user details
PUT    /api/v1/users/{id}             – Update user
DELETE /api/v1/users/{id}             – Deactivate user (soft delete)
```

### 6.3 Clients
```
GET    /api/v1/clients                – List clients
POST   /api/v1/clients               – Create client
GET    /api/v1/clients/{id}           – Get client details
PUT    /api/v1/clients/{id}           – Update client
DELETE /api/v1/clients/{id}           – Deactivate client
```

### 6.4 Surveyors
```
GET    /api/v1/surveyors              – List surveyors
POST   /api/v1/surveyors             – Create surveyor
GET    /api/v1/surveyors/{id}        – Get surveyor details
PUT    /api/v1/surveyors/{id}        – Update surveyor
DELETE /api/v1/surveyors/{id}        – Deactivate surveyor
```

### 6.5 Projects
```
GET    /api/v1/projects               – List projects (filtered by role)
POST   /api/v1/projects              – Create project
GET    /api/v1/projects/{id}         – Get project details
PUT    /api/v1/projects/{id}         – Update project
PATCH  /api/v1/projects/{id}/status  – Update project status
DELETE /api/v1/projects/{id}         – Cancel project
```

### 6.6 Documents
```
GET    /api/v1/projects/{id}/documents       – List project documents
POST   /api/v1/projects/{id}/documents       – Upload document (PDF/DWG/DXF/image)
GET    /api/v1/documents/{id}                – Get document metadata
GET    /api/v1/documents/{id}/download       – Download document
DELETE /api/v1/documents/{id}                – Delete document
GET    /api/v1/documents/{id}/preview        – Preview (PDF inline, DWG → GeoJSON)
```

### 6.7 AutoCAD / Map
```
POST   /api/v1/projects/{id}/autocad/upload    – Upload DWG/DXF
GET    /api/v1/projects/{id}/autocad/geojson   – Get converted GeoJSON for map
GET    /api/v1/projects/{id}/map-data          – Aggregated map data for project
```

### 6.8 Quotations
```
GET    /api/v1/quotations                      – List quotations
POST   /api/v1/quotations                     – Create quotation
GET    /api/v1/quotations/{id}                – Get quotation
PUT    /api/v1/quotations/{id}                – Update quotation
PATCH  /api/v1/quotations/{id}/status         – Send / accept / reject
GET    /api/v1/quotations/{id}/pdf            – Download quotation as PDF
POST   /api/v1/quotations/{id}/convert        – Convert to invoice
```

### 6.9 Invoices & Billing
```
GET    /api/v1/invoices                        – List invoices
POST   /api/v1/invoices                       – Create invoice
GET    /api/v1/invoices/{id}                  – Get invoice
PUT    /api/v1/invoices/{id}                  – Update invoice
GET    /api/v1/invoices/{id}/pdf              – Download invoice as PDF
POST   /api/v1/invoices/{id}/payments         – Record payment
GET    /api/v1/invoices/{id}/payments         – Payment history
```

### 6.10 Tickets
```
GET    /api/v1/tickets                         – List tickets
POST   /api/v1/tickets                        – Create ticket
GET    /api/v1/tickets/{id}                   – Get ticket
PUT    /api/v1/tickets/{id}                   – Update ticket
PATCH  /api/v1/tickets/{id}/status            – Update ticket status
POST   /api/v1/tickets/{id}/comments          – Add comment
GET    /api/v1/tickets/{id}/comments          – List comments
```

### 6.11 Dashboard
```
GET    /api/v1/dashboard/stats                 – Overview counts & amounts
GET    /api/v1/dashboard/recent-projects       – Recent project activity
GET    /api/v1/dashboard/revenue               – Revenue chart data
GET    /api/v1/dashboard/pending-actions       – Items needing attention
```

---

## 7. Key Features — Implementation Details

### 7.1 AutoCAD → Map Rendering
- Accept `.dwg` and `.dxf` file uploads
- Convert to **GeoJSON** server-side using `ezdxf` (DXF) or `ODA File Converter` (DWG → DXF → GeoJSON)
- Store converted GeoJSON alongside original file
- Render on frontend using **Leaflet.js** with GeoJSON overlay
- Support zoom, pan, layer toggle, and measurement tools

### 7.2 PDF Management
- Upload PDFs per project (survey reports, land records, etc.)
- Inline PDF viewer on frontend using **react-pdf** / **pdf.js**
- Generate quotation & invoice PDFs server-side using **ReportLab** or **WeasyPrint**
- PDFs include company branding, line items, totals, and terms

### 7.3 Authentication & Security
- Passwords hashed with **bcrypt** (min 12 rounds)
- JWT access tokens (15 min expiry) + refresh tokens (7 day expiry)
- Refresh token rotation on each use
- Rate limiting on auth endpoints (5 req/min)
- CORS restricted to `https://dgpssurvey.com`
- HTTPS enforced via Nginx (HTTP → 301 redirect)
- HSTS header enabled (`Strict-Transport-Security`)
- All file uploads validated: type, size (max 50 MB), and sanitized filename
- SQL injection protection via ORM parameterized queries
- RBAC middleware on every endpoint
- Nginx security headers: `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`

### 7.4 Ticketing System
- Clients/surveyors can raise tickets against a project
- Supports categories: re-survey, correction, dispute, general, billing
- Comment thread per ticket
- Admin assigns tickets to surveyors
- Status flow: open → in_progress → resolved → closed

### 7.5 Billing Workflow
```
Quotation (draft) → Send to Client → Client Accepts → Convert to Invoice → Record Payments
```
- Quotations can be revised (creates new version)
- Invoices track partial payments
- Auto-status update: when `amount_paid >= total_amount` → status = `paid`
- Overdue detection via scheduled check or on-access

---

## 8. Frontend Pages

| Page                     | Route                         | Access        |
|--------------------------|-------------------------------|---------------|
| Login                    | `/login`                      | Public        |
| Signup                   | `/signup`                     | Public        |
| Forgot Password          | `/forgot-password`            | Public        |
| Dashboard                | `/dashboard`                  | All (filtered)|
| Projects List            | `/projects`                   | All (filtered)|
| Project Detail           | `/projects/:id`               | All (filtered)|
| Project Map View         | `/projects/:id/map`           | All (filtered)|
| Project Documents        | `/projects/:id/documents`     | All (filtered)|
| Clients List             | `/clients`                    | Admin         |
| Client Detail            | `/clients/:id`                | Admin         |
| Surveyors List           | `/surveyors`                  | Admin         |
| Surveyor Detail          | `/surveyors/:id`              | Admin         |
| Users Management         | `/users`                      | Admin         |
| Quotations List          | `/quotations`                 | All (filtered)|
| Quotation Detail         | `/quotations/:id`             | All (filtered)|
| Create/Edit Quotation    | `/quotations/new`             | Admin         |
| Invoices List            | `/invoices`                   | All (filtered)|
| Invoice Detail           | `/invoices/:id`               | All (filtered)|
| Create/Edit Invoice      | `/invoices/new`               | Admin         |
| Tickets List             | `/tickets`                    | All (filtered)|
| Ticket Detail            | `/tickets/:id`                | All (filtered)|
| Create Ticket            | `/tickets/new`                | All           |
| Profile Settings         | `/settings/profile`           | All           |

---

## 9. Project Directory Structure

```
DGPS_billing/
├── docker-compose.yml
├── nginx/
│   ├── nginx.conf                 # Main Nginx config
│   ├── conf.d/
│   │   └── dgpssurvey.conf        # Site config (HTTPS + reverse proxy)
│   └── ssl/                       # SSL certs (mounted or certbot)
│       ├── fullchain.pem
│       └── privkey.pem
├── INSTRUCTIONS.md
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── alembic/
│   │   └── versions/
│   ├── app/
│   │   ├── main.py                    # FastAPI app entry
│   │   ├── config.py                  # Settings (env vars)
│   │   ├── database.py                # DB engine & session
│   │   ├── dependencies.py            # Auth deps, pagination
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── client.py
│   │   │   ├── surveyor.py
│   │   │   ├── project.py
│   │   │   ├── document.py
│   │   │   ├── quotation.py
│   │   │   ├── invoice.py
│   │   │   ├── payment.py
│   │   │   ├── ticket.py
│   │   │   └── audit.py
│   │   ├── schemas/                   # Pydantic request/response
│   │   │   ├── user.py
│   │   │   ├── client.py
│   │   │   ├── project.py
│   │   │   ├── document.py
│   │   │   ├── quotation.py
│   │   │   ├── invoice.py
│   │   │   ├── ticket.py
│   │   │   └── common.py             # Pagination, filters
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   ├── clients.py
│   │   │   │   ├── surveyors.py
│   │   │   │   ├── projects.py
│   │   │   │   ├── documents.py
│   │   │   │   ├── autocad.py
│   │   │   │   ├── quotations.py
│   │   │   │   ├── invoices.py
│   │   │   │   ├── tickets.py
│   │   │   │   └── dashboard.py
│   │   │   └── router.py             # Aggregate all v1 routers
│   │   ├── services/
│   │   │   ├── auth_service.py
│   │   │   ├── user_service.py
│   │   │   ├── project_service.py
│   │   │   ├── document_service.py
│   │   │   ├── autocad_service.py     # DWG/DXF → GeoJSON
│   │   │   ├── quotation_service.py
│   │   │   ├── invoice_service.py
│   │   │   ├── pdf_service.py         # PDF generation
│   │   │   ├── ticket_service.py
│   │   │   └── dashboard_service.py
│   │   ├── utils/
│   │   │   ├── security.py            # JWT, password hashing
│   │   │   ├── file_utils.py          # Upload validation
│   │   │   └── number_generator.py    # PRJ-2026-001 style IDs
│   │   └── middleware/
│   │       ├── auth.py                # JWT verification
│   │       ├── rbac.py                # Role-based access
│   │       └── rate_limit.py
│   └── uploads/                       # Mounted Docker volume
│       ├── documents/
│       ├── autocad/
│       └── generated/
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/                       # Axios instance, API calls
│       │   ├── client.ts
│       │   ├── auth.ts
│       │   ├── projects.ts
│       │   ├── quotations.ts
│       │   ├── invoices.ts
│       │   └── tickets.ts
│       ├── components/
│       │   ├── ui/                    # shadcn/ui components
│       │   ├── layout/
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Header.tsx
│       │   │   └── DashboardLayout.tsx
│       │   ├── maps/
│       │   │   └── ProjectMap.tsx      # Leaflet + GeoJSON
│       │   ├── pdf/
│       │   │   └── PdfViewer.tsx
│       │   └── shared/
│       │       ├── DataTable.tsx
│       │       ├── StatusBadge.tsx
│       │       └── FileUpload.tsx
│       ├── pages/
│       │   ├── auth/
│       │   ├── dashboard/
│       │   ├── projects/
│       │   ├── clients/
│       │   ├── surveyors/
│       │   ├── users/
│       │   ├── quotations/
│       │   ├── invoices/
│       │   ├── tickets/
│       │   └── settings/
│       ├── hooks/
│       │   ├── useAuth.ts
│       │   └── useProjects.ts
│       ├── store/                     # Zustand or React Context
│       │   └── authStore.ts
│       ├── types/
│       │   └── index.ts
│       └── utils/
│           ├── formatters.ts
│           └── constants.ts
│
└── scripts/
    ├── seed.py                        # Seed admin user + demo data
    └── backup.sh                      # DB backup script
```

---

## 10. Docker Compose

```yaml
# docker-compose.yml
version: "3.9"

services:
  nginx:
    image: nginx:1.27-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/conf.d:/etc/nginx/conf.d:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro
      - certbot-webroot:/var/www/certbot:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    volumes:
      - ./nginx/ssl:/etc/letsencrypt
      - certbot-webroot:/var/www/certbot
    entrypoint: /bin/sh -c "trap exit TERM; while :; do certbot renew --webroot -w /var/www/certbot; sleep 12h; done"

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: dgps_survey
      POSTGRES_USER: dgps_admin
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "127.0.0.1:5423:5432"          # Bind to localhost only
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dgps_admin -d dgps_survey"]
      interval: 5s
      retries: 5
    restart: unless-stopped

  backend:
    build: ./backend
    command: uvicorn app.main:app --host 0.0.0.0 --port 6001 --reload
    environment:
      DATABASE_URL: postgresql+asyncpg://dgps_admin:${DB_PASSWORD}@db:5432/dgps_survey
      SECRET_KEY: ${SECRET_KEY}
      CORS_ORIGINS: https://dgpssurvey.com
    ports:
      - "127.0.0.1:6001:6001"          # Only accessible via Nginx
    volumes:
      - ./backend/app:/app/app
      - uploads:/app/uploads
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "127.0.0.1:6000:80"            # Only accessible via Nginx
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  pgdata:
  uploads:
  certbot-webroot:
```

---

## 10.1 Nginx Configuration

### `nginx/nginx.conf`
```nginx
worker_processes auto;
events { worker_connections 1024; }

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    sendfile      on;
    keepalive_timeout 65;
    client_max_body_size 50M;          # Match MAX_UPLOAD_SIZE_MB

    # Security headers
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    include /etc/nginx/conf.d/*.conf;
}
```

### `nginx/conf.d/dgpssurvey.conf`
```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name dgpssurvey.com www.dgpssurvey.com;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://dgpssurvey.com$request_uri;
    }
}

# Redirect www → non-www
server {
    listen 443 ssl http2;
    server_name www.dgpssurvey.com;

    ssl_certificate     /etc/nginx/ssl/live/dgpssurvey.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/dgpssurvey.com/privkey.pem;

    return 301 https://dgpssurvey.com$request_uri;
}

# Main site — dgpssurvey.com
server {
    listen 443 ssl http2;
    server_name dgpssurvey.com;

    # SSL certificates (Let's Encrypt / Certbot)
    ssl_certificate     /etc/nginx/ssl/live/dgpssurvey.com/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/live/dgpssurvey.com/privkey.pem;

    # Modern SSL settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS (enable after confirming SSL works)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # --- API Backend (FastAPI) ---
    location /api/ {
        proxy_pass http://backend:6001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;

        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # --- API Docs ---
    location /docs {
        proxy_pass http://backend:6001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /openapi.json {
        proxy_pass http://backend:6001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /redoc {
        proxy_pass http://backend:6001;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # --- Frontend (React SPA) ---
    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 11. Environment Variables

Create a `.env` file at the project root:

```env
# Domain
DOMAIN=dgpssurvey.com

# Database
DB_PASSWORD=change_me_strong_password_here

# Backend
SECRET_KEY=generate-a-64-char-random-hex-string
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7
CORS_ORIGINS=https://dgpssurvey.com

# File Upload
MAX_UPLOAD_SIZE_MB=50
UPLOAD_DIR=/app/uploads

# Email (optional — for password reset)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=

# SSL (set to 'true' after initial certbot setup)
SSL_ENABLED=true
```

---

## 12. Getting Started

```bash
# 1. Clone and navigate
cd DGPS_billing

# 2. Create .env file with required variables (see Section 11)

# 3. Obtain SSL certificate (first time only)
#    Make sure DNS for dgpssurvey.com points to your server IP first.
#    Temporarily start nginx with HTTP-only to get the cert:
docker compose up -d nginx
docker compose run --rm certbot certonly \
  --webroot -w /var/www/certbot \
  -d dgpssurvey.com -d www.dgpssurvey.com \
  --email admin@dgpssurvey.com --agree-tos --no-eff-email

# 4. Build and start all services
docker compose up --build -d

# 5. Run database migrations
docker compose exec backend alembic upgrade head

# 6. Seed admin user
docker compose exec backend python -m scripts.seed

# 7. Open the app
#    Website:    https://dgpssurvey.com
#    API Docs:   https://dgpssurvey.com/docs
#    Admin login: admin@dgpssurvey.com / Admin@123 (change immediately)
```

---

## 13. Development Workflow

1. **Backend changes**: Auto-reload via `--reload` flag in Docker
2. **Frontend changes**: Vite HMR in dev mode
3. **Database migrations**: `docker compose exec backend alembic revision --autogenerate -m "description"` then `alembic upgrade head`
4. **Add Python package**: Add to `requirements.txt` → rebuild: `docker compose up --build backend`
5. **Add npm package**: `docker compose exec frontend npm install <pkg>`

---

## 14. Key Python Dependencies

```
fastapi==0.115.*
uvicorn[standard]==0.34.*
sqlalchemy[asyncio]==2.0.*
asyncpg==0.30.*
alembic==1.14.*
pydantic==2.10.*
python-jose[cryptography]==3.3.*
passlib[bcrypt]==1.7.*
python-multipart==0.0.*
ezdxf==1.4.*
reportlab==4.2.*
pillow==11.*
python-dotenv==1.0.*
```

---

## 15. Key npm Dependencies

```
react, react-dom, react-router-dom
@tanstack/react-query
axios
zustand
tailwindcss, @tailwindcss/forms
shadcn/ui (via CLI)
leaflet, react-leaflet
react-pdf
react-hook-form, zod
lucide-react
recharts (dashboard charts)
date-fns
```

---

## 16. Build Order

1. Set up Docker Compose + PostgreSQL
2. Backend: FastAPI skeleton + config + database connection
3. Backend: User model + auth endpoints (signup, login, JWT)
4. Backend: RBAC middleware
5. Frontend: React skeleton + auth pages + protected routes
6. Backend + Frontend: User management (Admin)
7. Backend + Frontend: Client CRUD
8. Backend + Frontend: Surveyor CRUD
9. Backend + Frontend: Project CRUD + status workflow
10. Backend + Frontend: Document upload + PDF viewer
11. Backend + Frontend: AutoCAD upload + GeoJSON conversion + map view
12. Backend + Frontend: Quotation CRUD + PDF generation
13. Backend + Frontend: Invoice + payment tracking
14. Backend + Frontend: Ticketing system
15. Backend + Frontend: Dashboard with charts
16. Nginx + SSL setup + HTTPS routing for dgpssurvey.com
17. Testing + polish + deploy
