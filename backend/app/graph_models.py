from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal
from enum import Enum


class EdgeType(str, Enum):
    """Type of edge in the resource allocation graph"""
    ALLOCATION = "allocation"  # Resource -> Process (resource is allocated to process)
    REQUEST = "request"  # Process -> Resource (process is requesting resource)


class NodeType(str, Enum):
    """Type of node in the graph"""
    PROCESS = "process"
    RESOURCE = "resource"


class Node(BaseModel):
    """Represents a node in the resource allocation graph"""
    id: str = Field(..., description="Unique identifier for the node")
    type: NodeType = Field(..., description="Type of node (process or resource)")
    label: str = Field(..., description="Display label for the node")
    instances: int = Field(default=1, ge=1, description="Number of resource instances (only for resources)")
    available: int = Field(default=0, ge=0, description="Available instances (only for resources)")
    
    class Config:
        use_enum_values = True


class Edge(BaseModel):
    """Represents an edge in the resource allocation graph"""
    id: str = Field(..., description="Unique identifier for the edge")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    type: EdgeType = Field(..., description="Type of edge (allocation or request)")
    instances: int = Field(default=1, ge=1, description="Number of instances being allocated/requested")
    
    class Config:
        use_enum_values = True


class GraphState(BaseModel):
    """Complete state of the resource allocation graph"""
    nodes: List[Node] = Field(default_factory=list, description="List of all nodes in the graph")
    edges: List[Edge] = Field(default_factory=list, description="List of all edges in the graph")


class CycleInfo(BaseModel):
    """Information about a detected cycle (deadlock)"""
    exists: bool = Field(..., description="Whether a cycle exists")
    cycle_path: List[str] = Field(default_factory=list, description="Node IDs forming the cycle")
    affected_nodes: List[str] = Field(default_factory=list, description="All nodes involved in the deadlock")
    affected_edges: List[str] = Field(default_factory=list, description="All edges involved in the deadlock")


class SafeSequenceResult(BaseModel):
    """Result of safe sequence calculation (Banker's Algorithm)"""
    is_safe: bool = Field(..., description="Whether the state is safe")
    safe_sequence: List[str] = Field(default_factory=list, description="Safe sequence of process execution")
    message: str = Field(..., description="Human-readable explanation")


class DeadlockAnalysisResult(BaseModel):
    """Complete result of deadlock analysis"""
    has_deadlock: bool = Field(..., description="Whether deadlock is detected")
    cycle_info: Optional[CycleInfo] = Field(None, description="Information about detected cycles")
    wait_for_graph: Dict[str, List[str]] = Field(default_factory=dict, description="Wait-for graph representation")
    message: str = Field(..., description="Human-readable explanation of the result")
    timestamp: str = Field(..., description="Timestamp of the analysis")


class AllocationRequest(BaseModel):
    """Request to allocate resources to a process"""
    process_id: str = Field(..., description="Process requesting resources")
    resource_id: str = Field(..., description="Resource being requested")
    instances: int = Field(..., ge=1, description="Number of instances requested")


class SimulationResult(BaseModel):
    """Result of resource allocation simulation"""
    success: bool = Field(..., description="Whether allocation was successful")
    message: str = Field(..., description="Explanation of the result")
    new_state: Optional[GraphState] = Field(None, description="New graph state after allocation")
    would_cause_deadlock: bool = Field(False, description="Whether this allocation would cause deadlock")
