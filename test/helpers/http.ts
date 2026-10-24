import request from 'supertest';

// Loopback connections on some Windows machines are reset ~2% of the time (also with a bare node:http server).
export const http = (base: string) => ({
  get: (p: string) => request(base).get(p).retry(3),
  post: (p: string) => request(base).post(p).retry(3),
});
