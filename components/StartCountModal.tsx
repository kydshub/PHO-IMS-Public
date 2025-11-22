import React, { useState, useEffect, useMemo } from 'react';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Button } from './ui/Button';
import { PhysicalCount, User, Facility, StorageLocation, FacilityStatus, Role, InventoryItem } from '../types';
import { buildIndentedLocationOptions } from '../utils/locationHelpers';
import { useConfirmation } from '../hooks/useConfirmation';
import { useAuth } from '../hooks/useAuth';

interface StartCountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (countData: Partial<PhysicalCount>) => void;
  facilities: Facility[];
  storageLocations: StorageLocation[];
  users: User[];
  inventoryItems: InventoryItem[];
}

const StartCountModal: React.FC<StartCountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  facilities,
  storageLocations,
  users,
  inventoryItems,
}) => {
  const { user } = useAuth();
  const isEncoder = user?.role === Role.Encoder;
  const [formData, setFormData] = useState<Partial<PhysicalCount>>({});
  const [selectedFacilityId, setSelectedFacilityId] = useState(isEncoder ? user?.facilityId || '' : '');
  const [itemCount, setItemCount] = useState(0);
  const confirm = useConfirmation();

  const activeFacilities = useMemo(() => facilities.filter(f => f.status === FacilityStatus.Active), [facilities]);
  
  const availableUsers = useMemo(() => {
    const baseUsers = users.filter(u => u.status === 'Active' && (u.role === Role.Admin || u.role === Role.Encoder || u.role === Role.SystemAdministrator));
    
    if (isEncoder && user?.facilityId) {
        return baseUsers.filter(u => u.facilityId === user.facilityId);
    }

    return baseUsers;
  }, [users, user, isEncoder]);

  const availableStorageLocationOptions = useMemo(() => {
    if (!selectedFacilityId) return [];
    const locationsForFacility = storageLocations.filter(sl => sl.facilityId === selectedFacilityId);
    return buildIndentedLocationOptions(locationsForFacility);
  }, [selectedFacilityId, storageLocations]);

  useEffect(() => {
    if (isOpen) {
      const encoderFacilityId = isEncoder ? user?.facilityId || '' : '';
      setFormData({
        name: '',
        facilityId: encoderFacilityId,
        storageLocationId: '',
        assignedToUserId: '',
      });
      setSelectedFacilityId(encoderFacilityId);
      setItemCount(0);
    }
  }, [isOpen, isEncoder, user]);

  useEffect(() => {
    if (formData.storageLocationId) {
      const count = inventoryItems.filter(item => item.storageLocationId === formData.storageLocationId).length;
      setItemCount(count);
    } else {
      setItemCount(0);
    }
  }, [formData.storageLocationId, inventoryItems]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFacilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFacilityId = e.target.value;
    setSelectedFacilityId(newFacilityId);
    setFormData(prev => ({
      ...prev,
      facilityId: newFacilityId,
      storageLocationId: '',
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.facilityId || !formData.storageLocationId || !formData.assignedToUserId) {
      alert('Please fill out all required fields.');
      return;
    }
    if (itemCount === 0) {
        alert('Cannot start a physical count for a location with no items.');
        return;
    }
    
    const assignedUser = users.find(u => u.uid === formData.assignedToUserId);
    const facility = facilities.find(f => f.id === formData.facilityId);
    const locationName = availableStorageLocationOptions.find(o => o.value === formData.storageLocationId)?.label.trim().replace(/^↳\s*/, '');

    const isConfirmed = await confirm({
        title: "Confirm Physical Count Initiation",
        message: (
            <div>
                <p className="mb-4">Please review the details below. Starting this count will freeze all items in the selected location until the count is completed.</p>
                <div className="bg-secondary-50 p-3 rounded-md space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-secondary-600">Count Name:</span><span className="font-medium text-secondary-900">{formData.name}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-600">Facility:</span><span className="font-medium text-secondary-900">{facility?.name}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-600">Location:</span><span className="font-medium text-secondary-900">{locationName}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-600">Assigned To:</span><span className="font-medium text-secondary-900">{assignedUser?.name}</span></div>
                    <div className="flex justify-between"><span className="text-secondary-600">Items to Count:</span><span className="font-medium text-secondary-900">{itemCount}</span></div>
                </div>
            </div>
        ),
        confirmText: "Start Count",
    });

    if (isConfirmed) {
      onSave(formData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Initiate New Physical Count"
      footer={
        <div className="space-x-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={itemCount === 0}>Start Count</Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Count Name"
          name="name"
          value={formData.name || ''}
          onChange={handleChange}
          placeholder="e.g., Q3 2024 - Main Pharmacy"
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Facility"
            value={selectedFacilityId}
            onChange={handleFacilityChange}
            required
            disabled={isEncoder}
          >
            <option value="">Select facility...</option>
            {activeFacilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </Select>
          <Select
            label="Storage Location"
            name="storageLocationId"
            value={formData.storageLocationId || ''}
            onChange={handleChange}
            disabled={!selectedFacilityId}
            required
          >
            <option value="">Select location...</option>
            {availableStorageLocationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </Select>
        </div>

        {formData.storageLocationId && (
          <div className="p-3 bg-secondary-50 border border-secondary-200 rounded-md text-sm text-secondary-700">
            This location contains <strong>{itemCount}</strong> distinct item batches to be counted.
            {itemCount === 0 && <p className="text-red-600 font-semibold mt-1">Warning: This location is empty. You cannot start a count here.</p>}
          </div>
        )}

        <Select
          label="Assign To"
          name="assignedToUserId"
          value={formData.assignedToUserId || ''}
          onChange={handleChange}
          required
        >
          <option value="">Select user to perform count...</option>
          {availableUsers.map(u => <option key={u.uid} value={u.uid}>{u.name} ({u.role})</option>)}
        </Select>
      </form>
    </Modal>
  );
};

export default StartCountModal;