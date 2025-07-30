import React, { useState, useEffect } from 'react';

const NotificationToast = ({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose,
  position = 'top-right'
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300); // Animation duration
  };

  if (!isVisible) return null;

  const getToastStyles = () => {
    const baseStyles = `
      fixed z-50 max-w-sm w-full bg-bloomberg-panel border-l-4 p-4 rounded-terminal shadow-lg
      transform transition-all duration-300 ease-in-out
    `;
    
    const positionStyles = {
      'top-right': 'top-4 right-4',
      'top-left': 'top-4 left-4',
      'bottom-right': 'bottom-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
      'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
    };

    const typeStyles = {
      info: 'border-bloomberg-data-info bg-bloomberg-panel',
      success: 'border-bloomberg-data-positive bg-bloomberg-panel',
      warning: 'border-bloomberg-orange bg-bloomberg-panel',
      error: 'border-bloomberg-status-error bg-bloomberg-panel',
      volume_spike: 'border-bloomberg-orange bg-bloomberg-panel'
    };

    const animationStyles = isLeaving 
      ? 'opacity-0 translate-x-full' 
      : 'opacity-100 translate-x-0';

    return `${baseStyles} ${positionStyles[position]} ${typeStyles[type]} ${animationStyles}`;
  };

  const getIcon = () => {
    const icons = {
      info: '📊',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      volume_spike: '🚨'
    };
    return icons[type] || icons.info;
  };

  return (
    <div className={getToastStyles()}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-lg mr-3" role="img" aria-label={type}>
            {getIcon()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-bloomberg-text-primary font-medium leading-5">
            {message}
          </p>
        </div>
        <div className="flex-shrink-0 ml-4">
          <button
            onClick={handleClose}
            className="inline-flex text-bloomberg-text-secondary hover:text-bloomberg-text-primary focus:outline-none focus:text-bloomberg-text-primary transition-colors duration-150 ease-in-out"
            aria-label="Close notification"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Toast Container Component for managing multiple toasts
export const ToastContainer = ({ toasts = [], removeToast }) => {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          className="pointer-events-auto"
          style={{
            transform: `translateY(${index * 70}px)` // Stack toasts
          }}
        >
          <NotificationToast
            {...toast}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    const newToast = {
      id,
      duration: 5000,
      type: 'info',
      position: 'top-right',
      ...toast
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-remove after duration
    if (newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, newToast.duration);
    }

    return id;
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAllToasts = () => {
    setToasts([]);
  };

  // Convenience methods for different toast types
  const toast = {
    info: (message, options = {}) => addToast({ message, type: 'info', ...options }),
    success: (message, options = {}) => addToast({ message, type: 'success', ...options }),
    warning: (message, options = {}) => addToast({ message, type: 'warning', ...options }),
    error: (message, options = {}) => addToast({ message, type: 'error', ...options }),
    volumeSpike: (message, options = {}) => addToast({ 
      message, 
      type: 'volume_spike', 
      duration: 8000, // Longer duration for important alerts
      ...options 
    })
  };

  return {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    toast
  };
};

export default NotificationToast;