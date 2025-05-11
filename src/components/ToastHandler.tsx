import { useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const ToastHandler = () => {
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const success = query.get('success');
    const error = query.get('error');

    if (success) toast.success(success);
    if (error) toast.error(error);

    // Remove query params after showing the toast
    if (success || error) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return <Toaster position="top-center" />;
};

export default ToastHandler;