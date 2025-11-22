import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { StorageLocation, InventoryItem, Facility, AssetItem } from '../types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { DeleteConfirmationModal } from '../components/ui/DeleteConfirmationModal';
import { logAuditEvent } from '../services/audit';
import { Spinner } from '../components/ui/Spinner';
import { db } from '../services/firebase';
import { buildIndentedLocationOptions } from '../utils/locationHelpers';

// Icons
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const EditIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

interface LocationNode extends StorageLocation {
  children: LocationNode[];
  level: number;
}

const buildLocationTree = (locations: StorageLocation[]): LocationNode[] => {
    const tree: LocationNode[] = [];
    const map = new Map<string, LocationNode>();

    locations.forEach(loc => map.set(loc.id, { ...loc, children: [], level: 0 }));
    locations.forEach(loc => {
        if (loc.parentId && map.has(loc.parentId)) {
            map.get(loc.parentId)!.children.push(map.get(loc.id)!);
        } else {
            tree.push(map.get(loc.id)!);
        }
    });
    
    const flattened: LocationNode[] = [];
    const flatten = (nodes: LocationNode[], level: number) => {
        nodes.sort((a, b) => a.name.localeCompare(b.name)).forEach(node => {
            node.level = level;
            flattened.push(node);
            if (node.children.length > 0) {
                flatten(node.children, level + 1);
            }
        });
    };
    flatten(tree.sort((a, b) => a.name.localeCompare(b.name)), 0);

    return flattened;
};

const StorageLocationManagement: React.FC = () => {
    const { facilityId } = useParams<{ facilityId: string }>();
    const navigate = useNavigate();
    const { data, loading } = useDatabase();
    const { user } = useAuth();
    const { facilities, storageLocations, inventoryItems, assetItems } = data;

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
    const [locationToDelete, setLocationToDelete] = useState<StorageLocation | null>(null);
    
    const facility = useMemo(() => facilities.find(f => f.id === facilityId), [facilities, facilityId]);
    const locationsForFacility = useMemo(() => storageLocations.filter(loc => loc.facilityId === facilityId), [storageLocations, facilityId]);
    const locationTree = useMemo(() => buildLocationTree(locationsForFacility), [locationsForFacility]);

    const itemsInLocationMap = useMemo(() => {
        const map = new Map<string, number>();
        inventoryItems.forEach(item => {
            map.set(item.storageLocationId, (map.get(item.storageLocationId) || 0) + 1);
        });
        assetItems.forEach(item => {
            map.set(item.storageLocationId, (map.get(item.storageLocationId) || 0) + 1);
        });
        return map;
    }, [inventoryItems, assetItems]);

    if (loading) return <div className="p-8 text-center"><Spinner size="lg" /></div>;
    if (!facility) return <div className="p-8 text-center">Facility not found.</div>;
    
    const openAddModal = () => { setEditingLocation(null); setIsModalOpen(true); };
    const openEditModal = (location: StorageLocation) => { setEditingLocation(location); setIsModalOpen(true); };
    const openDeleteModal = (location: StorageLocation) => { setLocationToDelete(location); setIsDeleteModalOpen(true); };
    
    const closeModal = () => {
        setIsModalOpen(false);
        setEditingLocation(null);
    };

    const handleSaveLocation = async (locationData: { name: string; parentId?: string }) => {
        if (!user || !locationData.name.trim()) {
            alert('Location name cannot be empty.');
            return;
        }

        if (editingLocation) {
            const locationRef = db.ref(`storageLocations/${editingLocation.id}`);
            await locationRef.update({
                name: locationData.name,
                parentId: locationData.parentId || null
            });
            await logAuditEvent(user, 'Storage Location Update', { locationName: locationData.name, facilityName: facility.name });
        } else {
            const locationsListRef = db.ref('storageLocations');
            const newLocation: Omit<StorageLocation, 'id'> = {
                name: locationData.name,
                facilityId: facility.id,
                ...(locationData.parentId && { parentId: locationData.parentId })
            };
            
            await locationsListRef.push(newLocation);
            await logAuditEvent(user, 'Storage Location Create', { locationName: newLocation.name, facilityName: facility.name });
        }
        closeModal();
    };

    const confirmDeleteLocation = async () => {
        if (!locationToDelete || !user) return;

        if (itemsInLocationMap.has(locationToDelete.id)) {
            alert("Cannot delete this location because it contains items.");
            setIsDeleteModalOpen(false);
            setLocationToDelete(null);
            return;
        }
        if (locationTree.some(loc => loc.parentId === locationToDelete.id)) {
            alert("This location cannot be deleted because it has sub-locations. Please ensure all child locations are empty of inventory and have been deleted before removing this parent location.");
            setIsDeleteModalOpen(false);
            setLocationToDelete(null);
            return;
        }
        
        const locationRef = db.ref(`storageLocations/${locationToDelete.id}`);
        await locationRef.remove();
        await logAuditEvent(user, 'Storage Location Delete', { locationName: locationToDelete.name, facilityName: facility.name });
        setIsDeleteModalOpen(false);
        setLocationToDelete(null);
    };
    
    return (
        <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                <div>
                    <Button variant="ghost" onClick={() => navigate('/facilities')} className="mb-2 -ml-3 text-secondary-600 hover:text-secondary-900">
                        <BackIcon />
                        <span className="ml-2">Back to Facility List</span>
                    </Button>
                    <h2 className="text-3xl font-semibold text-secondary-800">Storage Locations</h2>
                    <p className="text-secondary-600">For facility: <span className="font-semibold">{facility.name}</span></p>
                </div>
                <Button onClick={openAddModal} leftIcon={<PlusIcon />}>Add New Location</Button>
            </div>

            <Card>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-secondary-200">
                         <thead className="bg-secondary-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Location Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider">Items Stored</th>
                                <th className="relative px-6 py-3"><span className="sr-only">Actions</span></th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-secondary-200">
                           {locationTree.map(loc => {
                                const hasItems = (itemsInLocationMap.get(loc.id) || 0) > 0;
                                const hasChildren = locationTree.some(l => l.parentId === loc.id);
                                const isDisabled = hasItems || hasChildren;
                                let title = "Delete Location";
                                if (isDisabled) {
                                    const reasons = [];
                                    if (hasItems) reasons.push("it contains items");
                                    if (hasChildren) reasons.push("it has sub-locations");
                                    title = `Cannot delete: ${reasons.join(' and ')}.`;
                                }
                                return (
                                <tr key={loc.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-secondary-900" style={{ paddingLeft: `${1.5 + loc.level * 1.5}rem`}}>
                                        {loc.level > 0 && <span className="mr-2 text-secondary-400">↳</span>}
                                        {loc.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-secondary-500">{itemsInLocationMap.get(loc.id) || 0}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-1">
                                        <Button variant="ghost" size="sm" onClick={() => openEditModal(loc)}><EditIcon/></Button>
                                        <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-100" onClick={() => openDeleteModal(loc)} disabled={isDisabled} title={title}><TrashIcon/></Button>
                                    </td>
                                </tr>
                                )
                           })}
                        </tbody>
                    </table>
                    {locationTree.length === 0 && <p className="text-center p-8 text-secondary-500">No storage locations have been added for this facility yet.</p>}
                </div>
            </Card>

            {isModalOpen && (
                <LocationFormModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSaveLocation}
                    location={editingLocation}
                    allLocations={locationsForFacility}
                />
            )}
             <DeleteConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDeleteLocation}
                itemName={locationToDelete?.name || ''}
                itemType="storage location"
            />
        </div>
    );
};

