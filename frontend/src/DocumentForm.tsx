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
const ALLOWED_FILE_EXTENSIONS = ['.txt', '.md', '.json', '.csv', '.html', '.xml', '.log', '.pdf'];

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
    <div className="card">
      <h2 className="heading-1 mb-4">
        Add Document
      </h2>
      <form onSubmit={onSubmit}>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="title"
              className="label"
            >
              Document Title
            </label>
            <span className="helper-text" aria-live="polite">
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
            className={`input ${errors.title ? 'input-error' : ''}`}
            maxLength={MAX_TITLE_LENGTH}
          />
          {errors.title && (
            <p id="title-error" className="error-text" role="alert">
              {errors.title}
            </p>
          )}
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <label
              htmlFor="content"
              className="label"
            >
              Document Content
            </label>
            <span className="helper-text" aria-live="polite">
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
            className={`textarea ${errors.content ? 'input-error' : ''}`}
            maxLength={MAX_CONTENT_LENGTH}
          />
          {errors.content && (
            <p id="content-error" className="error-text" role="alert">
              {errors.content}
            </p>
          )}
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="file-upload"
              className="flex flex-col items-center justify-center w-full border-2 border-slate-600 border-dashed rounded-lg cursor-pointer bg-slate-900/30 hover:bg-slate-900/50 hover:border-purple-500/50 transition-all duration-200 p-4"
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
                  className="w-8 h-8 mb-2 text-purple-400"
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
                <p className="text-sm text-gray-300 mb-1">
                  <span className="font-semibold text-purple-400">Click to upload</span> a text file
                </p>
                <p className="text-xs text-gray-400">
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
            <p className="error-text mt-2" role="alert">
              {fileError}
            </p>
          )}
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          aria-label="Add document to list"
        >
          Add Document
        </button>
      </form>
    </div>
  );
}

export default DocumentForm;
