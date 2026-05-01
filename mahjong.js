(function() {
    const canvas = document.getElementById("mahjongCanvas");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");

    let tiles = [];
    let selectedTile = null;
    let score = 0;
    let gameState = 0; // 0: Start, 1: Play, 2: Win
    const tileW = 32;
    const tileH = 42;
    const symbols = ["🀀", "🀁", "🀂", "🀃", "🀄", "🀅", "🀆", "🀇", "🀈", "🀉", "🀊", "🀋", "🀌", "🀍", "🀎", "🀏", "🀐", "🀑"];
    
    let audioCtx = null;
    function playSound(freq, duration = 0.1) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
            osc.start();
            osc.stop(audioCtx.currentTime + duration);
        } catch(e) {}
    }

    function initGame() {
        tiles = [];
        score = 0;
        gameState = 1;
        selectedTile = null;

        // Create pairs of tiles
        let pairCount = 36; // 72 tiles total
        let availableSymbols = [];
        for (let i = 0; i < pairCount; i++) {
            let s = symbols[i % symbols.length];
            availableSymbols.push(s, s);
        }
        
        // Shuffle symbols
        availableSymbols.sort(() => Math.random() - 0.5);

        // Realistic Turtle-ish Layout
        let idx = 0;
        // Base Level 0: Large rectangle with gaps
        for (let r = 0; r < 6; r++) {
            for (let c = 0; c < 8; c++) {
                if (idx < availableSymbols.length) {
                    tiles.push({
                        x: 25 + c * (tileW + 2),
                        y: 80 + r * (tileH + 2),
                        z: 0,
                        symbol: availableSymbols[idx++],
                        removed: false
                    });
                }
            }
        }
        // Level 1: Smaller rectangle
        for (let r = 1; r < 5; r++) {
            for (let c = 2; c < 6; c++) {
                if (idx < availableSymbols.length) {
                    tiles.push({
                        x: 15 + c * (tileW + 2) + 4,
                        y: 80 + r * (tileH + 2) + 4,
                        z: 1,
                        symbol: availableSymbols[idx++],
                        removed: false
                    });
                }
            }
        }
        // Level 2: Top cap
        for (let i = 0; i < 8; i++) {
            if (idx < availableSymbols.length) {
                tiles.push({
                    x: 15 + (3 + (i%2)) * (tileW + 2) + 8,
                    y: 80 + (2 + Math.floor(i/2)) * (tileH + 2) + 8,
                    z: 2,
                    symbol: availableSymbols[idx++],
                    removed: false
                });
            }
        }
    }

    function isFree(tile) {
        if (tile.removed) return false;
        
        // Check if any tile is on top
        const onTop = tiles.some(t => !t.removed && t.z > tile.z && 
            Math.abs(t.x - tile.x) < tileW && Math.abs(t.y - tile.y) < tileH);
        if (onTop) return false;

        // Check left/right freedom
        const leftBlocked = tiles.some(t => !t.removed && t.z === tile.z && 
            t.x < tile.x && Math.abs(t.x - (tile.x - tileW - 5)) < 5 && Math.abs(t.y - tile.y) < 5);
        const rightBlocked = tiles.some(t => !t.removed && t.z === tile.z && 
            t.x > tile.x && Math.abs(t.x - (tile.x + tileW + 5)) < 5 && Math.abs(t.y - tile.y) < 5);
            
        return !leftBlocked || !rightBlocked;
    }

    function draw() {
        ctx.fillStyle = "#0a0a0a";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw HUD
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px 'Outfit', sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("SKOR: " + score, 20, 40);

        if (gameState === 0) {
            ctx.fillStyle = "rgba(0,0,0,0.8)";
            ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.fillStyle = "#f59e0b";
            ctx.textAlign = "center";
            ctx.font = "bold 30px 'Outfit', sans-serif";
            ctx.fillText("MAHJONG NEON", canvas.width/2, 220);
            ctx.fillStyle = "#fff";
            ctx.font = "14px 'Inter', sans-serif";
            ctx.fillText("Pasangkan ubin yang identik", canvas.width/2, 260);
            ctx.fillText("- Klik untuk Mulai -", canvas.width/2, 320);
            return;
        }

        if (gameState === 2) {
            ctx.fillStyle = "rgba(0,0,0,0.9)";
            ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.fillStyle = "#2ecc71";
            ctx.textAlign = "center";
            ctx.font = "bold 40px 'Outfit', sans-serif";
            ctx.fillText("YOU WIN!", canvas.width/2, 220);
            ctx.fillStyle = "#fff";
            ctx.fillText("SKOR: " + score, canvas.width/2, 280);
            ctx.font = "14px 'Inter', sans-serif";
            ctx.fillText("- Klik untuk Main Lagi -", canvas.width/2, 340);
            return;
        }

        // Sort tiles by Z for correct layering
        let sortedTiles = [...tiles].sort((a, b) => a.z - b.z);

        sortedTiles.forEach(t => {
            if (t.removed) return;

            let isTileFree = isFree(t);
            
            ctx.save();
            // Tile Base (3D Side)
            ctx.fillStyle = "#0a0a0a";
            ctx.fillRect(t.x + 4, t.y + 4, tileW, tileH); // Depth shadow

            // Top Face
            ctx.fillStyle = isTileFree ? "#1a1a1a" : "#0d0d0d";
            
            // Optimize shadows (only for selected tile)
            if (selectedTile === t) {
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#f59e0b";
                ctx.strokeStyle = "#f59e0b";
                ctx.lineWidth = 2;
            } else {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = isTileFree ? "#f59e0b66" : "#333";
                ctx.lineWidth = 1;
            }

            // Rect
            ctx.beginPath();
            ctx.rect(t.x, t.y, tileW, tileH);
            ctx.fill();
            ctx.stroke();

            // Bevel effect
            ctx.strokeStyle = "rgba(255,255,255,0.05)";
            ctx.strokeRect(t.x + 2, t.y + 2, tileW - 4, tileH - 4);

            // Symbol
            ctx.fillStyle = isTileFree ? "#fff" : "#444";
            ctx.font = "24px 'Inter', sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(t.symbol, t.x + tileW/2, t.y + tileH/2);
            
            ctx.restore();
        });
    }

    canvas.addEventListener("pointerdown", (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
        const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);

        if (gameState === 0 || gameState === 2) {
            initGame();
            return;
        }

        // Find clicked tile (reverse Z order)
        let clicked = null;
        let sorted = [...tiles].sort((a, b) => b.z - a.z);
        for (let t of sorted) {
            if (!t.removed && mouseX >= t.x && mouseX <= t.x + tileW && mouseY >= t.y && mouseY <= t.y + tileH) {
                clicked = t;
                break;
            }
        }

        if (clicked && isFree(clicked)) {
            playSound(440);
            if (!selectedTile) {
                selectedTile = clicked;
            } else if (selectedTile === clicked) {
                selectedTile = null;
            } else {
                if (selectedTile.symbol === clicked.symbol) {
                    // Match!
                    selectedTile.removed = true;
                    clicked.removed = true;
                    score += 100;
                    selectedTile = null;
                    playSound(880, 0.2);
                    
                    // Check Win
                    if (tiles.every(t => t.removed)) {
                        gameState = 2;
                    }
                } else {
                    selectedTile = clicked;
                }
            }
        }
    });

    function loop() {
        draw();
        requestAnimationFrame(loop);
    }
    loop();
})();
