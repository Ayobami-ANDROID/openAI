import React, { useState, ChangeEvent } from 'react'
interface FloatingLabelInputProps {
    id: string;
    label: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel';
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement>) => void;
    required?: boolean;
    name: string;
    error?: string;
    disabled?: boolean;
}

const FloatingInput: React.FC<FloatingLabelInputProps> = (
    {
        id,
        label,
        type = 'text',
        value,
        onChange,
        required = false,
        name,
        error,
        disabled = false,
    }
) => {
    const [isFocused, setIsFocused] = useState<boolean>(false);

    const handleFocus = (): void => setIsFocused(true);
    const handleBlur = (): void => setIsFocused(false);

    const isActive = isFocused || value;
    return (
        <div className="relative w-[350px] text-[#000]">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        name={name}
        required={required}
        disabled={disabled}
        className={`
          peer
          w-full
          h-12
          px-4
          pt-5
          pb-2
          text-base
          bg-white
          border
          rounded-md
          outline-none
          transition-all
          duration-200
          disabled:bg-gray-50
          disabled:cursor-not-allowed
          ${error 
            ? 'border-red-500 focus:border-red-500' 
            : isActive 
              ? 'border-green-500 focus:border-green-500' 
              : 'border-gray-300 focus:border-green-500'
          }
        `}
        placeholder=" "
      />
      <label
        htmlFor={id}
        className={`
          absolute
          left-3
          transition-all
          duration-200
          transform
          -translate-y-1/2
          bg-white
          px-1
          pointer-events-none
          ${error
            ? 'text-red-500'
            : isActive 
              ? '-top-0.5 text-xs text-green-500' 
              : 'top-1/2 text-base text-gray-500'
          }
          peer-focus:-top-0.5
          peer-focus:text-xs
          ${error 
            ? 'peer-focus:text-red-500' 
            : 'peer-focus:text-green-500'
          }
          peer-placeholder-shown:top-1/2
          peer-placeholder-shown:text-base
          peer-placeholder-shown:text-gray-500
          peer-disabled:text-gray-400
        `}
      >
        {label}
      </label>
      {error && (
        <span className="text-red-500 text-xs mt-1 absolute left-0 -bottom-5">
          {error}
        </span>
      )}
    </div>
    )
}

export default FloatingInput