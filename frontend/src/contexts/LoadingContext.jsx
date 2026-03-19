import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';

const LoadingContext = createContext({
  isLoading: false,
  show: () => {},
  hide: () => {},
});

export const LoadingProvider = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const activeCountRef = useRef(0);
  const location = useLocation();
  const interceptorsSet = useRef(false);

  const show = useCallback(() => {
    activeCountRef.current += 1;
    setIsLoading(true);
  }, []);

  const hide = useCallback(() => {
    activeCountRef.current = Math.max(0, activeCountRef.current - 1);
    if (activeCountRef.current === 0) {
      // small delay to prevent flicker for very fast requests
      setTimeout(() => setIsLoading(false), 120);
    }
  }, []);

  const shouldTrackRequest = useCallback((config) => {
    const method = (config?.method || 'get').toLowerCase();
    const url = String(config?.url || '');

    // Allow callers to opt out explicitly for background jobs.
    if (config?.headers?.['X-Skip-Loader'] === 'true' || config?.skipGlobalLoader === true) {
      return false;
    }

    // Ignore noisy background polling endpoints so spinner does not appear repeatedly.
    if (method === 'get' && (
      url.includes('/notifications?') ||
      url.includes('/notifications/read-ids') ||
      url.includes('/presence/')
    )) {
      return false;
    }

    return true;
  }, []);

  // Setup axios interceptors once
  useEffect(() => {
    if (interceptorsSet.current) return;
    const reqId = axios.interceptors.request.use((config) => {
      const track = shouldTrackRequest(config);
      config.__trackedByGlobalLoader = track;
      if (track) show();
      return config;
    }, (error) => {
      if (error?.config?.__trackedByGlobalLoader) hide();
      return Promise.reject(error);
    });

    const resId = axios.interceptors.response.use((response) => {
      if (response?.config?.__trackedByGlobalLoader) hide();
      return response;
    }, (error) => {
      if (error?.config?.__trackedByGlobalLoader) hide();
      return Promise.reject(error);
    });

    interceptorsSet.current = true;

    return () => {
      axios.interceptors.request.eject(reqId);
      axios.interceptors.response.eject(resId);
      interceptorsSet.current = false;
    };
  }, [show, hide, shouldTrackRequest]);

  // Route change loading effect
  useEffect(() => {
    // Trigger loader at route start
    show();
    // Hide after first paint of new route
    const t = requestAnimationFrame(() => {
      // extra debounce to allow components to fetch initial data if any synchronous
      setTimeout(() => hide(), 200);
    });
    return () => cancelAnimationFrame(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search, location.hash]);

  const value = useMemo(() => ({ isLoading, show, hide }), [isLoading, show, hide]);
  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
