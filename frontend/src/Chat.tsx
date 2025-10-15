import { useState, useEffect } from 'react';

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: string[];
}

interface ChatProps {
  documents: Document[];
  apiKey: string;
  apiBaseUrl: string;
}

const CHAT_HISTORY_KEY = 'ai-knowledge-chat-history';

function Chat({ documents, apiKey, apiBaseUrl }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
  }, [messages]);

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all chat history?')) {
      setMessages([]);
      localStorage.removeItem(CHAT_HISTORY_KEY);
    }
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!question.trim()) {
      setError('Please enter a question');
      return;
    }

    if (!apiKey || !apiKey.startsWith('sk-')) {
      setError('Please enter a valid API key');
      return;
    }

    if (documents.length === 0) {
      setError('Please select at least one document to query');
      return;
    }

    setError('');
    setIsLoading(true);

    // Add user message to chat
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');

    try {
      const response = await fetch(`${apiBaseUrl}/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          documents: documents,
          question: userMessage.content,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get response');
      }

      const data = await response.json();

      // Add assistant message to chat
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
        sources: data.sources,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <h2 className="heading-1">
          Ask Questions
        </h2>
        {messages.length > 0 && (
          <button
            onClick={handleClearHistory}
            className="text-xs sm:text-sm text-gray-400 hover:text-red-400 transition-colors"
          >
            Clear History
          </button>
        )}
      </div>

      {/* Chat Messages */}
      <div className="mb-4 h-[400px] overflow-y-auto border border-slate-600 rounded-lg p-4 bg-slate-900/40">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted text-sm text-center px-4">
            {documents.length === 0
              ? 'Select documents using the checkboxes above, then ask questions'
              : 'Ask a question about your selected documents'}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={message.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-500 text-xs text-gray-300">
                      <span className="font-semibold">Sources:</span>{' '}
                      {message.sources.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700/80 border border-slate-600 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert-error">
          <p>{error}</p>
        </div>
      )}

      {/* Info Messages */}
      {!apiKey && (
        <div className="alert-warning">
          <p>
            ⚠️ Please enter your OpenAI API key above to ask questions
          </p>
        </div>
      )}
      {apiKey && documents.length === 0 && (
        <div className="alert-info">
          <p>
            ℹ️ Select at least one document using the checkboxes above
          </p>
        </div>
      )}

      {/* Question Input */}
      <form onSubmit={handleAskQuestion}>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your documents..."
            className="input input-focus-cyan flex-1 disabled:opacity-50"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !apiKey || documents.length === 0}
            className="btn-secondary px-6"
          >
            {isLoading ? 'Sending...' : 'Ask'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default Chat;
