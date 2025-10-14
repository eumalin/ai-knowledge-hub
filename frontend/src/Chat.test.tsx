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
    localStorage.clear();
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

  it('shows message when API key is missing', () => {
    render(
      <Chat
        documents={mockDocuments}
        apiKey=""
        apiBaseUrl="http://localhost:8000"
      />
    );

    expect(
      screen.getByText(/Please enter your OpenAI API key above to ask questions/)
    ).toBeInTheDocument();
  });

  it('shows message when no documents are selected', () => {
    render(
      <Chat
        documents={[]}
        apiKey="sk-test"
        apiBaseUrl="http://localhost:8000"
      />
    );

    expect(
      screen.getByText(/Select at least one document using the checkboxes above/)
    ).toBeInTheDocument();
  });

  it('hides info messages when requirements are met', () => {
    render(
      <Chat
        documents={mockDocuments}
        apiKey="sk-test"
        apiBaseUrl="http://localhost:8000"
      />
    );

    expect(
      screen.queryByText(/Please enter your OpenAI API key/)
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Select at least one document/)
    ).not.toBeInTheDocument();
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

  describe('Chat History', () => {
    it('persists messages to localStorage', async () => {
      const user = userEvent.setup();
      const mockResponse = {
        answer: 'AI response',
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
      await user.type(input, 'Test question');
      await user.click(screen.getByRole('button', { name: /ask/i }));

      await waitFor(() => {
        expect(screen.getByText('AI response')).toBeInTheDocument();
      });

      // Check localStorage was updated
      const stored = localStorage.getItem('ai-knowledge-chat-history');
      expect(stored).toBeTruthy();
      const messages = JSON.parse(stored!);
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Test question');
      expect(messages[1].content).toBe('AI response');
    });

    it('loads messages from localStorage on mount', () => {
      const existingMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Previous question',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          role: 'assistant' as const,
          content: 'Previous answer',
          timestamp: '2024-01-01T00:01:00.000Z',
          sources: ['Doc 1'],
        },
      ];

      localStorage.setItem(
        'ai-knowledge-chat-history',
        JSON.stringify(existingMessages)
      );

      render(
        <Chat
          documents={mockDocuments}
          apiKey="sk-test"
          apiBaseUrl="http://localhost:8000"
        />
      );

      expect(screen.getByText('Previous question')).toBeInTheDocument();
      expect(screen.getByText('Previous answer')).toBeInTheDocument();
      expect(screen.getByText(/Doc 1/)).toBeInTheDocument();
    });

    it('shows clear history button when messages exist', () => {
      const existingMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Question',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      localStorage.setItem(
        'ai-knowledge-chat-history',
        JSON.stringify(existingMessages)
      );

      render(
        <Chat
          documents={mockDocuments}
          apiKey="sk-test"
          apiBaseUrl="http://localhost:8000"
        />
      );

      expect(screen.getByText('Clear History')).toBeInTheDocument();
    });

    it('hides clear history button when no messages', () => {
      render(
        <Chat
          documents={mockDocuments}
          apiKey="sk-test"
          apiBaseUrl="http://localhost:8000"
        />
      );

      expect(screen.queryByText('Clear History')).not.toBeInTheDocument();
    });

    it('clears chat history when clear button is clicked', async () => {
      const user = userEvent.setup();
      const existingMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Question',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        {
          id: '2',
          role: 'assistant' as const,
          content: 'Answer',
          timestamp: '2024-01-01T00:01:00.000Z',
        },
      ];

      localStorage.setItem(
        'ai-knowledge-chat-history',
        JSON.stringify(existingMessages)
      );

      // Mock confirm dialog
      vi.stubGlobal('confirm', vi.fn(() => true));

      render(
        <Chat
          documents={mockDocuments}
          apiKey="sk-test"
          apiBaseUrl="http://localhost:8000"
        />
      );

      // Messages should be visible
      expect(screen.getByText('Question')).toBeInTheDocument();
      expect(screen.getByText('Answer')).toBeInTheDocument();

      // Click clear history
      const clearButton = screen.getByText('Clear History');
      await user.click(clearButton);

      // Messages should be gone
      expect(screen.queryByText('Question')).not.toBeInTheDocument();
      expect(screen.queryByText('Answer')).not.toBeInTheDocument();

      // localStorage should be cleared
      expect(localStorage.getItem('ai-knowledge-chat-history')).toBe('[]');

      // Clear button should be hidden
      expect(screen.queryByText('Clear History')).not.toBeInTheDocument();
    });

    it('does not clear history when user cancels confirmation', async () => {
      const user = userEvent.setup();
      const existingMessages = [
        {
          id: '1',
          role: 'user' as const,
          content: 'Question',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      localStorage.setItem(
        'ai-knowledge-chat-history',
        JSON.stringify(existingMessages)
      );

      // Mock confirm dialog - user cancels
      vi.stubGlobal('confirm', vi.fn(() => false));

      render(
        <Chat
          documents={mockDocuments}
          apiKey="sk-test"
          apiBaseUrl="http://localhost:8000"
        />
      );

      const clearButton = screen.getByText('Clear History');
      await user.click(clearButton);

      // Message should still be visible
      expect(screen.getByText('Question')).toBeInTheDocument();

      // localStorage should not be cleared
      const stored = localStorage.getItem('ai-knowledge-chat-history');
      expect(JSON.parse(stored!)).toHaveLength(1);
    });
  });
});
