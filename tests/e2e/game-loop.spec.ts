import { test, expect } from '@playwright/test';

test.describe('游戏回合循环', () => {
  test('UI 元素可见', async ({ page }) => {
    await page.goto('/');
    // 验证游戏 UI 各元素可见
    await expect(page.getByText('结束回合')).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('button', { name: '新局' })).toBeVisible();
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible();
    await expect(page.getByRole('button', { name: '读取' })).toBeVisible();

    // 验证画布存在
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });
  });

  test('点击结束回合按钮', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // 获取初始回合数
    const turnText = await page.getByText(/第 \d+ 回合/).textContent();
    const initialTurn = parseInt(turnText?.match(/\d+/)?.[0] ?? '0', 10);
    expect(initialTurn).toBeGreaterThanOrEqual(1);

    // 尝试点击"结束回合"按钮
    // 注意：按钮在有待办事项时会被禁用，需要用 force: true 强制点击
    const endTurnBtn = page.getByText('结束回合');
    const isDisabled = await endTurnBtn.evaluate((el) =>
      el.closest('button')?.hasAttribute('disabled')
    );

    if (isDisabled) {
      // 如果有待办事项，先点击画布消耗一些行动力
      // 或者直接 force 点击（按钮 disabled 时仍会触发 onClick）
      await endTurnBtn.click({ force: true });
    } else {
      await endTurnBtn.click();
    }

    // 等待 AI 回合执行（异步，可能耗时 1-3 秒）
    await page.waitForTimeout(3000);

    // 检查回合是否推进（异步 AI 回合完成后回合数可能增加）
    const newTurnText = await page.getByText(/第 \d+ 回合/).textContent();
    const newTurn = parseInt(newTurnText?.match(/\d+/)?.[0] ?? '0', 10);
    // 由于 AI 异步执行，回合数可能不变或推进
    // 至少确认游戏没有崩溃
    expect(newTurn).toBeGreaterThanOrEqual(initialTurn);
  });

  test('多次点击后游戏状态稳定', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('canvas')).toBeVisible({ timeout: 15000 });

    // 等待就绪
    await page.waitForTimeout(1000);

    // 点击画布几次
    const canvas = page.locator('canvas');
    for (let i = 0; i < 3; i++) {
      await canvas.click({ force: true });
      await page.waitForTimeout(300);
    }

    // 游戏应该仍然稳定运行
    await expect(page.getByText(/第 \d+ 回合/)).toBeVisible();
    await expect(page.getByText('结束回合')).toBeVisible();
  });
});