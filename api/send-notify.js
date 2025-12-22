const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK
 */
function initFirebase() {
    if (admin.apps.length === 0) {
        const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
        const formattedKey = rawKey
            .replace(/\\n/g, '\n')
            .replace(/^['"]|['"]$/g, '')
            .trim();

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID || "kc-tobe-friendcorner-21655",
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: formattedKey,
            }),
        });
        console.log("✅ Firebase Admin SDK Initialized");
    }
    return admin.messaging();
}

module.exports = async (req, res) => {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { token, title, body, image, recipientUid, link } = req.body;

    if (!token || !title || !body) {
        return res.status(400).json({ error: 'Missing token, title, or body' });
    }

    try {
        const messaging = initFirebase();
        const defaultLink = link || 'https://2bkc-baojai-zone.vercel.app/';
        const defaultIcon = 'https://2bkc-baojai-zone.vercel.app/KCปก1.png';
        const imageUrl = image || defaultIcon;

        const message = {
            token: token,
            // 1. Notification พื้นฐาน (สำหรับ PC/ทั่วไป)
            notification: {
                title: title,
                body: body,
                image: imageUrl
            },
            // 2. สำหรับ Android
            android: {
                priority: 'high',
                notification: {
                    icon: 'stock_ticker_update', // ต้องตรงกับชื่อไฟล์ในโปรเจกต์ Android (ถ้ามี)
                    color: '#f44336',
                    sound: 'default',
                    image: imageUrl,
                    clickAction: defaultLink
                }
            },
            // 3. สำหรับ iOS (Apple Push Notification service)
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        'mutable-content': 1 // สำคัญ: เพื่อให้ iOS แสดงรูปภาพได้
                    }
                },
                fcm_options: {
                    image: imageUrl
                }
            },
            // 4. สำหรับ Web Push (Safari บน iOS และ Chrome บน Android)
            webpush: {
                headers: {
                    Urgency: 'high'
                },
                notification: {
                    icon: defaultIcon,
                    image: imageUrl,
                    badge: 'https://2bkc-baojai-zone.vercel.app/badge.png',
                    requireInteraction: true,
                    tag: recipientUid || 'general'
                },
                fcmOptions: {
                    link: defaultLink
                }
            },
            data: {
                click_url: defaultLink,
                recipientUid: recipientUid || 'unknown'
            }
        };

        const response = await messaging.send(message);

        return res.status(200).json({
            success: true,
            messageId: response
        });

    } catch (error) {
        console.error('❌ FCM Error:', error);
        if (error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token') {
            return res.status(410).json({ error: 'Invalid Token', code: error.code });
        }
        return res.status(500).json({
            success: false,
            error: error.message,
            code: error.code
        });
    }
};