# Software Requirements Specification

## Silk Route Manual Booking System

| Document field | Value |
|---|---|
| Version | 1.0 |
| Status | As-built baseline |
| Prepared | 2026-10-22 |
| System | Silk Route Manual Booking |

## 1. Introduction

### 1.1 Purpose

This document specifies the current functional and non-functional requirements of the Silk Route Manual Booking System. It is based on the React user interface, Express API, and MySQL schema in this repository. It is intended for operational users, maintainers, testers, and stakeholders reviewing the system.

This is an as-built specification: requirements describe the system's existing scope where verified in source code. Security requirements and implementation considerations that are not fully met are identified separately.

### 1.2 Scope

The system supports airport lounge/CIP reservation operations, including booking creation, passenger records, payment status and credit account management, reservation search and maintenance, operational reports, user administration, and sales-shift reporting. It provides a browser-based React application backed by a Node.js/Express API and a MySQL database.

The deployed API uses the `airport_database` database. The separate `database/schema.sql` file describes an earlier dashboard prototype and is not the database schema used by the current backend.

### 1.3 Intended audience

- Reservation and airport operations staff
- Finance staff
- System administrators
- Developers and database maintainers
- Quality assurance and acceptance-test teams

### 1.4 Definitions and abbreviations

| Term | Definition |
|---|---|
| CIP | Commercially Important Person / airport lounge reservation record; stored in the `cip` table. |
| Passenger | A person associated with a reservation; stored in the `passenger` table. |
| Credit company | An organization with a corporate credit account and a configured limit. |
| Shift | An operational sales period, tracked in `shift` and summarized in `sessionincome`. |
| SRS | Software Requirements Specification. |
| SMTP | Simple Mail Transfer Protocol, used to send booking receipt emails. |

## 2. Overall description

### 2.1 Product perspective

The product is a client-server web application:

1. The React single-page application provides login, navigation, forms, summaries, and reports.
2. The Express API exposes JSON endpoints under `/api`.
3. The MySQL database stores users, reservations, passenger details, corporate credit balances and histories, operational logs, and sales shifts.
4. An SMTP server is used to send booking receipt PDFs to passengers and copy a configured address.

### 2.2 User classes

| User class | Intended responsibilities | Current application access |
|---|---|---|
| Administrator | Manage system users and reservations; use operational modules. | Admin role can access administrator routes and general operational routes. |
| Standard user | Create and maintain reservations; use operational reports and sales-end functions. | Normal role; the Sales End navigation item is restricted to this role. |
| Finance user | Review and manage corporate credit accounts and payments; search reservations. | Finance role is restricted to finance/payment and search routes. |
| Guest | Authenticate to access the application. | Unauthenticated users are redirected to Login. |

### 2.3 Operating environment

- Web client: React 18, React Router, and modern desktop/mobile browsers.
- Server: Node.js with Express.
- Database: MySQL, accessed through `mysql2`.
- Email: SMTP server configured through backend environment variables.
- Frontend default API URL: `http://localhost:4000/api`; configurable with `REACT_APP_API_BASE`.
- Backend default port: `4000`; configurable with `PORT`.

### 2.4 Constraints

- Reservation and account data are stored in the existing `airport_database` schema.
- Flight/date, currency, and legacy column formats are constrained by that schema.
- Credit reservations are denominated in Sri Lankan Rupees.
- Sending booking receipts requires SMTP credentials and an available SMTP service.
- The browser application currently relies on client-side route guards; API authorization is not consistently enforced server-side.

### 2.5 Assumptions and dependencies

