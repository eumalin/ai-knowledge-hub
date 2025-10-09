import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Chat from './Chat';

const mockDocuments = [
  {
    id: '1',
    title: 'Test Document',
    content: 'This is test content',
    createdAt: '2024-01-01T00:00:00.000Z',
  },
];

describe('Chat', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  it('renders chat interface', () => {
    render(<Chat documents={[]} apiKey="" apiBaseUrl="http://localhost:8000" />);
    expect(screen.getByText('Ask Questions')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText('Ask a question about your documents...')
    ).toBeInTheDocument();
  });

  it('shows empty state when no messages', () => {
    render(<Chat documents={[]} apiKey="" apiBaseUrl="http://localhost:8000" />);
    expect(
      screen.getByText('Select documents using the checkboxes above, then ask questions')
    ).toBeInTheDocument();
  });

  it('shows empty state with documents', () => {
    render(<Chat documents={mockDocuments} apiKey="sk-test" apiBaseUrl="http://localhost:8000" />);
    expect(
      screen.getByText('Ask a question about your selected documents')
    ).toBeInTheDocument();
  });

  it('disables submit button when no API key', () => {
    render(<Chat documents={mockDocuments} apiKey="" apiBaseUrl="http://localhost:8000" />);
    const submitButton = screen.getByRole('button', { name: /ask/i });
    expect(submitButton).toBeDisabled();
  });

  it('disables submit button when no documents', () => {
    render(<Chat documents={[]} apiKey="sk-test" apiBaseUrl="http://localhost:8000" />);
    const submitButton = screen.getByRole('button', { name: /ask/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows error when submitting empty question', async () => {
    const user = userEvent.setup();
    render(
      <Chat
        documents={mockDocuments}
        apiKey="sk-test"
        apiBaseUrl="http://localhost:8000"
      />
    );

    const submitButton = screen.getByRole('button', { name: /ask/i });
    await user.click(submitButton);

    expect(screen.getByText('Please enter a question')).toBeInTheDocument();
  });

  it('sends question and displays response', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      answer: 'This is the AI response',
      sources: ['Test Document'],
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as Response);

    render(
      <Chat
        documents={mockDocuments}
        apiKey="sk-test"
        apiBaseUrl="http://localhost:8000"
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your documents...'
    );
    const submitButton = screen.getByRole('button', { name: /ask/i });

    await user.type(input, 'What is this about?');
    await user.click(submitButton);

    // User message should appear
    expect(screen.getByText('What is this about?')).toBeInTheDocument();

    // Wait for AI response
    await waitFor(() => {
      expect(screen.getByText('This is the AI response')).toBeInTheDocument();
    });

    // Check sources are displayed
    expect(screen.getByText(/Sources:/)).toBeInTheDocument();
    expect(screen.getByText(/Test Document/)).toBeInTheDocument();
  });

  it('shows loading state while waiting for response', async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ answer: 'Response', sources: [] }),
              } as Response),
            100
          )
        )
    );

    render(
      <Chat
        documents={mockDocuments}
        apiKey="sk-test"
        apiBaseUrl="http://localhost:8000"
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your documents...'
    );
    await user.type(input, 'Test question');
    await user.click(screen.getByRole('button', { name: /ask/i }));

    // Should show "Sending..." button
    expect(screen.getByRole('button', { name: /sending/i })).toBeInTheDocument();

    // Wait for response
    await waitFor(() => {
      expect(screen.getByText('Response')).toBeInTheDocument();
    });
  });

  it('shows error message when API call fails', async () => {
    const user = userEvent.setup();

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'API Error' }),
    } as Response);

    render(
      <Chat
        documents={mockDocuments}
        apiKey="sk-test"
        apiBaseUrl="http://localhost:8000"
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your documents...'
    );
    await user.type(input, 'Test question');
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('validates API key format', async () => {
    const user = userEvent.setup();
    render(
      <Chat
        documents={mockDocuments}
        apiKey="invalid-key"
        apiBaseUrl="http://localhost:8000"
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your documents...'
    );
    await user.type(input, 'Test question');
    await user.click(screen.getByRole('button', { name: /ask/i }));

    expect(screen.getByText('Please enter a valid API key')).toBeInTheDocument();
  });

  it('sends correct request to API', async () => {
    const user = userEvent.setup();
    const mockFetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ answer: 'Response', sources: [] }),
    } as Response);
    vi.stubGlobal('fetch', mockFetch);

    render(
      <Chat
        documents={mockDocuments}
        apiKey="sk-test123"
        apiBaseUrl="http://localhost:8000"
      />
    );

    const input = screen.getByPlaceholderText(
      'Ask a question about your documents...'
    );
    await user.type(input, 'What is this?');
    await user.click(screen.getByRole('button', { name: /ask/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8000/ask',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': 'sk-test123',
          },
          body: JSON.stringify({
            documents: mockDocuments,
            question: 'What is this?',
          }),
        })
      );
    });
  });
});
