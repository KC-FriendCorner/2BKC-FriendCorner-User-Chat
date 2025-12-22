// firebase-messaging-sw.js

// 1. นำเข้า SDK
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// 2. การตั้งค่า Firebase (ใช้ข้อมูลล่าสุดที่คุณส่งมา)
const firebaseConfig = {
    apiKey: "AIzaSyCs3_LcJN5RfOIo9jZ4fnz1CBl8hXqfvig",
    authDomain: "kc-tobe-friendcorner-21655.firebaseapp.com",
    databaseURL: "https://kc-tobe-friendcorner-21655-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kc-tobe-friendcorner-21655",
    storageBucket: "kc-tobe-friendcorner-21655.firebasestorage.app",
    messagingSenderId: "722433178265",
    appId: "1:722433178265:web:f7369aa65b3063a8ab1608"
};

// 3. เริ่มการทำงาน (ใช้ initializeApp โดยตรงใน SW)
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// 4. จัดการข้อความเมื่อไม่ได้เปิดหน้าเว็บ (Background)
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] ได้รับข้อความใน Background:', payload);

    // หมายเหตุ: หากส่ง payload มาในรูปแบบ 'notification' 
    // เบราว์เซอร์จะแสดงผลให้อัตโนมัติอยู่แล้ว ไม่ต้องเขียนสั่งโชว์ซ้ำครับ
});

// 5. จัดการเมื่อผู้ใช้กดที่ตัว Notification
self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] มีการคลิกที่แจ้งเตือน');

    // ปิดตัวแจ้งเตือน
    event.notification.close();

    // ดึง URL ที่ส่งมาจาก payload (ถ้าไม่มีให้ไปที่หน้าหลัก)
    const urlToOpen = event.notification.data && event.notification.data.url
        ? event.notification.data.url
        : 'https://2bkc-baojai-zone-admin.vercel.app/';

    // เปิดหน้าเว็บหรือสลับไปที่ Tab ที่เปิดค้างไว้
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // เช็คว่ามีหน้าเว็บเปิดค้างไว้ไหม ถ้ามีให้ Focus ไปที่นั่น
            for (var i = 0; i < windowClients.length; i++) {
                var client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // ถ้าไม่มีหน้าเว็บเปิดอยู่เลย ให้เปิดหน้าใหม่
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});