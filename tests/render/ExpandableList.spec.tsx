// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExpandableList } from '../../src/render/ExpandableList';

describe('ExpandableList', () => {
  it('renders items', () => {
    render(<ExpandableList items={['item1', 'item2']} maxInitial={5} renderItem={(i) => <span>{i}</span>} />);
    expect(screen.getByText('item1')).toBeInTheDocument();
    expect(screen.getByText('item2')).toBeInTheDocument();
  });
});