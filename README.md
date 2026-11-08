# Bambo — Backend Architecture

## Overview

Bambo is a Node.js and Express-based REST API designed to power a multilingual digital menu and administrative content management system.

The backend provides secure authentication, structured data management, image processing, and optimized API responses. It uses SQLite for data persistence and supports cloud deployment environments.

---

## Key Features

- **Multilingual Support:** English, Albanian, and Italian menu content processing.
- **Authentication:** Session-based administrative access with secure password hashing (`bcrypt`).
- **Security Baseline:** HTTP security headers (`helmet`), rate limiting, controlled CORS, and protected administrative routes.
- **Image Processing Pipeline:** Memory-buffered upload handling, image resizing, and WebP optimization (`multer` & `sharp`).
- **Performance & Caching:** Custom HTTP ETag generation and conditional `304 Not Modified` API responses.
- **Data Persistence:** Lightweight SQLite database integration.

---

## Technology Stack

| Category | Technology |
| :--- | :--- |
| **Runtime** | Node.js |
| **Framework** | Express.js (v5) |
| **Database** | SQLite (`sqlite3`) |
| **Authentication** | `express-session`, `bcrypt` |
| **Security** | `helmet`, `cors`, `express-rate-limit` |
| **Image Processing** | `multer`, `sharp` |
| **Configuration** | `dotenv` |
| **Deployment** | Render (Cloud Hosting) |

---

## API Overview

| Method | Endpoint | Access |
| :--- | :--- | :--- |
| `GET` | `/api/menu` | Public |
| `POST` | `/api/admin/login` | Public (Rate-limited) |
| `POST` | `/api/admin/logout` | Authenticated |
| `*` | `/api/admin/*` | Protected |

*Note: The administration interface is publicly accessible, but all backend administrative operations strictly require session authentication and authorization.*

---

## Security Practices

The application follows security-conscious engineering principles:

- Passwords are stored using secure bcrypt hashing.
- Administrative endpoints require active session authentication.
- Session cookies utilize strict `httpOnly` and context-aware `secure` attributes.
- Authentication requests are protected against brute-force attacks via rate limiting.
- CORS access is restricted strictly to trusted origins in production environments.
- Incoming payloads and file uploads undergo size limits and validation.
- Sensitive configuration parameters are managed via environment variables.
- Database operations use parameterized queries to prevent SQL injection.
- Production deployments rely on HTTPS and proxy header configuration (`trust proxy`).

---

## Local Development

### Prerequisites
- Node.js (v18+ recommended)
- npm

### 1. Installation
```bash
git clone https://github.com/hgjoni20/demo-bambo.git
cd demo-bambo/backend
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=your_private_session_secret
```

### 3. Execution
```bash
npm start
```
The application will start on `http://localhost:3000`.

---

## Deployment

The backend is configured for modern cloud application platforms (e.g., Render).

Production deployments enforce:
- Enriched environment configuration.
- HTTPS connections.
- Persistent database storage volumes.
- Secure session management with trusted proxy settings.
- Restricted access policies and CORS configuration.

---

## Security Notice

Sensitive credentials, authentication secrets, private configuration, and database file backups must **never** be committed to public repositories.

This documentation intentionally excludes private infrastructure endpoints, payload models, and operational secrets.

---

**Bambo**  
*Secure. Modular. Multilingual. Built for reliability.*