interface LocationFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { name: string; parentId?: string }) => void;
    location: StorageLocation | null;
    allLocations: StorageLocation[];
}

const LocationFormModal: React.FC<LocationFormModalProps> = ({ isOpen, onClose, onSave, location, allLocations }) => {
    const [name, setName] = useState('');
    const [parentId, setParentId] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            setName(location?.name || '');
            setParentId(location?.parentId || '');
        }
    }, [isOpen, location]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ name, parentId });
    };

    const locationOptions = useMemo(() => {
        let availableLocations = allLocations;

        if (location) {
            const descendantIds = new Set<string>();
            const findDescendants = (currentParentId: string) => {
                allLocations.forEach(loc => {
                    if (loc.parentId === currentParentId) {
                        descendantIds.add(loc.id);
                        findDescendants(loc.id);
                    }
                });
            };
            
            descendantIds.add(location.id);
            findDescendants(location.id);

            availableLocations = allLocations.filter(loc => !descendantIds.has(loc.id));
        }

        return buildIndentedLocationOptions(availableLocations);
    }, [allLocations, location]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={location ? "Edit Location" : "Add Location"}
            footer={
                <div className="space-x-2">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit}>{location ? "Save Changes" : "Create Location"}</Button>
                </div>
            }
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Location Name" value={name} onChange={e => setName(e.target.value)} required autoFocus />
                <Select label="Parent Location (Optional)" value={parentId} onChange={e => setParentId(e.target.value)}>
                    <option value="">None (Top-Level Location)</option>
                    {locationOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </Select>
            </form>
        </Modal>
    );
};


export default StorageLocationManagement;