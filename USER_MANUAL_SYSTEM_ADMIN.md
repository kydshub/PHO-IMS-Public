# PHO Inventory Management System: User Manual for System Administrators

## 1. Introduction

### 1.1 Welcome, System Administrator!

Welcome to the Provincial Health Office Inventory Management System (PHO-IMS). This manual is your comprehensive guide to your role as a **System Administrator**. You hold the highest level of access and responsibility within the application, ensuring its smooth, secure, and efficient operation for all users.

Unlike a Facility Administrator who manages a specific location, your purview is **global**. You configure the system's core behavior, manage all user accounts (including other administrators), oversee data integrity across the entire province, and serve as the final authority on security and compliance.

### 1.2 Your Primary Responsibilities:

*   **System Configuration:** Define system-wide settings, manage application branding, configure security protocols like session timeouts, and enable or disable major modules (e.g., Chat, feature toggles).
*   **Global User Management:** Create, edit, suspend, and **delete** all user accounts, including Facility Administrators. You are also the only role capable of **impersonating** other users for troubleshooting purposes.
*   **Data Integrity & Maintenance:** Perform critical, system-wide data operations such as **Fiscal Year Rollovers** and the purging of old data to maintain database health.
*   **Security & Compliance Oversight:** Utilize the **Audit Trail** with its AI-powered analysis to monitor all system activity, investigate incidents, and ensure compliance.
*   **System Communication:** Post official announcements on the **Bulletin Board** and send broadcast notifications to all users or specific roles.

---

## 2. Getting Started

### 2.1 Logging In

1.  Navigate to the application's web address: **https://batangas-phoims.net**
2.  Enter your assigned **email address** and **password**.
3.  Click the **"Sign In"** button.

### 2.2 The Global View

Your interface provides a complete, unrestricted view of all data across all facilities. When you navigate to pages like "Inventory" or "Transaction Histories," you are seeing an aggregated view of the entire province's data. You can use the filters on each page to narrow your view to a specific facility if needed.

---

## 3. The System Administrator's Command Center (`/settings`)

The **Settings** page, accessible only to you, is the control panel for the entire application. It is organized into several tabs.

### 3.1 General & System

*   **Branding & Identity:** Set the official "Application Name" and "Organization Name" that appear throughout the app and on all printed reports.
*   **Security:** Configure the system-wide **Session Timeout** duration to automatically log out inactive users.

### 3.2 Modules & Features

*   **Feature Toggles:** Enable or disable major application features, such as the **Chat Module** or the **Barcode Scanner Simulation**.
*   **Sidebar Navigation:** You can disable specific pages from appearing in the sidebar for all users. This is useful for phasing in new features or simplifying the interface.

### 3.3 Communication

*   **Broadcast Notification:** Send a real-time notification to all active users or target a specific role (e.g., all "Encoders"). This is perfect for urgent system-wide announcements.
*   **Bulletin Board Management:** Create, edit, reorder, and delete the pages that appear on the main Bulletin Board for all users to see.

### 3.4 Data Management

This is a critical, high-impact section. **Actions taken here are often irreversible.**

*   **Fiscal Year Rollover:** This is a major annual task.
    1.  **Process:** This action closes the books on the current fiscal year, creates a permanent snapshot of all inventory and asset levels for auditing, and advances the system to the next fiscal year.
    2.  **Prerequisites:** You **cannot** perform a rollover if any facility has an active Physical Count in progress. You must ensure all counts are finalized or cancelled first.
    3.  **Warning:** This process is **irreversible**.
*   **Data Integrity Scan:** Use the **"Scan for Orphaned Data"** tool to find and purge records associated with deleted master data (e.g., an inventory item whose parent facility was deleted). This is a cleanup utility to maintain database health.
*   **Data Retention & Purges:**
    *   Set the retention period (in days) for how long the system should keep **Chat Messages**, **Audit Logs**, and **Notifications**.
    *   Manually trigger a purge to permanently delete data older than the set retention period. This is used to manage database size and comply with data policies. **This action is permanent.**

### 3.5 Maintenance Mode

*   **Enable/Disable:** With a single switch, you can take the entire application offline for all users except for fellow System Administrators.
*   **Custom Message:** You can edit the message that users will see when they try to access the system during maintenance.
*   **Access:** As a System Administrator, you can **always log in**, even when maintenance mode is active.

---

## 4. Global User & Security Management

### 4.1 User Management (`/users`)

You have ultimate control over all user accounts.
*   **Full CRUD:** You can Create, Read, Update, and **Delete** any user, including Facility Administrators.
    *   **Suspend vs. Delete:** It is best practice to **Suspend** an account for a user who has left the organization. This preserves their activity history in the Audit Trail. **Delete** should only be used for accounts created in error that have no transaction history.
*   **Impersonation:** For troubleshooting, you can impersonate any user.
    1.  Click the "Impersonate" icon next to a user's name.
    2.  You will now see the application exactly as they do, with their permissions and facility restrictions.
    3.  A prominent banner at the top of the screen will remind you that you are in impersonation mode.
    4.  Click **"Return to Admin Account"** in the banner to end the session.

### 4.2 Audit Trail (`/audit-trail`)

You have full access to the immutable log of all user actions across the entire system. Use the powerful filtering, searching, and **AI-Powered Analysis** features to monitor for compliance, investigate discrepancies, and ensure the security of the system.

---

## 5. Frequently Asked Questions (FAQ)

**Q: A Facility Admin has left. What is the correct procedure for offboarding?**
A: 1. Go to **User Management** and find their account. 2. Click the **Suspend** icon. This will immediately block their access while preserving their entire activity history for auditing. 3. If necessary, create a new Admin account for their replacement.

**Q: How do I prepare for the Fiscal Year Rollover?**
A: 1. Announce the upcoming rollover and a data freeze period using the **Bulletin Board** and a **Broadcast Notification**. 2. Coordinate with all Facility Admins to ensure they complete or cancel any ongoing Physical Counts. 3. Once the system is quiet, proceed with the rollover from the **Settings -> Data Management** tab.

**Q: I've enabled Maintenance Mode. How do I get back in to turn it off?**
A: Your System Administrator account is immune to maintenance mode. Simply log in as you normally would, navigate to **Settings -> Maintenance**, and disable it.

**Q: An Admin accidentally deleted a category that was in use, and now there are errors. What do I do?**
A: The system has protections to prevent deleting master data that is in use. However, if orphaned data is ever suspected, use the **Scan for Orphaned Data** tool in the Data Management settings tab to identify and clean up inconsistencies.

---
End of Manual
