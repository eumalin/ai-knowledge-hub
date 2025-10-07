import { useState, useEffect } from 'react';

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

const STORAGE_KEY = 'ai-knowledge-documents';
const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 50000;

function App() {
  const [documents, setDocuments] = useState<Document[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState({ title: '', content: '' });

  // Save to localStorage whenever documents change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

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
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          AI Knowledge Q&A Platform
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Document Input Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Add Document</h2>
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

              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Document
              </button>
            </form>
          </div>

          {/* Document List */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                Documents ({documents.length})
              </h2>
              {documents.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="text-sm text-gray-600 hover:text-red-600"
                >
                  Clear All
                </button>
              )}
            </div>
            {documents.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No documents yet. Add one to get started!
              </p>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="border border-gray-200 rounded p-4 hover:border-gray-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <h3 className="font-semibold text-gray-800 flex-1 break-all min-w-0">
                        {doc.title}
                      </h3>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="text-red-600 hover:text-red-800 text-sm flex-shrink-0"
                        title="Delete document"
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 mb-2 break-words">
                      {doc.content.slice(0, 100)}
                      {doc.content.length > 100 ? '...' : ''}
                    </p>
                    <p className="text-xs text-gray-400">
                      {doc.content.length} characters
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
