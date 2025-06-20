# EstateMap
EstateMap is a modern web platform that allows real estate companies to list and manage their properties on an interactive map. The system is designed for agencies operating in cities or rural areas and enables users to explore available homes, land, or commercial spaces directly on a geographic map, with powerful search and filtering tools.

## Development Setup

The repository contains a React frontend built with Vite and a Django backend exposed via a REST API. Docker is provided to run the full stack along with a PostgreSQL database.

### Prerequisites

- [Docker](https://www.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)

### Running the project

1. Copy the example env file and adjust it if required:

   ```bash
   cp .env.example .env
   ```

2. Build the Docker images:

   ```bash
   docker compose build
   ```

3. Start all containers:

   ```bash
   docker compose up
   ```

The frontend will be available on <http://localhost:5173> and the backend API on <http://localhost:8000/api/>. Stop the stack with `docker compose down` when you are finished.
