const admin = require('firebase-admin');

// ใช้ตัวแปร Global เพื่อป้องกันการ Initialize ซ้ำใน Instance เดียวกัน
let isFirebaseInitialized = false;

function initFirebase() {
    if (admin.apps.length === 0) {
        const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
        // ล้างค่ากุญแจให้สะอาด ป้องกัน Error 592 (Bit supported)
        const pKey = rawKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim();

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: "kc-tobe-friendcorner-21655",
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: pKey,
            }),
        });
        isFirebaseInitialized = true;
        console.log("✅ Firebase Initialized Successfully");
    }
    return admin.app();
}

module.exports = async (req, res) => {
    // 1. CORS Setup
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();

    // 2. รับและตรวจสอบข้อมูล
    const { token, title, body, image, recipientUid } = req.body;
    if (!token || !title || !body) {
        return res.status(400).json({ error: 'Missing token, title or body' });
    }

    try {
        const app = initFirebase();

        // 3. สร้าง Payload แบบเสถียรสูงสุด
        const message = {
            token: token,
            notification: {
                title: title,
                body: body,
                image: image || 'https://2bkc-baojai-zone.vercel.app/KCปก1.png'
            },
            android: {
                priority: 'high',
                // collapseKey: ป้องกันการเด้งซ้ำ ถ้าส่งข้อความใหม่ให้ทับอันเก่าทันที
                collapseKey: recipientUid || 'admin_message',
                notification: {
                    sound: 'default',
                    clickAction: 'https://2bkc-baojai-zone.vercel.app/',
                    channelId: 'default_channel'
                }
            },
            apns: {
                payload: {
                    aps: {
                        alert: { title, body },
                        sound: 'default',
                        badge: 1,
                        'mutable-content': 1, // สำคัญ: เพื่อให้ iOS แสดงรูปภาพได้
                        'content-available': 1
                    }
                },
                fcm_options: {
                    image: image || 'https://2bkc-baojai-zone.vercel.app/KCปก1.png'
                }
            },
            webpush: {
                headers: {
                    Urgency: 'high',
                    Topic: recipientUid || 'admin_chat' // ช่วยจัดกลุ่มการส่ง ลดการซ้ำ
                },
                notification: {
                    icon: 'https://2bkc-baojai-zone.vercel.app/KCปก1.png',
                    badge: 'https://2bkc-baojai-zone.vercel.app/badge.png',
                    requireInteraction: true // แจ้งเตือนจะไม่หายไปเองจนกว่าจะกด
                },
                fcmOptions: {
                    link: 'https://2bkc-baojai-zone.vercel.app/'
                }
            },
            data: {
                url: "https://2bkc-baojai-zone.vercel.app/",
                click_action: "https://2bkc-baojai-zone.vercel.app/"
            }
        };

        const response = await app.messaging().send(message);
        return res.status(200).json({ success: true, messageId: response });

    } catch (error) {
        console.error('FCM Error:', error);

        if (error.code === 'messaging/registration-token-not-registered') {
            return res.status(410).json({ error: 'Token is invalid' });
        }

        return res.status(500).json({ success: false, error: error.message });
    }
};