import { useEffect, useRef, useState } from "react";

type SelectValue = string | number;

type CustomSelectOption<T extends SelectValue> = {
  label: string;
  value: T;
};

type CustomSelectProps<T extends SelectValue> = {
  label: string;
  value: T;
  options: CustomSelectOption<T>[];
  onChange: (value: T) => void;
  className?: string;
};

export default function CustomSelect<T extends SelectValue>({
  label,
  value,
  options,
  onChange,
  className = "",
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className={`field custom-select-field ${className}`} ref={wrapperRef}>
      <span>{label}</span>

      <button
        type="button"
        className={
          isOpen ? "custom-select-trigger open" : "custom-select-trigger"
        }
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span>{selectedOption?.label ?? "Select"}</span>

        <svg
          className="custom-select-caret"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isOpen ? (
        <div className="custom-select-menu">
          {options.map((option) => (
            <button
              type="button"
              key={String(option.value)}
              className={
                option.value === value
                  ? "custom-select-option selected"
                  : "custom-select-option"
              }
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span>{option.label}</span>

              {option.value === value ? (
                <span className="checkmark">✓</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
