
// =================================================================
// === 🟢 admin.js - ฉบับรวมสมบูรณ์ (พร้อมแก้ไข DeletedAt Display & Long Press) ===
// =================================================================

// 1. **[CONFIG] ข้อมูล Firebase และ LINE API**
const firebaseConfig = {
    apiKey: "AIzaSyCs3_LcJN5RfOIo9jZ4fnz1CBl8hXqfvig",
    authDomain: "kc-tobe-friendcorner-21655.firebaseapp.com",
    databaseURL: "https://kc-tobe-friendcorner-21655-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kc-tobe-friendcorner-21655",
    storageBucket: "kc-tobe-friendcorner-21655.firebasestorage.app",
    messagingSenderId: "722433178265",
    appId: "1:722433178265:web:f7369aa65b3063a8ab1608"
};

const ADMIN_UID = "o139Nm6N3wSW25fCtAzwf2ymfSm2"; // UID ของผู้ดูแลระบบที่ได้รับอนุญาต
const ADMIN_UID_TO_HIDE = 'o139Nm6N3wSW25fCtAzwf2ymfSm2'; // 🚩 เปลี่ยนเป็น UID ของ Admin จริง

// 🔑 [สำคัญมาก] ส่วนนี้ต้องเปลี่ยน
const ADMIN_LINE_ID = "Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"; // 🚨 CRITICAL: เปลี่ยนเป็น User ID หรือ Group ID ของ Admin ที่รับแจ้งเตือนใน LINE
const LINE_ACCESS_TOKEN = "ECRO36u9CNaNzQZo2rJfzEeSo66rG+lBmApfBToqIKmqaS5fv9sbhQf2+y17xGiqJRdXCdEUVJMsKuCayTQaEdV915gPwPEPYEF0+UTTyJiz1iBrLici8N4wMz1J8KqLqTZ9/H749IvzrWcXgi7bu6AdB04t89/1O/w1cDnyilFU="; // 🚨 CRITICAL: ใส่ Channel Access Token จาก LINE Developers Console ที่นี่
// ⚠️ คำเตือน: การใส่ Token ใน Client-Side Code มีความเสี่ยงด้านความปลอดภัย

// 2. **[Declaration] ประกาศตัวแปร Global**
let auth = null;
let database = null;
let TIMESTAMP = null;
let isFirebaseReady = false;

let activeChatId = null;
let chatListeners = {}; // ใช้เก็บ listeners ของ Firebase
const CHATS_PATH = 'chats';
const MESSAGES_SUB_PATH = 'messages';
let currentListType = 'active';
const ERROR_MESSAGE_ELEMENT_ID = 'errorMessage';

