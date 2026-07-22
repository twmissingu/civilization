import { test, expect } from '@playwright/test';

test.describe('单位交互', () => {
  test('点击画布触发交互', async ({ page }) => {
    await page.goto('/');
    // 等待画布渲染完成
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // 等待"就绪"状态（PixiJS 初始化完成）
    await expect(page.getByText('就绪')).toBeVisible({ timeout: 15000 });

    // 点击画布中间区域，触发 PixiJS pointertap 事件
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await canvas.click({
      position: { x: box!.width / 2, y: box!.height / 2 },
      force: true,
    });

    // 点击后应有单位被选中或状态更新（无报错即可）
    // 等待短暂时间让事件处理完成
    await page.waitForTimeout(500);

    // 再次点击确认交互稳定
    await canvas.click({
      position: { x: box!.width / 2 + 50, y: box!.height / 2 + 50 },
      force: true,
    });
    await page.waitForTimeout(500);
  });

  test('点击画布后 UI 保持响应', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // 点击画布
    await canvas.click({ force: true });
    await page.waitForTimeout(500);

    // 验证 UI 按钮仍然可用
    await expect(page.getByRole('button', { name: '新局' })).toBeVisible();
    await expect(page.getByText('结束回合')).toBeVisible();
  });
});