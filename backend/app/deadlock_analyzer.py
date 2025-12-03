import networkx as nx
from typing import List, Dict, Set, Optional, Tuple
from datetime import datetime
from .graph_models import (
    GraphState, Node, Edge, EdgeType, NodeType,
    CycleInfo, DeadlockAnalysisResult, SafeSequenceResult
)


class DeadlockAnalyzer:
    """Analyzes resource allocation graphs for deadlocks"""
    
    def __init__(self, graph_state: GraphState):
        self.graph_state = graph_state
        self.nodes_dict = {node.id: node for node in graph_state.nodes}
        self.edges_list = graph_state.edges
        
    def build_directed_graph(self) -> nx.DiGraph:
        """Build a NetworkX directed graph from the graph state"""
        G = nx.DiGraph()
        
        # Add nodes with their types
        for node in self.graph_state.nodes:
            G.add_node(node.id, type=node.type, label=node.label)
        
        # Add edges
        for edge in self.graph_state.edges:
            G.add_edge(edge.source, edge.target, 
                      edge_type=edge.type, 
                      edge_id=edge.id,
                      instances=edge.instances)
        
        return G
    
    def detect_cycle_dfs(self) -> CycleInfo:
        """
        Detect cycles in the resource allocation graph using DFS
        Returns information about any detected cycles
        """
        G = self.build_directed_graph()
        
        try:
            # Find cycles using NetworkX
            cycles = list(nx.simple_cycles(G))
            
            if cycles:
                # Get the first cycle (there might be multiple)
                cycle = cycles[0]
                cycle_path = cycle + [cycle[0]]  # Complete the cycle
                
                # Find all affected edges
                affected_edges = []
                for i in range(len(cycle)):
                    source = cycle[i]
                    target = cycle[(i + 1) % len(cycle)]
                    
                    # Find edges between these nodes
                    for edge in self.edges_list:
                        if edge.source == source and edge.target == target:
                            affected_edges.append(edge.id)
                
                return CycleInfo(
                    exists=True,
                    cycle_path=cycle_path,
                    affected_nodes=cycle,
                    affected_edges=affected_edges
                )
            else:
                return CycleInfo(exists=False)
                
        except Exception as e:
            return CycleInfo(exists=False)
    
    def build_wait_for_graph(self) -> Dict[str, List[str]]:
        """
        Build a wait-for graph from the resource allocation graph.
        In a wait-for graph, there's an edge from P1 to P2 if:
        - P1 is waiting for a resource
        - That resource is allocated to P2
        """
        wait_for = {node.id: [] for node in self.graph_state.nodes if node.type == NodeType.PROCESS}
        
        # Find what each process is waiting for
        process_requests = {}  # process -> list of resources it's requesting
        resource_allocations = {}  # resource -> list of processes it's allocated to
        
        for edge in self.edges_list:
            if edge.type == EdgeType.REQUEST:
                # Process -> Resource (request)
                if edge.source not in process_requests:
                    process_requests[edge.source] = []
                process_requests[edge.source].append(edge.target)
            elif edge.type == EdgeType.ALLOCATION:
                # Resource -> Process (allocation)
                if edge.source not in resource_allocations:
                    resource_allocations[edge.source] = []
                resource_allocations[edge.source].append(edge.target)
        
        # Build wait-for relationships
        for process, requested_resources in process_requests.items():
            for resource in requested_resources:
                # Find which processes have this resource allocated
                if resource in resource_allocations:
                    for holder_process in resource_allocations[resource]:
                        if holder_process != process:
                            wait_for[process].append(holder_process)
        
        return wait_for
    
    def analyze_deadlock(self) -> DeadlockAnalysisResult:
        """
        Perform complete deadlock analysis on the graph
        Returns comprehensive analysis result
        """
        cycle_info = self.detect_cycle_dfs()
        wait_for_graph = self.build_wait_for_graph()
        
        if cycle_info.exists:
            message = f"⚠️ Deadlock detected! Cycle involves: {' → '.join(cycle_info.cycle_path)}"
        else:
            message = "✓ No deadlock detected. System is in a safe state."
        
        return DeadlockAnalysisResult(
            has_deadlock=cycle_info.exists,
            cycle_info=cycle_info if cycle_info.exists else None,
            wait_for_graph=wait_for_graph,
            message=message,
            timestamp=datetime.now().isoformat()
        )
    
    def calculate_safe_sequence(self) -> SafeSequenceResult:
        """
        Calculate safe sequence using Banker's Algorithm approach
        This is a simplified version that works with the RAG model
        """
        processes = [node for node in self.graph_state.nodes if node.type == NodeType.PROCESS]
        resources = [node for node in self.graph_state.nodes if node.type == NodeType.RESOURCE]
        
        if not processes:
            return SafeSequenceResult(
                is_safe=True,
                safe_sequence=[],
                message="No processes in the system"
            )
        
        # Track available resources
        available = {r.id: r.available for r in resources}
        
        # Track allocations and requests for each process
        allocations = {p.id: {} for p in processes}
        requests = {p.id: {} for p in processes}
        
        for edge in self.edges_list:
            if edge.type == EdgeType.ALLOCATION:
                # Resource -> Process
                process_id = edge.target
                resource_id = edge.source
                if process_id in allocations:
                    allocations[process_id][resource_id] = edge.instances
            elif edge.type == EdgeType.REQUEST:
                # Process -> Resource
                process_id = edge.source
                resource_id = edge.target
                if process_id in requests:
                    requests[process_id][resource_id] = edge.instances
        
        # Try to find a safe sequence
        safe_sequence = []
        finished = set()
        work = available.copy()
        
        while len(finished) < len(processes):
            found_process = False
            
            for process in processes:
                if process.id in finished:
                    continue
                
                # Check if this process can finish with available resources
                can_finish = True
                for resource_id, needed in requests[process.id].items():
                    if work.get(resource_id, 0) < needed:
                        can_finish = False
                        break
                
                if can_finish:
                    # Process can finish, release its resources
                    for resource_id, allocated in allocations[process.id].items():
                        work[resource_id] = work.get(resource_id, 0) + allocated
                    
                    safe_sequence.append(process.id)
                    finished.add(process.id)
                    found_process = True
                    break
            
            if not found_process:
                # No process can proceed - unsafe state
                return SafeSequenceResult(
                    is_safe=False,
                    safe_sequence=[],
                    message=f"⚠️ System is in an unsafe state. Cannot find safe sequence. Completed: {safe_sequence}"
                )
        
        return SafeSequenceResult(
            is_safe=True,
            safe_sequence=safe_sequence,
            message=f"✓ Safe sequence found: {' → '.join(safe_sequence)}"
        )


def analyze_graph_for_deadlock(graph_state: GraphState) -> DeadlockAnalysisResult:
    """Helper function to analyze a graph for deadlocks"""
    analyzer = DeadlockAnalyzer(graph_state)
    return analyzer.analyze_deadlock()


def calculate_safe_sequence(graph_state: GraphState) -> SafeSequenceResult:
    """Helper function to calculate safe sequence"""
    analyzer = DeadlockAnalyzer(graph_state)
    return analyzer.calculate_safe_sequence()
