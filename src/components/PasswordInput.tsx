"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// A password field with a show/hide eye icon. Visibility is local to this
// field and resets on reload — nothing about it is remembered.
export default function PasswordInput({
  value,
  onChange,
  placeholder,
  autoComplete,
  required = true,
  minLength,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="w-full rounded-xl border border-slate-300 bg-white p-3 pr-11 text-slate-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      />

      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-400 hover:text-slate-600"
      >
        {visible ? (
          <EyeOff className="h-5 w-5" />
        ) : (
          <Eye className="h-5 w-5" />
        )}
      </button>
    </div>
  );
}
