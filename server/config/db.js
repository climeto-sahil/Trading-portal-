import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

let isMongooseConnected = false;

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;

  if (uri) {
    try {
      console.log('Connecting to MongoDB via MONGODB_URI...');
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
      console.log('MongoDB connected successfully via MONGODB_URI.');
      
      try {
        await mongoose.connection.collection('users').dropIndex('phone_1');
        console.log('Dropped legacy phone index successfully.');
      } catch (e) {
        // Ignore if it doesn't exist
      }

      isMongooseConnected = true;
      return;
    } catch (err) {
      console.warn('Could not connect to MONGODB_URI:', err.message);
    }
  }

  // Try localhost fallback
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/trading_portal', { serverSelectionTimeoutMS: 1500 });
    console.log('MongoDB connected successfully to local daemon.');
    isMongooseConnected = true;
    return;
  } catch (err) {
    console.log('No local MongoDB daemon detected. Falling back to Local JSON Datastore.');
    isMongooseConnected = false;
    
    // Attempt to load existing local database if present
    const DB_FILE = path.join(process.cwd(), 'local_database.json');
    if (fs.existsSync(DB_FILE)) {
      try {
        const fileData = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
        if (fileData.User) inMemoryDB.users.docs = fileData.User;
        if (fileData.Agent) inMemoryDB.agents.docs = fileData.Agent;
        if (fileData.CounterParty) inMemoryDB.counterParties.docs = fileData.CounterParty;
        if (fileData.Deal) inMemoryDB.deals.docs = fileData.Deal;
        if (fileData.Transaction) inMemoryDB.transactions.docs = fileData.Transaction;

        // Drop orphan transactions whose deal no longer exists (prevents "extra" purchases on reused deal IDs)
        const liveDealIds = new Set(inMemoryDB.deals.docs.map(d => d.dealId));
        const before = inMemoryDB.transactions.docs.length;
        inMemoryDB.transactions.docs = inMemoryDB.transactions.docs.filter(t => liveDealIds.has(t.dealId));
        if (inMemoryDB.transactions.docs.length !== before) {
          console.log(`Cleaned ${before - inMemoryDB.transactions.docs.length} orphan transaction(s).`);
          persistToDisk();
        }

        console.log('Successfully loaded data from local_database.json!');
      } catch (e) {
        console.error('Error loading local_database.json:', e);
      }
    }
  }
};

export const getIsMongooseConnected = () => isMongooseConnected;

// --------------------------------------------------------------------------
// IN-MEMORY DOCUMENT STORE ENGINE WITH JSON PERSISTENCE
// --------------------------------------------------------------------------

let globalDocCounter = 1;

