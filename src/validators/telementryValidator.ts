// Validation Logic for validating frames received by the HTTP endpoint

// Schema for the new telemetry payload
interface TelemetryPayload {
  vehicle_id: string;
  timestamp: number;
  pose?: {
    x: number;
    z: number;
  };
  trajectory?: number[][];
  control?: {
    steering: number;
    throttle: number;
  };
  track?: {
    outer: number[][];
    inner: number[][];
  };
  serverReceiveTime?: number;
}

interface ValidateResult {
  valid: boolean;
  payload?: TelemetryPayload;
  error?: string;
}

const MAX_SKEW_SECONDS = 10;

function validateHttpTelemetry(data: any): ValidateResult {
  // Check if the data is an object
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Payload must be an object' };
  }

  // Required Fields
  if (typeof data.vehicle_id !== 'string') {
    return { valid: false, error: 'Missing or invalid vehicle_id' };
  }

  if (typeof data.timestamp !== 'number') {
    return { valid: false, error: 'Missing or invalid timestamp' };
  }

  // Validate Timestamp Skew
  const t_now = Date.now() / 1000;
  const skew = Math.abs(t_now - data.timestamp);

  if (skew > MAX_SKEW_SECONDS) {
    return {
      valid: false,
      error: `Timestamp skew too large: ${skew.toFixed(2)}s`,
    };
  }

  // Validate Optional Nested Structures (Basic Type Checks)
  if (data.pose) {
    if (typeof data.pose.x !== 'number' || typeof data.pose.z !== 'number') {
      return { valid: false, error: 'Invalid pose structure' };
    }
  }

  if (data.control) {
    if (typeof data.control.steering !== 'number' || typeof data.control.throttle !== 'number') {
      return { valid: false, error: 'Invalid control structure' };
    }
  }

  // Pass through remaining optional arrays (trajectory, track) without deep validation for performance,
  // or add deeper validation if strictness is required. For now, we assume they are arrays if present.
  if (data.trajectory && !Array.isArray(data.trajectory)) {
      return { valid: false, error: 'Invalid trajectory format' };
  }
  
  if (data.track) {
      if (data.track.outer && !Array.isArray(data.track.outer)) return { valid: false, error: 'Invalid track outer boundary' };
      if (data.track.inner && !Array.isArray(data.track.inner)) return { valid: false, error: 'Invalid track inner boundary' };
  }

  return {
    valid: true,
    payload: data as TelemetryPayload,
  };
}

export { TelemetryPayload, ValidateResult, validateHttpTelemetry };
