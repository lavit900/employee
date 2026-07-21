// server.js - SQLite REST API Backend Server
// Built with native node:sqlite DatabaseSync (zero-dependencies)

const http = require('http');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const PORT = 8080;
const DB_FILE = path.join(__dirname, 'inventory.db');
const NVIDIA_API_KEY = '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';

// Initialize SQLite database
const db = new DatabaseSync(DB_FILE);

// Call NVIDIA NIM API
const https = require('https');
function callNvidiaAPI(messages) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: 'meta/llama-3.1-8b-instruct',
      messages: messages,
      temperature: 0.5,
      max_tokens: 1024
    });

    const options = {
      hostname: 'integrate.api.nvidia.com',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.choices && parsed.choices[0] && parsed.choices[0].message) {
            resolve(parsed.choices[0].message.content);
          } else {
            console.error("NVIDIA API error response:", data);
            reject(new Error("Invalid API response format: " + (parsed.message || "Unknown error")));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// Setup Database Schema
function setupSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      CategoryID TEXT PRIMARY KEY,
      Category TEXT,
      Icon TEXT,
      Color TEXT,
      LowStockAlert INTEGER
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      EmployeeID TEXT PRIMARY KEY,
      Name TEXT,
      Department TEXT,
      Designation TEXT,
      Email TEXT,
      Phone TEXT,
      Status TEXT,
      AddedDate TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS assets (
      AssetID TEXT PRIMARY KEY,
      AssetName TEXT,
      Category TEXT,
      Brand TEXT,
      Model TEXT,
      SerialNumber TEXT,
      PurchaseDate TEXT,
      Status TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS asset_allocations (
      AllocationID TEXT PRIMARY KEY,
      AssetID TEXT,
      EmployeeID TEXT,
      AllocatedDate TEXT,
      ExpectedReturn TEXT,
      Status TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS returns (
      ReturnID TEXT PRIMARY KEY,
      AllocationID TEXT,
      ReturnDate TEXT,
      Condition TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS damage_reports (
      ReportID TEXT PRIMARY KEY,
      AssetID TEXT,
      EmployeeID TEXT,
      ReportDate TEXT,
      Issue TEXT,
      Status TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT,
      action TEXT,
      details TEXT,
      type TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      RequestID TEXT PRIMARY KEY,
      EmployeeName TEXT,
      EmployeeID TEXT,
      AssetType TEXT,
      Purpose TEXT,
      RequestDate TEXT,
      Status TEXT
    );
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  console.log("SQLite schema verified.");
}

// Simple CSV Parser
function parseCSV(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`Warning: File ${filePath} not found, skipping.`);
    return [];
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\r\n').join('\n').split('\n').map(l => l.trim()).filter(l => l !== '');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const result = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const values = [];
    let currentVal = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
    
    if (values.length !== headers.length) {
      continue; // Skip malformed rows
    }
    
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index];
    });
    result.push(obj);
  }
  return result;
}

