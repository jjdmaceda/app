import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';

const BlockModal = ({ isOpen, onClose, onSelect, pageId }) => {
  const [blocks, setBlocks] = useState([]);
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const modalRef = useRef(null);

  // All useEffects at top level - unconditional

  // Fetch blocks from API when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);
    setSelectedBlocks([]);
    fetch('/wp-json/unicorn-builder/v1/blocks')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then(data => {
        setBlocks(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('API Error:', err);
        setError(err.message);
        setLoading(false);
        toast.error('Failed to load blocks. Please try again.');
      });
  }, [isOpen]);

  // Unmount after animation if closed
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
    } else {
      const timeout = setTimeout(() => setShouldRender(false), 400);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Focus trap: Trap focus inside modal when open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstFocusable = focusableElements[0];
      const lastFocusable = focusableElements[focusableElements.length - 1];

      if (firstFocusable) firstFocusable.focus();

      const handleKeyDown = (e) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstFocusable) {
              e.preventDefault();
              lastFocusable?.focus();
            }
          } else {
            if (document.activeElement === lastFocusable) {
              e.preventDefault();
              firstFocusable.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  // Early return after all hooks
  if (!shouldRender) return null;

  // Toggle selection on card click
  const toggleSelection = (blockId) => {
    setSelectedBlocks(prev => 
      prev.includes(blockId) 
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    );
  };

  // Add selected blocks to page via API
  const handleAddToPage = async () => {
    if (selectedBlocks.length === 0) {
      toast.warning('Please select at least one block.');
      return;
    }

    if (!pageId) {
      toast.error('Page ID not provided.');
      return;
    }

    setAdding(true);
    setError(null);

    const results = [];
    for (const blockId of selectedBlocks) {
      try {
        const response = await fetch(`/wp-json/unicorn-builder/v1/blocks/add-to-page/${pageId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': window.ubrData?.nonce || ''
          },
          body: JSON.stringify({ block_id: blockId })
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        results.push({ success: true, message: result.message });
      } catch (err) {
        console.error('Add Block Error:', err);
        results.push({ success: false, message: err.message });
      }
    }

    setAdding(false);

    const successes = results.filter(r => r.success);
    if (successes.length === selectedBlocks.length) {
      toast.success(`Added ${successes.length} block(s) successfully!`);
      onClose();
      if (onSelect) onSelect(selectedBlocks);
    } else {
      toast.error(`Added ${successes.length}/${selectedBlocks.length} blocks. Some failed—check console.`);
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Conditional Error UI (now after hooks)
  if (error && !loading) {
    return (
      <div
        id="blockModal"
        className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center"
        ref={modalRef}
      >
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-md text-center">
          <h3 className="text-lg font-semibold mb-4">Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="bg-black text-white px-4 py-2 rounded"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      id="blockModal"
      className={`fixed inset-0 z-50 overflow-y-auto transition-all duration-400 ease-out ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{
        transition: isOpen
          ? 'opacity 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
          : 'opacity 300ms cubic-bezier(0.4, 0, 1, 1), transform 300ms cubic-bezier(0.4, 0, 1, 1)'
      }}
      onClick={handleBackdropClick}
      ref={modalRef}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-500 transition-opacity duration-400 ease-out"
        style={{
          opacity: isOpen ? 0.5 : 0,
          transition: 'opacity 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        }}
        aria-hidden="true"
      ></div>

      {/* Modal Panel */}
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div
          className="relative overflow-hidden rounded-lg bg-white text-left shadow-xl sm:my-8 sm:w-full sm:max-w-4xl"
          style={{
            transform: isOpen
              ? 'translateY(0) scale(1) opacity(1)'
              : 'translateY(-20px) scale(0.95) opacity(0)',
            transition: isOpen
              ? 'all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)'
              : 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* Modal Header */}
          <div className="bg-white px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between transition-all duration-300 ease-out" style={{ opacity: isOpen ? 1 : 0, transform: isOpen ? 'translateX(0)' : 'translateX(10px)' }}>
              <h3 className="text-xl font-semibold text-gray-900">Select a Block</h3>
              <button
                id="closeModalBtn"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Modal Body: Grid of Cards */}
          <div className="p-6">

            {/* Add Button */}
            <div 
              className="flex justify-end mb-6"
              style={{
                opacity: isOpen ? (loading ? 0.6 : 1) : 0,
                transform: isOpen ? 'translateY(0)' : 'translateY(5px)',
                transition: 'all 300ms cubic-bezier(0.34, 1.56, 0.64, 1) 200ms'
              }}
            >
              <button
                onClick={handleAddToPage}
                disabled={loading || adding || selectedBlocks.length === 0}
                className="bg-black text-sm text-white px-6 py-3 rounded-full hover:opacity-80 block transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? 'Adding...' : `Add to Page (${selectedBlocks.length})`}
              </button>
            </div>
            

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {loading ? (
                // Skeleton: 6 placeholder cards
                Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="group cursor-pointer overflow-hidden rounded-lg border border-gray-200 shadow-sm transition-all duration-300 ease-out animate-pulse"
                    style={{
                      transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
                      opacity: isOpen ? 1 : 0,
                      transition: `all ${300 + index * 50}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
                      transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
                    }}
                  >
                    <div className="relative h-48 bg-gray-200 overflow-hidden">
                      <div className="w-full h-full bg-gray-300 animate-pulse"></div>
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-3/4 animate-pulse"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2 animate-pulse"></div>
                    </div>
                  </div>
                ))
              ) : (
                // Loaded Cards - Staggered animation
                blocks.map((block, index) => {
                  const isSelected = selectedBlocks.includes(block.id);
                  return (
                    <div
                      key={block.id}
                      className={`group cursor-pointer overflow-hidden rounded-lg transition-all duration-300 ease-out ${
                        isSelected 
                          ? 'border border-black shadow-lg ring-2 ring-black ring-opacity-50'
                          : 'border border-gray-200 shadow-sm hover:shadow-md'
                      }`}
                      style={{
                        transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.98)',
                        opacity: isOpen ? 1 : 0,
                        transition: `all ${300 + index * 50}ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
                        transitionDelay: isOpen ? `${index * 50}ms` : '0ms'
                      }}
                      onClick={() => toggleSelection(block.id)}
                    >
                      <div className="relative h-48 bg-gray-200 overflow-hidden transition-all duration-300 ease-out group-hover:opacity-100">
                        <img
                          src={block.image}
                          alt={`${block.name} Block`}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300 ease-out"
                        />
                      </div>
                      <div className="p-4">
                        <h4 className={`text-sm font-medium transition-all duration-200 ease-out ${
                          isSelected ? 'text-black' : 'text-gray-900 group-hover:text-black'
                        }`}>
                          {block.name}
                        </h4>
                        {block.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{block.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockModal;