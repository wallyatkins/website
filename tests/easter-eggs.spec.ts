import { test, expect, type Locator } from '@playwright/test';

test.describe('Easter Eggs', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
    });

    test('Creative Mode Trigger (Drag and Drop)', async ({ page }) => {
        const aboutSection = page.locator('#about');
        await aboutSection.scrollIntoViewIfNeeded();

        // Locators for the draggable words
        const logicWord = page.locator('.trigger-logic');
        const artWord = page.locator('.trigger-art');

        // Initial State: Logic & Art
        await expect(logicWord).toBeVisible();
        await expect(artWord).toBeVisible();

        // Get positions
        const logicBox = await logicWord.boundingBox();
        const artBox = await artWord.boundingBox();

        if (!logicBox || !artBox) throw new Error('Trigger words not found');

        // Verify Logic is to the left of Art initially
        expect(logicBox.x).toBeLessThan(artBox.x);

        // Perform Drag: Drag "Logic" (left) to the right (past "Art")
        // We'll drag it by its width + gap + art width to be safe
        await page.mouse.move(logicBox.x + logicBox.width / 2, logicBox.y + logicBox.height / 2);
        await page.mouse.down();
        await page.mouse.move(artBox.x + artBox.width, logicBox.y + logicBox.height / 2, { steps: 10 });
        await page.mouse.up();

        // Wait for state change / animation
        await page.waitForTimeout(1000);

        // Check body class for creative mode
        await expect(page.locator('body')).toHaveClass(/creative-mode/, { timeout: 5000 });

        // Verify positions swapped: visible by text order check or just visual snapshot, 
        // but physically in DOM they reorder because of the map in React
        // Re-locate boxes
        const logicBox2 = await logicWord.boundingBox();
        const artBox2 = await artWord.boundingBox();

        if (!logicBox2 || !artBox2) throw new Error('Trigger words not found after swap');

        // New state: Art & Logic (Art should be to the left of Logic)
        expect(artBox2.x).toBeLessThan(logicBox2.x);
    });

    test('Zoltar Trigger (Rubbing)', async ({ page }) => {
        const zoltarTitle = page.locator('.project-name', { hasText: 'Zoltar' });
        await zoltarTitle.scrollIntoViewIfNeeded();

        const box = await zoltarTitle.boundingBox();
        if (!box) throw new Error('Zoltar title not found');

        const y = box.y + box.height / 2;
        const centerX = box.x + box.width / 2;

        await page.mouse.move(centerX, y);

        for (let i = 0; i < 15; i++) {
            await page.mouse.move(centerX - 10, y);
            await page.waitForTimeout(50);
            await page.mouse.move(centerX + 10, y);
            await page.waitForTimeout(50);
        }

        const overlay = page.locator('#zoltar-overlay');
        await expect(overlay).toBeVisible();
    });

    test('Fhqwhgads Trigger (Typing)', async ({ page }) => {
        await page.keyboard.type('fhqwhgads');
        const closeBtn = page.getByText('×');
        await expect(closeBtn).toBeVisible();
    });

    test('Game Mode Trigger (Snake & Block Blast)', async ({ page }) => {
        // 1. Activate DPad first
        const ctaSection = page.locator('.cta-section');
        await ctaSection.scrollIntoViewIfNeeded();

        const box = await ctaSection.boundingBox();
        if (!box) throw new Error('CTA section not found');

        await page.mouse.move(box.x + 50, box.y + 50);
        await page.mouse.down();
        await page.waitForTimeout(5500);
        await page.mouse.up();

        const dpad = page.locator('#dpad-container');
        await expect(dpad).toBeVisible();

        // 2. Enter Konami Code: U U D D L R L R
        const up = dpad.locator('.dpad-up');
        const down = dpad.locator('.dpad-down');
        const left = dpad.locator('.dpad-left');
        const right = dpad.locator('.dpad-right');

        // Helper
        const click = async (loc: Locator) => {
            await loc.click();
            await page.waitForTimeout(100);
        };

        await click(up); await click(up);
        await click(down); await click(down);
        await click(left); await click(right);
        await click(left); await click(right);

        // 3. Verify GAME SELECTION Menu appears
        const selectionMenu = page.locator('#game-selection-overlay');
        await expect(selectionMenu).toBeVisible();
        await expect(selectionMenu).toContainText(/Game Mode Unlocked/i);

        // 4. Test Snake Selection
        const snakeBtn = selectionMenu.getByText('Snake');
        await snakeBtn.click();

        const snakeContainer = page.locator('#snake-container');
        await expect(snakeContainer).toBeVisible();
        await expect(page.locator('#snake-canvas')).toBeVisible();
        await expect(page.locator('.controls-hint')).toContainText("Use WASD or Arrow Keys");
        await expect(page.locator('#snake-container #dpad-container')).toBeVisible();

        // Close Snake
        await page.locator('#snake-container #game-close-btn').click();
        await expect(snakeContainer).not.toBeVisible();
    });

    test('Profile Image Toggle (Double Click)', async ({ page }) => {
        const heroSection = page.locator('#hero');
        const body = page.locator('body');
        const isLightInitial = await body.getAttribute('class').then(c => c?.includes('light-mode'));

        const profileImg = heroSection.locator('.hero-image');
        await expect(profileImg).toBeVisible();

        await profileImg.dblclick();

        if (isLightInitial) {
            await expect(body).not.toHaveClass(/light-mode/);
        } else {
            await expect(body).toHaveClass(/light-mode/);
        }
        await profileImg.dblclick();
    });

    test('IRC Mode (Contact Form Secret)', async ({ page }) => {
        await page.route('**/pine.php', async route => {
            const json = {
                status: 'irc_start',
                irc_id: 'test_irc_id',
                user_token: 'test_user_token',
                message: 'Secret detected! IRC initialized.'
            };
            await route.fulfill({ json });
        });

        const contactSection = page.locator('#contact');
        await contactSection.scrollIntoViewIfNeeded();

        await page.locator('#name').fill('John Doe --secret');
        await page.locator('#email').fill('john@example.com');
        await page.locator('#message').fill('Hello IRC');

        await page.locator('button[type="submit"]').click();

        // Expect redirect to fullscreen IRC
        await page.waitForURL(/irc_id=test_irc_id/);
        await expect(page).toHaveURL(/role=guest/);
        await expect(page.locator('.chat-fullscreen-wrapper')).toBeVisible();
    });

    test('Fhqwhgads Trigger via Contact Form', async ({ page }) => {
        const contactSection = page.locator('#contact');
        await contactSection.scrollIntoViewIfNeeded();

        // Type secret in Name field
        await page.locator('#name').fill('Strongbad fhqwhgads');

        // Expect Ruffle to appear
        await expect(page.locator('ruffle-player')).toBeVisible({ timeout: 10000 });

        // Form should be reset (empty name)
        await expect(page.locator('#name')).toBeEmpty();
    });

});