// ** โค้ดทั้งหมดจะอยู่ใน DOMContentLoaded เพื่อความปลอดภัยในการโหลด Firebase SDK **
document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // === 1. FIREBASE INITIALIZATION & AUTH ===
    // =================================================================

    // 3. **[FUNCTION] ฟังก์ชันเริ่มต้น Firebase (หัวใจสำคัญ)**
    function initializeFirebase() {
        if (typeof firebase === 'undefined' || typeof firebase.initializeApp === 'undefined') {
            console.error("CRITICAL: 'firebase' SDKs are not fully loaded.");
            const errorEl = document.getElementById(ERROR_MESSAGE_ELEMENT_ID);
            if (errorEl) {
                errorEl.textContent = 'ข้อผิดพลาด: ไม่พบ Firebase SDKs (โปรดตรวจสอบ admin.html)';
                errorEl.style.display = 'block';
            }
            return;
        }

        try {
            // 🚩 [FIX] ตรวจสอบว่า Firebase ถูก Initialized แล้วหรือไม่ (ป้องกันการ Initialize ซ้ำ)
            if (firebase.apps.length === 0) {
                firebase.initializeApp(firebaseConfig);
            }
            const app = firebase.app();

            auth = app.auth();
            database = app.database();

            if (database) {
                try {
                    // ใช้ .ServerValue.TIMESTAMP เพื่อให้ Firebase กำหนดเวลาจาก Server
                    TIMESTAMP = database.ServerValue.TIMESTAMP;
                    console.log("Firebase initialized successfully. TIMESTAMP is ready.");
                } catch (timestampError) {
                    console.warn("Firebase Initialization Warning: database.ServerValue is not immediately ready. Proceeding with Auth setup.");
                }

                isFirebaseReady = true;
                setupAuthStateListener();
                document.getElementById('errorMessage').style.display = 'none';

            } else {
                throw new Error("Database service is null.");
            }
        } catch (e) {
            console.error("Firebase Initialization Error:", e.message);
            const errorEl = document.getElementById(ERROR_MESSAGE_ELEMENT_ID);
            if (errorEl) {
                errorEl.textContent = `ระบบ Firebase ไม่พร้อม (โปรดตรวจสอบ Console)`;
                errorEl.style.display = 'block';
            }
        }
    }

    // 4. **[EXECUTION] เรียกใช้ฟังก์ชัน Initialization**
    initializeFirebase();

    // =================================================================
    // === 2. UTILITY & FORMATTING FUNCTIONS ===
    // =================================================================

    // 🚩 [NEW] ฟังก์ชันสำหรับส่งแจ้งเตือนไปยัง LINE Official Account (ใช้ Messaging API)
    async function sendLineNotification(messageText) {
        if (!LINE_ACCESS_TOKEN || !ADMIN_LINE_ID || LINE_ACCESS_TOKEN === "YOUR_LINE_CHANNEL_ACCESS_TOKEN") {
            console.error("LINE Notification failed: LINE_ACCESS_TOKEN or ADMIN_LINE_ID is not configured.");
            return;
        }

        const apiEndpoint = "https://api.line.me/v2/bot/message/push";

        const payload = {
            to: ADMIN_LINE_ID,
            messages: [{
                type: "text",
                text: messageText,
            }],
        };

        try {
            // แทนที่ฟังก์ชันเดิมที่ error
            function sendNotification(token, message) {
                fetch('/api/send-notify', { // เรียกมาที่ Serverless Function ของเรา
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token,
                        title: 'แอดมินตอบกลับแล้ว ✨',
                        body: message,
                        icon: 'https://2bkc-baojai-zone.vercel.app/KCปก1.png', // รูปเล็ก
                        image: 'https://2bkc-baojai-zone.vercel.app/KCปก1.png',
                        link: 'https://2bkc-baojai-zone.vercel.app/' // ลิงก์กลับไปยังหน้าแชทของผู้ใช้
                    })
                })
                    .then(res => res.json())
                    .then(data => console.log('สำเร็จ:', data))
                    .catch(err => console.error('Error:', err));
            }
        } catch (error) {
            console.error("Error connecting to LINE API:", error);
        }
    }

    function playNotifySound() {
        const soundEl = document.getElementById('notifySound');
        if (soundEl && soundEl.getAttribute('src')) {
            soundEl.currentTime = 0;
            soundEl.play().catch(e => {
                console.warn("Sound play error (Autoplay blocked/Check notify.mp3 path):", e);
            });
        } else {
            console.warn("Notification sound element or path not set.");
        }
    }

    function requestNotificationPermission() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        console.log("Notification permission granted.");
                    }
                });
            }
        }
    }

    function showWebNotification(title, body, tag) {
        if ('Notification' in window && Notification.permission === 'granted') {
            const options = {
                body: body,
                icon: 'KC.png',
                tag: tag || 'new-chat-message',
                renotify: true
            };

            const notification = new Notification(title, options);

            notification.onclick = function () {
                window.focus();
            };
        }
    }

    // ฟังก์ชันสำหรับจัดรูปแบบเวลาสั้น ๆ (HH:MM)
    function formatTime(timestamp) {
        if (!timestamp) return 'เวลาไม่ระบุ';
        const date = new Date(timestamp);
        // [FIX]: ป้องกัน Error ถ้า timestamp เป็น String
        if (isNaN(date.getTime())) return 'เวลาไม่ถูกต้อง';
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // ฟังก์ชันสำหรับจัดรูปแบบ วันที่/เวลา เต็มรูปแบบ (HH:MM DD/MM/YYYY)
    function formatDateTime(timestamp) {
        if (!timestamp) return 'วันที่ไม่ระบุ';
        const date = new Date(timestamp);
        // [FIX]: ป้องกัน Error ถ้า timestamp เป็น String
        if (isNaN(date.getTime())) return 'วันที่ไม่ถูกต้อง';

        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        // รูปแบบ: HH:MM DD/MM/YYYY (ใช้ปีคริสต์ศักราช หรือปีที่เหมาะสมกับความต้องการ)
        return `${hours}:${minutes} ${day}/${month}/${year}`;
    }

    function showTemporaryMessage(message, isError = false) {
        let messageEl = document.getElementById('temporaryMessage');
        // ลองใช้ element อื่นถ้า #temporaryMessage ไม่มี
        if (!messageEl) {
            messageEl = document.getElementById('adminPanelMessage');
            if (!messageEl) return;
        }

        messageEl.textContent = message;
        messageEl.style.display = 'block';

        // 🚩 ปรับสีให้เห็นชัดเจนขึ้น
        if (isError) {
            messageEl.style.backgroundColor = '#dc3545';
            messageEl.style.color = '#fff';
        } else {
            messageEl.style.backgroundColor = 'var(--primary-color)';
            messageEl.style.color = '#fff';
        }

        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 4000);
    }

    // 🚩 [NEW] ฟังก์ชันจัดการ Long Press
    function setupLongPressHandler(bubbleElement, chatId, messageId, messageSender) {
        let pressTimer = null;
        const LONG_PRESS_DURATION = 500; // 500ms

        const startPress = (e) => {
            // ต้องป้องกันการทำงานปกติของ contextmenu ในมือถือ
            if (e.type === 'contextmenu') {
                e.preventDefault();
                showContextMenu(e, chatId, messageId, messageSender, bubbleElement);
                return;
            }

            // ยกเลิกการกดค้างอื่น ๆ ก่อน
            hideContextMenu();

            pressTimer = setTimeout(() => {
                // เมื่อถึงเวลา Long Press
                showContextMenu(e, chatId, messageId, messageSender, bubbleElement);
            }, LONG_PRESS_DURATION);
        };

        const cancelPress = () => {
            clearTimeout(pressTimer);
        };

        // สำหรับ Desktop (Mouse Events)
        bubbleElement.addEventListener('mousedown', startPress, false);
        bubbleElement.addEventListener('mouseup', cancelPress, false);
        bubbleElement.addEventListener('mouseleave', cancelPress, false);

        // สำหรับ Mobile (Touch Events)
        bubbleElement.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 🔑 [FIX C]: เก็บ Touch Event สำหรับใช้ใน showContextMenu 
            // เพื่อให้ได้ตำแหน่งที่ถูกต้อง (ถ้า showContextMenu ใช้ coordinates)
            const touchEvent = e;

            pressTimer = setTimeout(() => {
                // ใช้ Touch Event ที่เก็บไว้
                showContextMenu(touchEvent, chatId, messageId, messageSender, bubbleElement);
            }, LONG_PRESS_DURATION);

            // ไม่ต้องเรียก startPress(e) ซ้ำ เพราะเราจัดการ Timer ตรงนี้
        }, false);
    }


    // =================================================================
    // === 3. CONTEXT MENU & MESSAGE DELETION LOGIC (แก้ไข) ===
    // =================================================================

    // ฟังก์ชันสำหรับซ่อนเมนูที่แสดงอยู่ (อัปเดต logic การล้าง position)
    function hideContextMenu() {
        const existingMenu = document.querySelector('.temp-context-menu');
        if (existingMenu) {
            // 🔑 [FIX]: ค้นหา Element แม่ที่ทำหน้าที่เป็นตัวอ้างอิงตำแหน่ง (คือ bubble)
            const referenceElement = existingMenu.parentElement;

            // 1. ลบ Event Listeners ออกก่อน
            document.removeEventListener('click', hideContextMenu);
            document.removeEventListener('contextmenu', hideContextMenu);
            const chatBox = document.getElementById('chatBox');
            if (chatBox) {
                chatBox.removeEventListener('scroll', hideContextMenu);
            }

            // 2. ลบเมนูออก และล้าง style position: relative ที่เคยใส่ไว้ใน Bubble ออก
            if (referenceElement) {
                // ล้าง style position: relative ที่เราใส่ใน Bubble
                referenceElement.style.position = '';
                referenceElement.removeChild(existingMenu);
            }
        }
    }

    // ฟังก์ชันสำหรับแสดงเมนู (อัปเดต Signature เพื่อรับ bubbleElement)
    function showContextMenu(e, chatId, messageId, messageSender, bubbleElement) {
        // 🔴 [FIX: L50] ซ่อนเมนูที่เปิดอยู่ก่อนถูกจัดการใน touchstart/mousedown แล้ว 
        // ถ้าคุณได้จัดการ hideContextMenu() ใน touchstart/mousedown แล้ว ให้ข้ามไป
        // ถ้ายังไม่ได้จัดการ ให้เปิด hideContextMenu() ไว้
        // hideContextMenu(); 

        // เราจะอนุญาตให้ Admin ลบข้อความของตัวเองเท่านั้น
        if (messageSender !== 'admin' || currentListType === 'history') {
            return;
        }

        // 1. ป้องกันการแสดงผล Context Menu ดั้งเดิมของเบราว์เซอร์
        e.preventDefault();
        // 🔑 [NEW] หยุด Propagation เพื่อป้องกันปัญหา Event ที่ container
        e.stopPropagation();

        // 2. ซ่อนเมนูที่เปิดอยู่ก่อน (ถ้ามี)
        // 🔑 [แนะนำให้ลบ/คอมเมนต์ หากจัดการใน setupLongPressHandler แล้ว]
        // hideContextMenu(); 

        // 3. 🔑 [FIX]: ใช้ bubbleElement เป็นตัวอ้างอิงตำแหน่ง (ถ้ามีการส่งมา)
        const referenceElement = bubbleElement || e.currentTarget.querySelector('.message-bubble');

        // ถ้าหา bubble ไม่เจอ (ไม่ควรเกิด) ให้ใช้ messageContainer ไปก่อน
        if (!referenceElement) return;

        // 4. บังคับให้ Bubble แม่มี position: relative
        // **เนื่องจากเราจะใช้ position: absolute บนเมนู contextMenu จะลอยไปตาม Bubble นี้**
        referenceElement.style.position = 'relative';

        // 🔑 [CRITICAL FIX FOR iOS]: บังคับ display เป็น inline-block เพื่อให้ position: relative ทำงานได้ดี
        referenceElement.style.display = 'inline-block';

        // 5. สร้าง Context Menu Element ใหม่
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu temp-context-menu';
        contextMenu.setAttribute('data-message-id', messageId);
        contextMenu.setAttribute('data-chat-id', chatId);
        contextMenu.setAttribute('data-sender', messageSender); // ค่าจะเป็น 'admin' หรือ 'user'

        // 6. สร้างตัวเลือก 'ยกเลิกข้อความ'
        const deleteOption = document.createElement('div');
        deleteOption.className = 'context-menu-item delete';
        deleteOption.innerHTML = `<i class="fas fa-trash-alt"></i> ยกเลิกข้อความ`;

        deleteOption.onclick = (event) => {
            event.stopPropagation();
            hideContextMenu();

            if (window.confirm('❗ยืนยันการยกเลิกข้อความนี้? ผู้ใช้จะเห็นเป็น "ข้อความถูกยกเลิกการส่ง"')) {
                window.deleteMessage(chatId, messageId);
            }
        };

        contextMenu.appendChild(deleteOption);
        contextMenu.onclick = (event) => event.stopPropagation(); // หยุดการ Propagation เมื่อคลิกบน Menu

        // 7. เพิ่ม Context Menu เข้าไปเป็น Child ของ Bubble ข้อความ
        referenceElement.appendChild(contextMenu);

        // 8. เพิ่ม Event Listener เพื่อซ่อนเมนูเมื่อคลิกนอกพื้นที่หรือ Scroll
        const chatBox = document.getElementById('chatBox');
        if (chatBox) {
            // ลบ Event Listener เดิมออกก่อนเพื่อป้องกันการซ้ำซ้อน
            chatBox.removeEventListener('scroll', hideContextMenu);
            chatBox.addEventListener('scroll', hideContextMenu);
        }

        // 9. แสดงเมนู
        setTimeout(() => {
            contextMenu.classList.add('show');
            document.addEventListener('click', hideContextMenu, { once: true });
            document.addEventListener('contextmenu', hideContextMenu, { once: true });
        }, 10);
    }

    // 🚩 [IMPORTANT]: ผูกฟังก์ชันเข้ากับ Global Scope เพื่อให้ HTML ใน appendMessage เรียกได้
    window.showContextMenu = showContextMenu;
    window.hideContextMenu = hideContextMenu;

    // ฟังก์ชันยกเลิกการส่งข้อความโดย Admin
    window.deleteMessage = function (chatId, messageId) {
        if (!isFirebaseReady || !database) {
            showTemporaryMessage("Firebase Database ไม่พร้อมใช้งาน", true);
            return;
        }

        const messageRef = database.ref(`${CHATS_PATH}/${chatId}/${MESSAGES_SUB_PATH}/${messageId}`);
        const timestamp = Date.now(); // ใช้ Date.now() เป็นเวลาที่ลบ

        // 1. อัปเดต node ข้อความให้มี property 'deleted: true' และลบ 'text' ออก
        messageRef.update({
            text: null,     // ลบข้อความจริงออกจากฐานข้อมูล
            deleted: true,  // ตั้งค่าสถานะว่าถูกลบแล้ว
            deletedAt: timestamp // บันทึกเวลาที่ลบ
        })
            .then(() => {
                // 2. เมื่อลบสำเร็จ, เรียกฟังก์ชันเพื่อค้นหาข้อความสุดท้ายที่ถูกต้อง
                return updateLastValidMessage(chatId);
            })
            .then(() => {
                // 3. แจ้งเตือนความสำเร็จหลังจากอัปเดตทุกอย่างเรียบร้อยแล้ว
                showTemporaryMessage("ยกเลิกการส่งข้อความสำเร็จ");
            })
            .catch(error => {
                console.error("Error deleting message or updating chat node:", error);
                showTemporaryMessage("เกิดข้อผิดพลาดในการยกเลิกการส่งข้อความ", true);
            });
    };

    // =========================================================
    // 💡 ฟังก์ชันเสริม: ค้นหาข้อความสุดท้ายที่ยังไม่ถูกลบ
    // =========================================================

    /**
 * ค้นหาข้อความล่าสุดที่ยังไม่ถูกลบ และอัปเดต Field lastMessage ใน Chat Node หลัก
 * @param {string} chatId - ID ของแชทที่ต้องการอัปเดต
 */
    function updateLastValidMessage(chatId) {
        const messagesRef = database.ref(`${CHATS_PATH}/${chatId}/${MESSAGES_SUB_PATH}`);

        // ดึง 50 ข้อความล่าสุดมาตรวจสอบเพื่อหาข้อความสุดท้ายที่ยังไม่ถูกลบ
        return messagesRef
            .orderByKey()
            .limitToLast(50) // ดึงมา 50 ข้อความล่าสุด (ปรับได้ตามต้องการ)
            .once('value')
            .then(snapshot => {
                let lastValidMessageText = '[การสนทนาถูกปิด/ยุติ]'; // ข้อความตั้งต้นหากไม่พบข้อความที่ถูกต้อง
                let lastValidTimestamp = 0;

                // วนลูปตรวจสอบข้อความ
                snapshot.forEach(child => {
                    const msg = child.val();

                    // 🔑 ถ้าข้อความยังไม่ถูกลบ (deleted ไม่ใช่ true หรือเป็น null/undefined) 
                    // และมีข้อความจริง (text ไม่ใช่ค่าว่าง)
                    if (msg.deleted !== true && msg.text && msg.text.trim() !== '') {
                        // เนื่องจากเราเรียงตาม Push Key (ตามเวลา) ข้อความนี้จะเป็นข้อความสุดท้ายที่ถูกต้อง
                        lastValidMessageText = msg.text;
                        lastValidTimestamp = msg.timestamp || 0;
                    }
                });

                // 🚨 อัปเดต Field lastMessage ใน Chat Node หลัก (/chats/{chatId})
                return database.ref(`${CHATS_PATH}/${chatId}`).update({
                    lastMessage: {
                        text: lastValidMessageText,
                        timestamp: lastValidTimestamp
                    }
                });
            });
    }

    // 🚩 ส่วนนี้ควรถูกประกาศใน Global Scope หรือภายใน document.addEventListener('DOMContentLoaded', ...)

    window.setupLongPressHandler = function (element, chatId, messageId, sender) {
        // 💡 ฟังก์ชันนี้ต้องถูกประกาศเป็น window.functionName เพื่อให้เข้าถึงได้
        let pressTimer = null;

        const startPress = (e) => {
            // อนุญาตเฉพาะ Left-click หรือ Touchstart
            if (e.button !== 0 && e.type !== 'touchstart') return;

            // ป้องกันการ Scroll เมื่อ Touch (สำคัญสำหรับ Mobile)
            if (e.type === 'touchstart') e.stopPropagation();

            pressTimer = setTimeout(() => {
                // 🔑 เรียกใช้ showContextMenu โดยส่ง element (bubble) เข้าไป
                window.showContextMenu({
                    clientX: e.clientX,
                    clientY: e.clientY,
                    preventDefault: () => { }
                }, chatId, messageId, sender, element);
                clearTimeout(pressTimer);
            }, 700); // 700ms คือระยะเวลา Long Press

        };

        const endPress = () => {
            clearTimeout(pressTimer);
        };

        // ผูก Event Listener เข้ากับ element (bubble)
        element.addEventListener('mousedown', startPress);
        element.addEventListener('touchstart', startPress);
        element.addEventListener('mouseup', endPress);
        element.addEventListener('mouseleave', endPress);
        element.addEventListener('touchend', endPress);
        element.addEventListener('touchcancel', endPress);
    };

    // =================================================================
    // === 4. NAVIGATION & SCREEN MANAGEMENT ===
    // =================================================================

    function setupAuthStateListener() {
        if (!auth) return;

        auth.onIdTokenChanged(function (user) {
            if (user) {
                if (user.uid === ADMIN_UID) {
                    console.log("ADMIN: Authenticated and authorized.");
                    showWelcomeScreen();
                    requestNotificationPermission();
                } else {
                    console.warn("ADMIN: User is logged in but not the authorized ADMIN_UID.");
                    auth.signOut();
                    showLoginScreen();
                }
            } else {
                showLoginScreen();
            }
        });
    }

    function cancelAllListeners() {
        if (!database) return;
        // ยกเลิก Listener ข้อความของแชทที่เคยเปิดอยู่
        if (chatListeners.messages) {
            const messagesRef = database.ref(`${CHATS_PATH}/${chatListeners.messages.chatId}/${MESSAGES_SUB_PATH}`);
            // ยกเลิกทั้ง child_added และ child_changed
            messagesRef.off('child_added', chatListeners.messages.callback);
            messagesRef.off('child_changed', chatListeners.messages.callback);
            delete chatListeners.messages;
            console.log(`Unsubscribed from old chat.`);
        }
        // ยกเลิก Listener ของ Active Chat List
        if (chatListeners.active && chatListeners.active.ref) {
            chatListeners.active.ref.off('value', chatListeners.active.callback);
            delete chatListeners.active; // ลบออกจาก chatListeners
            console.log('Unsubscribed from active chat list.');
        }
        // ยกเลิก Listener ของ History Chat List
        if (chatListeners.history && chatListeners.history.ref) {
            chatListeners.history.ref.off('value', chatListeners.history.callback);
            delete chatListeners.history;
            console.log('Unsubscribed from history chat list.');
        }
        activeChatId = null;
    }


    function hideAllScreens() {
        const loginScreen = document.getElementById('loginScreen');
        const welcomeScreen = document.getElementById('welcomeScreen');
        const adminPanelContainer = document.getElementById('adminPanelContainer');
        const listScreen = document.getElementById('listScreen');
        const historyScreen = document.getElementById('historyScreen');
        const chatScreenContainer = document.getElementById('chatScreenContainer');


        if (loginScreen) loginScreen.style.display = 'none';
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (adminPanelContainer) adminPanelContainer.style.display = 'none';
        if (listScreen) listScreen.style.display = 'none';
        if (historyScreen) historyScreen.style.display = 'none';
        if (chatScreenContainer) chatScreenContainer.style.display = 'none';

        hideContextMenu();
    }

    function showLoginScreen() {
        hideAllScreens();
        cancelAllListeners();
        const loginScreenEl = document.getElementById('loginScreen');
        const errorEl = document.getElementById(ERROR_MESSAGE_ELEMENT_ID);
        if (loginScreenEl) {
            loginScreenEl.style.display = 'flex';
            if (errorEl) {
                errorEl.textContent = '';
                errorEl.style.display = 'none';
            }
        }
    }

    window.showWelcomeScreen = function () {
        hideAllScreens();
        cancelAllListeners();
        activeChatId = null;
        const welcomeScreenEl = document.getElementById('welcomeScreen');
        if (welcomeScreenEl) {
            welcomeScreenEl.style.display = 'flex';
        }
    }

    window.showListScreen = function (type) {
        hideAllScreens();
        cancelAllListeners(); // 🔑 ยกเลิก Listener เก่าทั้งหมดก่อนเริ่ม Listener ใหม่
        currentListType = type;

        const adminPanelContainer = document.getElementById('adminPanelContainer');
        const listScreenEl = document.getElementById('listScreen');
        const historyScreenEl = document.getElementById('historyScreen');
        const chatScreenContainer = document.getElementById('chatScreenContainer');

        // 🔑 Clear list content before loading
        const chatListEl = document.getElementById('chatList');
        const historyListEl = document.getElementById('historyList');
        if (chatListEl) chatListEl.innerHTML = '';
        if (historyListEl) historyListEl.innerHTML = '';

        if (adminPanelContainer) adminPanelContainer.style.display = 'flex';
        if (chatScreenContainer) chatScreenContainer.style.display = 'none';

        if (type === 'active') {
            if (historyScreenEl) historyScreenEl.style.display = 'none';
            if (listScreenEl) {
                listScreenEl.style.display = 'flex'; // แสดง Active List Screen
                const titleEl = listScreenEl.querySelector('.panel-title');
                if (titleEl) titleEl.textContent = '🟢 ห้องสนทนาที่เปิดอยู่';
            }
            loadChatList();
        } else if (type === 'history') {
            if (listScreenEl) listScreenEl.style.display = 'none';
            if (historyScreenEl) {
                historyScreenEl.style.display = 'flex'; // แสดง History List Screen
                const titleEl = historyScreenEl.querySelector('.panel-title');
                if (titleEl) titleEl.textContent = '🔴 ประวัติแชทที่สิ้นสุดแล้ว';
            }
            loadHistoryList();
        }
    }

    function showChatViewScreen(chatId, isHistory = false) {
        // 🔑 [CRITICAL FIX]: ยกเลิก Listener ข้อความทั้งหมดของแชทเดิมก่อน
        cancelAllListeners();

        activeChatId = chatId; // 🚩 [FIXED] ต้องกำหนด activeChatId ด้วย
        currentListType = isHistory ? 'history' : 'active'; // อัปเดตประเภทรายการปัจจุบัน

        const adminPanelContainer = document.getElementById('adminPanelContainer');
        const listScreen = document.getElementById('listScreen');
        const historyScreen = document.getElementById('historyScreen');
        const chatScreenContainer = document.getElementById('chatScreenContainer');
        const currentUserIDSpan = document.getElementById('currentUserID');
        const endChatButton = document.getElementById('endChatButton');
        const deleteChatButton = document.getElementById('deleteChatButton');
        const inputArea = chatScreenContainer ? chatScreenContainer.querySelector('.input-area') : null;
        const backButton = document.getElementById('backButton');
        const chatBox = document.getElementById('chatBox');

        hideAllScreens(); // ปิดหน้าจออื่นๆ ก่อน

        if (adminPanelContainer) adminPanelContainer.style.display = 'flex';
        if (listScreen) listScreen.style.display = 'none';
        if (historyScreen) historyScreen.style.display = 'none';
        if (chatScreenContainer) chatScreenContainer.style.display = 'flex';

        // Clear old messages and title
        if (chatBox) chatBox.innerHTML = '';
        if (currentUserIDSpan) currentUserIDSpan.textContent = `${chatId.substring(0, 8)}...`;

        // Setup Chat Header and Input Area
        if (endChatButton) {
            if (isHistory) {
                endChatButton.style.display = 'none';
            } else {
                // 🚩 [ACTIVE MODE]: แสดงปุ่ม 'จบการสนทนา'
                endChatButton.style.display = 'block';
                endChatButton.innerHTML = '<i class="fas fa-power-off"></i> จบการสนทนา';
                endChatButton.classList.remove('danger-button');
                endChatButton.classList.add('primary-button');
            }
        }

        if (deleteChatButton) {
            if (isHistory) {
                // 🚩 [HISTORY MODE]: แสดงปุ่ม 'ลบการสนทนาถาวร'
                deleteChatButton.style.display = 'block';
                deleteChatButton.innerHTML = '<i class="fas fa-trash-alt"></i> ลบแชทถาวร';
                deleteChatButton.classList.remove('primary-button');
                deleteChatButton.classList.add('danger-button');
                deleteChatButton.title = 'คำเตือน: การลบนี้ไม่สามารถย้อนกลับได้';
            } else {
                deleteChatButton.style.display = 'none';
            }
        }

        if (inputArea) {
            inputArea.style.display = isHistory ? 'none' : 'flex';
        }
        if (backButton) {
            backButton.textContent = 'รายการแชท';
        }

        // 🚩 Start listening for messages (พร้อมส่ง isHistory ไปด้วย)
        listenForMessages(chatId, isHistory);

        // Scroll to bottom after a slight delay for rendering
        setTimeout(() => {
            if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
        }, 100);
    }

    // 🚩 [IMPORTANT]: กำหนดให้เป็น window/global function
    window.selectChat = function (chatId) {
        if (!isFirebaseReady || !database) {
            showTemporaryMessage("Firebase Database ไม่พร้อมใช้งาน", true);
            return;
        }

        // Remove active class from all items
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));

        activeChatId = chatId;
        const currentItem = document.getElementById('chat-' + activeChatId);
        if (currentItem) {
            currentItem.classList.add('active');
            currentItem.classList.remove('unread');
            const dot = currentItem.querySelector('.unread-dot');
            if (dot) dot.remove();
        }

        database.ref(`${CHATS_PATH}/${chatId}`).update({
            unreadByAdmin: false
        })
            .then(() => {
                showChatViewScreen(chatId, false);
            })
            .catch(error => {
                console.error("Error updating unread status:", error);
                showChatViewScreen(chatId, false); // ยังคงเปิดหน้าแชทได้
            });
    }

    window.selectHistoryChat = function (chatId) {
        if (!isFirebaseReady) return;

        // Remove active class from all items
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));

        activeChatId = null; // ไม่ต้องเซ็ต activeChatId ใน History Mode

        const currentItem = document.getElementById('history-' + chatId);
        if (currentItem) {
            currentItem.classList.add('active');
        }
        // 🚩 ส่ง true (isHistory) เข้าไป
        showChatViewScreen(chatId, true);
    }


    // =================================================================
    // === 5. CHAT LIST HANDLERS (ACTIVE & HISTORY) ===
    // =================================================================

    // 🚩 [CRITICAL] ฟังก์ชันหาข้อความสุดท้ายที่ไม่ถูกลบ (ต้องเพิ่ม)
    function findLastValidMessage(messagesSnapshot) {
        let lastValidMessage = { text: 'เริ่มการสนทนา', timestamp: 0 }; // Default value

        if (messagesSnapshot.exists()) {
            const messagesData = messagesSnapshot.val();
            const messageKeys = Object.keys(messagesData).sort((a, b) => {
                // เรียงลำดับตาม Timestamp หรือ Key (ถ้าไม่มี Timestamp)
                const aTime = messagesData[a].timestamp || 0;
                const bTime = messagesData[b].timestamp || 0;
                return aTime - bTime;
            });

            // วนจากข้อความล่าสุดย้อนกลับ
            for (let i = messageKeys.length - 1; i >= 0; i--) {
                const key = messageKeys[i];
                const message = messagesData[key];

                // 🔑 [FIX LOGIC]: ตรวจสอบว่าข้อความไม่ถูกลบ และมีข้อความจริง
                if (message.deleted !== true && message.text) {
                    lastValidMessage = {
                        text: message.text,
                        timestamp: message.timestamp
                    };
                    return lastValidMessage; // เจอข้อความที่ใช้ได้ล่าสุดแล้ว, ออกจากลูป
                }
            }
        }
        return lastValidMessage;
    }

    // 🔑 [MODIFIED]: แก้ไขโครงสร้าง HTML เพื่อให้รองรับการเรียงแนวตั้ง
    function renderChatItem(chatData, chatId, activeChatId) {
        const chatListEl = document.getElementById('chatList');
        if (!chatListEl) return null;

        let item = document.getElementById('chat-' + chatId);
        if (!item) {
            item = document.createElement('div');
            item.id = 'chat-' + chatId;
            item.className = 'chat-item';
            item.onclick = () => selectChat(chatId);
            chatListEl.appendChild(item);
        }

        const lastMessageText = chatData.lastMessage ? (chatData.lastMessage.text || chatData.lastMessage.message || 'ไม่มีข้อความล่าสุด') : 'ไม่มีข้อความล่าสุด';

        // 🟢 [ปรับปรุง]: ใช้ formatDateTime
        const lastActivityTime = chatData.lastActivity ? formatDateTime(chatData.lastActivity) : '';

        const unreadDot = chatData.unreadByAdmin ? '<span class="unread-dot"></span>' : '';

        // 🚩 [STATUS]: แสดงสถานะ [Active]
        const statusDisplay = '<span class="status-active" style="color: #28a745; font-size: 10px; font-weight: 500;">[Active]</span>';

        // 🔑 โครงสร้างใหม่: ใช้ .chat-info-container เพื่อจัด ID/Message/Time เป็นแนวตั้ง
        // *คุณต้องเพิ่ม CSS สำหรับ .chat-info-container เพื่อใช้ display: flex และ flex-direction: column
        item.innerHTML = `
        <div class="chat-info-container"> 
            <p style="margin-bottom: 2px;">
                <strong>ID: <span class="chat-id">${chatId.substring(0, 8)}...</span></strong>
                ${statusDisplay} ${unreadDot}
            </p>
            <p class="chat-owner" style="font-size:12px; color:#555; margin-bottom: 2px;">
                ${lastMessageText}
            </p>
            <p class="chat-time" style="font-size:10px; color:#999; margin: 0;">
                ล่าสุด: ${lastActivityTime}
            </p>
        </div>
    `;

        item.className = 'chat-item';
        if (chatData.unreadByAdmin && activeChatId !== chatId) {
            item.classList.add('unread');
        } else {
            item.classList.remove('unread');
        }
        if (activeChatId === chatId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }

        return item;
    }

    function loadChatList() {
        if (!isFirebaseReady || !auth || !database || !auth.currentUser) {
            const chatListEl = document.getElementById('chatList');
            if (chatListEl) {
                chatListEl.innerHTML = '<p style="padding: 15px; color:#dc3545; text-align:center;">ไม่ได้รับอนุญาตให้โหลดรายการ (กรุณาล็อกอิน Admin)</p>';
            }
            return;
        }

        const chatListRef = database.ref(CHATS_PATH);
        const chatListEl = document.getElementById('chatList');
        if (!chatListEl) return;

        // ยกเลิก Listener เดิมถ้ามี
        if (chatListeners.active) {
            chatListRef.off('value', chatListeners.active.callback);
            delete chatListeners.active;
        }

        chatListEl.innerHTML = '<p id="loadingActiveChats" style="padding: 15px; color:#777; text-align:center;">กำลังโหลด...</p>';

        const callback = (snapshot) => {
            const chats = [];
            let newUnreadCount = 0;

            snapshot.forEach(childSnapshot => {
                const chatData = childSnapshot.val();

                // 1. ตรวจสอบ User Logged Out เพื่อปิดแชทอัตโนมัติ (หลังผ่านไป 10 นาที)
                if (chatData && chatData.status === 'active' && chatData.isLoggedOut === true) {
                    if (Date.now() - (chatData.lastActivity || 0) > 600000) { // 10 minutes (600,000 ms)
                        window.closeChat(childSnapshot.key, false);
                    }
                    return;
                }

                // 🚩 เงื่อนไข: ต้องเป็น 'active' และไม่มี closedAt
                if (chatData && chatData.status === 'active' && !chatData.closedAt) {
                    chatData.id = childSnapshot.key;
                    chats.push(chatData);

                    if (chatData.unreadByAdmin && childSnapshot.key !== activeChatId) {
                        newUnreadCount++;
                    }
                } else if (chatData && childSnapshot.key === activeChatId && chatData.status !== 'active') {
                    // แชทที่กำลังดูอยู่ถูกปิดไปแล้ว
                    showTemporaryMessage(`แชท ID: ${activeChatId.substring(0, 8)}... ถูกปิดแล้ว`, true);
                    activeChatId = null;
                    showListScreen('active');
                }
            });

            // เรียงลำดับ: Unread ก่อน, ตามด้วย Last Activity ล่าสุด
            chats.sort((a, b) => {
                if (a.unreadByAdmin && !b.unreadByAdmin) return -1;
                if (!a.unreadByAdmin && b.unreadByAdmin) return 1;
                return (b.lastActivity || 0) - (a.lastActivity || 0);
            });

            chatListEl.innerHTML = '';
            if (chats.length === 0) {
                chatListEl.innerHTML = '<p style="padding: 15px; color:#777; text-align:center;">ไม่มีห้องสนทนาที่เปิดอยู่</p>';
            } else {
                chats.forEach(chat => renderChatItem(chat, chat.id, activeChatId));
            }

            // Notification Logic
            if (newUnreadCount > 0) {
                playNotifySound();
                showWebNotification(`ข้อความใหม่ (${newUnreadCount} แชท)`, `มี ${newUnreadCount} แชทที่รอการตอบกลับ`, 'new-chat-list-update');
            }
        };

        // กำหนด Listener ใหม่
        chatListeners.active = { ref: chatListRef, callback: callback };
        chatListRef.on('value', callback);
    }


    // 1. ฟังก์ชันแสดงรายการแชทที่สิ้นสุดแล้ว (History)
    // 🔑 [MODIFIED]: แก้ไขโครงสร้าง HTML เพื่อให้รองรับการเรียงแนวตั้ง
    function renderHistoryItem(chatData, chatId, activeChatId) {
        const historyListEl = document.getElementById('historyList');
        if (!historyListEl) return null;

        let item = document.getElementById('history-' + chatId);
        let deleteBtn;

        // 🔑 ถ้า item ยังไม่มี
        if (!item) {
            item = document.createElement('div');
            item.id = 'history-' + chatId;
            item.className = 'chat-item history-item';
            item.onclick = () => selectHistoryChat(chatId);
            historyListEl.appendChild(item);

            deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-chat-history-btn';
            deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';

            // 🔑 [IMPORTANT]: ผูก Event ลบแชท
            deleteBtn.onclick = (e) => {
                e.stopPropagation(); // 🔑 หยุดไม่ให้ Event เปิดแชททำงาน
                if (window.confirm(`ยืนยันการลบประวัติแชท ID: ${chatId.substring(0, 8)}... อย่างถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
                    window.deleteChatPermanently(chatId);
                }
            };
        } else {
            // ถ้า Item มีอยู่แล้ว ให้หาปุ่มลบเดิม
            deleteBtn = item.querySelector('.delete-chat-history-btn');
            if (!deleteBtn) {
                // สร้างใหม่ถ้าหายไป (กรณีมีการ InnerHTML ใหม่)
                deleteBtn = document.createElement('button');
                deleteBtn.className = 'delete-chat-history-btn';
                deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (window.confirm(`ยืนยันการลบประวัติแชท ID: ${chatId.substring(0, 8)}... อย่างถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
                        window.deleteChatPermanently(chatId);
                    }
                };
            }
        }

        const lastMessageText = chatData.lastMessage ? (chatData.lastMessage.text || chatData.lastMessage.message || 'สิ้นสุดการสนทนา') : 'สิ้นสุดการสนทนา';
        const lastActivityTime = chatData.closedAt ? formatDateTime(chatData.closedAt) : (chatData.lastActivity ? formatDateTime(chatData.lastActivity) : '');
        const statusDisplay = '<span class="status-closed" style="color: #dc3545; font-size: 10px; font-weight: 500;">[Closed]</span>';

        // 🔑 โครงสร้างใหม่: ใช้ .chat-info-container เพื่อจัด ID/Message/Time เป็นแนวตั้ง
        item.innerHTML = `
        <div class="chat-info-container chat-item-content">
            <p style="margin-bottom: 2px;">
                <strong>ID: <span class="chat-id">${chatId.substring(0, 8)}...</span></strong>
                ${statusDisplay}
            </p>
            <p class="chat-owner" style="font-size:12px; color:#555; margin-bottom: 2px;">
                ${lastMessageText}
            </p>
            <p class="chat-time" style="font-size:10px; color:#999; margin: 0;">
                ปิดเมื่อ: ${lastActivityTime}
            </p>
        </div>
    `;

        // 🔑 [RE-APPEND]: นำปุ่มที่สร้างไว้กลับมาใส่ใน item
        // [FIX]: ใช้ appendChild แทนการเขียน InnerHTML ทับ เพื่อไม่ให้ deleteBtn ถูกลบ
        const contentContainer = item.querySelector('.chat-item-content');
        if (contentContainer) {
            item.appendChild(deleteBtn);
        } else {
            // ถ้าหา .chat-item-content ไม่เจอ ให้ append deleteBtn ไว้ที่ท้ายสุด (อาจไม่สวย)
            item.appendChild(deleteBtn);
        }


        item.className = 'chat-item history-item';
        if (activeChatId === chatId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }

        return item;
    }

    function loadHistoryList() {
        if (!isFirebaseReady || !auth || !database || !auth.currentUser) {
            const historyListEl = document.getElementById('historyList');
            if (historyListEl) {
                historyListEl.innerHTML = '<p style="padding: 15px; color:#dc3545; text-align:center;">ไม่ได้รับอนุญาตให้โหลดรายการ (กรุณาล็อกอิน Admin)</p>';
            }
            return;
        }

        const historyListRef = database.ref(CHATS_PATH);
        const historyListEl = document.getElementById('historyList');
        if (!historyListEl) return;

        // ยกเลิก Listener เดิมถ้ามี
        if (chatListeners.history) {
            historyListRef.off('value', chatListeners.history.callback);
            delete chatListeners.history;
        }

        historyListEl.innerHTML = '<p id="loadingHistoryChats" style="padding: 15px; color:#777; text-align:center;">กำลังโหลด...</p>';

        const callback = (snapshot) => {
            const historyChats = [];
            snapshot.forEach(childSnapshot => {
                const chatData = childSnapshot.val();
                // 🚩 เงื่อนไข: ต้องเป็น 'closed' และมี closedAt
                if (chatData && chatData.status === 'closed' && chatData.closedAt) {
                    chatData.id = childSnapshot.key;
                    historyChats.push(chatData);
                }
            });

            // เรียงลำดับ: Closed At ล่าสุด
            historyChats.sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));

            historyListEl.innerHTML = '';
            if (historyChats.length === 0) {
                historyListEl.innerHTML = '<p style="padding: 15px; color:#777; text-align:center;">ไม่มีประวัติแชท</p>';
            } else {
                historyChats.forEach(chat => renderHistoryItem(chat, chat.id, activeChatId));
            }
        };

        // กำหนด Listener ใหม่
        chatListeners.history = { ref: historyListRef, callback: callback };
        historyListRef.on('value', callback);
    }
    // =================================================================
    // === 6. CHAT INTERACTION & CORE MESSAGE HANDLERS ===
    // =================================================================

    // 🚩 [NEW FUNCTION] ฟังก์ชันลบแชทออกจากฐานข้อมูลอย่างถาวร (ใช้ใน History Mode)
    window.deleteChatPermanently = function (chatId) {
        if (!isFirebaseReady || !database) {
            showTemporaryMessage("Firebase Database ไม่พร้อมใช้งาน", true);
            return;
        }

        if (!window.confirm(`⚠️ คำเตือน: ยืนยันการลบแชท ID: ${chatId.substring(0, 8)}... อย่างถาวร? การกระทำนี้ไม่สามารถย้อนกลับได้!`)) {
            return;
        }

        // 1. ยกเลิก Listener ของแชทนั้น
        cancelAllListeners();

        // 2. ลบ Chat node ทั้งหมดออกจาก Firebase
        database.ref(`${CHATS_PATH}/${chatId}`).remove()
            .then(() => {
                showTemporaryMessage(`แชท ID: ${chatId.substring(0, 8)}... ถูกลบออกจากฐานข้อมูลถาวรแล้ว`);
                // ย้ายกลับไปหน้า History List
                showListScreen('history');
                activeChatId = null;
            })
            .catch(error => {
                console.error("Error deleting chat permanently:", error);
                showTemporaryMessage("เกิดข้อผิดพลาดในการลบการสนทนาถาวร", true);
            });
    }

    window.closeChat = function (chatId, isForceClose = true) {
        if (!isFirebaseReady || !database) {
            showTemporaryMessage("Firebase Database ไม่พร้อมใช้งาน", true);
            return;
        }

        const timestampToClose = TIMESTAMP || Date.now();
        if (!timestampToClose) {
            console.warn("Timestamp not available. Proceeding with Date.now().");
        }

        database.ref(`${CHATS_PATH}/${chatId}`).update({
            status: 'closed',
            closedAt: timestampToClose,
            ownerUID: null,
            isLoggedOut: null
        })
            .then(() => {
                const messageText = isForceClose ? "แชทถูกปิดด้วยมือโดย Admin แล้ว" : "แชทถูกปิดอัตโนมัติแล้ว";
                showTemporaryMessage(`แชท ID: ${chatId.substring(0, 8)}... ${messageText}`);
                if (isForceClose) {
                    showListScreen('active');
                    activeChatId = null;
                }
            })
            .catch(error => {
                console.error("Error closing chat:", error);
                showTemporaryMessage("เกิดข้อผิดพลาดในการจบการสนทนา", true);
            });
    }


    function sendMessage() {
        if (!activeChatId) {
            showTemporaryMessage("กรุณาเลือกห้องสนทนา", true);
            return;
        }
        if (!isFirebaseReady || !database) {
            showTemporaryMessage("Firebase Database ไม่พร้อมใช้งาน", true);
            return;
        }

        const inputEl = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendButton');
        const text = inputEl.value.trim();

        if (text === '') {
            showTemporaryMessage("กรุณาพิมพ์ข้อความก่อนส่ง", true);
            return;
        }

        // UI Feedback: Disable input and change button state
        inputEl.disabled = true;
        sendBtn.disabled = true;
        sendBtn.classList.add('disabled-button');
        const originalBtnContent = sendBtn.innerHTML;
        sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const timestamp = TIMESTAMP || Date.now();
        if (!timestamp) {
            showTemporaryMessage("ไม่สามารถรับเวลาจาก Server ได้", true);
            inputEl.disabled = false;
            sendBtn.disabled = false;
            sendBtn.classList.remove('disabled-button');
            sendBtn.innerHTML = originalBtnContent;
            return;
        }

        const messageData = {
            text: text,
            sender: 'admin',
            timestamp: timestamp
        };

        database.ref(`${CHATS_PATH}/${activeChatId}/${MESSAGES_SUB_PATH}`).push(messageData)
            .then(() => {
                inputEl.value = '';
                inputEl.style.height = 'auto';

                // อัปเดตข้อมูลห้องแชท
                return database.ref(`${CHATS_PATH}/${activeChatId}`).update({
                    lastMessage: {
                        text: text,
                        timestamp: Date.now()
                    },
                    lastActivity: Date.now(),
                    unreadByUser: true
                });
            })
            .then(() => {
                // 🚩 [เพิ่มส่วนนี้]: เมื่ออัปเดต DB สำเร็จ ให้ส่งแจ้งเตือนทันที
                console.log("กำลังส่งการแจ้งเตือน...");
                // ตรวจสอบให้แน่ใจว่า activeChatId ในห้องแชทนี้ คือ UID ของผู้ใช้
                fetchUserTokenAndNotify(activeChatId, text);
            })
            .catch((error) => {
                console.error("Error sending message: ", error);
                showTemporaryMessage("ส่งข้อความล้มเหลว", true);
            })
            .finally(() => {
                inputEl.disabled = false;
                sendBtn.disabled = false;
                sendBtn.classList.remove('disabled-button');
                sendBtn.innerHTML = originalBtnContent;
                inputEl.focus();
            });
    }

    // 🔑 [MODIFIED]: เพิ่ม Logic การตรวจสอบและส่ง LINE Notification ที่นี่
    let lastMessageTimestamp = 0; // เพื่อติดตามข้อความล่าสุดที่ส่งแจ้งเตือนไปแล้ว

    function listenForMessages(chatId, isHistory = false) {
        if (!isFirebaseReady || !database) return;

        // ยกเลิก Listener ข้อความเดิม
        if (chatListeners.messages) {
            const oldMessagesRef = database.ref(`${CHATS_PATH}/${chatListeners.messages.chatId}/${MESSAGES_SUB_PATH}`);
            oldMessagesRef.off('child_added', chatListeners.messages.callback);
            oldMessagesRef.off('child_changed', chatListeners.messages.callback);
            delete chatListeners.messages;
        }

        const chatBox = document.getElementById('chatBox');
        if (chatBox) chatBox.innerHTML = '';

        const messagesRef = database.ref(`${CHATS_PATH}/${chatId}/${MESSAGES_SUB_PATH}`).orderByKey();

        const callback = (snapshot) => {
            const messageId = snapshot.key;
            const message = snapshot.val();

            // 🔑 [CRITICAL FIX]: ตรวจสอบและลบข้อความเดิมออกจาก DOM ก่อนเสมอ (สำหรับ child_changed)
            const existingElement = document.querySelector(`[data-message-id="${messageId}"]`);
            if (existingElement) {
                existingElement.remove(); // 👈 **คำสั่งที่ต้องเพิ่ม** (ลบข้อความเก่า)
            }

            // ถ้าเป็นข้อความใหม่หรือมีการอัปเดต (เช่น ถูกลบ)
            if (message && (message.text || message.deleted)) { // ตรวจสอบ deleted ด้วย
                // 🔑 [CRITICAL]: ส่ง isHistory ไปด้วย
                appendMessage(message, messageId, chatId, isHistory); // 👈 เพิ่มข้อความที่อัปเดต/ถูกลบกลับเข้าไปในตำแหน่งเดิม (ด้วย Logic ใน appendMessage)

                // -----------------------------------------------------------
                // 🟢 LINE NOTIFICATION LOGIC (NEW/MODIFIED)
                // -----------------------------------------------------------
                const isNewMessage = existingElement === null;

                if (!isHistory && isNewMessage) {
                    // 1. ตรวจสอบว่าเป็นข้อความจาก 'user' (ลูกค้า) เท่านั้น
                    if (message.sender === 'user') {

                        // 2. ตรวจสอบว่าเป็นข้อความใหม่จริง ๆ และไม่ใช่ข้อความซ้ำจากการโหลดครั้งแรก
                        if (message.timestamp > lastMessageTimestamp) {

                            const notificationText = `[📢 แชทใหม่] ID: ${chatId.substring(0, 8)}... ข้อความ: ${message.text || 'ข้อความรูปภาพ/ไฟล์'}`;

                            // 3. เรียกใช้ฟังก์ชันส่งแจ้งเตือน LINE
                            // Note: sendLineNotification() ต้องถูกประกาศไว้ใน Global Scope
                            if (typeof sendLineNotification === 'function') {
                                sendLineNotification(notificationText);
                            }

                            // 4. อัปเดตเวลาล่าสุดที่ส่งแจ้งเตือนไปแล้ว
                            // Note: lastMessageTimestamp ต้องถูกประกาศไว้ใน Global Scope
                            lastMessageTimestamp = message.timestamp;
                        }
                    }
                }
                // -----------------------------------------------------------

            }
        };

        // กำหนด Listener ใหม่
        chatListeners.messages = { chatId: chatId, callback: callback };

        // ใช้ Listener ทั้ง child_added (ข้อความใหม่) และ child_changed (ข้อความที่ถูกแก้ไข/ลบ)
        messagesRef.on('child_added', callback, (error) => {
            console.error("Error listening for new messages:", error);
            if (chatBox) chatBox.innerHTML = '<div style="padding: 15px; color:#dc3545; text-align:center;">ไม่สามารถโหลดข้อความได้</div>';
        });
        messagesRef.on('child_changed', callback, (error) => {
            console.error("Error listening for message changes:", error);
        });
    }

    function appendMessage(message, messageId, chatId, isHistory = false) {
        const chatBox = document.getElementById('chatBox');
        if (!chatBox) {
            console.error("#chatBox element not found.");
            return;
        }

        const isUser = message.sender === 'user';
        const isAdmin = message.sender === 'admin';
        const isSystem = message.sender === 'system';
        const isDeleted = message.deleted === true;

        // 🚩 [FIXED: HIDE SYSTEM ONLY]: ไม่แสดงข้อความจาก system (ถ้าไม่ได้ใช้)
        if (isSystem) {
            return;
        }

        let bubbleClass;
        let containerClass;
        let textContent = message.text || message.message || message.content || '';

        // 🔑 [FIXED 1]: การจัดการข้อความขึ้นบรรทัดใหม่
        let formattedText = textContent.replace(/\n/g, '<br>');

        // ถ้าเป็นข้อความว่างเปล่า ก็ไม่แสดงผล
        if (textContent.trim() === '' && !isDeleted) {
            return;
        }

        // 🔑 [NEW LOGIC START]: กำหนดชื่อผู้ส่ง
        let senderDisplayName = '';

        if (isUser) {
            containerClass = 'user-container';
            bubbleClass = 'message-bubble user-bubble';

            const ownerUID = message.ownerUID;

            // Note: ADMIN_UID_TO_HIDE ต้องถูกประกาศไว้ใน Global Scope
            if (ownerUID === ADMIN_UID_TO_HIDE) {
                senderDisplayName = '<strong style="color: #007bff;">Admin Chat</strong>';
            } else {
                senderDisplayName = message.name || '';
            }

        } else if (isAdmin) {
            containerClass = 'admin-container';
            bubbleClass = 'message-bubble admin-bubble';
        } else {
            return;
        }
        // 🔑 [NEW LOGIC END]

        // 🔑 [แก้ไข] จัดการเวลาที่แสดงผล (เวลาที่ส่ง vs. เวลายกเลิก)
        let timeToDisplay = message.timestamp;
        let timePrefix = '';

        // 🚩 [FIXED 3]: ถ้าถูกลบ ให้แสดงเวลายกเลิกการส่ง
        if (isDeleted) {
            bubbleClass += ' deleted-bubble';
            formattedText = '<span style="font-style: italic; color: #888;">[ข้อความถูกยกเลิกการส่ง]</span>';

            // 🚩 [CRITICAL FIX]: ใช้ deletedAt แทน timestamp เดิม (ถ้ามี)
            if (message.deletedAt) {
                timeToDisplay = message.deletedAt;
            }
        }

        const messageContainer = document.createElement('div');
        messageContainer.className = `message-container ${containerClass}`;
        messageContainer.setAttribute('data-message-id', messageId);

        const bubble = document.createElement('div');
        bubble.className = bubbleClass;

        // 🔑 [FIXED 2]: ใช้ innerHTML และใส่ข้อความที่ถูกแปลงแล้ว
        bubble.innerHTML = formattedText;

        // 🔑 [NEW LONG PRESS LOGIC]: เพิ่ม Event Listener สำหรับ Context Menu (Delete Message)
        if (isAdmin && !isHistory && !isDeleted) {
            // 1. เพิ่ม Event Listener สำหรับ Context Menu ปกติ (Right-click)
            bubble.addEventListener('contextmenu', (e) => {
                // Note: window.showContextMenu ต้องถูกประกาศไว้ใน Global Scope
                window.showContextMenu(e, chatId, messageId, message.sender, bubble);
            });
            // 2. เพิ่ม Event Listener สำหรับ Long Press (Mobile/Touch)
            // Note: window.setupLongPressHandler ต้องถูกประกาศไว้ใน Global Scope
            window.setupLongPressHandler(bubble, chatId, messageId, message.sender);
        }

        // เวลาข้อความ
        const timeEl = document.createElement('span');
        timeEl.className = 'message-time';
        // Note: formatTime ต้องถูกประกาศไว้ใน Global Scope
        timeEl.innerHTML = timePrefix + formatTime(timeToDisplay);


        // 🚨 [ปรับปรุง]: เปลี่ยนลำดับการ append เพื่อให้ง่ายต่อการจัดเรียงด้วย Flexbox
        if (isAdmin) {
            // สำหรับ Admin: เวลา -> Bubble (แล้วใช้ CSS จัดเรียงให้ Bubble ชิดขวา)
            messageContainer.appendChild(timeEl);
            messageContainer.appendChild(bubble);
        } else { // User (ข้อความสีเทา/ขาว)

            // 🔑 [NEW LOGIC]: แสดงชื่อผู้ส่งด้านบน Bubble ของ User
            if (senderDisplayName) {
                const nameEl = document.createElement('div');
                nameEl.className = 'sender-display-name';
                nameEl.innerHTML = senderDisplayName;
                // 🚨 [CRITICAL]: ต้องให้ nameEl เป็นลำดับแรกสุดใน messageContainer
                messageContainer.appendChild(nameEl);
            }

            // 🚨 [ปรับปรุง]: เปลี่ยนเป็น เวลา -> Bubble เหมือน Admin (แล้วใช้ CSS จัดเรียงให้ Bubble ชิดซ้าย)
            messageContainer.appendChild(timeEl);
            messageContainer.appendChild(bubble);
        }

        // =========================================================
        // 💡 การแก้ไขที่สำคัญ: การแทรกข้อความเพื่อรักษาลำดับเวลา
        // (แทนที่ chatBox.appendChild(messageContainer); เดิม)
        // =========================================================

        let nextMessageElement = null;

        // 1. วนลูปหา Element ข้อความถัดไปที่มี ID (Push Key) มากกว่า ID ปัจจุบัน
        for (const child of chatBox.children) {
            const childMessageId = child.getAttribute('data-message-id');

            // ตรวจสอบว่ามี ID และ ID นั้นมีค่า 'มากกว่า' ID ของข้อความที่เรากำลังจะเพิ่ม (ตาม Lexicographical Order)
            if (childMessageId && childMessageId > messageId) {
                nextMessageElement = child;
                break; // พบ Element ที่ควรอยู่ถัดไปแล้ว
            }
        }

        if (nextMessageElement) {
            // 2. ถ้าเจอ Element ถัดไป ให้นำข้อความใหม่แทรกก่อนหน้า Element นั้น
            chatBox.insertBefore(messageContainer, nextMessageElement);
        } else {
            // 3. ถ้าไม่เจอ Element ถัดไป (คือข้อความใหม่นี้เป็นข้อความล่าสุด) ให้ append ต่อท้าย
            chatBox.appendChild(messageContainer);
        }


        // 🚩 เพิ่ม Class 'show' หลัง append เพื่อให้เกิด Animation
        setTimeout(() => {
            messageContainer.classList.add('show');
        }, 10);


        // Scroll to the bottom (ทำเมื่อผู้ใช้ไม่ได้เลื่อนดูข้อความเก่า)
        if (!isHistory && chatBox.scrollHeight - chatBox.scrollTop < chatBox.clientHeight + 200) {
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }


    // =================================================================
    // === 7. AUTHENTICATION FUNCTIONS (Login/Logout) ===
    // =================================================================

    // ในไฟล์ admin.js (หรือไฟล์ที่ควบคุมหน้าล็อกอินของแอดมิน)
    window.adminLogin = function () {
        if (!auth || !isFirebaseReady) {
            const errorEl = document.getElementById(ERROR_MESSAGE_ELEMENT_ID);
            if (errorEl) errorEl.textContent = 'ระบบ Firebase ยังไม่พร้อม (โปรดตรวจสอบ Console)';
            if (errorEl) errorEl.style.display = 'block';
            return;
        }

        const email = document.getElementById('emailInput').value.trim();
        const password = document.getElementById('passwordInput').value.trim();
        const errorEl = document.getElementById(ERROR_MESSAGE_ELEMENT_ID);
        if (errorEl) errorEl.style.display = 'none';

        if (email === '' || password === '') {
            if (errorEl) {
                errorEl.textContent = 'กรุณากรอกอีเมลและรหัสผ่าน';
                errorEl.style.display = 'block';
            }
            return;
        }

        // 🔑 [การแก้ไขสำคัญ]: ใช้ Persistence.LOCAL สำหรับ Admin 
        // เพื่อให้ Admin ล็อกอินค้างไว้ได้ (Remember Me)
        auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => {
                // เมื่อตั้งค่า Persistence สำเร็จ จึงทำการล็อกอิน
                return auth.signInWithEmailAndPassword(email, password);
            })
            .then((userCredential) => {
                console.log("Admin logged in successfully:", userCredential.user.uid);
                // *** เพิ่มโค้ด redirect ไปหน้า Admin Dashboard ที่นี่ ***
                setupPushNotifications(userCredential.user.uid, true); // Admin Login, ใช้ UID จริง    
                // *** เพิ่มโค้ด redirect ไปหน้า Admin Dashboard ที่นี่ ***
                window.showListScreen('active'); // หรือฟังก์ชัน Redirect อื่นๆ
            })
            .catch((error) => {
                let message = 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ';
                switch (error.code) {
                    case 'auth/user-not-found':
                    case 'auth/wrong-password':
                        message = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง';
                        break;
                    case 'auth/invalid-email':
                        message = 'รูปแบบอีเมลไม่ถูกต้อง';
                        break;
                    case 'auth/invalid-api-key':
                        message = 'API Key ของ Firebase ไม่ถูกต้อง (โปรดตรวจสอบ admin.js)';
                        break;
                    case 'auth/web-storage-unsupported':
                        message = 'ข้อผิดพลาด: เบราว์เซอร์บล็อกการจัดเก็บข้อมูล (Storage) กรุณาลองใหม่หรือปิดโหมดส่วนตัว';
                        break;
                    default:
                        message = 'เข้าสู่ระบบล้มเหลว: ' + error.message;
                }
                if (errorEl) {
                    errorEl.textContent = message;
                    errorEl.style.display = 'block';
                }
                console.error("Login error:", error.message);
            });
    }

    window.adminLogout = function () {
        if (!auth) return;
        auth.signOut().then(() => {
            console.log("Admin logged out.");
        }).catch((error) => {
            console.error("Logout error:", error);
        });
    }

    // =================================================================
    // === 8. INITIAL SETUP & DOM LISTENERS ===
    // =================================================================

    // Auto-resize textarea
    const chatInput = document.getElementById('chatInput');
    if (chatInput) {
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
        });
        // Event Listener สำหรับส่งข้อความ (Enter Key)
        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // ผูก Event Listener ของปุ่ม Login
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.onclick = window.adminLogin;
    }

    // ผูก Event Listener ของปุ่ม Send
    const sendBtn = document.getElementById('sendButton');
    if (sendBtn) {
        sendBtn.onclick = sendMessage;
    }

    // ผูก Event Listener ของปุ่ม Home ใน List Panel
    const goHomeBtn = document.getElementById('goHomeBtn');
    if (goHomeBtn) goHomeBtn.onclick = showWelcomeScreen;
    const backToWelcomeBtn = document.getElementById('backToWelcomeBtn');
    if (backToWelcomeBtn) backToWelcomeBtn.onclick = showWelcomeScreen;

    // ผูก Event Listener ของปุ่ม Back ใน Chat Panel
    const backButton = document.getElementById('backButton');
    if (backButton) {
        backButton.onclick = () => window.showListScreen(currentListType);
    }

    // ผูก Event Listener ของปุ่ม End Chat (สำหรับ Active Mode)
    const endChatButton = document.getElementById('endChatButton');
    if (endChatButton) {
        endChatButton.onclick = () => {
            if (!activeChatId) {
                showTemporaryMessage("ไม่พบ Chat ID", true);
                return;
            }
            if (window.confirm(`ยืนยันการจบการสนทนาของ ID: ${activeChatId.substring(0, 8)}...?`)) {
                window.closeChat(activeChatId, true);
            }
        };
    }

    // ผูก Event Listener ของปุ่ม Delete Chat Permanently (สำหรับ History Mode)
    const deleteChatButton = document.getElementById('deleteChatButton');
    if (deleteChatButton) {
        deleteChatButton.onclick = () => {
            if (!activeChatId) {
                showTemporaryMessage("ไม่พบ Chat ID", true);
                return;
            }
            // window.deleteChatPermanently จะมีการยืนยันซ้ำอยู่แล้ว
            window.deleteChatPermanently(activeChatId);
        };
    }
    // ฟังก์ชันสำหรับลงทะเบียน SW, ขออนุญาต และรับ Token
    function setupPushNotifications(userID, is_admin = false) {
        if (!('serviceWorker' in navigator) || !('Notification' in window)) {
            console.warn("Push notifications are not supported by this browser.");
            return;
        }

        // 1. ลงทะเบียน Service Worker
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
            .then(() => {
                const messaging = firebase.messaging();

                // 2. ขออนุญาต
                messaging.requestPermission()
                    .then(() => messaging.getToken())
                    .then((currentToken) => {
                        if (currentToken) {
                            // 3. บันทึก Token โดยแยก Path
                            // ในฟังก์ชัน setupPushNotifications แก้บรรทัดบันทึก Token:
                            const tokenPath = is_admin ? `admin_metadata/admin_user_001` : `users/${userID}/fcmToken`;

                            firebase.database().ref(tokenPath).set(currentToken)
                                .then(() => console.log(`${is_admin ? 'Admin' : 'User'} Token saved:`, currentToken))
                                .catch(error => console.error("Error saving token:", error));
                        } else {
                            console.log('No FCM Token available.');
                        }
                    })
                    .catch((err) => {
                        console.error('Permission or Token error:', err);
                    });
            })
            .catch((error) => console.error("Service Worker registration failed:", error));
    }


    // *** วิธีเรียกใช้ในแต่ละฝั่ง ***

    // ใน admin.js: เรียกใช้เมื่อ Admin ล็อกอินสำเร็จ
    // setupPushNotifications('admin_user_001', true); 

    // ใน user.js: เรียกใช้เมื่อ User ID ถูกกำหนด
    // setupPushNotifications(currentUserID, false);
    // =================================================================
    // === 12. CHAT LIST LOADING & RENDERING (admin.js) ===
    // =================================================================

    const CHATS_PATH = 'chats'; // 🚩 ต้องมีตัวแปรนี้ใน Global Scope ของ admin.js
    const CHAT_LIST_ELEMENT_ID = 'chatListContainer'; // 🚩 ต้องมี Element นี้ใน admin.html

    /**
     * โหลดและแสดงรายการแชทที่ใช้งานอยู่ (Active) หรือแชทประวัติ (History)
     * @param {boolean} isReload - True หากเป็นการโหลดซ้ำ
     */
    window.loadChatList = function (isReload) {
        if (!window.database || !window.auth.currentUser) return;

        // ยกเลิก Listener เดิมทั้งหมดก่อนโหลดใหม่
        if (isReload) {
            window.cancelAllListeners();
        }

        const listContainer = document.getElementById(CHAT_LIST_ELEMENT_ID);
        listContainer.innerHTML = ''; // ล้างรายการเก่า

        // ตั้งค่า Query ตามโหมดที่กำลังทำงานอยู่ (Active หรือ History)
        let chatRef = database.ref(CHATS_PATH);
        let query;

        if (currentListType === 'active') {
            // 🟢 ACTIVE CHATS: โหลดแชทที่มีสถานะ active = true
            query = chatRef.orderByChild('metadata/active').equalTo(true);
        } else {
            // 📂 HISTORY CHATS: โหลดแชทที่มีสถานะ active = false
            query = chatRef.orderByChild('metadata/active').equalTo(false);
        }

        const onChatChildAdded = (snapshot) => {
            const chatId = snapshot.key;
            const chatData = snapshot.val();

            // กรองตัวเองออกจากรายการ (ถ้ามี)
            if (chatId === 'ADMIN_DUMMY_CHAT') return;

            window.renderChatListItem(chatId, chatData, listContainer);
        };

        const onChatChildChanged = (snapshot) => {
            const chatId = snapshot.key;
            const chatData = snapshot.val();

            // 1. ถ้าสถานะเปลี่ยนจาก Active -> History (หรือกลับกัน) 
            // ให้ลบรายการเดิม และเพิ่มรายการใหม่ (ถ้าตรงกับโหมดปัจจุบัน)
            const itemToRemove = document.getElementById(`chat-item-${chatId}`);
            if (itemToRemove) {
                itemToRemove.remove();
            }

            // 2. ตรวจสอบว่าควรแสดงรายการนี้หรือไม่
            if (chatData.metadata && chatData.metadata.active === (currentListType === 'active')) {
                window.renderChatListItem(chatId, chatData, listContainer);
            }

            // 3. ถ้าเป็นแชทที่กำลังเปิดอยู่ ให้ Update UI
            if (window.activeChatId === chatId) {
                window.updateChatHeader(chatData); // คุณต้องสร้างฟังก์ชันนี้เอง
            }
        };

        const onChatChildRemoved = (snapshot) => {
            const chatId = snapshot.key;
            const itemToRemove = document.getElementById(`chat-item-${chatId}`);
            if (itemToRemove) {
                itemToRemove.remove();
            }
        }

        // ติดตั้ง Listeners และบันทึกไว้ใน Global
        query.on('child_added', onChatChildAdded);
        query.on('child_changed', onChatChildChanged);
        query.on('child_removed', onChatChildRemoved);

        // บันทึก Listener ไว้ใน Global สำหรับการยกเลิกภายหลัง
        chatListeners.chatList = {
            callback: onChatChildAdded, // ใช้ callback เดียวกันสำหรับการอ้างอิง
            query: query
        };

        listContainer.textContent = listContainer.children.length > 0 ? '' : 'ไม่มีรายการแชทในโหมดนี้';
    };


    /**
     * สร้างและแสดงผล Chat Item ในรายการ
     * @param {string} chatId - ID ของแชท
     * @param {object} chatData - ข้อมูลทั้งหมดของแชท
     * @param {HTMLElement} listContainer - Element แม่ที่จะใส่ Chat Item
     */
    window.renderChatListItem = function (chatId, chatData, listContainer) {
        const item = document.createElement('div');
        item.className = 'chat-item';
        item.id = `chat-item-${chatId}`;
        item.onclick = () => window.openChat(chatId, chatData); // 🚩 ต้องมี openChat()

        // ดึงข้อมูลเมตาเพื่อแสดง
        const metadata = chatData.metadata || {};
        const lastMessage = metadata.lastMessageText || 'ไม่มีข้อความล่าสุด';
        const lastTime = metadata.lastMessageTime ? window.formatTime(metadata.lastMessageTime) : 'N/A';

        // สร้าง HTML สำหรับรายการแชท
        item.innerHTML = `
        <div class="chat-info">
            <div class="chat-id">#${chatId.substring(0, 8)}...</div>
            <div class="chat-time">${lastTime}</div>
        </div>
        <div class="chat-preview">${lastMessage}</div>
        <div class="chat-status">${metadata.unreadByAdmin ? '🔔' : '✔️'}</div>
    `;

        // ใส่รายการใหม่ไว้ด้านบนเสมอ (เพื่อให้ข้อความใหม่ล่าสุดอยู่บนสุด)
        listContainer.prepend(item);
    }

    // 🚩 เรียกใช้ฟังก์ชันหลักเมื่อต้องการเปลี่ยนหน้าจอ
    window.loadActiveChats = () => window.loadChatList(true);
    window.loadHistoryChats = () => window.loadChatList(true);
});

