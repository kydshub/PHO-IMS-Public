
export const sampleUsersCsv = `name,email,password,role,facilityName,position
"Alice Johnson",alice.j@health.gov,password123,Admin,"Main Health Office",System Admin
"Bob Williams",bob.w@health.gov,password123,Encoder,"North District Hospital",Nurse
"Charlie Brown",charlie.b@health.gov,password123,User,"South General Hospital",Staff
"Diana Prince",diana.p@health.gov,password123,Auditor,"Main Health Office",Auditor`;

export const sampleItemsCsv = `name,categoryName,itemType,unit,unitCost,lowStockThreshold,description,brand,manufacturer,barcode
"Gauze Pads (4x4 sterile)",Medical Supplies,Consumable,box,150.50,50,"Sterile gauze pads for wound dressing.",MedPro,Global MedTech,8991234567890
"Syringes (10ml with needle)",Medical Supplies,Consumable,box,320.00,40,"10ml luer-lock syringes, box of 100.",HealthFirst,Global MedTech,8991234567891
"Alcohol Prep Pads",Medical Supplies,Consumable,box,85.25,80,"Individually wrapped alcohol pads, box of 200.",MedPro,PharmaUnited,8991234567892
"IV Catheter (22G)",Medical Supplies,Consumable,box,1250.00,30,"22 Gauge IV catheters, box of 50.",HealthFirst,Global MedTech,
"Surgical Gloves (Size 7.5)",PPE,Consumable,box,450.75,50,"Sterile latex surgical gloves, size 7.5.",SecureWear,SafetyFirst Co.,8991234567894
"N95 Masks",PPE,Consumable,box,950.00,100,"Box of 20 N95 particulate respirators.",SecureWear,SafetyFirst Co.,8991234567895
"Face Shields",PPE,Consumable,pack,600.00,60,"Pack of 10 reusable face shields.",MedPro,SafetyFirst Co.,8991234567893
"Isolation Gown (Level 2)",PPE,Consumable,piece,75.00,100,"Level 2 disposable isolation gowns.",SecureWear,Global MedTech,
"Paracetamol 500mg Tablets",Pharmaceuticals,Consumable,box,120.00,90,"Box of 100 paracetamol tablets.",HealthFirst,PharmaUnited,8991234567896
"Amoxicillin 250mg/5ml Suspension",Pharmaceuticals,Consumable,bottle,95.50,40,"60ml bottle of amoxicillin oral suspension.",PharmaBrand,PharmaUnited,8991234567897
"Salbutamol Nebules (2.5mg)",Pharmaceuticals,Consumable,box,275.00,50,"Box of 30 salbutamol nebules for inhalation.",HealthFirst,PharmaUnited,
"Insulin Glargine Pen",Pharmaceuticals,Consumable,piece,850.00,20,"Prefilled insulin glargine pen.",PharmaBrand,PharmaUnited,
"Hepatitis B Vaccine (Adult)",Vaccines,Consumable,vial,550.00,30,"Single-dose vial for adult Hepatitis B vaccination.",VaxSecure,BioChem Labs,
"Tetanus Toxoid Vaccine",Vaccines,Consumable,vial,250.00,50,"Single-dose vial of Tetanus Toxoid.",VaxSecure,BioChem Labs,
"Blood Collection Tubes (EDTA)",Laboratory Reagents,Consumable,pack,350.00,60,"Pack of 100 EDTA vacuum tubes.",LabCore,BioChem Labs,
"Microscope Slides (75x25mm)",Laboratory Reagents,Consumable,box,180.00,40,"Box of 72 pre-cleaned microscope slides.",LabCore,BioChem Labs,
"Bond Paper (A4 size, 70gsm)",Office Supplies,Consumable,ream,250.00,,"Ream of 500 sheets A4 bond paper.",Officio,Office Essentials Inc.,
"Ballpoint Pens (Black)",Office Supplies,Consumable,box,90.00,,"Box of 12 black ballpoint pens.",Officio,Office Essentials Inc.,
"Stapler (Standard)",Office Supplies,Equipment,piece,150.00,,"Standard office stapler.",Officio,Office Essentials Inc.,
"Hand Sanitizer (1L)",Janitorial Supplies,Consumable,bottle,180.00,25,"1 Liter bottle of alcohol-based hand sanitizer.",CleanWorks,CleanSolutions,
"Bleach Solution (1 Gallon)",Janitorial Supplies,Consumable,gallon,220.00,15,"1 Gallon container of concentrated bleach.",CleanWorks,CleanSolutions,
"Desktop Computer Set",IT Equipment,Asset,unit,25000.00,5,"Core i5, 8GB RAM, 256GB SSD computer set.",TechGear,DigitalAge Corp.,123456789012
"Laser Printer (Monochrome)",IT Equipment,Asset,unit,8500.00,3,"High-speed monochrome laser printer.",TechGear,DigitalAge Corp.,123456789013
"Office Chair (Ergonomic)",Office Supplies,Asset,unit,5500.00,10,"Ergonomic office chair with lumbar support.",Officio,Office Essentials Inc.,
"Digital Thermometer",Medical Equipment,Equipment,piece,350.00,15,"Clinical-grade digital thermometer.",MedPro,Global MedTech,
"Stethoscope (Cardiology)",Medical Equipment,Equipment,piece,4500.00,5,"High-performance cardiology stethoscope.",HealthFirst,Global MedTech,
"Sphygmomanometer (Aneroid)",Medical Equipment,Equipment,unit,1800.00,8,"Manual aneroid blood pressure monitor set.",MedPro,Global MedTech,
"Sutures (3-0, Absorbable)",Medical Supplies,Consumable,box,980.00,25,"Box of 12 absorbable sutures.",MedPro,Global MedTech,
"Bandages (Assorted Sizes)",Medical Supplies,Consumable,box,75.00,80,"Box of 100 assorted adhesive bandages.",HealthFirst,Global MedTech,
"Surgical Tape (1 inch)",Medical Supplies,Consumable,roll,50.00,100,"1-inch hypoallergenic surgical tape roll.",MedPro,SafetyFirst Co.,
"Losartan 50mg Tablets",Pharmaceuticals,Consumable,box,350.00,60,"Box of 100 losartan tablets.",PharmaBrand,PharmaUnited,
"Metformin 850mg Tablets",Pharmaceuticals,Consumable,box,280.00,70,"Box of 100 metformin tablets.",HealthFirst,PharmaUnited,
"Urine Test Strips",Laboratory Reagents,Consumable,bottle,450.00,30,"Bottle of 100 urine reagent strips.",LabCore,BioChem Labs,
"Lancets (28G)",Medical Supplies,Consumable,box,120.00,90,"Box of 100 sterile 28G lancets.",MedPro,Global MedTech,
"Sharps Container (1-Quart)",Medical Supplies,Consumable,piece,85.00,50,"1-Quart biohazard sharps disposal container.",SecureWear,SafetyFirst Co.,
"Disposable Scalpels (#10)",Medical Supplies,Consumable,box,550.00,20,"Box of 10 sterile disposable scalpels.",MedPro,Global MedTech,
"CPR Face Mask",PPE,Consumable,piece,120.00,40,"CPR pocket mask with one-way valve.",HealthFirst,SafetyFirst Co.,
"Biohazard Waste Bags (Red)",Janitorial Supplies,Consumable,roll,250.00,30,"Roll of 50 red biohazard waste bags.",CleanWorks,CleanSolutions,
"Paper Towels",Janitorial Supplies,Consumable,pack,300.00,20,"Pack of 6 paper towel rolls.",CleanWorks,CleanSolutions,
"Printer Toner (Black)",Office Supplies,Consumable,piece,2500.00,5,"Black laser printer toner cartridge.",TechGear,DigitalAge Corp.,
"Mouse (USB)",IT Equipment,Equipment,piece,350.00,10,"Standard 3-button USB optical mouse.",TechGear,DigitalAge Corp.,
"Keyboard (USB)",IT Equipment,Equipment,piece,450.00,10,"Standard 104-key USB keyboard.",TechGear,DigitalAge Corp.,
"Otoscope/Ophthalmoscope Set",Medical Equipment,Equipment,unit,7500.00,3,"Diagnostic otoscope and ophthalmoscope set.",MedPro,Global MedTech,
"Glucometer Kit",Medical Equipment,Equipment,unit,1200.00,10,"Blood glucose monitoring kit with strips and lancets.",HealthFirst,Global MedTech,
"Pulse Oximeter",Medical Equipment,Equipment,piece,950.00,15,"Fingertip pulse oximeter.",MedPro,Global MedTech,
"Aspirin 80mg Tablets",Pharmaceuticals,Consumable,box,90.00,80,"Box of 100 low-dose aspirin tablets.",PharmaBrand,PharmaUnited,
"Omeprazole 20mg Capsules",Pharmaceuticals,Consumable,box,180.00,50,"Box of 100 omeprazole capsules.",HealthFirst,PharmaUnited,
"Ibuprofen 400mg Tablets",Pharmaceuticals,Consumable,box,150.00,90,"Box of 100 ibuprofen tablets.",PharmaBrand,PharmaUnited,
"Cetirizine 10mg Tablets",Pharmaceuticals,Consumable,box,110.00,70,"Box of 100 cetirizine tablets.",HealthFirst,PharmaUnited,
"BCG Vaccine",Vaccines,Consumable,vial,400.00,25,"Single-dose vial for BCG vaccination.",VaxSecure,BioChem Labs,
"MMR Vaccine",Vaccines,Consumable,vial,900.00,20,"Single-dose vial for Measles, Mumps, and Rubella.",VaxSecure,BioChem Labs,
"Ultrasound Gel (5L)",Medical Supplies,Consumable,gallon,800.00,10,"5-liter container of medical ultrasound gel.",MedPro,Global MedTech,
"ECG Electrodes",Medical Supplies,Consumable,pack,300.00,40,"Pack of 50 disposable ECG electrodes.",HealthFirst,Global MedTech,
"Cotton Balls (Large)",Medical Supplies,Consumable,pack,120.00,80,"Large pack of sterile cotton balls.",MedPro,SafetyFirst Co.,
"Tongue Depressors (Wooden)",Medical Supplies,Consumable,box,60.00,100,"Box of 100 wooden tongue depressors.",HealthFirst,Global MedTech,
"Foley Catheter (16Fr)",Medical Supplies,Consumable,piece,95.00,30,"16Fr 2-way silicone foley catheter.",MedPro,Global MedTech,
"Urine Bag (2000ml)",Medical Supplies,Consumable,piece,55.00,50,"2000ml sterile urine drainage bag.",HealthFirst,Global MedTech,
"Surgical Mask (3-ply)",PPE,Consumable,box,150.00,100,"Box of 50 3-ply surgical masks.",SecureWear,SafetyFirst Co.,
"Shoe Covers (Disposable)",PPE,Consumable,pack,200.00,80,"Pack of 100 disposable shoe covers.",SecureWear,SafetyFirst Co.,
"Hair Bouffant Caps",PPE,Consumable,pack,180.00,80,"Pack of 100 disposable bouffant caps.",SecureWear,SafetyFirst Co.,
"Petri Dishes (Sterile)",Laboratory Reagents,Consumable,pack,450.00,30,"Pack of 20 sterile petri dishes.",LabCore,BioChem Labs,
"Pipette Tips (1000uL)",Laboratory Reagents,Consumable,pack,280.00,40,"Pack of 1000 pipette tips.",LabCore,BioChem Labs,
"Distilled Water (1L)",Laboratory Reagents,Consumable,bottle,90.00,50,"1 Liter bottle of distilled water.",LabCore,BioChem Labs,
"Clipboard",Office Supplies,Consumable,piece,70.00,,"Standard A4 size clipboard.",Officio,Office Essentials Inc.,
"Whiteboard Markers (Assorted)",Office Supplies,Consumable,pack,120.00,,"Pack of 4 assorted whiteboard markers.",Officio,Office Essentials Inc.,
"Envelopes (Legal size)",Office Supplies,Consumable,box,150.00,,"Box of 100 legal size envelopes.",Officio,Office Essentials Inc.,
"Trash Bags (Large)",Janitorial Supplies,Consumable,roll,180.00,30,"Roll of 30 large trash bags.",CleanWorks,CleanSolutions,
"Liquid Hand Soap (1 Gallon)",Janitorial Supplies,Consumable,gallon,250.00,20,"1 Gallon of liquid hand soap.",CleanWorks,CleanSolutions,
"Disinfectant Wipes",Janitorial Supplies,Consumable,canister,140.00,40,"Canister of 80 disinfectant wipes.",CleanWorks,CleanSolutions,
"Webcam (1080p)",IT Equipment,Equipment,piece,1500.00,5,"1080p USB webcam with microphone.",TechGear,DigitalAge Corp.,
"UPS (650VA)",IT Equipment,Asset,unit,2800.00,8,"650VA Uninterruptible Power Supply.",TechGear,DigitalAge Corp.,
"External Hard Drive (1TB)",IT Equipment,Asset,unit,3500.00,5,"1TB USB 3.0 external hard drive.",TechGear,DigitalAge Corp.,
"Patient Gown",Medical Supplies,Consumable,piece,120.00,60,"Reusable cotton patient gown.",MedPro,SafetyFirst Co.,
"Bedpan (Stainless Steel)",Medical Equipment,Equipment,piece,450.00,10,"Stainless steel bedpan.",MedPro,Global MedTech,
"IV Pole",Medical Equipment,Asset,unit,1800.00,5,"Adjustable stainless steel IV pole.",HealthFirst,Global MedTech,
"Wheelchair",Medical Equipment,Asset,unit,7500.00,3,"Standard foldable wheelchair.",HealthFirst,Global MedTech,
"Amlodipine 5mg Tablets",Pharmaceuticals,Consumable,box,150.00,80,"Box of 100 amlodipine tablets.",PharmaBrand,PharmaUnited,
"Simvastatin 20mg Tablets",Pharmaceuticals,Consumable,box,320.00,60,"Box of 100 simvastatin tablets.",HealthFirst,PharmaUnited,
"Oral Rehydration Salts",Pharmaceuticals,Consumable,box,100.00,100,"Box of 50 sachets of oral rehydration salts.",PharmaBrand,PharmaUnited,
"Clopidogrel 75mg Tablets",Pharmaceuticals,Consumable,box,550.00,40,"Box of 100 clopidogrel tablets.",HealthFirst,PharmaUnited,
"Diphenhydramine 25mg Capsules",Pharmaceuticals,Consumable,box,130.00,70,"Box of 100 diphenhydramine capsules.",PharmaBrand,PharmaUnited,
"Influenza Vaccine",Vaccines,Consumable,vial,750.00,50,"Single-dose vial for seasonal influenza.",VaxSecure,BioChem Labs,
"PCV13 Vaccine",Vaccines,Consumable,vial,1200.00,20,"Pneumococcal conjugate vaccine.",VaxSecure,BioChem Labs,
"Specimen Cups (Sterile)",Laboratory Reagents,Consumable,pack,220.00,50,"Pack of 50 sterile specimen cups with lids.",LabCore,BioChem Labs,
"Agar Plates (Blood)",Laboratory Reagents,Consumable,pack,600.00,20,"Pack of 10 pre-poured blood agar plates.",LabCore,BioChem Labs,
"Lab Coat (Medium)",PPE,Consumable,piece,350.00,15,"Medium-sized reusable lab coat.",SecureWear,SafetyFirst Co.,
"Safety Goggles",PPE,Consumable,piece,180.00,30,"Anti-fog safety goggles.",SecureWear,SafetyFirst Co.,
"File Folders (Manila)",Office Supplies,Consumable,pack,150.00,40,"Pack of 100 manila file folders.",Officio,Office Essentials Inc.,
"Paper Clips (Jumbo)",Office Supplies,Consumable,box,40.00,50,"Box of 100 jumbo paper clips.",Officio,Office Essentials Inc.,
"Mop with Bucket",Janitorial Supplies,Equipment,unit,800.00,5,"Industrial mop and bucket set.",CleanWorks,CleanSolutions,
"Floor Cleaner (1 Gallon)",Janitorial Supplies,Consumable,gallon,350.00,15,"1 Gallon of concentrated floor cleaner.",CleanWorks,CleanSolutions,
"Network Switch (8-port)",IT Equipment,Asset,unit,1800.00,4,"8-port Gigabit network switch.",TechGear,DigitalAge Corp.,
"Monitor (24-inch)",IT Equipment,Asset,unit,9500.00,8,"24-inch 1080p LED monitor.",TechGear,DigitalAge Corp.,
"Nebulizer Machine",Medical Equipment,Equipment,unit,2500.00,5,"Compact nebulizer machine for respiratory therapy.",HealthFirst,Global MedTech,
"X-Ray Film (8x10)",Medical Supplies,Consumable,box,3500.00,10,"Box of 100 8x10 inch X-ray films.",MedPro,Global MedTech,
"Defibrillator Pads (Adult)",Medical Equipment,Consumable,pack,1800.00,5,"Pack of adult defibrillator pads.",HealthFirst,Global MedTech,
"Elastic Bandage (4-inch)",Medical Supplies,Consumable,roll,80.00,80,"4-inch wide elastic bandage roll.",MedPro,SafetyFirst Co.,
"Thermometer Probe Covers",Medical Supplies,Consumable,box,120.00,100,"Box of 100 disposable thermometer probe covers.",MedPro,Global MedTech,
"Vitamin C 500mg Tablets",Pharmaceuticals,Consumable,bottle,250.00,90,"Bottle of 100 Vitamin C tablets.",PharmaBrand,PharmaUnited,
"Ferrous Sulfate Tablets",Pharmaceuticals,Consumable,bottle,180.00,80,"Bottle of 100 ferrous sulfate tablets.",HealthFirst,PharmaUnited,
"Calcium Carbonate Tablets",Pharmaceuticals,Consumable,bottle,220.00,70,"Bottle of 100 calcium carbonate tablets.",PharmaBrand,PharmaUnited,
"Folic Acid Tablets",Pharmaceuticals,Consumable,bottle,150.00,90,"Bottle of 100 folic acid tablets.",HealthFirst,PharmaUnited,
"Rotavirus Vaccine",Vaccines,Consumable,dose,950.00,15,"Single oral dose of rotavirus vaccine.",VaxSecure,BioChem Labs`;

