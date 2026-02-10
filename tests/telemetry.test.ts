import { postTelemetry } from '../src/controllers/telemetryController.js';
import * as influxService from '../src/services/influxService.js';
import { telemetryStreamService } from '../src/services/telemetryStreamService.js';

// Mock Res/Req
const createMockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('telemetryController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('postTelemetry', () => {
    it('returns 200 and broadcasts for valid data', async () => {
      const payload = {
        vehicle_id: 'car_1',
        timestamp: Date.now() / 1000,
        pose: { x: 1, z: 2 },
        control: { throttle: 0.5, steering: 0.1 },
        sensors: { battery: 12.5 }
      };

      const req: any = { body: payload };
      const res = createMockRes();

      const writeSpy = jest.spyOn(influxService, 'writeTelemetryPayload').mockImplementation(() => {});
      const broadcastSpy = jest.spyOn(telemetryStreamService, 'broadcast').mockImplementation(() => {});

      await postTelemetry(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(writeSpy).toHaveBeenCalled();
      expect(broadcastSpy).toHaveBeenCalled();
    });

    it('returns 400 for invalid data (missing vehicle_id)', async () => {
      const req: any = { body: { timestamp: Date.now() / 1000 } };
      const res = createMockRes();

      await postTelemetry(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });

    it('returns 400 for stale timestamp', async () => {
      const req: any = { body: { vehicle_id: 'car_1', timestamp: 1000 } }; // Way in the past
      const res = createMockRes();

      await postTelemetry(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringMatching(/Timestamp skew/) }));
    });
  });
});
