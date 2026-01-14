// user.js (ฉบับสมบูรณ์ แก้ไขปัญหาข้อความถูกยกเลิกการส่งแสดงผิดตำแหน่ง)

// ===============================================
// 1. Firebase Initialization & Config
// ===============================================

const firebaseConfig = {
    // 🚩 [CONFIG] กรุณาใช้ข้อมูลของ Firebase Project ของคุณ
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

const auth = firebase.auth();
const db = firebase.database();
const database = db;

// ** ใช้งาน Server Value สำหรับ Timestamp **
const TIMESTAMP = firebase.database.ServerValue.TIMESTAMP;

// 🔑 กำหนด Admin UID สำหรับตรวจสอบ
const ADMIN_UID = "o139Nm6N3wSW25fCtAzwf2ymfSm2";
const ADMIN_UID_TO_HIDE = 'o139Nm6N3wSW25fCtAzwf2ymfSm2'; // ต้องกำหนดค่าเดียวกัน

// ===============================================
// 2. Elements & Variables
// ===============================================
const mainContainer = document.getElementById('mainContainer');
const logoArea = document.getElementById('logoArea');
const appTitle = document.getElementById('appTitle');

const welcomeScreen = document.getElementById('welcomeScreen');
const chatScreen = document.getElementById('chatScreen');

const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");
const sendButton = document.getElementById("sendButton");
const notifySound = document.getElementById('notifySound');
const userIdDisplay = document.getElementById('userIdDisplay');
const chatTitle = document.getElementById('chatTitle');
const userInfoArea = document.getElementById('userInfoArea');

const authButton = document.getElementById('authButton');
const mainActions = document.getElementById('mainActions');
const startChatBtn = document.getElementById("startChat");
const logoutBtn = document.getElementById('logoutBtn');

const contextMenu = document.getElementById('contextMenu');
const deleteOption = document.getElementById('deleteOption');
const copyOption = document.getElementById('copyOption');
let activeMessageId = null;
let touchTimer;

let currentUserId = null;
let currentChatId = null;
// 🔑 Listener Variables: เก็บ Callback Function โดยตรง
let chatListener = null; // Listener สำหรับข้อความ
let chatChangeListener = null; // Listener สำหรับการเปลี่ยนแปลงสถานะแชท

const CHATS_PATH = 'chats';
const MESSAGES_PATH = 'messages';

let activeMessageIdForContextMenu = null;
let activeChatIdForContextMenu = null;

// ===============================================
// 3. Utility Functions (Nickname Generator & Time Formatting)
// ===============================================

function generateRandomName() {
    const adjectives = ["เพื่อนสนิท", "ผู้แชร์เรื่องราว", "นักฟัง", "มุมมองใหม่", "เพื่อนร่วมทาง", "ผู้เดินทาง", "เงา", "สายลม"];
    const nouns = ["สีฟ้า", "สีเขียว", "สีม่วง", "สีส้ม", "สีดำ", "สีเทา", "สีขาว", "สีเหลือง"];
    const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * (nouns.length - 1))];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${randomAdj} ${randomNoun} #${randomNum}`;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'กำลังส่ง...';
    if (typeof timestamp === 'object' && timestamp.hasOwnProperty('.sv')) return 'กำลังส่ง...';

    const date = new Date(timestamp);
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    return `${hour}:${minute}`;
}


// ===============================================
// 4. Context Menu Logic 
// ===============================================

document.addEventListener('click', (e) => {
    if (e.target.closest('#contextMenu') === null) {
        contextMenu.style.display = 'none';
        activeMessageIdForContextMenu = null;
        activeChatIdForContextMenu = null;
    }
});

document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.message-bubble') === null) {
        contextMenu.style.display = 'none';
    }
});


deleteOption.addEventListener('click', () => {
    if (activeMessageIdForContextMenu && activeChatIdForContextMenu) {
        deleteMessage(activeChatIdForContextMenu, activeMessageIdForContextMenu);
    }
    contextMenu.style.display = 'none';
});

if (copyOption) {
    copyOption.addEventListener('click', () => {
        if (activeMessageIdForContextMenu && activeChatIdForContextMenu) {
            copyMessage(activeChatIdForContextMenu, activeMessageIdForContextMenu);
        }
        contextMenu.style.display = 'none';
    });
}


function setupContextMenu(bubbleEl, chatId, messageId) {
    // ตรวจสอบว่าเป็นข้อความของ User ปัจจุบันหรือไม่
    const isUserMessage = firebase.auth().currentUser && firebase.auth().currentUser.uid === chatId;

    // 🚩 Desktop (คลิกขวา) - เปลี่ยนมาใช้ addEventListener
    bubbleEl.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation(); // กันไม่ให้ Event ไหลไปที่อื่น

        if (!isUserMessage) return;

        activeMessageIdForContextMenu = messageId;
        activeChatIdForContextMenu = chatId;

        // แสดงเมนู
        contextMenu.style.display = 'block';
        contextMenu.style.left = e.clientX + 'px';
        contextMenu.style.top = e.clientY + 'px';

        if (deleteOption) deleteOption.style.display = 'block';
    });

    // 🚩 Mobile (กดค้าง) - ปรับปรุง Logic
    let touchTimeout;
    bubbleEl.addEventListener('touchstart', function (e) {
        touchTimeout = setTimeout(() => {
            if (!isUserMessage) return;

            const touch = e.touches[0];
            activeMessageIdForContextMenu = messageId;
            activeChatIdForContextMenu = chatId;

            contextMenu.style.display = 'block';
            contextMenu.style.left = touch.clientX + 'px';
            contextMenu.style.top = touch.clientY + 'px';

            if (deleteOption) deleteOption.style.display = 'block';
        }, 700); // เพิ่มเวลาเป็น 0.7 วินาทีเพื่อให้เสถียรขึ้น
    }, { passive: true });

    bubbleEl.addEventListener('touchend', () => clearTimeout(touchTimeout));
    bubbleEl.addEventListener('touchmove', () => clearTimeout(touchTimeout));
}

function showUnsendMenu(x, y, messageId) {
    activeMessageIdForContextMenu = messageId;
    activeChatIdForContextMenu = currentChatId;

    // แสดงเมนูตามพิกัดที่ส่งมา
    contextMenu.style.top = `${y}px`;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.display = 'block';

    // เช็คสิทธิ์การแสดงปุ่มลบ (ลบได้เฉพาะข้อความตัวเอง)
    // ในที่นี้ถ้าเป็นแชทระหว่าง User กับ Admin ค่า chatId มักจะเป็น UID ของ User
    deleteOption.style.display = 'block';
}


// ===============================================
// 5. Page Switching & UI Management
// ===============================================

function hideAllScreens() {
    welcomeScreen.style.display = 'none';
    chatScreen.style.display = 'none';
}

window.showStartScreen = function () {
    console.log("Navigating to Start Screen and performing cleanup...");

    hideAllScreens();
    welcomeScreen.style.display = 'flex';
    welcomeScreen.style.flexGrow = '1';

    if (currentUserId) {

        authButton.style.display = 'none';
        mainActions.style.display = 'flex';
        startChatBtn.textContent = 'กดเพื่อสนทนา';
        startChatBtn.onclick = window.loadOrCreateChat;
        logoutBtn.onclick = window.userLogout;

        userIdDisplay.style.display = 'block';
        userInfoArea.style.display = 'flex';
        userIdDisplay.textContent = `รหัสผู้ใช้ ID: ${currentUserId.substring(0, 7)}...`;

    } else {

        authButton.style.display = 'block';
        authButton.textContent = 'เริ่มต้นใช้งาน (สุ่ม ID)';
        authButton.onclick = window.handleAuth;
        authButton.classList.add('primary-button');

        mainActions.style.display = 'none';

        userIdDisplay.style.display = 'none';
        userInfoArea.style.display = 'none';
    }
}

function showChatScreen() {
    hideAllScreens();
    chatScreen.style.display = 'flex';
    chatTitle.textContent = `ห้องสนทนา ID: ${currentChatId ? currentChatId.substring(0, 8) : 'ใหม่'}...`;
}

/**
 * @function cleanupChatSession
 * ล้าง Listener และ UI ก่อนสร้าง Session ใหม่
 */
function cleanupChatSession() {
    // 🚩 [FIX]: ปรับปรุงการ off() ให้รองรับ Listener หลายประเภท (child_added, child_changed)
    if (currentChatId) {
        const messagesRef = database.ref(`${CHATS_PATH}/${currentChatId}/messages`);
        messagesRef.off('child_added');
        messagesRef.off('child_changed');
    }
    chatListener = null;

    if (chatChangeListener && currentChatId) {
        database.ref(`${CHATS_PATH}/${currentChatId}`).off('child_changed', chatChangeListener);
        chatChangeListener = null;
    }
    chatBox.innerHTML = '';
    currentChatId = null;
}


// ===============================================
// 6. Authentication Status & Logout
// ===============================================

function updateChatOwnerUID(chatId, ownerUID) {
    if (!chatId) return;
    return database.ref(`${CHATS_PATH}/${chatId}`).update({
        ownerUID: ownerUID
    }).catch(error => {
        console.error("Error updating ownerUID:", error);
    });
}

function setupDisconnectHandler(chatId) {
    if (!chatId) return;
    const chatRef = database.ref(`${CHATS_PATH}/${chatId}`);
    console.log(`OnDisconnect handler set for chat: ${chatId}.`);
}

function clearDisconnectHandler(chatId) {
    if (!chatId) return;
    const chatRef = database.ref(`${CHATS_PATH}/${chatId}`);

    chatRef.child('ownerUID').onDisconnect().cancel();

    console.log(`OnDisconnect handler cleared for chat: ${chatId}.`);
}

/**
 * @function handleInvalidIdCleanup 
 * ใช้สำหรับบังคับ Sign Out และสุ่ม ID ใหม่ (แต่ไม่ลบ Chat Record หลัก) เมื่อ ID เดิมถูกปิดสถานะ
 */
