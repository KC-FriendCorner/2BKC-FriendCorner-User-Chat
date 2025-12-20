// นำเข้า Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyCs3_LcJN5RfOIo9jZ4fnz1CBl8hXqfvig",
    authDomain: "kc-tobe-friendcorner-21655.firebaseapp.com",
    databaseURL: "https://kc-tobe-friendcorner-21655-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kc-tobe-friendcorner-21655",
    storageBucket: "kc-tobe-friendcorner-21655.firebasestorage.app",
    messagingSenderId: "722433178265",
    appId: "1:722433178265:web:f7369aa65b3063a8ab1608"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// รับข้อความเมื่อปิดหน้าเว็บหรือเว็บอยู่เบื้องหลัง
messaging.onBackgroundMessage((payload) => {
    console.log('[sw.js] ได้รับข้อความเบื้องหลัง: ', payload);

    const notificationTitle = payload.notification.title || "2BKC มีข้อความใหม่";
    const notificationOptions = {
        body: payload.notification.body || "คลิกเพื่ออ่านข้อความ",
        icon: 'KCLOGO.png', // แนะนำเปลี่ยนจาก KCปก.png เป็น logo.png ภาษาอังกฤษ
        badge: 'KCLOGO.png',
        data: {
            url: 'https://2bkc-baojai-zone.vercel.app/index.html' // หน้าที่จะเปิดเมื่อคลิก
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// เมื่อผู้ใช้คลิกที่แถบแจ้งเตือน
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data.url || '/')
    );
});