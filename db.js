// db.js - SQLite Client Adapter for Inventory System
// Communicates with Node.js SQLite server endpoints via fetch API.

(function () {
  const API_BASE = ''; // Same host as web page

  // Local cache of the database state
  window.InventoryCache = {
    categories: [],
    employees: [],
    assets: [],
    allocations: [],
    returns: [],
    damageReports: [],
    history: [],
    requests: [],
    settings: {
      alertThresholds: {},
      theme: 'light',
      companyName: 'Inventory System',
      portalSubName: 'CORPORATE PORTAL',
      adminName: 'Aarav Patel4',
      adminRole: 'Administrator'
    }
  };

  // Helper to fetch entire state from SQLite server and trigger UI update
  function fetchStateFromServer() {
    fetch(`${API_BASE}/api/data`)
      .then(res => {
        if (!res.ok) throw new Error("API failed");
        return res.json();
      })
      .then(data => {
        window.InventoryCache = data;
        // Dispatch event to redraw all charts, statistics, and tables
        window.dispatchEvent(new Event('inventory_db_updated'));
      })
      .catch(err => {
        console.error("Failed to load inventory data from SQLite:", err);
      });
  }

  // API Call helper
  function sendApiRequest(endpoint, payload) {
    return fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
    .then(res => {
      if (!res.ok) throw new Error("API post failed");
      return res.json();
    })
    .then(result => {
      // Re-fetch clean database state from SQLite to trigger dashboard update
      fetchStateFromServer();
      return result;
    })
    .catch(err => {
      console.error(`API Error on ${endpoint}:`, err);
      alert(`Server operation failed: ${err.message}`);
      return { success: false };
    });
  }

  // Database Interface
  const InventoryDB = {
    // Read cached values synchronously for immediate UI rendering
    getData: function () {
      return window.InventoryCache;
    },

    getAssets: function () {
      return window.InventoryCache.assets;
    },

    saveData: function (data) {
      // General settings saving
      sendApiRequest('/api/settings', data.settings);
    },

    resetDatabase: function() {
      // Reset db can simply clear local storage theme preference or trigger alerts
      alert("Database reset is managed by SQLite server restart. Clean CSV files are parsed on start if inventory.db is deleted.");
      return this.getData();
    },

    // ASSETS
    addAsset: function (asset) {
      sendApiRequest('/api/assets', asset);
      return asset;
    },

    updateAsset: function (updatedAsset) {
      // For editing assets, we map it to add/save or log
      console.log("Update asset request skipped for SQLite migration.");
      return true;
    },

    deleteAsset: function (assetId) {
      sendApiRequest('/api/assets/delete', { id: assetId });
      return true;
    },

    // ALLOCATIONS
    allocateAsset: function (assetId, employeeId, dueDate) {
      sendApiRequest('/api/allocate', { assetId, employeeId, dueDate });
      return true;
    },

    // RETURNS
    returnAsset: function (assetId) {
      sendApiRequest('/api/return', { assetId });
      return true;
    },

    // DAMAGE REPORTS
    reportDamage: function (assetId, employeeId, description) {
      sendApiRequest('/api/damage', { assetId, employeeId, description });
      return true;
    },

    resolveDamage: function (reportId, resolutionStatus) {
      sendApiRequest('/api/damage/resolve', { reportId, resolutionStatus });
      return true;
    },

    // EMPLOYEES
    addEmployee: function (employee) {
      sendApiRequest('/api/employees', employee);
      return employee;
    },

    // CATEGORIES
    addCategory: function (category) {
      sendApiRequest('/api/categories', category);
      return category;
    },

    // REQUESTS
    updateRequest: function (requestId, status) {
      sendApiRequest('/api/requests/update', { requestId, status });
      return true;
    },

    // BATCH IMPORT WIZARD
    importDataset: function (type, arrayData) {
      sendApiRequest('/api/import', { type, list: arrayData });
      return arrayData.length;
    }
  };

  // Expose to window
  window.InventoryDB = InventoryDB;

  // Perform initial fetch on script load
  fetchStateFromServer();
})();
