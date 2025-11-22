# PHO Inventory Management System: User Manual for Administrators

## 1. Introduction

### 1.1 Welcome, Administrator!

Welcome to the Provincial Health Office Inventory Management System (PHO-IMS). This manual is your comprehensive guide to fulfilling your role as an **Administrator**.

As a Facility Administrator, you are a key leader in maintaining the integrity and efficiency of the inventory system for your assigned facility. Your role extends beyond data entry; you are responsible for overseeing inventory operations, managing master data, controlling user access, and ensuring the accuracy of all records.

### 1.2 Your Primary Responsibilities:

*   **Overseeing Inventory:** Monitor stock levels, initiate and approve physical counts, and handle inventory adjustments.
*   **Transaction Approvals:** Acknowledge incoming transfers, especially those with discrepancies.
*   **Master Data Management:** Create, edit, and manage the core data of the system, including the master lists for items (commodities and PPE), categories, suppliers, and facilities/locations.
*   **User Management:** Create and manage user accounts for your facility, assigning appropriate roles and permissions.
*   **Reporting:** Generate and analyze reports to ensure operational efficiency and accountability.

---

## 2. Getting Started

### 2.1 Logging In

1.  Navigate to the application's web address: **https://batangas-phoims.net**
2.  Enter your assigned **email address** and **password**.
3.  Click the **"Sign In"** button.

### 2.2 Understanding the Interface

The system is organized into three main areas:

1.  **Sidebar (Left):** Your main navigation menu. It contains links to all modules and pages. As an Admin, you have access to more management pages than an Encoder.
2.  **Header (Top):** Shows a welcome message, your user profile, notifications, and the logout button.
3.  **Main Content Area (Center):** This is where you will perform all your tasks. It displays the forms, tables, and dashboards for the module you have selected.

---

## 3. Core Modules & Admin-Specific Tasks

As an Admin, you have access to all Encoder functions, plus critical management and oversight capabilities.

### 3.1 Dashboard & Analytics (`/analytics`)

Your **Dashboard** provides a high-level overview of key metrics for **your assigned facility**. You can also access several detailed reports:
*   **Inventory Deep Dive:** Generate detailed reports on stock levels, value by category, and lists of overstocked or low-stock items.
*   **Forecasting:** Use historical data to predict future demand and get reordering recommendations.
*   **Supplier Insights:** Analyze supplier performance based on metrics like lead time and return rates.

### 3.2 Inventory Oversight

You are responsible for the overall accuracy of the inventory records.

#### 3.2.1 Viewing Inventory

*   **PPE (`/inventory/ppe`):** View and manage all non-consumable, serialized assets.
*   **Commodities (`/inventory/commodities`):** Monitor stock levels of all consumable items. From here, you can perform two key admin actions on any item batch:
    *   **Edit:** Correct non-quantity details of a stock item, such as the batch number or expiry date.
    *   **Adjust:** Make direct changes to the quantity of a stock item to correct discrepancies found outside of a formal physical count. You must provide a reason for the adjustment.

#### 3.2.2 Physical Counts (`/physical-counts`)

This is a critical admin workflow. You are responsible for the entire lifecycle of a stocktake.

**Workflow: Managing a Physical Count**
1.  **Initiate:** Click the **"Initiate New Count"** button. Give the count a name, select the specific storage location to be counted, and assign it to an Encoder (or yourself). Initiating a count **freezes** all items in that location, preventing any transactions until the count is finalized.
2.  **Monitor:** The count will appear in the "Active Counts" list. You can monitor its status as the assigned user performs the count.
3.  **Review:** Once the user submits their count, its status will change to **"Pending Review"**. Click the **"Review Count"** button.
4.  **Approve/Reject:**
    *   On the review screen, you will see a comparison of the system quantity vs. the counted quantity for each item.
    *   For any items with a **variance**, you must select a reason from the dropdown. You can also add notes.
    *   If you are satisfied, click **"Approve & Finalize Adjustments"**. This will permanently update the system's stock levels to match the physical count and unfreeze the items.
    *   If you find significant errors, click **"Reject Count"**. You must provide a reason, and the count will be sent back to the assigned user for a recount.

### 3.3 Transaction Management

