const admin = require('firebase-admin');

/**
 * Initialize Firebase Admin SDK
 * ป้องกันการ Initialize ซ้ำซ้อน
 */
function initFirebase() {
    if (admin.apps.length === 0) {
        // ดึงค่าจาก Environment Variables
        const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';

        // จัดการเรื่องขึ้นบรรทัดใหม่ (\n) ใน Private Key ให้ถูกต้องสำหรับ Vercel/Linux
        const pKey = rawKey.replace(/\\n/g, '\n').replace(/^"|"$/g, '').trim();

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: "kc-tobe-friendcorner-21655", // Project ID ของคุณ
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: pKey,
            }),
        });
        console.log("✅ Firebase Admin SDK Initialized");
    }
    return admin.app();
}

module.exports = async (req, res) => {
    // --- 1. การตั้งค่า CORS (สำคัญมากสำหรับ API ที่เรียกจาก Browser) ---
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); // ในโปรดักชั่นควรระบุ Domain จริง
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // จัดการ Pre-flight request
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // จำกัดให้รับเฉพาะ POST เท่านั้น
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // --- 2. รับและตรวจสอบข้อมูลจาก Body ---
    const { token, title, body, image, recipientUid, link } = req.body;

    if (!token || !title || !body) {
        return res.status(400).json({ error: 'Missing required fields: token, title, or body' });
    }

    try {
        const app = initFirebase();
        const defaultLink = link || 'https://2bkc-baojai-zone.vercel.app/';
        const defaultIcon = 'https://2bkc-baojai-zone.vercel.app/KCปก1.png';

        // --- 3. โครงสร้าง Message Payload (FCM v1 API) ---
        const message = {
            token: token,
            notification: {
                title: title,
                body: body,
                image: image || defaultIcon
            },
            // การตั้งค่าสำหรับ Android
            android: {
                priority: 'high',
                collapseKey: recipientUid || 'chat_update',
                notification: {
                    sound: 'default',
                    clickAction: defaultLink,
                    channelId: 'default_channel'
                }
            },
            // การตั้งค่าสำหรับ Web Browser (Web Push)
            webpush: {
                headers: {
                    Urgency: 'high',
                    Topic: recipientUid || 'chat_message' // กลุ่มข้อความตามผู้รับ
                },
                notification: {
                    title: title,
                    body: body,
                    icon: defaultIcon,
                    badge: 'https://2bkc-baojai-zone.vercel.app/badge.png', // ไอคอนเล็กๆ บน Taskbar
                    requireInteraction: true, // แจ้งเตือนค้างไว้จนกว่าจะกด
                    tag: recipientUid || 'general_notification' // ป้องกันแจ้งเตือนซ้ำซ้อน
                },
                fcmOptions: {
                    link: defaultLink
                }
            },
            // ข้อมูลเสริม (Metadata) สำหรับไปใช้เขียน Logic ต่อที่หน้าบ้าน
            data: {
                recipientUid: recipientUid || 'unknown',
                click_url: defaultLink
            }
        };

        // --- 4. เริ่มทำการส่งผ่าน FCM ---
        const response = await app.messaging().send(message);

        console.log(`🚀 Successfully sent message to: ${recipientUid}`);
        return res.status(200).json({
            success: true,
            messageId: response
        });

    } catch (error) {
        console.error('❌ FCM Error:', error);

        // กรณี Token หมดอายุ หรือไม่มีอยู่จริง
        if (error.code === 'messaging/registration-token-not-registered' ||
            error.code === 'messaging/invalid-registration-token') {
            return res.status(410).json({ error: 'Token is no longer valid', code: error.code });
        }

        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};