- A compatible MySQL instance and the required `airport_database` tables are available.
- The backend environment contains valid database settings.
- Email delivery requires valid `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, and `SMTP_PASS` values. `SMTP_FROM` and `BOOKING_EMAIL_CC` are configurable.
- Users have current browser support for the application’s JavaScript and PDF features.
- Operational data and role assignments are maintained by authorized administrators.

## 3. System features and functional requirements

Priority labels: **High** means essential to core operation; **Medium** means supporting/administrative. Implementation status reflects the source code reviewed for this specification.

### 3.1 Authentication and access

| ID | Requirement | Priority | Status |
|---|---|---:|---|
| FR-001 | The system shall provide a login form accepting a user ID and password and report invalid credentials or inactive accounts. | High | Implemented |
| FR-002 | The system shall identify users as administrator, finance, or standard user and restrict frontend routes by role. | High | Implemented in frontend |
| FR-003 | The system shall retain the current user in browser local storage and provide logout that clears the stored user and returns to Login. | Medium | Implemented |
| FR-004 | On successful non-finance login, the system shall create or reuse an active shift and ensure a corresponding session-income row exists. | High | Implemented |

### 3.2 Dashboard

| ID | Requirement | Priority | Status |
|---|---|---:|---|
| FR-010 | The dashboard shall show today's arrivals and departures, pending payments/reservations, and confirmed reservations. | High | Implemented |
| FR-011 | The dashboard shall show reservation status totals and a short list of recent reservations and recent activity. | Medium | Implemented |

### 3.3 Reservation creation and passenger data

| ID | Requirement | Priority | Status |
|---|---|---:|---|
| FR-020 | The system shall allow an operational user to create a reservation by selecting a package/booking type and entering booking, flight, passenger, contact, and payment details. | High | Implemented |
| FR-021 | A reservation shall contain at least one passenger. Each passenger shall have a valid title, name, and passport number. | High | Implemented and validated by API |
| FR-022 | The system shall validate required lead-passenger contact details and supported currencies before saving a reservation. | High | Implemented and validated by API |
| FR-023 | The system shall save the reservation and its passenger records transactionally and return the created reservation identifier. | High | Implemented |
| FR-024 | The system shall support booking receipts as PDF attachments emailed to the lead passenger after reservation creation. | High | Implemented |
| FR-025 | Receipt emails shall CC the address configured in `BOOKING_EMAIL_CC`; if it is unset, the current default is `nalindatilak@gmail.com`. | Medium | Implemented |
| FR-026 | If email delivery fails, the API shall report that the reservation was saved but the receipt could not be sent. | High | Implemented |

### 3.4 Reservation lists, editing, deletion, and search

| ID | Requirement | Priority | Status |
|---|---|---:|---|
| FR-030 | The system shall list pending reservations and allow permitted users to review payment details. | High | Implemented |
| FR-031 | The system shall list confirmed reservations. | High | Implemented |
| FR-032 | Permitted users shall be able to update pending or confirmed reservations, including passenger and flight/contact details. | High | Implemented |
| FR-033 | Reservation updates shall verify that a reservation is still in the expected state and reject stale or invalid updates. | High | Implemented |
| FR-034 | Permitted users shall be able to delete pending or confirmed reservations, subject to role restrictions in the frontend. | Medium | Implemented |
| FR-035 | The system shall provide reservation search and operational views for visitor details and immigration/emigration data. | Medium | Implemented in frontend |

### 3.5 Corporate credit accounts and on-credit reservations

| ID | Requirement | Priority | Status |
|---|---|---:|---|
| FR-040 | The system shall list corporate credit accounts with organization name, credit limit, utilized amount, remaining credit, and guarantee expiry. | High | Implemented |
| FR-041 | When a company is selected, the system shall show its credit status. If the limit is exceeded, it shall show the limit, utilized amount, and amount exceeded. | High | Implemented |
| FR-042 | The system shall prevent an on-credit booking when the account is expired or has reached/exceeded its credit limit. | High | Implemented in UI and reservation API |
| FR-043 | On-credit reservations shall use the selected company account and Sri Lankan Rupees. | High | Implemented and validated by API |
| FR-044 | The system shall update the company’s outstanding balance and record a booking-history entry when an on-credit reservation is made. | High | Implemented |
| FR-045 | Finance users shall be able to record a positive payment against a credit account; the payment shall reduce the outstanding balance without reducing it below zero and shall be recorded in payment history. | High | Implemented |
| FR-046 | Permitted users shall be able to review corporate account details and payment history and update guarantee expiry. | Medium | Implemented |
| FR-047 | Administrators shall be able to create a corporate credit company and its initial credit-balance record. | Medium | Implemented |

### 3.6 Sales shift end

| ID | Requirement | Priority | Status |
|---|---|---:|---|
| FR-050 | The Sales End page shall show the current/latest shift’s reservation count, currency counts and totals, serial numbers, and shift dates. | High | Implemented |
| FR-051 | An authorized user shall be able to end the active shift after confirmation. | High | Implemented |
| FR-052 | Ending a shift shall calculate sales for the shift period, update or create its session-income summary, set `SHIFT_STATUS` to `0`, record end time and ending user, and commit the operation transactionally. | High | Implemented |
| FR-053 | After a successful shift end, the system shall download a PDF sales-end report and log out the current user. | Medium | Implemented |

### 3.7 User administration and reports

| ID | Requirement | Priority | Status |
|---|---|---:|---|
| FR-060 | Administrators shall be able to search, filter, paginate, create, and update system users. | Medium | Implemented |
| FR-061 | The system shall provide daily arrival/departure, immigration/emigration, and visitor-detail operational views. | Medium | Implemented |
| FR-062 | The system shall provide a health endpoint and a database-status endpoint for operational diagnostics. | Medium | Implemented |

## 4. External interface requirements

### 4.1 User interface

The application shall provide a responsive browser interface with login, dashboard, navigation, forms, status summaries, data tables, error/loading feedback, confirmation prompts for consequential actions, and PDF downloads where specified above.

### 4.2 API interface

The API shall use HTTP and JSON. The following routes are implemented; `:id` and `:companyId` are path parameters.

| Method and path | Purpose |
|---|---|
| `POST /api/auth/login` or `POST /api/login` | Authenticate a user. |
| `GET /api/dashboard` | Return dashboard metrics and recent activity. |
| `GET /api/reservations/all` | Return reservation data for reports. |
| `GET /api/reservations/pending` | List pending reservations. |
| `GET /api/reservations/confirmed` | List confirmed reservations. |
| `POST /api/reservations` | Create a reservation. |
| `GET /api/reservations/:id` | Read a reservation and its passengers. |
| `PUT /api/reservations/pending/:id` | Update a pending reservation. |
| `PUT /api/reservations/confirmed/:id` | Update a confirmed reservation. |
| `DELETE /api/reservations/pending/:id` | Delete a pending reservation. |
| `DELETE /api/reservations/confirmed/:id` | Delete a confirmed reservation. |
| `POST /api/reservations/:id/email-receipt` | Email a PDF receipt. |
| `GET /api/reservations/credit/companies` | List credit companies and credit status. |
| `GET /api/reservations/credit/check/:companyId` | Check an account’s credit eligibility. |
| `GET /api/reservations/credit/company/:companyId` | Read company details and payment history. |
| `PUT /api/reservations/credit/company/:companyId/expiry` | Update guarantee expiry. |
| `POST /api/reservations/credit/company` | Create a credit company. |
| `POST /api/reservations/credit/payment` | Record a credit-account payment. |
| `GET /api/reservations/visitors?date=YYYY-MM-DD` | Return visitor details for a date. |
| `GET /api/users`, `GET /api/users/:id` | List/search or read users. |
| `POST /api/users`, `PUT /api/users/:id` | Create or update users. |
| `GET /api/sales-end` | Read shift sales summary. |
| `POST /api/sales-end/end` | End the active shift. |
| `GET /api/health`, `GET /api/db-status` | Check API and database availability. |

The API shall return suitable HTTP error codes and JSON error messages for invalid requests, missing records, conflicts, unavailable email configuration, and server failures.

### 4.3 Database interface

The backend shall connect to MySQL using environment-based connection settings. The primary data entities used by the application are:

- `users`: login identities, user types, contact details, organization, and account status.
- `cip`: reservation, flight, contact, payment, and booking-status data.
- `passenger`: passenger names and passport details associated with a reservation.
- `credit_balance`: organization outstanding amount, credit limit, and expiry date.
- `crdt_booking_history` and `crdt_payment_history`: credit booking and payment audit history.
- `shift` and `sessionincome`: sales-shift state and aggregated income.
- `action_log`: user and reservation activity.

### 4.4 Email interface

Receipt delivery shall use SMTP configured in the backend environment. The message shall be addressed to the passenger email on the reservation, CC `BOOKING_EMAIL_CC` (falling back to the configured default), and include a PDF attachment.

## 5. Data and business rules

1. A reservation must contain one or more passengers.
2. Each passenger requires a supported title, name, and passport number.
3. Supported reservation currencies are Rs., US $, EUR, and GBP.
4. Corporate credit bookings are limited to Rs.
5. An account is not eligible for a credit booking if the guarantee has expired, the credit limit is non-positive, or the utilized amount is greater than or equal to the limit.
6. Credit payments must be positive. Applying a payment cannot make the outstanding balance negative.
7. A shift can be ended only while its status is active (`SHIFT_STATUS = 1`). An ended shift has status `0`.
8. Credit balance, reservation, and shift-ending operations that change multiple related records shall use database transactions where implemented.

## 6. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-001 | The application shall communicate between browser and API using HTTP JSON requests and provide understandable error feedback when an operation fails. |
| NFR-002 | Database access shall use parameterized SQL for user-supplied values. |
| NFR-003 | Multi-record reservation, credit-payment, and shift-end operations shall preserve consistency using transactions. |
| NFR-004 | The system shall not expose SMTP credentials or database passwords in user-facing responses or client-side code. |
| NFR-005 | The interface shall support common modern desktop and mobile browser sizes. |
| NFR-006 | Operational tables and reports shall show current records returned by the API, and users shall be able to refresh views where provided. |
| NFR-007 | The backend shall log operational failures to server logs and return a non-success response rather than reporting a failed operation as successful. |

## 7. Security and implementation considerations

These points describe the current implementation and should be addressed before production deployment:

- Frontend protected routes are not a substitute for API authorization. API endpoints currently do not consistently authenticate or enforce roles server-side.
- Authentication stores the current user object in browser local storage. The reviewed application does not establish a server-side session or issue an API access token.
- User creation hashes passwords with MD5, and login accepts a plain-text match for legacy records. This is not an appropriate modern password-storage scheme; use a slow adaptive password hash and plan a migration.
- The SRS requires access controls for user, reservation, finance, and shift operations. The server must enforce these controls independently of the frontend.
- Personal information, including passport numbers, email addresses, and phone numbers, is processed. Production deployment should use HTTPS, restrict database access, apply retention controls, and limit access to these records.
- SMTP and database credentials must be kept in deployment environment configuration and must not be committed to source control.

## 8. Acceptance criteria

The system is acceptable against this baseline when:

1. Valid users can log in and the frontend applies the expected role-based navigation and route restrictions.
2. A valid reservation and its passenger records can be created, retrieved, updated, and listed in the appropriate status view.
3. A booking receipt can be emailed to the passenger with the configured CC address and PDF attachment; a delivery failure is reported clearly.
4. Selecting a credit company displays its limit, utilized amount, available amount, and expiry; an over-limit or expired account cannot complete a credit booking.
5. Recording a credit payment updates the balance and creates payment-history data.
6. Ending an active sales shift saves a session summary, sets shift status to `0`, returns shift details, and triggers a sales PDF download followed by logout.
7. Dashboard and operational reporting views load current records and expose API failures to the user.
8. Before production acceptance, API-level role enforcement and secure password storage are implemented and verified.

## 9. Source of truth

This specification was derived from the current repository source, principally:

- `frontend/src/App.jsx` and `frontend/src/routes/navRoutes.js`
- `frontend/src/components/`
- `frontend/src/utils/userRoles.js` and `frontend/src/utils/creditValidation.js`
- `backend/server.js` and `backend/routes/`
- `backend/config/db.js`
- `database/airport_database.sql`

If this document conflicts with the live deployment or an approved business policy, the deployed behavior and formally approved policy should be reconciled with this SRS and the document updated.
