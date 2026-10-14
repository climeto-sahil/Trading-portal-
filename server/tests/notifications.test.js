import test from 'node:test';
import assert from 'node:assert/strict';
import { inMemoryDB } from '../config/db.js';
import { renderDealMessage, formatInr } from '../services/notificationTemplateService.js';
import { normalizeRemark } from '../utils/remark.js';
import { enqueueDealEvent, queueDealCreatedNotification } from '../services/dealNotificationService.js';
import { listNotifications, markNotificationRead } from '../controllers/notificationController.js';

function resetDb() {
  inMemoryDB.notifications.docs = [];
  inMemoryDB.deals.docs = [];
  inMemoryDB.transactions.docs = [];
}

const sampleDeal = {
  dealId: 'DEAL-000200',
  status: 'Enquiry',
  createdAt: '2026-10-14T07:30:00.000Z',
  counterPartyId: { name: 'Jay', phone: '919811111111', city: 'Surat' },
  myAgentId: { name: 'Devesh' },
  categories: [{ name: 'Cat 3', type: 'Recycling' }],
};

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
}

test.beforeEach(() => {
  resetDb();
  delete process.env.ZOHO_CLIQ_ZAPIKEY;
  delete process.env.ZOHO_CLIQ_WEBHOOK_BASE_URL;
});

test('deal creation stores exactly one in-app notification', async () => {
  const result = await enqueueDealEvent({
    eventType: 'DEAL_CREATED',
    deal: sampleDeal,
    actor: { _id: 'user-admin', name: 'Admin' },
    transactions: [],
  });
  assert.equal(result.queued, 1);
  assert.equal(inMemoryDB.notifications.docs.length, 1);
  assert.equal(inMemoryDB.notifications.docs[0].readBy[0], 'user-admin');
});

test('remark accepts 1000 characters and rejects longer text', () => {
  assert.equal(normalizeRemark('Pay in 7 days\nGrade A & "special"').ok, true);
  assert.equal(normalizeRemark('x'.repeat(1000)).remark.length, 1000);
  assert.equal(normalizeRemark('x'.repeat(1001)).ok, false);
  assert.equal(normalizeRemark(null).remark, '');
  assert.equal(normalizeRemark(12).ok, false);
});

test('edits do not create a deal-created notification', async () => {
  const result = await enqueueDealEvent({ eventType: 'DEAL_UPDATED', deal: sampleDeal, actor: { name: 'Admin' }, transactions: [] });
  assert.equal(result.queued, 0);
  assert.equal(inMemoryDB.notifications.docs.length, 0);
});

test('duplicate deal creation does not create a second notification', async () => {
  await enqueueDealEvent({ eventType: 'DEAL_CREATED', deal: sampleDeal, actor: { name: 'Admin' }, transactions: [] });
  const second = await enqueueDealEvent({ eventType: 'DEAL_CREATED', deal: sampleDeal, actor: { name: 'Admin' }, transactions: [] });
  assert.equal(second.queued, 0);
  assert.equal(inMemoryDB.notifications.docs.length, 1);
});

test('message uses saved deal fields and omits empty values', () => {
  const { renderedMessage } = renderDealMessage({
    eventType: 'DEAL_CREATED',
    deal: sampleDeal,
    actorName: 'Admin',
    transactions: [{ type: 'Purchase', category: 'Cat 3', materialType: 'Recycling', quantity: 800, unit: 'MT', ratePerKg: 4.1 }],
  });
  assert.match(renderedMessage, /DEAL-000200/);
  assert.match(renderedMessage, /Jay/);
  assert.match(renderedMessage, /Devesh/);
  assert.match(renderedMessage, /Cat 3/);
  assert.match(renderedMessage, /Recycling/);
  assert.match(renderedMessage, /₹32,80,000/);
  assert.equal(renderedMessage.includes('undefined'), false);
  assert.equal(renderedMessage.includes('null'), false);
  assert.equal(renderedMessage.includes('NaN'), false);
  assert.equal(formatInr(3280000), '32,80,000');
  assert.equal(renderedMessage.includes('Remark:'), false);
});