// Seed Initial Database from local CSV files if they are empty
function seedDatabaseFromCSVs() {
  // 1. Seed Categories
  const catCount = db.prepare("SELECT COUNT(*) as count FROM categories").get().count;
  if (catCount === 0) {
    const csvCats = parseCSV(path.join(__dirname, 'categories.csv'));
    if (csvCats.length > 0) {
      const insertCat = db.prepare("INSERT INTO categories (CategoryID, Category, Icon, Color, LowStockAlert) VALUES (?, ?, ?, ?, ?)");
      const defaultMeta = {
        'Laptop': { icon: 'laptop', color: '#6366f1', alert: 5 },
        'Monitor': { icon: 'monitor', color: '#10b981', alert: 6 },
        'Phone': { icon: 'smartphone', color: '#3b82f6', alert: 4 },
        'Accessory': { icon: 'mouse', color: '#f59e0b', alert: 8 }
      };

      csvCats.forEach(row => {
        const catName = row.Category;
        const meta = defaultMeta[catName] || { icon: 'hard-drive', color: '#ec4899', alert: 5 };
        insertCat.run(row.CategoryID, catName, meta.icon, meta.color, meta.alert);
      });
      console.log(`Seeded ${csvCats.length} categories.`);
    }
  }

  // 2. Seed Employees
  const empCount = db.prepare("SELECT COUNT(*) as count FROM employees").get().count;
  if (empCount === 0) {
    const csvEmps = parseCSV(path.join(__dirname, 'employees.csv'));
    if (csvEmps.length > 0) {
      const insertEmp = db.prepare("INSERT INTO employees (EmployeeID, Name, Department, Designation, Email, Phone, Status, AddedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      csvEmps.forEach(row => {
        insertEmp.run(row.EmployeeID, row.Name, row.Department, row.Designation, row.Email, row.Phone, row.Status, '2025-01-01');
      });
      console.log(`Seeded ${csvEmps.length} employees.`);
    }
  }

  // 3. Seed Assets
  const assetCount = db.prepare("SELECT COUNT(*) as count FROM assets").get().count;
  if (assetCount === 0) {
    const csvAssets = parseCSV(path.join(__dirname, 'assets.csv'));
    if (csvAssets.length > 0) {
      const insertAsset = db.prepare("INSERT INTO assets (AssetID, AssetName, Category, Brand, Model, SerialNumber, PurchaseDate, Status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
      csvAssets.forEach(row => {
        insertAsset.run(row.AssetID, row.AssetName, row.Category, row.Brand, row.Model, row.SerialNumber, row.PurchaseDate, row.Status);
      });
      console.log(`Seeded ${csvAssets.length} assets.`);
    }
  }

  // 4. Seed Allocations
  const allocCount = db.prepare("SELECT COUNT(*) as count FROM asset_allocations").get().count;
  if (allocCount === 0) {
    const csvAllocs = parseCSV(path.join(__dirname, 'asset_allocations.csv'));
    if (csvAllocs.length > 0) {
      const insertAlloc = db.prepare("INSERT INTO asset_allocations (AllocationID, AssetID, EmployeeID, AllocatedDate, ExpectedReturn, Status) VALUES (?, ?, ?, ?, ?, ?)");
      csvAllocs.forEach(row => {
        insertAlloc.run(row.AllocationID, row.AssetID, row.EmployeeID, row.AllocatedDate, row.ExpectedReturn, row.Status);
      });
      console.log(`Seeded ${csvAllocs.length} allocations.`);
    }
  }

  // 5. Seed Returns
  const returnCount = db.prepare("SELECT COUNT(*) as count FROM returns").get().count;
  if (returnCount === 0) {
    const csvReturns = parseCSV(path.join(__dirname, 'returns.csv'));
    if (csvReturns.length > 0) {
      const insertReturn = db.prepare("INSERT INTO returns (ReturnID, AllocationID, ReturnDate, Condition) VALUES (?, ?, ?, ?)");
      csvReturns.forEach(row => {
        insertReturn.run(row.ReturnID, row.AllocationID, row.ReturnDate, row.Condition);
      });
      console.log(`Seeded ${csvReturns.length} returns.`);
    }
  }

  // 6. Seed Damage Reports
  const dmgCount = db.prepare("SELECT COUNT(*) as count FROM damage_reports").get().count;
  if (dmgCount === 0) {
    const csvDamages = parseCSV(path.join(__dirname, 'damage_reports.csv'));
    if (csvDamages.length > 0) {
      const insertDmg = db.prepare("INSERT INTO damage_reports (ReportID, AssetID, EmployeeID, ReportDate, Issue, Status) VALUES (?, ?, ?, ?, ?, ?)");
      csvDamages.forEach(row => {
        insertDmg.run(row.ReportID, row.AssetID, row.EmployeeID, row.ReportDate, row.Issue, row.Status);
      });
      console.log(`Seeded ${csvDamages.length} damage reports.`);
    }
  }

  // 7. Seed Settings & History log
  const settingsCount = db.prepare("SELECT COUNT(*) as count FROM settings").get().count;
  if (settingsCount === 0) {
    const insertSet = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)");
    insertSet.run('companyName', 'Inventory System');
    insertSet.run('portalSubName', 'CORPORATE PORTAL');
    insertSet.run('adminName', 'Aarav Patel4');
    insertSet.run('adminRole', 'Administrator');
    insertSet.run('theme', 'light');

    db.prepare("INSERT INTO history (timestamp, action, details, type) VALUES (?, ?, ?, ?)")
      .run(new Date().toISOString().split('T')[0], 'Database Seeded', 'Imported initial tables successfully from user CSV files', 'success');
  }

  // Mock Request seeding if empty
  const reqCount = db.prepare("SELECT COUNT(*) as count FROM requests").get().count;
  if (reqCount === 0) {
    const insertReq = db.prepare("INSERT INTO requests (RequestID, EmployeeName, EmployeeID, AssetType, Purpose, RequestDate, Status) VALUES (?, ?, ?, ?, ?, ?, ?)");
    insertReq.run('REQ-001', 'Neha Singh', 'EMP002', 'Laptop', 'Need high power laptop for HR databases', '2025-10-01', 'Pending');
    insertReq.run('REQ-002', 'Akash Sharma', 'EMP001', 'Phone', 'Testing mobile portals', '2025-10-02', 'Pending');
  }
}

