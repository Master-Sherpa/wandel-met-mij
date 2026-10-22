const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();
const db = admin.firestore();

// Check if running in emulator
const isEmulator = process.env.FUNCTIONS_EMULATOR === 'true';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

exports.sendCode = functions.https.onCall(async (data, context) => {
  const { email } = data;
  if (!email || !email.includes('@')) {
    throw new functions.https.HttpsError('invalid-argument', 'Valid email required');
  }
  const normalizedEmail = email.toLowerCase().trim();
  const rateLimitRef = db.collection('rateLimit').doc(normalizedEmail);
  const codeRef = db.collection('authCodes').doc(normalizedEmail);
  try {
    const rateLimitDoc = await rateLimitRef.get();
    const now = Date.now();
    const oneHourAgo = now - 3600000;
    let sendCount = 0;
    if (rateLimitDoc.exists) {
      const data = rateLimitDoc.data();
      const recentAttempts = (data.attempts || []).filter(t => t > oneHourAgo);
      sendCount = recentAttempts.length;
      if (sendCount >= 3) {
        throw new functions.https.HttpsError('resource-exhausted', 'Too many code requests. Try again in 15 minutes.');
      }
      await rateLimitRef.update({
        attempts: [...recentAttempts, now]
      });
    } else {
      await rateLimitRef.set({
        attempts: [now],
        createdAt: new Date()
      });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeExpiry = now + 600000;
    await codeRef.set({
      code: code,
      expiresAt: codeExpiry,
      attempts: 0,
      createdAt: new Date()
    });

    // In emulator, skip email sending
    if (!isEmulator) {
      const emailContent = `<h2>Je inlogcode</h2><p style="font-size: 24px; font-weight: bold; letter-spacing: 2px;">${code}</p><p>Deze code is 10 minuten geldig.</p><p>Deel dit nooit met iemand anders.</p>`;
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: normalizedEmail,
        subject: 'Jouw inlogcode',
        html: emailContent
      });
    }

    return {
      success: true,
      message: 'Code sent',
      code: isEmulator ? code : undefined, // Return code in emulator for testing
      expiresAt: codeExpiry
    };
  } catch (error) {
    console.error('sendCode error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.verifyCode = functions.https.onCall(async (data, context) => {
  const { email, code, anonymousId } = data;
  if (!email || !code) {
    throw new functions.https.HttpsError('invalid-argument', 'Email and code required');
  }
  const normalizedEmail = email.toLowerCase().trim();
  const codeRef = db.collection('authCodes').doc(normalizedEmail);
  try {
    const codeDoc = await codeRef.get();
    if (!codeDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'No code found for this email');
    }
    const codeData = codeDoc.data();
    const now = Date.now();
    if (codeData.expiresAt < now) {
      await codeRef.delete();
      throw new functions.https.HttpsError('invalid-argument', 'Code expired');
    }
    if (codeData.attempts >= 5) {
      throw new functions.https.HttpsError('resource-exhausted', 'Too many attempts');
    }
    if (codeData.code !== code) {
      await codeRef.update({ attempts: codeData.attempts + 1 });
      throw new functions.https.HttpsError('invalid-argument', 'Invalid code');
    }
    const accountRef = db.collection('accounts').doc(normalizedEmail);
    const accountDoc = await accountRef.get();
    if (accountDoc.exists) {
      await codeRef.delete();
      return {
        success: true,
        isNewAccount: false,
        email: normalizedEmail
      };
    }
    if (anonymousId) {
      return await upgradeAnonymousAccount(normalizedEmail, anonymousId, codeRef);
    } else {
      await accountRef.set({
        email: normalizedEmail,
        createdAt: new Date(),
        status: 'active'
      });
      await codeRef.delete();
      return {
        success: true,
        isNewAccount: true,
        email: normalizedEmail
      };
    }
  } catch (error) {
    console.error('verifyCode error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

async function upgradeAnonymousAccount(email, anonymousId, codeRef) {
  const accountRef = db.collection('accounts').doc(email);
  const anonDataRef = db.collection('accounts').doc(anonymousId);
  try {
    const anonDoc = await anonDataRef.get();
    if (!anonDoc.exists) {
      await accountRef.set({
        email: email,
        createdAt: new Date(),
        status: 'active'
      });
      await codeRef.delete();
      return {
        success: true,
        isNewAccount: true,
        isUpgrade: false,
        email: email
      };
    }
    const anonData = anonDoc.data();
    await accountRef.set({
      email: email,
      linkedAnonymousId: anonymousId,
      createdAt: anonData.createdAt || new Date(),
      status: 'active',
      upgradedAt: new Date()
    });
    const subcollections = ['mijnData', 'partners', 'settings', 'preferences'];
    for (const subcol of subcollections) {
      const anonSubDocs = await anonDataRef.collection(subcol).get();
      for (const doc of anonSubDocs.docs) {
        await accountRef.collection(subcol).doc(doc.id).set(doc.data());
      }
    }
    await anonDataRef.update({
      migratedToEmail: email,
      migratedAt: new Date(),
      fallbackUntil: new Date(Date.now() + 604800000)
    });
    await codeRef.delete();
    return {
      success: true,
      isNewAccount: false,
      isUpgrade: true,
      email: email,
      linkedAnonymousId: anonymousId
    };
  } catch (error) {
    console.error('upgradeAnonymousAccount error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
}

exports.cleanupExpiredCodes = functions.pubsub
  .schedule('every 1 hours')
  .timeZone('Europe/Amsterdam')
  .onRun(async (context) => {
    const now = Date.now();
    const batch = db.batch();
    const expiredCodes = await db.collection('authCodes').where('expiresAt', '<', now).get();
    expiredCodes.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log(`Cleaned up ${expiredCodes.size} expired codes`);
    return null;
  });

exports.getAccount = functions.https.onCall(async (data, context) => {
  const { email } = data;
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email required');
  }
  const accountRef = db.collection('accounts').doc(email.toLowerCase().trim());
  const doc = await accountRef.get();
  if (!doc.exists) {
    return { exists: false };
  }
  return {
    exists: true,
    email: doc.data().email,
    createdAt: doc.data().createdAt,
    linkedAnonymousId: doc.data().linkedAnonymousId || null
  };
});
