import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// =====================================================
// 1. Context
// =====================================================
const RefreshContext = createContext();

export const RefreshProvider = ({ children }) => {
    const [refreshKey, setRefreshKey] = useState(0);

    const refresh = useCallback(() => {
        setRefreshKey(prev => prev + 1);
    }, []);

    return (
        <RefreshContext.Provider value={{ refreshKey, refresh }}>
            {children}
        </RefreshContext.Provider>
    );
};

// =====================================================
// 2. Hook to trigger a refresh (call refresh())
// =====================================================
export const useRefresh = () => {
    const context = useContext(RefreshContext);
    if (!context) {
        throw new Error('useRefresh must be used within a RefreshProvider');
    }
    return context;
};

// =====================================================
// 3. Hook to automatically refetch data on refresh
//    Just replace your useEffect with this.
// =====================================================
export const useAutoRefresh = (fetchFn, dependencies = []) => {
    const { refreshKey } = useRefresh();

    useEffect(() => {
        fetchFn();
        // eslint-disable-next-line
    }, [refreshKey, ...dependencies]);
};