// Validation Logic for validating frames the is recived by the TCP client

// Schema for a frame
interface TelemetryFrame {
  t: number;
  sid: string;
  veh?: string;
  s?: number;
  thr?: number;
  br?: number;
  x?: number;
  y?: number;
  hdg?: number;
}

interface ValidateResult {
  valid: boolean;
  frame?: TelemetryFrame;
  error?: string;
}

const MAX_SKEW_SECONDS = 10;

function parseAndValidateFrame(frame: string): ValidateResult {
  let parsedData;

  // Try parsing data
  try {
    parsedData = JSON.parse(frame);
  } catch (err) {
    return {
      valid: false,
      error: `JSON parse error: ${err}`,
    };
  }

  // Check if the data is correct in the first place
  if (!parsedData || typeof parsedData !== 'object') {
    return { valid: false, error: 'Frame must be an object' };
  }

  // Required Fields
  if (typeof parsedData.t !== 'number') {
    return {
      valid: false,
      error: `Frame contains missing or invalid t field`,
    };
  }

  if (typeof parsedData.sid !== 'string') {
    return {
      valid: false,
      error: `Frame contains missing or invalid sid field`,
    };
  }

  // Optional Fields
  if (parsedData.veh && typeof parsedData.veh !== 'string') {
    return {
      valid: false,
      error: `Frame contains invalid veh field`,
    };
  }

  if (parsedData.s && typeof parsedData.s !== 'number') {
    return {
      valid: false,
      error: `Frame contains invalid s field`,
    };
  }

  if (parsedData.thr && typeof parsedData.thr !== 'number') {
    return {
      valid: false,
      error: `Frame contains invalid thr field`,
    };
  }

  if (parsedData.br && typeof parsedData.br !== 'number') {
    return {
      valid: false,
      error: `Frame contains invalid br field`,
    };
  }

  if (parsedData.x && typeof parsedData.x !== 'number') {
    return {
      valid: false,
      error: `Frame contains invalid x field`,
    };
  }

  if (parsedData.y && typeof parsedData.y !== 'number') {
    return {
      valid: false,
      error: `Frame contains invalid y field`,
    };
  }

  if (parsedData.hdg && typeof parsedData.hdg !== 'number') {
    return {
      valid: false,
      error: `Frame contains invalid hdg field`,
    };
  }

  // Reject frames where |t_now − t| exceeds a defined skew threshold (e.g., 10 s).
  const t_now = Date.now() / 1000;
  const skew = Math.abs(t_now - parsedData.t);

  if (skew > MAX_SKEW_SECONDS) {
    return {
      valid: false,
      error: `Timestamp skew too large: ${skew.toFixed(2)}s`,
    };
  }

  return {
    valid: true,
    frame: parsedData as TelemetryFrame,
  };
}

export { TelemetryFrame, ValidateResult, parseAndValidateFrame };
