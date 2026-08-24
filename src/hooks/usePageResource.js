import { useEffect, useState } from "react";

const isCancelledResourceError = (error) =>
  error?.cancelled ||
  error?.code === "ERR_CANCELED" ||
  error?.name === "AbortError" ||
  error?.name === "CanceledError";

export default function usePageResource(loader, dependencies = [], initialData = null) {
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState({
    data: initialData,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    queueMicrotask(() => {
      if (!active) return;
      setState((previous) => ({
        ...previous,
        isLoading: previous.data == null || previous.data === initialData,
        error: null,
      }));
    });

    Promise.resolve()
      .then(() => loader({ signal: controller.signal }))
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
        if (active && !isCancelledResourceError(error)) {
          setState((previous) => ({
            data: previous.data ?? initialData,
            isLoading: false,
            error,
          }));
        }
      });

    return () => {
      active = false;
      controller.abort();
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
