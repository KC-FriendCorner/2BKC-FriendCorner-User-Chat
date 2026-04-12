// ===============================================
// 1. Firebase Initialization
// ===============================================
const firebaseConfig = {
    apiKey: "AIzaSyCs3_LcJN5RfOIo9jZ4fnz1CBl8hXqfvig",
    authDomain: "kc-tobe-friendcorner-21655.firebaseapp.com",
    databaseURL: "https://kc-tobe-friendcorner-21655-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "kc-tobe-friendcorner-21655",
    storageBucket: "kc-tobe-friendcorner-21655.firebasestorage.app",
    messagingSenderId: "722433178265",
    appId: "1:722433178265:web:f7369aa65b3063a8ab1608",
    measurementId: "G-LEFC84DVLL"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
const auth = firebase.auth();

// ทำการ Anonymous Login เพื่อให้มีสิทธิ์เขียนข้อมูลตาม Security Rules
auth.signInAnonymously().catch((error) => {
    console.error("Firebase Auth Error:", error.code, error.message);
});

const inputScreen = document.getElementById('input-screen');
const gameScreen = document.getElementById('game-screen');
const bubbleContainer = document.getElementById('bubble-container');
const startBtn = document.getElementById('startBtn');
const inputField = document.getElementById('feelingInput');
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
const nozzleLight = document.querySelector('.nozzle-light');

let particles = [];
let bubbles = [];
let isShooting = false;
let mouseX = window.innerWidth / 2;
const MAX_BUBBLES = 3; // จำกัดสูงสุด 3 ฟอง

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

startBtn.onclick = () => {
    const text = inputField.value.trim();
    if (!text) return;

    // บันทึกข้อความลง Firebase Realtime Database
    const feelingRef = database.ref('songkran_feelings').push();
    feelingRef.set({
        text: text,
        timestamp: firebase.database.ServerValue.TIMESTAMP,
        uid: auth.currentUser ? auth.currentUser.uid : 'anonymous'
    }).catch((err) => {
        console.error("Database Push Error:", err);
    });
    
    inputScreen.classList.remove('active');
    setTimeout(() => {
        inputScreen.style.display = 'none';
        gameScreen.classList.add('active');
        createBubbles(text);
        gameLoop();
    }, 500);
};

class Bubble {
    constructor(textSegment) {
        this.element = document.createElement('div');
        this.element.className = 'jelly-bubble';
        this.textElement = document.createElement('div');
        this.textElement.id = 'bubble-text';
        this.textElement.innerText = textSegment;
        this.element.appendChild(this.textElement);
        
        // เพิ่มเงาสะท้อน (Shine)
        const shine = document.createElement('div');
        shine.className = 'bubble-shine';
        this.element.appendChild(shine);

        bubbleContainer.appendChild(this.element);

        this.size = 150 + Math.random() * 80;
        this.x = Math.random() * (window.innerWidth - 250) + 125;
        this.y = Math.random() * (window.innerHeight * 0.3) + 200;
        this.vx = (Math.random() - 0.5) * 2; // เพิ่มแรงส่งเริ่มต้น
        this.vy = (Math.random() - 0.5) * 2;
        this.floatOffset = Math.random() * Math.PI * 2;
        this.floatSpeed = 0.015 + Math.random() * 0.02;
    }

    update(isHit) {
        this.floatOffset += this.floatSpeed;
        
        // การเคลื่อนที่พื้นฐาน
        this.x += Math.cos(this.floatOffset * 0.5) * 0.5 + this.vx;
        this.y += Math.sin(this.floatOffset) * 0.5 + this.vy;

        // แรงต้าน (Friction) เพื่อให้หยุดนิ่งหลังจากถูกชน
        this.vx *= 0.95;
        this.vy *= 0.95;

        // ขอบหน้าจอ (Boundaries)
        if (this.x < 100 || this.x > window.innerWidth - 100) this.vx *= -1;
        if (this.y < 100 || this.y > window.innerHeight * 0.6) this.vy *= -1;

        if (isHit) {
            this.size -= 1.5;
            this.element.classList.add('wobble');
        } else {
            this.element.classList.remove('wobble');
        }

        this.element.style.width = this.size + 'px';
        this.element.style.height = this.size + 'px';
        this.element.style.left = this.x + 'px';
        this.element.style.top = this.y + 'px';
        this.element.style.fontSize = Math.max(0.5, (this.size / 200)) + 'rem';
    }
}

function createBubbles(fullText) {
    const segments = fullText.split(' ');
    bubbles = [];
    bubbleContainer.innerHTML = ''; // Clear previous bubbles
    
    while (bubbles.length < MAX_BUBBLES) {
        let newBubble = new Bubble(segments[bubbles.length % segments.length]);
        let overlapping = false;
        
        // ตรวจสอบไม่ให้เกิดทับกันตอน Spawn
        for (let b of bubbles) {
            const dist = Math.hypot(newBubble.x - b.x, newBubble.y - b.y);
            if (dist < (newBubble.size + b.size) / 2) {
                overlapping = true;
                break;
            }
        }
        
        if (overlapping) {
            newBubble.element.remove();
        } else {
            bubbles.push(newBubble);
        }
    }
}

class WaterParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = Math.random() * 6 + 2;
        this.vx = (Math.random() - 0.5) * 12;
        this.vy = -Math.random() * 45 - 25;
        this.gravity = 1.5;
        this.friction = 0.98;
        this.alpha = 1;
        this.color = `rgba(255, 255, 255, ${Math.random() * 0.5 + 0.5})`;
    }
    update() {
        this.vx *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.02;
    }
    draw() {
        ctx.save();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f2ff';
        ctx.beginPath();
        ctx.ellipse(this.x, this.y, this.radius * 0.7, this.radius, Math.atan2(this.vy, this.vx) + Math.PI/2, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.restore();
    }
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const gunContainer = document.querySelector('.weapon-container');
    const gunRect = gunContainer.getBoundingClientRect();
    // จุดกำเนิดน้ำจากปลายกระบอกปืน
    const sprayOriginY = gunRect.top; 

    if (isShooting) {
        nozzleLight.style.display = 'block';
        document.getElementById('water-gun').classList.add('recoil');
        for (let i = 0; i < 12; i++) {
            particles.push(new WaterParticle(mouseX, sprayOriginY));
        }
    } else {
        nozzleLight.style.display = 'none';
        document.getElementById('water-gun').classList.remove('recoil');
    }

    // ระบบ Collision ระหว่างฟองอากาศ
    for (let i = 0; i < bubbles.length; i++) {
        for (let j = i + 1; j < bubbles.length; j++) {
            const b1 = bubbles[i];
            const b2 = bubbles[j];
            const dx = b2.x - b1.x;
            const dy = b2.y - b1.y;
            const distance = Math.hypot(dx, dy);
            const minDist = (b1.size + b2.size) / 2;

            if (distance < minDist) {
                // ชนกัน! คำนวณแรงผลัก
                const angle = Math.atan2(dy, dx);
                const force = 2;
                b1.vx -= Math.cos(angle) * force;
                b1.vy -= Math.sin(angle) * force;
                b2.vx += Math.cos(angle) * force;
                b2.vy += Math.sin(angle) * force;
                
                // เพิ่มอนิเมชั่นตอนชน
                b1.element.classList.add('collision-pulse');
                b2.element.classList.add('collision-pulse');
                setTimeout(() => {
                    b1.element.classList.remove('collision-pulse');
                    b2.element.classList.remove('collision-pulse');
                }, 500);
            }
        }
    }

    // วนลูปย้อนกลับเพื่อลบสมาชิกออกจากอาเรย์ได้อย่างปลอดภัย
    for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        const rect = b.element.getBoundingClientRect();
        const bX = rect.left + rect.width / 2;
        const bY = rect.top + rect.height / 2;
        
        const isHit = isShooting && Math.abs(mouseX - bX) < rect.width / 1.5 && sprayOriginY > bY;
        b.update(isHit);

        if (b.size <= 40) {
            b.element.style.transform = 'scale(0)';
            b.element.style.opacity = '0';
            const elementToRemove = b.element;
            setTimeout(() => elementToRemove.remove(), 300);
            bubbles.splice(i, 1); // ลบออกจากรายการทันทีเพื่อให้ bubbles.length แม่นยำ
        }
    }

    // ตรวจสอบว่าฟองอากาศหายหมดทั้ง 3 ลูกหรือยัง
    if (inputScreen.style.display === 'none' && bubbles.length === 0) {
        finishPro();
        return;
    }

    particles = particles.filter(p => p.alpha > 0);
    particles.forEach(p => { p.update(); p.draw(); });

    gunContainer.style.left = mouseX + 'px';
    requestAnimationFrame(gameLoop);
}

