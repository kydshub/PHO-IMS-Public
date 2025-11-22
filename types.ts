

export enum Role {
  SystemAdministrator = 'System Administrator',
  Admin = 'Admin',
  Encoder = 'Encoder',
  Auditor = 'Auditor',
  User = 'User',
}

export enum UserStatus {
  Active = 'Active',
  Suspended = 'Suspended',
}

export enum FacilityStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

export enum SupplierStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

export enum ItemType {
  Consumable = 'Consumable',
  Equipment = 'Equipment',
  Asset = 'PPE',
}

export enum WriteOffReason {
  Wastage = 'Wastage',
  Stolen = 'Stolen',
}

export enum WastageSubReason {
  Expired = 'Expired',
  Damaged = 'Damaged',
  Contaminated = 'Contaminated',
  Other = 'Other',
}

export enum ReturnReason {
  Expired = 'Expired',
  Damaged = 'Damaged',
  ProductRecall = 'Product Recall',
  Overstock = 'Overstock',
  IncorrectDelivery = 'Incorrect Delivery',
  Other = 'Other',
}

export enum ReturnFromPatientReason {
    PatientDischarged = 'Patient Discharged',
    Unused = 'Unused',
    IncorrectItemDispensed = 'Incorrect Item Dispensed',
    DamagedPackaging = 'Damaged Packaging',
    Other = 'Other',
}

export enum ServiceProviderStatus {
  Active = 'Active',
  Inactive = 'Inactive',
}

export enum ServiceType {
    Maintenance = 'Maintenance & Repair',
    Calibration = 'Equipment Calibration',
    Disposal = 'Waste Disposal',
    Transport = 'Logistics & Transport',
    IT = 'IT Services',
}

export enum AssetStatus {
  InStock = 'In Stock',
  Deployed = 'Deployed',
  InRepair = 'In Repair',
  Borrowed = 'Borrowed',
  Disposed = 'Disposed',
}

export enum TransferStatus {
  Pending = 'Pending',
  Received = 'Received',
  Discrepancy = 'Discrepancy',
}

