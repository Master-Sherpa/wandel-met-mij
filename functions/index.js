const functions = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { Resend } = require('resend');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

admin.initializeApp();

const resendApiKey = defineSecret('RESEND_API_KEY');
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
const storageFile = path.join(__dirname, '.firebase-auth-storage.json');
const corsHandler = cors({ origin: true });

function loadStorage() {
  try {
    if (fs.existsSync(storageFile)) {
      return JSON.parse(fs.readFileSync(storageFile, 'utf8'));
    }
  } catch (error) {
    console.error('loadStorage error:', error);
  }
  return { codes: {}, accounts: {}, rateLimit: {}, syncData: {} };
}

function saveStorage(data) {
  try {
    fs.writeFileSync(storageFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('saveStorage error:', error);
  }
}

const db = admin.firestore();

function buildEmailHtml(code) {
  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 500px; margin: 0 auto; background: #0c1f31; border-radius: 12px; padding: 40px; color: #fff; text-align: center; }
    h1 { color: #f0a500; margin-bottom: 10px; }
    .code { font-size: 42px; font-weight: bold; letter-spacing: 8px; color: #f0a500; background: rgba(240, 165, 0, 0.1); padding: 20px; border-radius: 8px; margin: 30px 0; }
    .footer { color: #7ab8d4; font-size: 14px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🚶 Wandel met Mij</h1>
    <p>Je inlogcode:</p>
    <div class="code">${code}</div>
    <p>Deze code is 10 minuten geldig.</p>
    <p class="footer">Deel deze code met niemand.<br>Als je deze email niet verwacht, kun je hem negeren.</p>
  </div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════
// sendCode
// ═══════════════════════════════════════════════════════════════
exports.sendCode = functions
  .runWith({ secrets: [resendApiKey] })
  .https.onRequest((req, res) => {
    corsHandler(req, res, async () => {
      if (req.method === 'OPTIONS') { res.status(200).send(''); return; }
      if (req.method !== 'POST') { res.status(400).json({ error: 'POST required' }); return; }

      const { email } = req.body;
      if (!email || !email.includes('@')) {
        res.status(400).json({ error: 'Valid email required' });
        return;
      }
      const normalizedEmail = email.toLowerCase().trim();

      try {
        const now = Date.now();
        const oneHourAgo = now - 3600000;

        if (isEmulator) {
          const storage = loadStorage();
          const recentAttempts = (storage.rateLimit[normalizedEmail] || []).filter(t => t > oneHourAgo);
          if (recentAttempts.length >= 3) {
            res.status(429).json({ error: 'Too many code requests. Try again in 15 minutes.' });
            return;
          }
          storage.rateLimit[normalizedEmail] = [...recentAttempts, now];
          const code = String(Math.floor(100000 + Math.random() * 900000));
          const codeExpiry = now + 600000;
          storage.codes[normalizedEmail] = { code, expiresAt: codeExpiry, attempts: 0, createdAt: new Date().toISOString() };
          saveStorage(storage);
          console.log(`[EMULATOR] Code sent to ${normalizedEmail}: ${code}`);
          res.json({ success: true, message: 'Code sent (emulator)', code, expiresAt: codeExpiry });
        } else {
          const rateLimitRef = db.collection('rateLimit').doc(normalizedEmail);
          const rateLimitDoc = await rateLimitRef.get();
          if (rateLimitDoc.exists) {
            const data = rateLimitDoc.data();
            const recentAttempts = (data.attempts || []).filter(t => t > oneHourAgo);
            if (recentAttempts.length >= 3) {
              res.status(429).json({ error: 'Too many code requests. Try again in 15 minutes.' });
              return;
            }
            await rateLimitRef.update({ attempts: [...recentAttempts, now] });
          } else {
            await rateLimitRef.set({ attempts: [now], createdAt: new Date() });
          }
          const code = String(Math.floor(100000 + Math.random() * 900000));
          const codeExpiry = now + 600000;
          await db.collection('authCodes').doc(normalizedEmail).set({
            code, expiresAt: codeExpiry, attempts: 0, createdAt: new Date()
          });
          const resend = new Resend(resendApiKey.value());
          const { data, error } = await resend.emails.send({
            from: 'Wandel met Mij <noreply@realgood.nl>',
            to: normalizedEmail,
            subject: 'Jouw inlogcode voor Wandel met Mij',
            html: buildEmailHtml(code)
          });
          if (error) {
            console.error('Resend error:', error);
            throw new Error(`Email send failed: ${error.message}`);
          }
          console.log(`[PRODUCTION] Code sent to ${normalizedEmail}, Resend ID: ${data?.id}`);
          res.json({ success: true, message: 'Code sent to your email' });
        }
      } catch (error) {
        console.error('sendCode error:', error);
        res.status(500).json({ error: error.message });
      }
    });
  });

// ═══════════════════════════════════════════════════════════════
// verifyCode
// ═══════════════════════════════════════════════════════════════
exports.verifyCode = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') { res.status(200).send(''); return; }
    if (req.method !== 'POST') { res.status(400).json({ error: 'POST required' }); return; }

    const { email, code, anonymousId } = req.body;
    if (!email || !code) { res.status(400).json({ error: 'Email and code required' }); return; }
    const normalizedEmail = email.toLowerCase().trim();

    try {
      const now = Date.now();

      if (isEmulator) {
        const storage = loadStorage();
        const codeData = storage.codes[normalizedEmail];
        if (!codeData) { res.status(404).json({ error: 'No code found for this email' }); return; }
        if (codeData.expiresAt < now) {
          delete storage.codes[normalizedEmail];
          saveStorage(storage);
          res.status(400).json({ error: 'Code expired' }); return;
        }
        if (codeData.attempts >= 5) { res.status(429).json({ error: 'Too many attempts' }); return; }
        if (codeData.code !== code) {
          codeData.attempts++;
          saveStorage(storage);
          res.status(400).json({ error: 'Invalid code' }); return;
        }
        if (storage.accounts[normalizedEmail]) {
          delete storage.codes[normalizedEmail];
          saveStorage(storage);
          res.json({ success: true, isNewAccount: false, email: normalizedEmail });
          return;
        }
        storage.accounts[normalizedEmail] = {
          email: normalizedEmail, createdAt: new Date().toISOString(), status: 'active', linkedAnonymousId: anonymousId || null
        };
        delete storage.codes[normalizedEmail];
        saveStorage(storage);
        res.json({ success: true, isNewAccount: true, email: normalizedEmail });
      } else {
        const codeRef = db.collection('authCodes').doc(normalizedEmail);
        const codeDoc = await codeRef.get();
        if (!codeDoc.exists) { res.status(404).json({ error: 'No code found for this email' }); return; }
        const codeData = codeDoc.data();
        if (codeData.expiresAt < now) {
          await codeRef.delete();
          res.status(400).json({ error: 'Code expired' }); return;
        }
        if (codeData.attempts >= 5) { res.status(429).json({ error: 'Too many attempts' }); return; }
        if (codeData.code !== code) {
          await codeRef.update({ attempts: codeData.attempts + 1 });
          res.status(400).json({ error: 'Invalid code' }); return;
        }
        const accountRef = db.collection('accounts').doc(normalizedEmail);
        const accountDoc = await accountRef.get();
        if (accountDoc.exists) {
          await codeRef.delete();
          res.json({ success: true, isNewAccount: false, email: normalizedEmail });
          return;
        }
        await accountRef.set({
          email: normalizedEmail, createdAt: new Date(), status: 'active', linkedAnonymousId: anonymousId || null
        });
        await codeRef.delete();
        res.json({ success: true, isNewAccount: true, email: normalizedEmail });
      }
    } catch (error) {
      console.error('verifyCode error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// getAccount
// ═══════════════════════════════════════════════════════════════
exports.getAccount = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') { res.status(200).send(''); return; }
    if (req.method !== 'POST') { res.status(400).json({ error: 'POST required' }); return; }

    const { email } = req.body;
    if (!email) { res.status(400).json({ error: 'Email required' }); return; }
    const normalizedEmail = email.toLowerCase().trim();

    try {
      if (isEmulator) {
        const storage = loadStorage();
        const account = storage.accounts[normalizedEmail];
        if (!account) { res.json({ exists: false }); return; }
        res.json({ exists: true, email: normalizedEmail, createdAt: account.createdAt });
      } else {
        const accountRef = db.collection('accounts').doc(normalizedEmail);
        const doc = await accountRef.get();
        if (!doc.exists) { res.json({ exists: false }); return; }
        res.json({ exists: true, email: doc.data().email, createdAt: doc.data().createdAt });
      }
    } catch (error) {
      console.error('getAccount error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// syncData - upload localStorage data to Firestore
// POST { email, storage: { key: value, ... } }
// ═══════════════════════════════════════════════════════════════
exports.syncData = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') { res.status(200).send(''); return; }
    if (req.method !== 'POST') { res.status(400).json({ error: 'POST required' }); return; }

    const { email, storage } = req.body;
    if (!email) { res.status(400).json({ error: 'Email required' }); return; }
    if (!storage || typeof storage !== 'object') {
      res.status(400).json({ error: 'storage object required' }); return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();

    try {
      // Size check - prevent abuse (1 MB limit for safety)
      const storageJson = JSON.stringify(storage);
      if (storageJson.length > 900000) {
        res.status(413).json({ error: 'Storage too large (max 900KB)' });
        return;
      }

      if (isEmulator) {
        const fileStorage = loadStorage();
        if (!fileStorage.accounts[normalizedEmail]) {
          res.status(404).json({ error: 'Account does not exist. Login first.' });
          return;
        }
        if (!fileStorage.syncData) fileStorage.syncData = {};
        fileStorage.syncData[normalizedEmail] = {
          storage,
          lastSync: new Date().toISOString(),
          syncedAt: now
        };
        saveStorage(fileStorage);
        console.log(`[EMULATOR] Synced ${Object.keys(storage).length} keys for ${normalizedEmail}`);
        res.json({ success: true, syncedKeys: Object.keys(storage).length, lastSync: new Date().toISOString() });
      } else {
        const accountRef = db.collection('accounts').doc(normalizedEmail);
        const accountDoc = await accountRef.get();
        if (!accountDoc.exists) {
          res.status(404).json({ error: 'Account does not exist. Login first.' });
          return;
        }
        // Store in sub-document to keep account doc small
        const dataRef = db.collection('accounts').doc(normalizedEmail).collection('data').doc('storage');
        await dataRef.set({
          storage,
          lastSync: new Date(),
          size: storageJson.length,
          keyCount: Object.keys(storage).length
        }, { merge: false });
        // Update account's lastSync
        await accountRef.update({ lastSync: new Date() });
        console.log(`[PRODUCTION] Synced ${Object.keys(storage).length} keys for ${normalizedEmail} (${storageJson.length} bytes)`);
        res.json({
          success: true,
          syncedKeys: Object.keys(storage).length,
          size: storageJson.length,
          lastSync: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('syncData error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// restoreData - download localStorage from Firestore
// POST { email }
// ═══════════════════════════════════════════════════════════════
exports.restoreData = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') { res.status(200).send(''); return; }
    if (req.method !== 'POST') { res.status(400).json({ error: 'POST required' }); return; }

    const { email } = req.body;
    if (!email) { res.status(400).json({ error: 'Email required' }); return; }
    const normalizedEmail = email.toLowerCase().trim();

    try {
      if (isEmulator) {
        const fileStorage = loadStorage();
        if (!fileStorage.accounts[normalizedEmail]) {
          res.status(404).json({ error: 'Account not found' });
          return;
        }
        const synced = fileStorage.syncData?.[normalizedEmail];
        if (!synced) {
          res.json({ success: true, hasData: false, storage: {}, message: 'No synced data yet' });
          return;
        }
        res.json({
          success: true,
          hasData: true,
          storage: synced.storage,
          lastSync: synced.lastSync,
          keyCount: Object.keys(synced.storage).length
        });
      } else {
        const accountRef = db.collection('accounts').doc(normalizedEmail);
        const accountDoc = await accountRef.get();
        if (!accountDoc.exists) {
          res.status(404).json({ error: 'Account not found' });
          return;
        }
        const dataRef = accountRef.collection('data').doc('storage');
        const dataDoc = await dataRef.get();
        if (!dataDoc.exists) {
          res.json({ success: true, hasData: false, storage: {}, message: 'No synced data yet' });
          return;
        }
        const data = dataDoc.data();
        res.json({
          success: true,
          hasData: true,
          storage: data.storage || {},
          lastSync: data.lastSync?.toDate?.()?.toISOString() || null,
          keyCount: data.keyCount || Object.keys(data.storage || {}).length
        });
      }
    } catch (error) {
      console.error('restoreData error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});
