import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileNav from '../components/MobileNav';

describe('MobileNav', () => {
  it('renders 5-item navigation without planning entry', () => {
    render(
      <MemoryRouter initialEntries={['/expenses']}>
        <MobileNav />
      </MemoryRouter>
    );

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(5);
    expect(screen.getByText('Control')).toBeInTheDocument();
    expect(screen.getByText('Journey')).toBeInTheDocument();
    expect(screen.getByText('Goals')).toBeInTheDocument();
    expect(screen.getByText('Recurring')).toBeInTheDocument();
    expect(screen.queryByText('Planning')).not.toBeInTheDocument();
  });
});
