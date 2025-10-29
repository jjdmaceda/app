import React from 'react';
import { ToastContainer } from 'react-toastify';  // New import
import ReactDOM from 'react-dom/client';
import Sidebar from './components/Sidebar';
import BlockModal from './components/BlockModal';
import './index.css';

// Mount Sidebar to #sidebar-root
const sidebarRoot = document.getElementById('ubr-sidebar-root');
if (sidebarRoot) {
  const sidebarApp = ReactDOM.createRoot(sidebarRoot);
  sidebarApp.render(
    <>
      <Sidebar />
      <ToastContainer
        position="top-right"  // Or "bottom-right", etc.
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"  // Or "dark", "colored"
      />
    </>
  );
}

// Mount Modal (triggered via global event or prop)
let modalRoot = null;
window.openBlockModal = (isOpen, onSelect) => {
  const modalContainer = document.getElementById('ubr-modal-root');
  if (modalContainer) {
    if (!modalRoot) modalRoot = ReactDOM.createRoot(modalContainer);
    modalRoot.render(<BlockModal isOpen={isOpen} onClose={() => window.openBlockModal(false, () => {})} onSelect={onSelect} />);
  }
};