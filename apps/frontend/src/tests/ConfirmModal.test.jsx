import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmModal from '../components/ConfirmModal';

describe('ConfirmModal', () => {
  it('does not render when closed', () => {
    render(<ConfirmModal isOpen={false} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders as a centered dialog when open and triggers actions', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmModal
        isOpen
        title="Delete Item?"
        message="This action cannot be undone."
        confirmText="Delete"
        cancelText="Keep"
        onConfirm={onConfirm}
        onCancel={onCancel}
        isDanger
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText('Delete Item?')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Keep' }));
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
