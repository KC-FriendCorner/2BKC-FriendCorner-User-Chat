// api/send-notify.js
const admin = require('firebase-admin');

// 🚩 นำข้อมูลจาก JSON ที่คุณส่งมาใส่ในรูปแบบ Object
const serviceAccount = {
    "type": "service_account",
    "project_id": "kc-tobe-friendcorner-21655",
    "private_key_id": "bce9e7bc6358e9ab2611512a42d221cc37ca5895",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC6+hmihEhZZYww\n...", // ใส่คีย์เต็มของคุณที่นี่
    "client_email": "firebase-adminsdk-fbsvc@kc-tobe-friendcorner-21655.iam.gserviceaccount.com",
    "client_id": "100289366814873107854",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40kc-tobe-friendcorner-21655.iam.gserviceaccount.com"
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { token, title, body } = req.body;

    try {
        const message = {
            notification: { title, body },
            token: token,
            data: { url: "https://2bkc-baojai-zone.vercel.app/" }
        };

        await admin.messaging().send(message);
        res.status(200).json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}