// 1. ตรวจสอบและตั้งค่า Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

/**
 * 2. ฟังก์ชันหลักสำหรับขอสิทธิ์และบันทึก Token แบบแยกเครื่อง
 */
async function setupAdminNotification(adminUid) {
    console.log("🚀 เริ่มต้นระบบแจ้งเตือนแอดมินสำหรับ UID:", adminUid);

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.warn("⚠️ แอดมินปฏิเสธสิทธิ์การแจ้งเตือน");
            return;
        }

        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const currentToken = await messaging.getToken({
            vapidKey: 'BKhAJml-bMHqQT-4kaIe5Sdo4vSzlaoca2cmGmQMoFf9UKpzzuUf7rcEWJL4rIlqIArHxUZkyeRi63CnykNjLD0',
            serviceWorkerRegistration: registration
        });

        if (currentToken) {
            let deviceId = localStorage.getItem('admin_device_id');
            if (!deviceId) {
                deviceId = 'dev_' + Math.random().toString(36).substring(2, 9);
                localStorage.setItem('admin_device_id', deviceId);
            }

            const tokenRef = firebase.database().ref(`admin_metadata/${adminUid}/${deviceId}`);
            const snapshot = await tokenRef.once('value');

            // บันทึกเฉพาะเมื่อ Token เปลี่ยนเพื่อลดการเขียน Database
            if (snapshot.val() !== currentToken) {
                await tokenRef.set(currentToken);
                console.log(`✅ อัปเดต Token สำเร็จ (เครื่อง: ${deviceId})`);
            }
        }
    } catch (err) {
        console.error("❌ เกิดข้อผิดพลาดในระบบ Notification:", err);
    }
}

