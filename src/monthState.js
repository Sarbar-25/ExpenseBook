import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import { currentMonthKey } from "./utils";


const MonthFilterContext = createContext(null);

const STORAGE_KEY = "expensebook_selectedMonth";

function safeReadSelectedMonth() {
    try {
        if (typeof window === "undefined" || !window.localStorage) return currentMonthKey();
        const v = window.localStorage.getItem(STORAGE_KEY);
        return v || currentMonthKey();
    } catch {
        return currentMonthKey();
    }
}

export function MonthProvider({ children }) {
    const [selectedMonth, setSelectedMonth] = useState(() => safeReadSelectedMonth());

    useEffect(() => {
        try {
            window?.localStorage?.setItem(STORAGE_KEY, selectedMonth);
        } catch {
            // ignore
        }
    }, [selectedMonth]);

    const value = useMemo(() => ({ selectedMonth, setSelectedMonth }), [selectedMonth]);

    return (
        // Avoid JSX so Vite can parse this file even if extension remains .js
        React.createElement(
            MonthFilterContext.Provider,
            { value },
            children
        )
    );
}


export function useMonth() {
    const ctx = useContext(MonthFilterContext);
    if (!ctx) throw new Error("useMonth must be used within MonthProvider");
    return ctx;
}

