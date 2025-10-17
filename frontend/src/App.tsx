import { useState, useEffect } from 'react';
import Chat from './Chat';
import ViewDocumentModal from './ViewDocumentModal';
import DocumentForm from './DocumentForm';
import Settings from './Settings';

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
  'application/pdf',
];
const ALLOWED_FILE_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.html', '.xml', '.log', '.pdf'];
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function App() {
  const [documents, setDocuments] = useState<Document[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  });
  const [apiKeyError, setApiKeyError] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [errors, setErrors] = useState({ title: '', content: '' });
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [fileError, setFileError] = useState('');
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [importError, setImportError] = useState('');

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

  const handleApiKeyChange = (newKey: string) => {
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

  const handleExportDocuments = () => {
    if (documents.length === 0) {
      alert('No documents to export');
      return;
    }

    const dataStr = JSON.stringify(documents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `documents-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportDocuments = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError('');

    if (file.type !== 'application/json' && !file.name.endsWith('.json')) {
      setImportError('Invalid file type. Please upload a JSON file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const importedData = JSON.parse(content);

        if (!Array.isArray(importedData)) {
          setImportError('Invalid file format. Expected an array of documents.');
          return;
        }

        const validDocuments: Document[] = [];
        for (const doc of importedData) {
          if (
            typeof doc.id === 'string' &&
            typeof doc.title === 'string' &&
            typeof doc.content === 'string' &&
            typeof doc.createdAt === 'string'
          ) {
            if (doc.title.length <= MAX_TITLE_LENGTH && doc.content.length <= MAX_CONTENT_LENGTH) {
              validDocuments.push(doc);
            }
          }
        }

        if (validDocuments.length === 0) {
          setImportError('No valid documents found in the file.');
          return;
        }

        const newDocuments = validDocuments.map(doc => ({
          ...doc,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        }));

        setDocuments([...documents, ...newDocuments]);
        alert(`Successfully imported ${newDocuments.length} document(s)`);
      } catch {
        setImportError('Failed to parse JSON file. Please check the file format.');
      }
    };

    reader.onerror = () => {
      setImportError('Failed to read file');
    };

    reader.readAsText(file);
    e.target.value = '';
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Handle PDF files
    if (file.type === 'application/pdf' || fileExtension === '.pdf') {
      try {
        const pdfjs = await import('pdfjs-dist');

        // Set up the worker using the bundled version
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.mjs',
          import.meta.url
        ).toString();

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';

        // Extract text from all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(' ');
          fullText += pageText + '\n';
        }

        if (fullText.length > MAX_CONTENT_LENGTH) {
          setFileError(`File content must be less than ${MAX_CONTENT_LENGTH.toLocaleString()} characters`);
          return;
        }

        // Extract filename without extension as title
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        setTitle(fileName.slice(0, MAX_TITLE_LENGTH));
        setContent(fullText.trim());
        setErrors({ title: '', content: '' });
      } catch (error) {
        setFileError('Failed to parse PDF file. Please try a different file.');
        console.error('PDF parsing error:', error);
      }

      // Reset the file input
      e.target.value = '';
      return;
    }

    // Read text files
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
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-800">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Header with gradient text */}
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-3 drop-shadow-lg">
            AI Knowledge Q&A Platform
          </h1>
          <p className="text-sm sm:text-base text-gray-200">
            Store your documents locally and get AI-powered answers
          </p>
        </div>

        {/* Settings */}
        <Settings
          apiKey={apiKey}
          onApiKeyChange={handleApiKeyChange}
          apiKeyError={apiKeyError}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Document Input Form */}
          <DocumentForm
            title={title}
            content={content}
            errors={errors}
            fileError={fileError}
            onTitleChange={setTitle}
            onContentChange={setContent}
            onFileUpload={handleFileUpload}
            onSubmit={handleAddDocument}
          />

          {/* Document List */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 p-4 sm:p-6">
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-100" id="document-list-heading">
                  Documents ({documents.length})
                </h2>
                {documents.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs sm:text-sm text-gray-400 hover:text-red-400 transition-colors"
                    aria-label="Clear all documents"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Export/Import Buttons */}
              <div className="flex gap-2 mb-3" role="group" aria-label="Document import and export">
                <button
                  onClick={handleExportDocuments}
                  disabled={documents.length === 0}
                  className="flex-1 px-3 py-2 text-sm bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-md disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 shadow-lg disabled:shadow-none"
                  aria-label={`Export ${documents.length} document${documents.length !== 1 ? 's' : ''}`}
                >
                  Export Documents
                </button>
                <label className="flex-1">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportDocuments}
                    className="hidden"
                    aria-label="Import documents from JSON file"
                  />
                  <div
                    className="w-full px-3 py-2 text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all duration-200 text-center cursor-pointer shadow-lg"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.currentTarget.previousElementSibling?.querySelector('input')?.click();
                      }
                    }}
                  >
                    Import Documents
                  </div>
                </label>
              </div>
              {importError && (
                <p className="text-red-400 text-sm mb-2" role="alert">
                  {importError}
                </p>
              )}

              {documents.length > 0 && (
                <div className="flex gap-2 text-xs" role="group" aria-label="Document selection controls">
                  <button
                    onClick={handleSelectAll}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    aria-label="Select all documents for Q&A"
                  >
                    Select All
                  </button>
                  <span className="text-gray-600" aria-hidden="true">|</span>
                  <button
                    onClick={handleDeselectAll}
                    className="text-cyan-400 hover:text-cyan-300 transition-colors"
                    aria-label="Deselect all documents"
                  >
                    Deselect All
                  </button>
                  <span className="text-gray-300 ml-2" aria-live="polite">
                    ({selectedDocIds.size} selected for Q&A)
                  </span>
                </div>
              )}
            </div>
            {documents.length === 0 ? (
              <div className="text-center py-12 px-4">
                <svg
                  className="mx-auto h-12 w-12 text-cyan-400/50 mb-4"
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
                <p className="text-gray-300 text-sm sm:text-base mb-2">
                  No documents yet
                </p>
                <p className="text-gray-400 text-xs sm:text-sm">
                  Add your first document to get started!
                </p>
              </div>
            ) : (
              <div
                className="space-y-3 sm:space-y-4 max-h-[500px] sm:max-h-[600px] overflow-y-auto pr-2"
                role="list"
                aria-labelledby="document-list-heading"
              >
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`border rounded-lg p-3 sm:p-4 hover:shadow-lg transition-all duration-200 ${
                      selectedDocIds.has(doc.id)
                        ? 'border-cyan-500/50 bg-slate-700/80 shadow-cyan-500/20'
                        : 'border-slate-600 bg-slate-900/40 hover:border-cyan-500/30 hover:bg-slate-700/50'
                    }`}
                    role="listitem"
                  >
                    <div className="flex items-start gap-3 mb-2">
                      <input
                        type="checkbox"
                        checked={selectedDocIds.has(doc.id)}
                        onChange={() => handleToggleDocument(doc.id)}
                        className="mt-1 w-4 h-4 text-cyan-500 bg-slate-700 border-slate-600 rounded focus:ring-2 focus:ring-cyan-500"
                        aria-label={`Select ${doc.title} for Q&A`}
                        id={`doc-checkbox-${doc.id}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-semibold text-gray-100 flex-1 break-all text-sm sm:text-base">
                            <label htmlFor={`doc-checkbox-${doc.id}`} className="cursor-pointer">
                              {doc.title}
                            </label>
                          </h3>
                          <div className="flex gap-2 flex-shrink-0" role="group" aria-label={`Actions for ${doc.title}`}>
                            <button
                              onClick={() => setViewingDocument(doc)}
                              className="text-cyan-400 hover:text-cyan-300 text-xs sm:text-sm transition-colors px-2 py-1 hover:bg-cyan-500/10 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
                              aria-label={`View full content of ${doc.title}`}
                            >
                              View
                            </button>
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-red-400 hover:text-red-300 text-xs sm:text-sm transition-colors px-2 py-1 hover:bg-red-500/10 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                              aria-label={`Delete ${doc.title}`}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-300 mb-2 break-words leading-relaxed">
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

      {/* View Document Modal */}
      <ViewDocumentModal
        document={viewingDocument}
        onClose={() => setViewingDocument(null)}
      />
    </div>
  );
}

export default App;
