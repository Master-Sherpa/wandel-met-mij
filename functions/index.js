const functions = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { Resend } = require('resend');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

admin.initializeApp();

const resendApiKey = defineSecret('RESEND_API_KEY');
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';
const storageFile = path.join(__dirname, '.firebase-auth-storage.json');
const corsHandler = cors({ origin: true });

// Sessiegeheim: bij inloggen krijgt de app een geheim; alleen de hash staat op de server.
function maakSessieGeheim() { return crypto.randomBytes(32).toString('hex'); }
function hashGeheim(g) { return crypto.createHash('sha256').update(String(g)).digest('hex'); }
async function controleerSessie(normalizedEmail, geheim) {
  if (!geheim || typeof geheim !== 'string') return false;
  const verwacht = hashGeheim(geheim);
  if (isEmulator) {
    const st = loadStorage();
    const acc = st.accounts && st.accounts[normalizedEmail];
    return !!(acc && acc.sessionHash && acc.sessionHash === verwacht);
  }
  const doc = await admin.firestore().collection('accounts').doc(normalizedEmail).get();
  return doc.exists && doc.data().sessionHash === verwacht;
}

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

function buildEmailText(code) {
  return [
    'Wandel met Mij \u2014 je inlogcode',
    '',
    '    ' + code,
    '',
    'Open de app en vul deze code in op het inlogscherm.',
    '',
    'De code is 10 minuten geldig. Deel hem met niemand.',
    'Niet aangevraagd? Dan kun je deze mail negeren.'
  ].join('\n');
}

