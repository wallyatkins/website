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

    // 3. Block Blast Game Logic
    const gridSize = 8;
    let grid = [];
    let score = 0;
    let selectedBlock = null;

    function initGame() {
        const gridEl = document.getElementById('game-grid');
        gridEl.innerHTML = '';
        grid = Array(gridSize).fill().map(() => Array(gridSize).fill(0));
        score = 0;
        updateScore();

        // Create grid cells
        for (let r = 0; r < gridSize; r++) {
            for (let c = 0; c < gridSize; c++) {
                const cell = document.createElement('div');
                cell.classList.add('grid-cell');
                cell.dataset.r = r;
                cell.dataset.c = c;
                cell.addEventListener('click', () => placeBlock(r, c));
                gridEl.appendChild(cell);
            }
        }

        spawnBlocks();

        document.getElementById('restart-btn').addEventListener('click', initGame);
    }

    function spawnBlocks() {
        const optionsEl = document.getElementById('block-options');
        optionsEl.innerHTML = '';

        // Simple shapes
        const shapes = [
            [[1]], // Dot
            [[1, 1]], // 2-Line
            [[1, 1, 1]], // 3-Line
            [[1, 1], [1, 1]], // Square
            [[1, 1, 1], [0, 1, 0]], // T-shape
            [[1, 1, 0], [0, 1, 1]] // Z-shape
        ];

        for (let i = 0; i < 3; i++) {
            const shape = shapes[Math.floor(Math.random() * shapes.length)];
            createOptionBlock(shape, optionsEl);
        }
    }

    function createOptionBlock(shape, container) {
        const wrapper = document.createElement('div');
        wrapper.classList.add('option-block');
        wrapper.style.gridTemplateColumns = `repeat(${shape[0].length}, 1fr)`;

        shape.forEach(row => {
            row.forEach(cell => {
                const div = document.createElement('div');
                if (cell) div.classList.add('block-cell');
                wrapper.appendChild(div);
            });
        });

        wrapper.addEventListener('click', (e) => {
            e.stopPropagation();
            // Deselect others
            document.querySelectorAll('.option-block').forEach(b => b.style.opacity = '1');

            if (selectedBlock === shape) {
                selectedBlock = null; // Toggle off
            } else {
                selectedBlock = shape;
                wrapper.style.opacity = '0.5'; // Visual feedback
            }
        });

        container.appendChild(wrapper);
    }

    function placeBlock(r, c) {
        if (!selectedBlock) return;

        // Check if fits
        if (canPlace(selectedBlock, r, c)) {
            // Place it
            for (let i = 0; i < selectedBlock.length; i++) {
                for (let j = 0; j < selectedBlock[0].length; j++) {
                    if (selectedBlock[i][j]) {
                        grid[r + i][c + j] = 1;
                        const cell = document.querySelector(`.grid-cell[data-r="${r + i}"][data-c="${c + j}"]`);
                        cell.classList.add('filled');
                    }
                }
            }

            score += 10;
            updateScore();
            checkLines();

            // Remove used block from options
            // (Simplified: just respawn all if user placed one, or remove specific DOM - for now respawn if empty or just remove the clicked one)
            // Better: find the DOM element that was selected and remove it
            const options = document.querySelectorAll('.option-block');
            options.forEach(opt => {
                if (opt.style.opacity === '0.5') opt.remove();
            });

            selectedBlock = null;

            if (document.getElementById('block-options').children.length === 0) {
                spawnBlocks();
            }
        }
    }

    function canPlace(shape, r, c) {
        for (let i = 0; i < shape.length; i++) {
            for (let j = 0; j < shape[0].length; j++) {
                if (shape[i][j]) {
                    if (r + i >= gridSize || c + j >= gridSize || grid[r + i][c + j]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    function checkLines() {
        let linesCleared = 0;

        // Check Rows
        for (let r = 0; r < gridSize; r++) {
            if (grid[r].every(cell => cell === 1)) {
                grid[r].fill(0);
                linesCleared++;
                // Visual clear
                for (let c = 0; c < gridSize; c++) {
                    const cell = document.querySelector(`.grid-cell[data-r="${r}"][data-c="${c}"]`);
                    cell.classList.remove('filled');
                }
            }
        }

        // Check Cols
        for (let c = 0; c < gridSize; c++) {
            if (grid.every(row => row[c] === 1)) {
                for (let r = 0; r < gridSize; r++) {
                    grid[r][c] = 0;
                    const cell = document.querySelector(`.grid-cell[data-r="${r}"][data-c="${c}"]`);
                    cell.classList.remove('filled');
                }
                linesCleared++;
            }
        }

        if (linesCleared > 0) {
            score += linesCleared * 100;
            updateScore();
        }
    }

    function updateScore() {
        document.getElementById('score').textContent = score;
    }
});
