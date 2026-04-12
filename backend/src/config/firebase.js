const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let db;

const localStoragePath = path.resolve(__dirname, '../../backend-local-db.json');

const saveLocalDb = (data) => {
  try {
    fs.writeFileSync(localStoragePath, JSON.stringify(data, null, 2));
  } catch (err) {
    console.warn('Could not write local backend data file:', err.message);
  }
};

const createLocalFirestore = () => {
  let data = {};
  try {
    if (!fs.existsSync(localStoragePath)) {
      fs.writeFileSync(localStoragePath, '{}');
    }
    data = JSON.parse(fs.readFileSync(localStoragePath, 'utf8') || '{}');
  } catch (err) {
    console.warn('Could not read local backend data file, starting fresh.', err.message);
    data = {};
  }

  const snapshotFromArray = (items) => ({
    docs: items.map((item) => ({
      id: item.id,
      data: () => item.data,
    })),
  });

  const applyWhere = (items, field, op, value) => {
    if (op !== '==') return items;
    return items.filter((item) => item.data[field] === value);
  };

  const applyOrderBy = (items, field, direction) => {
    return [...items].sort((a, b) => {
      const left = a.data[field];
      const right = b.data[field];
      if (left === right) return 0;
      const compare = left > right ? 1 : -1;
      return direction === 'desc' ? -compare : compare;
    });
  };

  const buildQuery = (collectionName, clauses = [], order = null, limit = null) => {
    const collectionData = () => Object.entries(data[collectionName] || {}).map(([id, docData]) => ({ id, data: docData }));

    const query = {
      where: (field, op, value) => buildQuery(collectionName, [...clauses, { field, op, value }], order, limit),
      orderBy: (field, direction = 'asc') => buildQuery(collectionName, clauses, { field, direction }, limit),
      limit: (count) => buildQuery(collectionName, clauses, order, count),
      get: async () => {
        let items = collectionData();
        clauses.forEach(({ field, op, value }) => {
          items = applyWhere(items, field, op, value);
        });
        if (order) {
          items = applyOrderBy(items, order.field, order.direction);
        }
        if (limit != null) {
          items = items.slice(0, limit);
        }
        return snapshotFromArray(items);
      },
    };
    return query;
  };

  const collection = (collectionName) => {
    const ensure = () => {
      if (!data[collectionName]) data[collectionName] = {};
      return data[collectionName];
    };

    return {
      doc: (docId) => ({
        get: async () => {
          const collectionData = ensure();
          const exists = !!collectionData[docId];
          return {
            exists,
            id: docId,
            data: () => collectionData[docId],
          };
        },
        set: async (payload) => {
          ensure()[docId] = payload;
          saveLocalDb(data);
          return;
        },
        update: async (payload) => {
          const collectionData = ensure();
          if (!collectionData[docId]) {
            throw new Error('Document does not exist');
          }
          collectionData[docId] = { ...collectionData[docId], ...payload };
          saveLocalDb(data);
          return;
        },
      }),
      get: async () => buildQuery(collectionName).get(),
      where: (field, op, value) => buildQuery(collectionName, [{ field, op, value }], null, null),
    };
  };

  return { collection };
};

const initFirebase = () => {
  if (!db) {
    if (
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ) {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          }),
        });
      }
      db = admin.firestore();
    } else {
      console.warn('Firebase credentials not found. Falling back to local backend storage.');
      db = createLocalFirestore();
    }
  }
  return db;
};

const getDb = () => {
  if (!db) initFirebase();
  return db;
};

module.exports = { initFirebase, getDb };