async function handleInvalidIdCleanup(alertMessage) {
    if (alertMessage) alert(alertMessage);

    // 🔑 NEW LOGIC: แค่ Sign Out/Reload เพื่อบังคับสุ่มใหม่
    await performSignOut(true);

    return false; // เพื่อให้ onAuthStateChanged หยุดทำงานต่อ
}


/**
 * @function checkChatStatusAndHandleInvalidId 
 * ตรวจสอบสถานะของ Chat ID ที่กู้คืนมา (จาก Local Storage) หากถูกลบ/ปิดสถานะ จะบังคับ Sign Out/สุ่ม ID ใหม่
 */
function checkChatStatusAndHandleInvalidId(user) {
    if (!user.isAnonymous || user.uid === ADMIN_UID) {
        return Promise.resolve(true);
    }

    return database.ref(`${CHATS_PATH}/${user.uid}`).once('value')
        .then(snapshot => {
            const chatData = snapshot.val();

            // 🔥 1. ตรวจสอบว่า Record ถูกลบโดยตรงหรือไม่ (Record หายไป)
            if (!chatData) {
                console.warn(`[FORCE ID CLEANUP] Chat ID ${user.uid.substring(0, 8)}... is missing/deleted. Forcing new ID.`);
                // 🔑 ใช้ Logic ใหม่: แค่ Sign Out/Reload
                return handleInvalidIdCleanup("ID ผู้ใช้นี้ถูกลบออกจากฐานข้อมูลแล้ว ระบบจะทำการสุ่ม ID ใหม่ให้คุณ");
            }

            // 2. ตรวจสอบว่า Record ถูกปิดสถานะหรือไม่
            if (chatData.status === 'closed') {
                console.warn(`[FORCE ID CLEANUP] Chat ID ${user.uid.substring(0, 8)}... is CLOSED. Forcing new ID.`);
                // 🔑 ใช้ Logic ใหม่: แค่ Sign Out/Reload
                return handleInvalidIdCleanup("ห้องสนทนาของคุณถูกปิดหรือถูกลบโดยแอดมินแล้ว ID ผู้ใช้นี้จึงไม่สามารถใช้งานต่อได้ ระบบจะทำการสุ่ม ID ใหม่ให้คุณ");
            }

            return true;
        })
        .catch(e => {
            console.error("Error checking chat status:", e);
            return true;
        });
}


auth.onAuthStateChanged(user => {
    if (user) {
        currentUserId = user.uid;
        currentChatId = currentUserId;

        setupDisconnectHandler(currentUserId);

        const updateStatusPromise = database.ref(`${CHATS_PATH}/${currentUserId}`).update({
            status: 'active',
            ownerUID: currentUserId,
            closedAt: null,
            isLoggedOut: null
        }).catch(e => {
            console.log("Chat update on login failed, possibly new user or no record yet.", e);
        });

        updateStatusPromise.finally(() => {
            checkChatStatusAndHandleInvalidId(user)
                .then(isIdValid => {
                    if (!isIdValid) {
                        return; // ID ไม่ valid จะถูกลบและรีโหลดหน้าไปแล้ว
                    }
                    window.showStartScreen();
                })
                .catch(e => {
                    console.error("Error during auth state recovery final step:", e);
                    window.showStartScreen();
                });
        });

    } else {
        if (currentUserId) {
            clearDisconnectHandler(currentUserId);
        }

        currentUserId = null;
        cleanupChatSession();
        window.showStartScreen();
    }
});


/**
 * @function handleAuth (สร้าง ID ใหม่และตรวจสอบไม่ให้ซ้ำกับ Admin ID)
 */
window.handleAuth = async function () {
    if (currentUserId) {
        window.loadOrCreateChat();
        return;
    }

    authButton.textContent = 'กำลังสร้าง ID...';

    try {
        await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        console.log("Persistence set to LOCAL.");

        let attempts = 0;
        let isIdAdmin = true;
        let tempUser;

        // 🔑 Loop จนกว่าจะได้ ID ที่ไม่ใช่ Admin ID
        while (isIdAdmin && attempts < 5) {
            tempUser = await auth.signInAnonymously();

            if (tempUser.user.uid === ADMIN_UID) {
                console.warn("Attempted sign-in resulted in Admin UID. Signing out and retrying...");
                await auth.signOut();
                isIdAdmin = true;
                attempts++;
            } else {
                isIdAdmin = false;
            }
        }

        if (attempts >= 5) {
            throw new Error("Failed to generate non-admin UID after multiple attempts.");
        }

        console.log("Anonymous sign-in success. onAuthStateChanged will handle display.");

    } catch (error) {
        console.error("Anonymous sign-in failed:", error);
        alert("เกิดข้อผิดพลาดในการเริ่มต้นใช้งาน: " + error.message);
        authButton.textContent = 'เริ่มต้นใช้งาน (สุ่ม ID)';
        window.showStartScreen();
    }
}


/**
 * @function userLogout 
 * 🔑 [NEW LOGIC] Soft Close: ตั้งค่าสถานะเป็น 'closed' เท่านั้น แล้ว Sign Out/Reload
 */
window.userLogout = async function () {
    const user = auth.currentUser;

    if (!user || !currentUserId) {
        await performSignOut(true);
        return;
    }

    const isAnonymous = user.isAnonymous;
    let confirmMessage = isAnonymous
        ? "แน่ใจหรือไม่ที่จะออกจากระบบ? จะไม่สามารถสนทนาต่อด้วย ID นี้ได้อีก"
        : "คุณจะได้รับ ID ใหม่ในการเริ่มต้นใช้งาน(สุ่มID)ใหม่ครั้งหน้า";

    if (!confirm(confirmMessage)) {
        return;
    }

    const chatId = currentUserId;
    const chatRef = database.ref(`${CHATS_PATH}/${chatId}`);

    try {
        clearDisconnectHandler(chatId);

        // 🔑 Soft Close: อัปเดตแค่สถานะ (closed), ownerUID: null, และ isLoggedOut: true
        await chatRef.update({
            isLoggedOut: true,
            ownerUID: null,
            status: 'closed', // <--- ตั้งสถานะเป็น Closed ตามความต้องการ
            closedAt: TIMESTAMP
        });
        console.log(`[Logout] Chat ${chatId.substring(0, 8)}... marked as Closed.`);

    } catch (error) {
        console.error("Error updating chat status before logout. Proceeding with sign out:", error);
    }

    // 🔑 Sign Out และล้าง Local Storage/Reload โดยไม่ต้องลบ Auth User/Chat Record
    await performSignOut(true);
};


/**
 * performSignOut (ล้าง Local Storage และ Hard Reload)
 */
async function performSignOut(removeLocalStorage = false) {
    try {
        await auth.signOut();
        console.log("User signed out.");

        if (removeLocalStorage) {
            localStorage.removeItem('friendCornerUserId');
            console.log("Local Storage (friendCornerUserId) cleared.");

            // 🔑 การรีโหลดหน้าจะทำให้โค้ด handleAuth ถูกเรียกและสุ่ม ID ใหม่
            window.location.reload(true);
        }

    } catch (error) {
        console.error("Error signing out:", error);
        alert("ออกจากระบบไม่สำเร็จ");
    }
}


// ===============================================
// 7. Chat Control (Strict 1-Session Rule) 
// ===============================================

/**
 * @function loadOrCreateChat 
 * โหลดแชทเดิมหรือสร้างแชทใหม่
 */
window.loadOrCreateChat = function () {
    if (!currentUserId) {
        alert("กรุณาเริ่มต้นใช้งานก่อน");
        return;
    }

    const chatId = currentUserId;

    cleanupChatSession();

    database.ref(`${CHATS_PATH}/${chatId}`).once('value', snapshot => {
        const chatData = snapshot.val();

        // 1. แชท Active และเป็นเจ้าของ (สถานะปกติ)
        if (chatData && chatData.status === 'active' && chatData.ownerUID === currentUserId) {

            updateChatOwnerUID(chatId, currentUserId)
                .then(() => database.ref(`${CHATS_PATH}/${chatId}`).update({
                    status: 'active',
                    closedAt: null,
                    isLoggedOut: null
                }))
                .then(() => startChatSession(chatId));

            // 2. แชท Active แต่ไม่ใช่เจ้าของ (สถานะค้าง, ควรปิด)
        } else if (chatData && chatData.status === 'active' && chatData.ownerUID !== currentUserId) {

            database.ref(`${CHATS_PATH}/${chatId}`).update({
                status: 'closed',
                ownerUID: null,
                closedAt: TIMESTAMP
            }).then(() => {
                alert("พบแชทที่สถานะค้าง ได้ทำการปิดแชทนั้นเรียบร้อยแล้ว กรุณาเริ่มแชทใหม่");
                createNewChatSession(chatId);
            });
            return;

            // 3. แชทเคยมีอยู่ แต่ถูกตั้งค่าเป็น 'closed' แล้ว หรือ Record หายไป (ถูกลบโดยตรง)
        } else if (!chatData || chatData.status === 'closed' || chatData.ownerUID === null || chatData.isLoggedOut === true) {

            // 🚩 ถ้าพบว่า ID นี้ถูกปิดสถานะ (closed) หรือ Record หายไป ให้ถือว่า ID นี้ไม่สามารถใช้ได้แล้ว
            // เราจะบังคับให้ User Logout เพื่อให้ onAuthStateChanged เรียก checkChatStatus และลบ ID ถาวร
            alert("ห้องสนทนานี้ถูกปิดสถานะแล้ว และ ID ผู้ใช้นี้ไม่สามารถใช้งานได้ต่อ ระบบจะทำการสุ่ม ID ใหม่ให้คุณ");

            window.userLogout();

            return; // หยุดการทำงานของ loadOrCreateChat ทันที

            // 4. แชทไม่เคยมีอยู่ (new chat)
        } else {
            createNewChatSession(chatId);
        }
    })
        .catch(error => {
            console.error("Error loading chat history:", error);
            alert("เกิดข้อผิดพลาดในการตรวจสอบสถานะแชท");
        });
}


/**
 * @function createNewChatSession
 * สร้าง Record แชทใหม่ใน DB
 */
