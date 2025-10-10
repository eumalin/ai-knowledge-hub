import { useState, useEffect } from 'react';
import Chat from './Chat';

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const STORAGE_KEY = 'ai-knowledge-documents';
const API_KEY_STORAGE_KEY = 'ai-knowledge-api-key';
const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 50000;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const ALLOWED_FILE_TYPES = [
  'text/plain',
  'text/markdown',
  'application/json',
  'text/csv',
  'text/html',
  'text/xml',
];
const ALLOWED_FILE_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.html', '.xml', '.log'];
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [documents, setDocuments] = useState<Document[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState({ title: '', content: '' });
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [fileError, setFileError] = useState('');

  // Save to localStorage whenever documents change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  // Save API key to localStorage whenever it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }, [apiKey]);

  const validateApiKey = (key: string): boolean => {
    if (!key.trim()) {
      setApiKeyError('API key is required');
      return false;
    }
    if (!key.startsWith('sk-')) {
      setApiKeyError('Invalid API key format. Must start with "sk-"');
      return false;
    }
    setApiKeyError('');
    return true;
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setApiKey(newKey);
    if (newKey.trim()) {
      validateApiKey(newKey);
    } else {
      setApiKeyError('');
    }
  };

  const validateForm = (): boolean => {
    const newErrors = { title: '', content: '' };
    let isValid = true;

    if (!title.trim()) {
      newErrors.title = 'Title is required';
      isValid = false;
    } else if (title.length > MAX_TITLE_LENGTH) {
      newErrors.title = `Title must be ${MAX_TITLE_LENGTH} characters or less`;
      isValid = false;
    }

    if (!content.trim()) {
      newErrors.content = 'Content is required';
      isValid = false;
    } else if (content.length > MAX_CONTENT_LENGTH) {
      newErrors.content = `Content must be ${MAX_CONTENT_LENGTH} characters or less`;
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const newDocument: Document = {
      id: Date.now().toString(),
      title: title.trim(),
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setDocuments([...documents, newDocument]);
    setTitle('');
    setContent('');
    setErrors({ title: '', content: '' });
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments(documents.filter((doc) => doc.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete all documents?')) {
      setDocuments([]);
      setSelectedDocIds(new Set());
    }
  };

  const handleToggleDocument = (id: string) => {
    setSelectedDocIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedDocIds(new Set(documents.map((doc) => doc.id)));
  };

  const handleDeselectAll = () => {
    setSelectedDocIds(new Set());
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setFileError(`File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      return;
    }

    // Validate file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (
      !ALLOWED_FILE_TYPES.includes(file.type) &&
      !ALLOWED_FILE_EXTENSIONS.includes(fileExtension)
    ) {
      setFileError(
        `Invalid file type. Allowed: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`
      );
      return;
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const fileContent = event.target?.result as string;

      if (fileContent.length > MAX_CONTENT_LENGTH) {
        setFileError(`File content must be less than ${MAX_CONTENT_LENGTH.toLocaleString()} characters`);
        return;
      }

      // Extract filename without extension as title
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      setTitle(fileName.slice(0, MAX_TITLE_LENGTH));
      setContent(fileContent);
      setErrors({ title: '', content: '' });
    };

    reader.onerror = () => {
      setFileError('Failed to read file');
    };

    reader.readAsText(file);

    // Reset the file input so the same file can be selected again
    e.target.value = '';
  };

  const selectedDocuments = documents.filter((doc) =>
    selectedDocIds.has(doc.id)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
            AI Knowledge Q&A Platform
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Store your documents locally and prepare for AI-powered Q&A
          </p>
        </div>

        {/* API Key Input */}
        <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6 mb-6">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
            OpenAI API Key
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Your API key is stored locally in your browser and sent directly to OpenAI. We never store your API key on our servers.
          </p>
          <div className="relative">
            <input
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={handleApiKeyChange}
              placeholder="sk-..."
              className={`w-full px-3 py-2 pr-24 border rounded-md focus:outline-none focus:ring-2 ${
                apiKeyError
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-600 hover:text-gray-800 px-3 py-1 rounded hover:bg-gray-100 transition-colors"
            >
              {showApiKey ? 'Hide' : 'Show'}
            </button>
          </div>
          {apiKeyError && (
            <p className="text-red-600 text-sm mt-2">{apiKeyError}</p>
          )}
          {apiKey && !apiKeyError && (
            <p className="text-green-600 text-sm mt-2">✓ Valid API key format</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Document Input Form */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
              Add Document
            </h2>
            <form onSubmit={handleAddDocument}>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Document Title
                  </label>
                  <span className="text-xs text-gray-500">
                    {title.length}/{MAX_TITLE_LENGTH}
                  </span>
                </div>
                <input
                  type="text"
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter document title"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                    errors.title
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  maxLength={MAX_TITLE_LENGTH}
                />
                {errors.title && (
                  <p className="text-red-600 text-sm mt-1">{errors.title}</p>
                )}
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <label
                    htmlFor="content"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Document Content
                  </label>
                  <span className="text-xs text-gray-500">
                    {content.length.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()}
                  </span>
                </div>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Paste your document content here..."
                  rows={12}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 resize-vertical ${
                    errors.content
                      ? 'border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:ring-blue-500'
                  }`}
                  maxLength={MAX_CONTENT_LENGTH}
                />
                {errors.content && (
                  <p className="text-red-600 text-sm mt-1">{errors.content}</p>
                )}
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-center w-full">
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center w-full border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors p-4"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <svg
                        className="w-8 h-8 mb-2 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-semibold">Click to upload</span> a text file
                      </p>
                      <p className="text-xs text-gray-500">
                        {ALLOWED_FILE_EXTENSIONS.join(', ')} (max {MAX_FILE_SIZE / 1024 / 1024}MB)
                      </p>
                    </div>
                    <input
                      id="file-upload"
                      type="file"
                      className="hidden"
                      accept={ALLOWED_FILE_EXTENSIONS.join(',')}
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
                {fileError && (
                  <p className="text-red-600 text-sm mt-2">{fileError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Document
              </button>
            </form>
          </div>

          {/* Document List */}
          <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
                  Documents ({documents.length})
                </h2>
                {documents.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs sm:text-sm text-gray-600 hover:text-red-600 transition-colors"
                  >
                    Clear All
                  </button>
                )}
              </div>
              {documents.length > 0 && (
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={handleSelectAll}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Select All
                  </button>
                  <span className="text-gray-400">|</span>
                  <button
                    onClick={handleDeselectAll}
                    className="text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    Deselect All
                  </button>
                  <span className="text-gray-600 ml-2">
                    ({selectedDocIds.size} selected for Q&A)
                  </span>
                </div>
              )}
            </div>
            {documents.length === 0 ? (
              <div className="text-center py-12 px-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-500 text-sm sm:text-base mb-2">
                  No documents yet
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Add your first document to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4 max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`border rounded-lg p-3 sm:p-4 hover:shadow-sm transition-all ${
                      selectedDocIds.has(doc.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-gray-50 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedDocIds.has(doc.id)}
                        onChange={() => handleToggleDocument(doc.id)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        title="Select for Q&A"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-semibold text-gray-800 flex-1 break-all text-sm sm:text-base">
                            {doc.title}
                          </h3>
                          <button
                            onClick={() => handleDeleteDocument(doc.id)}
                            className="text-red-600 hover:text-red-800 text-xs sm:text-sm flex-shrink-0 transition-colors px-2 py-1 hover:bg-red-50 rounded"
                            title="Delete document"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 break-words leading-relaxed">
                      {doc.content.slice(0, 100)}
                      {doc.content.length > 100 ? '...' : ''}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span>{doc.content.length.toLocaleString()} characters</span>
                      <span>•</span>
                      <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Section */}
        <div className="mt-6">
          <Chat
            documents={selectedDocuments}
            apiKey={apiKey}
            apiBaseUrl={API_BASE_URL}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
