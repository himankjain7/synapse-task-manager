import http from 'http';
import { io as ioc, Socket as ClientSocket } from 'socket.io-client';
import request from 'supertest';
import { app } from '../src/server';
import { initSocketServer, getIo } from '../src/socket';

let testServer: http.Server;
let token1: string;
let token2: string;
let user1Id: string;
let user2Id: string;
let client1: ClientSocket;
let client2: ClientSocket;

const TEST_PORT = 9877;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const WS_URL = `ws://localhost:${TEST_PORT}`;
const PROJECT_ID = 'test-project-e2e';
const TASK_ID = 'test-task-e2e';

function waitForEvent(socket: ClientSocket, event: string, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeout);
    socket.once(event, (payload: any) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

beforeAll(async () => {
  testServer = http.createServer(app);
  initSocketServer(testServer);

  await new Promise<void>((resolve) => testServer.listen(TEST_PORT, resolve));

  const res1 = await request(BASE_URL)
    .post('/api/v1/auth/login')
    .send({ email: 'himank@synapse.dev', password: 'password123' });
  token1 = res1.body.data.token;
  user1Id = res1.body.data.user.id;

  const res2 = await request(BASE_URL)
    .post('/api/v1/auth/login')
    .send({ email: 'alex@synapse.dev', password: 'password123' });
  token2 = res2.body.data.token;
  user2Id = res2.body.data.user.id;

  client1 = ioc(WS_URL, { auth: { token: token1 }, transports: ['websocket'] });
  client2 = ioc(WS_URL, { auth: { token: token2 }, transports: ['websocket'] });

  await Promise.all([
    new Promise<void>((resolve) => client1.on('connect', () => resolve())),
    new Promise<void>((resolve) => client2.on('connect', () => resolve())),
  ]);
});

afterAll(async () => {
  client1?.close();
  client2?.close();
  await new Promise<void>((resolve) => testServer?.close(() => resolve()));
});

describe('Socket Authentication', () => {
  test('rejects connection without token', async () => {
    const badClient = ioc(WS_URL, { auth: {}, transports: ['websocket'] });
    const err = await new Promise<any>((resolve) => badClient.on('connect_error', resolve));
    expect(err.message).toContain('Token required');
    badClient.close();
  });

  test('accepts connection with valid token', () => {
    expect(client1.connected).toBe(true);
    expect(client2.connected).toBe(true);
  });
});

describe('Presence Events', () => {
  test('join:project broadcasts presence:online and returns presence:list', async () => {
    // client2 must be in room first so it receives the broadcast from client1
    client2.emit('join:project', { projectId: PROJECT_ID });
    await delay(200);

    const p2 = waitForEvent(client2, 'presence:online');
    const p1 = waitForEvent(client1, 'presence:list');

    client1.emit('join:project', { projectId: PROJECT_ID });

    const presenceOnline = await p2;
    expect(presenceOnline).toMatchObject({ userId: user1Id });

    const list = await p1;
    expect(list.projectId).toBe(PROJECT_ID);
    expect(list.onlineUserIds).toContain(user1Id);
  });

  test('leave:project broadcasts presence:offline', async () => {
    // Both clients join first, ensure client2 is in room
    client2.emit('join:project', { projectId: PROJECT_ID });
    await delay(200);
    client1.emit('join:project', { projectId: PROJECT_ID });
    await delay(200);

    const p2 = waitForEvent(client2, 'presence:offline');

    client1.emit('leave:project', { projectId: PROJECT_ID });

    const offline = await p2;
    expect(offline).toMatchObject({ userId: user1Id });

    // cleanup
    client2.emit('leave:project', { projectId: PROJECT_ID });
    await delay(100);
  });

  afterAll(async () => {
    client1.emit('leave:project', { projectId: PROJECT_ID });
    client2.emit('leave:project', { projectId: PROJECT_ID });
    await delay(100);
  });
});

describe('Typing Events', () => {
  beforeEach(async () => {
    client1.emit('join:project', { projectId: PROJECT_ID });
    client2.emit('join:project', { projectId: PROJECT_ID });
    await delay(200);
  });

  afterEach(async () => {
    client1.emit('leave:project', { projectId: PROJECT_ID });
    client2.emit('leave:project', { projectId: PROJECT_ID });
    await delay(100);
  });

  test('typing:start broadcasts user:typing with isTyping:true', async () => {
    const p2 = waitForEvent(client2, 'user:typing');

    client1.emit('typing:start', { projectId: PROJECT_ID, taskId: TASK_ID, userName: 'Himank Jain' });

    const payload = await p2;
    expect(payload).toMatchObject({ taskId: TASK_ID, userId: user1Id, isTyping: true });
  });

  test('typing:stop broadcasts user:typing with isTyping:false', async () => {
    client1.emit('typing:start', { projectId: PROJECT_ID, taskId: TASK_ID, userName: 'Himank Jain' });
    await delay(300);

    const p2 = waitForEvent(client2, 'user:typing');

    client1.emit('typing:stop', { projectId: PROJECT_ID, taskId: TASK_ID, userName: 'Himank Jain' });

    const payload = await p2;
    expect(payload).toMatchObject({ taskId: TASK_ID, userId: user1Id, isTyping: false });
  });
});

describe('Viewing Events', () => {
  beforeEach(async () => {
    client1.emit('join:project', { projectId: PROJECT_ID });
    client2.emit('join:project', { projectId: PROJECT_ID });
    await delay(200);
  });

  afterEach(async () => {
    client1.emit('leave:project', { projectId: PROJECT_ID });
    client2.emit('leave:project', { projectId: PROJECT_ID });
    await delay(100);
  });

  test('viewing:task:start broadcasts viewing:task with isViewing:true', async () => {
    const p2 = waitForEvent(client2, 'viewing:task');

    client1.emit('viewing:task:start', { projectId: PROJECT_ID, taskId: TASK_ID, userName: 'Himank Jain' });

    const payload = await p2;
    expect(payload).toMatchObject({ taskId: TASK_ID, userId: user1Id, isViewing: true, userName: 'Himank Jain' });
  });

  test('viewing:task:stop broadcasts viewing:task with isViewing:false', async () => {
    client1.emit('viewing:task:start', { projectId: PROJECT_ID, taskId: TASK_ID, userName: 'Himank Jain' });
    await delay(300);

    const p2 = waitForEvent(client2, 'viewing:task');

    client1.emit('viewing:task:stop', { projectId: PROJECT_ID, taskId: TASK_ID });

    const payload = await p2;
    expect(payload).toMatchObject({ taskId: TASK_ID, userId: user1Id, isViewing: false });
  });
});

describe('Subtask Events (via getIo broadcast)', () => {
  beforeEach(async () => {
    client1.emit('join:project', { projectId: PROJECT_ID });
    client2.emit('join:project', { projectId: PROJECT_ID });
    await delay(200);
  });

  afterEach(async () => {
    client1.emit('leave:project', { projectId: PROJECT_ID });
    client2.emit('leave:project', { projectId: PROJECT_ID });
    await delay(100);
  });

  test('subtask:created received by project members', async () => {
    const p2 = waitForEvent(client2, 'subtask:created');
    const payload = { taskId: TASK_ID, subtask: { id: 'sub-1', title: 'Test subtask', completed: false } };

    getIo().to(`project:${PROJECT_ID}`).emit('subtask:created', payload);

    const received = await p2;
    expect(received).toMatchObject(payload);
  });

  test('subtask:updated received by project members', async () => {
    const p2 = waitForEvent(client2, 'subtask:updated');
    const payload = { taskId: TASK_ID, subtask: { id: 'sub-1', title: 'Updated', completed: true } };

    getIo().to(`project:${PROJECT_ID}`).emit('subtask:updated', payload);

    const received = await p2;
    expect(received).toMatchObject(payload);
  });

  test('subtask:deleted received by project members', async () => {
    const p2 = waitForEvent(client2, 'subtask:deleted');
    const payload = { taskId: TASK_ID, subtaskId: 'sub-1' };

    getIo().to(`project:${PROJECT_ID}`).emit('subtask:deleted', payload);

    const received = await p2;
    expect(received).toMatchObject(payload);
  });
});

describe('Comment Reaction Events (via getIo broadcast)', () => {
  beforeEach(async () => {
    client1.emit('join:project', { projectId: PROJECT_ID });
    client2.emit('join:project', { projectId: PROJECT_ID });
    await delay(200);
  });

  afterEach(async () => {
    client1.emit('leave:project', { projectId: PROJECT_ID });
    client2.emit('leave:project', { projectId: PROJECT_ID });
    await delay(100);
  });

  test('comment:reacted received by project members', async () => {
    const p2 = waitForEvent(client2, 'comment:reacted');
    const payload = { commentId: 'test-comment', reaction: { id: 'r1', emoji: '👍', userId: user1Id } };

    getIo().to(`project:${PROJECT_ID}`).emit('comment:reacted', payload);

    const received = await p2;
    expect(received).toMatchObject(payload);
  });

  test('comment:unreacted received by project members', async () => {
    const p2 = waitForEvent(client2, 'comment:unreacted');
    const payload = { commentId: 'test-comment', userId: user1Id, emoji: '👍' };

    getIo().to(`project:${PROJECT_ID}`).emit('comment:unreacted', payload);

    const received = await p2;
    expect(received).toMatchObject(payload);
  });
});
