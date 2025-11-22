import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Input: React.FC<InputProps> = ({ label, id, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-secondary-700 mb-1">{label}</label>}
      <input
        id={id}
        className="block w-full px-3 py-2 bg-secondary-50 border border-secondary-300 text-secondary-900 placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md disabled:bg-secondary-200 disabled:text-secondary-500 disabled:cursor-not-allowed read-only:bg-secondary-100"
        {...props}
      />
    </div>
  );
};
