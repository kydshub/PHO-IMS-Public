
import React from 'react';
import { Modal } from './Modal';
import { Button } from './Button';

interface ImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrls: string[];
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, imageUrls }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Attached Photos"
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
        {imageUrls.map((url, index) => (
          <a href={url} target="_blank" rel="noopener noreferrer" key={index}>
            <img 
              src={url} 
              alt={`Attachment ${index + 1}`} 
              className="w-full h-auto object-cover rounded-lg border shadow-sm hover:shadow-md transition-shadow" 
            />
          </a>
        ))}
      </div>
    </Modal>
  );
};
