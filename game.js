(function() {
    const canvas = document.getElementById("gameCanvas");
    
    // Ensure elements exist
    if(!canvas) return;
    
    const ctx = canvas.getContext("2d");

    let frames = 0;
    let score = 0;
    let bestScore = localStorage.getItem("flappyBest") || 0;
    let currentState = 0; // 0: get ready, 1: play, 2: game over
    let animationId;

    // Game Objects
    const bird = {
        x: 50,
        y: 150,
        radius: 12,
        velocity: 0,
        gravity: 0.25,
        jump: 4.6,
        draw() {
            ctx.fillStyle = "#ffcc00";
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = "#000";
            ctx.lineWidth = 2;
            ctx.stroke();
            // Eye
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.arc(this.x + 4, this.y - 4, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(this.x + 5, this.y - 4, 2, 0, Math.PI * 2);
            ctx.fill();
        },
        update() {
            if (currentState === 1) {
                this.velocity += this.gravity;
                this.y += this.velocity;
                
                // Floor collision
                if (this.y + this.radius >= canvas.height - 50) {
                    this.y = canvas.height - 50 - this.radius;
                    currentState = 2; // Game Over
                }
            } else if (currentState === 0) {
                // Hover effect
                this.y = 150 + Math.cos(frames / 10) * 5;
            }
        },
        flap() {
            this.velocity = -this.jump;
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

                // Top Pipe
                ctx.fillStyle = "#2ecc71";
                ctx.fillRect(p.x, 0, this.width, topY);
                ctx.strokeRect(p.x, 0, this.width, topY);

                // Bottom Pipe
                ctx.fillStyle = "#2ecc71";
                ctx.fillRect(p.x, bottomY, this.width, canvas.height - bottomY - 50);
                ctx.strokeRect(p.x, bottomY, this.width, canvas.height - bottomY - 50);
            }
        },
        update() {
            if (currentState !== 1) return;

            // Add new pipe
            if (frames % 100 === 0) {
                this.position.push({
                    x: canvas.width,
                    y: Math.random() * (canvas.height - 50 - this.gap - 40) + 20
                });
            }

            for (let i = 0; i < this.position.length; i++) {
                let p = this.position[i];
                p.x -= this.dx;

                // Collision Detection
                let bottomY = p.y + this.gap;
                if (bird.x + bird.radius > p.x && bird.x - bird.radius < p.x + this.width &&
                    (bird.y - bird.radius < p.y || bird.y + bird.radius > bottomY)) {
                    currentState = 2; // Game Over
                }

                // Update Score
                if (p.x + this.width === bird.x) {
                    score++;
                    bestScore = Math.max(score, bestScore);
                    localStorage.setItem("flappyBest", bestScore);
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

    const bg = {
        draw() {
            ctx.fillStyle = "#ded895";
            ctx.fillRect(0, canvas.height - 50, canvas.width, 50);
            ctx.strokeStyle = "#555";
            ctx.beginPath();
            ctx.moveTo(0, canvas.height - 50);
            ctx.lineTo(canvas.width, canvas.height - 50);
            ctx.stroke();
        }
    };

    function drawScore() {
        ctx.fillStyle = "#fff";
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 2;
        
        if (currentState === 1) {
            ctx.font = "35px 'Outfit', sans-serif";
            ctx.fillText(score, canvas.width/2 - 10, 50);
            ctx.strokeText(score, canvas.width/2 - 10, 50);
        } else if (currentState === 2) {
            ctx.font = "25px 'Outfit', sans-serif";
            ctx.fillText("SCORE: " + score, canvas.width/2 - 60, 150);
            ctx.strokeText("SCORE: " + score, canvas.width/2 - 60, 150);
            
            ctx.fillText("BEST: " + bestScore, canvas.width/2 - 50, 200);
            ctx.strokeText("BEST: " + bestScore, canvas.width/2 - 50, 200);

            ctx.font = "15px 'Outfit', sans-serif";
            ctx.fillText("Click to Restart", canvas.width/2 - 55, 260);
        } else if (currentState === 0) {
            ctx.font = "25px 'Outfit', sans-serif";
            ctx.fillText("Get Ready!", canvas.width/2 - 65, 150);
            ctx.strokeText("Get Ready!", canvas.width/2 - 65, 150);
        }
    }

    function resetGame() {
        bird.y = 150;
        bird.velocity = 0;
        pipes.reset();
        score = 0;
    }

    function draw() {
        ctx.fillStyle = "#70c5ce";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        bg.draw();
        pipes.draw();
        bird.draw();
        drawScore();
    }

    function update() {
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
    canvas.addEventListener("click", () => {
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
    });

    // Support Spacebar
    window.addEventListener("keydown", (e) => {
        if(e.code === "Space") {
            // Prevent default page scroll only if hovering over or interacting with game
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