test('remark is included, multiline stays readable, and empty remark is omitted', () => {
  const withRemark = renderDealMessage({
    eventType: 'DEAL_CREATED',
    deal: { ...sampleDeal, remark: 'Pay in 7 days\nGrade A <script>' },
    actorName: 'Admin',
    transactions: [{ type: 'Purchase', category: 'Cat 1', materialType: 'Recycling', quantity: 1, unit: 'MT', ratePerKg: 1 }],
  });
  assert.match(withRemark.renderedMessage, /Remark: Pay in 7 days\nGrade A <script>/);
  const empty = renderDealMessage({
    eventType: 'DEAL_CREATED',
    deal: { ...sampleDeal, remark: '   ' },
    actorName: 'Admin',
    transactions: [],
  });
  assert.equal(empty.renderedMessage.includes('Remark:'), false);
});

test('remark longer than the message limit is truncated', () => {
  const { renderedMessage } = renderDealMessage({
    eventType: 'DEAL_CREATED',
    deal: { ...sampleDeal, remark: 'A'.repeat(1000) },
    actorName: 'Admin',
    transactions: [],
  });
  assert.match(renderedMessage, /Full remark is available in the Trading Portal/);
  assert.equal(renderedMessage.includes('A'.repeat(1000)), false);
});

test('another user sees the notification as unread and can mark it read', async () => {
  await enqueueDealEvent({
    eventType: 'DEAL_CREATED',
    deal: sampleDeal,
    actor: { _id: 'user-admin', name: 'Admin' },
    transactions: [],
  });
  const listRes = mockRes();
  await listNotifications({ user: { _id: 'user-agent', role: 'MY_AGENT' }, query: {} }, listRes);
  assert.equal(listRes.body.unreadCount, 1);
  assert.equal(listRes.body.notifications[0].unread, true);

  const readRes = mockRes();
  await markNotificationRead({
    user: { _id: 'user-agent', role: 'COUNTER_AGENT' },
    params: { id: listRes.body.notifications[0]._id },
  }, readRes);
  assert.equal(readRes.body.notification.unread, false);
});

test('deal creation posts one message to the Zoho Cliq channel', async () => {
  process.env.ZOHO_CLIQ_ZAPIKEY = 'test-key';
  let called = 0;
  let body = '';
  const result = await enqueueDealEvent({
    eventType: 'DEAL_CREATED',
    deal: sampleDeal,
    actor: { _id: 'user-admin', name: 'Admin' },
    transactions: [],
    fetchImpl: async (url, options) => {
      called += 1;
      const parsed = new URL(url);
      assert.equal(parsed.hostname, 'cliq.zoho.in');
      assert.equal(parsed.pathname, '/api/v2/channelsbyname/climetofreshupdate/message');
      assert.equal(parsed.searchParams.get('zapikey'), 'test-key');
      body = options.body;
      return { ok: true, status: 204, text: async () => '' };
    },
  });
  assert.equal(result.queued, 1);
  assert.equal(called, 1);
  assert.match(body, /DEAL-000200/);
  assert.equal(inMemoryDB.notifications.docs[0].zohoStatus, 'sent');
});

test('missing Zoho key does not call Cliq and still keeps the in-app notification', async () => {
  const result = await enqueueDealEvent({
    eventType: 'DEAL_CREATED',
    deal: { ...sampleDeal, dealId: 'DEAL-000204' },
    actor: { name: 'Admin' },
    transactions: [],
    fetchImpl: async () => { throw new Error('should not call Zoho'); },
  });
  assert.equal(result.queued, 1);
  assert.equal(inMemoryDB.notifications.docs[0].zohoStatus, 'failed');
  assert.match(inMemoryDB.notifications.docs[0].zohoError, /ZAPIKEY/i);
});

test('automatic create queues one notification without blocking the caller', async () => {
  queueDealCreatedNotification({ ...sampleDeal, dealId: 'DEAL-000203' }, { _id: 'user-admin', name: 'Admin' });
  assert.equal(inMemoryDB.notifications.docs.length, 0);
  await new Promise((resolve) => setImmediate(resolve));
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(inMemoryDB.notifications.docs.length, 1);
  assert.equal(inMemoryDB.notifications.docs[0].dealId, 'DEAL-000203');
});
