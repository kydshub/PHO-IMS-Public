import React from 'react';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  description?: string;
}

export const Textarea: React.FC<TextareaProps> = ({ label, id, description, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-secondary-700 mb-1">{label}</label>}
      {description && <p className="text-xs text-secondary-500 mb-1">{description}</p>}
      <textarea
        id={id}
        className="block w-full px-3 py-2 bg-white text-secondary-900 border border-secondary-300 rounded-md shadow-sm placeholder-secondary-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm disabled:bg-secondary-100 disabled:cursor-not-allowed"
        {...props}
      />
    </div>
  );
};