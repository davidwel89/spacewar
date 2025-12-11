// --- KONFIGURASI GLOBAL ---
const GAME_CONFIG = {
    shipSpeed: 5,
    bulletSpeed: 10,
    enemySpeed: 3,
    spawnRate: 1000, // milidetik
};

// --- STATE MANAGEMENT (Pengganti Textarea) ---
// Kita simpan data di variabel memori, bukan di HTML element
let gameState = {
    mouseX: 0,
    mouseY: 0,
    player: { x: window.innerWidth / 2, y: window.innerHeight - 100, el: null },
    bullets: [], // Array untuk menyimpan objek peluru
    enemies: [], // Array untuk menyimpan objek musuh
    isGameOver: false
};

// --- AUDIO ---
const audioBullet = new Audio("audio/bulletsfx.mp3");
const audioExplode = new Audio("audio/expd.mp3");

// --- INISIALISASI ---
window.onload = function () {
    createPlayer();
    
    // Event Listeners
    document.addEventListener("mousemove", trackMouse);
    document.addEventListener("click", playerFire);
    document.addEventListener("keydown", function (k) {
        if (k.code === "Space" || k.key === "a") { // Support Spasi atau 'A'
            playerFire();
        }
    });

    // Game Loops
    setInterval(updatePlayerPosition, 16); // ~60fps movement
    setInterval(updateBullets, 16);
    setInterval(updateEnemies, 20);
    setInterval(spawnEnemy, GAME_CONFIG.spawnRate);
    
    // Update UI Debug
    setInterval(updateUI, 100);
};

// --- FUNGSI UTAMA ---

function createPlayer() {
    const gb = document.getElementById("gameboard");
    const pship = document.createElement("div");
    pship.className = "player-ship";
    
    const img = document.createElement("img");
    img.src = "img/skinShip.png"; // Pastikan nama file sesuai
    pship.appendChild(img);
    
    gb.appendChild(pship);
    gameState.player.el = pship;
}

function trackMouse(e) {
    gameState.mouseX = e.clientX;
    gameState.mouseY = e.clientY;
}

function updateUI() {
    document.getElementById("dispMX").innerText = gameState.mouseX;
    document.getElementById("dispMY").innerText = gameState.mouseY;
    document.getElementById("dispBullets").innerText = gameState.bullets.length;
    document.getElementById("dispEnemies").innerText = gameState.enemies.length;
}

// Gerakan Kapal (Responsif)
function updatePlayerPosition() {
    const player = gameState.player;
    
    // Logika mengejar mouse (easing sederhana)
    // Kita batasi agar tidak teleport instan, tapi bergerak mendekat
    let dx = gameState.mouseX - player.x;
    let dy = gameState.mouseY - player.y;

    // Menambah smoothness
    if (Math.abs(dx) > 5) player.x += dx * 0.1;
    if (Math.abs(dy) > 5) player.y += dy * 0.1;

    // BATAS LAYAR (RESPONSIF)
    // Mencegah kapal keluar dari kiri/kanan layar
    if (player.x < 0) player.x = 0;
    if (player.x > window.innerWidth - 60) player.x = window.innerWidth - 60;
    
    // Mencegah kapal keluar dari atas/bawah
    if (player.y < 0) player.y = 0;
    if (player.y > window.innerHeight - 50) player.y = window.innerHeight - 50;

    // Terapkan ke DOM
    if (player.el) {
        player.el.style.left = player.x + "px";
        player.el.style.top = player.y + "px";
    }
}

// --- LOGIKA PELURU ---

function playerFire() {
    // Clone audio agar bisa dimainkan overlap (cepat)
    let sfx = audioBullet.cloneNode(); 
    sfx.play();

    const bulletId = Date.now(); // ID unik berdasarkan waktu
    const bObj = {
        id: bulletId,
        x: gameState.player.x + 20, // Posisi tengah kapal
        y: gameState.player.y - 10,
        el: createBulletElement()
    };
    
    // Set posisi awal
    bObj.el.style.left = bObj.x + "px";
    bObj.el.style.top = bObj.y + "px";

    gameState.bullets.push(bObj);
}

