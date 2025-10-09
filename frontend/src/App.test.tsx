import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

describe('App - Document Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the main heading', () => {
    render(<App />);
    expect(screen.getByText('AI Knowledge Q&A Platform')).toBeInTheDocument();
  });

  it('shows empty state when no documents', () => {
    render(<App />);
    expect(screen.getByText('No documents yet')).toBeInTheDocument();
  });

  it('adds a document when form is submitted', async () => {
    const user = userEvent.setup();
    render(<App />);

    const titleInput = screen.getByLabelText('Document Title');
    const contentTextarea = screen.getByLabelText('Document Content');
    const submitButton = screen.getByRole('button', { name: /add document/i });

    await user.type(titleInput, 'Test Document');
    await user.type(contentTextarea, 'This is test content');
    await user.click(submitButton);

    expect(screen.getByText('Test Document')).toBeInTheDocument();
    expect(screen.getByText(/This is test content/)).toBeInTheDocument();
  });

  it('shows validation error for empty title', async () => {
    const user = userEvent.setup();
    render(<App />);

    const submitButton = screen.getByRole('button', { name: /add document/i });
    await user.click(submitButton);

    expect(screen.getByText('Title is required')).toBeInTheDocument();
    expect(screen.getByText('Content is required')).toBeInTheDocument();
  });

  it('deletes a document', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Add a document
    await user.type(screen.getByLabelText('Document Title'), 'Test');
    await user.type(screen.getByLabelText('Document Content'), 'Content');
    await user.click(screen.getByRole('button', { name: /add document/i }));

    expect(screen.getByText('Test')).toBeInTheDocument();

    // Delete the document
    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(screen.queryByText('Test')).not.toBeInTheDocument();
    expect(screen.getByText('No documents yet')).toBeInTheDocument();
  });

  it('shows character count', async () => {
    const user = userEvent.setup();
    render(<App />);

    const titleInput = screen.getByLabelText('Document Title');
    await user.type(titleInput, 'Test');

    expect(screen.getByText('4/100')).toBeInTheDocument();
  });

  it('clears all documents', async () => {
    const user = userEvent.setup();
    render(<App />);

    // Add two documents
    await user.type(screen.getByLabelText('Document Title'), 'Doc 1');
    await user.type(screen.getByLabelText('Document Content'), 'Content 1');
    await user.click(screen.getByRole('button', { name: /add document/i }));

    await user.type(screen.getByLabelText('Document Title'), 'Doc 2');
    await user.type(screen.getByLabelText('Document Content'), 'Content 2');
    await user.click(screen.getByRole('button', { name: /add document/i }));

    expect(screen.getByText('Documents (2)')).toBeInTheDocument();

    // Mock window.confirm
    window.confirm = () => true;

    const clearButton = screen.getByRole('button', { name: /clear all/i });
    await user.click(clearButton);

    expect(screen.getByText('Documents (0)')).toBeInTheDocument();
    expect(screen.getByText('No documents yet')).toBeInTheDocument();
  });
});

describe('App - LocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists documents to localStorage', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    await user.type(screen.getByLabelText('Document Title'), 'Persistent Doc');
    await user.type(screen.getByLabelText('Document Content'), 'Persistent Content');
    await user.click(screen.getByRole('button', { name: /add document/i }));

    unmount();

    // Re-render and check if document is still there
    render(<App />);
    expect(screen.getByText('Persistent Doc')).toBeInTheDocument();
  });
});

describe('App - API Key', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders API key input', () => {
    render(<App />);
    expect(screen.getByText('OpenAI API Key')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('sk-...')).toBeInTheDocument();
  });

  it('validates API key format', async () => {
    const user = userEvent.setup();
    render(<App />);

    const apiKeyInput = screen.getByPlaceholderText('sk-...');

    // Invalid key
    await user.type(apiKeyInput, 'invalid-key');
    expect(screen.getByText('Invalid API key format. Must start with "sk-"')).toBeInTheDocument();

    // Clear and type valid key
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'sk-test123');
    expect(screen.getByText('✓ Valid API key format')).toBeInTheDocument();
  });

  it('toggles API key visibility', async () => {
    const user = userEvent.setup();
    render(<App />);

    const apiKeyInput = screen.getByPlaceholderText('sk-...') as HTMLInputElement;
    const toggleButton = screen.getByRole('button', { name: /show/i });

    expect(apiKeyInput.type).toBe('password');

    await user.click(toggleButton);
    expect(apiKeyInput.type).toBe('text');

    await user.click(screen.getByRole('button', { name: /hide/i }));
    expect(apiKeyInput.type).toBe('password');
  });

  it('persists API key to localStorage', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);

    const apiKeyInput = screen.getByPlaceholderText('sk-...');
    await user.type(apiKeyInput, 'sk-persistent-key');

    unmount();

    // Re-render and check if API key is still there
    render(<App />);
    expect(screen.getByDisplayValue('sk-persistent-key')).toBeInTheDocument();
  });
});
