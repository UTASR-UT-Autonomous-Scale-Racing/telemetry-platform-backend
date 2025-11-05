"""
Mock Jetson TCP Server

Simulates a Jetson device streaming telemetry data over TCP for testing purposes.

Protocol:
    - Transport: TCP on port 5001 (configurable by PORT)
    - Format: NDJSON (newline-delimited JSON)
    - Rate: 10 Hz (configurable by FRAME_RATE_HZ)
    - Encoding: Data endcoded in UTF-8 
    
Frame Schema:
    Required fields:
        - t (float): Unix timestamp in seconds
        - sid (str): Session identifier (UUID)
    
    Optional fields: 
        - veh (str): Vehicle ID (e.g., "car_01")
        - s (float): Speed in m/s
        - thr (float): Throttle (0.0-1.0)
        - br (float): Brake (0.0-1.0)
        - x (float): X coordinate (no unit agreement)
        - y (float): Y coordinate (no unit agreement)
        - hdg (float): Heading in radians/degree (no unit agreement)

Usage:
    python simulator/mock_jetson.py
    
    Then connect with: nc localhost 5001 (configurable by PORT)

Note:
    Mock server for testing. Generates simulated telemetry data, data may vary from production.
"""

import asyncio
import json
import time
import random
import uuid


# Constants
HOST = '0.0.0.0'
PORT = 5001
FRAME_RATE_HZ = 10
DECIMAL_RANGE = 2

def generate_frame() -> dict:
    """Generate a single random telemetry frame"""

    return {
        "t": time.time(),
        "sid": str(uuid.uuid4()),
        "veh": "car_01",
        "s": round(random.uniform(0.0, 50.0), DECIMAL_RANGE),
        "thr": round(random.uniform(0.0, 1.0), DECIMAL_RANGE),
        "br": round(random.uniform(0.0, 1.0), DECIMAL_RANGE),
        "x": round(random.uniform(-100.0, 100.0), DECIMAL_RANGE),
        "y": round(random.uniform(-100.0, 100.0), DECIMAL_RANGE),
        "hdg": round(random.uniform(0.0, 360.0), DECIMAL_RANGE)
    }


async def handle_client(_reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
    """Handle a single client connection.
    Continuously sends telemetry frames until client disconnects.
    """
    
    # peername used for logging connecting client's info when connecting and disconnecting
    peername = writer.get_extra_info('peername')
    print(f"[INFO] Client connected: {peername}")
    
    try:
        while True:
            frame = generate_frame()
            
            # Serialize as NDJSON (\n for frame seperation)
            message = json.dumps(frame) + "\n"
            
            writer.write(message.encode('utf-8'))
            await writer.drain()
            
            await asyncio.sleep(1.0 / FRAME_RATE_HZ)
                        
    except ConnectionResetError:
        print(f"[INFO] Client disconnected: {peername}")
    except Exception as e:
        print(f"[ERROR] Error handling client {peername}: {e}")
    finally:
        writer.close()
        await writer.wait_closed()
        print(f"[INFO] Connection closed: {peername}")

async def main() -> None:
    """Start the mock Jetson TCP server."""

    server = await asyncio.start_server(
        handle_client,
        HOST,
        PORT
    )

    print(f"[INFO] Mock Jetson server running on {HOST}:{PORT}")
    print(f"[INFO] Sending frames at {FRAME_RATE_HZ} Hz")
    print(f"[INFO] Connect with: nc localhost {PORT}")

    async with server:
        await server.serve_forever()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("[INFO] Server stopped by user")