// ข้อมูลการตั้งค่า Firebase (จาก Firebase Console)
const firebaseConfig = {
    apiKey: "AIzaSyCs3_LcJN5RfOIo9jZ4fnz1CBl8hXqfvig",
    authDomain: "kc-tobe-friendcorner-21655.firebaseapp.com",
    databaseURL: "https://kc-tobe-friendcorner-21655-default-rtdb.firebaseio.com",
    projectId: "kc-tobe-friendcorner-21655",
    storageBucket: "kc-tobe-friendcorner-21655.appspot.com",
    messagingSenderId: "722433178265",
    appId: "1:722433178265:web:f7369aa65b3063a8ab1608"
};

// ตรวจสอบว่า Firebase ถูก Initialize ไปหรือยัง (ป้องกัน Error 'No Firebase App [DEFAULT]')
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("🔥 Firebase Initialized Successfully");
} else {
    firebase.app(); // ถ้ามีอยู่แล้วให้ใช้ตัวเดิม
}