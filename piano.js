(function() {
    const canvas = document.getElementById("pianoCanvas");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");

    let frames = 0;
    let score = 0;
    let bestScore = localStorage.getItem("pianoBest") || 0;
    let currentState = 0; // 0: Get Ready, 1: Play, 2: Game Over
    let animationId;
    let speed = 4;
    let tiles = [];
    const cols = 4;
    const colWidth = canvas.width / cols;
    const tileHeight = 120;

    // Audio Context
    let audioCtx = null;
    
    // Frequencies for notes
    const freq = {
        E4: 329.63,
        F4: 349.23,
        G4: 392.00,
        A4: 440.00,
        B4: 493.88,
        C5: 523.25,
        D5: 587.33
    };

    // Indonesia Raya Melody (Stanza 1 simplified)
    const indonesiaRayaNotes = [
        // In-do-ne-sia ta-nah air-ku
        freq.G4, freq.G4, freq.C5, freq.C5, freq.B4, freq.B4, freq.A4,
        // Ta-nah tum-pah da-rah-ku
        freq.G4, freq.G4, freq.A4, freq.A4, freq.G4, freq.F4, freq.E4,
        // Di-sa-na-lah a-ku ber-di-ri
        freq.G4, freq.G4, freq.D5, freq.D5, freq.C5, freq.C5, freq.B4,
        // Ja-di pan-du i-bu-ku
        freq.G4, freq.G4, freq.A4, freq.A4, freq.B4, freq.A4, freq.G4
    ];
    
    let currentNoteIndex = 0;
    
    function playNote() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            // Neon synth sound
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(indonesiaRayaNotes[currentNoteIndex], audioCtx.currentTime);
            
            // Move to the next note in the melody
            currentNoteIndex = (currentNoteIndex + 1) % indonesiaRayaNotes.length;
            
            gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } catch(e) {}
    }

    function playError() {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.3);
            gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } catch(e) {}
    }

    function addTile(yPos) {
        let col = Math.floor(Math.random() * cols);
        tiles.push({
            x: col * colWidth,
            y: yPos,
            col: col,
            clicked: false
        });
    }

    function resetGame() {
        score = 0;
        speed = 4;
        currentNoteIndex = 0;
        tiles = [];
        // Pre-fill tiles
        for (let i = 0; i < 6; i++) {
            addTile(-i * tileHeight);
        }
    }

    function update() {
        if (currentState !== 1) return;
        
        // Speed scaling
        speed = 4 + (score * 0.05);

        for (let i = 0; i < tiles.length; i++) {
            let t = tiles[i];
            t.y += speed;

            // Missed a tile -> Game Over
            if (t.y > canvas.height && !t.clicked) {
                playError();
                currentState = 2;
                return;
            }
        }

        // Remove tiles that are off screen
        if (tiles.length > 0 && tiles[0].y > canvas.height) {
            tiles.shift();
            // Add new tile at the top
            let lastY = tiles[tiles.length - 1].y;
            addTile(lastY - tileHeight);
        }
    }

    let particles = [];
    let scorePopups = [];

    function addScorePopup(x, y, text) {
        scorePopups.push({
            x: x,
            y: y,
            text: text,
            alpha: 1,
            life: 30
        });
    }

    function draw() {
        // Background with subtle gradient
        let bgGrd = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 50, canvas.width/2, canvas.height/2, canvas.width);
        bgGrd.addColorStop(0, "#151515");
        bgGrd.addColorStop(1, "#0a0a0a");
        ctx.fillStyle = bgGrd;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines with neon pulse
        ctx.strokeStyle = "rgba(0, 243, 255, 0.05)";
        ctx.lineWidth = 1;
        for (let i = 1; i < cols; i++) {
            ctx.beginPath();
            ctx.moveTo(i * colWidth, 0);
            ctx.lineTo(i * colWidth, canvas.height);
            ctx.stroke();
        }

        // Draw Tiles
        for (let i = 0; i < tiles.length; i++) {
            let t = tiles[i];
            if (!t.clicked) {
                // Neon glow effect for unclicked tile
                ctx.save();
                // Optimize shadows for mobile
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#00f3ff";
                
                let tileGrd = ctx.createLinearGradient(t.x, t.y, t.x + colWidth, t.y + tileHeight);
                tileGrd.addColorStop(0, "#00f3ff");
                tileGrd.addColorStop(1, "#00a3ff");
                
                ctx.fillStyle = tileGrd;
                // Draw rounded rectangle for more professional look
                const r = 8;
                ctx.beginPath();
                ctx.moveTo(t.x + 4 + r, t.y + 2);
                ctx.lineTo(t.x + colWidth - 4 - r, t.y + 2);
                ctx.quadraticCurveTo(t.x + colWidth - 4, t.y + 2, t.x + colWidth - 4, t.y + 2 + r);
                ctx.lineTo(t.x + colWidth - 4, t.y + tileHeight - 2 - r);
                ctx.quadraticCurveTo(t.x + colWidth - 4, t.y + tileHeight - 2, t.x + colWidth - 4 - r, t.y + tileHeight - 2);
                ctx.lineTo(t.x + 4 + r, t.y + tileHeight - 2);
                ctx.quadraticCurveTo(t.x + 4, t.y + tileHeight - 2, t.x + 4, t.y + tileHeight - 2 - r);
                ctx.lineTo(t.x + 4, t.y + 2 + r);
                ctx.quadraticCurveTo(t.x + 4, t.y + 2, t.x + 4 + r, t.y + 2);
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            } else {
                // Clicked tile effect (faded but with trail)
                ctx.fillStyle = "rgba(0, 243, 255, 0.1)";
                ctx.fillRect(t.x + 4, t.y + 2, colWidth - 8, tileHeight - 4);
            }
        }

        // Draw score popups
        for (let i = 0; i < scorePopups.length; i++) {
            let p = scorePopups[i];
            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = "#fff";
            ctx.font = "bold 20px 'Outfit', sans-serif";
            ctx.fillText(p.text, p.x, p.y);
            p.y -= 1;
            p.alpha -= 0.03;
            p.life--;
            ctx.restore();
            if (p.life <= 0) {
                scorePopups.splice(i, 1);
                i--;
            }
        }

        // Draw UI
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 4;
        ctx.textAlign = "center";

        if (currentState === 1) {
            // HUD
            ctx.font = "bold 50px 'Outfit', sans-serif";
            ctx.shadowBlur = 10;
            ctx.shadowColor = "rgba(0,0,0,0.5)";
            ctx.fillText(score, canvas.width/2, 70);
            ctx.shadowBlur = 0;
            
            // Progress Bar
            ctx.fillStyle = "rgba(255,255,255,0.1)";
            ctx.fillRect(20, 10, canvas.width - 40, 6);
            ctx.fillStyle = "#00f3ff";
            let progress = (currentNoteIndex / indonesiaRayaNotes.length) * (canvas.width - 40);
            ctx.fillRect(20, 10, progress, 6);
        } else if (currentState === 2) {
            // Professional Game Over Screen
            ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#ff4757";
            ctx.fillStyle = "#ff4757";
            ctx.font = "900 36px 'Outfit', sans-serif";
            ctx.fillText("GAME OVER", canvas.width/2, 120);
            
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#00f3ff";
            ctx.fillStyle = "#fff";
            ctx.font = "bold 60px 'Outfit', sans-serif";
            ctx.fillText(score, canvas.width/2, 200);
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#a1a1aa";
            ctx.font = "600 16px 'Inter', sans-serif";
            ctx.fillText("SKOR TERBAIK: " + bestScore, canvas.width/2, 250);
            
            ctx.fillStyle = "#fff";
            ctx.font = "500 14px 'Inter', sans-serif";
            ctx.fillText("- Sentuh untuk Coba Lagi -", canvas.width/2, 340);
        } else if (currentState === 0) {
            // Professional Start Screen
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#00f3ff";
            ctx.fillStyle = "#00f3ff";
            ctx.font = "900 36px 'Outfit', sans-serif";
            ctx.fillText("PIANO NEON", canvas.width/2, 160);
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#fff";
            ctx.font = "400 14px 'Inter', sans-serif";
            ctx.fillText("Ikuti Melodi Indonesia Raya", canvas.width/2, 210);
            
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.font = "italic 13px 'Inter', sans-serif";
            ctx.fillText("- Klik untuk Memulai -", canvas.width/2, 280);
        }
    }

    function loop() {
        update();
        draw();
        frames++;
        animationId = requestAnimationFrame(loop);
    }

    // Input Handling
    function handleTap(x, y) {
        if (currentState === 0) {
            resetGame();
            currentState = 1;
            return;
        }
        if (currentState === 2) {
            currentState = 0;
            return;
        }

        // Debounce tap to prevent double-firing
        if (frames - (this.lastTapFrame || 0) < 5) return;
        this.lastTapFrame = frames;

        // Play mode tap
        let clickedCol = Math.floor(x / colWidth);
        let hit = false;
        
        // Find the lowest unclicked tile
        let targetTile = null;
        for (let i = 0; i < tiles.length; i++) {
            if (!tiles[i].clicked) {
                targetTile = tiles[i];
                break;
            }
        }

        if (targetTile) {
            // Check if the click is in the correct column
            // Piano tiles is fairly forgiving on Y-axis as long as it's the bottom-most tile
            if (targetTile.col === clickedCol) {
                // Correct tap
                targetTile.clicked = true;
                score++;
                bestScore = Math.max(score, bestScore);
                localStorage.setItem("pianoBest", bestScore);
                playNote();
                addScorePopup(x, y - 20, "+1");
                hit = true;
            }
        }

        if (!hit) {
            // Wrong tap
            playError();
            currentState = 2; // Game over
        }
    }

    canvas.addEventListener("pointerdown", (e) => {
        const rect = canvas.getBoundingClientRect();
        // Relax visibility check to work while scrolling
        const isVisible = (rect.top < window.innerHeight && rect.bottom > 0);
        
        if (isVisible) {
            e.preventDefault(); 
            // Correct scaling for responsive canvas
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            handleTap(x, y);
        }
    });

    // Start game loop
    resetGame();
    loop();
})();