function createBulletElement() {
    const div = document.createElement("div");
    div.className = "bullet";
    const img = document.createElement("img");
    img.src = "img/bullet.png";
    div.appendChild(img);
    document.getElementById("gameboard").appendChild(div);
    return div;
}

function updateBullets() {
    // Loop mundur agar aman saat menghapus elemen array
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        let b = gameState.bullets[i];
        b.y -= GAME_CONFIG.bulletSpeed; // Gerak ke atas

        // Hapus jika keluar layar
        if (b.y < -50) {
            removeBullet(i);
        } else {
            // Update posisi DOM
            b.el.style.top = b.y + "px";
            b.el.style.left = b.x + "px";
            
            // Cek Tabrakan dengan Musuh
            checkCollision(b, i);
        }
    }
}

function removeBullet(index) {
    const b = gameState.bullets[index];
    if (b.el && b.el.parentNode) {
        b.el.parentNode.removeChild(b.el);
    }
    gameState.bullets.splice(index, 1);
}

// --- LOGIKA MUSUH ---

function spawnEnemy() {
    // Spawn di posisi X acak sesuai lebar layar saat ini (Responsif)
    const randomX = Math.random() * (window.innerWidth - 80);
    
    const enemyObj = {
        x: randomX,
        y: -100, // Mulai dari atas layar
        startX: randomX, // Untuk gerakan gelombang
        el: createEnemyElement()
    };
    
    enemyObj.el.style.left = enemyObj.x + "px";
    enemyObj.el.style.top = enemyObj.y + "px";

    gameState.enemies.push(enemyObj);
}

function createEnemyElement() {
    const div = document.createElement("div");
    div.className = "enemy";
    const img = document.createElement("img");
    img.src = "img/eShipSkin.png";
    div.appendChild(img);
    document.getElementById("gameboard").appendChild(div);
    return div;
}

function updateEnemies() {
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        let e = gameState.enemies[i];
        
        // Gerakan maju
        e.y += GAME_CONFIG.enemySpeed;
        
        // Gerakan gelombang (Sinus)
        e.x = e.startX + Math.sin(e.y / 50) * 50;

        // Update DOM
        e.el.style.top = e.y + "px";
        e.el.style.left = e.x + "px";

        // Hapus jika lewat bawah layar
        if (e.y > window.innerHeight) {
            removeEnemy(i);
        }
    }
}

function removeEnemy(index) {
    const e = gameState.enemies[index];
    if (e.el && e.el.parentNode) {
        e.el.parentNode.removeChild(e.el);
    }
    gameState.enemies.splice(index, 1);
}

// --- DETEKSI TABRAKAN (COLLISION) ---

function checkCollision(bullet, bulletIndex) {
    // Simple AABB Collision (Kotak ketemu kotak)
    for (let i = gameState.enemies.length - 1; i >= 0; i--) {
        let enemy = gameState.enemies[i];
        
        // Jarak hitbox sederhana
        if (
            bullet.x < enemy.x + 60 &&
            bullet.x + 20 > enemy.x &&
            bullet.y < enemy.y + 70 &&
            bullet.y + 40 > enemy.y
        ) {
            // Kena!
            createExplosion(enemy.x, enemy.y);
            removeEnemy(i);
            removeBullet(bulletIndex);
            
            let sfx = audioExplode.cloneNode();
            sfx.play();
            return; // Satu peluru hanya kena satu musuh
        }
    }
}

// --- EFEK LEDAKAN ---
function createExplosion(x, y) {
    const gb = document.getElementById("gameboard");
    const exp = document.createElement("div");
    exp.className = "explosion";
    exp.style.left = x + "px";
    exp.style.top = y + "px";
    
    const img = document.createElement("img");
    img.src = "img/explosion.gif?t=" + new Date().getTime(); // Reset GIF agar animasi ulang
    img.style.width = "100%";
    
    exp.appendChild(img);
    gb.appendChild(exp);

    // Hapus ledakan setelah animasi selesai
    setTimeout(() => {
        if(exp.parentNode) exp.parentNode.removeChild(exp);
    }, 500);
}