import { Notification } from '../models/Notification.js';

function userId(req) {
  return String(req.user?._id || req.user?.id || '');
}

function present(note, currentUserId) {
  const readBy = (note.readBy || []).map(String);
  return {
    _id: note._id,
    dealId: note.dealId || '',
    eventType: note.eventType || '',
    title: note.title || 'New deal created',
    message: note.renderedMessage || '',
    dealType: note.dealType || '',
    counterpartyName: note.counterpartyName || '',
    createdByName: note.createdByName || '',
    createdAt: note.createdAt,
    unread: !readBy.includes(String(currentUserId)),
    zohoStatus: note.zohoStatus || 'pending',
    zohoError: note.zohoError || '',
  };
}

export const listNotifications = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 30, 1), 100);
    const search = String(req.query.search || '').trim().toLowerCase();
    const currentUserId = userId(req);

    const all = await Notification.find({});
    let rows = all.filter((n) => n.eventType === 'DEAL_CREATED' || n.title);
    if (search) {
      rows = rows.filter((n) => {
        const blob = `${n.dealId || ''} ${n.counterpartyName || ''} ${n.createdByName || ''} ${n.renderedMessage || ''}`.toLowerCase();
        return blob.includes(search);
      });
    }
    rows.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const unreadCount = rows.filter((n) => !(n.readBy || []).map(String).includes(currentUserId)).length;
    const total = rows.length;
    const pageRows = rows.slice((page - 1) * limit, page * limit).map((n) => present(n, currentUserId));
    return res.json({ success: true, notifications: pageRows, page, limit, total, unreadCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Could not load notifications.' });
  }
};

export const getNotification = async (req, res) => {
  const note = await Notification.findById(req.params.id);
  if (!note) return res.status(404).json({ success: false, message: 'Notification not found.' });
  return res.json({ success: true, notification: present(note, userId(req)) });
};

export const markNotificationRead = async (req, res) => {
  const note = await Notification.findById(req.params.id);
  if (!note) return res.status(404).json({ success: false, message: 'Notification not found.' });
  const id = userId(req);
  const readBy = (note.readBy || []).map(String);
  if (id && !readBy.includes(id)) {
    note.readBy = [...readBy, id];
    await note.save();
  }
  return res.json({ success: true, notification: present(note, id) });
};

export const markAllNotificationsRead = async (req, res) => {
  const id = userId(req);
  const all = await Notification.find({});
  for (const note of all) {
    const readBy = (note.readBy || []).map(String);
    if (id && !readBy.includes(id)) {
      note.readBy = [...readBy, id];
      await note.save();
    }
  }
  return res.json({ success: true, unreadCount: 0 });
};
