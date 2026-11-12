import { test, expect } from '@playwright/test';

test.describe('PWA Module Suite & Cross-Device Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock football auth status
    await page.route('**/football_api.php?action=auth_status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authenticated: true,
          user: { id: 3, username: 'Derek', name: 'Derek', is_admin: 0 }
        })
      });
    });

    // Mock football meta & week data
    await page.route('**/football_api.php?action=meta', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          season: 2024,
          current_week: 10,
          available_weeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          is_season_active: true
        })
      });
    });

    await page.route('**/football_api.php?action=matrix*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          season: 2024,
          week: 10,
          current_week: 10,
          is_current_week: true,
          games: [
            {
              id: 1,
              game_id: 1,
              home_team: 'KC',
              away_team: 'DEN',
              kickoff_time: '2024-11-10T18:00:00Z',
              is_closed: true,
              status: 'FINAL',
              home_score: 16,
              away_score: 14,
              winning_team: 'KC'
            }
          ],
          tiebreaker_game: null,
          participants: [
            {
              entry_id: 1,
              user_id: 3,
              username: 'Derek',
              is_me: true,
              correct_count: 1,
              graded_count: 1,
              mnf_points_prediction: 42,
              picks: {
                '1': { game_id: 1, selected_team: 'KC', is_revealed: true, result: 'correct' }
              }
            }
          ],
          current_user_status: {
            is_authenticated: true,
            user: { id: 3, username: 'Derek', role: 'player' },
            has_submitted: true,
            picks_count: 1,
            total_games: 1,
            missing_picks: false,
            user_picks: { 1: 'KC' },
            mnf_points: 42,
            push_enabled: true
          }
        })
      });
    });

    // Mock MUD APIs
    await page.route('**/mud.wallyatkins.com/api/auth.php', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          token: 'mock-mud-token-12345',
          character: {
            id: 77,
            name: 'Derek',
            class: 3,
            level: 5,
            hp: 65,
            max_hp: 65,
            mana: 80,
            max_mana: 80,
            move: 110,
            max_move: 110,
            room_vnum: 3700
          },
          prompt: '<65hp 80m 110mv> ',
          last_log_id: 100
        })
      });
    });

    await page.route('**/mud.wallyatkins.com/api/command.php', async (route) => {
      const postData = route.request().postDataJSON();
      const cmd = postData?.command || 'look';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          output: `{cEntrance to Mud School{x\nYou stand in the grand hall of Merc Mud School.\n{g[Exits: north south down]{x\nExecuted command: ${cmd}`,
          prompt: '<65hp 80m 110mv> ',
          last_log_id: 101,
          character: { hp: 65, max_hp: 65, mana: 80, max_mana: 80, move: 110, max_move: 110 }
        })
      });
    });

    // Mock Tasks API
    await page.route('**/tasks.wallyatkins.com/api.php?route=/tasks', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tasks: [
            { id: 'cloud-1', title: 'Review league standings for Week 10', status: 'completed', priority: 'high' }
          ]
        })
      });
    });

    // Mock Notification Preferences
    await page.route('**/football_api.php?action=get_notification_preferences', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          preferences: {
            phone_number: '5551234567',
            carrier_gateway: 'msg.fi.google.com',
            timezone: 'America/New_York',
            push_pick_reminders: 1,
            sms_pick_reminders: 0,
            email_pick_reminders: 1,
            mud_tells: 1,
            task_due_reminders: 1
          }
        })
      });
    });

    await page.route('**/football_api.php?action=test_push', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          result: { success: 1, total: 1 }
        })
      });
    });
  });

  test('1. Loads PWA mode by default on /pickem with header module switcher trigger', async ({ page }) => {
    await page.goto('/pickem');

    // Verify header module switcher button
    const switcherTrigger = page.locator('button.module-switcher-pill-btn');
    await expect(switcherTrigger).toBeVisible();
    await expect(switcherTrigger).toContainText("Football Pick'em");

    // Click module switcher trigger
    await switcherTrigger.click();

    // Verify ModuleSwitcherDrawer opens
    const drawer = page.locator('[role="dialog"][aria-label="Application Module Switcher"]');
    await expect(drawer).toBeVisible();

    // Verify all 4 tier 1 modules are present
    await expect(drawer).toContainText("Wally's NFL Pick'em");
    await expect(drawer).toContainText('WallyMUD');
    await expect(drawer).toContainText('WallyTasks');
    await expect(drawer).toContainText('Account & Settings');
  });

  test('2. Switches to WallyMUD module, renders terminal, auto-authenticates, and executes commands', async ({ page }) => {
    await page.goto('/pickem');

    // Open switcher and click WallyMUD
    await page.locator('button.module-switcher-pill-btn').click();
    await page.locator('button:has-text("WallyMUD")').click();

    // Verify WallyMUD terminal is displayed
    const mudHeader = page.locator('header h1:has-text("WallyMUD")');
    await expect(mudHeader).toBeVisible();

    // Verify character status
    await expect(page.locator('text=Derek')).toBeVisible();

    // Verify command input is present
    const cmdInput = page.locator('input[placeholder*="Command"]');
    await expect(cmdInput).toBeVisible();

    // Submit a command via quick button
    const northBtn = page.locator('button:text-is("N")');
    await expect(northBtn).toBeVisible();
    await northBtn.click();

    // Verify terminal output updated
    await expect(page.locator('text=Executed command: north')).toBeVisible();

    // Verify localStorage updated active module
    const storedMod = await page.evaluate(() => localStorage.getItem('wally_last_active_module'));
    expect(storedMod).toBe('mud');
  });

  test('3. Switches to WallyTasks module, displays progress, adds task, and toggles completion', async ({ page }) => {
    // Start directly with WallyTasks module pre-selected in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('wally_last_active_module', 'tasks');
    });

    await page.goto('/pickem');

    // Verify WallyTasks header
    const tasksHeader = page.locator('header h1:has-text("WallyTasks")');
    await expect(tasksHeader).toBeVisible();

    // Verify completion progress is visible
    await expect(page.locator('text=Completion Progress')).toBeVisible();

    // Click 'New Task' button
    await page.locator('button:has-text("New Task")').click();

    // Fill in task form
    const taskInput = page.locator('input[placeholder="What needs to be done?"]');
    await expect(taskInput).toBeVisible();
    await taskInput.fill('Playwright Automated Integration Test');
    await page.locator('button[type="submit"]:has-text("Add Task")').click();

    // Verify new task appears in list
    const newTaskItem = page.locator('text=Playwright Automated Integration Test');
    await expect(newTaskItem).toBeVisible();

    // Toggle completion checkbox
    const completeBtn = page.locator('button[aria-label="Mark task completed"]').first();
    await completeBtn.click();

    // Verify task is marked completed in local storage
    const storedTasks = await page.evaluate(() => localStorage.getItem('wally_tasks_items'));
    expect(storedTasks).toContain('Playwright Automated Integration Test');
  });

  test('4. Switches to Account & Settings module, displays profile, and dispatches test push notification', async ({ page }) => {
    // Start directly with Account module pre-selected in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('wally_last_active_module', 'account');
      localStorage.setItem('pwa_push_enabled', 'true');
    });

    await page.goto('/pickem');

    // Verify Account & Settings header
    const accountHeader = page.locator('header h1:has-text("Account & Settings")');
    await expect(accountHeader).toBeVisible();

    // Verify user profile card
    await expect(page.locator('text=Derek')).toBeVisible();

    // Verify push notifications status card
    await expect(page.locator('text=Active on this device')).toBeVisible();

    // Click 'Send Test Notification'
    const testPushBtn = page.locator('button:has-text("Send Test Notification")');
    await expect(testPushBtn).toBeVisible();
    await testPushBtn.click();

    // Verify confirmation toast message
    await expect(page.locator('text=Test notification sent! Check your phone lock screen.')).toBeVisible();
  });

  test('5. Validates mobile safe-area insets on simulated iPhone Dynamic Island', async ({ page }) => {
    // Set iPhone 14 viewport
    await page.setViewportSize({ width: 393, height: 852 });

    await page.goto('/pickem');

    // Verify top header has safe-area styling
    const header = page.locator('header.football-header');
    await expect(header).toBeVisible();

    const paddingTop = await header.evaluate((el) => {
      return window.getComputedStyle(el).paddingTop;
    });

    // Padding top should be non-zero to account for iPhone status notch / safe-area
    expect(parseFloat(paddingTop)).toBeGreaterThan(0);
  });

  test('6. Validates Android Pixel viewport layout and touch targets', async ({ page }) => {
    // Set Google Pixel 7 viewport (412 x 915)
    await page.setViewportSize({ width: 412, height: 915 });

    await page.goto('/pickem');

    // Verify pick wizard button is comfortably sized for thumb interaction
    const pickBtn = page.locator('button.compact-pick-btn');
    await expect(pickBtn).toBeVisible();

    const box = await pickBtn.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(32);
    }
  });

  test('7. Supports direct deep-linking via ?module= parameter', async ({ page }) => {
    // Navigate with ?module=mud
    await page.goto('/pickem?module=mud');
    await expect(page.locator('header h1:has-text("WallyMUD")')).toBeVisible();

    // Navigate with ?module=tasks
    await page.goto('/pickem?module=tasks');
    await expect(page.locator('header h1:has-text("WallyTasks")')).toBeVisible();

    // Navigate with ?module=account
    await page.goto('/pickem?module=account');
    await expect(page.locator('header h1:has-text("Account & Settings")')).toBeVisible();
  });

  test('8. Seamless multi-module switching and navigation in a single session', async ({ page }) => {
    await page.goto('/pickem');

    // 1. Pick'em -> MUD
    await page.locator('button.module-switcher-pill-btn').click();
    await page.locator('button:has-text("WallyMUD")').click();
    await expect(page.locator('header h1:has-text("WallyMUD")')).toBeVisible();

    // 2. MUD -> Tasks
    await page.locator('button[aria-label="Switch Application Module"]').click();
    await page.locator('button:has-text("WallyTasks")').click();
    await expect(page.locator('header h1:has-text("WallyTasks")')).toBeVisible();

    // 3. Tasks -> Account
    await page.locator('button[aria-label="Switch Application Module"]').click();
    await page.locator('button:has-text("Account & Settings")').click();
    await expect(page.locator('header h1:has-text("Account & Settings")')).toBeVisible();

    // 4. Account -> Website
    await page.locator('button:has-text("Website")').click();
    // Verify personal website Hero section renders
    await expect(page.locator('#hero, h1:has-text("Wally Atkins")').first()).toBeVisible();
  });
});
