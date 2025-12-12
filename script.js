// --- KONFIGURASI GAME ---
const CONFIG = {
    playerSpeed: 0.25, 
    playerFireRate: 10,
    bulletSpeed: 15,
    enemyBulletSpeed: 6,
    baseEnemySpeed: 2,
    pointsNormal: 20,
    pointsBoss: 1500,
    levelThresholds: [1000, 3000, 6000, 10000, 15000] 
};

// --- DATABASE PELURU ---
// w/h = Ukuran Visual (Gambar)
// hitW/hitH = Ukuran Hitbox (Area Tabrakan) -> Lebih kecil agar adil
const BULLET_DATA = {
    'bul1': { f: 4, w: 30, h: 60, hitW: 15, hitH: 40 },
    
    // REVISI: Visual Besar (180), Hitbox Kecil (50) -> Anti Peluru Ghoib
    'bul2': { f: 6, w: 180, h: 90, hitW: 50, hitH: 30 },  
    
    'bul3': { f: 6, w: 30, h: 80, hitW: 20, hitH: 60, isMissile: true }, 
    'bul4': { f: 8, w: 50, h: 50, hitW: 30, hitH: 30 },
    
    // REVISI: Visual Besar (180), Hitbox Kecil (50)
    'bul5': { f: 6, w: 180, h: 90, hitW: 50, hitH: 30 },  
    
    'bul6': { f: 16, w: 50, h: 50, hitW: 30, hitH: 30 },
    'bul7': { f: 4, w: 50, h: 800, hitW: 30, hitH: 800, isLaser: true }, 
    'bul8': { f: 8, w: 40, h: 40, hitW: 25, hitH: 25 },
    'bul9': { f: 3, w: 35, h: 60, hitW: 20, hitH: 40, isMissile: true }, 
    'bul10': { f: 6, w: 60, h: 800, hitW: 40, hitH: 800, isLaser: true } 
};

// --- DATA LIST LAGU (BGM) ---
const BGM_LIST = [
    { file: "soundtrack/(1)Arthur Vyncke - A Few Jumps Away.mp3", credit: "A Few Jumps Away - Arthur Vyncke" },
    { file: "soundtrack/(2)Miguel Johnson - Good Day To Die.mp3", credit: "Good Day To Die - Miguel Johnson" },
    { file: "soundtrack/(3)Keys Of Moon - Thunder Unison.mp3", credit: "Thunder Unison - Keys Of Moon" },
    { file: "soundtrack/(4)A Himitsu - Two Places.mp3", credit: "Two Places - A Himitsu" },
    { file: "soundtrack/(5)Makai Symphony - Endless Storm.mp3", credit: "Endless Storm - Makai Symphony" },
    { file: "soundtrack/(6)Makai Symphony - The Army of Minotaur.mp3", credit: "The Army of Minotaur - Makai Symphony" }
];

// --- STATE ---
let state = {
    width: window.innerWidth,
    height: window.innerHeight,
    mouseX: window.innerWidth / 2,
    mouseY: window.innerHeight - 100,
    player: { x: window.innerWidth / 2, y: window.innerHeight - 100, hp: 100, maxHp: 100, el: null },
    bullets: [],
    enemyBullets: [], 
    enemies: [],
    score: 0,
    level: 1,
    isGameOver: false,
    isGameStarted: false,
    frames: 0,
    bossActive: false,
    bossObj: null,
    godMode: false,
    devPanelOpen: false,
    currentTrackIndex: -1,
    isMusicMuted: false,
    waveTimer: 0
};

// --- AUDIO SETUP ---
let audioShoot, audioExplode, bgmPlayer;
const VOL_SFX = 0.05; 
const VOL_BGM = 1.0; 

try {
    audioShoot = new Audio("audio/bulletsfx.mp3");
    audioExplode = new Audio("audio/expd.mp3");
    audioShoot.volume = VOL_SFX;   
    audioExplode.volume = VOL_SFX; 

    bgmPlayer = new Audio();
    bgmPlayer.loop = true; 
    bgmPlayer.volume = VOL_BGM;
    bgmPlayer.addEventListener('error', (e) => console.log("Audio Error:", e));
} catch (e) { console.warn(e); }

