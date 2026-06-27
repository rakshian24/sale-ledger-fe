import { useEffect, useState } from "react";

export const useLocalStorage = <T,>(
  key: string,
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const storedValue = window.localStorage.getItem(key);

      if (storedValue) {
        return JSON.parse(storedValue) as T;
      }

      return initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Unable to save localStorage value", error);
    }
  }, [key, value]);

  return [value, setValue];
};