export const sampleFacilitiesCsv = `name,location
Main Health Office,Capitol Complex, City Hall
North District Hospital,123 North Avenue, North Town
South General Hospital,456 South Boulevard, South City
East Community Clinic,789 East Street, Eastville
West Rural Health Unit,101 West Road, Westburg`;

export const sampleCategoriesCsv = `name
Medical Supplies
PPE
Pharmaceuticals
Vaccines
Laboratory Reagents
Office Supplies
Janitorial Supplies
IT Equipment
Medical Equipment`;

export const sampleSuppliersCsv = `name,contactPerson,email,phone
Global MedTech,John Smith,sales@globalmed.com,09171112233
PharmaUnited,Jane Doe,contact@pharmaunited.net,09182223344
SafetyFirst Co.,Peter Jones,info@safetyfirst.co,09193334455
BioChem Labs,Dr. Eva Green,eva.g@biochem.lab,09204445566
Office Essentials Inc.,Michael Brown,orders@officeessentials.com,09215556677
CleanSolutions,Sarah Lee,sarah.lee@cleansolutions.ph,09226667788
DigitalAge Corp.,Kevin White,k.white@digitalage.com,09237778899`;

export const sampleProgramsCsv = `name,programManagerName,programManagerEmail,programManagerContact
National Immunization Program,Dr. Elena Reyes,e.reyes@health.gov,09171234567
Maternal and Child Health,Maria Santos,m.santos@health.gov,09182345678
Tuberculosis Control Program,Dr. Carlos David,c.david@health.gov,09193456789
Family Planning Program,Ana Cruz,a.cruz@health.gov,09204567890`;

