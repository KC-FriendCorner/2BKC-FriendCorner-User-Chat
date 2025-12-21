// firebase-messaging-sw.js

// 🚩 ต้องมีบรรทัดนี้ก่อน: นำเข้า Firebase และ Firebase Messaging
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// 🚩 [CONFIG] ใช้ข้อมูล Firebase Project เดียวกันกับ user.js
const firebaseConfig = {
    // 🔑 [สำคัญ] ต้องใช้ Config ที่ถูกต้องจาก user.js หรือ firebase.json
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

// 🔑 จัดการเมื่อได้รับข้อความแจ้งเตือนในพื้นหลัง (Background)
messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/KCปก1.png', // 🚩 [CONFIG] คุณอาจจะใช้ไฟล์ภาพโลโก้ที่คุณมี เช่น 'KC.png' หรือ 'FriendCorner.jpg'
        data: payload.data
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
});