/**
 * 3. ตรวจสอบสถานะการ Login
 */
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        firebase.database().ref('admins/' + user.uid).once('value').then(snap => {
            if (snap.val() === true) {
                console.log("ยินดีต้อนรับแอดมิน:", user.email);
                setTimeout(() => setupAdminNotification(user.uid), 2000);
            }
        });
    }
});

/**
 * 4. ฟังก์ชันส่งแจ้งเตือนหา User (เมื่อตอบแชท)
 * เรียกใช้ฟังก์ชันนี้ในปุ่มส่งข้อความของแอดมิน
 */
async function fetchUserTokenAndNotify(userId, text) {
    if (!userId || !text) return;
    console.log("🚀 กำลังพยายามส่งแจ้งเตือนให้ผู้ใช้ ID:", userId);

    try {
        // ดึง Token
        const snapshot = await firebase.database().ref(`users/${userId}/fcmToken`).once('value');
        const token = snapshot.val();

        if (!token || typeof token !== 'string') {
            console.warn("⚠️ ไม่พบ Token ของผู้ใช้คนนี้ (User อาจยังไม่กดอนุญาตแจ้งเตือน)");
            return;
        }

        // ส่งผ่าน Vercel API
        const response = await fetch('https://2bkc-baojai-zone.vercel.app/api/send-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                title: 'มีข้อความใหม่! 💬',
                body: text,
                icon: 'https://2bkc-baojai-zone.vercel.app/KCปก1.png', // รูปเล็ก
                image: 'https://2bkc-baojai-zone.vercel.app/KCปก1.png',
                link: 'https://2bkc-baojai-zone.vercel.app/',
                recipientUid: userId
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `Server Error: ${response.status}`);
        }

        console.log('✅ แจ้งเตือนผู้ใช้สำเร็จ:', data.messageId);

    } catch (err) {
        console.error('❌ ข้อผิดพลาดในการส่งแจ้งเตือน:', err.message);
    }
}

// 5. รับข้อความขณะเปิดหน้าเว็บค้างไว้ (Foreground Message)
messaging.onMessage((payload) => {
    console.log('🔔 ข้อความใหม่เข้า:', payload);

    // เล่นเสียงแจ้งเตือน
    const audio = new Audio('/admin-notify.mp3');
    audio.play().catch(() => { });

    // แสดงการแจ้งเตือนในหน้าเว็บ (Alert หรือ Custom Toast)
    const { title, body } = payload.notification;
    if (confirm(`📢 ${title}\n${body}\n\nต้องการเปิดหน้าแชทหรือไม่?`)) {
        window.location.href = payload.data?.click_url || '/admin';
    }
});

// เรียกใช้ฟังก์ชันหลัก
initializeAdminSystem();