// --- HELPER: Padding Angka ---
function pad(num, size) {
    var s = "000" + num;
    return s.substr(s.length-size);
}

// --- FUNGSI MUSIK ---
function playBGM(index) {
    if (state.isMusicMuted) return;
    if (index < 0 || index >= BGM_LIST.length) return;
    if (state.currentTrackIndex === index && !bgmPlayer.paused) return;

    state.currentTrackIndex = index;
    const track = BGM_LIST[index];
    bgmPlayer.src = track.file;
    bgmPlayer.volume = VOL_BGM; 
    
    let playPromise = bgmPlayer.play();
    if (playPromise !== undefined) {
        playPromise.then(() => {}).catch(error => console.log("Autoplay prevented."));
    }
    const creditEl = document.getElementById("bgmTitle");
    if (creditEl) creditEl.innerText = track.credit;
}

function toggleMusic() {
    const btn = document.getElementById("musicBtn");
    if (state.isMusicMuted) {
        state.isMusicMuted = false;
        bgmPlayer.volume = VOL_BGM;
        btn.innerText = "🔊 MUSIC: ON";
        btn.style.color = "lime";
        btn.style.borderColor = "lime";
        if(state.currentTrackIndex !== -1) bgmPlayer.play();
        else playBGM(0);
    } else {
        state.isMusicMuted = true;
        bgmPlayer.pause();
        btn.innerText = "🔇 MUSIC: OFF";
        btn.style.color = "red";
        btn.style.borderColor = "red";
    }
}

// --- INISIALISASI ---
window.onload = function () {
    createPlayer();
    window.addEventListener("resize", () => {
        state.width = window.innerWidth;
        state.height = window.innerHeight;
        if(state.player.x > state.width) state.player.x = state.width - 20;
        if(state.player.y > state.height) state.player.y = state.height - 20;
    });
    /*
    document.addEventListener("keydown", (e) => {
        if (e.key === "`" || e.key === "~") toggleDevPanel();
    }); */
};

function startGame() {
    console.log("Game Started..."); 
    state.isGameStarted = true;
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("ui-layer").classList.remove("hidden");
    document.getElementById("gameboard").style.cursor = "none";

    if (bgmPlayer) { bgmPlayer.volume = VOL_BGM; playBGM(0); }
    if (audioShoot) {
        audioShoot.volume = 0; 
        audioShoot.play().then(() => {
            audioShoot.pause(); audioShoot.currentTime = 0; audioShoot.volume = VOL_SFX;
        }).catch(e => {});
    }

    document.addEventListener("mousemove", (e) => {
        if(state.isGameOver || !state.isGameStarted) return;
        state.mouseX = e.clientX;
        state.mouseY = e.clientY;
    });
    document.addEventListener("touchmove", (e) => {
        if(state.isGameOver || !state.isGameStarted) return;
        e.preventDefault(); 
        let touch = e.touches[0];
        state.mouseX = touch.clientX;
        state.mouseY = touch.clientY;
    }, { passive: false });

    requestAnimationFrame(gameLoop);
}

function createPlayer() {
    const gb = document.getElementById("gameboard");
    const ship = document.createElement("div");
    ship.className = "player-ship";
    ship.innerHTML = '<img src="img/skinShip.jpg" onerror="this.src=\'img/skinShip.png\'">'; 
    gb.appendChild(ship);
    state.player.el = ship;
}

// --- GAME LOOP ---
function gameLoop() {
    if (state.isGameStarted && !state.isGameOver) {
        state.frames++;
        
        try {
            updatePlayerMovement();
            if (state.frames % CONFIG.playerFireRate === 0) firePlayerBullet();
            
            updateBullets();
            updateEnemyBullets();
            checkLevelProgress();

            if (!state.bossActive) {
                handleWaveSystem();
            } else {
                updateBossBehavior();
            }
            
            updateEnemies();
            updateUI();
        } catch (err) {
            console.error("Loop Error:", err);
        }
    }
    if (!state.isGameOver) requestAnimationFrame(gameLoop);
}