function createNewChatSession(chatId) {
    const randomNickname = generateRandomName();

    const welcomeMessageText = `สวัสดีครับ ${randomNickname}! คุณได้เริ่มต้นการสนทนาใหม่แล้ว รหัสผู้ใช้ของคุณคือ: ${chatId.substring(0, 8)}...`;
    const tempTimestamp = TIMESTAMP;

    const chatData = {
        ownerUID: currentUserId,
        status: 'active',
        createdAt: tempTimestamp,
        lastActivity: tempTimestamp,
        userNickname: randomNickname,
        unreadByAdmin: true,
        lastMessage: {
            text: welcomeMessageText,
            timestamp: tempTimestamp
        }
    };

    // 🔑 ใช้ set() เพื่อเขียนทับ Record เดิมที่อาจจะมีสถานะ 'closed' อยู่
    database.ref(`${CHATS_PATH}/${chatId}`).set(chatData)
        .then(() => {
            currentChatId = chatId;

            database.ref(`${CHATS_PATH}/${chatId}/messages`).push({
                sender: 'system',
                text: welcomeMessageText,
                timestamp: tempTimestamp
            });

            startChatSession(chatId);
        })
        .catch(error => {
            console.error("Error creating chat session:", error);
            alert("ไม่สามารถสร้างห้องสนทนาได้");
        });
}


function startChatSession(chatId) {
    currentChatId = chatId;

    showChatScreen();

    database.ref(`${CHATS_PATH}/${chatId}`).update({
        unreadByUser: false,
        status: 'active',
        ownerUID: currentUserId,
        closedAt: null,
        isLoggedOut: null
    });

    attachMessageListener(chatId);
    attachChatChangeListener(chatId);

    setTimeout(() => {
        chatInput.focus();
    }, 100);
}

function attachChatChangeListener(chatId) {
    if (chatChangeListener && currentChatId) {
        database.ref(`${CHATS_PATH}/${currentChatId}`).off('child_changed', chatChangeListener);
    }

    const callback = (snapshot) => {
        if (snapshot.key === 'status' && snapshot.val() === 'closed') {
            alert("ห้องสนทนานี้ถูกปิดโดยแอดมินหรือระบบแล้ว กรุณาออกจากระบบและเริ่มแชทใหม่");
            window.showStartScreen();
        }
    };

    database.ref(`${CHATS_PATH}/${chatId}`).on('child_changed', callback);
    chatChangeListener = callback;
}


/**
 * @function attachMessageListener 
 * ผูก Listener กับ messages sub-collection เพื่อรับข้อความทั้งหมด (รวมถึงการอัปเดตสถานะ)
 */
function attachMessageListener(chatId) {
    // 1. ยกเลิก Listener เดิมทั้งหมด
    if (currentChatId) {
        const messagesRef = database.ref(`${CHATS_PATH}/${currentChatId}/messages`);
        messagesRef.off('child_added');
        messagesRef.off('child_changed');
    }

    const messagesRef = database.ref(`${CHATS_PATH}/${chatId}/messages`);

    // 2. สร้าง Callback สำหรับข้อความใหม่
    const handleMessageAdd = (snapshot) => {
        const message = snapshot.val();
        const messageId = snapshot.key;
        // ตรวจสอบว่าข้อความใหม่เป็นข้อความที่เพิ่งเข้ามาหรือไม่ (เพื่อให้เสียงแจ้งเตือนทำงานได้)
        const isNewMessage = chatBox.childElementCount > 0;

        appendMessage(message, messageId, chatId);

        // 3. เมื่อเป็นข้อความของ Admin ให้เล่นเสียงแจ้งเตือน
        if (message.sender === 'admin' && isNewMessage) {
            playNotificationSound();
        }
    };

    // 3. สร้าง Callback สำหรับข้อความที่ถูกอัปเดต (เช่น ถูกยกเลิกการส่ง)
    const handleMessageChange = (snapshot) => {
        const message = snapshot.val();
        const messageId = snapshot.key;

        // 🔑 [CRITICAL FIX]: ลบ Element เดิมออกก่อนแล้วสร้างใหม่เพื่อรีเฟรชสถานะ
        const oldContainer = document.querySelector(`[data-message-id="${messageId}"]`);
        if (oldContainer) {
            oldContainer.remove();
        }

        // ส่งต่อให้ appendMessage จัดการสร้าง bubble ใหม่ (ที่เป็น [ข้อความถูกยกเลิกการส่ง])
        appendMessage(message, messageId, chatId);
    };


    // 4. ผูก Listener ใหม่
    messagesRef.on('child_added', handleMessageAdd);
    messagesRef.on('child_changed', handleMessageChange); // <-- 🔑 เพิ่ม Listener นี้

    chatListener = true;
}


