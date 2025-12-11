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
    devPanelOpen: false
};

// --- AUDIO ---
let audioShoot, audioExplode;
try {
    audioShoot = new Audio("audio/bulletsfx.mp3");
    audioExplode = new Audio("audio/expd.mp3");
    audioShoot.volume = 0.2;
    audioExplode.volume = 0.4;
} catch (e) { console.warn(e); }

// --- INISIALISASI ---
window.onload = function () {
    createPlayer();
    
    window.addEventListener("resize", () => {
        state.width = window.innerWidth;
        state.height = window.innerHeight;
        if(state.player.x > state.width) state.player.x = state.width - 20;
        if(state.player.y > state.height) state.player.y = state.height - 20;
    });

    // document.addEventListener("keydown", (e) => {
    //     if (e.key === "`" || e.key === "~") toggleDevPanel();
    // });
};

function startGame() {
    state.isGameStarted = true;
    document.getElementById("start-screen").classList.add("hidden");
    document.getElementById("ui-layer").classList.remove("hidden");
    document.getElementById("gameboard").style.cursor = "none";

    if(audioShoot) {
        audioShoot.play().then(() => {
            audioShoot.pause();
            audioShoot.currentTime = 0;
        }).catch(e => console.log("Audio permission ok"));
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

        updatePlayerMovement();
        
        if (state.frames % CONFIG.playerFireRate === 0) {
            firePlayerBullet();
        }

        updateBullets();
        updateEnemyBullets();
        checkLevelProgress();

        if (!state.bossActive) {
            let spawnRate = Math.max(20, 80 - (state.level * 10)); 
            if (state.frames % spawnRate === 0) spawnNormalEnemy();
        } else {
            updateBossBehavior();
        }

        updateEnemies();
        updateUI();
    }
    
    if (!state.isGameOver) {
        requestAnimationFrame(gameLoop);
    }
}

function checkLevelProgress() {
    if (state.level > 5) return;
    let targetScore = CONFIG.levelThresholds[state.level - 1];
    if (state.score >= targetScore && !state.bossActive) {
        spawnBoss(state.level);
    }
}

