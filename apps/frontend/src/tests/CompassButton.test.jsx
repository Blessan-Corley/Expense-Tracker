import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import CompassButton from '../components/CompassButton';

describe('CompassButton', () => {
  it('renders correctly', () => {
    render(<CompassButton>Click Me</CompassButton>);
    expect(screen.getByText('Click Me')).toBeInTheDocument();
  });
});
