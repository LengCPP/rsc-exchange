# RSC-Xchange

A resource sharing, selling, and lending platform designed for circles of friends and trusted communities. Built with modern web technologies for a seamless experience.

*Built with the [Full Stack FastAPI Template](https://github.com/fastapi/full-stack-fastapi-template)*

---

## Project Architecture

RSC-Xchange follows a modern, containerized monorepo architecture designed for scalability and developer productivity.

- **Frontend**: A single-page application (SPA) built with **React** and **TypeScript**, powered by **Vite**. It uses **Chakra UI** for styling, **TanStack Router** for navigation, and **TanStack Query** for data fetching.
- **Backend**: A high-performance asynchronous API built with **FastAPI**. It utilizes **SQLModel** (combining SQLAlchemy and Pydantic) for database interactions and data validation.
- **Database**: **PostgreSQL** serves as the primary relational database for structured data.
- **Storage**: **MinIO** is integrated for handling image and file uploads.
- **Reverse Proxy**: **Traefik** manages routing between the frontend and backend, handles SSL/TLS termination, and provides a monitoring dashboard.
- **Deployment**: The entire stack is orchestrated using **Docker Compose**, ensuring consistency across development, staging, and production environments.

---

## Key Features

- **Community-Centric Sharing**: Create and join private communities to pool resources (books, games, tools) with trusted circles.
- **Item Management & Discovery**: Easily catalog items with integrated search (e.g., Book search) and organize them into personal collections.
- **Lending System**: comprehensive tracking for borrowed and lent items, including due dates, return status, and approval workflows.
- **Social Connectivity**: Connect with friends, manage relationships, and view user profiles with distinct custom styling.
- **Notifications**: Stay updated on loan requests, returns, and community activity.
- **Enhanced Profile Management**: Unified interface for updating bio, alias, contact details, and interests.
- **Visual Identity**: Standardized, deterministic avatar system with a themed orange ring for consistent user recognition.

---

## Technology Stack

### Backend
- ⚡ [**FastAPI**](https://fastapi.tiangolo.com) - Modern Python web framework.
- 🧰 [**SQLModel**](https://sqlmodel.tiangolo.com) - Database ORM (SQLAlchemy + Pydantic).
- 💾 [**PostgreSQL**](https://www.postgresql.org) - Robust relational database.
- 🔍 [**Pydantic**](https://docs.pydantic.dev) - Data validation and settings management.
- 🧪 [**Pytest**](https://pytest.org) - Comprehensive testing framework.
- 🚀 [**uv**](https://docs.astral.sh/uv/) - Extremely fast Python package manager.

### Frontend
- 🚀 [**React**](https://react.dev) (TypeScript) - UI library.
- 🎨 [**Chakra UI**](https://chakra-ui.com) - Component library for styling.
- 🛣️ [**TanStack Router**](https://tanstack.com/router) - Type-safe routing.
- 🔄 [**TanStack Query**](https://tanstack.com/query) - Asynchronous state management.
- 🧪 [**Playwright**](https://playwright.dev) - End-to-end testing.
- ⚡ [**Vite**](https://vitejs.dev/) - Next-generation frontend tooling.

### Infrastructure & Tools
- 🐋 [**Docker Compose**](https://www.docker.com) - Container orchestration.
- 📞 [**Traefik**](https://traefik.io) - Cloud-native reverse proxy.
- 📦 [**MinIO**](https://min.io/) - High-performance object storage.
- 🔒 **JWT Authentication** - Secure token-based access control.

---

## Setup Instructions

### 1. Prerequisites
- [Docker and Docker Compose](https://www.docker.com/)
- [Node.js](https://nodejs.org/) (for local frontend development)
- [Python 3.10+](https://www.python.org/) and [uv](https://docs.astral.sh/uv/) (for local backend development)

### 2. Environment Configuration
Copy the template `.env` file and update the variables:
```bash
cp .env.example .env
```
Ensure you update `SECRET_KEY`, `POSTGRES_PASSWORD`, and MinIO credentials.

### 3. Running with Docker
Start the entire stack with a single command:
```bash
docker compose up -d
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:8000](http://localhost:8000)
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Traefik Dashboard**: [http://localhost:8090](http://localhost:8090)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001)

### 4. Database Migrations
Run migrations to set up the database schema:
```bash
docker compose exec backend alembic upgrade head
```

---

## Contribution Guidelines

We welcome contributions! Please follow these steps:

1. **Branching**: Create a new branch for your feature or bugfix (`git checkout -b feature/my-feature`).
2. **Coding Standards**:
   - Backend: Use **Ruff** for linting and **Black** (via `format.sh`) for formatting.
   - Frontend: Adhere to the **Biome** configuration.
3. **Testing**:
   - Run backend tests: `bash backend/scripts/test.sh`.
   - Run frontend E2E tests: `npx playwright test`.
4. **Commits**: Write clear, descriptive commit messages.
5. **Pull Requests**: Submit a PR to the `main` branch with a detailed description of your changes.

---

## Development & Documentation

For more detailed information, refer to the individual service READMEs:
- [Backend Documentation](./backend/README.md)
- [Frontend Documentation](./frontend/README.md)

## License

This project is licensed under the MIT License.