// Unified API Response compiler
function compileDatabaseState() {
  // Query tables
  const categoriesList = db.prepare("SELECT * FROM categories").all();
  const employeesList = db.prepare("SELECT * FROM employees").all();
  const assetsRaw = db.prepare("SELECT * FROM assets").all();
  const allocationsRaw = db.prepare("SELECT * FROM asset_allocations").all();
  const returnsRaw = db.prepare("SELECT * FROM returns").all();
  const damageRaw = db.prepare("SELECT * FROM damage_reports").all();
  const historyList = db.prepare("SELECT * FROM history ORDER BY id DESC").all();
  const requestsList = db.prepare("SELECT * FROM requests").all();
  const settingsRaw = db.prepare("SELECT * FROM settings").all();

  // Create fast lookup maps
  const employeeMap = {};
  employeesList.forEach(e => { employeeMap[e.EmployeeID] = e.Name; });

  const assetMap = {};
  assetsRaw.forEach(a => { assetMap[a.AssetID] = a.AssetName; });

  // Map settings
  const settings = {
    alertThresholds: {},
    theme: 'light',
    companyName: 'Inventory System',
    portalSubName: 'CORPORATE PORTAL',
    adminName: 'Aarav Patel4',
    adminRole: 'Administrator'
  };
  settingsRaw.forEach(s => {
    if (s.key === 'theme' || s.key === 'companyName' || s.key === 'portalSubName' || s.key === 'adminName' || s.key === 'adminRole') {
      settings[s.key] = s.value;
    }
  });

  // Load alert thresholds from categories
  categoriesList.forEach(c => {
    const key = c.Category.toLowerCase();
    settings.alertThresholds[key] = c.LowStockAlert;
  });

  // Calculate active allocations for mapping into assets
  const activeAllocMap = {};
  allocationsRaw.forEach(alloc => {
    if (alloc.Status === 'Allocated') {
      activeAllocMap[alloc.AssetID] = {
        empId: alloc.EmployeeID,
        empName: employeeMap[alloc.EmployeeID] || alloc.EmployeeID,
        allocatedDate: alloc.AllocatedDate,
        dueDate: alloc.ExpectedReturn
      };
    }
  });

  // 1. Categories
  const categories = categoriesList.map(c => ({
    id: c.Category.toLowerCase(),
    name: c.Category,
    icon: c.Icon,
    color: c.Color,
    lowStockAlert: c.LowStockAlert
  }));

  // 2. Employees
  const employees = employeesList.map(e => ({
    id: e.EmployeeID,
    name: e.Name,
    email: e.Email,
    department: e.Department,
    designation: e.Designation,
    phone: e.Phone,
    status: e.Status,
    addedDate: e.AddedDate
  }));

  // 3. Assets
  const assets = assetsRaw.map(a => {
    const activeAlloc = activeAllocMap[a.AssetID];
    return {
      id: a.AssetID,
      name: a.AssetName,
      serialNumber: a.SerialNumber,
      category: a.Category.toLowerCase(),
      brand: a.Brand,
      model: a.Model,
      status: a.Status,
      purchaseDate: a.PurchaseDate,
      assignedTo: activeAlloc ? activeAlloc.empId : null,
      assignedToName: activeAlloc ? activeAlloc.empName : '',
      assignedDate: activeAlloc ? activeAlloc.allocatedDate : null,
      dueDate: activeAlloc ? activeAlloc.dueDate : null,
      addedDate: a.PurchaseDate
    };
  });

  // 4. Allocations
  const allocations = allocationsRaw.map(alloc => ({
    id: alloc.AllocationID,
    assetId: alloc.AssetID,
    employeeId: alloc.EmployeeID,
    employeeName: employeeMap[alloc.EmployeeID] || alloc.EmployeeID,
    allocatedDate: alloc.AllocatedDate,
    dueDate: alloc.ExpectedReturn,
    status: alloc.Status
  }));

  // 5. Returns
  const returns = returnsRaw.map(ret => {
    const alloc = allocationsRaw.find(al => al.AllocationID === ret.AllocationID) || {};
    return {
      id: ret.ReturnID,
      assetId: alloc.AssetID || '',
      assetName: assetMap[alloc.AssetID] || '',
      employeeId: alloc.EmployeeID || '',
      employeeName: employeeMap[alloc.EmployeeID] || '',
      allocatedDate: alloc.AllocatedDate || '',
      returnedDate: ret.ReturnDate,
      condition: ret.Condition
    };
  });

  // 6. Damage Reports
  const damageReports = damageRaw.map(dmg => ({
    id: dmg.ReportID,
    assetId: dmg.AssetID,
    assetName: assetMap[dmg.AssetID] || '',
    reportedBy: dmg.EmployeeID,
    reportedByName: employeeMap[dmg.EmployeeID] || 'Administrator',
    description: dmg.Issue,
    reportedDate: dmg.ReportDate,
    status: dmg.Status
  }));

  // 7. History
  const history = historyList.map(h => ({
    id: `HIST-${h.id}`,
    timestamp: h.timestamp,
    action: h.action,
    details: h.details,
    type: h.type
  }));

  // 8. Requests
  const requests = requestsList.map(r => ({
    id: r.RequestID,
    employeeName: r.EmployeeName,
    employeeId: r.EmployeeID,
    assetType: r.AssetType,
    purpose: r.Purpose,
    requestDate: r.RequestDate,
    status: r.Status
  }));

  return {
    categories,
    employees,
    assets,
    allocations,
    returns,
    damageReports,
    history,
    requests,
    settings
  };
}

