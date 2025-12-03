# Resource Allocation & Deadlock Analyzer

A visual tool to simulate and analyze resource allocation graphs and deadlock scenarios for operating systems education and analysis.

![Deadlock Analysis Demo](/.gemini/antigravity/brain/8acbf509-841b-44d2-b760-d3f081edb9d6/deadlock_results_1764745400273.png)

## Features

- 🎨 **Interactive Graph Visualization** - Drag-and-drop interface with React Flow
- 🔍 **Deadlock Detection** - Cycle detection algorithm with visual highlighting
- 📊 **Safe Sequence Calculation** - Banker's Algorithm implementation
- 🎯 **Real-time Analysis** - Instant feedback on resource allocation scenarios
- 🌙 **Modern UI** - Dark theme with glassmorphism effects
- 📝 **Sample Scenarios** - Pre-built deadlock examples for learning

## Tech Stack

### Backend
- **FastAPI** - High-performance Python web framework
- **NetworkX** - Graph algorithms and analysis
- **Pydantic** - Data validation and serialization

### Frontend
- **React** - UI library with hooks
- **React Flow** - Interactive graph visualization
- **Vite** - Fast build tool and dev server

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Start both services with Docker Compose
docker-compose up --build

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
```

See [DOCKER.md](DOCKER.md) for detailed Docker instructions.

### Option 2: Local Development

#### Backend Setup
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

#### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Access at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

## Usage

### Creating a Resource Allocation Graph

1. **Add Nodes**
   - Click "⚙️ Add Process" to create process nodes (P1, P2, etc.)
   - Click "📦 Add Resource" to create resource nodes (R1, R2, etc.)

2. **Create Edges**
   - Click and drag from one node to another
   - **Resource → Process** = Allocation (green edge)
   - **Process → Resource** = Request (orange, animated edge)

3. **Analyze**
   - Click "🔍 Analyze Deadlock" to detect cycles
   - Click "📊 Safe Sequence" to run Banker's Algorithm
   - Deadlocks will be highlighted in red

4. **Load Sample**
   - Click "📝 Load Sample" for a pre-built deadlock scenario

### Understanding Results

**Deadlock Detected:**
- Red highlighting on nodes and edges in the cycle
- Cycle path displayed (e.g., P1 → R1 → P2 → R2 → P1)
- Warning message in the results panel

**Safe Sequence:**
- Shows safe order of process execution
- Indicates resource allocation won't cause deadlock
- Format: P1 → P2 → P3

## Algorithms Implemented

### 1. Cycle Detection (Deadlock)
Uses Depth-First Search (DFS) to detect cycles in the directed resource allocation graph.

```python
cycles = list(nx.simple_cycles(graph))
```

### 2. Wait-for Graph
Converts the resource allocation graph to a wait-for graph showing process dependencies.

### 3. Banker's Algorithm
Determines if the system is in a safe state and calculates a safe execution sequence.

## API Endpoints

- `POST /api/analyze-deadlock` - Analyze graph for deadlocks
- `POST /api/safe-sequence` - Calculate safe sequence
- `POST /api/simulate-allocation` - Simulate resource allocation
- `GET /api/health` - Health check

Full API documentation available at: http://localhost:8000/docs

## Project Structure

```
deadpanda_project/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI application
│   │   ├── graph_models.py      # Pydantic models
│   │   └── deadlock_analyzer.py # Detection algorithms
│   ├── Dockerfile               # Backend container
│   ├── .dockerignore
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app.jsx              # Main React component
│   │   ├── main.jsx             # Entry point
│   │   ├── api.js               # API client
│   │   ├── index.css            # Design system
│   │   └── app.css              # Component styles
│   ├── Dockerfile               # Frontend container
│   ├── nginx.conf               # Nginx configuration
│   ├── .dockerignore
│   ├── vite.config.js
│   ├── package.json
│   └── index.html
├── docker-compose.yml           # Multi-container orchestration
├── DOCKER.md                    # Docker documentation
└── README.md                    # This file
```

## Screenshots

### Initial Interface
![Initial State](/.gemini/antigravity/brain/8acbf509-841b-44d2-b760-d3f081edb9d6/initial_state_1764745364679.png)

### Sample Graph
![Sample Scenario](/.gemini/antigravity/brain/8acbf509-841b-44d2-b760-d3f081edb9d6/sample_graph_1764745380408.png)

### Deadlock Detection
![Deadlock Analysis](/.gemini/antigravity/brain/8acbf509-841b-44d2-b760-d3f081edb9d6/deadlock_results_1764745400273.png)

## Educational Use

This tool is perfect for:
- Operating Systems courses
- Deadlock demonstration and analysis
- Understanding resource allocation
- Learning graph algorithms
- Banker's Algorithm visualization

## Development

### Backend Requirements
- Python 3.11+
- FastAPI
- NetworkX
- Pydantic

### Frontend Requirements
- Node.js 18+
- React 18+
- React Flow 11+
- Vite 5+

### Environment Variables

#### Backend
- `PYTHONUNBUFFERED=1` - For Docker logging

#### Frontend
- API proxy configured in `vite.config.js` (dev)
- API proxy configured in `nginx.conf` (production)

## Docker Deployment

### Build and Run
```bash
docker-compose up --build
```

### Stop
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f
```

See [DOCKER.md](DOCKER.md) for complete Docker documentation.

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

## License

MIT License - feel free to use for educational purposes.

## Contributing

Contributions are welcome! Areas for enhancement:
- Additional deadlock prevention algorithms
- More sample scenarios
- Export/import graph functionality
- Animation of safe sequence execution
- Multi-instance resource support

## Support

For issues or questions:
1. Check the [DOCKER.md](DOCKER.md) for deployment help
2. Review API documentation at http://localhost:8000/docs
3. Check browser console for frontend errors

## Acknowledgments

- Built with React Flow for graph visualization
- Uses NetworkX for graph algorithms
- Inspired by operating systems textbook examples

---

**Ready to analyze deadlocks!** 🚀
