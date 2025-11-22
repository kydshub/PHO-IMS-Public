# Provincial Health Office Inventory Management System (PHO-IMS) - Unified User Manual

## 1. Introduction

### 1.1 Welcome to the PHO-IMS!

Welcome to the Provincial Health Office Inventory Management System (PHO-IMS). This system is a centralized, real-time platform designed to manage the entire lifecycle of medical supplies, commodities, and equipment across all public health facilities in the province.

The official application can be accessed at: **https://batangas-phoims.net**

### 1.2 The Goal of the PHO-IMS

The primary goal of this project is to modernize and streamline our inventory management processes. By moving from manual, paper-based methods to a unified digital system, we aim to:
*   Enhance efficiency in day-to-day operations.
*   Improve data accuracy and reliability.
*   Increase transparency and accountability.
*   Empower decision-makers with real-time data and analytics.

### 1.3 Problems Solved by the PHO-IMS

This system directly addresses several long-standing challenges in public health logistics:
*   **Lack of Real-Time Visibility:** Eliminates guesswork by providing an up-to-the-minute view of stock levels at every facility.
*   **Manual Tracking Errors:** Replaces paper ledgers and spreadsheets, significantly reducing human error in data entry and calculations.
*   **Stockouts and Expiries:** Proactive alerts for low-stock and expiring items, combined with powerful forecasting tools, help prevent waste and ensure essential supplies are always available.
*   **Inefficient Stock Transfers:** Streamlines the process of moving supplies between facilities with a clear, auditable request and acknowledgment workflow.
*   **Difficult Reporting:** Consolidates data from all facilities, allowing for the instant generation of comprehensive reports for planning, budgeting, and auditing.
*   **Accountability Gaps:** The immutable Audit Trail logs every significant user action, creating a transparent and verifiable record of all inventory movements and system changes.

---

## 2. Getting Started

### 2.1 Logging In

1.  Navigate to **https://batangas-phoims.net** in your web browser.
2.  Enter your assigned **email address** and **password**.
3.  Click the **"Sign In"** button.

### 2.2 First-Time Login: Changing Your Password

For security, you will be required to change your password the very first time you log in.
1.  You will be automatically redirected to a "Set New Password" screen.
2.  Enter a new, secure password that meets all the listed requirements (e.g., length, uppercase, number, special character).
3.  Confirm your new password by typing it again.
4.  Click **"Set New Password"**. The system will then log you in and take you to the main dashboard.

### 2.3 Understanding the Interface

The system is organized into three main areas:
1.  **Sidebar (Left):** This is your main navigation menu. The links you see depend on your assigned role.
2.  **Header (Top):** Shows a welcome message, your user profile, notifications, and the logout button.
3.  **Main Content Area (Center):** This is where you will work. It displays the forms, tables, and dashboards for the module you have selected.

---

## 3. User Roles & Responsibilities

Access to features within the PHO-IMS is determined by your assigned role.

*   **System Administrator:** Has global, unrestricted access to the entire system. Responsible for system-wide configuration, security, data maintenance (like fiscal year rollovers), and managing all user accounts, including other administrators.
*   **Administrator:** A facility-level manager with full control over their assigned facility's inventory, master data, and users. Responsible for initiating and approving physical counts, handling adjustments, and overseeing all local operations.
*   **Encoder:** The primary data entry role. Responsible for the day-to-day recording of all stock movements, including receiving, dispensing, transfers, write-offs, and performing assigned physical counts.
*   **Auditor:** A special read-only role with full, system-wide visibility. Can view all data, reports, and transaction histories across all facilities, and has full access to the Audit Trail to ensure compliance and accountability.
*   **User:** A basic read-only role, typically for personnel who need to check stock levels but do not perform inventory transactions. Access is limited to viewing dashboards and inventory lists for their assigned facility.

---

## 4. Core Modules & Features

This system is organized into several key modules accessible via the sidebar.

