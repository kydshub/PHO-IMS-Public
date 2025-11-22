# PHO Inventory Management System: User Manual for Auditors

## 1. Introduction

### 1.1 Welcome, Auditor!

Welcome to the Provincial Health Office Inventory Management System (PHO-IMS). This manual is your guide to using the system in your capacity as an **Auditor**.

Your role is fundamental to ensuring the integrity, transparency, and accountability of our inventory operations. The system provides you with comprehensive, **read-only access** to all data across all facilities. This means you can view, analyze, and report on any aspect of the inventory and user activity without the ability to create, edit, or delete records, guaranteeing the impartiality of your audit.

### 1.2 Your Primary Responsibilities:

*   **Verifying Data Integrity:** Compare system records against physical documents and counts.
*   **Tracking Inventory Movements:** Follow the complete lifecycle of any item, from receiving to final dispensation or write-off.
*   **Ensuring Compliance:** Monitor user actions through the Audit Trail to ensure adherence to standard operating procedures.
*   **Generating & Analyzing Reports:** Utilize the system's powerful reporting tools to gather data for your audit findings.

---

## 2. Getting Started

### 2.1 Logging In

1.  Navigate to the application's web address: **https://batangas-phoims.net**
2.  Enter your assigned **email address** and **password**.
3.  Click the **"Sign In"** button.

### 2.2 Understanding the Interface (Read-Only View)

The system interface consists of three main parts. For your role, all interactive elements that could modify data (like "Add New", "Edit", or "Delete" buttons) will be hidden or disabled.

1.  **Sidebar (Left):** Your primary navigation tool. It provides links to all major modules. You have a wider view than operational users, with access to system-wide data.
2.  **Header (Top):** Displays a welcome message, your user profile, notifications, and the logout button.
3.  **Main Content Area (Center):** This is where you will view all data, tables, and reports.

---

## 3. Core Modules & Auditor Tasks

Your primary tools are the system's reporting dashboards and, most importantly, the Audit Trail.

### 3.1 Analytics & Reports (`/analytics`)

This is your central hub for high-level data analysis. Unlike facility-specific users, you have a **system-wide view** of all data. The key reports available to you are:
*   **Dashboard:** A high-level overview of the entire inventory ecosystem, including total value across all facilities.
*   **Inventory Deep Dive:** Generate detailed reports on stock levels, value by category, and lists of overstocked or low-stock items across the entire province.
*   **Forecasting:** Review historical consumption data and future demand predictions.
*   **Supplier Insights:** Analyze and verify supplier performance metrics.
*   **Facility Performance:** Compare key metrics like stockout rates and inventory turnover across different facilities.

### 3.2 Viewing Inventory (Verification)

You have full visibility into all stock, both provincially-owned and on consignment.

*   **PPE & Commodities (`/inventory/ppe`, `/inventory/commodities`):**
    *   View complete lists of all assets and consumable stock across all facilities.
    *   **Crucially, you can access the detailed Supply Ledger for any item batch by clicking the ledger icon.** The ledger provides an immutable, chronological history of every single transaction (receive, dispense, transfer, adjustment) that has affected that specific batch.

*   **Consignment Stock (`/consignment/inventory`):**
    *   View all items that are stored in our facilities but owned by suppliers.
    *   Use the **Consumption Reports (`/consignment/reports`)** to verify what was reported to suppliers for billing against actual dispense and write-off records.

### 3.3 The Audit Trail (`/audit-trail`): Your Most Powerful Tool

The Audit Trail is the cornerstone of your work in the PHO-IMS. It is a comprehensive and immutable log that records every significant action performed by every user in the system. Entries in the audit trail **cannot be altered or deleted**, providing a secure and reliable record for accountability.

**Key Features of the Audit Trail:**

*   **Interactive Details:** Click on any log entry to open a detailed view. For any entry that modified data (e.g., "User Update", "Stock Item Update"), you will see a clear **"Before" and "After" comparison**, showing exactly what was changed.
*   **Advanced Filtering & Search:**
    *   Use the filters at the top to narrow down the logs by **User**, **Action Type** (e.g., "Stock Write-Off"), **Facility**, or a specific **Date Range**.
    *   Use the search bar to perform a full-text search across all log details. This is useful for finding transactions by a specific control number (e.g., `RECV-20240730-0001`).
*   **AI-Powered Analysis:**
    *   The **"Analyze Activity"** button is a unique feature that uses AI to scan the currently filtered view for anomalies.
    *   It looks for unusual patterns, high-frequency actions, potential security risks (like multiple failed logins), or after-hours activity.
    *   The AI provides a concise summary and highlights key observations, helping you quickly identify areas that may require a deeper investigation.
*   **User Activity Trace:** To see everything a specific user has done, simply click on their name in any log entry. The entire Audit Trail will instantly filter to show only their activities.

---

## 4. Key Audit Workflows

### 4.1 Workflow: Verifying a Physical Count Adjustment

1.  **Find the Count:** Navigate to **Inventory -> Physical Counts** and select the "History" tab.
2.  **View the Report:** Locate a "Completed" count and click the **"View Report"** button.
3.  **Analyze Variances:** The report will detail any variances (differences between system and counted quantities) and the reasons provided by the approving Admin.
4.  **Cross-Reference in Audit Trail:** Navigate to the **Audit Trail**. Filter by the Action "Physical Count Approve" and the relevant date range.
5.  **Verify:** Find the log entry for the count approval. Click to view the details, which will show you exactly who approved the adjustments and at what time, providing a complete, auditable record of the stock correction.

### 4.2 Workflow: Tracing an Item's Complete Lifecycle

1.  **Locate the Item:** Go to **Inventory -> Commodities** and find a specific batch of an item you wish to trace.
2.  **Open the Ledger:** Click the **Ledger** icon for that item batch.
3.  **Review History:** The Supply Ledger shows every transaction that has affected this batch. Note the reference number of a transaction you want to investigate further (e.g., a large write-off).
4.  **Investigate in Audit Trail:** Go to the **Audit Trail** and paste the reference number (e.g., `WO-20240730-0005`) into the search bar.
5.  **View Full Details:** The corresponding log entry will appear. Click on it to see who performed the action, their IP address, the exact timestamp, and any attached notes or details. This provides a complete, verifiable record of the event.

---

## 5. Frequently Asked Questions (FAQ)

**Q: I see a transaction that looks incorrect. Can I fix it?**
A: No. Your role is strictly read-only to ensure the independence of the audit process. Your responsibility is to document your findings based on the data presented and report them through your established channels.

**Q: How can I be sure the data in the Audit Trail is accurate and hasn't been tampered with?**
A: The Audit Trail is designed to be an immutable log. Once an action is recorded, it cannot be edited or deleted by any user, including System Administrators. This ensures a reliable and trustworthy history of all system activities.

**Q: The AI Analysis flagged an issue. What's my next step?**
A: The AI analysis is a tool to help you focus your investigation. Use the information it provides as a starting point. For example, if it flags high-volume write-offs by a particular user, you can then use the Audit Trail filters to isolate all "Stock Write-Off" actions by that user and investigate each one's details individually.

---
End of Manual