function spawnBoss(lvl) {
    state.bossActive = true;
    showBossWarning();
    const bossHP = 2000 + (lvl * 1500); 
    const gb = document.getElementById("gameboard");
    const e = document.createElement("div");
    e.className = "enemy boss"; 
    
    e.innerHTML = `<img src="img/boss${lvl}.png" onerror="this.src='img/eShipSkin.png'"><div class="boss-hp-bar" style="width:100%"></div>`;
    
    e.style.left = (state.width / 2) + "px";
    e.style.top = "-300px";
    gb.appendChild(e);

    state.bossObj = {
        type: 'boss', bossLevel: lvl, 
        x: state.width / 2, 
        y: -300, 
        hp: bossHP, maxHp: bossHP, el: e
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
    
    let centerX = state.width / 2;
    boss.x += (centerX - boss.x) * 0.05; 
    
    let targetY = state.height * 0.2;
    if (boss.y < targetY) { 
        boss.y += 2; 
    }
    
    // POSISI MONCONG (Tempat peluru keluar)
    let bossH = boss.el ? boss.el.offsetHeight : 200;
    let noseY = boss.y + (bossH * 0.25); 

    let fireFreq = Math.max(90, 150 - (boss.bossLevel * 10)); 
    
    if (state.frames % fireFreq === 0) {
        let dice = Math.random();
        let folder = `img/boss${boss.bossLevel}_bul/`;
        let slowSpeed = 2; 

        // BOSS 1
        if (boss.bossLevel === 1) {
            shootWingSpread(boss, folder + "1.png", slowSpeed, 1, 1.0); 
        }
        // BOSS 2
        else if (boss.bossLevel === 2) {
            if (dice < 0.5) shootWingSpread(boss, folder + "1.png", slowSpeed, 1, 1.0);
            else {
                let randX = boss.x + (Math.random() - 0.5) * 100;
                spawnEnemyBullet(randX, noseY, 0, slowSpeed, folder + "2.png");
            }
        }
        // BOSS 3
        else if (boss.bossLevel === 3) {
            if (dice < 0.6) shootWingSpread(boss, folder + "1.png", slowSpeed, 1, 0.8);
            else {
                // Peluru 3.png juga akan ikut membesar di logic spawnEnemyBullet
                spawnEnemyBullet(boss.x - 80, noseY, -0.5, slowSpeed, folder + "3.png");
                spawnEnemyBullet(boss.x + 80, noseY, 0.5, slowSpeed, folder + "3.png");
            }
        }
        // BOSS 4
        else if (boss.bossLevel === 4) {
            if (dice < 0.7) {
                // Skill random (1, 2, 3, 4, 6)
                let types = ["1.png", "2.png", "3.png", "4.png", "6.png"];
                let type = types[Math.floor(Math.random() * types.length)];
                
                if(type === "1.png") {
                    shootWingSpread(boss, folder + type, slowSpeed, 1, 1.5);
                } else {
                    spawnEnemyBullet(boss.x, noseY, (Math.random()-0.5), slowSpeed, folder + type);
                }
            } else {
                // Laser
                shootLaserCharge(boss.x, noseY, folder + "5.png", 3, 180, 40);
            }
        }
        // BOSS 5
        else if (boss.bossLevel === 5) {
             if (dice < 0.75) { 
                // Skill random termasuk 10.png
                let types = ["1.png", "2.png", "3.png", "5.png", "6.png", "8.png", "9.png", "10.png"];
                let type = types[Math.floor(Math.random() * types.length)];
                
                if(type === "1.png") {
                    shootWingSpread(boss, folder + type, slowSpeed, 1, 2.0);
                } else {
                    spawnEnemyBullet(boss.x - 120, noseY, -0.5, slowSpeed, folder + type);
                    spawnEnemyBullet(boss.x + 120, noseY, 0.5, slowSpeed, folder + type);
                }
            } else if (dice < 0.9) {
                shootLaserCharge(boss.x, noseY, folder + "4.png", 3, 100, 40);
            } else {
                shootLaserCharge(boss.x, noseY, folder + "7.png", 3, 180, 80);
            }
        }
    }
}

// --- FUNGSI SHOOT HELPER ---

function shootWingSpread(boss, img, speed, countPerWing, spreadFactor) {
    let bossW = boss.el ? boss.el.offsetWidth : 200;
    let bossH = boss.el ? boss.el.offsetHeight : 200;
    let wingOffset = bossW * 0.3; 
    let shootY = boss.y + (bossH * 0.25); 

    shootSpread(boss.x, shootY, img, speed, countPerWing, spreadFactor);
    shootSpread(boss.x - wingOffset, shootY, img, speed, countPerWing, spreadFactor);
    shootSpread(boss.x + wingOffset, shootY, img, speed, countPerWing, spreadFactor);
}

function shootSpread(startX, startY, img, speed, count, spreadFactor) {
    if (count === 1) {
        let drift = (Math.random() - 0.5) * 0.5; 
        spawnEnemyBullet(startX, startY, drift, speed, img);
        return;
    }
    let startVx = -spreadFactor; 
    let step = (spreadFactor * 2) / (count - 1);
    for (let i = 0; i < count; i++) {
        let vx = startVx + (step * i);
        spawnEnemyBullet(startX, startY, vx, speed, img);
    }
}

function shootLaserCharge(x, y, img, speed, chargeDuration, damage) {
    spawnEnemyBullet(x, y, 0, speed, img, chargeDuration, damage);
}

function updatePlayerMovement() {
    const p = state.player;
    p.x += (state.mouseX - p.x) * CONFIG.playerSpeed;
    p.y += (state.mouseY - p.y) * CONFIG.playerSpeed;
    p.x = Math.max(30, Math.min(state.width - 30, p.x));
    p.y = Math.max(30, Math.min(state.height - 30, p.y));
    if (p.el) { p.el.style.left = p.x + "px"; p.el.style.top = p.y + "px"; }
}

function firePlayerBullet() {
    if(audioShoot) audioShoot.cloneNode(true).play().catch(()=>{});
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

function spawnNormalEnemy() {
    const xPos = Math.random() * (state.width - 60) + 30; 
    const e = document.createElement("div");
    e.className = "enemy";
    e.innerHTML = '<img src="img/eShipSkin.png">';
    document.getElementById("gameboard").appendChild(e);
    state.enemies.push({ type: 'normal', x: xPos, y: -50, hp: 3 + state.level, el: e });
}

// --- SPAWN PELURU  ---
function spawnEnemyBullet(x, y, vx, vy, imgPath, chargeTime = 0, damage = 10) {
    const b = document.createElement("div");
    b.className = "enemy-bullet";
    
    let w = 25, h = 25; 
    let isLaser = false;
    let curveRate = 0; 
    let vanishY = state.height * (0.5 + Math.random() * 0.5);

    if (imgPath) {
        // LASER
        if (imgPath.includes("boss5_bul/7.png") || imgPath.includes("boss5_bul/4.png") || imgPath.includes("boss4_bul/5.png")) {
            w = 50; h = 700; 
            b.classList.add("laser-beam");
            isLaser = true;
            vanishY = state.height + 800; 
        }
        // PELURU RAKSASA/LEBAR 
        
        else if (
            (imgPath.includes("2.png") || 
             imgPath.includes("3.png") ||  
             imgPath.includes("4.png") || 
             imgPath.includes("5.png") || 
             imgPath.includes("6.png") || 
             imgPath.includes("8.png") || 
             imgPath.includes("9.png") || 
             imgPath.includes("10.png")) 
            && imgPath.includes("boss")
        ) {
            w = 280; h = 60; // Ukuran Besar
        }
        else if (imgPath.includes("1.png")) {
            w = 60; h = 60; 
        }
        else if (imgPath.includes("boss")) {
            w = 80; h = 80; 
        }
    }
    
    if (!isLaser) {
        if (Math.random() < 0.5) { 
            curveRate = (Math.random() - 0.5) * 0.02; 
        }
        vx += (Math.random() - 0.5) * 0.5; 
    }

    b.style.width = w + "px";
    b.style.height = h + "px";
    
    let finalY = y;
    if (isLaser) {
        finalY = y + (h / 2) - 20; 
    }

    b.style.left = x + "px";
    b.style.top = finalY + "px";
    
    let charging = false;
    if (chargeTime > 0 && isLaser) {
        b.classList.add("laser-charge");
        charging = true;
    }

    let finalSrc = imgPath ? imgPath : 'img/enemyBullet.png';
    b.innerHTML = `<img src="${finalSrc}" onerror="this.src='img/bullet.png'">`;
    document.getElementById("gameboard").appendChild(b);
    
    state.enemyBullets.push({ 
        x: x, y: finalY, 
        vx: vx, vy: vy, el: b, 
        chargeTimer: chargeTime, dmg: damage, w: w, h: h,
        isCharging: charging,
        curveRate: curveRate,
        speedVal: Math.sqrt(vx*vx + vy*vy) || 3,
        life: 600,
        vanishY: vanishY 
    });
}

function updateEnemies() {
    for (let i = state.enemies.length - 1; i >= 0; i--) {
        let e = state.enemies[i];
        
        if (e.type === 'normal') {
            e.y += CONFIG.baseEnemySpeed + (state.level * 0.3);
            if (Math.random() < 0.01) {
                spawnEnemyBullet(e.x, e.y + 30, 0, CONFIG.enemyBulletSpeed, 'img/enemyBullet.png');
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
        if(e.type === 'boss' && e.el) {
            hitW = e.el.offsetWidth * 0.4;
            hitH = e.el.offsetHeight * 0.4;
        }

        if (e.type !== 'boss' && e.y > state.height + 50) {
            removeObj(e.el); state.enemies.splice(i, 1);
            continue;
        }

        if (isColliding(state.player.x, state.player.y, 20, 30, e.x, e.y, hitW, hitH)) {
            if(e.type !== 'boss') { 
                removeObj(e.el); 
                state.enemies.splice(i, 1); 
            }
            damagePlayer(30); 
            createExplosion(e.x, e.y);
        }
    }
}

function updateEnemyBullets() {
    for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
        let b = state.enemyBullets[i];
        
        b.life--;

        if (b.isCharging) {
            b.chargeTimer--;
            if (b.chargeTimer <= 0) {
                b.isCharging = false;
                b.el.classList.remove("laser-charge");
            }
            continue; 
        }

        if (b.curveRate !== 0) {
            let currentAngle = Math.atan2(b.vy, b.vx);
            currentAngle += b.curveRate; 
            b.vx = Math.cos(currentAngle) * b.speedVal;
            b.vy = Math.sin(currentAngle) * b.speedVal;
            let deg = Math.atan2(b.vy, b.vx) * 180 / Math.PI;
            b.el.style.transform = `translate(-50%, -50%) rotate(${deg + 90}deg)`;
        }

        b.x += b.vx;
        b.y += b.vy;

        let shouldVanish = (!b.el.classList.contains("laser-beam") && b.y > b.vanishY);

        if (shouldVanish || b.y > state.height + 100 || b.x < -50 || b.x > state.width + 50 || b.life <= 0) { 
            removeObj(b.el); state.enemyBullets.splice(i, 1); 
        } 
        else {
            b.el.style.top = b.y + "px"; b.el.style.left = b.x + "px";
            if (isColliding(b.x, b.y, b.w * 0.4, b.h * 0.4, state.player.x, state.player.y, 15, 15)) {
                damagePlayer(b.dmg || 10);
                removeObj(b.el); state.enemyBullets.splice(i, 1);
            }
        }
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
                if (e.type === 'boss' && e.el) {
                    hitW = e.el.offsetWidth * 0.4; 
                    hitH = e.el.offsetHeight * 0.4;
                }
                
                if (isColliding(b.x, b.y, 10, 20, e.x, e.y, hitW, hitH)) {
                    removeObj(b.el); 
                    state.bullets.splice(i, 1);
                    
                    createExplosion(b.x, b.y - 10); 
                    e.hp -= 20;
                    if (e.hp <= 0) {
                        if (e.type === 'boss') {
                            createBossExplosion(e.x, e.y);
                            state.score += CONFIG.pointsBoss; state.bossActive = false; state.bossObj = null; state.level++;
                            state.player.hp = Math.min(state.player.maxHp, state.player.hp + 50); damagePlayer(0);
                        } else {
                            createExplosion(e.x, e.y);
                            state.score += CONFIG.pointsNormal;
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
    if(audioExplode) audioExplode.cloneNode(true).play().catch(()=>{});
    
    const gb = document.getElementById("gameboard");
    if(!gb) return;

    const exp = document.createElement("div");
    exp.className = "explosion";
    exp.style.left = x + "px"; exp.style.top = y + "px";
    
    const img = document.createElement("img");
    img.onerror = function() { this.style.display='none'; };
    img.src = "img/explosion/1.png"; 
    exp.appendChild(img);
    gb.appendChild(exp);

    let frame = 1;
    const maxFrames = 8; 

    const interval = setInterval(() => {
        frame++;
        if (frame > maxFrames) {
            clearInterval(interval);
            removeObj(exp);
        } else {
            img.src = `img/explosion/${frame}.png`;
        }
    }, 40); 
}

function createBossExplosion(x, y) {
    if(audioExplode) audioExplode.cloneNode(true).play().catch(()=>{});
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

function removeObj(el) { 
    if (el && el.parentNode) el.parentNode.removeChild(el); 
}

function gameOver() {
    state.isGameOver = true;
    document.getElementById("finalScore").innerText = state.score;
    document.getElementById("game-over-screen").classList.remove("hidden");
    document.getElementById("gameboard").style.cursor = "default";
}

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