### 4.1 Analytics & Reports (`/analytics`)
The central hub for data visualization and insights. It provides an overview of the inventory ecosystem, tailored to your role.
*   **Dashboard:** Displays key metrics like total inventory value, low stock alerts, and expiring items.
*   **Inventory Deep Dive:** Generates detailed reports on stock levels and value.
*   **Forecasting:** Uses historical data to predict future demand and provide reordering recommendations.
*   **Supplier Insights:** Analyzes supplier performance based on metrics like lead time and fill rate.
*   **Facility Performance:** Compares key metrics across different facilities.
*   **Engagement Analytics:** (System Admins only) Provides insights into user activity.

### 4.2 Bulletin Board (`/bulletin-board`)
A digital announcement board where System Administrators can post important information, updates, and memos for all users.

### 4.3 Inventory Module
Contains tools for viewing and managing stock.
*   **PPE (`/inventory/ppe`):** Manages non-consumable, serialized assets (e.g., computers, vehicles).
*   **Commodities (`/inventory/commodities`):** The primary view for all consumable stock (e.g., medicines, supplies).
*   **Physical Counts (`/physical-counts`):** A dedicated module for conducting stocktakes. Administrators initiate a count, Encoders perform it, and Administrators review and approve variances.

### 4.4 Regular Transactions Module
Handles the day-to-day movement of standard, provincially-owned inventory.
*   **Dispense:** Records items issued to patients or departments.
*   **Patient & Ward Returns:** Manages items returned to the inventory.
*   **Purchase Orders:** Create, manage, and track purchase orders sent to suppliers.
*   **Receive:** Records the arrival of new stock from suppliers, which can be linked to a Purchase Order.
*   **Release Order / RIS:** Formal documents for authorizing the release or internal transfer of goods.
*   **Returns to Supplier:** Manages sending items back to a supplier.
*   **Transfers:** Manages the movement of stock between facilities, with an acknowledgment step for the receiving facility.
*   **Write-Offs:** Records the removal of items from inventory due to loss, damage, or expiry.

### 4.5 Consignment Module
A parallel set of pages for handling stock that is owned by a supplier but stored at our facility.
*   **Consignment Stock:** A dedicated view for all consignment items.
*   **Consumption Reports:** Generates reports on used consignment items for supplier billing.
*   Includes specialized pages for **Receiving, Returns, Transfers, and Write-Offs** of consignment goods.

### 4.6 Management Module
The administrative backbone for configuring system data. Access is restricted based on role.
*   **Item Management (PPE & Commodity):** The master list of all products. An item must be defined here before it can be stocked.
*   **Categories, Facilities, Fund Sources, Programs, Service Providers, Suppliers:** Manage the master lists for these core data types.
*   **Settings:** (System Admins only) Configure system-wide settings, data management, and maintenance mode.
*   **User Management:** Create, edit, suspend, and manage all user accounts.

### 4.7 Audit Trail (`/audit-trail`)
(Admins, SysAdmins, & Auditors only) An immutable log of all significant user actions.
*   **Interactive Details:** Click any log entry to view details, including "Before" and "After" comparisons for data changes.
*   **Advanced Filtering & Search:** Filter by user, action, facility, and date.
*   **AI-Powered Analysis:** An "Analyze Activity" feature scans logs for anomalies and provides a summary.

---

## 5. General FAQ

**Q: What is the difference between "Regular" and "Consignment" stock?**
A: **Regular** stock is owned by the Provincial Health Office. **Consignment** stock is owned by a supplier but stored in our facility. It's vital to use the correct transaction pages for each type to ensure accurate accounting.

**Q: I see a mistake in the inventory count or a transaction. What should I do?**
A: If you are an Encoder or User, you cannot edit finalized transactions. Report the discrepancy immediately to your facility's **Administrator**. They have the tools to make corrections via adjustments or reverse transactions.

**Q: The system logged me out automatically. Why?**
A: For security, the system has an automatic session timeout. If you are inactive for a set period, a warning will appear. If you don't respond, you will be logged out to protect your account.

---
End of Manual