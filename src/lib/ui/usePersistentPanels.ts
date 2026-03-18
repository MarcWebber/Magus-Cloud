import {useEffect, useState} from 'react';

type PanelState = Record<string, boolean>;

export function usePersistentPanels(storageKey: string, initialState: PanelState) {
    const [state, setState] = useState<PanelState>(() => {
        if (typeof window === 'undefined') {
            return initialState;
        }

        try {
            const raw = window.localStorage.getItem(storageKey);
            if (!raw) {
                return initialState;
            }

            return {
                ...initialState,
                ...(JSON.parse(raw) as PanelState),
            };
        } catch {
            return initialState;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(storageKey, JSON.stringify(state));
        } catch {
        }
    }, [storageKey, state]);

    const toggle = (key: string) => {
        setState((previous) => ({
            ...previous,
            [key]: !previous[key],
        }));
    };

    const collapseAll = () => {
        const next = Object.keys(state).reduce<PanelState>((result, key) => {
            result[key] = true;
            return result;
        }, {});
        setState(next);
    };

    const expandAll = () => {
        const next = Object.keys(state).reduce<PanelState>((result, key) => {
            result[key] = false;
            return result;
        }, {});
        setState(next);
    };

    return {
        state,
        setState,
        toggle,
        collapseAll,
        expandAll,
    };
}