export function persistToDisk() {
  if (isMongooseConnected) return; // Don't write to disk if using real Mongo
  try {
    const DB_FILE = path.join(process.cwd(), 'local_database.json');
    const data = {
      User: inMemoryDB.users.docs,
      Agent: inMemoryDB.agents.docs,
      CounterParty: inMemoryDB.counterParties.docs,
      Deal: inMemoryDB.deals.docs,
      Transaction: inMemoryDB.transactions.docs,
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save to local_database.json', e);
  }
}

class InMemoryCollection {
  constructor(name) {
    this.name = name;
    this.docs = [];
  }

  _generateId() {
    const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0');
    const randomHex = Math.random().toString(16).substring(2, 6);
    const counter = (globalDocCounter++).toString(16).padStart(12, '0');
    return `${timestamp}${randomHex}${counter}`;
  }

  _clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  _matches(doc, query) {
    if (!query || Object.keys(query).length === 0) return true;

    for (const [key, val] of Object.entries(query)) {
      if (key === '$or') {
        const anyMatch = val.some(subQ => this._matches(doc, subQ));
        if (!anyMatch) return false;
        continue;
      }

      if (val && typeof val === 'object') {
        if ('$in' in val) {
          const docVal = doc[key]?.toString();
          const inList = val.$in.map(v => v?.toString());
          if (!inList.includes(docVal)) return false;
          continue;
        }
      }

      const docVal = doc[key];
      if (key === '_id' || key.endsWith('Id') || key.endsWith('AgentId') || key.endsWith('PartyId') || key.endsWith('By')) {
        if (docVal?.toString() !== val?.toString()) return false;
      } else {
        if (docVal !== val) return false;
      }
    }
    return true;
  }

  async countDocuments(query = {}) {
    return this.docs.filter(d => this._matches(d, query)).length;
  }

  async create(data) {
    const isArray = Array.isArray(data);
    const items = isArray ? data : [data];
    const created = [];

    for (const item of items) {
      const doc = this._clone(item);
      if (!doc._id) doc._id = this._generateId();
      doc.createdAt = doc.createdAt || new Date().toISOString();
      doc.updatedAt = new Date().toISOString();

      if (this.name === 'User' && doc.password) {
        if (!doc.password.startsWith('$2a$') && !doc.password.startsWith('$2b$')) {
          const salt = await bcrypt.genSalt(10);
          doc.password = await bcrypt.hash(doc.password, salt);
        }
      }

      this.docs.push(doc);
      created.push(this._wrap(doc));
    }

    persistToDisk();
    return isArray ? created : created[0];
  }

  find(query = {}) {
    const filtered = this.docs.filter(d => this._matches(d, query)).map(d => this._wrap(d));
    return new QueryCursor(filtered, this);
  }

  findOne(query = {}) {
    const doc = this.docs.find(d => this._matches(d, query));
    return new QueryCursorSingle(doc ? this._wrap(doc) : null, this);
  }

  findById(id) {
    if (!id) return new QueryCursorSingle(null, this);
    const doc = this.docs.find(d => d._id?.toString() === id?.toString());
    return new QueryCursorSingle(doc ? this._wrap(doc) : null, this);
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const index = this.docs.findIndex(d => d._id?.toString() === id?.toString());
    if (index === -1) return null;

    const updated = {
      ...this.docs[index],
      ...update,
      updatedAt: new Date().toISOString(),
    };

    if (this.name === 'User' && update.password && !update.password.startsWith('$2a$') && !update.password.startsWith('$2b$')) {
      const salt = await bcrypt.genSalt(10);
      updated.password = await bcrypt.hash(update.password, salt);
    }

    this.docs[index] = updated;
    const wrapped = this._wrap(updated);
    persistToDisk();
    return new QueryCursorSingle(wrapped, this);
  }

  async findOneAndUpdate(query, update, options = {}) {
    const index = this.docs.findIndex(d => this._matches(d, query));
    if (index === -1) return null;
    this.docs[index] = { ...this.docs[index], ...update, updatedAt: new Date().toISOString() };
    persistToDisk();
    return this._wrap(this.docs[index]);
  }

  async findByIdAndDelete(id) {
    const index = this.docs.findIndex(d => d._id?.toString() === id?.toString());
    if (index === -1) return null;
    const removed = this.docs.splice(index, 1)[0];
    persistToDisk();
    return this._wrap(removed);
  }

  async findOneAndDelete(query) {
    const index = this.docs.findIndex(d => this._matches(d, query));
    if (index === -1) return null;
    const removed = this.docs.splice(index, 1)[0];
    persistToDisk();
    return this._wrap(removed);
  }

  async deleteMany(query = {}) {
    const initialLen = this.docs.length;
    this.docs = this.docs.filter(d => !this._matches(d, query));
    persistToDisk();
    return { deletedCount: initialLen - this.docs.length };
  }

  _wrap(rawDoc) {
    if (!rawDoc) return null;
    const doc = { ...rawDoc };

    doc.toObject = function () {
      return { ...doc };
    };

    doc.toJSON = function () {
      return { ...doc };
    };

    doc.save = async () => {
      const idx = this.docs.findIndex(d => d._id === doc._id);
      if (idx !== -1) {
        this.docs[idx] = { ...doc, updatedAt: new Date().toISOString() };
        persistToDisk();
      }
      return doc;
    };

    if (this.name === 'User') {
      doc.comparePassword = async function (candidatePassword) {
        if (!candidatePassword || !doc.password) return false;
        return await bcrypt.compare(candidatePassword, doc.password);
      };
    }

    return doc;
  }
}

class QueryCursor {
  constructor(results, collection) {
    this.results = results || [];
    this.collection = collection;
    this._populateFields = [];
  }

  populate(field) {
    this._populateFields.push(field);
    return this;
  }

  sort(sortCriteria) {
    if (sortCriteria && typeof sortCriteria === 'object') {
      const [key, dir] = Object.entries(sortCriteria)[0];
      this.results.sort((a, b) => {
        if (dir === -1) return (b[key] > a[key] ? 1 : -1);
        return (a[key] > b[key] ? 1 : -1);
      });
    }
    return this;
  }

  select(fields) {
    return this;
  }

  async then(resolve, reject) {
    try {
      const populated = await populateRecords(this.results, this._populateFields);
      resolve(populated);
    } catch (e) {
      if (reject) reject(e);
      else throw e;
    }
  }
}

class QueryCursorSingle {
  constructor(result, collection) {
    this.result = result;
    this.collection = collection;
    this._populateFields = [];
    this._selectFields = null;
  }

  populate(field) {
    this._populateFields.push(field);
    return this;
  }

  select(fields) {
    this._selectFields = fields;
    return this;
  }

  async then(resolve, reject) {
    try {
      if (!this.result) return resolve(null);
      const [populated] = await populateRecords([this.result], this._populateFields);
      resolve(populated);
    } catch (e) {
      if (reject) reject(e);
      else throw e;
    }
  }
}

export const inMemoryDB = {
  users: new InMemoryCollection('User'),
  agents: new InMemoryCollection('Agent'),
  counterParties: new InMemoryCollection('CounterParty'),
  deals: new InMemoryCollection('Deal'),
  transactions: new InMemoryCollection('Transaction'),
};

async function populateRecords(records, fields) {
  if (!fields || fields.length === 0) return records;

  return records.map(rec => {
    const item = { ...rec };
    for (const f of fields) {
      if (f === 'counterPartyId' && item.counterPartyId) {
        const id = item.counterPartyId?._id || item.counterPartyId;
        item.counterPartyId = inMemoryDB.counterParties.docs.find(c => c._id?.toString() === id?.toString()) || item.counterPartyId;
      }
      if (f === 'counterPartyAgentId' && item.counterPartyAgentId) {
        const id = item.counterPartyAgentId?._id || item.counterPartyAgentId;
        item.counterPartyAgentId = inMemoryDB.agents.docs.find(a => a._id?.toString() === id?.toString()) || item.counterPartyAgentId;
      }
      if (f === 'myAgentId' && item.myAgentId) {
        const id = item.myAgentId?._id || item.myAgentId;
        item.myAgentId = inMemoryDB.agents.docs.find(a => a._id?.toString() === id?.toString()) || item.myAgentId;
      }
    }
    return item;
  });
}
