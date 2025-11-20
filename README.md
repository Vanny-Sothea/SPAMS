## Features

- **Microservice Architecture** — Independent services for modular scalability  
- **Identity & Authentication** — JWT-based authentication and role-based access control  

## Architecture Overview
rch integration  
- **Notification Service** — Email notifications (via message broker)  
- **Event-Driven Messaging** — Using RabbitMQ for inter-service communication  
- **Caching & Rate Limiting** — Redis for caching and API protection  
- **API Gateway** — Unified entry point for all requests  
- **PostgreSQL + Prisma ORM** — Clean and maintainable data layer  
- **Docker Compose Support** — Simplified local deployment


## Tech Stack

| Layer | Technology |
|-------|-------------|
| Language | TypeScript |
| Framework | Express.js |
| ODM | TBF |
| Database | MongoDB |
| Message Broker | RabbitMQ |
| Cache / Rate Limit | Redis |
| Containerization | Docker & Docker Compose |

---

## Getting Started

### Clone the repository

```bash
git clone TBF
cd TBF/server
```
### Setup environment variables

At the root directory and for each service, copy the example file:

```base
cp .env.example .env
```

Fill in database URLs, JWT secrets, and RabbitMQ connection strings.

### Start all services

```base
docker-compose up --build
```

BongPay will start all core microservices, the API Gateway, RabbitMQ, Redis, and PostgreSQL.


## Available Services

| Service              | Description                     | Port   |
| -------------------- | ------------------------------- | ------ |
| API Gateway          | Entry point for all requests    | `3000` |
| Identity Service     | User registration, login, roles | `3001` |
| Grade Service        | Grade service CRUD              | `3002` |
| Notification Service | Email/SMS notifications         | `3008` |
