const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK - Singleton Pattern
 */
function initFirebase() {
    if (admin.apps.length === 0) {
        const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
        const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

        if (!rawKey || !clientEmail) {
            throw new Error("Missing Firebase Configuration Environment Variables");
        }

        const formattedKey = rawKey
            .replace(/\\n/g, '\n')
            .replace(/^['"]|['"]$/g, '')
            .trim();

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID || "kc-tobe-friendcorner-21655",
                clientEmail: clientEmail,
                privateKey: formattedKey,
            }),
        });
        console.log("✅ Firebase Admin SDK Initialized Successfully");
    }
    return admin.messaging();
}

module.exports = async (req, res) => {
    // 1. CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { token, title, body, image, recipientUid, link } = req.body;

    if (!token || !title || !body) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const messaging = initFirebase();
        const defaultLink = link || 'https://2bkc-baojai-zone.vercel.app/';
        const defaultIcon = 'https://2bkc-baojai-zone.vercel.app/KCปก1.png';
        const imageUrl = image || defaultIcon;

        const message = {
            token: token,
            notification: {
                title: title,
                body: body,
                image: imageUrl
            },
            android: {
                priority: 'high',
                notification: {
                    // สำหรับ Android PWA แนะนำให้ละ icon ไว้เพื่อให้ระบบใช้จาก Manifest 
                    // หรือใส่เป็น imageUrl ไปเลย
                    image: imageUrl,
                    sound: 'default',
                    clickAction: defaultLink,
                    color: '#f44336'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1,
                        'mutable-content': 1
                    }
                },
                fcm_options: {
                    image: imageUrl
                }
            },
            webpush: {
                headers: {
                    Urgency: 'high'
                },
                notification: {
                    icon: defaultIcon,
                    image: imageUrl,
                    badge: 'https://2bkc-baojai-zone.vercel.app/badge.png',
                    requireInteraction: true,
                    tag: recipientUid || 'general_msg' // ใช้ tag เพื่อรวมแจ้งเตือนจากคนเดิมไม่ให้รก
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
        return res.status(200).json({ success: true, messageId: response });

    } catch (error) {
        console.error('❌ FCM Error:', error.code, error.message);

        // จัดการ Error เฉพาะทาง
        const invalidTokens = [
            'messaging/registration-token-not-registered',
            'messaging/invalid-registration-token'
        ];

        if (invalidTokens.includes(error.code)) {
            return res.status(410).json({
                success: false,
                error: 'Token no longer valid',
                code: error.code
            });
        }

        return res.status(500).json({
            success: false,
            error: error.message,
            code: error.code || 'internal_error'
        });
    }
};