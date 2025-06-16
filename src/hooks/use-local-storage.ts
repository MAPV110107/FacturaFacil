import { useState, useEffect, useCallback } from 'react';

type SetValue<T> = (value: T | ((val: T) => T)) => void;

function useLocalStorage<T>(key: string, initialValue: T): [T, SetValue<T>] {
  // Initialize with initialValue to ensure server and initial client render match.
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Client-side effect to read from localStorage and update state.
  useEffect(() => {
    // This check is important to ensure localStorage is only accessed on the client.
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key);
        if (item !== null) { // Check if item exists
          setStoredValue(JSON.parse(item));
        }
        // If item is null (not in localStorage), storedValue remains initialValue, which is correct.
      } catch (error) {
        console.error(`Error reading localStorage key "${key}" in useEffect:`, error);
        // Do not change storedValue from initialValue on error, it's already set to initialValue.
      }
    }
  }, [key]); // Removed initialValue from deps as it should not cause re-read from storage if it changes.

  const setValue: SetValue<T> = useCallback(
    (value) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );
  
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key) {
        if (event.newValue) {
          try {
            setStoredValue(JSON.parse(event.newValue));
          } catch (error) {
             console.error(`Error parsing storage change for key "${key}":`, error);
          }
        } else { // Item was removed or cleared in another tab
          setStoredValue(initialValue);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [key, initialValue]);


  return [storedValue, setValue];
}

export default useLocalStorage;