function checkLevelProgress() {
    if (state.level > 5) return;
    let targetScore = CONFIG.levelThresholds[state.level - 1];
    if (state.score >= targetScore && !state.bossActive) {
        spawnBoss(state.level);
    }
}

// --- WAVE SYSTEM ---
function handleWaveSystem() {
    state.waveTimer++;
    if (state.waveTimer % 100 === 0) {
        let pattern = Math.floor(Math.random() * 4);
        if (pattern === 0) spawnFormationV();
        else if (pattern === 1) spawnFormationLine();
        else if (pattern === 2) spawnFormationZigZag();
        else spawnFormationSlant();
    }
}

function spawnFormationV() {
    let centerX = Math.random() * (state.width - 200) + 100;
    for (let i = 0; i < 5; i++) {
        let offsetX = (i - 2) * 60; 
        let offsetY = Math.abs(i - 2) * 50; 
        spawnEnemy(centerX + offsetX, -50 - offsetY, 'straight');
    }
}

function spawnFormationLine() {
    let startX = Math.random() * (state.width - 400) + 50;
    for (let i = 0; i < 4; i++) {
        spawnEnemy(startX + (i * 80), -50, 'straight');
    }
}

function spawnFormationZigZag() {
    for (let i = 0; i < 3; i++) {
        spawnEnemy(state.width * 0.2 + (i * 120), -50 - (i * 80), 'sine');
    }
}

function spawnFormationSlant() {
    let startX = Math.random() > 0.5 ? -50 : state.width + 50;
    let dir = startX < 0 ? 1 : -1; 
    for (let i = 0; i < 4; i++) {
        spawnEnemy(startX - (i * 60 * dir), -50 - (i * 60), 'diagonal', dir);
    }
}

function spawnEnemy(x, y, moveType, dir = 1) {
    const e = document.createElement("div");
    e.className = "enemy";
    e.innerHTML = '<img src="img/eShipSkin.png">';
    document.getElementById("gameboard").appendChild(e);
    
    state.enemies.push({ 
        type: 'normal', x: x, y: y, startX: x, 
        hp: 3 + state.level, el: e, 
        moveType: moveType, dir: dir, age: 0,
        hasShot: false
    });
}

function spawnBoss(lvl) {
    state.bossActive = true;
    showBossWarning();
    if (lvl <= 5) playBGM(lvl); 

    const bossHP = 2000 + (lvl * 1500); 
    const gb = document.getElementById("gameboard");
    const e = document.createElement("div");
    e.className = "enemy boss"; 
    e.innerHTML = `<img src="img/boss${lvl}.png" onerror="this.src='img/eShipSkin.png'"><div class="boss-hp-bar" style="width:100%"></div>`;
    e.style.left = (state.width / 2) + "px";
    e.style.top = "-300px";
    gb.appendChild(e);

    state.bossObj = { 
        type: 'boss', 
        bossLevel: lvl, 
        x: state.width / 2, 
        y: -300, 
        hp: bossHP, 
        maxHp: bossHP, 
        el: e,
        isEntering: true,       
        entranceTimer: 180      
    };
    state.enemies.push(state.bossObj);
}

function showBossWarning() {
    const warning = document.getElementById("boss-warning");
    warning.innerText = "WARNING: BOSS LEVEL " + state.level;
    warning.classList.remove("hidden");
    setTimeout(() => warning.classList.add("hidden"), 3000);
}

