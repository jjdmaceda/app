// Sidebar.jsx (updated to import EditModal)
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import BlockModal from './BlockModal';
import EditModal from './EditModal';

function SortableItem({ id, title, isDragging, onEdit, onDelete, menuOpen, toggleMenu, ...props }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    ...(isDragging && { zIndex: 9999 }),  // Lift during drag
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="py-3 flex items-center border-b border-gray-200 last:border-b-0 transition-all duration-200 hover:bg-gray-50 relative"
    >
      {/* Drag handle - Left side */}
      <span
        {...listeners}
        className="mr-3 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing flex-shrink-0 text-sm"
        role="img"
        aria-label="Drag to reorder"
      >
        ☰
      </span>
      <a href="#" className="text-sm text-gray-900 hover:text-black block flex-1 transition-colors">
        {title}
      </a>
      {/* Kebab menu - Right side */}
      <div className="relative ml-3 flex-shrink-0 z-[10000] cursor-pointer">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleMenu(id);
          }}
          className="cursor-pointer text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="More options"
        >
          <span className="text-sm">⋮</span>
        </button>
        {/* Dropdown Menu */}
        {menuOpen === id && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg py-1 z-[10001]">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(id);
                toggleMenu(null);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(id);
                toggleMenu(null);
              }}
              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

const Sidebar = () => {
  const [sections, setSections] = useState([]);  // Fetched from API
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editBlockId, setEditBlockId] = useState(null);
  const [currentPageId, setCurrentPageId] = useState(0);
  const [activeId, setActiveId] = useState(null);  // For drag overlay (optional visual)
  const [menuOpen, setMenuOpen] = useState(null);  // Track open menu for specific item
  const [deleteConfirm, setDeleteConfirm] = useState(null);  // Track ID for delete confirmation

  // Sensors for drag activation (pointer + keyboard)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },  // Prevent accidental drags
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch page blocks from API
  const fetchPageBlocks = async () => {
    if (currentPageId === 0) return;

    try {
      const response = await fetch(`/wp-json/unicorn-builder/v1/page-blocks/${currentPageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.ubrData?.nonce || ''
        },
        body: JSON.stringify({})
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      const fetchedSections = data.map(block => ({
        id: block.id.toString(),
        title: block.name,
        type: block.name.toLowerCase().replace(/\s+/g, '-'),
        description: block.description,
        image: block.image,
        order: block.order
      })).sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setSections(fetchedSections);
    } catch (err) {
      console.error('Fetch Page Blocks Error:', err);
    }
  };

  useEffect(() => {
    if (window.ubrData && window.ubrData.currentPageId) {
      setCurrentPageId(window.ubrData.currentPageId);
    } else {
      console.warn('Page ID not found in ubrData');
    }
  }, []);

  useEffect(() => {
    if (currentPageId > 0) {
      fetchPageBlocks();
    }
  }, [currentPageId]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuOpen && !event.target.closest('.relative')) {
        setMenuOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Toggle menu for specific item
  const toggleMenu = (id) => {
    setMenuOpen(menuOpen === id ? null : id);
  };

  // Handle Edit - Open edit modal with iframe
  const handleEdit = async (blockId) => {
    console.log('Edit block:', blockId);
    setEditBlockId(blockId);
    setIsEditModalOpen(true);
  };

  // Handle Delete initiation
  const handleDelete = (blockId) => {
    setDeleteConfirm(blockId);
  };

  // Confirm Delete - Remove locally + API sync
  const confirmDelete = async () => {
    if (!deleteConfirm) return;

    // Optimistic update
    setSections((prev) => prev.filter((sec) => sec.id !== deleteConfirm));

    try {
      const response = await fetch(`/wp-json/unicorn-builder/v1/page-blocks-delete/${deleteConfirm}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.ubrData?.nonce || ''
        },
      });

      if (!response.ok) {
        toast.error('Delete failed');
        throw new Error('Delete failed');
      }

      toast.success(`Block deleted successfully`);

      //console.log('Deleted successfully');
    } catch (err) {
      console.error('API Delete Error:', err);
      fetchPageBlocks();  // Revert
    }

    setDeleteConfirm(null);
  };

  // Cancel Delete
  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  // On drag end: Reorder locally + API sync
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newSections = arrayMove(items, oldIndex, newIndex);
        return newSections;
      });
    }

    setActiveId(null);  // End overlay

    // Sync to API
    const blockOrder = sections.map(sec => parseInt(sec.id));  // Updated array
    try {
      const response = await fetch(`/wp-json/unicorn-builder/v1/page-blocks-reorder/${currentPageId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-WP-Nonce': window.ubrData?.nonce || ''
        },
        body: JSON.stringify({ block_order: blockOrder })
      });

      if (!response.ok) {
        throw new Error('Reorder failed');
      }
      console.log('Reordered successfully');
    } catch (err) {
      console.error('API Reorder Error:', err);
      fetchPageBlocks();  // Revert
    }
  };

  const handleAddSection = () => {
    setIsModalOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
  };

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSelectBlock = (selectedBlockIds) => {
    fetchPageBlocks();  // Refresh after add
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditBlockId(null);
    fetchPageBlocks();  // Refresh the list after closing edit modal (assuming user saved inside iframe)
  };

  return (
    <>
      {/* Edit Pin Toggle Button - Fixed at top-right */}
      <button
        onClick={handleToggleSidebar}
        className="fixed top-4 right-4 z-[10001] bg-white rounded-full p-2 shadow-lg hover:shadow-xl transition-all duration-200 text-gray-600 hover:text-black focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-50 outline-none border border-gray-200 cursor-pointer"
        aria-label={isSidebarOpen ? "Close Edit Sidebar" : "Open Edit Sidebar"}
      >
        {isSidebarOpen ? (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        )}
      </button>

      <div
        id="sectionsModal"
        className={`fixed inset-y-0 right-0 z-[10000] w-80 bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto h-screen ${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Page Sections</h3>
        </div>

        {/* DndContext wraps the SortableContext */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}  // Lock to vertical (prevents horizontal escape)
        >
          <SortableContext items={sections.map(sec => sec.id)} strategy={verticalListSortingStrategy}>
            <ul className="p-6 space-y-0 divide-y divide-gray-200 flex-1">
              {sections.map((sec) => (
                <SortableItem
                  key={sec.id}
                  id={sec.id}
                  title={sec.title}
                  menuOpen={menuOpen}
                  toggleMenu={toggleMenu}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          </SortableContext>

          {/* Optional Drag Overlay - Mirrors item for smooth preview 
          <DragOverlay>
            {activeId ? (
              <li className="py-3 flex items-center bg-white _border border-gray-300 rounded shadow-lg p-2 w-full max-w-full">
                <span className="mr-3 text-gray-400 cursor-grabbing">☰</span>
                <span className="text-sm text-gray-900 flex-1">{sections.find(s => s.id === activeId)?.title}</span>
              </li>
            ) : null}
          </DragOverlay>
          */}
          
        </DndContext>

        <div className="flex items-center justify-center p-6 border-t border-gray-200">
          <button
            onClick={handleAddSection}
            className="bg-black text-sm text-white px-6 py-3 rounded-full hover:opacity-80 block transition-opacity"
          >
            Add Section
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40"></div>
          <div className="container mx-auto px-4 max-w-[500px]">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 relative">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Delete Section?
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete "<b>{sections.find(s => s.id === deleteConfirm)?.title}</b>"?
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <BlockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={handleSelectBlock}
        pageId={currentPageId}
      />

      <EditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        blockId={editBlockId}
        pageId={currentPageId}
      />
    </>
  );
};

export default Sidebar;