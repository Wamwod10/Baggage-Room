import { useEffect, useState } from "react";

const LOADING_DELAY = 140;

export default function usePageResource(loader, dependencies = [], initialData = null) {
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState({
    data: initialData,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;

    const loadingTimer = window.setTimeout(() => {
      if (active) {
        setState((prev) => ({
          ...prev,
          isLoading: prev.data === initialData,
          error: null,
        }));
      }
    }, 0);

    const timer = window.setTimeout(() => {
      Promise.resolve()
        .then(loader)
        .then((data) => {
          if (active) {
            setState({
              data,
              isLoading: false,
              error: null,
            });
          }
        })
        .catch((error) => {
          if (active) {
            setState({
              data: initialData,
              isLoading: false,
              error,
            });
          }
        });
    }, LOADING_DELAY);

    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, retryKey]);

  return {
    data: state.data,
    isLoading: state.isLoading,
    error: state.error,
    retry: () => setRetryKey((value) => value + 1),
  };
}