// --- LOGIKA BOSS ---
function updateBossBehavior() {
    if(!state.bossObj) return;
    const boss = state.bossObj;
    
    if (boss.isEntering) {
        boss.entranceTimer--;
        let targetEntryY = state.height * 0.2;
        boss.y += (targetEntryY - boss.y) * 0.02;
        
        if(boss.el) {
            boss.el.style.left = boss.x + "px"; 
            boss.el.style.top = boss.y + "px";
            if (Math.floor(boss.entranceTimer / 10) % 2 === 0) {
                boss.el.style.opacity = "0.5";
            } else {
                boss.el.style.opacity = "1.0";
            }
        }

        if (boss.entranceTimer <= 0) {
            boss.isEntering = false;
            if(boss.el) boss.el.style.opacity = "1.0"; 
        }
        return; 
    }

    let centerX = state.width / 2;
    boss.x += (centerX - boss.x) * 0.05; 
    
    let targetY = state.height * 0.2;
    if (boss.y < targetY) boss.y += 2; 
    
    // TITIK SPAWN (DEEP CENTER)
    let noseY = boss.y; 

    let fireFreq = Math.max(90, 150 - (boss.bossLevel * 10)); 
    
    if (state.frames % fireFreq === 0) {
        let dice = Math.random();
        let slowSpeed = 3; 

        const getBossBulletType = (level) => {
            let max = 2; // Boss 1
            if (level === 2) max = 4;
            if (level === 3) max = 6;
            if (level === 4) max = 8;
            if (level === 5) max = 10;
            let num = Math.floor(Math.random() * max) + 1;
            return 'bul' + num;
        };

        let selectedBullet = getBossBulletType(boss.bossLevel);
        
        let isLaserShot = (selectedBullet === 'bul7' || selectedBullet === 'bul10');
        let isMissileShot = (selectedBullet === 'bul3' || selectedBullet === 'bul9');

        if(isLaserShot) {
             spawnBossBullet(boss.x, noseY, 0, 0, selectedBullet, 300, 40, true); 
        } 
        else if (isMissileShot) {
             spawnBossBullet(boss.x - 20, noseY, -1, 3, selectedBullet);
             spawnBossBullet(boss.x + 20, noseY, 1, 3, selectedBullet);
        }
        else {
             if (dice < 0.6) {
                shootCenterBurst(boss, selectedBullet, slowSpeed, 5, 1.5);
            } else {
                // Tembak Lurus (Single Stream dari TENGAH ABSOLUT)
                // Hapus offset -15/+15 agar benar-benar dari tengah
                spawnBossBullet(boss.x, noseY, 0, slowSpeed, selectedBullet);
            }
        }
    }
}

function shootCenterBurst(boss, folderName, speed, count, spreadFactor) {
    let startVx = -((count - 1) * spreadFactor) / 2; 
    for (let i = 0; i < count; i++) {
        let vx = startVx + (i * spreadFactor);
        spawnBossBullet(boss.x, boss.y, vx, speed, folderName);
    }
}

// --- SPAWN PELURU BOSS ---
function spawnBossBullet(x, y, vx, vy, folderName, chargeTime = 0, damage = 10, isLaserAttack = false) {
    const b = document.createElement("div");
    b.className = "enemy-bullet";
    
    // Ambil config dari BULLET_DATA
    let conf = BULLET_DATA[folderName] || { f: 4, w: 30, h: 30 }; 
    
    let finalW = conf.w;
    let finalH = conf.h;
    
    // Gunakan konfigurasi Hitbox jika ada, jika tidak pakai ukuran visual
    let hitW = conf.hitW || finalW;
    let hitH = conf.hitH || finalH;
    
    let finalY = y; 

    if (isLaserAttack) {
        finalW = 40;
        finalH = 800; 
        hitH = 800; // Hitbox Laser Panjang
        b.classList.add("laser-beam");
        finalY = y + (finalH / 2);
    }

    b.style.width = finalW + "px";
    b.style.height = finalH + "px";
    b.style.left = x + "px";
    b.style.top = finalY + "px";
    
    if (chargeTime > 0) b.classList.add("laser-charge");

    let initialSrc = `img/${folderName}/tile000.png`;
    b.innerHTML = `<img src="${initialSrc}" style="width:100%;height:100%;object-fit:${isLaserAttack ? 'fill' : 'contain'};">`;
    
    document.getElementById("gameboard").appendChild(b);

    state.enemyBullets.push({
        x: x, y: finalY,
        vx: vx, vy: vy, el: b,
        chargeTimer: chargeTime, 
        life: 600,
        isAnim: true,
        folder: folderName,
        totalFrames: conf.f,
        currentFrame: 0,
        frameTimer: 0,
        isLaser: isLaserAttack,
        isMissile: (conf.isMissile === true),
        homingTimer: 90, 
        
        // Simpan Data Hitbox
        w: finalW, // Visual Width
        h: finalH, // Visual Height
        hitW: hitW, // Collision Width (Lebih Kecil)
        hitH: hitH  // Collision Height
    });
}