// API POST Handlers
function handlePostRequests(req, res, bodyData) {
  const todayStr = new Date().toISOString().split('T')[0];

  switch (req.url) {
    // 1. ADD ASSET
    case '/api/assets': {
      const { name, category, serialNumber, status } = bodyData;
      // Generate ID
      const count = db.prepare("SELECT COUNT(*) as count FROM assets").get().count;
      const assetId = `AST${String(count + 1).padStart(3, '0')}`;
      
      // Resolve category title case
      const catObj = db.prepare("SELECT Category FROM categories WHERE LOWER(Category) = ?").get(category.toLowerCase());
      const categoryLabel = catObj ? catObj.Category : category;

      db.prepare("INSERT INTO assets (AssetID, AssetName, Category, SerialNumber, Status, PurchaseDate) VALUES (?, ?, ?, ?, ?, ?)")
        .run(assetId, name, categoryLabel, serialNumber, status, todayStr);

      db.prepare("INSERT INTO history (timestamp, action, details, type) VALUES (?, ?, ?, ?)")
        .run(todayStr, 'Asset Created', `Asset ${name} (${assetId}) added to registry`, 'info');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      break;
    }

    // 2. DELETE ASSET
    case '/api/assets/delete': {
      const { id } = bodyData;
      const asset = db.prepare("SELECT AssetName FROM assets WHERE AssetID = ?").get(id);
      if (asset) {
        db.prepare("DELETE FROM assets WHERE AssetID = ?").run(id);
        db.prepare("INSERT INTO history (timestamp, action, details, type) VALUES (?, ?, ?, ?)")
          .run(todayStr, 'Asset Deleted', `Asset ${asset.AssetName} (${id}) was permanently deleted`, 'danger');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(404);
        res.end("Asset not found");
      }
      break;
    }

    // 3. ALLOCATE ASSET
    case '/api/allocate': {
      const { assetId, employeeId, dueDate } = bodyData;
      
      const count = db.prepare("SELECT COUNT(*) as count FROM asset_allocations").get().count;
      const allocId = `AL${String(count + 1).padStart(3, '0')}`;

      // Insert Allocation
      db.prepare("INSERT INTO asset_allocations (AllocationID, AssetID, EmployeeID, AllocatedDate, ExpectedReturn, Status) VALUES (?, ?, ?, ?, ?, ?)")
        .run(allocId, assetId, employeeId, todayStr, dueDate, 'Allocated');

      // Update Asset Status
      db.prepare("UPDATE assets SET Status = 'Allocated' WHERE AssetID = ?").run(assetId);

      // Log history
      const asset = db.prepare("SELECT AssetName FROM assets WHERE AssetID = ?").get(assetId);
      const employee = db.prepare("SELECT Name FROM employees WHERE EmployeeID = ?").get(employeeId);
      db.prepare("INSERT INTO history (timestamp, action, details, type) VALUES (?, ?, ?, ?)")
        .run(todayStr, 'Asset Allocated', `${asset ? asset.AssetName : assetId} allocated to ${employee ? employee.Name : employeeId}`, 'info');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      break;
    }

    // 4. RETURN ASSET
    case '/api/return': {
      const { assetId } = bodyData;

      // Find active allocation
      const activeAlloc = db.prepare("SELECT * FROM asset_allocations WHERE AssetID = ? AND Status = 'Allocated'").get(assetId);
      if (activeAlloc) {
        // Update allocation status
        db.prepare("UPDATE asset_allocations SET Status = 'Returned' WHERE AllocationID = ?").run(activeAlloc.AllocationID);

        // Insert Return log
        const count = db.prepare("SELECT COUNT(*) as count FROM returns").get().count;
        const returnId = `RET${String(count + 1).padStart(3, '0')}`;
        db.prepare("INSERT INTO returns (ReturnID, AllocationID, ReturnDate, Condition) VALUES (?, ?, ?, ?)")
          .run(returnId, activeAlloc.AllocationID, todayStr, 'Good');

        // Reset Asset status
        db.prepare("UPDATE assets SET Status = 'In Stock' WHERE AssetID = ?").run(assetId);

        // History log
        const asset = db.prepare("SELECT AssetName FROM assets WHERE AssetID = ?").get(assetId);
        const employee = db.prepare("SELECT Name FROM employees WHERE EmployeeID = ?").get(activeAlloc.EmployeeID);
        db.prepare("INSERT INTO history (timestamp, action, details, type) VALUES (?, ?, ?, ?)")
          .run(todayStr, 'Asset Returned', `${asset ? asset.AssetName : assetId} returned by ${employee ? employee.Name : activeAlloc.EmployeeID}`, 'success');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(400);
        res.end("No active allocation found for this asset");
      }
      break;
    }

    // 5. REPORT DAMAGE
    case '/api/damage': {
      const { assetId, employeeId, description } = bodyData;

      const count = db.prepare("SELECT COUNT(*) as count FROM damage_reports").get().count;
      const reportId = `DR${String(count + 1).padStart(3, '0')}`;

      // Insert Damage Report
      db.prepare("INSERT INTO damage_reports (ReportID, AssetID, EmployeeID, ReportDate, Issue, Status) VALUES (?, ?, ?, ?, ?, ?)")
        .run(reportId, assetId, employeeId || null, todayStr, description, 'Open');

      // Update Asset Status
      db.prepare("UPDATE assets SET Status = 'Damaged' WHERE AssetID = ?").run(assetId);

      // Close active allocations if any
      const activeAlloc = db.prepare("SELECT AllocationID FROM asset_allocations WHERE AssetID = ? AND Status = 'Allocated'").get(assetId);
      if (activeAlloc) {
        db.prepare("UPDATE asset_allocations SET Status = 'Returned (Damaged)' WHERE AllocationID = ?").run(activeAlloc.AllocationID);
      }

      // History log
      const asset = db.prepare("SELECT AssetName FROM assets WHERE AssetID = ?").get(assetId);
      db.prepare("INSERT INTO history (timestamp, action, details, type) VALUES (?, ?, ?, ?)")
        .run(todayStr, 'Damage Reported', `Damage reported for ${asset ? asset.AssetName : assetId}: ${description}`, 'danger');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      break;
    }

    // 6. RESOLVE DAMAGE
    case '/api/damage/resolve': {
      const { reportId, resolutionStatus } = bodyData; // 'Resolved' or 'Disposed'
      
      const report = db.prepare("SELECT * FROM damage_reports WHERE ReportID = ?").get(reportId);
      if (report) {
        db.prepare("UPDATE damage_reports SET Status = ? WHERE ReportID = ?").run(resolutionStatus, reportId);

        const asset = db.prepare("SELECT AssetName FROM assets WHERE AssetID = ?").get(report.AssetID);

        if (resolutionStatus === 'Resolved') {
          db.prepare("UPDATE assets SET Status = 'In Stock' WHERE AssetID = ?").run(report.AssetID);
          db.prepare("INSERT INTO history (timestamp, action, details, type) VALUES (?, ?, ?, ?)")
            .run(todayStr, 'Damage Resolved', `Asset ${asset ? asset.AssetName : report.AssetID} repaired and returned to stock`, 'success');
        } else if (resolutionStatus === 'Disposed') {
          db.prepare("UPDATE assets SET Status = 'Disposed' WHERE AssetID = ?").run(report.AssetID);
          db.prepare("INSERT INTO history (timestamp, action, details, type) VALUES (?, ?, ?, ?)")
            .run(todayStr, 'Asset Disposed', `Damaged asset ${asset ? asset.AssetName : report.AssetID} written off / scrapped`, 'danger');
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(404);
        res.end("Damage report not found");
      }
      break;
    }

    // 7. ADD EMPLOYEE
    case '/api/employees': {
      const { name, email, department } = bodyData;
      
      const count = db.prepare("SELECT COUNT(*) as count FROM employees").get().count;
      const empId = `EMP${String(count + 1).padStart(3, '0')}`;
      const safeEmail = email || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@company.com`;

      db.prepare("INSERT INTO employees (EmployeeID, Name, Department, Designation, Email, Status, AddedDate) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .run(empId, name, department, 'Associate', safeEmail, 'Active', todayStr);

      db.prepare("INSERT INTO history (timestamp, action, details, type) VALUES (?, ?, ?, ?)")
        .run(todayStr, 'Employee Added', `Employee ${name} added to ${department}`, 'info');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      break;
    }

    // 8. ADD CATEGORY
    case '/api/categories': {
      const { name, icon, color, lowStockAlert } = bodyData;
      
      const count = db.prepare("SELECT COUNT(*) as count FROM categories").get().count;
      const catId = `CAT${String(count + 1).padStart(3, '0')}`;

      db.prepare("INSERT INTO categories (CategoryID, Category, Icon, Color, LowStockAlert) VALUES (?, ?, ?, ?, ?)")
        .run(catId, name, icon || 'hard-drive', color || '#ec4899', parseInt(lowStockAlert, 10) || 5);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      break;
    }

    // 9. REQUEST CONTROL
    case '/api/requests/update': {
      const { requestId, status } = bodyData;

      const reqObj = db.prepare("SELECT * FROM requests WHERE RequestID = ?").get(requestId);
      if (reqObj) {
        db.prepare("UPDATE requests SET Status = ? WHERE RequestID = ?").run(status, requestId);

        db.prepare("INSERT INTO history (timestamp, action, details, type) VALUES (?, ?, ?, ?)")
          .run(todayStr, `Request ${status}`, `Asset request from ${reqObj.EmployeeName} for ${reqObj.AssetType} was ${status.toLowerCase()}`, status === 'Approved' ? 'success' : 'warning');

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } else {
        res.writeHead(404);
        res.end("Request not found");
      }
      break;
    }

    // 10. SAVE SETTINGS
    case '/api/settings': {
      const { companyName, portalSubName, adminName, adminRole } = bodyData;
      
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('companyName', companyName);
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('portalSubName', portalSubName);
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('adminName', adminName);
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('adminRole', adminRole);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
      break;
    }

    // 11. BATCH DATASET IMPORT
    case '/api/import': {
      const { type, list } = bodyData;
      let count = 0;

      if (type === 'assets') {
        const insertAsset = db.prepare("INSERT OR REPLACE INTO assets (AssetID, AssetName, Category, Brand, Model, SerialNumber, PurchaseDate, Status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        list.forEach(item => {
          if (item.name) {
            const assetId = item.id || `AST${String(db.prepare("SELECT COUNT(*) as count FROM assets").get().count + 1).padStart(3, '0')}`;
            insertAsset.run(
              assetId,
              item.name,
              item.category || 'Accessory',
              item.brand || '',
              item.model || '',
              item.serialNumber || `SN${Math.floor(100000 + Math.random() * 900000)}`,
              item.addedDate || todayStr,
              item.status || 'In Stock'
            );
            count++;
          }
        });
      } else if (type === 'employees') {
        const insertEmp = db.prepare("INSERT OR REPLACE INTO employees (EmployeeID, Name, Department, Designation, Email, Phone, Status, AddedDate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        list.forEach(item => {
          if (item.name) {
            const empId = item.id || `EMP${String(db.prepare("SELECT COUNT(*) as count FROM employees").get().count + 1).padStart(3, '0')}`;
            insertEmp.run(
              empId,
              item.name,
              item.department || 'General',
              item.designation || 'Associate',
              item.email || `${item.name.toLowerCase().replace(/[^a-z0-9]/g, '')}@company.com`,
              item.phone || '',
              item.status || 'Active',
              item.addedDate || todayStr
            );
            count++;
          }
        });
      }

      if (count > 0) {
        db.prepare("INSERT INTO history (timestamp, action, details, type) VALUES (?, ?, ?, ?)")
          .run(todayStr, 'Data Imported', `Imported ${count} items into the ${type} table via settings wizard`, 'success');
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, count }));
      break;
    }

    // 12. AI CHAT ROUTE WITH LIVE SQL CONTEXT
    case '/api/ai/chat': {
      const { query, type } = bodyData;
      
      const state = compileDatabaseState();
      
      const catSummary = state.categories.map(c => `${c.name}: ${state.assets.filter(a => a.category === c.id).length} total`).join(', ');
      const openDamages = state.damageReports.filter(d => d.status === 'Open').map(d => `${d.assetName}: ${d.description}`).join('; ');
      const pendingReqs = state.requests.filter(r => r.status === 'Pending').map(r => `${r.employeeName} requests ${r.assetType} (Purpose: ${r.purpose})`).join('; ');

      const contextSummary = `Live Database Context:
- Total Assets: ${state.assets.length} (${catSummary})
- Stock statuses: ${state.assets.filter(a => a.status === 'In Stock').length} In Stock, ${state.assets.filter(a => a.status === 'Allocated').length} Allocated, ${state.assets.filter(a => a.status === 'Damaged').length} Damaged.
- Total Employees: ${state.employees.length}
- Open Damage Reports: ${state.damageReports.filter(d => d.status === 'Open').length} (${openDamages})
- Pending Requests: ${state.requests.filter(r => r.status === 'Pending').length} (${pendingReqs})
- Active Handover Allocations: ${state.allocations.filter(al => al.status === 'Active').length}`;

      let prompt = query;
      if (type === 'stock-forecast') {
        prompt = "Run a stock depletion forecast analysis. Estimate when laptops/monitors/phones will run out based on pending requests and current stock. Suggest reorder plans.";
      } else if (type === 'allocation-optim') {
        prompt = "Generate allocation recommendations. For each pending request, suggest which in-stock asset should be assigned based on category matching.";
      } else if (type === 'health-report') {
        prompt = "Compile a comprehensive Inventory Health Report. Calculate asset utilization and damage rates, flag low-stock warnings, and give a 3-step action plan.";
      }

      const messages = [
        {
          role: 'system',
          content: `You are an advanced AI Inventory Analytics Assistant inside the Corporate Portal. 
Analyze the live inventory data provided in the user prompt and generate structured, insightful, and professional markdown responses. 
Avoid generic answers; quote numbers from the provided context data directly. Keep responses concise and action-oriented.
Here is the live registry state to use for your calculations:
${contextSummary}`
        },
        {
          role: 'user',
          content: prompt
        }
      ];

      callNvidiaAPI(messages)
        .then(reply => {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ response: reply }));
        })
        .catch(err => {
          console.error("AI Error:", err);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message || "Failed to query NVIDIA NIM API" }));
        });
      break;
    }

    default:
      res.writeHead(404);
      res.end("Not Found");
  }
}

// Server Request Listener
const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  // 1. API Endpoints (JSON)
  if (req.url === '/api/data' && req.method === 'GET') {
    try {
      const state = compileDatabaseState();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(state));
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const bodyData = body ? JSON.parse(body) : {};
        handlePostRequests(req, res, bodyData);
      } catch (err) {
        console.error(err);
        res.writeHead(400);
        res.end(JSON.stringify({ error: "Malformed JSON payload: " + err.message }));
      }
    });
    return;
  }

  // 2. Static Files Router
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);
  
  // Strip URL query parameters or hashes if present
  filePath = filePath.split('?')[0].split('#')[0];

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 File Not Found</h1>');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

// Start Server
try {
  setupSchema();
  seedDatabaseFromCSVs();
  
  server.listen(PORT, () => {
    console.log(`Node SQLite Server running at http://localhost:${PORT}/`);
  });
} catch (error) {
  console.error("Critical server failure:", error);
}
