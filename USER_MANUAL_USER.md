# PHO Inventory Management System: User Manual for the User Role

## 1. Introduction

### 1.1 Welcome to the PHO-IMS!

Welcome to the Provincial Health Office Inventory Management System (PHO-IMS). This manual is your guide for using the system with a **User** role.

Your role is designed for **viewing and monitoring** inventory information. You have read-only access, which means you can look up stock levels, view equipment details, and see system announcements without the ability to change any data. This ensures that you have access to accurate information while maintaining the integrity of our inventory records.

### 1.2 Your Primary Responsibilities:

*   Viewing the current stock levels of medicines and supplies.
*   Checking the details and status of assets and equipment (PPE).
*   Staying informed by reading announcements on the Bulletin Board.
*   Monitoring the inventory dashboard for your assigned facility.

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

### 2.3 Understanding the Interface (Read-Only)

The system interface is simple and focused on providing information.

1.  **Sidebar (Left):** This is your main navigation menu. It contains links to the pages you can view. Buttons for data entry (like "Dispense" or "Receive") will not be visible to you.
2.  **Header (Top):** Shows a welcome message, your user profile, and the logout button.
3.  **Main Content Area (Center):** This area displays the information, tables, and dashboards for the module you have selected.

---

## 3. Core Modules & Tasks (Read-Only)

Your access is tailored for information retrieval. You will not see pages or buttons related to adding, editing, or deleting data.

### 3.1 Analytics & Reports (`/analytics`)

This is the first page you see after logging in. The **Dashboard** provides a quick, at-a-glance overview of key inventory metrics for **your assigned facility**. You can see:
*   The total value of commodities and equipment.
*   Alerts for items that are low in stock.
*   Alerts for items that are approaching their expiration date.

### 3.2 Bulletin Board (`/bulletin-board`)

This is a digital announcement board where System Administrators post important information, updates, and memos. It's a good practice to check this page regularly to stay informed.

### 3.3 Inventory Module

This is where you can look up specific items to check their availability.

*   **PPE (`/inventory/ppe`):** This page lists all non-consumable, serialized assets like computers, vehicles, and expensive medical equipment. You can search for a specific item by its property number or name to check its status (e.g., In Stock, Deployed).
*   **Commodities (`/inventory/commodities`):** This is the primary page for checking the stock of consumable items like medicines, vaccines, and medical supplies. You can view the current quantity on hand, batch/lot numbers, expiration dates, and where they are stored within your facility.

### 3.4 Consignment Module

*   **Consignment Stock (`/consignment/inventory`):** This page allows you to view the inventory of items that are stored at your facility but are owned by a supplier.

---

## 4. Key "User" Workflows

Your tasks will revolve around finding information. Here are a couple of common scenarios:

### 4.1 Workflow: How to check if an item is in stock

1.  Navigate to **Inventory -> Commodities** from the sidebar.
2.  Use the **Search Bar** at the top of the table to type the name of the item you are looking for (e.g., "Paracetamol").
3.  The table will filter to show you all batches of that item.
4.  Look at the **Quantity** column to see how many are currently in stock. You can also check the **Expiry Date** and **Location** columns for more details.

### 4.2 Workflow: How to find a piece of equipment (PPE)

1.  Navigate to **Inventory -> PPE** from the sidebar.
2.  Use the **Search Bar** to type the name of the equipment (e.g., "Desktop Computer") or its assigned **Property Number**.
3.  The table will show the asset, its current status (e.g., "Deployed", "In Stock"), its assigned custodian, and other relevant details.

---

## 5. Frequently Asked Questions (FAQ)

**Q: I need to request an item. How do I do that in the system?**
A: Your "User" role is for viewing inventory information only. The PHO-IMS is used to track and manage stock, not to process requisitions from this role. Please follow your facility's standard offline procedure for requesting supplies (e.g., filling out a paper requisition form).

**Q: I see a mistake in the inventory count for an item. Can I fix it?**
A: Your role does not have permission to make changes to the data. This is to ensure data integrity. If you notice a discrepancy, please report it immediately to your facility's designated **Encoder** or **Administrator** so they can investigate and make the necessary correction.

**Q: Why can't I see pages like "Dispense," "Receive," or "User Management"?**
A: Access to different modules is based on user roles. Data entry and management tasks, such as recording transactions or creating user accounts, are handled by personnel with "Encoder" or "Admin" roles. Your "User" role is specifically designed to provide a clear, uncluttered view of the inventory status.

---
End of Manual