// --- SPAWN PELURU BIASA ---
function spawnEnemyBullet(x, y, vx, vy, imgPath) {
    const b = document.createElement("div");
    b.className = "enemy-bullet";
    b.style.width = "15px";
    b.style.height = "30px";
    b.style.left = x + "px";
    b.style.top = y + "px";
    
    b.innerHTML = `<img src="${imgPath}" style="width:100%;height:100%;object-fit:contain;">`;
    document.getElementById("gameboard").appendChild(b);
    
    state.enemyBullets.push({ 
        x: x, y: y, vx: vx, vy: vy, el: b, 
        life: 600, isAnim: false, w: 15, h: 30, hitW: 10, hitH: 20
    });
}

// --- UPDATE MUSUH ---
function updateEnemies() {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        
        if (e.type === 'normal') {
            e.age++;
            e.y += CONFIG.baseEnemySpeed + (state.level * 0.3);
            if (e.moveType === 'sine') e.x = e.startX + Math.sin(e.age * 0.05) * 100;
            if (e.moveType === 'diagonal') e.x += 2 * e.dir;

            if (!e.hasShot && e.y > 50 && Math.random() < 0.02) {
                let dx = state.player.x - e.x;
                let dy = state.player.y - e.y;
                let angle = Math.atan2(dy, dx);
                let speed = CONFIG.enemyBulletSpeed;
                let bvx = Math.cos(angle) * speed;
                let bvy = Math.sin(angle) * speed;
                
                spawnEnemyBullet(e.x, e.y + 30, bvx, bvy, 'img/bullet.png');
                e.hasShot = true; 
            }

        } else if (e.type === 'boss') {
            if(e.el) {
                e.el.style.left = e.x + "px"; e.el.style.top = e.y + "px";
                const hpBar = e.el.querySelector('.boss-hp-bar');
                if(hpBar) hpBar.style.width = (e.hp / e.maxHp * 100) + "%";
            }
        }
        
        if(e.el) { e.el.style.top = e.y + "px"; e.el.style.left = e.x + "px"; }

        let hitW = 50, hitH = 50;
        if(e.type === 'boss' && e.el) { hitW = e.el.offsetWidth * 0.4; hitH = e.el.offsetHeight * 0.4; }

        if (e.type !== 'boss' && e.y > state.height + 50) {
            removeObj(e.el); state.enemies.splice(i, 1);
            continue;
        }
        
        // HITBOX PLAYER 20px
        if (isColliding(state.player.x, state.player.y, 20, 20, e.x, e.y, hitW, hitH)) {
            if(e.type !== 'boss') { 
                removeObj(e.el); state.enemies.splice(i, 1); 
                damagePlayer(30); 
                createExplosion(e.x, e.y);
            } else {
                if (!e.isEntering) {
                    damagePlayer(30); 
                    createExplosion(e.x, e.y);
                }
            }
        }
    }
}