export const sampleServiceProvidersCsv = `name,serviceType,contactPerson,email,phone
MedTech Calibrations,Equipment Calibration,Juan Gomez,juan.g@medtechcal.com,09175551111
BioHazard Waste Mgmt,Waste Disposal,Lisa Manalo,lisa.m@biohazard.com,09185552222
Provincial Motorpool,Logistics & Transport,Pedro Penduko,motorpool@province.gov,09195553333
TechSupport Inc.,IT Services,Maria Clara,support@techsupport.com,09205554444
General Maintenance Co.,Maintenance & Repair,Jose Rizal,service@gmc.com,09215555555`;

export const sampleAssetsCsv = `itemMasterName,propertyNumber,purchaseDate,acquisitionPrice,facilityName,storageLocationName,serialNumber,warrantyEndDate,status,assignedTo,propertyCustodian,condition,notes,fundSourceName
"Desktop Computer Set",PHO-IT-001,2023-01-15,25000,"Main Health Office","IT Room",SN12345,2026-01-14,Deployed,"Jane Doe","System Admin",Good,"Assigned to accounting",DOH
"Laser Printer (Monochrome)",PHO-IT-002,2023-02-20,8500,"Main Health Office","Admin Office",SN67890,2025-02-19,Deployed,"Admin Dept","",Good,"",LGU
"Office Chair (Ergonomic)",PHO-OF-001,2022-11-10,5500,"Main Health Office","Admin Office",,"",In Stock,"","",Used,"",LGU
"Wheelchair",NDH-ME-001,2024-01-05,7500,"North District Hospital","ER Ward",WC-987,,"Deployed","ER","",New,"",DOH
"IV Pole",NDH-ME-002,2024-01-05,1800,"North District Hospital","ER Ward",,,"In Stock","","",New,"",DOH
"Defibrillator Pads (Adult)",SGH-ME-001,2023-08-15,6000,"South General Hospital","ICU",DEFIB-ABC,2025-08-14,Deployed,"ICU Staff","",Good,"Pads replaced recently",LGU
"Nebulizer Machine",EC-ME-001,2023-05-20,2500,"East Community Clinic","Pharmacy",,,"In Stock","","",Used,"Needs cleaning",DOH
"UPS (650VA)",PHO-IT-003,2024-03-01,2800,"Main Health Office","Server Closet",UPS-XYZ789,2026-02-28,In Stock,"","",New,"",LGU`;