// Geen knop en geen link in deze mail, met opzet.
// Een link opent altijd de browser, en op iOS heeft een app op je beginscherm
// zijn eigen opslag los van Safari. Inloggen via de link logde je dus in op
// een andere kopie van de app dan die op je beginscherm staat. De code
// overtypen of plakken in de app zelf is de enige route die overal werkt.
function buildEmailHtml(code) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jouw inlogcode</title>
</head>
<body style="margin:0; padding:0; background:#0a1e35; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#0a1e35; padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:500px; background:#0c1f31; border-radius:16px; border:1px solid rgba(240,165,0,0.2); overflow:hidden;">
          <!-- Kop -->
          <tr>
            <td style="padding:32px 40px 8px; text-align:center;">
              <h1 style="color:#f0a500; margin:0 0 4px; font-size:24px; font-weight:700;">\u{1F6B6} Wandel met Mij</h1>
              <p style="color:#7ab8d4; margin:0; font-size:14px;">Je inlogcode</p>
            </td>
          </tr>
          <!-- De code: het enige wat je nodig hebt -->
          <tr>
            <td style="padding:20px 40px 8px; text-align:center;">
              <div style="background:rgba(240,165,0,0.08); border:1px solid rgba(240,165,0,0.3); border-radius:12px; padding:26px 20px;">
                <div style="font-family:'Courier New',Monaco,monospace; font-size:40px; font-weight:700; letter-spacing:10px; color:#f0a500; user-select:all; -webkit-user-select:all;">${code}</div>
              </div>
            </td>
          </tr>
          <!-- Wat je ermee doet -->
          <tr>
            <td style="padding:14px 40px 24px; text-align:center;">
              <p style="color:#e8f4f8; margin:0 0 8px; font-size:15px; line-height:1.6;">
                Ga terug naar <strong>Wandel met Mij</strong> en vul deze code in op het inlogscherm.
              </p>
              <p style="color:#7ab8d4; margin:0; font-size:13px; line-height:1.6;">
                Houd de code even ingedrukt om hem te kopi\u00EBren.<br>
                Op een iPhone biedt het toetsenbord hem soms zelf al aan.
              </p>
            </td>
          </tr>
          <!-- Info -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="padding:12px 16px; background:rgba(122,184,212,0.08); border-radius:8px; color:#e8f4f8; font-size:13px; line-height:1.6;">
                    \u23F1\uFE0F Deze code is <strong>10 minuten geldig</strong>.<br>
                    \u{1F512} Deel deze code met niemand.<br>
                    \u2753 Niet aangevraagd? Negeer deze mail.
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Voettekst -->
          <tr>
            <td style="padding:20px 40px; border-top:1px solid rgba(122,184,212,0.1); text-align:center;">
              <p style="color:#7ab8d4; margin:0; font-size:12px;">
                Verzonden door <strong style="color:#f0a500;">Wandel met Mij</strong><br>
                Een project van realgood.nl
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
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
            subject: `Je inlogcode voor Wandel met Mij: ${code}`,
            html: buildEmailHtml(code),
            text: buildEmailText(code)
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
        const sessieGeheim = maakSessieGeheim();
        if (storage.accounts[normalizedEmail]) {
          storage.accounts[normalizedEmail].sessionHash = hashGeheim(sessieGeheim);
          delete storage.codes[normalizedEmail];
          saveStorage(storage);
          res.json({ success: true, isNewAccount: false, email: normalizedEmail, sessionSecret: sessieGeheim });
          return;
        }
        storage.accounts[normalizedEmail] = {
          email: normalizedEmail, createdAt: new Date().toISOString(), status: 'active', linkedAnonymousId: anonymousId || null,
          sessionHash: hashGeheim(sessieGeheim)
        };
        delete storage.codes[normalizedEmail];
        saveStorage(storage);
        res.json({ success: true, isNewAccount: true, email: normalizedEmail, sessionSecret: sessieGeheim });
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
        const sessieGeheim = maakSessieGeheim();
        if (accountDoc.exists) {
          await accountRef.update({ sessionHash: hashGeheim(sessieGeheim) });
          await codeRef.delete();
          res.json({ success: true, isNewAccount: false, email: normalizedEmail, sessionSecret: sessieGeheim });
          return;
        }
        await accountRef.set({
          email: normalizedEmail, createdAt: new Date(), status: 'active', linkedAnonymousId: anonymousId || null,
          sessionHash: hashGeheim(sessieGeheim)
        });
        await codeRef.delete();
        res.json({ success: true, isNewAccount: true, email: normalizedEmail, sessionSecret: sessieGeheim });
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

    const { email, storage, sessionSecret } = req.body;
    if (!email) { res.status(400).json({ error: 'Email required' }); return; }
    if (!storage || typeof storage !== 'object') {
      res.status(400).json({ error: 'storage object required' }); return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = Date.now();

    try {
      if (!(await controleerSessie(normalizedEmail, sessionSecret))) {
        res.status(401).json({ error: 'Session invalid. Login again.' }); return;
      }
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

    const { email, sessionSecret } = req.body;
    if (!email) { res.status(400).json({ error: 'Email required' }); return; }
    const normalizedEmail = email.toLowerCase().trim();

    try {
      if (!(await controleerSessie(normalizedEmail, sessionSecret))) {
        res.status(401).json({ error: 'Session invalid. Login again.' }); return;
      }
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

// ═══════════════════════════════════════════════════════════════
// deleteAccount - verwijdert het e-mailaccount en alle cloudgegevens (AVG)
// POST { email, code }. De 6-cijferige code uit de mail is het bewijs
// dat de eigenaar van het adres dit vraagt. Zonder geldige code gebeurt niets.
// ═══════════════════════════════════════════════════════════════
exports.deleteAccount = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method === 'OPTIONS') { res.status(200).send(''); return; }
    if (req.method !== 'POST') { res.status(400).json({ error: 'POST required' }); return; }

    const { email, code } = req.body || {};
    if (!email || !code) { res.status(400).json({ error: 'Email and code required' }); return; }
    const normalizedEmail = String(email).toLowerCase().trim();
    const codeInput = String(code).trim();

    try {
      if (isEmulator) {
        const storage = loadStorage();
        const codeData = storage.codes[normalizedEmail];
        if (!codeData || codeData.expiresAt < Date.now()) {
          res.status(400).json({ error: 'Code expired or missing' }); return;
        }
        if (codeData.attempts >= 5) { res.status(429).json({ error: 'Too many attempts' }); return; }
        if (codeData.code !== codeInput) {
          codeData.attempts++;
          saveStorage(storage);
          res.status(400).json({ error: 'Invalid code' }); return;
        }
        delete storage.accounts[normalizedEmail];
        if (storage.syncData) delete storage.syncData[normalizedEmail];
        delete storage.codes[normalizedEmail];
        saveStorage(storage);
        res.json({ success: true });
        return;
      }

      const codeRef = db.collection('authCodes').doc(normalizedEmail);
      const codeDoc = await codeRef.get();
      if (!codeDoc.exists) { res.status(400).json({ error: 'Code expired or missing' }); return; }
      const codeData = codeDoc.data();
      if (codeData.expiresAt < Date.now()) {
        await codeRef.delete();
        res.status(400).json({ error: 'Code expired' }); return;
      }
      if (codeData.attempts >= 5) { res.status(429).json({ error: 'Too many attempts' }); return; }
      if (codeData.code !== codeInput) {
        await codeRef.update({ attempts: codeData.attempts + 1 });
        res.status(400).json({ error: 'Invalid code' }); return;
      }

      // Account + alle subcollecties (data/storage met de volledige lokale back-up)
      await db.recursiveDelete(db.collection('accounts').doc(normalizedEmail));
      await codeRef.delete();
      console.log(`[PRODUCTION] Account deleted for ${normalizedEmail}`);
      res.json({ success: true });
    } catch (error) {
      console.error('deleteAccount error:', error);
      res.status(500).json({ error: error.message });
    }
  });
});
