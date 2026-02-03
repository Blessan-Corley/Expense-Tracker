import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { createPortal } from 'react-dom';

const ConfirmModal = ({
  isOpen,
  title = 'Please Confirm',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDanger = false,
  isLoading = false
}) => {
  const confirmClasses = isDanger
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-blue-600 hover:bg-blue-700 text-white';

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 12 }}
            className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6"
            role="dialog"
            aria-modal="true"
          >
            <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
              isDanger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
            }`}>
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">{title}</h3>
            <p className="text-sm text-gray-600 text-center mb-6">{message}</p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                {cancelText}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isLoading}
                className={`flex-1 px-4 py-2 rounded-xl font-semibold transition-colors ${confirmClasses} disabled:opacity-60`}
              >
                {isLoading ? 'Please wait...' : confirmText}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(modal, document.body);
};

export default ConfirmModal;