// --- UPDATE PELURU MUSUH ---
function updateEnemyBullets() {
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        let b = state.enemyBullets[i];
        b.life--;

        if (b.isAnim) {
            b.frameTimer++;
            if (b.frameTimer > 3) {
                b.currentFrame = (b.currentFrame + 1) % b.totalFrames;
                let num = pad(b.currentFrame, 3);
                let newSrc = `img/${b.folder}/tile${num}.png`;
                let imgEl = b.el.querySelector('img');
                if(imgEl) imgEl.src = newSrc;
                b.frameTimer = 0;
            }
        }

        if (b.chargeTimer && b.chargeTimer > 0) {
            b.chargeTimer--;
            if (b.chargeTimer <= 0) {
                b.el.classList.remove("laser-charge");
            }
            continue; 
        }

        if (b.isMissile && b.homingTimer > 0) {
            b.homingTimer--;
            let dx = state.player.x - b.x;
            let dy = state.player.y - b.y;
            let targetAngle = Math.atan2(dy, dx);
            let speed = 4; 
            b.vx += Math.cos(targetAngle) * 0.5; 
            b.vy += Math.sin(targetAngle) * 0.5;
            let currentSpeed = Math.sqrt(b.vx*b.vx + b.vy*b.vy);
            if(currentSpeed > speed) {
                b.vx = (b.vx / currentSpeed) * speed;
                b.vy = (b.vy / currentSpeed) * speed;
            }
        }

        b.x += b.vx; 
        b.y += b.vy;
        
        if (b.vx !== 0 && !b.isLaser) {
             let deg = Math.atan2(b.vy, b.vx) * 180 / Math.PI;
             b.el.style.transform = `translate(-50%, -50%) rotate(${deg - 90}deg)`;
        } else {
             b.el.style.transform = `translate(-50%, -50%)`;
        }

        if (b.y > state.height + 100 || b.x < -50 || b.x > state.width + 50 || b.life <= 0) { 
            removeObj(b.el); state.enemyBullets.splice(i, 1); 
        } else {
            b.el.style.top = b.y + "px"; b.el.style.left = b.x + "px";
            
            // HITBOX Logic: Gunakan b.hitW jika ada (Prioritas), jika tidak pakai b.w
            let currentHitW = b.hitW || b.w;
            let currentHitH = b.hitH || b.h;

            if (isColliding(b.x, b.y, currentHitW, currentHitH, state.player.x, state.player.y, 20, 20)) {
                damagePlayer(10); 
                if(!b.isLaser) { removeObj(b.el); state.enemyBullets.splice(i, 1); }
            }
        }
    }
}

// --- PLAYER & CORE LOOP ---
function updatePlayerMovement() {
    const p = state.player;
    p.x += (state.mouseX - p.x) * CONFIG.playerSpeed;
    p.y += (state.mouseY - p.y) * CONFIG.playerSpeed;
    p.x = Math.max(30, Math.min(state.width - 30, p.x));
    p.y = Math.max(30, Math.min(state.height - 30, p.y));
    if (p.el) { p.el.style.left = p.x + "px"; p.el.style.top = p.y + "px"; }
}

function firePlayerBullet() {
    if(audioShoot) {
        const sfx = audioShoot.cloneNode(true);
        sfx.volume = VOL_SFX; 
        sfx.play().catch(()=>{});
    }
    const b = document.createElement("div");
    b.className = "bullet";
    b.innerHTML = '<img src="img/bullet.png">';
    document.getElementById("gameboard").appendChild(b);
    state.bullets.push({ x: state.player.x, y: state.player.y - 40, el: b });
}

function damagePlayer(amount) {
    if (state.godMode) return; 
    state.player.hp -= amount;
    const pct = (state.player.hp / state.player.maxHp) * 100;
    const bar = document.getElementById("playerHpBar");
    bar.style.width = Math.max(0, pct) + "%";
    if(pct < 30) bar.style.backgroundColor = "red";
    else bar.style.backgroundColor = "#00ff00";
    if (state.player.hp <= 0) {
        state.player.hp = 0;
        createExplosion(state.player.x, state.player.y);
        gameOver();
    }
}

function updateBullets() {
    for (let i = state.bullets.length - 1; i >= 0; i--) {
        let b = state.bullets[i];
        b.y -= CONFIG.bulletSpeed;
        if (b.y < -50) { removeObj(b.el); state.bullets.splice(i, 1); } 
        else {
            b.el.style.top = b.y + "px"; b.el.style.left = b.x + "px";
            for (let j = state.enemies.length - 1; j >= 0; j--) {
                let e = state.enemies[j];
                let hitW = 50, hitH = 50;
                if (e.type === 'boss' && e.el) { hitW = e.el.offsetWidth * 0.4; hitH = e.el.offsetHeight * 0.4; }
                
                if (isColliding(b.x, b.y, 10, 20, e.x, e.y, hitW, hitH)) {
                    removeObj(b.el); state.bullets.splice(i, 1);
                    createExplosion(b.x, b.y - 10); 
                    
                    if (e.type === 'boss' && e.isEntering) {
                        break;
                    }

                    e.hp -= 20;
                    if (e.hp <= 0) {
                        if (e.type === 'boss') {
                            createBossExplosion(e.x, e.y);
                            state.score += CONFIG.pointsBoss; state.bossActive = false; state.bossObj = null; state.level++;
                            playBGM(0);
                            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 50); damagePlayer(0);
                        } else {
                            createExplosion(e.x, e.y); state.score += CONFIG.pointsNormal;
                        }
                        removeObj(e.el); state.enemies.splice(j, 1);
                    }
                    break;
                }
            }
        }
    }
}

