# Changelog

## [1.0.0] - 2024-07-29

### Initial Release: Provincial Health Office Inventory Management System (PHO-IMS)

This marks the official stable release of the PHO-IMS, a comprehensive web application designed to manage the entire lifecycle of medical supplies, commodities, and assets for the Provincial Health Office.

---

### Detailed Feature Breakdown

This system is organized into several key modules accessible via the sidebar navigation. Below is a detailed description of each page and its functionality.

#### 1. Analytics & Reports (`/analytics`)
The central hub for data visualization and insights. It provides a high-level overview of the entire inventory ecosystem.
- **Dashboard:** Displays key performance indicators (KPIs) such as total inventory value, low stock alerts, and expiring items. The view is tailored to the user's role, showing system-wide data for administrators and facility-specific data for encoders.
- **Inventory Deep Dive:** Generates detailed reports on stock levels, value by category, and lists of overstocked or low-stock items.
- **Forecasting:** Utilizes historical consumption data to predict future demand, estimate when stock will run out, and provide reordering recommendations. Includes an AI-powered analysis for deeper insights.
- **Supplier Insights:** Analyzes supplier performance based on metrics like lead time, order fill rate, and return rates.
- **Facility Performance:** Compares key metrics like stockout rates and inventory turnover across different facilities.
- **Engagement Analytics:** (System Admins only) Provides insights into user activity and system usage patterns.

#### 2. Bulletin Board (`/bulletin-board`)
A digital announcement board where System Administrators can post important information, updates, and memos for all system users to see.

#### 3. Inventory Module
Contains tools for viewing and managing physical stock levels.
- **PPE (`/inventory/ppe`):** Manages non-consumable, serialized assets (e.g., computers, vehicles, expensive medical equipment). This page tracks individual units by property number, status (In Stock, Deployed, In Repair), assigned custodian, and calculates depreciation.
- **Commodities (`/inventory/commodities`):** The primary view for all consumable stock (e.g., medicines, medical supplies). It displays quantities, batch numbers, expiry dates, and locations for each item batch. From here, users can access the detailed supply ledger for any item.
- **Physical Counts (`/physical-counts`):** A dedicated module for conducting stocktakes. Administrators can initiate a count for a specific location, which freezes the inventory to prevent transactions. Assigned personnel can then perform the count, and a manager can review and approve any variances, automatically adjusting the system's records.

#### 4. Regular Transactions Module
Handles the day-to-day movement of standard, provincially-owned inventory.
- **Dispense (`/dispense`):** Records the issuance of items to patients, departments, or other end-users.
- **Patient & Ward Returns (`/returns-internal`):** Manages items returned to the inventory from patients (e.g., upon discharge) or hospital wards. This transaction increases stock levels and can optionally be linked to an original dispense voucher to track returns against issues.
- **Purchase Orders (`/purchase-orders`):** A complete workflow for creating, managing, and tracking purchase orders sent to suppliers. It tracks which items have been fully or partially received.
- **Receive (`/receiving`):** Records the arrival of new stock from suppliers, which can be linked to a specific Purchase Order.
- **Release Order (`/release-order`):** A formal document authorizing the release of goods.
- **Returns to Supplier (`/returns`):** Manages the process of sending items back to a supplier due to damage, expiry, or recall.
- **RIS (`/ris`):** (Requisition and Issuance Slip) A formal internal transaction for requesting and issuing supplies between departments within a facility.
- **Transfers (`/transfers`):** Manages the movement of stock from one facility to another. The process includes an acknowledgment step where the receiving facility confirms what was received, flagging any discrepancies.
- **Write-Offs (`/write-offs`):** Records the removal of items from inventory due to loss, damage, expiry, or other reasons.

#### 5. Consignment Module
A parallel set of transaction pages specifically designed for handling stock that is owned by a supplier but stored at the facility.
- **Consignment Stock (`/consignment/inventory`):** A dedicated view for all consignment items.
- **Consignment Receiving (`/consignment/receiving`):** Records the arrival of new consignment stock.
- **Consumption Reports (`/consignment/reports`):** Generates reports detailing which consignment items have been used (dispensed, written-off, etc.). This is crucial for accurately reporting consumption to suppliers for billing.
- **Consignment Returns, Transfers, Write-Offs:** Specialized versions of the regular transaction pages, ensuring consignment stock is handled and logged separately.

#### 6. Management Module
The administrative backbone of the system where master data is configured.
- **PPE Management (`/ppe-management`):** Defines the *types* of assets (e.g., "Dell Optiplex 7010 Desktop") before individual units can be added to the inventory.
- **Commodity Management (`/items`):** The master list of all consumable items. An item must be defined here (e.g., "Paracetamol 500mg Tablet") before it can be received into stock.
- **Categories (`/categories`):** Allows administrators to create and manage categories (e.g., "Pharmaceuticals," "Office Supplies") to organize items.
- **Facilities (`/facilities`):** Manage the list of hospitals, clinics, and offices in the system. From here, administrators can also manage the specific storage locations (e.g., "Main Pharmacy," "Warehouse A") within each facility.
- **Fund Sources (`/fund-sources`):** Manage the list of funding sources used for procurement.
- **Programs (`/programs`):** Manage health programs (e.g., "National Immunization Program") that items can be allocated to for tracking.
- **Service Providers (`/service-providers`):** Manage vendors for services like equipment maintenance, calibration, or waste disposal.
- **Suppliers (`/suppliers`):** Manage the master list of suppliers who provide goods.
- **Settings (`/settings`):** (System Admins only) A comprehensive panel to configure system-wide settings, including application branding, security timeouts, feature toggles (e.g., enabling/disabling chat), data management (fiscal year rollovers, data purges), and maintenance mode.
- **User Management (`/users`):** Create, edit, suspend, and manage all user accounts, assigning them specific roles and facility access.

#### 7. Audit Trail (`/audit-trail`)
(Admins & Auditors only) An intelligent and interactive log that records all significant user actions.
- **Interactive Details**: Click any log entry to view a detailed modal, including "Before" and "After" comparisons for data modifications.
- **Advanced Filtering & Search**: Filter by user, action type, facility, and date range. A full-text search allows querying against log details.
- **AI-Powered Analysis**: An "Analyze Activity" feature uses the Gemini API to scan the current log view for anomalies, unusual patterns, or potential security risks, providing a concise summary and actionable insights.
- **User Activity Trace**: Click on any user's name to instantly filter the entire log to just their activities.