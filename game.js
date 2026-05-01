(function() {
    const canvas = document.getElementById("gameCanvas");
    if(!canvas) return;
    const ctx = canvas.getContext("2d");

    let frames = 0;
    let score = 0;
    let bestScore = localStorage.getItem("flappyBest") || 0;
    let currentState = 0; // 0: get ready, 1: play, 2: game over
    let animationId;

    // Web Audio API for Game Sounds
    let audioCtx = null;
    function playSound(type) {
        try {
            if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);

            if (type === 'jump') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(300, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                osc.start(); osc.stop(audioCtx.currentTime + 0.1);
            } else if (type === 'score') {
                osc.type = 'square';
                osc.frequency.setValueAtTime(800, audioCtx.currentTime);
                osc.frequency.setValueAtTime(1200, audioCtx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.2);
                osc.start(); osc.stop(audioCtx.currentTime + 0.2);
            } else if (type === 'hit') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(100, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(10, audioCtx.currentTime + 0.2);
                gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                osc.start(); osc.stop(audioCtx.currentTime + 0.2);
            }
        } catch(e) {}
    }

    let screenShake = 0;

    // Synthwave Background
    const bg = {
        x: 0,
        draw() {
            // Dark Space Gradient
            let grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grd.addColorStop(0, "#050505");
            grd.addColorStop(0.5, "#1a0a2e");
            grd.addColorStop(1, "#2a0a2e");
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Neon Grid Floor
            ctx.strokeStyle = "rgba(0, 243, 255, 0.1)";
            ctx.lineWidth = 1;
            let gridX = this.x % 40;
            for(let i = gridX; i < canvas.width; i += 40) {
                ctx.beginPath();
                ctx.moveTo(i, canvas.height - 50);
                ctx.lineTo(i, canvas.height);
                ctx.stroke();
            }
            for(let i = canvas.height - 50; i < canvas.height; i += 10) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(canvas.width, i);
                ctx.stroke();
            }

            // Neon Mountains (Parallax)
            ctx.fillStyle = "rgba(255, 0, 228, 0.05)";
            let mountX = (this.x * 0.2) % 400;
            for(let i = -1; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(mountX + i * 400, canvas.height - 50);
                ctx.lineTo(mountX + i * 400 + 200, canvas.height - 200);
                ctx.lineTo(mountX + i * 400 + 400, canvas.height - 50);
                ctx.fill();
            }
        },
        update() {
            if (currentState === 1) this.x -= 0.5;
        }
    };

    // Neon Floor
    const floor = {
        x: 0,
        draw() {
            ctx.fillStyle = "#0a0a0a";
            ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
            
            // Neon Line
            ctx.strokeStyle = "#00f3ff";
            ctx.lineWidth = 3;
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#00f3ff";
            ctx.beginPath();
            ctx.moveTo(0, canvas.height - 50);
            ctx.lineTo(canvas.width, canvas.height - 50);
            ctx.stroke();
            ctx.shadowBlur = 0;
        },
        update() {
            if (currentState === 1) {
                this.x -= 2;
                if (this.x <= -40) this.x = 0;
            }
        }
    };

    const bird = {
        x: 60,
        y: 150,
        radius: 12,
        velocity: 0,
        gravity: 0.25,
        jump: 4.8,
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            let rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
            ctx.rotate(rotation);

            // Neon Glow
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#f3c500";

            // Body (Retro Yellow)
            ctx.fillStyle = "#f3c500";
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.shadowBlur = 0;
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Wing
            let flapY = (currentState === 1 && frames % 10 < 5) ? -3 : 0;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.ellipse(-4, 2 + flapY, 6, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Eye
            ctx.fillStyle = "#fff";
            ctx.beginPath(); ctx.arc(4, -4, 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#000";
            ctx.beginPath(); ctx.arc(5, -4, 1.5, 0, Math.PI * 2); ctx.fill();

            // Beak
            ctx.fillStyle = "#f16723";
            ctx.beginPath();
            ctx.moveTo(8, 0); ctx.lineTo(18, 2); ctx.lineTo(8, 6);
            ctx.fill(); ctx.stroke();

            ctx.restore();
        },
        update() {
            if (currentState === 1) {
                this.velocity += this.gravity;
                this.y += this.velocity;
                
                if (this.y + this.radius >= canvas.height - 50) {
                    this.y = canvas.height - 50 - this.radius;
                    if(currentState === 1) {
                        playSound('hit');
                        screenShake = 10;
                    }
                    currentState = 2;
                }
                if (this.y - this.radius <= 0) {
                    this.y = this.radius;
                    this.velocity = 0;
                }
            } else if (currentState === 0) {
                this.y = 150 + Math.cos(frames / 10) * 8;
            }
        },
        flap() {
            this.velocity = -this.jump;
            playSound('jump');
        }
    };

    const pipes = {
        position: [],
        width: 55,
        gap: 130,
        dx: 2.5,
        draw() {
            for (let i = 0; i < this.position.length; i++) {
                let p = this.position[i];
                
                // Neon Pipe Gradient
                let pGrd = ctx.createLinearGradient(p.x, 0, p.x + this.width, 0);
                pGrd.addColorStop(0, "#ff00e4");
                pGrd.addColorStop(0.5, "#ff70f3");
                pGrd.addColorStop(1, "#ff00e4");

                ctx.fillStyle = pGrd;
                ctx.shadowBlur = 10;
                ctx.shadowColor = "#ff00e4";

                // Top Pipe
                ctx.fillRect(p.x, 0, this.width, p.y);
                ctx.strokeStyle = "#fff";
                ctx.lineWidth = 1;
                ctx.strokeRect(p.x, 0, this.width, p.y);
                
                // Bottom Pipe
                let bottomHeight = canvas.height - (p.y + this.gap) - 50;
                ctx.fillRect(p.x, p.y + this.gap, this.width, bottomHeight);
                ctx.strokeRect(p.x, p.y + this.gap, this.width, bottomHeight);
                
                ctx.shadowBlur = 0;
            }
        },
        update() {
            if (currentState !== 1) return;

            // Add new pipe
            if (frames % 100 === 0) {
                this.position.push({
                    x: canvas.width,
                    y: Math.random() * (canvas.height - 50 - this.gap - 60) + 30
                });
            }

            for (let i = 0; i < this.position.length; i++) {
                let p = this.position[i];
                p.x -= this.dx;

                // Collision Detection
                let bottomY = p.y + this.gap;
                if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + this.width &&
                    (bird.y - bird.radius < p.y || bird.y + bird.radius > bottomY)) {
                    playSound('hit');
                    currentState = 2; // Game Over
                }

                // Update Score
                if (p.x + this.width === bird.x) {
                    score++;
                    bestScore = Math.max(score, bestScore);
                    localStorage.setItem("flappyBest", bestScore);
                    playSound('score');
                }

                // Remove off-screen pipes
                if (p.x + this.width < 0) {
                    this.position.shift();
                    i--;
                }
            }
        },
        reset() {
            this.position = [];
        }
    };

    function drawScore() {
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 4;
        ctx.textAlign = "center";
        
        if (currentState === 1) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = "#00f3ff";
            ctx.font = "900 45px 'Outfit', sans-serif";
            ctx.fillText(score, canvas.width/2, 60);
            ctx.shadowBlur = 0;
        } else if (currentState === 2) {
            ctx.fillStyle = "rgba(0,0,0,0.85)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#ff00e4";
            ctx.fillStyle = "#ff00e4";
            ctx.font = "900 35px 'Outfit', sans-serif";
            ctx.fillText("GAME OVER", canvas.width/2, 120);
            
            ctx.shadowBlur = 15;
            ctx.shadowColor = "#00f3ff";
            ctx.fillStyle = "#fff";
            ctx.font = "bold 55px 'Outfit', sans-serif";
            ctx.fillText(score, canvas.width/2, 190);
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#aaa";
            ctx.font = "600 16px 'Inter', sans-serif";
            ctx.fillText("BEST: " + bestScore, canvas.width/2, 240);
            
            ctx.fillStyle = "#fff";
            ctx.font = "500 14px 'Inter', sans-serif";
            ctx.fillText("- Sentuh untuk Restart -", canvas.width/2, 320);
        } else if (currentState === 0) {
            ctx.fillStyle = "rgba(0,0,0,0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.shadowBlur = 20;
            ctx.shadowColor = "#00f3ff";
            ctx.fillStyle = "#00f3ff";
            ctx.font = "900 35px 'Outfit', sans-serif";
            ctx.fillText("FLAPPY MS", canvas.width/2, 160);
            
            ctx.shadowBlur = 0;
            ctx.fillStyle = "#fff";
            ctx.font = "400 14px 'Inter', sans-serif";
            ctx.fillText("Sentuh untuk Terbang", canvas.width/2, 210);
            
            ctx.fillStyle = "rgba(255,255,255,0.6)";
            ctx.font = "italic 12px 'Inter', sans-serif";
            ctx.fillText("- Klik untuk Mulai -", canvas.width/2, 270);
        }
    }

    function update() {
        bg.update();
        floor.update();
        bird.update();
        pipes.update();
        
        if (screenShake > 0) {
            screenShake *= 0.9;
            if (screenShake < 0.5) screenShake = 0;
        }
    }

    function draw() {
        ctx.save();
        if (screenShake > 0) {
            let dx = (Math.random() - 0.5) * screenShake;
            let dy = (Math.random() - 0.5) * screenShake;
            ctx.translate(dx, dy);
        }
        
        bg.draw();
        pipes.draw();
        floor.draw();
        bird.draw();
        drawScore();
        
        ctx.restore();
    }

    function loop() {
        update();
        draw();
        frames++;
        animationId = requestAnimationFrame(loop);
    }

    function resetGame() {
        score = 0;
        frames = 0;
        bird.y = 150;
        bird.velocity = 0;
        pipes.reset();
        screenShake = 0;
    }

    // Controls
    canvas.addEventListener("pointerdown", (e) => {
        if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
        
        const rect = canvas.getBoundingClientRect();
        const isVisible = (rect.top < window.innerHeight && rect.bottom > 0);
        
        if(isVisible) {
            e.preventDefault(); 
            // Scaling logic (not strictly needed for flappy but good for consistency)
            switch(currentState) {
                case 0:
                    resetGame();
                    currentState = 1;
                    bird.flap();
                    break;
                case 1:
                    bird.flap();
                    break;
                case 2:
                    currentState = 0;
                    break;
            }
        }
    });

    // Support Spacebar
    window.addEventListener("keydown", (e) => {
        if(e.code === "Space") {
            const rect = canvas.getBoundingClientRect();
            const isVisible = (rect.top < window.innerHeight && rect.bottom > 0);
            if(isVisible) {
                e.preventDefault();
                switch(currentState) {
                    case 0:
                        resetGame();
                        currentState = 1;
                        bird.flap();
                        break;
                    case 1:
                        bird.flap();
                        break;
                    case 2:
                        currentState = 0;
                        break;
                }
            }
        }
    });

    // Start game loop
    loop();
})();
