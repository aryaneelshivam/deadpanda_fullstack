const API_BASE_URL = '/api';

/**
 * Analyze a resource allocation graph for deadlocks
 */
export async function analyzeDeadlock(graphData) {
  try {
    const response = await fetch(`${API_BASE_URL}/analyze-deadlock`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to analyze deadlock');
    }

    return await response.json();
  } catch (error) {
    console.error('Error analyzing deadlock:', error);
    throw error;
  }
}

/**
 * Calculate safe sequence using Banker's Algorithm
 */
export async function calculateSafeSequence(graphData) {
  try {
    const response = await fetch(`${API_BASE_URL}/safe-sequence`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to calculate safe sequence');
    }

    return await response.json();
  } catch (error) {
    console.error('Error calculating safe sequence:', error);
    throw error;
  }
}

/**
 * Simulate a resource allocation
 */
export async function simulateAllocation(graphState, allocationRequest) {
  try {
    const response = await fetch(`${API_BASE_URL}/simulate-allocation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        graph_state: graphState,
        allocation_request: allocationRequest,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to simulate allocation');
    }

    return await response.json();
  } catch (error) {
    console.error('Error simulating allocation:', error);
    throw error;
  }
}

/**
 * Check API health
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return await response.json();
  } catch (error) {
    console.error('Error checking health:', error);
    throw error;
  }
}
