import axios from 'axios';

describe('GET /api/health', () => {
  it('should report the service as healthy', async () => {
    const res = await axios.get(`/api/health`);

    expect(res.status).toBe(200);
    expect(res.data.status).toBe('ok');
    expect(res.data.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
