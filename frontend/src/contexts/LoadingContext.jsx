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

  // Setup axios interceptors once
  useEffect(() => {
    if (interceptorsSet.current) return;
    const reqId = axios.interceptors.request.use((config) => {
      show();
      return config;
    }, (error) => {
      hide();
      return Promise.reject(error);
    });

    const resId = axios.interceptors.response.use((response) => {
      hide();
      return response;
    }, (error) => {
      hide();
      return Promise.reject(error);
    });

    interceptorsSet.current = true;

    return () => {
      axios.interceptors.request.eject(reqId);
      axios.interceptors.response.eject(resId);
      interceptorsSet.current = false;
    };
  }, [show, hide]);

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