function finishPro() {
    isShooting = false; // หยุดสถานะการฉีดน้ำทันที
    setTimeout(() => {
        gameScreen.classList.remove('active'); // ปิดหน้าจอเกมเพื่อคืนค่า Event ให้ปุ่มกดได้
        document.getElementById('success-screen').classList.add('active');
    }, 1000);
}

const updatePos = (e) => {
    const event = e.touches ? e.touches[0] : e;
    // ปรับค่า mouseX ให้แม่นยำขึ้นและไม่หลุดขอบจอ
    let targetX = event.clientX;
    if (targetX < 50) targetX = 50;
    if (targetX > window.innerWidth - 50) targetX = window.innerWidth - 50;
    mouseX = targetX;
};

window.addEventListener('mousedown', (e) => { isShooting = true; updatePos(e); });
window.addEventListener('mouseup', () => isShooting = false);
window.addEventListener('mousemove', updatePos);

window.addEventListener('touchstart', (e) => {
    if (gameScreen.classList.contains('active')) e.preventDefault();
    isShooting = true;
    updatePos(e);
}, { passive: false });

window.addEventListener('touchend', () => { isShooting = false; });
window.addEventListener('touchcancel', () => { isShooting = false; });

window.addEventListener('touchmove', (e) => {
    if (gameScreen.classList.contains('active')) e.preventDefault(); 
    updatePos(e);
}, { passive: false });