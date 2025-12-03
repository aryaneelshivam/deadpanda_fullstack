# Deadlock Analyzer - Docker Deployment

This project is containerized using Docker for easy deployment and portability.

## Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 2.0+)

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# From the project root directory
docker-compose up --build
```

This will:
- Build the backend (FastAPI) container
- Build the frontend (React + Nginx) container
- Start both services
- Set up networking between containers

### 2. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### 3. Stop the Application

```bash
# Stop and remove containers
docker-compose down

# Stop, remove containers, and remove volumes
docker-compose down -v
```

## Manual Docker Commands

### Build Individual Images

```bash
# Build backend
docker build -t deadlock-analyzer-backend ./backend

# Build frontend
docker build -t deadlock-analyzer-frontend ./frontend
```

### Run Individual Containers

```bash
# Run backend
docker run -d -p 8000:8000 --name backend deadlock-analyzer-backend

# Run frontend (requires backend to be running)
docker run -d -p 3000:80 --name frontend --link backend deadlock-analyzer-frontend
```

## Architecture

### Backend Container
- **Base Image**: Python 3.11 slim
- **Port**: 8000
- **Framework**: FastAPI with Uvicorn
- **Dependencies**: NetworkX, Pydantic

### Frontend Container
- **Build Stage**: Node 18 Alpine (for Vite build)
- **Runtime Stage**: Nginx Alpine (for serving)
- **Port**: 80 (mapped to 3000 on host)
- **Features**: 
  - API proxy to backend
  - Gzip compression
  - Security headers
  - SPA routing support

### Networking
- Custom bridge network: `deadlock-network`
- Backend accessible to frontend via hostname `backend`
- Frontend proxies `/api` requests to backend

## Environment Variables

### Backend
- `PYTHONUNBUFFERED=1` - Real-time logging

### Frontend
- API proxy configured in nginx.conf

## Health Checks

Backend includes a health check endpoint:
- Endpoint: `/api/health`
- Interval: 30 seconds
- Timeout: 10 seconds
- Retries: 3

## Development vs Production

### Development (Current Setup)
- Frontend uses Vite dev server
- Backend uses Uvicorn with auto-reload
- Hot module replacement

### Production (Docker)
- Frontend built and served via Nginx
- Backend runs with Uvicorn (no auto-reload)
- Optimized for performance

## Troubleshooting

### Check Container Status
```bash
docker-compose ps
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Rebuild After Changes
```bash
docker-compose up --build --force-recreate
```

### Clean Up Everything
```bash
docker-compose down -v --rmi all
```

## Volume Mounting (Development)

For development with hot-reload, you can modify docker-compose.yml:

```yaml
backend:
  volumes:
    - ./backend/app:/app/app
  command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Port Mapping

| Service  | Container Port | Host Port | URL                    |
|----------|---------------|-----------|------------------------|
| Backend  | 8000          | 8000      | http://localhost:8000  |
| Frontend | 80            | 3000      | http://localhost:3000  |

## Security Notes

- Default configuration is for development/testing
- For production deployment:
  - Use environment files for secrets
  - Enable HTTPS/SSL
  - Configure proper CORS origins
  - Use Docker secrets for sensitive data
  - Run containers as non-root user

## Resource Requirements

- **Backend**: ~200MB RAM, 0.5 CPU
- **Frontend**: ~50MB RAM, 0.1 CPU (after build)

## CI/CD Integration

### Build
```bash
docker-compose build
```

### Tag Images
```bash
docker tag deadlock-analyzer-backend:latest myregistry/deadlock-backend:v1.0
docker tag deadlock-analyzer-frontend:latest myregistry/deadlock-frontend:v1.0
```

### Push to Registry
```bash
docker push myregistry/deadlock-backend:v1.0
docker push myregistry/deadlock-frontend:v1.0
```
