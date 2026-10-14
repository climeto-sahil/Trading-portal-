import { Deal } from '../models/Deal.js';
import { Transaction } from '../models/Transaction.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { renderDealMessage } from './notificationTemplateService.js';
import { sendZohoCliqMessage } from './zohoCliqService.js';

function actorId(actor) {
  return String(actor?._id || actor?.id || '');
}

async function createOnce(payload) {
  const existing = await Notification.findOne({ idempotencyKey: payload.idempotencyKey });
  if (existing) return { notification: existing, created: false };
  const notification = await Notification.create(payload);
  return { notification, created: true };
}

export async function enqueueDealEvent({ eventType, deal, actor, transactions, fetchImpl }) {
  try {
    if (eventType !== 'DEAL_CREATED') return { queued: 0, reason: 'not_in_app_event' };

    let txRows = transactions;
    if (!txRows && deal?.dealId) {
      txRows = await Transaction.find({ dealId: deal.dealId });
    }
    const actorName = actor?.name || '';
    const rendered = renderDealMessage({
      eventType,
      deal,
      actorName,
      transactions: txRows || [],
    });
    const creator = actorId(actor);

    const result = await createOnce({
      dealId: deal?.dealId || '',
      eventType,
      title: 'New deal created',
      dealType: rendered.dealType,
      counterpartyName: rendered.counterpartyName,
      renderedMessage: rendered.renderedMessage,
      createdBy: actor?._id || actor?.id || null,
      createdByName: actorName,
      readBy: creator ? [creator] : [],
      zohoStatus: 'pending',
      zohoError: '',
      idempotencyKey: `${eventType}:${deal?.dealId || 'unknown'}:app`,
    });

    if (result.created) {
      const sent = await sendZohoCliqMessage(rendered.renderedMessage, fetchImpl);
      result.notification.zohoStatus = sent.ok ? 'sent' : 'failed';
      result.notification.zohoError = sent.ok ? '' : sent.message;
      if (typeof result.notification.save === 'function') await result.notification.save();
    }

    return { queued: result.created ? 1 : 0, notifications: [result.notification] };
  } catch (error) {
    console.error('Deal notification enqueue failed:', String(error.message || 'error').slice(0, 200));
    return { queued: 0, error: true };
  }
}

export function queueDealCreatedNotification(deal, actor) {
  setImmediate(() => {
    notifyDealChange('DEAL_CREATED', deal, actor).catch((error) => {
      console.error('Automatic deal notification failed:', String(error.message || 'error').slice(0, 200));
    });
  });
}

export async function notifyDealChange(eventType, dealIdOrDoc, actor) {
  try {
    let deal = dealIdOrDoc;
    if (!deal?.dealId) {
      deal = await Deal.findById(dealIdOrDoc);
    }
    if (deal?._id && !deal.counterPartyId?.name && deal.counterPartyId) {
      const populated = await Deal.findById(deal._id)
        .populate('counterPartyId')
        .populate('counterPartyAgentId')
        .populate('myAgentId');
      if (populated) deal = populated;
    }
    let user = actor;
    if (user && !user.name && user._id) {
      user = await User.findById(user._id);
    }
    return await enqueueDealEvent({ eventType, deal, actor: user });
  } catch (error) {
    console.error('notifyDealChange failed:', String(error.message || 'error').slice(0, 200));
    return { queued: 0, error: true };
  }
}
