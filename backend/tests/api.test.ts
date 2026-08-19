import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { jsonStore } from '../src/storage/jsonStore.js';
import { pipelineMutex } from '../src/orchestrator/mutex.js';

describe('US-3.1 - US-3.7: REST API Server & Multi-Tenant Endpoints', () => {
  const aliceEmail = 'alice@example.com';
  const bobEmail = 'bob@example.com';

  beforeEach(() => {
    // Reset any in-memory mutex locks
  });

  describe('Health Endpoint', () => {
    it('GET /api/health returns 200 OK', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('US-3.1: Authentication & Identity Endpoints', () => {
    it('POST /api/auth/login creates and returns a user profile', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ name: 'Alice Author', email: aliceEmail });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(aliceEmail);
      expect(res.body.user.name).toBe('Alice Author');
    });

    it('POST /api/auth/login rejects invalid emails with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ name: 'Invalid User', email: 'notanemail' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid email/i);
    });

    it('GET /api/auth/me returns current user profile when x-user-email is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('x-user-email', aliceEmail);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(aliceEmail);
    });

    it('GET /api/auth/me rejects requests missing x-user-email with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/unauthorized/i);
    });
  });

  describe('US-3.2 & US-3.3: Project Management CRUD & Multi-Tenant Isolation', () => {
    let aliceProjectId: string;

    it('POST /api/projects creates a new project for authenticated user', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('x-user-email', aliceEmail)
        .send({
          title: 'The Wind in the Willows',
          bookText: 'The Mole had been working very hard all the morning spring-cleaning...',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^proj_/);
      expect(res.body.title).toBe('The Wind in the Willows');
      expect(res.body.status).toBe('CREATED');
      expect(res.body.stepState).toBe('IDLE');

      aliceProjectId = res.body.id;
    });

    it('POST /api/projects validates required fields with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('x-user-email', aliceEmail)
        .send({ title: '', bookText: '' });

      expect(res.status).toBe(400);
    });

    it('GET /api/projects returns only projects belonging to current user', async () => {
      // Create project for Bob
      await request(app)
        .post('/api/projects')
        .set('x-user-email', bobEmail)
        .send({ title: "Bob's Book", bookText: 'Once upon a time...' });

      // Alice lists projects
      const res = await request(app)
        .get('/api/projects')
        .set('x-user-email', aliceEmail);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((p: { title: string }) => p.title === "Bob's Book")).toBe(false);
    });

    it('GET /api/projects/:id allows owner to view project details', async () => {
      const createRes = await request(app)
        .post('/api/projects')
        .set('x-user-email', aliceEmail)
        .send({ title: 'Alice Single Project', bookText: 'Text...' });

      const res = await request(app)
        .get(`/api/projects/${createRes.body.id}`)
        .set('x-user-email', aliceEmail);

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Alice Single Project');
    });

    it('US-3.3: GET /api/projects/:id rejects unauthorized tenant access with 403 Forbidden', async () => {
      const createRes = await request(app)
        .post('/api/projects')
        .set('x-user-email', aliceEmail)
        .send({ title: 'Alice Secret Project', bookText: 'Top secret manuscript...' });

      // Bob attempts to view Alice's project
      const res = await request(app)
        .get(`/api/projects/${createRes.body.id}`)
        .set('x-user-email', bobEmail);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/forbidden/i);
    });
  });

  describe('US-3.4 & US-3.5: Pipeline Step Execution & Recovery Endpoints', () => {
    let projectId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('x-user-email', aliceEmail)
        .send({
          title: 'Pipeline API Test Book',
          bookText: 'The Mole and Water Rat explored the winding riverbank on a warm sunny day...',
        });
      projectId = res.body.id;
    });

    it('POST /api/projects/:id/step/:stepKey rejects invalid step names with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/step/UNKNOWN_STEP`)
        .set('x-user-email', aliceEmail);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/invalid step key/i);
    });

    it('POST /api/projects/:id/step/:stepKey enforces tenant ownership with 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/step/STYLE`)
        .set('x-user-email', bobEmail);

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/forbidden/i);
    });

    it('POST /api/projects/:id/step/:stepKey rejects out-of-order execution with 400 Bad Request', async () => {
      // Step 2 without Step 1
      const res = await request(app)
        .post(`/api/projects/${projectId}/step/CHARACTERS`)
        .set('x-user-email', aliceEmail);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/must be completed before/i);
    });

    it('POST /api/projects/:id/step/:stepKey executes Step 1 (Style) successfully', async () => {
      const res = await request(app)
        .post(`/api/projects/${projectId}/step/STYLE`)
        .set('x-user-email', aliceEmail)
        .send({ customStyle: 'Storybook Classic' });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('STYLE_SET');
      expect(res.body.style).toContain('Storybook Classic');
    });

    it('POST /api/projects/:id/step/:stepKey returns 409 Conflict if step is already locked', async () => {
      // Artificially lock the project mutex
      pipelineMutex.acquireLock(projectId);

      const res = await request(app)
        .post(`/api/projects/${projectId}/step/STYLE`)
        .set('x-user-email', aliceEmail);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('CONFLICT');

      pipelineMutex.releaseLock(projectId);
    });

    it('POST /api/projects/:id/recover unlocks stranded state and returns 200 OK', async () => {
      // Simulate stranded state
      await jsonStore.startStep(projectId, 'STYLE');
      pipelineMutex.acquireLock(projectId);

      const res = await request(app)
        .post(`/api/projects/${projectId}/recover`)
        .set('x-user-email', aliceEmail);

      expect(res.status).toBe(200);
      expect(res.body.stepState).toBe('IDLE');
      expect(pipelineMutex.isLocked(projectId)).toBe(false);
    });
  });

  describe('US-3.6: Public Static Asset Streaming', () => {
    it('GET /api/projects/:id/assets/:filename serves generated PNG images without auth headers', async () => {
      const createRes = await request(app)
        .post('/api/projects')
        .set('x-user-email', aliceEmail)
        .send({ title: 'Asset Streaming Book', bookText: 'Book text...' });

      const projId = createRes.body.id;
      const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      await jsonStore.saveProjectAsset(projId, 'portrait_1.png', fakePng);

      // Public request without any auth header
      const res = await request(app).get(`/api/projects/${projId}/assets/portrait_1.png`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toBe('image/png');
    });

    it('GET /api/projects/:id/assets/:filename returns 404 for missing image files', async () => {
      const res = await request(app).get('/api/projects/proj_fake/assets/missing.png');
      expect(res.status).toBe(404);
    });
  });
});
