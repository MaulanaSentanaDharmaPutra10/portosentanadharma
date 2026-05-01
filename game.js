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

    // Parallax Background
    const bg = {
        x: 0,
        draw() {
            // Sky gradient
            let grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grd.addColorStop(0, "#4ec0ca");
            grd.addColorStop(1, "#8ee5e8");
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Clouds
            ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
            let cloudX1 = (this.x * 0.3 + 50) % (canvas.width + 100) - 50;
            let cloudX2 = (this.x * 0.3 + 200) % (canvas.width + 100) - 50;
            
            ctx.beginPath();
            ctx.arc(cloudX1, 100, 30, 0, Math.PI * 2);
            ctx.arc(cloudX1 + 30, 100, 40, 0, Math.PI * 2);
            ctx.arc(cloudX1 + 60, 100, 30, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(cloudX2, 150, 20, 0, Math.PI * 2);
            ctx.arc(cloudX2 + 25, 150, 30, 0, Math.PI * 2);
            ctx.arc(cloudX2 + 50, 150, 20, 0, Math.PI * 2);
            ctx.fill();

            // Cityscape / Hills
            ctx.fillStyle = "#6cb8ad";
            let cityX = this.x * 0.6;
            for(let i=0; i<3; i++) {
                let offset = i * 200;
                ctx.fillRect((cityX + offset) % (canvas.width + 200) - 100, canvas.height - 150, 60, 100);
                ctx.fillRect((cityX + 70 + offset) % (canvas.width + 200) - 100, canvas.height - 180, 50, 130);
                ctx.fillRect((cityX + 130 + offset) % (canvas.width + 200) - 100, canvas.height - 120, 80, 70);
            }
        },
        update() {
            if (currentState === 1) this.x -= 1;
        }
    };

    // Moving Floor
    const floor = {
        x: 0,
        draw() {
            // Dirt base
            ctx.fillStyle = "#ded895";
            ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
            
            // Grass top
            ctx.fillStyle = "#73bf2e";
            ctx.fillRect(0, canvas.height - 50, canvas.width, 10);
            
            // Floor scrolling stripes
            ctx.strokeStyle = "#c4be7a";
            ctx.lineWidth = 3;
            for(let i=0; i<canvas.width + 50; i+=20) {
                ctx.beginPath();
                ctx.moveTo(i + this.x, canvas.height - 40);
                ctx.lineTo(i + this.x - 15, canvas.height);
                ctx.stroke();
            }
            
            // Top border
            ctx.strokeStyle = "#555";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, canvas.height - 50);
            ctx.lineTo(canvas.width, canvas.height - 50);
            ctx.stroke();
        },
        update() {
            if (currentState === 1) {
                this.x -= 2;
                if (this.x <= -20) this.x = 0;
            }
        }
    };

    const bird = {
        x: 50,
        y: 150,
        radius: 12,
        velocity: 0,
        gravity: 0.25,
        jump: 4.6,
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y);
            
            // Rotation based on velocity
            let rotation = 0;
            if (currentState === 1) {
                rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
            }
            ctx.rotate(rotation);

            // Body
            ctx.fillStyle = "#f3c500";
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#543847";
            ctx.lineWidth = 2;
            ctx.stroke();

            // Wing (animates when playing)
            let flapY = (currentState === 1 && frames % 10 < 5) ? -3 : 0;
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.ellipse(-4, 2 + flapY, 6, 4, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // Eye
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(4, -4, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(5, -4, 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Beak
            ctx.fillStyle = "#f16723";
            ctx.beginPath();
            ctx.moveTo(8, 0);
            ctx.lineTo(18, 2);
            ctx.lineTo(8, 6);
            ctx.fill();
            ctx.stroke();

            ctx.restore();
        },
        update() {
            if (currentState === 1) {
                this.velocity += this.gravity;
                this.y += this.velocity;
                
                // Floor collision
                if (this.y + this.radius >= canvas.height - 50) {
                    this.y = canvas.height - 50 - this.radius;
                    if(currentState === 1) playSound('hit');
                    currentState = 2; // Game Over
                }
                // Ceiling collision
                if (this.y - this.radius <= 0) {
                    this.y = this.radius;
                    this.velocity = 0;
                }
            } else if (currentState === 0) {
                // Hover effect before starting
                this.y = 150 + Math.cos(frames / 10) * 5;
            }
        },
        flap() {
            this.velocity = -this.jump;
            playSound('jump');
        }
    };

    const pipes = {
        position: [],
        width: 50,
        gap: 120,
        dx: 2,
        draw() {
            for (let i = 0; i < this.position.length; i++) {
                let p = this.position[i];
                let topY = p.y;
                let bottomY = p.y + this.gap;

                // Pipe gradient
                let pGrd = ctx.createLinearGradient(p.x, 0, p.x + this.width, 0);
                pGrd.addColorStop(0, "#528c1c");
                pGrd.addColorStop(0.5, "#74bf2e");
                pGrd.addColorStop(1, "#528c1c");

                ctx.fillStyle = pGrd;
                ctx.strokeStyle = "#2e5c0a";
                ctx.lineWidth = 2;

                // Top Pipe Body
                ctx.fillRect(p.x + 2, 0, this.width - 4, topY - 20);
                ctx.strokeRect(p.x + 2, 0, this.width - 4, topY - 20);
                
                // Top Pipe Cap
                ctx.fillRect(p.x, topY - 20, this.width, 20);
                ctx.strokeRect(p.x, topY - 20, this.width, 20);

                // Bottom Pipe Cap
                ctx.fillRect(p.x, bottomY, this.width, 20);
                ctx.strokeRect(p.x, bottomY, this.width, 20);

                // Bottom Pipe Body
                ctx.fillRect(p.x + 2, bottomY + 20, this.width - 4, canvas.height - bottomY - 70);
                ctx.strokeRect(p.x + 2, bottomY + 20, this.width - 4, canvas.height - bottomY - 70);
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
            ctx.font = "bold 40px 'Inter', sans-serif";
            ctx.strokeText(score, canvas.width/2, 50);
            ctx.fillText(score, canvas.width/2, 50);
        } else if (currentState === 2) {
            // Glassmorphism Game Over Board
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = "#fff";
            ctx.font = "bold 30px 'Outfit', sans-serif";
            ctx.fillText("GAME OVER", canvas.width/2, 140);
            
            ctx.fillStyle = "#ffcc00";
            ctx.font = "bold 25px 'Inter', sans-serif";
            ctx.fillText("SCORE: " + score, canvas.width/2, 200);
            
            ctx.fillStyle = "#2ecc71";
            ctx.fillText("BEST: " + bestScore, canvas.width/2, 240);

            ctx.fillStyle = "#fff";
            ctx.font = "16px 'Outfit', sans-serif";
            ctx.fillText("- Klik untuk Mengulang -", canvas.width/2, 320);
        } else if (currentState === 0) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = "#fff";
            ctx.font = "bold 30px 'Outfit', sans-serif";
            ctx.fillText("GET READY", canvas.width/2, 180);
            
            ctx.font = "16px 'Inter', sans-serif";
            ctx.fillText("Klik atau Spasi untuk Terbang", canvas.width/2, 230);
        }
    }

    function resetGame() {
        bird.y = 150;
        bird.velocity = 0;
        pipes.reset();
        score = 0;
    }

    function draw() {
        bg.draw();
        pipes.draw();
        floor.draw();
        bird.draw();
        drawScore();
    }

    function update() {
        bg.update();
        floor.update();
        bird.update();
        pipes.update();
    }

    function loop() {
        update();
        draw();
        frames++;
        animationId = requestAnimationFrame(loop);
    }

    // Controls
    canvas.addEventListener("pointerdown", (e) => {
        const rect = canvas.getBoundingClientRect();
        const isVisible = (rect.top >= 0 && rect.bottom <= window.innerHeight);
        if(isVisible) {
            e.preventDefault(); // Prevents double firing on mobile
            switch(currentState) {
                case 0:
                    currentState = 1;
                    bird.flap();
                    break;
                case 1:
                    bird.flap();
                    break;
                case 2:
                    resetGame();
                    currentState = 0;
                    break;
            }
        }
    });

    // Support Spacebar
    window.addEventListener("keydown", (e) => {
        if(e.code === "Space") {
            const rect = canvas.getBoundingClientRect();
            const isVisible = (rect.top >= 0 && rect.bottom <= window.innerHeight);
            if(isVisible) {
                e.preventDefault();
                switch(currentState) {
                    case 0:
                        currentState = 1;
                        bird.flap();
                        break;
                    case 1:
                        bird.flap();
                        break;
                    case 2:
                        resetGame();
                        currentState = 0;
                        break;
                }
            }
        }
    });

    // Start game loop
    loop();
})();