export enum PhysicalCountStatus {
  Pending = 'Pending',
  InProgress = 'In Progress',
  PendingReview = 'Pending Review',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export enum VarianceReason {
  DataEntryError = 'Data Entry Error',
  UndocumentedDispense = 'Undocumented Dispense',
  UndocumentedReceive = 'Undocumented Receive',
  FoundStock = 'Found Stock',
  Misplaced = 'Misplaced Item',
  Theft = 'Suspected Theft',
  Other = 'Other',
}

export enum AdjustmentReason {
  DataEntryCorrection = 'Data Entry Correction',
  StockSpoilage = 'Stock Spoilage',
  DonationOrSample = 'Donation / Sample',
  InventoryRecount = 'Inventory Recount',
  StockRediscovery = 'Stock Rediscovery',
  UnaccountedLoss = 'Unaccounted Loss',
  Other = 'Other',
}

export enum PurchaseOrderStatus {
  Pending = 'Pending',
  PartiallyReceived = 'Partially Received',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
}

export interface UserPresence {
  isOnline: boolean;
  lastSeen: number; // server timestamp
}

export interface User {
  uid: string;
  name: string;
  email: string;
  position?: string;
  role: Role;
  status: UserStatus;
  facilityId?: string;
  previousRole?: Role; // To store the role before deactivation of a facility
  requiresPasswordChange?: boolean;
}

export interface Facility {
  id: string;
  name: string;
  location: string;
  status: FacilityStatus;
}

export interface StorageLocation {
  id: string;
  name: string;
  facilityId: string;
  parentId?: string; // ID of the parent StorageLocation
}

export interface Category {
  id: string;
  name: string;
}

export interface Program {
  id: string;
  name: string;
  programManagerName: string;
  programManagerEmail: string;
  programManagerContact: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  status: SupplierStatus;
}

export interface ServiceProvider {
  id: string;
  name: string;
  serviceType: ServiceType;
  contactPerson?: string;
  email?: string;
  phone?: string;
  status: ServiceProviderStatus;
}

export interface FundSource {
    id: string;
    name: string;
}

export interface ItemMaster {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  unit: string;
  lowStockThreshold: number | null;
  itemType: ItemType;
  unitCost: number;
  brand?: string;
  manufacturer?: string;
  barcode?: string;
  usefulLife?: number; // For assets
}

export interface InventoryItem {
  id: string; // This is the ID of the stock/batch
  itemMasterId: string;
  quantity: number;
  expiryDate: string; // ISO string format
  batchNumber: string;
  storageLocationId: string;
  programId?: string; // Program can be optional
  supplierId: string;
  purchaseOrder?: string;
  isConsignment?: boolean; // Flag for consignment stock
  fundSourceId?: string;
  icsNumber?: string;
  purchaseCost: number; // The per-unit cost for this specific batch
}

export interface AssetItem {
  id: string; // Unique ID for this specific asset instance
  itemMasterId: string; // Links to the general item type (e.g., "Dell Optiplex Office Computer")
  propertyNumber: string; // The physical property number/sticker on the asset
  serialNumber?: string;
  purchaseDate: string; // ISO string
  acquisitionPrice: number;
  warrantyEndDate?: string; // ISO string
  status: AssetStatus;
  assignedTo?: string; // Could be a person's name, department, or a user ID
  propertyCustodian?: string; // Free-text name of the user responsible for the asset
  condition?: string; // e.g., "New", "Used", "Good", "Needs Repair"
  storageLocationId: string;
  notes?: string;
  fundSourceId?: string;
  usefulLife?: number;
  salvageValue?: number;
}

export interface AuditLog {
  id: string;
  uid: string;
  user: string; // User's email or name
  action: string;
  timestamp: string; // ISO string format
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface Notification {
  id: string;
  userId: string; // The ID of the user who should see this notification
  message: string;
  link: string;
  sourceId?: string; // ID of the source object (e.g., transferId, countId)
  timestamp: string; // ISO String
  isRead: boolean;
}

// Represents an item being transacted (dispensed, transferred, written-off)
export interface TransactionItem {
  inventoryItemId: string;
  quantity: number;
}

// Represents the full information for a newly received item
export interface NewInventoryItemInfo {
  itemMasterId: string;
  quantity: number;
  unitCost: number; // The cost of the item at the time of receiving
  expiryDate: string;
  batchNumber: string;
  fundSourceId?: string;
  icsNumber?: string;
}

export interface AdjustmentLog {
  id: string;
  controlNumber: string;
  inventoryItemId: string;
  itemMasterId: string;
  fromQuantity: number;
  toQuantity: number;
  reason: AdjustmentReason;
  notes?: string;
  userId: string;
  facilityId: string;
  timestamp: string; // ISO string
  isConsignment: boolean;
}

export interface WriteOffLog {
  id: string;
  controlNumber: string;
  items: TransactionItem[];
  reason: WriteOffReason;
  subReason?: WastageSubReason;
  notes?: string;
  userId: string;
  facilityId: string;
  timestamp: string; // ISO string
}

export interface ReturnLog {
  id: string;
  controlNumber: string;
  items: TransactionItem[];
  supplierId: string;
  reason: ReturnReason;
  notes?: string;
  userId: string;
  facilityId: string;
  timestamp: string; // ISO string
  isConsignmentReturn?: boolean;
}

export interface InternalReturnLog {
    id: string;
    controlNumber: string;
    items: TransactionItem[];
    returnedBy: string; // Free-text name of patient or department
    reason: ReturnFromPatientReason;
    originalDispenseId?: string; // Optional link to original dispense log
    notes?: string;
    userId: string;
    facilityId: string;
    timestamp: string; // ISO string
}

export interface RISLog {
  id: string;
  controlNumber: string;
  items: TransactionItem[];
  requestedBy: string;
  purpose: string;
  notes?: string;
  userId: string;
  facilityId: string;
  timestamp: string;
}

export interface ROLog {
  id: string;
  controlNumber: string;
  items: TransactionItem[];
  orderedTo: string;
  purpose: string;
  recommendingApproval: string;
  approvedBy: string;
  notes?: string;
  userId: string;
  facilityId: string;
  timestamp: string;
}

export interface DispenseLog {
  id: string;
  controlNumber: string;
  items: TransactionItem[];
  dispensedTo: string;
  notes?: string;
  userId: string;
  facilityId: string;
  timestamp: string; // ISO string
  isFreeOfCharge?: boolean;
}

export interface ReceiveLog {
  id: string;
  controlNumber: string;
  items: NewInventoryItemInfo[];
  affectedInventoryItemIds: string[]; // Store the IDs of the created/updated inventory items
  supplierId: string;
  purchaseOrderId?: string; // Stores the ID of the PurchaseOrder
  purchaseOrder?: string;
  userId: string;
  facilityId: string;
  storageLocationId: string; // Assuming all items in one transaction go to the same location
  timestamp: string; // ISO string
  isConsignment?: boolean;
}

export interface TransferLog {
  id: string;
  controlNumber: string;
  items: TransactionItem[];
  fromFacilityId: string;
  toFacilityId: string;
  toStorageLocationId: string;
  notes?: string;
  initiatedByUserId: string;
  timestamp: string; // ISO string
  isConsignment?: boolean;
  // New fields for acknowledgement workflow
  status: TransferStatus;
  acknowledgedByUserId?: string;
  acknowledgementTimestamp?: string;
  acknowledgementNotes?: string;
  receivedItems?: TransactionItem[]; // To record actual received items in case of discrepancy
}

export interface ConsignmentConsumptionLog {
    id: string;
    dispenseLogId: string; // Link back to original dispense event
    controlNumber: string;
    supplierId: string;
    items: (TransactionItem & { unitCost: number })[];
    totalValueConsumed: number;
    userId: string; // User who performed the dispense
    facilityId: string;
    timestamp: string; // ISO string
}

export interface PhysicalCountItem {
  inventoryItemId: string; // The ID of the specific batch/item in inventory
  systemQuantity: number;  // The quantity the system had at the start of the count
  countedQuantity?: number | null; // The physically counted quantity
  reasonCode?: VarianceReason; // Reason for any discrepancy
  notes?: string;
}

export interface PhysicalCount {
  id: string;
  name: string;
  facilityId: string;
  storageLocationId: string;
  status: PhysicalCountStatus;
  initiatedByUserId: string;
  initiatedTimestamp: string; // ISO string
  assignedToUserId: string;
  startedTimestamp?: string; // ISO string
  completedTimestamp?: string; // ISO string
  reviewedByUserId?: string;
  reviewedTimestamp?: string; // ISO string
  rejectionNotes?: string; // Reason for sending back for recount
  cancellationTimestamp?: string; // ISO string
  cancelledByUserId?: string;
  items: PhysicalCountItem[];
}

export interface LedgerEntry {
  logId: string; // The ID of the original log entry
  logTable: string; // The table/path of the log (e.g., 'dispenseLogs')
  date: Date;
  type: string;
  reference: string;
  details: string;
  facilityId: string;
  facilityName: string;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  isPurgeable: boolean;
  transactionItems: { inventoryItemId: string; quantity: number }[];
  affectedInventoryItemIds?: string[]; // for receiveLogs
}

export interface PurchaseOrderItem {
  itemMasterId: string;
  orderedQuantity: number;
  unitCost: number;
  receivedQuantity: number;
}

export interface PurchaseOrder {
  id: string;
  controlNumber: string; // Auto-generated internal control number
  poNumber: string; // The actual PO number from the external agency
  supplierId: string;
  facilityId: string;
  orderDate: string; // ISO string
  notes?: string;
  status: PurchaseOrderStatus;
  items: PurchaseOrderItem[];
  totalValue: number;
  createdBy: string; // uid
  createdAt: string; // ISO string
}

export interface BulletinPage {
  id: string;
  title: string;
  content: string;
  order: number;
}
