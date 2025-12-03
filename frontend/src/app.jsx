import React, { useState, useCallback, useRef } from 'react';
import ReactFlow, {
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { analyzeDeadlock, calculateSafeSequence } from './api.js';
import './app.css';

// Custom node components
const ProcessNode = ({ data }) => {
    return (
        <div className="custom-node process-node">
            <div className="node-header">
                <span className="node-icon">⚙️</span>
                <span className="node-label">{data.label}</span>
            </div>
            <div className="node-badge">
                <span className="badge badge-process">Process</span>
            </div>
        </div>
    );
};

const ResourceNode = ({ data }) => {
    return (
        <div className="custom-node resource-node">
            <div className="node-header">
                <span className="node-icon">📦</span>
                <span className="node-label">{data.label}</span>
            </div>
            <div className="node-info">
                <span className="info-item">Total: {data.instances || 1}</span>
                <span className="info-item">Available: {data.available || 0}</span>
            </div>
            <div className="node-badge">
                <span className="badge badge-resource">Resource</span>
            </div>
        </div>
    );
};

const nodeTypes = {
    process: ProcessNode,
    resource: ResourceNode,
};

function App() {
    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [nodeIdCounter, setNodeIdCounter] = useState(1);
    const [edgeType, setEdgeType] = useState('request');
    const [analysisResult, setAnalysisResult] = useState(null);
    const [safeSequence, setSafeSequence] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [notification, setNotification] = useState(null);

    const connectingNodeId = useRef(null);

    // Add notification helper
    const showNotification = (message, type = 'info') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 5000);
    };

    // Add a new process node
    const addProcess = useCallback(() => {
        const id = `P${nodeIdCounter}`;
        const newNode = {
            id,
            type: 'process',
            position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
            data: { label: id, type: 'process' },
        };
        setNodes((nds) => [...nds, newNode]);
        setNodeIdCounter((c) => c + 1);
        showNotification(`Process ${id} added`, 'success');
    }, [nodeIdCounter, setNodes]);

    // Add a new resource node
    const addResource = useCallback(() => {
        const id = `R${nodeIdCounter}`;
        const newNode = {
            id,
            type: 'resource',
            position: { x: Math.random() * 400 + 100, y: Math.random() * 300 + 100 },
            data: {
                label: id,
                type: 'resource',
                instances: 1,
                available: 1,
            },
        };
        setNodes((nds) => [...nds, newNode]);
        setNodeIdCounter((c) => c + 1);
        showNotification(`Resource ${id} added`, 'success');
    }, [nodeIdCounter, setNodes]);

    // Handle edge connection
    const onConnect = useCallback(
        (params) => {
            const sourceNode = nodes.find(n => n.id === params.source);
            const targetNode = nodes.find(n => n.id === params.target);

            // Determine edge type based on node types
            let connectionType = edgeType;
            let edgeColor = edgeType === 'allocation' ? 'var(--color-allocation)' : 'var(--color-request)';

            // Auto-detect edge type
            if (sourceNode?.data.type === 'process' && targetNode?.data.type === 'resource') {
                connectionType = 'request';
                edgeColor = 'var(--color-request)';
            } else if (sourceNode?.data.type === 'resource' && targetNode?.data.type === 'process') {
                connectionType = 'allocation';
                edgeColor = 'var(--color-allocation)';
            }

            const newEdge = {
                ...params,
                id: `e${params.source}-${params.target}-${Date.now()}`,
                type: 'smoothstep',
                animated: connectionType === 'request',
                label: connectionType === 'allocation' ? 'allocated' : 'requesting',
                style: { stroke: edgeColor, strokeWidth: 2 },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edgeColor,
                },
                data: {
                    edgeType: connectionType,
                    instances: 1,
                },
            };

            setEdges((eds) => addEdge(newEdge, eds));
            showNotification(`${connectionType === 'allocation' ? 'Allocation' : 'Request'} edge created`, 'success');
        },
        [nodes, edges, edgeType, setEdges]
    );

    // Convert to API format
    const convertToApiFormat = () => {
        const apiNodes = nodes.map(node => ({
            id: node.id,
            type: node.data.type,
            label: node.data.label,
            instances: node.data.instances || 1,
            available: node.data.available || 0,
        }));

        const apiEdges = edges.map(edge => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
            type: edge.data?.edgeType || 'request',
            instances: edge.data?.instances || 1,
        }));

        return { nodes: apiNodes, edges: apiEdges };
    };

    // Analyze for deadlock
    const handleAnalyzeDeadlock = async () => {
        if (nodes.length === 0) {
            showNotification('Please add some nodes first!', 'warning');
            return;
        }

        setIsAnalyzing(true);
        try {
            const graphData = convertToApiFormat();
            const result = await analyzeDeadlock(graphData);
            setAnalysisResult(result);

            // Highlight deadlock cycle if found
            if (result.has_deadlock && result.cycle_info) {
                const cycleNodeIds = new Set(result.cycle_info.affected_nodes);
                const cycleEdgeIds = new Set(result.cycle_info.affected_edges);

                setNodes((nds) =>
                    nds.map((node) => ({
                        ...node,
                        style: cycleNodeIds.has(node.id)
                            ? {
                                ...node.style,
                                boxShadow: '0 0 20px var(--color-deadlock)',
                                border: '3px solid var(--color-deadlock)',
                            }
                            : node.style,
                    }))
                );

                setEdges((eds) =>
                    eds.map((edge) => ({
                        ...edge,
                        style: cycleEdgeIds.has(edge.id)
                            ? { stroke: 'var(--color-deadlock)', strokeWidth: 4 }
                            : edge.style,
                        animated: cycleEdgeIds.has(edge.id) ? true : edge.animated,
                    }))
                );

                showNotification('⚠️ Deadlock detected!', 'danger');
            } else {
                showNotification('✓ No deadlock detected', 'success');
            }
        } catch (error) {
            showNotification(`Error: ${error.message}`, 'danger');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Calculate safe sequence
    const handleSafeSequence = async () => {
        if (nodes.length === 0) {
            showNotification('Please add some nodes first!', 'warning');
            return;
        }

        setIsAnalyzing(true);
        try {
            const graphData = convertToApiFormat();
            const result = await calculateSafeSequence(graphData);
            setSafeSequence(result);
            showNotification(result.is_safe ? '✓ Safe sequence found' : '⚠️ No safe sequence', result.is_safe ? 'success' : 'warning');
        } catch (error) {
            showNotification(`Error: ${error.message}`, 'danger');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Clear highlighting
    const clearHighlighting = () => {
        setNodes((nds) =>
            nds.map((node) => ({
                ...node,
                style: {},
            }))
        );

        setEdges((eds) =>
            eds.map((edge) => ({
                ...edge,
                style: {
                    stroke: edge.data?.edgeType === 'allocation' ? 'var(--color-allocation)' : 'var(--color-request)',
                    strokeWidth: 2,
                },
                animated: edge.data?.edgeType === 'request',
            }))
        );

        setAnalysisResult(null);
        setSafeSequence(null);
        showNotification('Highlighting cleared', 'info');
    };

    // Clear all
    const clearAll = () => {
        setNodes([]);
        setEdges([]);
        setAnalysisResult(null);
        setSafeSequence(null);
        setNodeIdCounter(1);
        showNotification('Graph cleared', 'info');
    };

    // Load sample deadlock scenario
    const loadSampleDeadlock = () => {
        const sampleNodes = [
            {
                id: 'P1',
                type: 'process',
                position: { x: 100, y: 200 },
                data: { label: 'P1', type: 'process' },
            },
            {
                id: 'P2',
                type: 'process',
                position: { x: 400, y: 200 },
                data: { label: 'P2', type: 'process' },
            },
            {
                id: 'R1',
                type: 'resource',
                position: { x: 100, y: 50 },
                data: { label: 'R1', type: 'resource', instances: 1, available: 0 },
            },
            {
                id: 'R2',
                type: 'resource',
                position: { x: 400, y: 50 },
                data: { label: 'R2', type: 'resource', instances: 1, available: 0 },
            },
        ];

        const sampleEdges = [
            {
                id: 'e1',
                source: 'R1',
                target: 'P1',
                type: 'smoothstep',
                label: 'allocated',
                style: { stroke: 'var(--color-allocation)', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-allocation)' },
                data: { edgeType: 'allocation', instances: 1 },
            },
            {
                id: 'e2',
                source: 'P1',
                target: 'R2',
                type: 'smoothstep',
                animated: true,
                label: 'requesting',
                style: { stroke: 'var(--color-request)', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-request)' },
                data: { edgeType: 'request', instances: 1 },
            },
            {
                id: 'e3',
                source: 'R2',
                target: 'P2',
                type: 'smoothstep',
                label: 'allocated',
                style: { stroke: 'var(--color-allocation)', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-allocation)' },
                data: { edgeType: 'allocation', instances: 1 },
            },
            {
                id: 'e4',
                source: 'P2',
                target: 'R1',
                type: 'smoothstep',
                animated: true,
                label: 'requesting',
                style: { stroke: 'var(--color-request)', strokeWidth: 2 },
                markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-request)' },
                data: { edgeType: 'request', instances: 1 },
            },
        ];

        setNodes(sampleNodes);
        setEdges(sampleEdges);
        setNodeIdCounter(3);
        showNotification('Sample deadlock scenario loaded', 'info');
    };

    return (
        <div className="app-container">
            {/* Header */}
            <header className="app-header">
                <div className="header-content">
                    <h1 className="app-title">
                        <span className="title-icon">🔄</span>
                        Deadlock Analyzer
                    </h1>
                    <p className="app-subtitle">Resource Allocation Graph Simulator</p>
                </div>
            </header>

            {/* Main Content */}
            <div className="main-content">
                {/* Toolbar */}
                <div className="toolbar">
                    <div className="toolbar-section">
                        <h3 className="toolbar-title">Add Nodes</h3>
                        <div className="button-group">
                            <button onClick={addProcess} className="btn-primary">
                                ⚙️ Add Process
                            </button>
                            <button onClick={addResource} className="btn-primary">
                                📦 Add Resource
                            </button>
                        </div>
                    </div>

                    <div className="toolbar-section">
                        <h3 className="toolbar-title">Analysis</h3>
                        <div className="button-group flex-col">
                            <button
                                onClick={handleAnalyzeDeadlock}
                                className="btn-success"
                                disabled={isAnalyzing}
                            >
                                🔍 Analyze Deadlock
                            </button>
                            <button
                                onClick={handleSafeSequence}
                                className="btn-warning"
                                disabled={isAnalyzing}
                            >
                                📊 Safe Sequence
                            </button>
                            <button
                                onClick={clearHighlighting}
                                className="btn-secondary"
                            >
                                ✨ Clear Highlighting
                            </button>
                        </div>
                    </div>

                    <div className="toolbar-section">
                        <h3 className="toolbar-title">Actions</h3>
                        <div className="button-group flex-col">
                            <button onClick={loadSampleDeadlock} className="btn-secondary">
                                📝 Load Sample
                            </button>
                            <button onClick={clearAll} className="btn-danger">
                                🗑️ Clear All
                            </button>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="toolbar-section legend">
                        <h3 className="toolbar-title">Legend</h3>
                        <div className="legend-items">
                            <div className="legend-item">
                                <div className="legend-color" style={{ background: 'var(--color-process)' }}></div>
                                <span>Process</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-color" style={{ background: 'var(--color-resource)' }}></div>
                                <span>Resource</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-color" style={{ background: 'var(--color-allocation)' }}></div>
                                <span>Allocation</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-color" style={{ background: 'var(--color-request)' }}></div>
                                <span>Request</span>
                            </div>
                            <div className="legend-item">
                                <div className="legend-color" style={{ background: 'var(--color-deadlock)' }}></div>
                                <span>Deadlock</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Graph Canvas */}
                <div className="graph-container">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        nodeTypes={nodeTypes}
                        fitView
                        attributionPosition="bottom-left"
                    >
                        <Controls />
                        <MiniMap
                            nodeColor={(node) => {
                                return node.type === 'process' ? 'var(--color-process)' : 'var(--color-resource)';
                            }}
                        />
                        <Background variant="dots" gap={16} size={1} />
                    </ReactFlow>
                </div>

                {/* Results Panel */}
                <div className="results-panel">
                    <h3 className="panel-title">Analysis Results</h3>

                    {analysisResult && (
                        <div className="result-card animate-fadeIn">
                            <h4 className="result-title">Deadlock Detection</h4>
                            <p className={`result-message ${analysisResult.has_deadlock ? 'danger' : 'success'}`}>
                                {analysisResult.message}
                            </p>
                            {analysisResult.cycle_info && (
                                <div className="cycle-info">
                                    <p><strong>Cycle Path:</strong></p>
                                    <p className="cycle-path">
                                        {analysisResult.cycle_info.cycle_path.join(' → ')}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {safeSequence && (
                        <div className="result-card animate-fadeIn">
                            <h4 className="result-title">Safe Sequence (Banker's Algorithm)</h4>
                            <p className={`result-message ${safeSequence.is_safe ? 'success' : 'warning'}`}>
                                {safeSequence.message}
                            </p>
                            {safeSequence.safe_sequence && safeSequence.safe_sequence.length > 0 && (
                                <div className="safe-sequence">
                                    {safeSequence.safe_sequence.map((proc, idx) => (
                                        <span key={proc} className="sequence-item">
                                            {proc}
                                            {idx < safeSequence.safe_sequence.length - 1 && ' → '}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {!analysisResult && !safeSequence && (
                        <div className="empty-state">
                            <p>Run analysis to see results here</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Notification */}
            {notification && (
                <div className={`notification notification-${notification.type} animate-fadeIn`}>
                    {notification.message}
                </div>
            )}
        </div>
    );
}

export default App;
