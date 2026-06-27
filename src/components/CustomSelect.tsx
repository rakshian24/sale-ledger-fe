import { useEffect, useRef, useState } from "react";

type SelectOption = {
  label: string;
  value: number;
};

type CustomSelectProps = {
  label: string;
  value: number;
  options: SelectOption[];
  onChange: (value: number) => void;
};

export default function CustomSelect({
  label,
  value,
  options,
  onChange,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement | null>(null);

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        selectRef.current &&
        !selectRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelect = (nextValue: number) => {
    onChange(nextValue);
    setIsOpen(false);
  };

  return (
    <div className="field custom-select-field" ref={selectRef}>
      <span>{label}</span>

      <button
        type="button"
        className={`custom-select-trigger ${isOpen ? "open" : ""}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span>{selectedOption?.label}</span>
        <svg
          className="custom-select-caret"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
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
        <div className="custom-select-menu" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value;

            return (
              <button
                key={option.value}
                type="button"
                className={`custom-select-option ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => handleSelect(option.value)}
                role="option"
                aria-selected={isSelected}
              >
                <span>{option.label}</span>

                {isSelected ? <span className="checkmark">✓</span> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
