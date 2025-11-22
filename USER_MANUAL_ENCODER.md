# PHO Inventory Management System: User Manual for Encoders

## 1. Introduction

### 1.1 Welcome to the PHO-IMS!

Welcome to the Provincial Health Office Inventory Management System (PHO-IMS). This system is designed to help us manage our medical supplies, commodities, and equipment efficiently and accurately.

This manual is your guide to using the PHO-IMS as an **Encoder**. Your role is crucial to the success of our inventory system. You are responsible for the day-to-day data entry of all stock movements, ensuring that the information in our system accurately reflects the physical inventory in our facilities.

### 1.2 Your Primary Responsibilities:

*   Recording all incoming stock (Receiving).
*   Documenting all outgoing stock (Dispensing, Transfers, Write-Offs, etc.).
*   Performing physical inventory counts when assigned.
*   Viewing stock levels and item information.
*   Maintaining accurate records for all transactions you perform.

---

## 2. Getting Started

### 2.1 Logging In

1.  Navigate to the application's web address: **https://batangas-phoims.net**
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

1.  **Sidebar (Left):** This is your main navigation menu. It contains links to all the modules and pages you have access to.
2.  **Header (Top):** Shows a welcome message, your user profile, notifications, and the logout button.
3.  **Main Content Area (Center):** This is where you will work. It displays the forms, tables, and dashboards for the module you have selected from the sidebar.

---

## 3. Core Modules & Tasks

As an Encoder, your work will primarily be in the **Inventory** and **Transactions** modules.

### 3.1 Analytics & Reports

The first page you see after logging in is the **Dashboard**. It provides a quick overview of key inventory metrics for **your assigned facility**. You can see:
*   Total value of commodities and equipment.
*   Alerts for low-stock items.
*   Alerts for items nearing their expiration date.
*   The number of incoming transfers awaiting your acknowledgment.

### 3.2 Bulletin Board

This is a digital announcement board. Check here for important updates, memos, and information from the System Administrators.

### 3.3 Inventory Module

This module is primarily for viewing the status of the inventory.

*   **PPE (`/inventory/ppe`):** View the list of all non-consumable, serialized assets like computers, vehicles, and expensive medical equipment.
*   **Commodities (`/inventory/commodities`):** View the current stock levels of all consumable items like medicines and supplies. You can see quantities, batch numbers, expiry dates, and locations.
*   **Physical Counts (`/physical-counts`):** When an Administrator initiates a stock count and assigns it to you, it will appear here.
    *   **To Perform a Count:** Click the **"Start Count"** or **"Continue Count"** button next to an assigned count. You will be taken to a page where you can enter the physically counted quantities for each item in the specified location.

### 3.4 Regular Transactions Module (Your Primary Workspace)

This is where you will record the day-to-day movement of provincially-owned inventory.

**General Steps for Transactions:**
1.  Navigate to the correct transaction type from the sidebar (e.g., "Dispense").
2.  Fill in the **Voucher Details** at the top (e.g., who the items are for, the reason, etc.). A unique **Control Number** is automatically generated.
3.  In the **Items** section, click **"Add Another Item"** to create rows for each item in the transaction.
4.  For each row, search for and select the specific item batch from the dropdown list.
5.  Enter the correct **quantity** for the transaction. The system will prevent you from entering a quantity greater than the available stock.
6.  Once all details and items are added, click the final button (e.g., **"Record Dispensation"** or **"Initiate Transfer"**).
7.  A confirmation pop-up will appear. Review the details carefully before confirming.

**Specific Transaction Pages:**
*   **Dispense (`/dispense`):** For issuing items to patients, departments, or other end-users.
*   **Patient & Ward Returns (`/returns-internal`):** For processing items returned from a patient or hospital ward back into the inventory.
*   **Purchase Orders (`/purchase-orders`):** For creating and tracking orders sent to suppliers.
*   **Receive (`/receiving`):** For recording the arrival of new stock from a supplier. You can link this to an existing Purchase Order.
*   **Release Order (`/release-order`):** For creating a formal Release Order document.
*   **Returns to Supplier (`/returns`):** For recording items being sent back to the original supplier.
*   **RIS (`/ris`):** (Requisition and Issuance Slip) For handling formal internal requests and issuances between departments.
*   **Transfers (`/transfers`):**
    *   **Initiating:** For sending stock from your facility to another.
    *   **Acknowledging:** If another facility sends stock to you, the pending transfer will appear in the "Transfer History" table. You **must** click the **"Acknowledge"** button to confirm receipt. In the pop-up modal, verify the quantities you actually received. If there's a difference, correct the number, and the system will flag a discrepancy.
*   **Write-Offs (`/write-offs`):** For recording items that are lost, damaged, expired, or otherwise removed from inventory without being dispensed.

### 3.5 Consignment Module

This module works exactly like the "Regular Transactions" module but is used **exclusively for consignment items**—stock that is stored at your facility but is still owned by the supplier. Using the correct pages is critical for accurate reporting.

*   **Consignment Stock (`/consignment/inventory`):** View all consignment items.
*   **Consignment Receiving:** Record the arrival of new consignment stock.
*   **Consignment Returns, Transfers, Write-Offs:** Use these pages for all movements of consignment stock.

### 3.6 Management Module (Limited Access)

As an Encoder, your access here is limited to viewing master lists to help you select the correct items during transactions.
*   **PPE Management (`/ppe-management`):** View the master list of all defined PPE types.
*   **Commodity Management (`/items`):** View the master list of all defined consumable items.

> **Note:** You cannot create or edit new item *types* from these pages. If an item is missing from the master list, you must ask an Administrator to add it.

---

## 4. Frequently Asked Questions (FAQ)

**Q: I made a mistake on a transaction I just submitted. How do I fix it?**
A: Once a transaction is submitted, it cannot be edited by an Encoder. You must contact an Administrator immediately. They have the tools to make corrections or, in rare cases, purge the incorrect transaction. Always double-check your work in the confirmation pop-up before finalizing.

**Q: Why can't I find an item when trying to add it to a transaction?**
A: There are a few possibilities:
1.  The item has zero stock and is not showing up.
2.  The item has not been added to the system's master list yet. Contact an Admin to add it.
3.  You are in the wrong module (e.g., trying to find a Regular item on a Consignment page, or vice versa).

**Q: What is the difference between "Regular" and "Consignment" stock?**
A: **Regular** stock is owned by the Provincial Health Office. **Consignment** stock is owned by a supplier but stored in our facility. We only report its consumption to the supplier for billing. It's vital to use the correct transaction pages for each type.

**Q: The system logged me out automatically. Why?**
A: For security, the system has an automatic session timeout. If you are inactive for a set period (e.g., 15 minutes), a warning will appear. If you don't respond, you will be logged out to protect your account.

---
End of Manual