function isColliding(x1, y1, w1, h1, x2, y2, w2, h2) {
    return Math.abs(x1 - x2) < (w1 + w2) / 2 && Math.abs(y1 - y2) < (h1 + h2) / 2;
}

function createExplosion(x, y) {
    if(audioExplode) {
        const sfx = audioExplode.cloneNode(true);
        sfx.volume = VOL_SFX;
        sfx.play().catch(()=>{});
    }
    const gb = document.getElementById("gameboard");
    if(!gb) return;
    const exp = document.createElement("div");
    exp.className = "explosion";
    exp.style.left = x + "px"; exp.style.top = y + "px";
    const img = document.createElement("img");
    img.onerror = function() { this.style.display='none'; };
    img.src = "img/explosion/1.png"; 
    exp.appendChild(img); gb.appendChild(exp);
    let frame = 1;
    const interval = setInterval(() => {
        frame++;
        if (frame > 8) { clearInterval(interval); removeObj(exp); } 
        else { img.src = `img/explosion/${frame}.png`; }
    }, 40); 
}

function createBossExplosion(x, y) {
    if(audioExplode) {
        const sfx = audioExplode.cloneNode(true);
        sfx.volume = VOL_SFX;
        sfx.play().catch(()=>{});
    }
    const gb = document.getElementById("gameboard");
    const exp = document.createElement("div");
    exp.className = "boss-explosion";
    exp.style.left = x + "px"; exp.style.top = y + "px";
    const img = document.createElement("img");
    img.src = "img/boss_exp/1.png";
    exp.appendChild(img); gb.appendChild(exp);
    let frame = 1;
    const interval = setInterval(() => {
        frame++;
        if (frame > 12) { clearInterval(interval); removeObj(exp); } 
        else { img.src = `img/boss_exp/${frame}.png`; }
    }, 50);
}

function updateUI() {
    const sEl = document.getElementById("scoreVal");
    const lEl = document.getElementById("levelVal");
    if(sEl) sEl.innerText = state.score;
    if(lEl) lEl.innerText = state.level;
}
function removeObj(el) { if (el && el.parentNode) el.parentNode.removeChild(el); }
function gameOver() {
    state.isGameOver = true;
    if(bgmPlayer) bgmPlayer.pause();
    document.getElementById("finalScore").innerText = state.score;
    document.getElementById("game-over-screen").classList.remove("hidden");
    document.getElementById("gameboard").style.cursor = "default";
}

// --- FUNGSI DEV MODE ---
function toggleDevPanel() {
    state.devPanelOpen = !state.devPanelOpen;
    const panel = document.getElementById("dev-panel");
    if (state.devPanelOpen) {
        panel.classList.remove("hidden");
        document.getElementById("gameboard").style.cursor = "default";
    } else {
        panel.classList.add("hidden");
        if(state.isGameStarted) document.getElementById("gameboard").style.cursor = "none";
    }
}
function devAddScore(amount) { state.score += amount; checkLevelProgress(); updateUI(); }
function devToggleGodMode() {
    state.godMode = !state.godMode;
    const status = document.getElementById("godStatus");
    if(status) {
        status.innerText = state.godMode ? "ON" : "OFF";
        status.style.color = state.godMode ? "red" : "white";
    }
    if(state.godMode) { state.player.hp = state.player.maxHp; damagePlayer(0); }
}
function devKillAll() {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        if (e.type !== 'boss') { createExplosion(e.x, e.y); removeObj(e.el); state.enemies.splice(i, 1); }
    }
}
function devForceBoss() { if(state.bossActive) return; spawnBoss(state.level); }