You can perform all the same transactions as an Encoder (Dispense, Receive, etc.). Your key administrative role here is handling exceptions.

*   **Acknowledging Transfers (`/transfers`):** When another facility sends stock to you, you must acknowledge it. If the received quantity differs from the sent quantity, update the number. The system will automatically log this as a **Discrepancy**, which is crucial for auditing.

### 3.4 Master Data Management

This is your most important responsibility. The accuracy of the entire system depends on well-managed master data. You can find these pages under the **Management** section in the sidebar.

*   **Commodity & PPE Management (`/items`, `/ppe-management`):**
    *   Before any new product can be received into inventory, it **must** be created here first.
    *   When creating a new item, ensure all details are correct, especially the **Unit of Measure** (e.g., box, piece, bottle) and **Category**.
    *   You can edit existing items, but be cautious as this affects all future transactions.

*   **Categories (`/categories`):** Create and manage categories to organize your items logically (e.g., "Pharmaceuticals," "Office Supplies").

*   **Facilities & Locations (`/facilities`):**
    *   You can edit the details of your own facility and others.
    *   Crucially, you can manage the **storage locations** within facilities. Click the location icon next to a facility to add, edit, or delete its storage areas (e.g., "Main Pharmacy," "Warehouse A," "Shelf 1-A").

*   **Partners (`/suppliers`, `/service-providers`, etc.):** Maintain the master lists of all external and internal partners, including Suppliers, Service Providers, Health Programs, and Fund Sources.

*   **User Management (`/users`):**
    *   **Create Users:** You can create new accounts for personnel in your facility. You will set their name, email, role, and an initial password. They will be required to change this password on their first login.
    *   **Edit Users:** You can change a user's role, position, or assigned facility.
    *   **Suspend/Reactivate:** Instead of deleting a user (which is reserved for System Admins), you should **Suspend** their account. This prevents them from logging in while preserving their transaction history for auditing. You can reactivate them later if needed.

---

## 4. Key Administrative Workflows

### 4.1 Workflow: Adding a New Product to the System

1.  **Create Master Record:** Navigate to **Management -> Commodity Management**. Click "Add New Commodity". Fill in all the details for the new product type and save.
2.  **Receive Stock:** Navigate to **Regular Transactions -> Receive**. Create a new receiving voucher, select the supplier, and in the items section, you will now be able to search for and select the new product you just created.

### 4.2 Workflow: Onboarding a New User

1.  **Create Account:** Navigate to **Management -> User Management**. Click "Add New User".
2.  **Fill Details:** Enter the user's full name, email address, position, and assign them a **Role** (e.g., Encoder) and their **Facility**.
3.  **Set Initial Password:** Provide a secure, temporary password.
4.  **Inform User:** Share the login details with the new user and inform them that they will be required to change their password immediately upon their first login.

---

## 5. FAQ for Administrators

**Q: An Encoder made a mistake in a transaction (e.g., wrong quantity). How do I fix it?**
A: You cannot directly edit a finalized transaction. Instead, you must perform a correcting action.
*   **For Quantity Errors:** Go to the **Commodities** inventory page (`/inventory/commodities`), find the specific item batch that was affected, and use the **"Adjust"** action. Select an appropriate reason (e.g., "Data Entry Correction") and enter the *correct* final quantity. The system will log this adjustment.
*   **For Other Errors:** For more complex errors (e.g., wrong item dispensed), you may need to perform a reverse transaction (like a Patient/Ward Return) to correct the stock, and then re-do the transaction correctly.

**Q: A new type of medicine arrived, but it's not in the system. What do I do?**
A: As an Admin, you are responsible for this. Go to **Management -> Commodity Management** to add the new medicine to the master list before your Encoders can receive it into stock.

**Q: Can I delete a user/category/supplier?**
A: The system prevents you from deleting any master data record (like a category, supplier, or item) if it is currently being used in any transaction or inventory record. For users, it is best practice to **Suspend** their account instead of deleting it to preserve their activity history for auditing.

**Q: What is the difference between an Administrator and a System Administrator?**
A: You, as an **Administrator**, have full control over the operations and data within one or more assigned facilities. A **System Administrator** has global control over the entire system, including creating other administrators, managing system-wide settings (like maintenance mode), and performing high-level data management tasks.

---
End of Manual
