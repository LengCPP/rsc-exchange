## Quick Start for Docker

To run the project with Docker:

1.  **Start the services**:
    ```bash
    docker compose up -d
    ```
2.  **Access the applications**:
    - **Frontend**: [http://localhost:5173](http://localhost:5173)
    - **Backend API**: [http://localhost:8000](http://localhost:8000)
    - **Interactive API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
    - **Traefik Dashboard**: [http://localhost:8090](http://localhost:8090)
    - **Adminer (Database UI)**: [http://localhost:8080](http://localhost:8080)
    - **Mailcatcher (Email testing)**: [http://localhost:1080](http://localhost:1080)

3.  **Local Development with Domains**:
    To use custom domains like `dashboard.localhost` and `api.localhost`, update your `.env` and set `DOMAIN=localhost`, then ensure your `docker-compose.override.yml` is configured to use the proxy.

---

# RSC-Xchange

A resource sharing, selling, and lending platform designed for circles of friends and trusted communities.

## About

RSC-Xchange enables you to share, sell, and lend resources within your social circles. Built with modern web technologies for a seamless experience.

*Built with the [Full Stack FastAPI Template](https://github.com/fastapi/full-stack-fastapi-template)*

## Technology Stack

- ⚡ [**FastAPI**](https://fastapi.tiangolo.com) for the Python backend API
    - 🧰 [SQLModel](https://sqlmodel.tiangolo.com) for database interactions (ORM)
    - 🔍 [Pydantic](https://docs.pydantic.dev) for data validation and settings management
    - 💾 [PostgreSQL](https://www.postgresql.org) as the SQL database
- 🚀 [React](https://react.dev) for the frontend
    - 💃 TypeScript, hooks, Vite, and modern frontend stack
    - 🎨 [Chakra UI](https://chakra-ui.com) for UI components
    - 🤖 Automatically generated frontend client
    - 🧪 [Playwright](https://playwright.dev) for E2E testing
    - 🦇 Dark mode support
- 🐋 [Docker Compose](https://www.docker.com) for development and production
- 🔒 Secure password hashing
- 🔑 JWT authentication
- 📫 Email-based password recovery
- ✅ Tests with [Pytest](https://pytest.org)
- 📞 [Traefik](https://traefik.io) as reverse proxy / load balancer

## Configuration

Update configs in the `.env` files to customize your configurations.

Before deploying, change at least these values:

- `SECRET_KEY`
- `FIRST_SUPERUSER_PASSWORD`
- `POSTGRES_PASSWORD`

### Generate Secret Keys

To generate secure secret keys:

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

Run this command multiple times to generate different keys for each secret.

## Development

- **Backend docs**: [backend/README.md](./backend/README.md)
- **Frontend docs**: [frontend/README.md](./frontend/README.md)
- **General development**: [development.md](./development.md)

## License

This project is licensed under the MIT License.
