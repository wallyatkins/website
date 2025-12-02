document.addEventListener('DOMContentLoaded', () => {
    // Smooth scroll for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Mobile Menu Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            mobileBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : 'auto';
        });

        // Close menu when clicking a link
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                mobileBtn.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = 'auto';
            });
        });
    }

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Add fade-in class to elements we want to animate
    // Removed hero elements to ensure they are always visible on load
    const animatedElements = document.querySelectorAll('.about-text, .project-item, .contact-link');

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(el);
    });

    // Set Time Trap Timestamp
    const timestampField = document.getElementById('form_timestamp');
    if (timestampField) {
        timestampField.value = Math.floor(Date.now() / 1000);
    }

    // Contact Form Handling
    const contactForm = document.getElementById('contact-form');
    const formStatus = document.getElementById('form-status');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('.submit-btn');
            const originalText = btn.textContent;

            btn.disabled = true;
            btn.textContent = 'Sending...';
            formStatus.textContent = '';
            formStatus.className = 'form-status';

            const formData = new FormData(contactForm);

            try {
                const response = await fetch('send_mail.php', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    // Animation Sequence
                    contactForm.classList.add('hidden'); // Hide form
                    const envelopeContainer = document.getElementById('envelope-container');
                    const envelope = envelopeContainer.querySelector('.envelope');
                    const waxSeal = envelopeContainer.querySelector('.wax-seal');

                    envelopeContainer.classList.remove('hidden');
                    envelopeContainer.classList.add('active');

                    // 1. Close Flap
                    setTimeout(() => {
                        envelope.classList.add('closed');

                        // 2. Stamp Seal
                        setTimeout(() => {
                            waxSeal.classList.add('animate-seal');

                            // 3. Slide Out
                            setTimeout(() => {
                                envelopeContainer.classList.add('animate-slide-out');

                                // 4. Reset & Show Success Message
                                setTimeout(() => {
                                    envelopeContainer.classList.remove('active', 'animate-slide-out', 'hidden'); // Reset container
                                    envelopeContainer.classList.add('hidden'); // Hide again
                                    envelope.classList.remove('closed'); // Reset flap
                                    waxSeal.classList.remove('animate-seal'); // Reset seal

                                    contactForm.classList.remove('hidden'); // Show form again
                                    contactForm.reset();
                                    formStatus.textContent = "Message Sent! ✉️";
                                    formStatus.className = 'form-status success';
                                }, 1000); // Wait for slide out
                            }, 1000); // Wait for seal
                        }, 600); // Wait for flap
                    }, 100); // Small delay start

                } else {
                    throw new Error(result.message || 'Something went wrong');
                }
            } catch (error) {
                formStatus.textContent = error.message;
                formStatus.classList.add('error');
            } finally {
                btn.disabled = false;
                btn.textContent = originalText;
            }
        });
    }

    // Helper: Update Profile Image based on State
    const updateProfileImage = () => {
        const isArt = document.body.classList.contains('art-mode');
        const isLight = document.body.classList.contains('light-mode');
        const img = document.querySelector('.hero-image');

        if (!img) return;

        if (isArt) {
            img.src = isLight ? 'profile-white-art.jpg' : 'profile-black-art.jpg';
        } else {
            img.src = isLight ? 'profile-white.jpg' : 'profile-black.jpg';
        }
    };

    // 1. Theme Toggle (Hero Image Double Click)
    const themeToggle = document.querySelector('.hero-image');
    if (themeToggle) {
        themeToggle.addEventListener('dblclick', () => {
            document.body.classList.toggle('light-mode');
            updateProfileImage();
        });
    }




    // 2. Logic & Art Easter Egg (Whimsical Double Click)
    const themeTrigger = document.getElementById('theme-trigger');

    if (themeTrigger) {
        themeTrigger.addEventListener('dblclick', (e) => {
            // 1. Flip Text
            themeTrigger.classList.add('flip-horizontal');

            // 2. Burn Reveal Effect
            const burnOverlay = document.createElement('div');
            burnOverlay.className = 'burn-overlay';
            burnOverlay.style.setProperty('--click-x', e.clientX + 'px');
            burnOverlay.style.setProperty('--click-y', e.clientY + 'px');
            document.body.appendChild(burnOverlay);

            // 3. Toggle Mode after short delay (sync with burn)
            setTimeout(() => {
                const isArtMode = document.body.classList.toggle('art-mode');

                // Toggle Whimsical Layer
                const whimsicalLayer = document.getElementById('whimsical-layer');
                if (whimsicalLayer) {
                    isArtMode ? whimsicalLayer.classList.remove('hidden') : whimsicalLayer.classList.add('hidden');
                }

                // Update Profile Image
                updateProfileImage();

                // Swap Text
                themeTrigger.textContent = isArtMode ? "Art & Logic" : "Logic & Art";
                themeTrigger.classList.remove('flip-horizontal'); // Reset flip

                // Remove Burn Overlay
                setTimeout(() => burnOverlay.remove(), 1000);

            }, 750); // Halfway through burn animation
        });
    }


    // Custom animation class logic
    document.addEventListener('scroll', () => {
        animatedElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            if (rect.top < window.innerHeight - 50) {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }
        });
    });

    // --- EASTER EGG LOGIC ---
    const ctaSection = document.querySelector('.cta-section');
    const ctaContent = document.querySelector('.cta-content');
    const dpadContainer = document.getElementById('dpad-container');
    const gameContainer = document.getElementById('game-container');

    let pressTimer;
    let isUnlocked = false;

    // 1. Long Press Trigger
    if (ctaSection) {
        ctaSection.addEventListener('mousedown', startPress);
        ctaSection.addEventListener('touchstart', startPress);
        ctaSection.addEventListener('mouseup', cancelPress);
        ctaSection.addEventListener('mouseleave', cancelPress);
        ctaSection.addEventListener('touchend', cancelPress);
    }

    function startPress(e) {
        if (isUnlocked || e.target.closest('.dpad') || e.target.closest('#game-container')) return;
        pressTimer = setTimeout(() => {
            activateDpad();
        }, 5000); // 5 seconds
    }

    function cancelPress() {
        clearTimeout(pressTimer);
    }

    function activateDpad() {
        if (isUnlocked) return;
        ctaContent.classList.add('hidden');
        dpadContainer.classList.remove('hidden');

        // D-Pad Close Logic
        const dpadCloseBtn = document.getElementById('dpad-close-btn');
        if (dpadCloseBtn) {
            dpadCloseBtn.onclick = () => {
                dpadContainer.classList.add('hidden');
                ctaContent.classList.remove('hidden');
            };
        }
        // Vibrate if mobile
        if (navigator.vibrate) navigator.vibrate(200);
    }

    // 2. Konami Code
    const konamiCode = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
    let konamiIndex = 0;

    function checkKonami(key) {
        // Map D-pad clicks to keys if needed, or just use key strings
        if (key === konamiCode[konamiIndex]) {
            konamiIndex++;
            if (konamiIndex === konamiCode.length) {
                unlockGame();
                konamiIndex = 0;
            }
        } else {
            konamiIndex = 0;
        }
    }

    // D-Pad Interaction
    document.querySelectorAll('.dpad div').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent re-triggering long press
            const dir = e.target.className.replace('dpad-', '');
            const keyMap = {
                'up': 'ArrowUp',
                'down': 'ArrowDown',
                'left': 'ArrowLeft',
                'right': 'ArrowRight'
            };
            if (keyMap[dir]) {
                checkKonami(keyMap[dir]);
                // Haptic feedback
                if (navigator.vibrate) navigator.vibrate(50);
            }
        });
    });

    function unlockGame() {
        isUnlocked = true;
        dpadContainer.classList.add('hidden');
        initGame();
        document.getElementById('game-container').classList.remove('hidden');
    }

    // 3. Block Blast Game Logic (Advanced)
    const gridSize = 8;
    let grid = [];
    let score = 0;

    // Colors
    const colors = ['#FF5252', '#448AFF', '#69F0AE', '#FFD740', '#E040FB', '#FF6E40'];
    let currentColor = colors[0];

    function initGame() {
        const gridEl = document.getElementById('game-grid');
        gridEl.innerHTML = '';
        grid = Array(gridSize).fill().map(() => Array(gridSize).fill(null)); // null = empty, color string = filled
        score = 0;
        updateScore();

        // Hide Game Over UI if present
        const existingMsg = document.getElementById('game-over-msg');
        if (existingMsg) existingMsg.remove();
        document.getElementById('restart-btn').style.display = 'none';

        // Create grid cells
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.r = r;
                cell.dataset.c = c;
                gridEl.appendChild(cell);
            }
        }

        spawnBlocks();

        // Setup Restart
        const restartBtn = document.getElementById('restart-btn');
        restartBtn.replaceWith(restartBtn.cloneNode(true)); // Clear listeners
        document.getElementById('restart-btn').addEventListener('click', initGame);

        // Setup Close
        const closeBtn = document.getElementById('game-close-btn');
        closeBtn.onclick = () => {
            document.getElementById('game-container').classList.add('hidden');
            // Restore CTA content
            const ctaContent = document.querySelector('.cta-content');
            if (ctaContent) ctaContent.classList.remove('hidden');
            isUnlocked = false; // Allow re-triggering
        };
    }

    function spawnBlocks() {
        const optionsEl = document.getElementById('block-options');
        optionsEl.innerHTML = '';

        const shapes = [
            [[1]], // Dot
            [[1, 1]], // 2-Line
            [[1, 1, 1]], // 3-Line
            [[1], [1]], // 2-Col
            [[1], [1], [1]], // 3-Col
            [[1, 1], [1, 1]], // Square
            [[1, 1, 1], [0, 1, 0]], // T-shape
            [[1, 1, 0], [0, 1, 1]], // Z-shape
            [[1, 0], [1, 0], [1, 1]] // L-shape
        ];

        for (let i = 0; i < 3; i++) {
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            const color = colors[Math.floor(Math.random() * colors.length)];
            createOptionBlock(shape, color, optionsEl);
        }

        checkGameOver();
    }

    function createOptionBlock(shape, color, container) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('option-block');
        wrapper.style.gridTemplateColumns = `repeat(${shape[0].length}, 1fr)`;
        wrapper.dataset.shape = JSON.stringify(shape);
        wrapper.dataset.color = color;

        shape.forEach(row => {
            row.forEach(cell => {
                const div = document.createElement('div');
                if (cell) {
                    div.classList.add('block-cell');
                    div.style.backgroundColor = color;
                }
                wrapper.appendChild(div);
            });
        });

        // Drag Logic
        setupDrag(wrapper, shape, color);
        container.appendChild(wrapper);
    }

    function setupDrag(element, shape, color) {
        let isDragging = false;
        let startX, startY;
        let ghostCells = [];

        const startDrag = (e) => {
            isDragging = true;
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const rect = element.getBoundingClientRect();
            startX = clientX - rect.left;
            startY = clientY - rect.top;

            element.classList.add('dragging');
            element.style.width = `${rect.width}px`; // Fix width during drag

            moveDrag(e);
            document.addEventListener('mousemove', moveDrag);
            document.addEventListener('touchmove', moveDrag, { passive: false });
            document.addEventListener('mouseup', endDrag);
            document.addEventListener('touchend', endDrag);
        };

        const moveDrag = (e) => {
            if (!isDragging) return;
            e.preventDefault(); // Stop scroll
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            // Offset by 80px upwards so finger doesn't cover block
            const offsetY = 80;

            element.style.left = `${clientX - startX}px`;
            element.style.top = `${clientY - startY - offsetY}px`;

            // Ghost Preview
            // We need to check the point UNDER the finger/cursor, not the offset block
            // But visually the user is placing the block where it IS.
            // So we should check the point under the BLOCK's new position (top-left or center)
            // Let's check the center of the dragged block
            const blockCenterX = clientX - startX + (element.offsetWidth / 2);
            const blockCenterY = clientY - startY - offsetY + (element.offsetHeight / 2);

            updateGhost(blockCenterX, blockCenterY, shape);
        };

        const endDrag = (e) => {
            if (!isDragging) return;
            isDragging = false;
            element.classList.remove('dragging');
            element.style.left = '';
            element.style.top = '';
            element.style.width = '';

            document.removeEventListener('mousemove', moveDrag);
            document.removeEventListener('touchmove', moveDrag);
            document.removeEventListener('mouseup', endDrag);
            document.removeEventListener('touchend', endDrag);

            // Try to place
            if (validGhostPlacement) {
                placeBlock(validGhostPlacement.r, validGhostPlacement.c, shape, color);

                // Static Layout: Hide instead of remove
                element.style.visibility = 'hidden';
                element.style.pointerEvents = 'none';
                element.classList.add('used');

                // Check if all used
                const allOptions = document.querySelectorAll('.option-block');
                const allUsed = Array.from(allOptions).every(opt => opt.classList.contains('used'));

                if (allUsed) {
                    spawnBlocks();
                } else {
                    checkGameOver();
                }
            }

            clearGhost();
        };

        element.addEventListener('mousedown', startDrag);
        element.addEventListener('touchstart', startDrag);
    }

    let validGhostPlacement = null;

    function updateGhost(x, y, shape) {
        clearGhost();
        validGhostPlacement = null;

        // Hide dragging element momentarily to find what's underneath?
        // No, we passed x/y coordinates.
        // Use elementFromPoint

        // We need to be careful. elementFromPoint might hit the dragging element if we didn't offset enough or if pointerEvents isn't none.
        // .dragging has pointer-events: none in CSS, so we are good.

        const target = document.elementFromPoint(x, y);
        const cell = target ? target.closest('.grid-cell') : null;

        if (cell) {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);

            // Center alignment
            const rOffset = Math.floor(shape.length / 2);
            const cOffset = Math.floor(shape[0].length / 2);

            const startR = r - rOffset;
            const startC = c - cOffset;

            if (canPlace(shape, startR, startC)) {
                validGhostPlacement = { r: startR, c: startC };
                drawGhost(shape, startR, startC);
            }
        }
    }

    function drawGhost(shape, startR, startC) {
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[0].length; j++) {
                if (shape[i][j]) {
                    const cell = document.querySelector(`.grid-cell[data-r="${startR + i}"][data-c="${startC + j}"]`);
                    if (cell) cell.classList.add('ghost');
                }
            }
        }
    }

    function clearGhost() {
        document.querySelectorAll('.ghost').forEach(el => el.classList.remove('ghost'));
    }

    function canPlace(shape, r, c) {
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[0].length; j++) {
                if (shape[i][j]) {
                    if (r + i < 0 || r + i >= gridSize || c + j < 0 || c + j >= gridSize || grid[r + i][c + j]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function placeBlock(r, c, shape, color) {
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[0].length; j++) {
                if (shape[i][j]) {
                    grid[r + i][c + j] = color;
                    const cell = document.querySelector(`.grid-cell[data-r="${r + i}"][data-c="${c + j}"]`);
                    cell.style.backgroundColor = color;
                    cell.classList.add('filled');
                }
            }
        }
        score += 10;
        updateScore();
        checkLines();
    }

    function checkLines() {
        let linesCleared = 0;
        let rowsToClear = [];
        let colsToClear = [];

        // Identify
        for (let r = 0; r < gridSize; r++) {
            if (grid[r].every(cell => cell !== null)) rowsToClear.push(r);
        }
        for (let c = 0; c < gridSize; c++) {
            if (grid.every(row => row[c] !== null)) colsToClear.push(c);
        }

        // Animate & Clear
        const allCellsToClear = new Set();

        rowsToClear.forEach(r => {
            for (let c = 0; c < gridSize; c++) allCellsToClear.add(`${r},${c}`);
            grid[r].fill(null);
        });

        colsToClear.forEach(c => {
            for (let r = 0; r < gridSize; r++) allCellsToClear.add(`${r},${c}`);
            for (let r = 0; r < gridSize; r++) grid[r][c] = null;
        });

        if (allCellsToClear.size > 0) {
            linesCleared = rowsToClear.length + colsToClear.length;
            score += linesCleared * 100;
            updateScore();

            allCellsToClear.forEach(key => {
                const [r, c] = key.split(',');
                const cell = document.querySelector(`.grid-cell[data-r="${r}"][data-c="${c}"]`);
                cell.classList.add('clearing');
                setTimeout(() => {
                    cell.classList.remove('filled', 'clearing');
                    cell.style.backgroundColor = '';
                }, 300);
            });
        }
    }

    function checkGameOver() {
        const options = document.querySelectorAll('.option-block:not(.used)');
        if (options.length === 0) return; // Should allow spawn first

        let canMove = false;
        options.forEach(opt => {
            const shape = JSON.parse(opt.dataset.shape);
            for (let r = 0; r < gridSize; r++) {
                for (let c = 0; c < gridSize; c++) {
                    if (canPlace(shape, r, c)) {
                        canMove = true;
                        break;
                    }
                }
                if (canMove) break;
            }
        });

        if (!canMove) {
            showGameOver();
        }
    }

    function showGameOver() {
        const container = document.getElementById('game-container');
        let msg = document.getElementById('game-over-msg');
        if (!msg) {
            msg = document.createElement('div');
            msg.id = 'game-over-msg';
            msg.innerHTML = `<h2>Game Over</h2>`;
            container.appendChild(msg);
        }

        const restartBtn = document.getElementById('restart-btn');
        restartBtn.style.display = 'block';
        msg.appendChild(restartBtn);
        msg.style.display = 'block';
    }

    function updateScore() {
        document.getElementById('score').textContent = score;
    }

    // --- ZOLTAR EASTER EGG (COIN GAME) ---
    const zoltarTitle = Array.from(document.querySelectorAll('.project-name'))
        .find(el => el.textContent.includes('Zoltar'));

    if (zoltarTitle) {
        let rubCount = 0;
        let lastX = 0;
        let lastDirection = 0;
        let rubTimer;
        let isZoltarActive = false;

        // Rub Detection
        const handleRub = (x) => {
            if (isZoltarActive) return;
            const delta = x - lastX;
            const direction = delta > 0 ? 1 : -1;
            if (Math.abs(delta) > 2) {
                if (direction !== lastDirection) {
                    rubCount++;
                    lastDirection = direction;
                    clearTimeout(rubTimer);
                    rubTimer = setTimeout(() => { rubCount = 0; }, 500);
                }
            }
            lastX = x;
            if (rubCount > 10) {
                startZoltarGame();
            }
        };

        zoltarTitle.addEventListener('mousemove', (e) => handleRub(e.clientX));
        zoltarTitle.addEventListener('touchmove', (e) => {
            e.preventDefault();
            handleRub(e.touches[0].clientX);
        }, { passive: false });
        zoltarTitle.addEventListener('mouseleave', () => { rubCount = 0; });
        zoltarTitle.addEventListener('touchend', () => { rubCount = 0; });
    }

    function startZoltarGame() {
        isZoltarActive = true;
        const overlay = document.getElementById('zoltar-overlay');
        overlay.classList.remove('hidden');

        // Game State
        let gameState = 'AIMING'; // AIMING -> READY -> FIRING -> END
        let rampAngle = 0;
        const ramp = document.getElementById('ramp-container');
        const signAim = document.getElementById('sign-aim');
        const signBtn = document.getElementById('sign-button');
        const btn = document.getElementById('zoltar-button');
        const coin = document.getElementById('game-coin');
        const eyes = document.querySelectorAll('#eye-left, #eye-right');

        // Reset UI
        signAim.classList.add('flashing');
        signBtn.classList.remove('flashing');
        btn.classList.remove('active');
        btn.disabled = true;
        coin.classList.add('hidden');
        document.getElementById('ticket').classList.remove('dispensed');
        eyes.forEach(eye => eye.classList.remove('glowing-red'));

        // 1. Aiming Logic
        const updateRamp = (e) => {
            if (gameState !== 'AIMING' && gameState !== 'READY') return;

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const centerX = window.innerWidth / 2;
            const delta = clientX - centerX;

            // Map delta to angle (-30 to 30 degrees)
            rampAngle = Math.max(-30, Math.min(30, delta / 10));
            ramp.style.transform = `translateX(-50%) rotate(${rampAngle}deg)`;
        };

        document.addEventListener('mousemove', updateRamp);
        document.addEventListener('touchmove', updateRamp);

        // 2. Timer to Ready State
        setTimeout(() => {
            if (!isZoltarActive) return;
            gameState = 'READY';
            signAim.classList.remove('flashing');
            signBtn.classList.add('flashing');
            btn.classList.add('active');
            btn.disabled = false;

            // Eyes Glow
            eyes.forEach(eye => eye.classList.add('glowing-red'));
        }, 5000);

        // 3. Fire Logic
        btn.onclick = () => {
            if (gameState !== 'READY') return;
            gameState = 'FIRING';
            btn.classList.remove('active');
            signBtn.classList.remove('flashing');

            // Show Coin
            coin.classList.remove('hidden');
            coin.style.bottom = '20px';
            coin.style.left = '50%';

            // Animate Coin
            // Simple physics: move up at angle
            const speed = 10;
            const rad = (rampAngle - 90) * (Math.PI / 180); // -90 because 0 is right, we want up
            let posX = 0; // Relative to center
            let posY = 20;

            const animateCoin = () => {
                posY += speed;
                posX += Math.cos(rad) * speed; // Wrong math for vertical 0, but let's simplify
                // Actually: 0deg is vertical up in our CSS rotation context?
                // CSS rotate(0) is vertical. rotate(-30) is left.
                // So x component is sin(angle), y is cos(angle)

                const rads = rampAngle * (Math.PI / 180);
                const stepY = Math.cos(rads) * 5;
                const stepX = Math.sin(rads) * 5;

                // We need to track actual DOM position
                const currentBottom = parseFloat(coin.style.bottom) || 20;
                const currentLeft = parseFloat(coin.style.left) || 50; // %

                // Convert % to px for calc?
                // Let's use transform translate instead for smoother animation
                // But we need to detect collision with mouth rect

                // Simplified: Just check angle on click
                // Target is roughly center (0 deg) +/- 5 deg
                const isWin = Math.abs(rampAngle) < 5;

                // Visual Animation
                coin.style.transition = 'all 1s ease-out';
                coin.style.bottom = '260px'; // Mouth height
                coin.style.transform = `translateX(calc(-50% + ${rampAngle * 3}px))`; // Approx deviation

                setTimeout(() => {
                    if (isWin) {
                        // WIN
                        document.getElementById('zoltar-mouth-group').innerHTML =
                            `<ellipse cx="150" cy="265" rx="15" ry="10" fill="#000"/>`; // Open mouth
                        coin.style.opacity = '0'; // Swallowed

                        setTimeout(() => {
                            document.getElementById('ticket').classList.add('dispensed');
                        }, 500);
                    } else {
                        // LOSE - Bounce
                        coin.style.transition = 'all 0.5s ease-in';
                        coin.style.bottom = '20px';
                        coin.style.opacity = '0';

                        setTimeout(() => {
                            alert("Zoltar rejects your offering. Try again.");
                            startZoltarGame(); // Restart
                        }, 1000);
                    }
                }, 1000);
            };

            animateCoin();
        };

        // Close handler
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.classList.add('hidden');
                isZoltarActive = false;
                document.removeEventListener('mousemove', updateRamp);
                document.removeEventListener('touchmove', updateRamp);
            }
        };
    }
});
