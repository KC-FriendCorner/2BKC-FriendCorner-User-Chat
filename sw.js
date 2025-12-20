// ไฟล์ sw.js
self.addEventListener('push', function (event) {
    const data = event.data.json();
    const options = {
        body: data.body,
        icon: 'KCปก.png',
        badge: 'KCปก.png'
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// sw.js
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

// จัดการเมื่อมีข้อความเข้าขณะปิดหน้าเว็บ หรืออยู่หน้าอื่น
messaging.onBackgroundMessage((payload) => {
    console.log('ได้รับข้อความเบื้องหลัง: ', payload);
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/KCปก.png' // ใส่ลิงก์รูปไอคอนเว็บคุณ
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});