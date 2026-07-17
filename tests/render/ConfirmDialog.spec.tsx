// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../../src/render/ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders title and children', () => {
    render(
      <ConfirmDialog isOpen={true} title="Test" onConfirm={vi.fn()} onCancel={vi.fn()}>
        <span>Are you sure?</span>
      </ConfirmDialog>
    );
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('returns null when not open', () => {
    const { container } = render(
      <ConfirmDialog isOpen={false} title="Test" onConfirm={vi.fn()} onCancel={vi.fn()}>
        <span>Content</span>
      </ConfirmDialog>
    );
    expect(container.firstChild).toBeNull();
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    const { container } = render(
      <ConfirmDialog isOpen={true} title="Test" onConfirm={onConfirm} onCancel={vi.fn()}>
        <span>Content</span>
      </ConfirmDialog>
    );
    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[1]);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmDialog isOpen={true} title="Test" onConfirm={vi.fn()} onCancel={onCancel}>
        <span>Content</span>
      </ConfirmDialog>
    );
    const buttons = container.querySelectorAll('button');
    fireEvent.click(buttons[0]);
    expect(onCancel).toHaveBeenCalled();
  });
});