export const sampleConsumablesCsv = `itemMasterName,quantity,expiryDate,batchNumber,facilityName,storageLocationName,supplierName,programName,purchaseOrder,fundSourceName
"Gauze Pads (4x4 sterile)",10,2025-12-31,BATCH-GZ-001,"Main Health Office","Main Pharmacy","Global MedTech","National Immunization Program",PO-2024-001,DOH
"Syringes (10ml with needle)",50,2026-06-30,BATCH-SY-002,"North District Hospital","Warehouse A","PharmaUnited",,,LGU
"Alcohol Prep Pads",25,2025-08-31,BATCH-ALC-001,"South General Hospital","Supply Room","Global MedTech",,PO-2024-003,`;

export const sampleEquipmentCsv = `itemMasterName,quantity,expiryDate,batchNumber,facilityName,storageLocationName,supplierName,programName,purchaseOrder,fundSourceName
"Digital Thermometer",5,2029-01-01,BATCH-TH-001,"South General Hospital","Supply Room","Global MedTech",,,
"Stethoscope (Cardiology)",2,2030-01-01,BATCH-ST-001,"North District Hospital","Cardiology Dept","PharmaUnited",,PO-2024-101,LGU
"Sphygmomanometer (Aneroid)",10,2028-05-31,BATCH-BP-001,"East Community Clinic","Consultation Room 1","Global MedTech",,,DOH`;

const commoditiesHeader = `itemMasterName,quantity,expiryDate,batchNumber,facilityName,storageLocationName,supplierName,programName,purchaseOrder,fundSourceName`;
const consumablesData = sampleConsumablesCsv.substring(sampleConsumablesCsv.indexOf('\n') + 1);
const equipmentData = sampleEquipmentCsv.substring(sampleEquipmentCsv.indexOf('\n') + 1);
export const sampleCommoditiesCsv = `${commoditiesHeader}\n${consumablesData}\n${equipmentData}`