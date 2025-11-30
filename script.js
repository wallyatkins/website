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

    // Light/Dark Mode Toggle
    const heroImage = document.querySelector('.hero-image');
    if (heroImage) {
        heroImage.addEventListener('dblclick', () => {
            document.body.classList.toggle('light-mode');

            // Swap image
            if (document.body.classList.contains('light-mode')) {
                heroImage.src = 'profile-white.jpg';
            } else {
                heroImage.src = 'profile-black.jpg';
            }
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
        // Vibrate if mobile
        if (navigator.vibrate) navigator.vibrate(200);
    }

    // 2. Konami Code Sequence
    const sequence = ['up', 'up', 'down', 'down', 'left', 'right', 'left', 'right'];
    let inputSequence = [];

    document.querySelectorAll('.dpad div[data-key]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent re-triggering long press
            const key = btn.dataset.key;
            inputSequence.push(key);

            // Visual feedback
            btn.style.backgroundColor = '#fff';
            setTimeout(() => btn.style.backgroundColor = '', 100);

            checkSequence();
        });
    });

    function checkSequence() {
        // Check if the end of input matches the sequence
        if (inputSequence.length > sequence.length) {
            inputSequence.shift(); // Keep buffer same length
        }

        if (inputSequence.join(',') === sequence.join(',')) {
            launchGame();
        }
    }

    function launchGame() {
        isUnlocked = true;
        dpadContainer.classList.add('hidden');
        gameContainer.classList.remove('hidden');
        initGame();
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

        // Check for Game Over before spawning? No, check after spawn if any can fit.
        // Actually, check if *previous* blocks are all used first.

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
        let startX, startY, initialLeft, initialTop;
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

            element.style.left = `${clientX - startX}px`;
            element.style.top = `${clientY - startY}px`;

            // Ghost Preview
            updateGhost(clientX, clientY, shape);
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
            const clientX = e.changedTouches ? e.changedTouches[0].clientX : e.clientX;
            const clientY = e.changedTouches ? e.changedTouches[0].clientY : e.clientY;

            const target = document.elementFromPoint(clientX, clientY);
            const gridCell = target ? target.closest('.grid-cell') : null;

            if (gridCell) {
                const r = parseInt(gridCell.dataset.r);
                const c = parseInt(gridCell.dataset.c);
                // Adjust for offset (user drags by a specific part of block)
                // Simplified: Assume user drops top-left of block on cell
                // Better: Calculate nearest valid placement based on center

                // For now, let's use the ghost logic to confirm placement
                if (validGhostPlacement) {
                    placeBlock(validGhostPlacement.r, validGhostPlacement.c, shape, color);
                    element.remove();
                    if (document.getElementById('block-options').children.length === 0) {
                        spawnBlocks();
                    } else {
                        checkGameOver();
                    }
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

        // Find grid cell under pointer
        // We need to offset based on the block's center or top-left. 
        // Let's assume the pointer is roughly the center of the dragged block.
        // To make it intuitive, we check which cell is closest to the top-left of the dragged element.

        // Actually, let's use elementFromPoint on the top-left of the dragged element
        // But the element itself is under the pointer. We need to hide it momentarily or calculate offset.
        // Simpler: Just check the cell under the pointer and treat it as the "anchor" (e.g., top-left or center block cell)

        const target = document.elementFromPoint(x, y);
        const cell = target ? target.closest('.grid-cell') : null;

        if (cell) {
            const r = parseInt(cell.dataset.r);
            const c = parseInt(cell.dataset.c);

            // Try to center the shape on the cursor? Or top-left?
            // Let's try top-left alignment for simplicity first.
            // Adjust r/c to center:
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

            // Change color palette?
            // currentColor = colors[Math.floor(Math.random() * colors.length)];

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
        const options = document.querySelectorAll('.option-block');
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
});
