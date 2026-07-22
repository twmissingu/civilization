import { test, expect } from '@playwright/test';

test.describe('游戏加载', () => {
  test('页面加载后显示游戏界面', async ({ page }) => {
    await page.goto('/');
    // 等待 React 渲染完成
    await expect(page.locator('text=文明')).toBeVisible({ timeout: 15000 });

    // 游戏立即开始，应有顶部栏元素
    // 顶部栏显示文明名称（如"罗马"）
    await expect(page.locator('b')).toBeVisible();

    // 应有"新局"按钮（"开始新游戏"）
    await expect(page.getByRole('button', { name: '新局' })).toBeVisible({ timeout: 15000 });

    // 应有"结束回合"按钮
    await expect(page.getByText('结束回合')).toBeVisible();

    // 应有回合数显示
    await expect(page.getByText(/第 \d+ 回合/)).toBeVisible();

    // 应有产量信息（金币、科技、文化、信仰）
    await expect(page.getByText(/城 \d+/)).toBeVisible();
  });

  test('游戏画布（Canvas）已渲染', async ({ page }) => {
    await page.goto('/');
    // 等待 PixiJS 初始化完成，画布元素出现
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });
    // 画布应具有非零尺寸
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
  });

  test('顶部栏包含保存/读取按钮', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: '保存' })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: '读取' })).toBeVisible();
  });
});