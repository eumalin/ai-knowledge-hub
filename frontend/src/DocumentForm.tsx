interface DocumentFormProps {
  title: string;
  content: string;
  errors: { title: string; content: string };
  fileError: string;
  onTitleChange: (title: string) => void;
  onContentChange: (content: string) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const MAX_TITLE_LENGTH = 100;
const MAX_CONTENT_LENGTH = 50000;
const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const ALLOWED_FILE_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.html', '.xml', '.log'];

function DocumentForm({
  title,
  content,
  errors,
  fileError,
  onTitleChange,
  onContentChange,
  onFileUpload,
  onSubmit,
}: DocumentFormProps) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 text-gray-800">
        Add Document
      </h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Document Title
            </label>
            <span className="text-xs text-gray-500" aria-live="polite">
              {title.length}/{MAX_TITLE_LENGTH}
            </span>
          </div>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Enter document title"
            aria-label="Document title"
            aria-required="true"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? 'title-error' : undefined}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
              errors.title
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            maxLength={MAX_TITLE_LENGTH}
          />
          {errors.title && (
            <p id="title-error" className="text-red-600 text-sm mt-1" role="alert">
              {errors.title}
            </p>
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
            <span className="text-xs text-gray-500" aria-live="polite">
              {content.length.toLocaleString()}/{MAX_CONTENT_LENGTH.toLocaleString()}
            </span>
          </div>
          <textarea
            id="content"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Paste your document content here..."
            rows={12}
            aria-label="Document content"
            aria-required="true"
            aria-invalid={!!errors.content}
            aria-describedby={errors.content ? 'content-error' : undefined}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 resize-vertical ${
              errors.content
                ? 'border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            maxLength={MAX_CONTENT_LENGTH}
          />
          {errors.content && (
            <p id="content-error" className="text-red-600 text-sm mt-1" role="alert">
              {errors.content}
            </p>
          )}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors p-4"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  document.getElementById('file-upload')?.click();
                }
              }}
            >
              <div className="flex flex-col items-center justify-center">
                <svg
                  className="w-8 h-8 mb-2 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                onChange={onFileUpload}
                aria-label="Upload document file"
              />
            </label>
          </div>
          {fileError && (
            <p className="text-red-600 text-sm mt-2" role="alert">
              {fileError}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          aria-label="Add document to list"
        >
          Add Document
        </button>
      </form>
    </div>
  );
}

export default DocumentForm;
