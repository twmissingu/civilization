// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ConfirmDialogManager } from '../../src/render/ConfirmDialogManager';

describe('ConfirmDialogManager', () => {
  it('renders nothing when no pending confirmations', () => {
    const { container } = render(<ConfirmDialogManager pendingConfirm={null} onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});