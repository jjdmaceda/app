// EditModal.jsx
import React from 'react';

function EditModal({ isOpen, onClose, blockId, pageId }) {
  if (!isOpen || !blockId) return null;

  // Assuming block ID corresponds to a WordPress post ID for editing.
  // Adjust the iframe src as needed for your Unicorn Builder's edit endpoint.
  // For example, if it's a custom editor, use something like `/wp-json/unicorn-builder/v1/block-editor/${blockId}?iframe=true`.
  const iframeSrc = `/wp-admin/post.php?post=${blockId}&action=edit&edit-block=true`;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
        <div className="absolute top-0 left-0 w-full h-full bg-black opacity-40"></div>
      <div className="bg-white rounded-lg w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Edit Block</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Iframe Content */}
        <iframe
          src={iframeSrc}
          className="w-full flex-1 border-0"
          title={`Edit Block ${blockId}`}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      </div>
    </div>
  );
}

export default EditModal;