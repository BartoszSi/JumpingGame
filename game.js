class Game {
    constructor() {
        this.player = document.getElementById('player');
        this.gameArea = document.getElementById('gameArea');
        this.leftBtn = document.getElementById('leftBtn');
        this.rightBtn = document.getElementById('rightBtn');
        
        // Physics parameters
        this.acceleration = 0.2;
        this.deceleration = 0.98;
        this.maxSpeed = 8;
        this.velocity = 0;
        
        // Jump parameters
        this.verticalVelocity = 0;
        this.gravity = 0.5;
        this.jumpForce = -15;
        this.isJumping = false;
        
        // Ground and position
        this.groundLevel = 160;
        this.currentHeight = this.groundLevel;
        this.playerWidth = 50;
        this.playerPos = 375 / 2;
        
        // Platform spacing
        this.platformStepHeight = 120;
        
        // Generate 50 platforms
        this.platforms = this.generatePlatforms(50);
        
        // Control states
        this.isMovingLeft = false;
        this.isMovingRight = false;
        this.leftPressed = false;
        this.rightPressed = false;
        
        // Double tap detection
        this.lastLeftTap = 0;
        this.lastRightTap = 0;
        this.lastLeftRelease = 0;
        this.lastRightRelease = 0;
        this.doubleTapThreshold = 300;
        this.quickTapThreshold = 200;
        
        // Add downward movement parameters
        this.downwardSpeed = 0.4;        // Starting speed
        this.speedIncrease = 0.01;        // How much to increase per second
        this.lastSpeedIncrease = 0;      // Track time for speed increases
        
        this.createPlatforms();
        this.setupControls();
        this.gameLoop();

        // Timer setup
        this.gameTime = 0;
        this.startTimer();

        this.isGameOver = false;
        this.deathY = -50;  // Point at which player is considered fallen
    }

    generatePlatforms(count) {
        let platforms = [];
        
        // First few platforms are carefully placed
        platforms.push({
            x: 250,
            y: this.groundLevel + this.platformStepHeight,
            width: 150,
            height: 30,
            id: 'platform_0'  // Add unique ID
        });

        platforms.push({
            x: 50,
            y: this.groundLevel + (this.platformStepHeight * 2),
            width: 150,
            height: 30,
            id: 'platform_1'
        });

        // Generate remaining random platforms
        for (let i = 2; i < count; i++) {
            const width = Math.floor(Math.random() * 81) + 100;
            const maxX = 375 - width;
            const x = Math.floor(Math.random() * maxX);
            
            platforms.push({
                x: x,
                y: this.groundLevel + (this.platformStepHeight * (i + 1)),
                width: width,
                height: 30,
                id: `platform_${i}`  // Unique ID for each platform
            });
        }

        return platforms;
    }

    createPlatforms() {
        // Remove all existing platforms
        const oldPlatforms = document.querySelectorAll('.platform');
        oldPlatforms.forEach(p => p.remove());

        // High contrast colors that stand out against any background
        const colors = [
            { bg: '#FF0000', border: '#000000' },  // Red with black border
            { bg: '#00FF00', border: '#000000' },  // Green with black border
            { bg: '#0000FF', border: '#000000' },  // Blue with black border
            { bg: '#FF00FF', border: '#000000' },  // Magenta with black border
            { bg: '#FFFF00', border: '#000000' }   // Yellow with black border
        ];

        const fragment = document.createDocumentFragment();
        
        this.platforms.forEach((platform, index) => {
            const div = document.createElement('div');
            div.className = 'platform';
            div.id = `platform_${index}`;

            // Get color
            const color = colors[index % colors.length];

            // Set all styles with high contrast and clear borders
            div.style.cssText = `
                position: absolute;
                left: ${Math.round(platform.x)}px;
                bottom: ${Math.round(platform.y)}px;
                width: ${Math.round(platform.width)}px;
                height: ${Math.round(platform.height)}px;
                background-color: ${color.bg};
                border: 2px solid ${color.border};
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
                z-index: 1;
                display: block;
                visibility: visible;
                opacity: 1;
            `;

            fragment.appendChild(div);
            
            // Log each platform creation
            console.log(`Platform ${index} created at x:${platform.x}, y:${platform.y}`);
        });

        this.gameArea.appendChild(fragment);

        // Verify platforms
        const finalCount = document.querySelectorAll('.platform').length;
        console.log(`Total platforms in DOM: ${finalCount}`);
    }

    isValidPlatform(platform) {
        return (
            platform !== null &&
            typeof platform === 'object' &&
            typeof platform.x === 'number' &&
            typeof platform.y === 'number' &&
            typeof platform.width === 'number' &&
            typeof platform.height === 'number' &&
            !isNaN(platform.x) &&
            !isNaN(platform.y) &&
            !isNaN(platform.width) &&
            !isNaN(platform.height) &&
            platform.width > 0 &&
            platform.height > 0
        );
    }

    checkCollisions() {
        const playerBottom = this.currentHeight;
        const playerLeft = this.playerPos;
        const playerRight = this.playerPos + this.playerWidth;

        // Check platform collisions first
        for (let platform of this.platforms) {
            const platformTop = platform.y + platform.height;
            const platformRight = platform.x + platform.width;

            if (playerRight > platform.x && 
                playerLeft < platformRight && 
                playerBottom >= platformTop - 10 && 
                playerBottom <= platformTop + 10 && 
                this.verticalVelocity >= 0) {
                
                this.currentHeight = platformTop;
                this.verticalVelocity = 0;
                this.isJumping = false;
                return true;
            }
        }

        // Check ground collision
        if (this.currentHeight <= this.groundLevel) {
            this.currentHeight = this.groundLevel;
            this.verticalVelocity = 0;
            this.isJumping = false;
            return true;
        }

        return false;
    }

    setupControls() {
        // Touch controls with improved tap detection
        this.leftBtn.addEventListener('touchstart', () => {
            const now = Date.now();
            
            // Check for double tap
            if (now - this.lastLeftTap < this.doubleTapThreshold) {
                this.jump();
            }
            // Check for quick release-tap
            else if (now - this.lastLeftRelease < this.quickTapThreshold) {
                this.jump();
            }
            
            this.lastLeftTap = now;
            this.isMovingLeft = true;
        });

        this.rightBtn.addEventListener('touchstart', () => {
            const now = Date.now();
            
            // Check for double tap
            if (now - this.lastRightTap < this.doubleTapThreshold) {
                this.jump();
            }
            // Check for quick release-tap
            else if (now - this.lastRightRelease < this.quickTapThreshold) {
                this.jump();
            }
            
            this.lastRightTap = now;
            this.isMovingRight = true;
        });

        this.leftBtn.addEventListener('touchend', () => {
            this.isMovingLeft = false;
            this.lastLeftRelease = Date.now();
        });

        this.rightBtn.addEventListener('touchend', () => {
            this.isMovingRight = false;
            this.lastRightRelease = Date.now();
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            const now = Date.now();
            
            if (e.key === 'ArrowLeft' && !this.leftPressed) {
                if (now - this.lastLeftTap < this.doubleTapThreshold ||
                    now - this.lastLeftRelease < this.quickTapThreshold) {
                    this.jump();
                }
                this.lastLeftTap = now;
                this.leftPressed = true;
                this.isMovingLeft = true;
            }
            
            if (e.key === 'ArrowRight' && !this.rightPressed) {
                if (now - this.lastRightTap < this.doubleTapThreshold ||
                    now - this.lastRightRelease < this.quickTapThreshold) {
                    this.jump();
                }
                this.lastRightTap = now;
                this.rightPressed = true;
                this.isMovingRight = true;
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowLeft') {
                this.leftPressed = false;
                this.isMovingLeft = false;
                this.lastLeftRelease = Date.now();
            }
            if (e.key === 'ArrowRight') {
                this.rightPressed = false;
                this.isMovingRight = false;
                this.lastRightRelease = Date.now();
            }
        });

        document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
    }

    jump() {
        if (!this.isJumping) {
            this.verticalVelocity = this.jumpForce;
            this.isJumping = true;
        }
    }

    updateJump() {
        // Apply gravity
        this.verticalVelocity += this.gravity;
        this.currentHeight -= this.verticalVelocity;

        // Check collisions
        this.checkCollisions();

        // Update vertical position
        this.player.style.bottom = `${this.currentHeight}px`;
    }

    movePlayer() {
        if (this.isGameOver) return;  // Stop movement if game is over
        
        // Horizontal movement
        if (this.isMovingLeft) {
            this.velocity -= this.acceleration;
        }
        if (this.isMovingRight) {
            this.velocity += this.acceleration;
        }
        
        this.velocity = Math.max(Math.min(this.velocity, this.maxSpeed), -this.maxSpeed);
        this.velocity *= this.deceleration;
        this.playerPos += this.velocity;
        
        // Wall collisions with higher momentum retention
        if (this.playerPos < 0) {
            this.playerPos = 0;
            this.velocity = -this.velocity * 0.8;
        }
        if (this.playerPos > 375 - this.playerWidth) {
            this.playerPos = 375 - this.playerWidth;
            this.velocity = -this.velocity * 0.8;
        }
        
        // Update position and rotation
        this.player.style.left = this.playerPos + 'px';
        const tilt = Math.min(Math.max(this.velocity * 2, -20), 20);
        this.player.style.transform = `rotate(${tilt}deg)`;

        // Update jump
        this.updateJump();
    }

    moveEnvironment() {
        // Increase speed every second
        if (this.gameTime > this.lastSpeedIncrease) {
            this.downwardSpeed += this.speedIncrease;
            this.lastSpeedIncrease = this.gameTime;
        }

        // Move ground level down
        this.groundLevel -= this.downwardSpeed;
        
        // Update floor visual position
        document.getElementById('floor').style.bottom = 
            (this.groundLevel - 160) + 'px';

        // Move all platforms down
        this.platforms.forEach(platform => {
            platform.y -= this.downwardSpeed;
            
            // Update platform visual position
            const platformElement = document.querySelector(
                `.platform[style*="left: ${platform.x}px"]`
            );
            if (platformElement) {
                platformElement.style.bottom = platform.y + 'px';
            }
        });

        // Move player down with environment
        this.currentHeight -= this.downwardSpeed;
    }

    gameOver() {
        this.isGameOver = true;
        clearInterval(this.timerInterval);
        alert('Game Over!');
        location.reload();
    }

    startTimer() {
        // Update every second
        this.timerInterval = setInterval(() => {
            this.gameTime++;
            document.getElementById('timer').textContent = 
                `Time: ${this.gameTime}`;
        }, 1000);
    }

    gameLoop() {
        this.movePlayer();
        this.moveEnvironment();
        this.checkGameOver();  // Add game over check
        
        if (!this.isGameOver) {
            requestAnimationFrame(() => this.gameLoop());
        }
    }

    // Add cleanup method for when game ends
    cleanup() {
        clearInterval(this.timerInterval);
    }

    checkGameOver() {
        if (this.currentHeight < this.deathY && !this.isGameOver) {
            this.isGameOver = true;
            this.showGameOver();
            this.cleanup();
        }
    }

    showGameOver() {
        // Create game over screen
        const gameOverScreen = document.createElement('div');
        gameOverScreen.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 48px;
            font-family: Arial, sans-serif;
            font-weight: bold;
            text-align: center;
            z-index: 1000;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
        `;
        gameOverScreen.innerHTML = `
            GAME OVER<br>
            Time: ${this.gameTime} seconds<br>
            <button style="
                font-size: 24px;
                margin-top: 20px;
                padding: 10px 20px;
                background-color: #4CAF50;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
            ">
                Press Here to restart
            </button>
        `;
        this.gameArea.appendChild(gameOverScreen);

        // Add click listener to the button
        gameOverScreen.querySelector('button').addEventListener('click', () => {
            location.reload();
        });
    }
}

window.onload = () => {
    new Game();
};