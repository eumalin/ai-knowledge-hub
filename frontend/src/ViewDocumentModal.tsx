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
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-800 border border-slate-700/50 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-700/50">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-100 pr-4 break-words">
            {document.title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl leading-none flex-shrink-0"
            title="Close"
          >
            ×
          </button>
        </div>
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          <div className="text-xs sm:text-sm text-gray-400 mb-4 flex flex-wrap gap-2">
            <span>{document.content.length.toLocaleString()} characters</span>
            <span>•</span>
            <span>{new Date(document.createdAt).toLocaleDateString()}</span>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-gray-200 font-mono bg-slate-900/50 border border-slate-700 p-4 rounded-lg">
            {document.content}
          </pre>
        </div>
        <div className="p-4 sm:p-6 border-t border-slate-700/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-800 transition-all duration-200 shadow-lg hover:shadow-purple-500/50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ViewDocumentModal;
