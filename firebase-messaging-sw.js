// firebase-messaging-sw.js

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

const firebaseConfig = {
    apiKey: "AIzaSyCs3_LcJN5RfOIo9jZ4fnz1CBl8hXqfvig",
    authDomain: "kc-tobe-friendcorner-21655.firebaseapp.com",
    databaseURL: "https://kc-tobe-friendcorner-21655-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kc-tobe-friendcorner-21655",
    storageBucket: "kc-tobe-friendcorner-21655.firebasestorage.app",
    messagingSenderId: "722433178265",
    appId: "1:722433178265:web:f7369aa65b3063a8ab1608"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// 🔑 แก้ไขจุดนี้: รับข้อมูลเพื่อทำ Log แต่ไม่ต้องสั่งแสดง Notification ซ้ำ
messaging.onBackgroundMessage((payload) => {
    console.log('ได้รับข้อความแจ้งเตือน (Background):', payload);

    // ลบ self.registration.showNotification ออก
    // เพราะ FCM จะดึงค่าจาก payload.notification มาแสดงให้เองอัตโนมัติ 1 อันครับ
});

// จัดการเมื่อผู้ใช้คลิกที่แจ้งเตือน
self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || 'https://2bkc-baojai-zone.vercel.app/';
    event.waitUntil(
        clients.openWindow(urlToOpen)
    );
});