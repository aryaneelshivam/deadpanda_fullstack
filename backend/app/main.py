from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict
import uvicorn

from .graph_models import (
    GraphState, DeadlockAnalysisResult, SafeSequenceResult,
    AllocationRequest, SimulationResult, Node, Edge, EdgeType
)
from .deadlock_analyzer import analyze_graph_for_deadlock, calculate_safe_sequence

app = FastAPI(
    title="Resource Allocation & Deadlock Analyzer API",
    description="API for analyzing resource allocation graphs and detecting deadlocks",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Resource Allocation & Deadlock Analyzer API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/api/health",
            "analyze": "/api/analyze-deadlock",
            "safe_sequence": "/api/safe-sequence",
            "simulate": "/api/simulate-allocation"
        }
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "deadlock-analyzer"
    }


@app.post("/api/analyze-deadlock", response_model=DeadlockAnalysisResult)
async def analyze_deadlock(graph_state: GraphState):
    """
    Analyze a resource allocation graph for deadlocks.
    
    Uses cycle detection in the directed graph to identify deadlocks.
    Returns information about any detected cycles and wait-for relationships.
    """
    try:
        result = analyze_graph_for_deadlock(graph_state)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analyzing graph: {str(e)}")


@app.post("/api/safe-sequence", response_model=SafeSequenceResult)
async def get_safe_sequence(graph_state: GraphState):
    """
    Calculate a safe sequence for process execution using Banker's Algorithm.
    
    Returns whether the system is in a safe state and a safe execution sequence
    if one exists.
    """
    try:
        result = calculate_safe_sequence(graph_state)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating safe sequence: {str(e)}")


@app.post("/api/simulate-allocation", response_model=SimulationResult)
async def simulate_allocation(request: Dict):
    """
    Simulate a resource allocation and check if it would cause deadlock.
    
    Takes a current graph state and a proposed allocation, returns whether
    the allocation is safe to perform.
    """
    try:
        graph_state = GraphState(**request.get("graph_state", {}))
        allocation_request = AllocationRequest(**request.get("allocation_request", {}))
        
        # Create a new edge for the proposed allocation
        new_edge = Edge(
            id=f"sim_{allocation_request.process_id}_{allocation_request.resource_id}",
            source=allocation_request.resource_id,
            target=allocation_request.process_id,
            type=EdgeType.ALLOCATION,
            instances=allocation_request.instances
        )
        
        # Create new graph state with the proposed allocation
        new_state = GraphState(
            nodes=graph_state.nodes.copy(),
            edges=graph_state.edges + [new_edge]
        )
        
        # Analyze for deadlock
        analysis = analyze_graph_for_deadlock(new_state)
        
        if analysis.has_deadlock:
            return SimulationResult(
                success=False,
                message="⚠️ This allocation would cause a deadlock!",
                new_state=None,
                would_cause_deadlock=True
            )
        else:
            return SimulationResult(
                success=True,
                message="✓ Allocation is safe and will not cause deadlock",
                new_state=new_state,
                would_cause_deadlock=False
            )
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error simulating allocation: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