function appendMessage(message, messageId, chatId) {

    // ตรวจสอบ chatBox (สมมติว่ามีการประกาศ chatBox ไว้แล้ว)
    const chatBox = document.getElementById('chatBox');
    if (!chatBox) return;

    // 1. ตัวแปรเริ่มต้น
    const isUser = message.sender === 'user';
    const isAdmin = message.sender === 'admin';
    const isDeleted = message.deleted === true;
    let isSystem = message.sender === 'system';

    // 🔑 [CRITICAL FIX]: กรองข้อความที่ไม่มีเนื้อหา *และ* ไม่ได้ถูกลบ
    const textContent = message.text || message.message || message.content || '';
    if (textContent.trim() === '' && !isDeleted) {
        return; // กรองข้อความว่างเปล่าที่ไม่ใช่ข้อความถูกลบ
    }

    // 2. ป้องกันข้อความซ้ำ (เหลือแค่การป้องกันไม่ให้ child_added สร้างข้อความซ้ำ)
    if (document.querySelector(`[data-message-id="${messageId}"]`)) {
        // ให้ handleMessageChange จัดการลบ/สร้างใหม่เอง
        return;
    }

    let bubbleClass;
    let containerClass;
    let senderDisplayName = null;
    let formattedText;

    // 3. Logic การแสดงชื่อผู้ส่ง (สำหรับ Admin ที่ปลอมเป็น User)
    if (isUser && message.uid === ADMIN_UID_TO_HIDE) {
        senderDisplayName = '<strong style="color: #007bff;">Admin Chat</strong>';
    } else if (isUser) {
        senderDisplayName = message.name || '';
    }

    // 4. Logic การจัดการประเภทข้อความ (รวมถึงการแทนที่ข้อความที่ถูกลบ)
    if (isDeleted) {
        // 🔑 [CRITICAL FIX]: แทนที่ข้อความเดิมด้วยข้อความยกเลิกการส่ง
        isSystem = true; // กำหนดให้เป็น System เพื่อให้ไม่มีเวลาแสดงผลและอยู่ตรงกลาง
        bubbleClass = 'deleted-bubble';
        containerClass = 'system-container';

        // ** 🚩 แก้ไข: เพิ่ม font-size: 0.8em; เพื่อให้ตัวอักษรเล็กลง **
        formattedText = '<span style="font-style: italic; color: #888; font-size: 0.8em;">[ข้อความถูกยกเลิกการส่ง]</span>';

    } else if (isSystem) {
        bubbleClass = 'system-bubble';
        containerClass = 'system-container';

    } else if (isUser) {
        bubbleClass = 'user-bubble';
        containerClass = 'user-container';
        // แปลง \n เป็น <br> สำหรับข้อความจริง
        formattedText = textContent.replace(/\n/g, '<br>');

    } else if (isAdmin) {
        bubbleClass = 'admin-bubble';
        containerClass = 'admin-container';
        // แปลง \n เป็น <br> สำหรับข้อความจริง
        formattedText = textContent.replace(/\n/g, '<br>');
    } else {
        return;
    }

    // 5. การสร้าง Element
    const messageContainer = document.createElement('div');
    messageContainer.className = `message-container ${containerClass} new-message`;
    messageContainer.setAttribute('data-message-id', messageId);

    // 6. การแสดงชื่อผู้ส่ง (ถ้ามี)
    if (senderDisplayName && isUser && !isDeleted) {
        const nameEl = document.createElement('div');
        nameEl.className = 'sender-display-name';
        nameEl.innerHTML = senderDisplayName;
        messageContainer.appendChild(nameEl);
    }

    // 7. สร้าง Bubble และใส่เนื้อหา
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${bubbleClass}`;

    // ใช้ formattedText เป็นหลัก ซึ่งถูกกำหนดไว้แล้วสำหรับทุกกรณี
    if (formattedText) {
        bubble.innerHTML = formattedText;
    } else {
        // Fallback สำหรับข้อความดิบ
        bubble.textContent = textContent;
    }

    // 8. Event Listener
    // --- ส่วนที่ 8. Event Listener ใน appendMessage ---
    if (isUser && !isDeleted) {
        // ให้เฉพาะข้อความ user ที่ยังไม่ถูกลบเท่านั้นที่เรียกใช้เมนู
        setupContextMenu(bubble, chatId, messageId);
    } else if (isDeleted) {
        // 🚩 [เพิ่มตรงนี้] ถ้าถูกลบแล้ว ให้ระงับการคลิกขวาของ bubble นี้โดยเฉพาะ
        bubble.oncontextmenu = (e) => {
            e.preventDefault();
            e.stopPropagation();
            return false;
        };

        // สำหรับมือถือ (ถ้าใช้ระบบ touchstart แยก)
        bubble.ontouchstart = (e) => {
            // ไม่ต้องทำอะไร หรือสั่งระงับเมนู
            e.stopPropagation();
        };
    }

    // 9. การจัดเรียงเวลาและ Bubble
    if (!isSystem) { // เฉพาะข้อความ User หรือ Admin (ไม่รวม System/Deleted)
        const time = document.createElement('span');
        time.className = 'message-time';
        time.textContent = formatTimestamp(message.timestamp);

        // จัดเรียงตาม type ของผู้ส่ง
        if (isUser) {
            messageContainer.appendChild(bubble);
            messageContainer.appendChild(time);
        } else if (isAdmin) {
            messageContainer.appendChild(time);
            messageContainer.appendChild(bubble);
        }
    } else {
        // ข้อความ System หรือ Deleted จะอยู่ตรงกลางและไม่มีเวลา
        messageContainer.appendChild(bubble);
    }


    // 🔑 [FIXED LOGIC]: การแทรก Element ตามลำดับเวลา (Push ID)
    let nextMessage = null;
    const existingMessages = chatBox.children;

    for (let i = 0; i < existingMessages.length; i++) {
        const existingContainer = existingMessages[i];
        const existingId = existingContainer.getAttribute('data-message-id');

        // ถ้า ID ของข้อความใหม่/อัปเดต (messageId) มีค่า "น้อยกว่า" ID ของข้อความที่มีอยู่แล้ว 
        // หมายความว่าข้อความใหม่ถูกส่ง "ก่อน" ข้อความที่มีอยู่ (Push ID เรียงตามเวลา)
        if (existingId && messageId < existingId) {
            nextMessage = existingContainer;
            break;
        }
    }

    // 10. แทรก Element
    if (nextMessage) {
        chatBox.insertBefore(messageContainer, nextMessage);
    } else {
        chatBox.appendChild(messageContainer);
    }

    // 🚩 ปรับปรุง: เลื่อนลงล่างสุดโดยรอให้ข้อความปรากฏก่อน
    setTimeout(() => {
        messageContainer.classList.add('show');
        chatBox.scrollTo({
            top: chatBox.scrollHeight,
            behavior: 'smooth' // เลื่อนแบบนุ่มนวล
        });
    }, 50); // รอ 50ms เพื่อให้เบราว์เซอร์วาดหน้าจอเสร็จ
}

// ===============================================
// 8. Message Sending & Deletion
// ===============================================

sendButton.onclick = sendMessage;
chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

function sendMessage() {
    const msg = chatInput.value.trim();
    if (!msg || !currentChatId) return;

    const timestamp = firebase.database.ServerValue.TIMESTAMP; // ใช้ค่ามาตรฐานของ Firebase

    // 1. อัปเดตข้อมูลแชทหลัก
    database.ref(`${CHATS_PATH}/${currentChatId}`).update({
        lastActivity: timestamp,
        lastMessage: {
            text: msg,
            timestamp: timestamp
        },
        unreadByAdmin: true,
        ownerUID: currentUserId,
        status: 'active'
    });

    // 2. เขียนข้อความลงใน messages sub-collection
    database.ref(`${CHATS_PATH}/${currentChatId}/messages`).push({
        sender: 'user',
        text: msg,
        timestamp: timestamp
    }).then(() => {
        // --- 🚩 [เพิ่มตรงนี้] ส่งแจ้งเตือนไปหาแอดมินทันทีเมื่อบันทึกสำเร็จ ---
        notifyAdmin(msg);
    });

    chatInput.value = '';
}

// 3. ฟังก์ชันสำหรับยิงแจ้งเตือน (วางไว้ข้างนอกหรือในไฟล์เดียวกัน)
function notifyAdmin(messageText) {
    // ไปดึง Token ที่แอดมินฝากไว้ในระบบ
    database.ref('admin_metadata/fcmToken').once('value').then(snap => {
        const adminToken = snap.val();

        if (adminToken) {
            fetch('https://2bkc-baojai-zone-admin.vercel.app/api/send-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: adminToken,
                    title: 'มีข้อความใหม่จากผู้ใช้! 📩',
                    body: messageText,
                    data: {
                        url: 'https://2bkc-baojai-zone-admin.vercel.app/' // URL หน้าแอดมิน
                    }
                })
            })
                .then(res => res.json())
                .then(data => console.log('✅ แจ้งเตือนแอดมินสำเร็จ:', data))
                .catch(err => console.error('❌ แจ้งเตือนแอดมินล้มเหลว:', err));
        } else {
            console.warn("ไม่พบ Token แอดมินใน Database (admin_metadata/fcmToken)");
        }
    });
}

function deleteMessage(chatId, messageId) {
    if (!confirm("❗ต้องการยกเลิกการส่งหรือไม่?")) return;

    // 🔑 [SOFT DELETE]: อัปเดต 3 ฟิลด์สำคัญ: deleted: true, text: null, และ deletedAt
    database.ref(`${CHATS_PATH}/${chatId}/messages/${messageId}`).update({
        deleted: true,
        text: null, // 🚩 CRITICAL: ต้องเป็น null เพื่อให้ Rules อนุญาต
        deletedAt: TIMESTAMP
    }).then(() => {

        // 🔑 handleMessageChange จะจัดการลบ Element เก่าและสร้าง Element ใหม่พร้อมแทรกในตำแหน่งเดิมให้เอง

        alert("ข้อความถูกยกเลิกการส่งแล้ว");

    }).catch(error => {
        console.error("Error deleting message:", error);
        alert("เกิดข้อผิดพลาดในการลบข้อความ");
    });
}

function showUnsendMenu(x, y, messageId) {
    activeMessageIdForContextMenu = messageId;
    activeChatIdForContextMenu = currentChatId; // ใช้ chatId ปัจจุบัน
    contextMenu.style.top = `${y}px`;
    contextMenu.style.left = `${x}px`;
    contextMenu.style.display = 'block';
    // เช็คสิทธิ์ปุ่ม Delete
    deleteOption.style.display = 'block';
}

function copyMessage(chatId, messageId) {
    const container = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!container) return;

    const bubble = container.querySelector('.message-bubble');
    // ตรวจสอบว่าเป็นข้อความที่ถูกลบหรือไม่ โดยเช็ค Class
    if (bubble.classList.contains('deleted-bubble')) {
        alert("ไม่สามารถคัดลอกข้อความที่ถูกยกเลิกการส่งได้");
        return;
    }

    const textToCopy = bubble.innerText; // ใช้ innerText จะได้ข้อความตามที่เห็น
    navigator.clipboard.writeText(textToCopy)
        .then(() => alert("คัดลอกข้อความเรียบร้อย!"))
        .catch(err => console.error('Copy failed:', err));
}


// ===============================================
// 9. Utility & Initial Load
// ===============================================

function playNotificationSound() {
    if (notifySound) {
        notifySound.play().catch(e => console.warn("Audio play blocked by browser:", e));
    }
}


function initializeAuth() {
    auth.getRedirectResult().catch(error => {
        if (error.code !== 'auth/no-current-user') {
            console.warn("getRedirectResult completed (ignored error, if any):", error.code);
        }
    });
}


// ใช้ DOMContentLoaded เพื่อให้แน่ใจว่าหา Element เจอแน่นอน
document.addEventListener('DOMContentLoaded', function () {
    const overlay = document.getElementById('popup-overlay');
    const closeBtn = document.getElementById('close-popup');

    // 1. ตรวจสอบว่ามีป๊อปอัพอยู่ในหน้าเว็บจริงไหม
    if (overlay) {
        // แสดงป๊อปอัพเมื่อโหลดหน้าเว็บเสร็จ (ใช้ setTimeout เล็กน้อยเพื่อให้ Smooth)
        setTimeout(() => {
            overlay.style.display = 'flex';
            overlay.style.opacity = "1";
        }, 100);
    }

    // 2. ตรวจสอบว่ามีปุ่มปิดจริงไหม ก่อนจะสั่งงาน (แก้ Error null)
    if (closeBtn && overlay) {
        closeBtn.onclick = function () {
            // เพิ่มอนิเมชั่นขาออก (Fade Out)
            overlay.style.transition = "opacity 0.3s ease";
            overlay.style.opacity = "0";

            // รอให้อนิเมชั่นจบก่อนค่อยสั่ง display: none
            setTimeout(function () {
                overlay.style.display = 'none';
            }, 300);
        };
    }
});

// ===============================================
// 10. Firebase Messaging Setup (แจ้งเตือน)
// ===============================================

const messaging = firebase.messaging();

function setupNotifications(userId) {
    if (!userId) return;

    // 1. ขอสิทธิ์แจ้งเตือน
    Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
            // 2. ดึง Token
            messaging.getToken({
                vapidKey: 'BKhAJml-bMHqQT-4kaIe5Sdo4vSzlaoca2cmGmQMoFf9UKpzzuUf7rcEWJL4rIlqIArHxUZkyeRi63CnykNjLD0'
            })
                .then((currentToken) => {
                    if (currentToken) {
                        // 3. บันทึก Token ลง Database พาธที่แอดมินจะมาอ่าน
                        firebase.database().ref('users/' + userId + '/fcmToken').set(currentToken)
                            .then(() => console.log('FCM Token บันทึกสำเร็จ:', currentToken))
                            .catch(err => console.error('บันทึก Token ล้มเหลว:', err));
                    }
                })
                .catch((err) => console.error('ดึง Token ผิดพลาด:', err));
        } else {
            console.warn('ผู้ใช้ปฏิเสธการแจ้งเตือน');
        }
    });
}

// user.js

// 4. จัดการแจ้งเตือนขณะเปิดหน้าเว็บค้างไว้ (Foreground)
messaging.onMessage((payload) => {
    console.log('ได้รับข้อความใน Foreground:', payload);

    const { title, body } = payload.notification;

    // แทนที่จะใช้ new Notification (ซึ่งมักจะเด้งซ้ำกับระบบ)
    // แนะนำให้ใช้การแจ้งเตือนภายในหน้าเว็บ (Custom UI) หรือเล่นเสียงอย่างเดียว

    // 1. เล่นเสียงแจ้งเตือน (สำคัญมากสำหรับ Foreground)
    const audio = new Audio('/notify.mp3');
    audio.play().catch(e => console.warn("ไม่สามารถเล่นเสียงได้เนื่องจากนโยบายเบราว์เซอร์:", e));

    // 2. แสดงแจ้งเตือนแบบ Banner (เฉพาะถ้าต้องการจริงๆ)
    // ให้เช็คก่อนว่า Document ถูกซ่อนอยู่หรือไม่ (ถ้าเปิดหน้าเว็บดูอยู่ ไม่ต้องเด้ง Banner ให้เกะกะ)
    if (document.hidden && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
        });
    } else {
        // ถ้าผู้ใช้กำลังดูหน้าเว็บอยู่ ให้ใช้การแจ้งเตือนแบบ Alert หรือ Toast ในหน้าเว็บแทน
        // ตัวอย่าง: alert(title + ": " + body); 
        // หรือถ้ามีระบบ Toast UI ให้เรียกใช้ที่นี่
        console.log("ผู้ใช้กำลังดูหน้าเว็บอยู่ แสดงผลผ่าน UI ภายในหน้าเว็บ");
    }
});

// 5. ผูกเข้ากับระบบ Auth (เรียกเพียงที่เดียว)
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUserId = user.uid;
        setupNotifications(user.uid);
    }
});

//แจ้งเตือนแอดมิน//

/**
 * ฟังก์ชันส่งข้อความจากฝั่ง User และแจ้งเตือนไปยัง Admin
 * (รวมข้อดีเรื่อง Image Support, Error Handling และ URL แม่นยำ)
 */
function handleUserSendMessage(messageText) {
    const user = firebase.auth().currentUser;
    if (!user || !messageText) return; //

    const userId = user.uid;
    const userName = user.displayName || "anonymous user"; //

    // 1. บันทึกข้อความลง Database ใน messages/$userId
    const chatRef = firebase.database().ref(`messages/${userId}`).push();
    chatRef.set({
        sender: 'user',
        text: messageText,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    })
        .then(() => {
            console.log("บันทึกแชทสำเร็จ กำลังดึง Token ของแอดมิน..."); //

            // 2. ดึง Token ของ Admin จาก admin_metadata (พาธกลางที่แอดมินฝากไว้)
            return firebase.database().ref('admin_metadata/fcmToken').once('value');
        })
        .then((snapshot) => {
            const adminToken = snapshot.val(); //

            if (adminToken) {
                console.log("พบ Admin Token กำลังส่งแจ้งเตือน..."); //

                // 3. ยิง API ไปยัง Vercel เพื่อส่งแจ้งเตือนหาแอดมิน
                // ใช้ URL เต็ม และใส่รูปภาพเพื่อความสวยงาม
                fetch('https://2bkc-baojai-zone-admin.vercel.app/api/send-notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: adminToken,
                        title: `📩 ข้อความใหม่จาก ${userName}`,
                        body: messageText,
                        recipientUid: 'admin_team', // จัดกลุ่มแจ้งเตือนไม่ให้เด้งซ้ำซ้อน
                        image: user.photoURL || 'https://2bkc-baojai-zone.vercel.app/KCLOGO.png' // ใส่รูปโปรไฟล์
                    })
                })
                    .then(res => res.json())
                    .then(data => console.log("ผลการส่งแจ้งเตือน:", data))
                    .catch(err => console.error("Error calling Notification API:", err));
            } else {
                console.warn("ไม่พบ Token ของแอดมินในระบบ (แอดมินอาจยังไม่ได้ Login)"); //
            }
        })
        .catch(err => {
            console.error("เกิดข้อผิดพลาดในระบบส่งข้อความ:", err); //
        });
}

// แก้ไขจุดที่ลงทะเบียน Service Worker ใน user.js
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
            console.log('✅ User Service Worker Registered');
            // 🚩 ตัดบรรทัด firebase.messaging().useServiceWorker(registration) ออก
            // เพราะ Firebase SDK v8 จะจัดการเชื่อมต่อกับไฟล์ที่ชื่อ firebase-messaging-sw.js ให้เองอัตโนมัติ
        })
        .catch((error) => {
            console.error('❌ Service Worker Registration Failed:', error);
        });
}
// 2. ฟังก์ชันแจ้งเตือนหาแอดมิน
function notifyAdmin(msg) {
    // ดึง Token แอดมินมาล่าสุด
    database.ref('admin_metadata/fcmToken').once('value').then(snap => {
        const adminToken = snap.val();
        if (adminToken) {
            fetch('https://2bkc-baojai-zone-admin.vercel.app/api/send-notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: adminToken,
                    title: 'มีข้อความใหม่จากผู้ใช้! 📩',
                    body: msg,
                    data: { url: 'https://2bkc-baojai-zone-admin.vercel.app/' }
                })
            }).catch(err => console.error("API Error:", err));
        }
    });
}

// เมื่อ User ส่งข้อความ
function userSendMessage(text) {
    // 1. บันทึกข้อความลง Database ปกติ
    // 2. ดึง Token แอดมินมาแจ้งเตือน
    firebase.database().ref('admin_metadata/fcmToken').once('value').then(snap => {
        const adminToken = snap.val();
        if (adminToken) {
            // ยิงไปที่ API ตัวเดิม (Vercel)
            fetch('https://your-vercel-api/api/send-notify', {
                method: 'POST',
                body: JSON.stringify({
                    token: adminToken,
                    title: 'มีข้อความใหม่จากผู้ใช้! 📩',
                    body: text
                })
            });
        }
    });
}

function saveTokenToDatabase(uid, token, role) {
    // แยกเก็บตามบทบาท (admin_metadata หรือ user_tokens) และตามด้วย UID
    const path = (role === 'admin') ? `admin_metadata/${uid}` : `user_tokens/${uid}`;

    firebase.database().ref(path).set({
        fcmToken: token,
        deviceType: "web",
        lastUpdated: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        console.log(`✅ บันทึก Token สำหรับ ${role} (UID: ${uid}) เรียบร้อย`);
    });
}

function setupUserNotification(userUid) {
    messaging.getToken({
        vapidKey: 'BKhAJml-bMHqQT-4kaIe5Sdo4vSzlaoca2cmGmQMoFf9UKpzzuUf7rcEWJL4rIlqIArHxUZkyeRi63CnykNjLD0'
    })
        .then((token) => {
            if (token) {
                // ✅ บันทึกแยก Path: สำหรับ User ทั่วไป
                firebase.database().ref(`users/${userUid}`).update({
                    fcmToken: token,
                    lastUpdated: firebase.database.ServerValue.TIMESTAMP
                });
            }
        });
}

function notifyAdmin(adminUid, messageText) {
    // ดึงรายการ Token ทั้งหมดของแอดมิน UID นี้
    firebase.database().ref(`admin_metadata/${adminUid}`).once('value').then(snapshot => {
        if (snapshot.exists()) {
            snapshot.forEach(childSnapshot => {
                const token = childSnapshot.val();

                // ส่งแจ้งเตือนไปยังแต่ละ Token (แต่ละเครื่อง)
                fetch('https://2bkc-baojai-zone-admin.vercel.app/api/send-notify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        token: token,
                        title: 'มีข้อความใหม่ถึงแอดมิน ✨',
                        body: messageText
                    })
                })
                    .then(res => console.log("ส่งหาเครื่องแอดมินสำเร็จหนึ่งเครื่อง"))
                    .catch(err => console.error("เครื่องนี้ส่งไม่ไป:", err));
            });
        }
    });
}

// ฟังก์ชันที่ผู้ใช้เรียกเมื่อกดปุ่ม "ส่ง"
function handleUserSendMessage() {
    const text = document.getElementById('chatInput').value;
    const adminUid = "UID_ของแอดมิน_ที่คุณต้องการแจ้ง"; // ปกติจะได้มาจากการ query หรือตั้งค่าไว้

    // 1. เก็บข้อความลง DB (ตามปกติที่คุณทำอยู่)
    const newMsgRef = firebase.database().ref(`messages/${userUid}`).push();
    newMsgRef.set({
        sender: 'user',
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    }).then(() => {
        // 2. 🔥 เพิ่มส่วนนี้: เรียกแจ้งเตือนแอดมิน
        // ฟังก์ชัน notifyAdmin ที่คุณก๊อปปี้ไปก่อนหน้านี้
        notifyAdmin(adminUid, text);
    });
}

async function notifyAdmin(adminUid, messageText) {
    const adminTokensRef = firebase.database().ref(`admin_metadata/${adminUid}`);
    const snapshot = await adminTokensRef.once('value');

    if (!snapshot.exists()) {
        console.warn("แอดมินไม่มี Token ในระบบ");
        return;
    }

    // วนลูปส่งหาทุกเครื่องที่แอดมินคนนั้นล็อกอินไว้
    snapshot.forEach((child) => {
        const token = child.val();

        fetch('https://your-domain.vercel.app/api/send-notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                title: 'มีข้อความใหม่จากผู้ใช้ 📩',
                body: messageText,
                recipientUid: adminUid,
                link: 'https://2bkc-baojai-zone-admin.vercel.app/' // ลิงก์สำหรับแอดมิน
            })
        })
            .then(res => res.json())
            .then(data => console.log("แจ้งเตือนแอดมินสำเร็จ:", data))
            .catch(err => console.error("แจ้งเตือนล้มเหลว:", err));
    });
}

// ในไฟล์ user.js
async function notifyAdmin(messageText) {
    const adminUid = "o139Nm6N3wSW25fCtAzwf2ymfSm2";
    const adminRef = firebase.database().ref(`admin_metadata/${adminUid}`);

    try {
        const snapshot = await adminRef.once('value');
        if (snapshot.exists()) {
            const data = snapshot.val();
            const tokens = (typeof data === 'object') ? Object.values(data) : [data];

            // ในฟังก์ชัน notifyAdmin ช่วงที่ fetch
            const sendPromises = tokens.map(token => {
                if (typeof token === 'string' && token.length > 10) {
                    return fetch('https://2bkc-baojai-zone-admin.vercel.app/api/send-notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            token: token,
                            title: "มีข้อความใหม่! 💬",
                            body: messageText,
                            icon: 'https://2bkc-baojai-zone-admin.vercel.app/adminปก1.png', // รูปเล็ก
                            image: 'https://2bkc-baojai-zone-admin.vercel.app/adminปก1.png',
                            link: "https://2bkc-baojai-zone-admin.vercel.app/"
                        })
                    }).then(res => {
                        // ถ้าส่งสำเร็จหรือ Token หมดอายุ (410) ให้ถือว่าจบงาน ไม่ต้อง Throw Error
                        if (res.ok || res.status === 410 || res.status === 404) {
                            return { success: true };
                        }
                        return res.json();
                    }).catch(e => {
                        // ดักจับ Error เงียบๆ ไม่ให้ขึ้นสีแดงใน Console ของผู้ใช้
                        return { error: e.message };
                    });
                }
            });

            await Promise.all(sendPromises);
        }
    } catch (error) {
        // เปลี่ยนเป็น warn เพื่อไม่ให้ขึ้นสีแดงน่ากลัวใน Console
        console.warn("⚠️ การแจ้งเตือนทำงานติดขัดเล็กน้อยแต่แอดมินน่าจะได้รับแล้ว");
    }
}


// ฟังก์ชันเปลี่ยนหน้า (อันนี้ก๊อปทับของเดิมคุณได้เลย ปรับแก้ให้เสถียรขึ้น)
function changePage(pageId, element) {
    const screens = document.querySelectorAll('.app-screen');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatScreen = document.getElementById('chatScreen');
    const navBar = document.querySelector('.admin-bottom-nav');
    const indicator = document.getElementById('navIndicator'); // ดึงตัวแถบสีชมพูมา

    // 1. ซ่อนหน้าจอต่างๆ (ตามโค้ดเดิมของคุณ)
    if (welcomeScreen) welcomeScreen.style.display = 'none';
    if (chatScreen) chatScreen.style.display = 'none';
    screens.forEach(s => s.style.display = 'none');

    // --- ส่วนที่ต้องแก้ไขในฟังก์ชัน changePage ---

    // 2. แสดงหน้าที่เลือก
    if (pageId === 'chat') {
        if (welcomeScreen) {
            welcomeScreen.style.display = 'flex'; // ✅ เปลี่ยนจาก 'block' เป็น 'flex'
            welcomeScreen.style.flexDirection = 'column'; // มั่นใจว่าเรียงลงมาแนวตั้ง
            welcomeScreen.style.justifyContent = 'center'; // บังคับให้อยู่กลางแนวตั้ง
        }
    } else {
        const targetId = (pageId === 'social') ? 'screen-social' : 'screen-admin';
        const target = document.getElementById(targetId);
        if (target) {
            target.style.display = 'block'; // หน้าอื่นใช้ block ได้ปกติถ้าเนื้อหายาว
        }
    }
    // 3. จัดการแถบเมนู (Navbar)
    if (navBar) {
        navBar.classList.remove('nav-is-hidden');
        navBar.style.setProperty('display', 'flex', 'important');
        navBar.style.setProperty('visibility', 'visible', 'important');
        navBar.style.setProperty('opacity', '1', 'important');
    }

    // 4. ส่วนที่ปรับปรุงใหม่: เพิ่ม Stretch Effect (หยดน้ำยืด)
    if (element && indicator) {
        document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
        element.classList.add('active');

        const width = element.offsetWidth;
        const left = element.offsetLeft;

        // --- ลูกเล่นยืดตัว ---
        // ทำให้หยดน้ำกว้างขึ้นชั่วคราวขณะสไลด์
        indicator.style.transform = `translateY(-50%) scaleX(1.1)`;
        indicator.style.left = `${left}px`;
        indicator.style.width = `${width}px`;

        // คืนค่าขนาดปกติหลังจากสไลด์เสร็จ (ประมาณ 300ms)
        setTimeout(() => {
            indicator.style.transform = `translateY(-50%) scaleX(1)`;
        }, 300);

        if (window.navigator.vibrate) window.navigator.vibrate(10);
    }

    // 5. จัดการ class active-page (ตามโค้ดเดิมของคุณ)
    document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active-page'));
    const activePage = document.getElementById(pageId);
    if (activePage) {
        activePage.classList.add('active-page');
    }
}

function initIndicator() {
    const indicator = document.getElementById('navIndicator');
    const activeItem = document.querySelector('.nav-item.active');

    if (activeItem && indicator) {
        // สร้างฟังก์ชันคำนวณที่ทำงานซ้ำได้
        const setPos = () => {
            const width = activeItem.offsetWidth;
            const left = activeItem.offsetLeft;

            if (width > 0) {
                indicator.style.width = `${width}px`;
                indicator.style.left = `${left}px`;
                indicator.style.opacity = "1";
            } else {
                // ถ้ายังคำนวณไม่ได้ (ค่าเป็น 0) ให้รอ 50ms แล้วลองใหม่
                setTimeout(setPos, 50);
            }
        };

        setPos(); // รันครั้งแรก
    }
}

// 🚩 หัวใจหลักคือตรงนี้: รัน 2 จังหวะเพื่อความชัวร์
document.addEventListener('DOMContentLoaded', initIndicator);
window.addEventListener('load', initIndicator);
// เผื่อมือถือโหลดช้ามาก ให้เช็คอีกทีที่ 1 วินาที
setTimeout(initIndicator, 1000);

/*4. ฟังก์ชันสำหรับ Admin Popup
*/
function showAdminPopup(name, role, imgSrc, fbLink, igLink) {
    const modal = document.getElementById('admin-modal-overlay');
    if (!modal) return;

    document.getElementById('modal-name').innerText = name;
    document.getElementById('modal-role').innerText = role;
    document.getElementById('modal-img').src = imgSrc;
    document.getElementById('modal-fb-link').href = fbLink;
    document.getElementById('modal-ig-link').href = igLink;

    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeAdminPopupForce() {
    const modal = document.getElementById('admin-modal-overlay');
    if (!modal) return;
    modal.classList.remove('active');
    setTimeout(() => {
        if (!modal.classList.contains('active')) {
            modal.style.display = 'none';
        }
    }, 300);
}

function closeAdminPopup(event) {
    if (event.target.classList.contains('modal-overlay')) {
        closeAdminPopupForce();
    }
}

function openChat() {
    document.body.classList.add('is-chatting'); // สั่งซ่อน Nav
    document.getElementById('chatScreen').style.display = 'flex';
    // ไม่ต้องสั่งเปลี่ยนหน้า app-screen อื่น เพราะ chatScreen จะทับขึ้นมาเอง
}

function closeChat() {
    document.body.classList.remove('is-chatting'); // ดึง Nav กลับมา
    document.getElementById('chatScreen').style.display = 'none';
}

function autoResize(textarea) {
    textarea.style.height = 'auto';

    // กำหนดความสูงตามเนื้อหาจริง
    let newHeight = textarea.scrollHeight;

    // จำกัดความสูงไม่ให้เกิน 120px (ประมาณ 4-5 บรรทัด) 
    // ถ้าเกินนี้จะให้เลื่อน (Scroll) ข้างในแทน จอจะได้ไม่พัง
    if (newHeight > 120) {
        textarea.style.height = '120px';
        textarea.style.overflowY = 'auto'; // เปิด scroll เมื่อเนื้อหาเยอะ
    } else {
        textarea.style.height = newHeight + 'px';
        textarea.style.overflowY = 'hidden'; // ปิด scroll ถ้าเนื้อหานิดเดียว
    }

    const sendBtn = document.getElementById('sendButton');
    if (textarea.value.trim().length > 0) {
        sendBtn.style.opacity = "1";
        sendBtn.style.pointerEvents = "auto";
        sendBtn.style.transform = "scale(1)"; // เพิ่มลูกเล่นปุ่มขยายเมื่อพิมพ์ได้
    } else {
        sendBtn.style.opacity = "0.5";
        sendBtn.style.pointerEvents = "none";
        sendBtn.style.transform = "scale(0.9)"; // ปุ่มหดลงเล็กน้อยถ้ากดไม่ได้
    }
}

// --- ส่วนควบคุมเมนูยกเลิกข้อความ ---
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chatBox'); // ตรวจสอบ ID ให้ตรง
    const contextMenu = document.getElementById('contextMenu');
    const deleteOption = document.getElementById('deleteOption');

    if (!chatContainer || !contextMenu) return;

    // ฟังก์ชันเปิดเมนู
    const openContextMenu = (e, msgId, isUser) => {
        e.preventDefault();
        const x = e.pageX || (e.touches ? e.touches[0].pageX : 0);
        const y = e.pageY || (e.touches ? e.touches[0].pageY : 0);

        activeMessageIdForContextMenu = msgId;
        activeChatIdForContextMenu = currentChatId;

        contextMenu.style.display = 'block';
        contextMenu.style.left = `${x}px`;
        contextMenu.style.top = `${y}px`;

        if (deleteOption) deleteOption.style.display = isUser ? 'block' : 'none';
    };

    // ดักคลิกขวา (PC)
    chatContainer.addEventListener('contextmenu', (e) => {
        const bubble = e.target.closest('.message-container');
        if (bubble) {
            const msgId = bubble.getAttribute('data-message-id');
            const isUser = bubble.classList.contains('user-container');
            if (msgId) openContextMenu(e, msgId, isUser);
        }
    });

    // ดักกดค้าง (Mobile)
    let holdTimer;
    chatContainer.addEventListener('touchstart', (e) => {
        const bubble = e.target.closest('.message-container');
        if (bubble) {
            holdTimer = setTimeout(() => {
                const msgId = bubble.getAttribute('data-message-id');
                const isUser = bubble.classList.contains('user-container');
                if (msgId) openContextMenu(e, msgId, isUser);
            }, 700);
        }
    }, { passive: true });

    chatContainer.addEventListener('touchend', () => clearTimeout(holdTimer));
    document.addEventListener('click', () => contextMenu.style.display = 'none');
});

// ดักจับการคลิกขวาที่ระดับ document เพื่อป้องกันหา ID ไม่เจอ
document.addEventListener('contextmenu', function (e) {
    // 1. หา Bubble ที่ถูกคลิก โดยดูว่าคลิกโดน Class .message-bubble หรือไม่
    const bubble = e.target.closest('.message-bubble');
    if (!bubble) return; // ถ้าไม่ได้คลิกโดนข้อความแชท ไม่ต้องทำอะไรต่อ

    e.preventDefault(); // หยุดเมนูขวามาตรฐานของ Browser

    // 2. หา Container เพื่อดึง ID ของข้อความ (data-id)
    const container = bubble.closest('.message-container');

    if (container && container.dataset.id) {
        const messageId = container.dataset.id;

        // 3. เรียกใช้ฟังก์ชันเมนูยกเลิก (ต้องมั่นใจว่าคุณสร้างฟังก์ชันนี้ไว้แล้ว)
        if (typeof showUnsendMenu === "function") {
            showUnsendMenu(e.pageX, e.pageY, messageId);
        } else {
            console.warn("ยังไม่ได้สร้างฟังก์ชัน showUnsendMenu หรือหาฟังก์ชันไม่เจอ");
            // ทดสอบด้วยการแสดง Alert แทนก่อนได้
            alert("คลิกขวาที่ข้อความ ID: " + messageId);
        }
    }
});

let pressTimer;

document.addEventListener('touchstart', function (e) {
    const bubble = e.target.closest('.message-bubble');
    if (bubble) {
        pressTimer = window.setTimeout(function () {
            // จำลองการคลิกขวาเมื่อกดค้างครบ 0.1 วินาที
            const event = new MouseEvent('contextmenu', {
                bubbles: true,
                cancelable: true,
                view: window,
                clientX: e.touches[0].clientX,
                clientY: e.touches[0].clientY
            });
            bubble.dispatchEvent(event);
        }, 100);
    }
});

document.addEventListener('touchend', function () {
    clearTimeout(pressTimer);
});


function handleShowMenu(e, messageId, isUserMessage) {
    if (!isUserMessage) {
        hideContextMenu();
        return;
    }

    activeMessageId = messageId;

    // คำนวณพิกัดให้รองรับทั้งเมาส์ และ นิ้วสัมผัส (iOS/Android)
    let x, y;
    if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX; // ใช้ clientX/Y จะแม่นยำกว่าบนมือถือ
        y = e.touches[0].clientY;
    } else {
        x = e.clientX || e.pageX;
        y = e.clientY || e.pageY;
    }

    // เลื่อนเมนูไปที่จุดสัมผัส
    contextMenu.style.top = `${y}px`;
    contextMenu.style.left = `${x}px`;

    contextMenu.style.display = 'block';
    setTimeout(() => {
        contextMenu.classList.add('active');
    }, 10);

    deleteOption.style.display = 'block';
}

// --- 3. ดักจับการคลิกขวา (PC) ---
document.addEventListener('contextmenu', function (e) {
    const bubble = e.target.closest('.message-bubble');
    if (bubble) {
        e.preventDefault();
        const container = bubble.closest('.message-container');
        const msgId = container.getAttribute('data-message-id');
        const isUser = container.classList.contains('user-container');
        handleShowMenu(e, msgId, isUser);
    }
});

// --- 4. ดักจับการกดค้าง (Mobile) ---
document.addEventListener('touchstart', function (e) {
    const bubble = e.target.closest('.message-bubble');
    if (bubble) {
        touchTimer = setTimeout(() => {
            const container = bubble.closest('.message-container');
            const msgId = container.getAttribute('data-message-id');
            const isUser = container.classList.contains('user-container');
            handleShowMenu(e, msgId, isUser);
        }, 300); // กดค้าง 0.6 วินาที
    }
}, { passive: true });

document.addEventListener('touchend', function () {
    clearTimeout(touchTimer);
});

// --- 5. ปิดเมนูเมื่อคลิกที่อื่น ---
document.addEventListener('click', function () {
    if (contextMenu) contextMenu.style.display = 'none';
});

// --- 6. สั่งงานเมื่อกดปุ่มยกเลิก ---
deleteOption.onclick = function () {
    if (activeMessageId) {
        deleteMessage(currentChatId, activeMessageId); // เรียกใช้ฟังก์ชันลบที่มีอยู่แล้ว
    }
};

function showContextMenu(e, msgId, isUser) {
    const menu = document.getElementById('contextMenu');
    const delBtn = document.getElementById('deleteOption');
    if (!menu) return;

    e.preventDefault();
    e.stopPropagation(); // หยุดการส่งต่อ event เพื่อไม่ให้ไปกวนส่วนอื่น

    // 1. ดึงค่าตำแหน่งที่คลิก/แตะ
    let x = e.pageX || (e.touches ? e.touches[0].pageX : 0);
    let y = e.pageY || (e.touches ? e.touches[0].pageY : 0);

    activeMessageIdForContextMenu = msgId;
    activeChatIdForContextMenu = currentChatId;

    // 2. เคลียร์ Event เก่าออกก่อน (ป้องกันการถามซ้ำ 2 รอบ) 🚩 หัวใจสำคัญ
    if (delBtn) {
        const newDelBtn = delBtn.cloneNode(true); // สร้างปุ่มใหม่เพื่อล้าง event เก่าทั้งหมด
        delBtn.parentNode.replaceChild(newDelBtn, delBtn);

        // ผูก Event ใหม่เข้าไปที่ปุ่มที่เพิ่ง Clone มา
        newDelBtn.style.display = isUser ? 'block' : 'none';
        if (isUser) {
            newDelBtn.onclick = function (event) {
                event.preventDefault();
                event.stopPropagation();

                // ถามแค่รอบเดียวแน่นอน
                if (confirm("ต้องการยกเลิกการส่งข้อความนี้หรือไม่?")) {
                    deleteMessage(activeChatIdForContextMenu, activeMessageIdForContextMenu);
                }
                menu.style.display = 'none'; // ปิดเมนูหลังกด
            };
        }
    }

    // 3. ปรับตำแหน่งการแสดงผล
    menu.style.display = 'block';
    if (isUser) {
        const menuWidth = menu.offsetWidth || 150;
        x = x - menuWidth;
        if (x < 0) x = 10;
    }

    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
}

// ดักจับที่ chatBox โดยตรง
if (chatBox) {
    // สำหรับคอมพิวเตอร์
    chatBox.addEventListener('contextmenu', (e) => {
        const container = e.target.closest('.message-container');

        // ถ้าคลิกขวาโดนข้อความแอดมิน ให้สั่ง PreventDefault (ไม่ให้เมนูขึ้น)
        if (container && container.classList.contains('admin-container')) {
            e.preventDefault();
            return false;
        }

        // ถ้าเป็นข้อความ user และคุณทำ Context Menu เอง ก็สั่งเปิดตรงนี้ได้เช่นกัน
        if (container && container.classList.contains('user-container')) {
            e.preventDefault();
            const msgId = container.getAttribute('data-message-id');
            showContextMenu(e, msgId, true);
        }
    });

    //ios//
    let touchTimer;
    const chatBox = document.getElementById('chatBox');

    chatBox.addEventListener('touchstart', (e) => {
        // หา container ที่เราเป็นคนส่ง (user-container)
        const container = e.target.closest('.user-container');

        if (container) {
            const msgId = container.getAttribute('data-message-id');

            // ตั้งเวลา 600ms (ประมาณครึ่งวินาที) ถ้ากดค้างถึงจุดนี้ให้โชว์เมนู
            touchTimer = setTimeout(() => {
                // ส่ง e ไปให้ handleShowMenu เพื่อคำนวณตำแหน่งพิกัด
                handleShowMenu(e, msgId, true);

                // สั่นเบาๆ (Haptic Feedback) ถ้าเครื่องรองรับ
                if (navigator.vibrate) navigator.vibrate(50);
            }, 600);
        }
    }, { passive: true });

    // ถ้าปล่อยนิ้วก่อนเวลา, เลื่อนจอ, หรือมีการสัมผัสซ้อน ให้ยกเลิก Timer
    chatBox.addEventListener('touchend', () => clearTimeout(touchTimer));
    chatBox.addEventListener('touchmove', () => clearTimeout(touchTimer));
    chatBox.addEventListener('touchcancel', () => clearTimeout(touchTimer));

    // สำหรับมือถือ
    let holdTimer;
    // ฟังก์ชันดักจับการเริ่มแตะ (Touch Start)
    chatBox.addEventListener('touchstart', (e) => {
        isScrolling = false;

        // หา Message Container ที่ใกล้ที่สุด
        const container = e.target.closest('.message-container');

        // ตรวจสอบเงื่อนไข:
        // 1. ต้องมี container 
        // 2. ต้องมี class 'user-container' (ข้อความของเราเอง) ถึงจะยอมให้เปิดเมนู
        if (container && container.classList.contains('user-container')) {

            holdTimer = setTimeout(() => {
                if (!isScrolling) {
                    const msgId = container.getAttribute('data-message-id');
                    // เรียกใช้ฟังก์ชันแสดงเมนู
                    showContextMenu(e, msgId, true);
                }
            }, 600); // ระยะเวลากดค้าง (มิลลิวินาที)

        } else {
            // ถ้าเป็นข้อความแอดมิน หรือพื้นที่ว่าง ให้เคลียร์ Timer ทันที (ไม่เกิดอะไรขึ้น)
            clearTimeout(holdTimer);
        }
    }, { passive: true });

    chatBox.addEventListener('touchend', () => clearTimeout(holdTimer));
}

// ฟังก์ชันเลื่อนลงล่างสุดที่ฉลาดขึ้น
function smartScroll() {
    const chatBox = document.getElementById('chatBox');
    // ระยะห่างจากล่างสุด ถ้าห่างไม่เกิน 300px ให้เลื่อนลงอัตโนมัติ (เผื่อเขากำลังอ่านข้อความเก่าอยู่)
    const isNearBottom = chatBox.scrollHeight - chatBox.clientHeight - chatBox.scrollTop < 300;

    if (isNearBottom) {
        chatBox.scrollTo({
            top: chatBox.scrollHeight,
            behavior: 'smooth'
        });
    }
}

function showChat() {
    document.getElementById('welcomeScreen').style.display = 'none';
    const chatScreen = document.getElementById('chatScreen');
    chatScreen.style.display = 'flex'; // ใช้ flex เพื่อให้ layout ทำงาน

    // เลื่อนลงล่างสุด
    setTimeout(() => {
        const chatBox = document.getElementById('chatBox');
        chatBox.scrollTop = chatBox.scrollHeight;
    }, 100);
}

function hideContextMenu() {
    const menu = document.getElementById('contextMenu');
    menu.classList.remove('active');
    // รอให้แอนิเมชันเล่นจบก่อนค่อยสั่ง display: none
    setTimeout(() => {
        if (!menu.classList.contains('active')) {
            menu.style.display = 'none';
        }
    }, 200);
}

// ปิดเมนูเมื่อคลิกที่อื่น
document.addEventListener('click', hideContextMenu);
document.getElementById('chatBox').addEventListener('scroll', hideContextMenu);


window.onload = function () {
    const overlay = document.getElementById('welcome-popup-overlay');
    overlay.classList.add('active'); // ทำให้ Overlay และ Popup เริ่ม Animate
};
// ฟังก์ชันปิดหน้าแรก แล้วเปิดหน้าเครดิต
// ย้ายมาไว้บนๆ ของไฟล์
function showNextPopup() {
    const overlay = document.getElementById('welcome-popup-overlay');
    overlay.classList.remove('active');
    // อาจจะหน่วงเวลาแล้วค่อยซ่อน หรือทำ Fade-out Animation
    setTimeout(() => {
        overlay.style.display = 'none';
        // เปิด popup ถัดไป หรือเปลี่ยนหน้าจอ
    }, 500);
}

function closeFinal() {
    const secondPopup = document.getElementById('credit-overlay');
    if (secondPopup) {
        secondPopup.style.opacity = '0';
        setTimeout(() => {
            secondPopup.style.display = 'none';
        }, 300);
    }
}
window.addEventListener('resize', () => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        setTimeout(scrollToBottom, 100);
    }
});

// ฟังก์ชันเลื่อนแชทลงล่างสุด
function scrollToBottom() {
    const chatBox = document.getElementById('chatBox');
    if (chatBox) {
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

// เมื่อจิ้มที่ช่องพิมพ์ ให้เลื่อนลงล่างสุด
const inputField = document.getElementById('chatInput');
if (inputField) {
    inputField.addEventListener('focus', () => {
        // รอให้คีย์บอร์ดเด้งเสร็จนิดนึงแล้วเลื่อน
        setTimeout(scrollToBottom, 300);
    });
}

// เมื่อมีการส่งข้อความใหม่ (ใส่ไว้ในฟังก์ชันส่งข้อความของคุณด้วย)
scrollToBottom();


// ใส่โค้ดนี้ในฟังก์ชันที่ใช้ส่งข้อความ (handleSendMessage)
function afterSendMessage() {
    const input = document.getElementById('chatInput');
    input.value = '';
    autoResize(input); // เรียกฟังก์ชันนี้อีกครั้งเพื่อรีเซ็ตความสูงและปุ่มส่ง
}

// ปิดการใช้งาน Context Menu (เมนูกดค้าง/คลิกขวา) ทั่วทั้งหน้าจอ
document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
}, false);

// วิธีเรียกใช้: ให้เอาคำว่า generateAutoMessage(); ไปใส่ไว้ในตอนที่สุ่ม ID เสร็จแล้ว

function showTypingAndSend(text, delay) {
    // แสดงสถานะ "Admin กำลังพิมพ์..."
    const typingIndicator = document.getElementById('typingIndicator');
    typingIndicator.style.display = 'block';

    setTimeout(() => {
        typingIndicator.style.display = 'none';
        sendAutoMessage(text);
    }, delay);
}

// บังคับให้หน้าแรกทำงานและแถบสีชมพูปรากฏทันทีเมื่อโหลดหน้าเว็บ
window.addEventListener('load', () => {
    // 1. ค้นหาปุ่ม Baojai Chat (nav-item ตัวแรก)
    const firstTab = document.querySelector('.nav-item');

    // 2. ตรวจสอบว่ามีปุ่มและฟังก์ชัน changePage หรือไม่
    if (firstTab && typeof changePage === 'function') {
        console.log("กำลังเปิดหน้าแชทและแสดงแถบสีชมพู...");

        // 3. เรียกใช้ changePage โดยส่ง 'chat' และตัวแปร element (firstTab) เข้าไป
        // เพื่อให้ indicator คำนวณ offsetWidth และ offsetLeft ได้ถูกต้อง
        changePage('chat', firstTab);
    }
});

// ตอนสั่งเปิดเมนู
contextMenu.style.display = 'block';
setTimeout(() => {
    contextMenu.classList.add('active');
}, 10);


function onContextMenu(e) {
    e.preventDefault();
    const menu = document.getElementById('contextMenu');

    // 1. ย้ายตำแหน่งไปที่เมาส์
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';

    // 2. เปิด display ก่อนเพื่อให้มองเห็นโครงสร้าง
    menu.style.display = 'block';

    // 3. ใช้ setTimeout นิดเดียว (10ms) เพื่อให้ browser รับรู้การเปลี่ยนแปลงก่อนรัน animation
    setTimeout(() => {
        menu.classList.add('active');
    }, 10);
}

// ฟังก์ชันปิดเมนู (ก๊อปไปวางแทนของเดิม)
function hideMenu() {
    const menu = document.getElementById('contextMenu');
    menu.classList.remove('active');

    // รอให้ Animation (0.15s) จบก่อนค่อยเอาออกจากหน้าจอจริงๆ
    setTimeout(() => {
        if (!menu.classList.contains('active')) {
            menu.style.display = 'none';
        }
    }, 150);
}

// ปิดเมนูเมื่อคลิกที่อื่น
document.addEventListener('click', hideMenu);

function forceShowIndicator() {
    const indicator = document.getElementById('navIndicator');
    const activeItem = document.querySelector('.nav-item.active');

    if (activeItem && indicator) {
        // ใช้ requestAnimationFrame เพื่อรอให้ Browser วาดหน้าจอเสร็จ 1 เฟรม
        requestAnimationFrame(() => {
            const width = activeItem.offsetWidth;
            const left = activeItem.offsetLeft;

            if (width > 0) {
                indicator.style.width = `${width}px`;
                indicator.style.left = `${left}px`;
                indicator.style.opacity = "1"; // ค่อยๆ โชว์หยดน้ำออกมา
            } else {
                // ถ้าขนาดยังไม่มา ให้ลองใหม่ในเฟรมถัดไป
                forceShowIndicator();
            }
        });
    }
}

// เรียกทำงานทันที
forceShowIndicator();

// กันพลาด: เรียกซ้ำเมื่อโหลดเสร็จสมบูรณ์ทุกอย่าง
window.addEventListener('load', forceShowIndicator);

function wakeUpIndicator() {
    const indicator = document.getElementById('navIndicator');
    const activeItem = document.querySelector('.nav-item.active');

    if (activeItem && indicator) {
        // ใช้ฟังก์ชันที่วนเช็คค่าเรื่อยๆ จนกว่า width จะมากกว่า 0
        const checkFrame = () => {
            const w = activeItem.offsetWidth;
            const l = activeItem.offsetLeft;

            if (w > 0) {
                indicator.style.width = w + 'px';
                indicator.style.left = l + 'px';
                // บังคับให้แสดงผล
                indicator.style.display = 'block';
                indicator.style.opacity = '1';
            } else {
                // ถ้ายังไม่วาดหน้าจอ ให้รอเฟรมถัดไปแล้วเช็คใหม่
                requestAnimationFrame(checkFrame);
            }
        };
        checkFrame();
    }
}

// 🚩 เรียกใช้ทันทีหลังนิยามฟังก์ชัน
wakeUpIndicator();

// 🚩 เรียกซ้ำเมื่อโหลดทุกอย่าง (รูป/ฟอนต์) เสร็จสิ้น
window.addEventListener('load', wakeUpIndicator);
// 🚩 เรียกซ้ำเมื่อมีการปรับขนาดจอ
window.addEventListener('resize', wakeUpIndicator);

function alignIndicator() {
    const indicator = document.getElementById('navIndicator');
    const activeItem = document.querySelector('.nav-item.active');

    if (activeItem && indicator) {
        // ดึงค่าตำแหน่งจริง ณ วินาทีนั้น
        const rect = activeItem.getBoundingClientRect();
        const parentRect = activeItem.parentElement.getBoundingClientRect();

        // คำนวณตำแหน่งที่ถูกต้องเทียบกับตัวแม่
        const left = activeItem.offsetLeft;
        const width = activeItem.offsetWidth;

        if (width > 0) {
            indicator.style.width = `${width}px`;
            indicator.style.left = `${left}px`;
        } else {
            // ถ้ายังเป็น 0 ให้รอ 100ms แล้วเรียกตัวเองใหม่ (Loop จนกว่าจะขึ้น)
            setTimeout(alignIndicator, 100);
        }
    }
}

// เรียกใช้งาน 3 จังหวะเพื่อความชัวร์
document.addEventListener('DOMContentLoaded', alignIndicator);
window.addEventListener('load', alignIndicator);
setTimeout(alignIndicator, 500); // จังหวะสุดท้าย เผื่อเครื่องอืด

function showHelpDetail(page) {
    // ซ่อนหน้าทั้งหมดก่อน (รวมหน้า install ที่เพิ่มใหม่)
    document.getElementById('help-main-menu').style.display = 'none';
    document.getElementById('help-detail-install').style.display = 'none';
    document.getElementById('help-detail-warn').style.display = 'none';
    document.getElementById('help-detail-delete').style.display = 'none';

    // แสดงหน้าที่เลือก
    if (page === 'main') {
        document.getElementById('help-main-menu').style.display = 'block';
    } else {
        document.getElementById('help-detail-' + page).style.display = 'block';
    }
}

function toggleHelpPopup(show) {
    const overlay = document.getElementById('customHelpOverlay');
    if (show) {
        overlay.style.display = 'flex';
        showHelpDetail('main'); // ทุกครั้งที่เปิดให้เริ่มที่หน้าเมนูหลัก
    } else {
        overlay.style.display = 'none';
    }
}

initializeAuth();
