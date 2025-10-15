import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from './Settings';

describe('Settings', () => {
  const defaultProps = {
    apiKey: '',
    onApiKeyChange: vi.fn(),
    apiKeyError: '',
  };

  it('renders settings button with collapsed state by default', () => {
    render(<Settings {...defaultProps} />);

    expect(screen.getByLabelText('Toggle settings')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.queryByLabelText('OpenAI API Key')).not.toBeInTheDocument();
  });

  it('expands settings when gear icon is clicked', async () => {
    const user = userEvent.setup();
    render(<Settings {...defaultProps} />);

    const toggleButton = screen.getByLabelText('Toggle settings');
    await user.click(toggleButton);

    expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument();
    expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
  });

  it('collapses settings when gear icon is clicked again', async () => {
    const user = userEvent.setup();
    render(<Settings {...defaultProps} />);

    const toggleButton = screen.getByLabelText('Toggle settings');
    await user.click(toggleButton);
    expect(screen.getByLabelText('OpenAI API Key')).toBeInTheDocument();

    await user.click(toggleButton);
    expect(screen.queryByLabelText('OpenAI API Key')).not.toBeInTheDocument();
  });

  it('shows configured status when API key is valid and settings are collapsed', () => {
    render(<Settings {...defaultProps} apiKey="sk-test123" />);

    expect(screen.getByText('✓ API key configured')).toBeInTheDocument();
  });

  it('shows not configured status when API key is empty and settings are collapsed', () => {
    render(<Settings {...defaultProps} apiKey="" />);

    expect(screen.getByText('⚠ API key not configured')).toBeInTheDocument();
  });

  it('hides configured status when settings are expanded', async () => {
    const user = userEvent.setup();
    render(<Settings {...defaultProps} apiKey="sk-test123" />);

    expect(screen.getByText('✓ API key configured')).toBeInTheDocument();

    const toggleButton = screen.getByLabelText('Toggle settings');
    await user.click(toggleButton);

    expect(screen.queryByText('✓ API key configured')).not.toBeInTheDocument();
  });

  it('does not show configured status when API key has error', () => {
    render(<Settings {...defaultProps} apiKey="invalid" apiKeyError="Invalid format" />);

    expect(screen.queryByText('✓ API key configured')).not.toBeInTheDocument();
  });

  it('calls onApiKeyChange when input value changes', async () => {
    const user = userEvent.setup();
    const onApiKeyChange = vi.fn();
    render(<Settings {...defaultProps} onApiKeyChange={onApiKeyChange} />);

    const toggleButton = screen.getByLabelText('Toggle settings');
    await user.click(toggleButton);

    const input = screen.getByLabelText('OpenAI API Key');
    await user.type(input, 'sk-test');

    expect(onApiKeyChange).toHaveBeenCalled();
  });

  it('toggles API key visibility', async () => {
    const user = userEvent.setup();
    render(<Settings {...defaultProps} apiKey="sk-test123" />);

    const toggleButton = screen.getByLabelText('Toggle settings');
    await user.click(toggleButton);

    const input = screen.getByLabelText('OpenAI API Key') as HTMLInputElement;
    const showButton = screen.getByLabelText('Show API key');

    expect(input.type).toBe('password');

    await user.click(showButton);
    expect(input.type).toBe('text');

    const hideButton = screen.getByLabelText('Hide API key');
    await user.click(hideButton);
    expect(input.type).toBe('password');
  });

  it('displays API key error message', async () => {
    const user = userEvent.setup();
    render(<Settings {...defaultProps} apiKeyError="Invalid API key format" />);

    const toggleButton = screen.getByLabelText('Toggle settings');
    await user.click(toggleButton);

    expect(screen.getByText('Invalid API key format')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid API key format');
  });

  it('displays valid format message when API key is valid', async () => {
    const user = userEvent.setup();
    render(<Settings {...defaultProps} apiKey="sk-test123" />);

    const toggleButton = screen.getByLabelText('Toggle settings');
    await user.click(toggleButton);

    expect(screen.getByText('✓ Valid API key format')).toBeInTheDocument();
  });

  it('displays API key input with correct styling when there is an error', async () => {
    const user = userEvent.setup();
    render(<Settings {...defaultProps} apiKeyError="Error" />);

    const toggleButton = screen.getByLabelText('Toggle settings');
    await user.click(toggleButton);

    const input = screen.getByLabelText('OpenAI API Key');
    expect(input).toHaveClass('border-red-500');
  });

  it('has proper ARIA attributes', async () => {
    const user = userEvent.setup();
    render(<Settings {...defaultProps} />);

    const toggleButton = screen.getByLabelText('Toggle settings');
    expect(toggleButton).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggleButton);
    expect(toggleButton).toHaveAttribute('aria-expanded', 'true');
  });
});
