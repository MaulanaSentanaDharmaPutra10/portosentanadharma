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

    function draw() {
        // Background
        ctx.fillStyle = "#111"; // dark background
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw grid lines
        ctx.strokeStyle = "#333";
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
                ctx.shadowBlur = 15;
                ctx.shadowColor = "#00f3ff";
                ctx.fillStyle = "#00f3ff"; // Neon Cyan
                ctx.fillRect(t.x + 2, t.y, colWidth - 4, tileHeight - 2);
                ctx.shadowBlur = 0; // reset
            } else {
                // Clicked tile effect (faded)
                ctx.fillStyle = "rgba(0, 243, 255, 0.15)";
                ctx.fillRect(t.x + 2, t.y, colWidth - 4, tileHeight - 2);
            }
        }

        // Draw UI
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 3;
        ctx.textAlign = "center";

        if (currentState === 1) {
            ctx.font = "bold 40px 'Inter', sans-serif";
            ctx.strokeText(score, canvas.width/2, 50);
            ctx.fillText(score, canvas.width/2, 50);
        } else if (currentState === 2) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = "#00f3ff";
            ctx.font = "bold 30px 'Outfit', sans-serif";
            ctx.fillText("GAME OVER", canvas.width/2, 140);
            
            ctx.fillStyle = "#fff";
            ctx.font = "bold 25px 'Inter', sans-serif";
            ctx.fillText("SCORE: " + score, canvas.width/2, 200);
            
            ctx.fillStyle = "#ff00e4"; // neon pink
            ctx.fillText("BEST: " + bestScore, canvas.width/2, 240);

            ctx.fillStyle = "#ccc";
            ctx.font = "16px 'Outfit', sans-serif";
            ctx.fillText("- Klik untuk Mengulang -", canvas.width/2, 320);
        } else if (currentState === 0) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = "#00f3ff";
            ctx.font = "bold 30px 'Outfit', sans-serif";
            ctx.fillText("PIANO NEON", canvas.width/2, 180);
            
            ctx.fillStyle = "#fff";
            ctx.font = "16px 'Inter', sans-serif";
            ctx.fillText("Sentuh ubin neon yang turun!", canvas.width/2, 230);
            ctx.fillText("Klik untuk Mulai", canvas.width/2, 260);
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
        // Only prevent default if interacting with the game
        const rect = canvas.getBoundingClientRect();
        const isVisible = (rect.top >= 0 && rect.bottom <= window.innerHeight);
        if (isVisible) {
            e.preventDefault(); // Prevents double click from mobile browsers
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            handleTap(x, y);
        }
    });

    // Start game loop
    resetGame();
    loop();
})();
