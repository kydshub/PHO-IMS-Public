
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import SearchableSelect, { SearchableSelectOption } from '../components/ui/SearchableSelect';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../hooks/useAuth';
import { useConfirmation } from '../hooks/useConfirmation';
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus, Role, Supplier, Facility, FacilityStatus, ItemMaster } from '../types';
import { formatCurrency } from '../utils/formatters';
import { generateControlNumber } from '../utils/helpers';
import { PREFIX_PO } from '../constants';
import { db } from '../services/firebase';
import { logAuditEvent } from '../services/audit';
import { Spinner } from '../components/ui/Spinner';

const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>;
const TrashIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>;

type PurchaseOrderItemRow = Partial<PurchaseOrderItem> & { id: string };

const PurchaseOrderFormPage: React.FC = () => {
    const { poId } = useParams<{ poId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { data, loading } = useDatabase();
    const { suppliers, facilities, itemMasters, purchaseOrders } = data;
    const confirm = useConfirmation();

    const isEditMode = !!poId;
    const isEncoder = user?.role === Role.Encoder;

    const [formData, setFormData] = useState<Partial<PurchaseOrder>>({});
    const [items, setItems] = useState<PurchaseOrderItemRow[]>([{ id: crypto.randomUUID(), itemMasterId: '', orderedQuantity: 0, unitCost: 0, receivedQuantity: 0 }]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (loading) return;

        if (isEditMode) {
            const poToEdit = purchaseOrders.find(p => p.id === poId);
            if (poToEdit) {
                setFormData(poToEdit);
                setItems(poToEdit.items.map(item => ({...item, id: crypto.randomUUID() })));
            } else {
                navigate('/purchase-orders');
            }
        } else {
            setFormData({
                poNumber: '',
                supplierId: '',
                facilityId: isEncoder ? user?.facilityId || '' : '',
                orderDate: new Date().toISOString().split('T')[0],
                notes: '',
            });
            setItems([{ id: crypto.randomUUID(), itemMasterId: '', orderedQuantity: 0, unitCost: 0, receivedQuantity: 0 }]);
        }
    }, [isEditMode, poId, purchaseOrders, isEncoder, user, navigate, loading]);
    
    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleItemChange = (id: string, field: keyof PurchaseOrderItem, value: string | null) => {
        const newItems = items.map(item => {
            if (item.id === id) {
                const newItem = { ...item };
                const numValue = Number(value);
                if (field === 'itemMasterId') {
                    newItem[field] = value || '';
                    const master = itemMasters.find(im => im.id === value);
                    newItem.unitCost = master?.unitCost || 0;
                } else if (!isNaN(numValue)) {
                    (newItem as any)[field] = numValue;
                }
                return newItem;
            }
            return item;
        });
        setItems(newItems);
    };

    const addItemRow = () => setItems([...items, { id: crypto.randomUUID(), itemMasterId: '', orderedQuantity: 0, unitCost: 0, receivedQuantity: 0 }]);
    const removeItemRow = (id: string) => setItems(items.filter(item => item.id !== id));

    const totalValue = useMemo(() => items.reduce((sum, item) => sum + (item.orderedQuantity || 0) * (item.unitCost || 0), 0), [items]);

    const selectedItemIds = useMemo(() => new Set(items.map(i => i.itemMasterId).filter(Boolean)), [items]);

    const itemMasterOptions = useMemo(() => {
        return itemMasters.map(im => ({ 
            value: im.id, 
            label: im.name,
            brand: im.brand || 'N/A'
        }));
    }, [itemMasters]);

    const renderItemMasterOption = (option: SearchableSelectOption, isSelected: boolean) => (
        <div className="flex flex-col">
            <span className="font-semibold block truncate">{option.label}</span>
            {option.brand && <span className={`text-xs ${isSelected ? 'text-primary-100' : 'text-secondary-500'}`}>Brand: {option.brand}</span>}
        </div>
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if(!user || !formData.poNumber || !formData.supplierId || !formData.facilityId || !formData.orderDate || items.some(i => !i.itemMasterId || !i.orderedQuantity || i.orderedQuantity <= 0)) {
            alert("Please fill in all required fields and ensure all items have a valid quantity.");
            return;
        }

        const isConfirmed = await confirm({
            title: isEditMode ? "Confirm Changes" : "Create Purchase Order",
            message: `You are about to ${isEditMode ? 'save changes to' : 'create'} purchase order ${formData.poNumber} with a total value of ${formatCurrency(totalValue)}. Are you sure?`,
            confirmText: isEditMode ? "Save Changes" : "Create PO"
        });

        if(!isConfirmed) return;

        setIsSaving(true);
        const poDataToSave: Omit<PurchaseOrder, 'id' | 'controlNumber' | 'status' | 'createdBy' | 'createdAt'> & { items: PurchaseOrderItem[] } = {
            poNumber: formData.poNumber!,
            supplierId: formData.supplierId!,
            facilityId: formData.facilityId!,
            orderDate: formData.orderDate!,
            notes: formData.notes || '',
            items: items.map(({ id, ...rest }) => rest) as PurchaseOrderItem[],
            totalValue
        };
        
        try {
            if (isEditMode) {
                await db.ref(`purchaseOrders/${poId}`).update(poDataToSave);
                await logAuditEvent(user, 'Purchase Order Update', { poNumber: poDataToSave.poNumber });
            } else {
                const newPORef = db.ref('purchaseOrders').push();
                const newPO: Omit<PurchaseOrder, 'id'> = {
                    ...poDataToSave,
                    controlNumber: generateControlNumber(PREFIX_PO, purchaseOrders.length),
                    status: PurchaseOrderStatus.Pending,
                    createdBy: user.uid,
                    createdAt: new Date().toISOString(),
                };
                await newPORef.set(newPO);
                await logAuditEvent(user, 'Purchase Order Create', { poNumber: newPO.poNumber });
            }
            navigate('/purchase-orders');
        } catch(error) {
            console.error("Error saving PO:", error);
            alert("An error occurred while saving the Purchase Order.");
        } finally {
            setIsSaving(false);
        }
    };
    
    if (loading) return <div className="flex justify-center items-center h-full"><Spinner size="lg" /></div>;

    return (
        <div>
             <div className="flex justify-between items-start mb-6">
                <div>
                    <Button variant="ghost" onClick={() => navigate('/purchase-orders')} className="mb-2 -ml-3 text-secondary-600 hover:text-secondary-900">
                        <BackIcon />
                        <span className="ml-2">Back to Purchase Orders</span>
                    </Button>
                    <h2 className="text-3xl font-semibold text-secondary-800">{isEditMode ? 'Edit Purchase Order' : 'Create New Purchase Order'}</h2>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <Card>
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input label="PO Number" name="poNumber" value={formData.poNumber || ''} onChange={handleFormChange} required autoFocus />
                            <Input label="Order Date" name="orderDate" type="date" value={formData.orderDate || ''} onChange={handleFormChange} required />
                        </div>
                        <Select label="Supplier" name="supplierId" value={formData.supplierId || ''} onChange={handleFormChange} required>
                            <option value="">Select a supplier...</option>
                            {suppliers.filter(s => s.status === 'Active').map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>
                        <Select label="Facility" name="facilityId" value={formData.facilityId || ''} onChange={handleFormChange} required disabled={isEncoder}>
                            {!isEncoder && <option value="">Select a facility...</option>}
                            {facilities.filter(f => f.status === FacilityStatus.Active).map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </Select>
                        <Textarea label="Notes (Optional)" name="notes" value={formData.notes || ''} onChange={handleFormChange} rows={2} />
                    </div>

                    <div className="border-t pt-4 p-6">
                        <h4 className="font-medium text-secondary-800 mb-2">Items</h4>
                        <div className="space-y-2 pr-2">
                            {items.map((item, index) => {
                                const availableOptions = itemMasterOptions.filter(opt => !selectedItemIds.has(opt.value) || opt.value === item.itemMasterId);
                                return (
                                <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2 rounded bg-secondary-50" style={{ zIndex: items.length - index, position: 'relative' }}>
                                    <div className="col-span-12 md:col-span-6"><SearchableSelect options={availableOptions} value={item.itemMasterId || null} onChange={(val) => handleItemChange(item.id, 'itemMasterId', val)} placeholder="Select item..." renderOption={renderItemMasterOption}/></div>
                                    <div className="col-span-6 md:col-span-2"><Input type="number" min="1" value={item.orderedQuantity || ''} onChange={e => handleItemChange(item.id, 'orderedQuantity', e.target.value)} placeholder="Qty" /></div>
                                    <div className="col-span-6 md:col-span-3"><Input type="number" min="0" step="0.01" value={item.unitCost || ''} onChange={e => handleItemChange(item.id, 'unitCost', e.target.value)} placeholder="Unit Cost" /></div>
                                    <div className="col-span-12 md:col-span-1 text-right"><Button type="button" variant="ghost" size="sm" onClick={() => removeItemRow(item.id)} className="text-red-500"><TrashIcon /></Button></div>
                                </div>
                            )})}
                        </div>
                        <Button type="button" variant="secondary" size="sm" onClick={addItemRow} className="mt-2">Add Item</Button>
                    </div>

                     <div className="bg-secondary-50 px-6 py-4 rounded-b-lg flex justify-between items-center">
                        <span className="text-lg font-bold text-secondary-800">Total: {formatCurrency(totalValue)}</span>
                        <div className="space-x-2">
                            <Button variant="secondary" onClick={() => navigate('/purchase-orders')}>Cancel</Button>
                            <Button type="submit" disabled={isSaving}>
                                {isSaving ? <Spinner size="sm"/> : (isEditMode ? 'Save Changes' : 'Create PO')}
                            </Button>
                        </div>
                    </div>
                </Card>
            </form>
        </div>
    );
};

export default PurchaseOrderFormPage;
