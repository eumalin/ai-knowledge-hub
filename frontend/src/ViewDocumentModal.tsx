interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface ViewDocumentModalProps {
  document: Document | null;
  onClose: () => void;
}

function ViewDocumentModal({ document, onClose }: ViewDocumentModalProps) {
  if (!document) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 pr-4 break-words">
            {document.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-2xl leading-none flex-shrink-0"
            title="Close"
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="text-xs sm:text-sm text-gray-500 mb-4 flex flex-wrap gap-2">
            <span>{document.content.length.toLocaleString()} characters</span>
            <span>•</span>
            <span>{new Date(document.createdAt).toLocaleDateString()}</span>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-gray-50 p-4 rounded-lg">
            {document.content}
          </pre>
        </div>
        <div className="p-4 sm:p-6 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewDocumentModal;
