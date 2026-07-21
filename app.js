// app.js - Main Application Logic for Inventory System Corporate Portal

document.addEventListener('DOMContentLoaded', function () {
  const DB = window.InventoryDB;
  let currentAssetPage = 1;
  const assetsPerPage = 10;
  
  // Charts instances
  let donutChartInstance = null;
  let lineChartInstance = null;

  // Initialize App
  function init() {
    setupNavigation();
    setupDropdowns();
    setupModals();
    setupForms();
    setupSearchFilters();
    setupImportWizard();
    setupExportReports();
    setupAIInventory();
    
    // Load initial view
    switchView('dashboard');
    
    // Apply theme
    const data = DB.getData();
    if (data.settings.theme === 'dark') {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
    
    // Initial UI render
    updateSystemStats();
    updateBadges();
    
    // Render dropdown alerts initially
    renderNotificationsDropdown();

    // Re-initialize Lucide Icons
    lucide.createIcons();
    
    // Listen for database changes to update UI in real-time
    window.addEventListener('inventory_db_updated', function() {
      updateSystemStats();
      updateBadges();
      renderActiveView();
      renderNotificationsDropdown();
    });
  }

  // ==================== ROUTING / NAVIGATION ====================
  function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link, .profile-dropdown-item[data-target]');
    
    navLinks.forEach(link => {
      link.addEventListener('click', function (e) {
        // Only trigger if data-target is set
        const target = this.getAttribute('data-target');
        if (target) {
          e.preventDefault();
          switchView(target);
          
          // Close profile dropdown if clicked from there
          document.getElementById('profileDropdown').classList.remove('active');
        }
      });
    });

    // Sidebar Toggle Collapse
    const toggleBtn = document.getElementById('toggleSidebar');
    const sidebar = document.getElementById('appSidebar');
    toggleBtn.addEventListener('click', function () {
      sidebar.classList.toggle('collapsed');
    });

    // Handle dashboard stat cards clicking to redirect to filtered lists
    const statCards = document.querySelectorAll('.stat-card[data-action]');
    statCards.forEach(card => {
      card.addEventListener('click', function () {
        const action = this.getAttribute('data-action');
        const filter = this.getAttribute('data-status-filter');
        
        if (action === 'view-assets') {
          switchView('assets');
          document.getElementById('assetStatusFilter').value = filter;
          renderAssetsTable();
        } else if (action === 'view-allocations') {
          switchView('allocations');
          document.getElementById('allocationStatusFilter').value = '';
          renderAllocationsTable();
        } else if (action === 'view-damage-reports') {
          switchView('damage-reports');
          document.getElementById('damageStatusFilter').value = filter;
          renderDamageTable();
        } else if (action === 'view-reminders') {
          switchView('reminders');
        } else if (action === 'view-employees') {
          switchView('employees');
        }
      });
    });
  }

  function switchView(targetId) {
    // Deactivate all views
    document.querySelectorAll('.content-view').forEach(view => {
      view.classList.remove('active');
    });
    
    // Deactivate sidebar links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
    });

    // Activate selected view
    const activeView = document.getElementById(`view-${targetId}`);
    if (activeView) {
      activeView.classList.add('active');
    }
    
    // Highlight sidebar
    const activeLink = document.querySelector(`.nav-list .nav-link[data-target="${targetId}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
    }

    // Scroll to top of body
    document.querySelector('.content-body').scrollTop = 0;

    // Render active view components
    renderViewData(targetId);
  }

  function renderActiveView() {
    const activeView = document.querySelector('.content-view.active');
    if (activeView) {
      const viewId = activeView.id.replace('view-', '');
      renderViewData(viewId);
    }
  }

  function renderViewData(viewId) {
    switch (viewId) {
      case 'dashboard':
        renderDashboard();
        break;
      case 'assets':
        populateCategoryDropdowns();
        renderAssetsTable();
        break;
      case 'categories':
        renderCategoriesGrid();
        break;
      case 'allocations':
        renderAllocationsTable();
        break;
      case 'returns':
        renderReturnsTable();
        break;
      case 'damage-reports':
        renderDamageTable();
        break;
      case 'employees':
        renderEmployeesTable();
        break;
      case 'reports':
        renderReportsView();
        break;
      case 'history':
        renderHistoryTimeline();
        break;
      case 'requests':
        renderRequestsTable();
        break;
      case 'reminders':
        renderRemindersView();
        break;
      case 'settings':
        renderSettingsView();
        break;
    }
    lucide.createIcons();
  }

  // ==================== INTERACTIVE DROPDOWNS ====================
  function setupDropdowns() {
    // Profile Dropdown
    const profileTrigger = document.getElementById('userProfileTrigger');
    const profileDropdown = document.getElementById('profileDropdown');
    
    profileTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      profileDropdown.classList.toggle('active');
      document.getElementById('notificationsDropdown').classList.remove('active');
    });

    // Notification Dropdown
    const notifTrigger = document.getElementById('btnNotifications');
    const notifDropdown = document.getElementById('notificationsDropdown');
    
    notifTrigger.addEventListener('click', function (e) {
      e.stopPropagation();
      notifDropdown.classList.toggle('active');
      profileDropdown.classList.remove('active');
    });

    // Dark Mode Toggle
    const themeBtn = document.getElementById('btnThemeToggle');
    themeBtn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      
      const data = DB.getData();
      if (document.body.classList.contains('dark-mode')) {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        data.settings.theme = 'light';
        themeBtn.innerHTML = '<i data-lucide="moon"></i> Toggle Dark Mode';
      } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        data.settings.theme = 'dark';
        themeBtn.innerHTML = '<i data-lucide="sun"></i> Toggle Light Mode';
      }
      DB.saveData(data);
      lucide.createIcons();
    });

    // Reset Database
    document.getElementById('btnResetDB').addEventListener('click', function (e) {
      e.preventDefault();
      if (confirm('Are you sure you want to restore the system database to its default mockup state? All changes will be lost.')) {
        DB.resetDatabase();
        window.location.reload();
      }
    });

    // Close dropdowns on outside click
    document.addEventListener('click', function () {
      profileDropdown.classList.remove('active');
      notifDropdown.classList.remove('active');
    });
  }

  // ==================== ALERTS / NOTIFICATION LOGIC ====================
  function updateBadges() {
    const data = DB.getData();
    
    // 1. Pending Requests badge
    const pendingReqs = data.requests.filter(r => r.status === 'Pending').length;
    const reqBadge = document.getElementById('requestsBadge');
    if (pendingReqs > 0) {
      reqBadge.style.display = 'inline-block';
    } else {
      reqBadge.style.display = 'none';
    }

    // 2. Reminders badge (Low Stock & Overdue)
    const overdueCount = getOverdueCount(data.assets);
    const lowStockCount = getLowStockAlertCount(data);
    const totalAlerts = overdueCount + lowStockCount;

    const remBadge = document.getElementById('remindersBadge');
    const headerNotifBadge = document.getElementById('headerNotificationBadge');
    
    if (totalAlerts > 0) {
      remBadge.textContent = totalAlerts;
      remBadge.style.display = 'inline-block';
      headerNotifBadge.style.display = 'block';
    } else {
      remBadge.style.display = 'none';
      headerNotifBadge.style.display = 'none';
    }
  }

  function getOverdueCount(assets) {
    const today = new Date().toISOString().split('T')[0];
    return assets.filter(a => a.status === 'Allocated' && a.dueDate && a.dueDate < today).length;
  }

  function getLowStockAlertCount(data) {
    let alertCount = 0;
    data.categories.forEach(cat => {
      const totalInStock = data.assets.filter(a => a.category === cat.id && a.status === 'In Stock').length;
      if (totalInStock < cat.lowStockAlert) {
        alertCount++;
      }
    });
    return alertCount;
  }

  function renderNotificationsDropdown() {
    const data = DB.getData();
    const list = document.getElementById('notificationsList');
    list.innerHTML = '';

    const overdueCount = getOverdueCount(data.assets);
    const lowStockCount = getLowStockAlertCount(data);
    const pendingRequests = data.requests.filter(r => r.status === 'Pending').length;

    let items = [];

    // Overdue items alert
    if (overdueCount > 0) {
      items.push({
        type: 'overdue',
        icon: 'clock',
        text: `You have ${overdueCount} overdue returned hardware assets.`,
        target: 'reminders'
      });
    }

    // Low stock items alert
    if (lowStockCount > 0) {
      items.push({
        type: 'low-stock',
        icon: 'alert-triangle',
        text: `${lowStockCount} hardware categories are running low in stock.`,
        target: 'reminders'
      });
    }

    // Requests alert
    if (pendingRequests > 0) {
      items.push({
        type: 'request',
        icon: 'git-pull-request',
        text: `There are ${pendingRequests} pending hardware requests from employees.`,
        target: 'requests'
      });
    }

    if (items.length === 0) {
      list.innerHTML = '<li class="empty-state">No active notifications</li>';
      return;
    }

    items.forEach(item => {
      const li = document.createElement('li');
      li.className = item.type;
      li.innerHTML = `
        <i data-lucide="${item.icon}"></i>
        <div class="notifications-list-item-content">
          <span>${item.text}</span>
          <span class="notifications-list-item-time">Active warning</span>
        </div>
      `;
      
      li.addEventListener('click', function () {
        switchView(item.target);
      });
      list.appendChild(li);
    });

    lucide.createIcons();

    // Mark clear notifications
    document.getElementById('btnClearNotifications').addEventListener('click', function (e) {
      e.stopPropagation();
      document.getElementById('headerNotificationBadge').style.display = 'none';
      list.innerHTML = '<li class="empty-state">Notifications marked as read</li>';
    });
  }

  // ==================== DASHBOARD RENDERING & CHARTS ====================
  function updateSystemStats() {
    const data = DB.getData();
    
    // Stats elements
    document.getElementById('stat-total-assets').textContent = data.assets.length;
    document.getElementById('stat-instock-assets').textContent = data.assets.filter(a => a.status === 'In Stock').length;
    document.getElementById('stat-allocated-assets').textContent = data.assets.filter(a => a.status === 'Allocated').length;
    document.getElementById('stat-damaged-assets').textContent = data.assets.filter(a => a.status === 'Damaged').length;
    document.getElementById('stat-low-stock').textContent = getLowStockAlertCount(data);
    
    // Bottom row stats
    document.getElementById('stat-overdue-returns').textContent = getOverdueCount(data.assets);
    
    const today = new Date();
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(today.getDate() + 7);
    const sevenDaysStr = sevenDaysLater.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    
    const dueSoon = data.assets.filter(a => a.status === 'Allocated' && a.dueDate && a.dueDate >= todayStr && a.dueDate <= sevenDaysStr).length;
    document.getElementById('stat-due-soon').textContent = dueSoon;
    
    document.getElementById('stat-damage-reports-open').textContent = data.damageReports.filter(d => d.status === 'Open').length;
    document.getElementById('stat-total-employees').textContent = data.employees.length;

    // Portal titles
    document.getElementById('brandName').textContent = data.settings.companyName || 'Inventory System';
    document.getElementById('brandSubName').textContent = data.settings.portalSubName || 'CORPORATE PORTAL';
    document.getElementById('adminNameDisplay').textContent = data.settings.adminName || 'Aarav Patel4';
    document.getElementById('adminRoleDisplay').textContent = data.settings.adminRole || 'Administrator';
    
    const initials = (data.settings.adminName || 'AP').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    document.getElementById('adminInitials').textContent = initials;
  }

  function renderDashboard() {
    const data = DB.getData();
    
    // Render recent activities
    const activitiesList = document.getElementById('dashboardActivitiesList');
    activitiesList.innerHTML = '';
    
    // Display last 6 activities
    const recent = data.history.slice(0, 6);
    if (recent.length === 0) {
      activitiesList.innerHTML = '<li class="activity-item">No recent activities found</li>';
    } else {
      recent.forEach(act => {
        let badgeClass = 'bg-blue-light text-blue';
        let iconName = 'info';
        
        if (act.action === 'Asset Allocated') {
          badgeClass = 'bg-purple-light text-purple';
          iconName = 'user-check';
        } else if (act.action === 'Asset Returned') {
          badgeClass = 'bg-green-light text-green';
          iconName = 'rotate-ccw';
        } else if (act.action === 'Damage Reported') {
          badgeClass = 'bg-red-light text-red';
          iconName = 'alert-triangle';
        }
        
        // Format time ago or relative date
        const timeStr = formatActivityTime(act.timestamp);

        const li = document.createElement('li');
        li.className = 'activity-item';
        li.innerHTML = `
          <div class="activity-badge ${badgeClass}">
            <i data-lucide="${iconName}"></i>
          </div>
          <div class="activity-details">
            <h5>${act.details}</h5>
            <span>${timeStr}</span>
          </div>
        `;
        activitiesList.appendChild(li);
      });
    }

    // Chart.js Setup
    initCharts(data);
  }

  function formatActivityTime(dateStr) {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = Math.abs(today - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  }

  function initCharts(data) {
    // 1. Donut Chart - Stock Summary by Category
    const categoriesMap = {};
    data.categories.forEach(cat => {
      categoriesMap[cat.name] = {
        count: 0,
        color: cat.color
      };
    });

    data.assets.forEach(asset => {
      const catObj = data.categories.find(c => c.id === asset.category);
      if (catObj) {
        if (!categoriesMap[catObj.name]) {
          categoriesMap[catObj.name] = { count: 0, color: catObj.color || '#4f46e5' };
        }
        categoriesMap[catObj.name].count++;
      }
    });

    const donutLabels = Object.keys(categoriesMap);
    const donutData = donutLabels.map(l => categoriesMap[l].count);
    const donutColors = donutLabels.map(l => categoriesMap[l].color);

    const donutCtx = document.getElementById('donutChart').getContext('2d');
    
    if (donutChartInstance) {
      donutChartInstance.destroy();
    }
    
    donutChartInstance = new Chart(donutCtx, {
      type: 'doughnut',
      data: {
        labels: donutLabels,
        datasets: [{
          data: donutData,
          backgroundColor: donutColors,
          borderWidth: 2,
          borderColor: document.body.classList.contains('dark-mode') ? '#151b2d' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              padding: 15,
              color: document.body.classList.contains('dark-mode') ? '#94a3b8' : '#0f172a',
              font: {
                family: 'Inter',
                size: 11,
                weight: '500'
              }
            }
          }
        }
      }
    });

    // 2. Line Chart - Allocation Overview (Area curve Jan to Jul)
    // Dynamically calculated from database allocations and returns
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    
    if (lineChartInstance) {
      lineChartInstance.destroy();
    }
    
    const isDark = document.body.classList.contains('dark-mode');

    // Calculate last 7 months labels and their corresponding year-month prefixes
    const monthsShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const chartLabels = [];
    const allocatedCounts = [];
    const returnedCounts = [];

    const today = new Date();
    
    // We go 6 months back up to today
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthIndex = d.getMonth();
      const monthPrefix = `${year}-${String(monthIndex + 1).padStart(2, '0')}`; // "YYYY-MM"
      
      chartLabels.push(monthsShort[monthIndex]);
      
      // Count allocations created in this month
      const aCount = data.allocations.filter(alloc => alloc.allocatedDate && alloc.allocatedDate.startsWith(monthPrefix)).length;
      allocatedCounts.push(aCount);
      
      // Count returns logged in this month
      const rCount = data.returns.filter(ret => ret.returnedDate && ret.returnedDate.startsWith(monthPrefix)).length;
      returnedCounts.push(rCount);
    }

    lineChartInstance = new Chart(lineCtx, {
      type: 'line',
      data: {
        labels: chartLabels,
        datasets: [
          {
            label: 'Allocated',
            data: allocatedCounts,
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.05)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.45,
            pointRadius: 2,
            pointHoverRadius: 4
          },
          {
            label: 'Returned',
            data: returnedCounts,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.05)',
            borderWidth: 2.5,
            fill: true,
            tension: 0.45,
            pointRadius: 2,
            pointHoverRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              color: isDark ? '#94a3b8' : '#0f172a',
              font: {
                family: 'Inter',
                size: 11
              }
            }
          }
        },
        scales: {
          y: {
            min: 0,
            suggestedMax: 10,
            ticks: {
              color: isDark ? '#475569' : '#94a3b8',
              font: { family: 'Inter', size: 10 }
            },
            grid: {
              color: isDark ? '#242f47' : '#f1f5f9',
              drawBorder: false
            }
          },
          x: {
            ticks: {
              color: isDark ? '#475569' : '#94a3b8',
              font: { family: 'Inter', size: 10 }
            },
            grid: {
              display: false,
              drawBorder: false
            }
          }
        }
      }
    });
  }

  // ==================== ASSETS VIEW & CRUD ====================
  function populateCategoryDropdowns() {
    const data = DB.getData();
    const filters = ['assetCategoryFilter', 'addAssetCategory', 'catIcon'];
    
    // Add Asset category dropdown
    const addSelect = document.getElementById('addAssetCategory');
    addSelect.innerHTML = '';
    
    // Filter Asset category dropdown
    const filterSelect = document.getElementById('assetCategoryFilter');
    const prevFilterVal = filterSelect.value;
    filterSelect.innerHTML = '<option value="">All Categories</option>';

    data.categories.forEach(cat => {
      // Form Select
      const option = document.createElement('option');
      option.value = cat.id;
      option.textContent = cat.name;
      addSelect.appendChild(option);

      // Filter Select
      const optionF = document.createElement('option');
      optionF.value = cat.id;
      optionF.textContent = cat.name;
      filterSelect.appendChild(optionF);
    });

    filterSelect.value = prevFilterVal;
  }

  function renderAssetsTable() {
    const data = DB.getData();
    const tbody = document.getElementById('assetsTableBody');
    tbody.innerHTML = '';

    const searchQuery = document.getElementById('assetSearchFilter').value.toLowerCase().trim();
    const categoryQuery = document.getElementById('assetCategoryFilter').value;
    const statusQuery = document.getElementById('assetStatusFilter').value;

    // Filter Logic
    let filteredAssets = data.assets.filter(asset => {
      const matchSearch = asset.name.toLowerCase().includes(searchQuery) || 
                          asset.serialNumber.toLowerCase().includes(searchQuery) || 
                          asset.id.toLowerCase().includes(searchQuery) ||
                          (asset.assignedToName && asset.assignedToName.toLowerCase().includes(searchQuery));
      const matchCategory = !categoryQuery || asset.category === categoryQuery;
      const matchStatus = !statusQuery || asset.status === statusQuery;

      return matchSearch && matchCategory && matchStatus;
    });

    // Pagination Calculation
    const totalAssets = filteredAssets.length;
    const totalPages = Math.ceil(totalAssets / assetsPerPage) || 1;
    
    if (currentAssetPage > totalPages) {
      currentAssetPage = totalPages;
    }

    const startIndex = (currentAssetPage - 1) * assetsPerPage;
    const endIndex = Math.min(startIndex + assetsPerPage, totalAssets);
    
    const paginatedAssets = filteredAssets.slice(startIndex, endIndex);

    // Render stats text
    const info = document.getElementById('assetsPaginationInfo');
    if (totalAssets === 0) {
      info.textContent = 'No assets found';
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">No assets match the active filters.</td></tr>';
      document.getElementById('btnAssetPrev').disabled = true;
      document.getElementById('btnAssetNext').disabled = true;
      document.getElementById('assetsPaginationPages').innerHTML = '';
      return;
    }
    
    info.textContent = `Showing ${startIndex + 1}-${endIndex} of ${totalAssets} assets`;

    // Render table rows
    paginatedAssets.forEach(asset => {
      const catObj = data.categories.find(c => c.id === asset.category) || { name: asset.category };
      
      let statusClass = 'instock';
      if (asset.status === 'Allocated') statusClass = 'allocated';
      if (asset.status === 'Damaged') statusClass = 'damaged';

      const tr = document.createElement('tr');
      
      let actionButtons = '';
      if (asset.status === 'In Stock') {
        actionButtons = `
          <button class="btn-table-action allocate" data-id="${asset.id}" title="Allocate Asset"><i data-lucide="user-check"></i></button>
        `;
      } else if (asset.status === 'Allocated') {
        actionButtons = `
          <button class="btn-table-action checkin text-green" data-id="${asset.id}" title="Process Return"><i data-lucide="rotate-ccw"></i></button>
        `;
      }

      tr.innerHTML = `
        <td><strong>${asset.id}</strong></td>
        <td>${asset.name}</td>
        <td><code style="font-family: monospace; font-size: 12.5px;">${asset.serialNumber}</code></td>
        <td>${catObj.name}</td>
        <td><span class="status-pill ${statusClass}">${asset.status}</span></td>
        <td>${asset.assignedToName || '<span style="color: var(--text-muted); font-style: italic;">None</span>'}</td>
        <td>${asset.addedDate}</td>
        <td class="text-right">
          <div class="actions-cell-buttons">
            ${actionButtons}
            <button class="btn-table-action delete" data-id="${asset.id}" title="Delete Asset"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });

    // Pagination buttons trigger
    document.getElementById('btnAssetPrev').disabled = currentAssetPage === 1;
    document.getElementById('btnAssetNext').disabled = currentAssetPage === totalPages;

    const pagesContainer = document.getElementById('assetsPaginationPages');
    pagesContainer.innerHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
      const pageSpan = document.createElement('span');
      pageSpan.className = `page-num ${i === currentAssetPage ? 'active' : ''}`;
      pageSpan.textContent = i;
      pageSpan.addEventListener('click', () => {
        currentAssetPage = i;
        renderAssetsTable();
      });
      pagesContainer.appendChild(pageSpan);
    }

    lucide.createIcons();

    // Table click listener delegation
    // 1. Allocate click
    tbody.querySelectorAll('.btn-table-action.allocate').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        openAllocationModal(id);
      });
    });

    // 2. Return click
    tbody.querySelectorAll('.btn-table-action.checkin').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        if (confirm(`Confirm return of asset ${id}?`)) {
          DB.returnAsset(id);
        }
      });
    });

    // 3. Delete click
    tbody.querySelectorAll('.btn-table-action.delete').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        if (confirm(`Are you absolutely sure you want to permanently delete asset ${id}? This cannot be undone.`)) {
          DB.deleteAsset(id);
        }
      });
    });
  }

  function setupSearchFilters() {
    // Asset search
    const assetSearch = document.getElementById('assetSearchFilter');
    const assetCategory = document.getElementById('assetCategoryFilter');
    const assetStatus = document.getElementById('assetStatusFilter');

    const triggerAssetRender = () => {
      currentAssetPage = 1;
      renderAssetsTable();
    };

    assetSearch.addEventListener('input', triggerAssetRender);
    assetCategory.addEventListener('change', triggerAssetRender);
    assetStatus.addEventListener('change', triggerAssetRender);

    document.getElementById('btnResetAssetFilters').addEventListener('click', () => {
      assetSearch.value = '';
      assetCategory.value = '';
      assetStatus.value = '';
      triggerAssetRender();
    });

    // Allocation filter
    document.getElementById('allocationSearchFilter').addEventListener('input', renderAllocationsTable);
    document.getElementById('allocationStatusFilter').addEventListener('change', renderAllocationsTable);

    // Damage reports filter
    document.getElementById('damageSearchFilter').addEventListener('input', renderDamageTable);
    document.getElementById('damageStatusFilter').addEventListener('change', renderDamageTable);

    // Employee filters
    document.getElementById('employeeSearchFilter').addEventListener('input', renderEmployeesTable);
    document.getElementById('employeeDepartmentFilter').addEventListener('change', renderEmployeesTable);

    // Global Top Search Bar
    const globalSearch = document.getElementById('globalSearch');
    globalSearch.addEventListener('input', function() {
      const query = this.value.toLowerCase().trim();
      
      // Determine what active view is open, then set its corresponding search filter
      const activeView = document.querySelector('.content-view.active');
      if (!activeView) return;

      const viewId = activeView.id.replace('view-', '');
      if (viewId === 'assets') {
        document.getElementById('assetSearchFilter').value = query;
        renderAssetsTable();
      } else if (viewId === 'allocations') {
        document.getElementById('allocationSearchFilter').value = query;
        renderAllocationsTable();
      } else if (viewId === 'employees') {
        document.getElementById('employeeSearchFilter').value = query;
        renderEmployeesTable();
      } else if (viewId === 'damage-reports') {
        document.getElementById('damageSearchFilter').value = query;
        renderDamageTable();
      } else if (viewId === 'returns') {
        document.getElementById('returnsSearchFilter').value = query;
        renderReturnsTable();
      } else if (viewId === 'history') {
        document.getElementById('historySearchFilter').value = query;
        renderHistoryTimeline();
      }
    });
  }

  // ==================== CATEGORIES GRID ====================
  function renderCategoriesGrid() {
    const data = DB.getData();
    const grid = document.getElementById('categoriesGrid');
    grid.innerHTML = '';

    data.categories.forEach(cat => {
      const catAssets = data.assets.filter(a => a.category === cat.id);
      const total = catAssets.length;
      const allocated = catAssets.filter(a => a.status === 'Allocated').length;
      const inStock = catAssets.filter(a => a.status === 'In Stock').length;
      const damaged = catAssets.filter(a => a.status === 'Damaged').length;
      
      const stockPercentage = total > 0 ? Math.round((inStock / total) * 100) : 0;
      
      const card = document.createElement('div');
      card.className = 'category-card';
      card.style.setProperty('--cat-color', cat.color);
      card.innerHTML = `
        <div class="category-card-header">
          <div class="category-card-title">
            <div class="category-icon-box" style="background-color: ${cat.color}15">
              <i data-lucide="${cat.icon || 'laptop'}"></i>
            </div>
            <h3>${cat.name}</h3>
          </div>
          <span class="category-count">${total}</span>
        </div>
        <div class="category-stats-bar">
          <div class="cat-stat-row">
            <span class="cat-stat-lbl">In Stock (Available)</span>
            <span class="cat-stat-val text-green">${inStock}</span>
          </div>
          <div class="cat-progress-bg">
            <div class="cat-progress-fill" style="width: ${stockPercentage}%"></div>
          </div>
          <div class="cat-stat-row" style="margin-top: 4px;">
            <span class="cat-stat-lbl">Allocated</span>
            <span class="cat-stat-val">${allocated}</span>
          </div>
          <div class="cat-stat-row">
            <span class="cat-stat-lbl">Damaged / Under Repair</span>
            <span class="cat-stat-val text-danger">${damaged}</span>
          </div>
          <div class="cat-stat-row" style="border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 4px;">
            <span class="cat-stat-lbl">Low Stock Warning Limit</span>
            <span class="cat-stat-val" style="color: var(--amber);"><i data-lucide="bell" style="width: 10px; height: 10px; display: inline; vertical-align: middle; margin-right: 2px;"></i> &lt; ${cat.lowStockAlert}</span>
          </div>
        </div>
      `;
      grid.appendChild(card);
    });

    lucide.createIcons();
  }

  // ==================== ALLOCATIONS VIEW ====================
  function renderAllocationsTable() {
    const data = DB.getData();
    const tbody = document.getElementById('allocationsTableBody');
    tbody.innerHTML = '';

    const searchQuery = document.getElementById('allocationSearchFilter').value.toLowerCase().trim();
    const statusQuery = document.getElementById('allocationStatusFilter').value;

    let filtered = data.allocations.filter(alloc => {
      const asset = data.assets.find(a => a.id === alloc.assetId) || { name: 'Unknown Asset' };
      const matchSearch = alloc.employeeName.toLowerCase().includes(searchQuery) ||
                          alloc.employeeId.toLowerCase().includes(searchQuery) ||
                          alloc.assetId.toLowerCase().includes(searchQuery) ||
                          asset.name.toLowerCase().includes(searchQuery) ||
                          alloc.id.toLowerCase().includes(searchQuery);
      
      const matchStatus = !statusQuery || alloc.status === statusQuery;
      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">No allocations found matching parameters.</td></tr>';
      return;
    }

    filtered.reverse().forEach(alloc => {
      const asset = data.assets.find(a => a.id === alloc.assetId) || { name: 'Unknown Asset' };
      
      let statusClass = 'allocated';
      if (alloc.status === 'Returned') statusClass = 'instock';
      if (alloc.status.includes('Damaged')) statusClass = 'damaged';

      const isOverdue = alloc.status === 'Active' && alloc.dueDate && alloc.dueDate < new Date().toISOString().split('T')[0];
      const overdueLabel = isOverdue ? ' <span class="status-pill damaged" style="font-size: 9px; padding: 1px 4px; margin-left: 4px;">OVERDUE</span>' : '';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${alloc.id}</strong></td>
        <td>${alloc.assetId}</td>
        <td>${asset.name}</td>
        <td>${alloc.employeeName}</td>
        <td>${alloc.allocatedDate}</td>
        <td>${alloc.dueDate}${overdueLabel}</td>
        <td><span class="status-pill ${statusClass}">${alloc.status}</span></td>
        <td class="text-right">
          ${alloc.status === 'Active' ? `<button class="btn-primary checkin" style="padding: 4px 8px; font-size: 11px;" data-id="${alloc.assetId}"><i data-lucide="rotate-ccw"></i> Check In</button>` : ''}
        </td>
      `;
      tbody.appendChild(tr);
    });

    lucide.createIcons();

    // Checkin button clicks
    tbody.querySelectorAll('button.checkin').forEach(btn => {
      btn.addEventListener('click', function () {
        const assetId = this.getAttribute('data-id');
        if (confirm(`Process return/check-in of hardware asset ${assetId}?`)) {
          DB.returnAsset(assetId);
        }
      });
    });
  }

  // ==================== RETURNS VIEW ====================
  function renderReturnsTable() {
    const data = DB.getData();
    const tbody = document.getElementById('returnsTableBody');
    tbody.innerHTML = '';

    const searchQuery = document.getElementById('returnsSearchFilter').value.toLowerCase().trim();

    let filtered = data.returns.filter(ret => {
      return ret.assetName.toLowerCase().includes(searchQuery) ||
             ret.assetId.toLowerCase().includes(searchQuery) ||
             ret.employeeName.toLowerCase().includes(searchQuery) ||
             ret.id.toLowerCase().includes(searchQuery);
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 30px; color: var(--text-muted);">No return logs found matching parameters.</td></tr>';
      return;
    }

    filtered.forEach(ret => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${ret.id}</strong></td>
        <td><strong>${ret.assetId}</strong> - ${ret.assetName}</td>
        <td>${ret.employeeName}</td>
        <td>${ret.allocatedDate}</td>
        <td>${ret.returnedDate}</td>
        <td><span class="status-pill instock">Completed</span></td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ==================== DAMAGE & REPAIR LOGS ====================
  function renderDamageTable() {
    const data = DB.getData();
    const tbody = document.getElementById('damageTableBody');
    tbody.innerHTML = '';

    const searchQuery = document.getElementById('damageSearchFilter').value.toLowerCase().trim();
    const statusQuery = document.getElementById('damageStatusFilter').value;

    let filtered = data.damageReports.filter(rep => {
      const matchSearch = rep.assetName.toLowerCase().includes(searchQuery) ||
                          rep.assetId.toLowerCase().includes(searchQuery) ||
                          rep.reportedByName.toLowerCase().includes(searchQuery) ||
                          rep.description.toLowerCase().includes(searchQuery) ||
                          rep.id.toLowerCase().includes(searchQuery);
      const matchStatus = !statusQuery || rep.status === statusQuery;
      return matchSearch && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">No damage logs matching parameters.</td></tr>';
      return;
    }

    filtered.forEach(rep => {
      let statusClass = 'open';
      if (rep.status === 'Resolved') statusClass = 'instock';
      if (rep.status === 'Disposed') statusClass = 'disposed';
      if (rep.status === 'Under Repair') statusClass = 'allocated';

      let actionSelect = '';
      if (rep.status === 'Open' || rep.status === 'Under Repair') {
        actionSelect = `
          <div class="actions-cell-buttons">
            <button class="btn-table-action edit text-blue btn-dmg-repair" data-id="${rep.id}" title="Send to Repair Shop"><i data-lucide="hammer"></i></button>
            <button class="btn-table-action allocate text-green btn-dmg-resolve" data-id="${rep.id}" title="Resolve & Return to Stock"><i data-lucide="check"></i></button>
            <button class="btn-table-action delete btn-dmg-dispose" data-id="${rep.id}" title="Scrap / Dispose Asset"><i data-lucide="trash-2"></i></button>
          </div>
        `;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${rep.id}</strong></td>
        <td><strong>${rep.assetId}</strong> - ${rep.assetName}</td>
        <td>${rep.reportedByName}</td>
        <td>${rep.description}</td>
        <td>${rep.reportDate || rep.reportedDate}</td>
        <td><span class="status-pill ${statusClass}">${rep.status}</span></td>
        <td class="text-right">${actionSelect}</td>
      `;
      tbody.appendChild(tr);
    });

    lucide.createIcons();

    // Damage action triggers
    tbody.querySelectorAll('.btn-dmg-repair').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        const rdata = DB.getData();
        const rep = rdata.damageReports.find(r => r.id === id);
        if (rep) {
          rep.status = 'Under Repair';
          DB.saveData(rdata);
          alert('Asset status updated to "Under Repair".');
        }
      });
    });

    tbody.querySelectorAll('.btn-dmg-resolve').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        if (confirm('Resolve damage report and check asset back into Stock?')) {
          DB.resolveDamage(id, 'Resolved');
        }
      });
    });

    tbody.querySelectorAll('.btn-dmg-dispose').forEach(btn => {
      btn.addEventListener('click', function() {
        const id = this.getAttribute('data-id');
        if (confirm('Scrap and dispose of this hardware asset? This writes it off the system.')) {
          DB.resolveDamage(id, 'Disposed');
        }
      });
    });
  }

  // ==================== EMPLOYEES DIRECTORY ====================
  function renderEmployeesTable() {
    const data = DB.getData();
    const tbody = document.getElementById('employeesTableBody');
    tbody.innerHTML = '';

    const searchQuery = document.getElementById('employeeSearchFilter').value.toLowerCase().trim();
    const departmentQuery = document.getElementById('employeeDepartmentFilter').value;

    // Populate filter dropdown if empty
    const filterSelect = document.getElementById('employeeDepartmentFilter');
    if (filterSelect.children.length === 1) {
      const depts = [...new Set(data.employees.map(e => e.department))];
      depts.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        filterSelect.appendChild(opt);
      });
      
      // Populate employee modal departments as well
      const modalSelect = document.getElementById('empDepartment');
      modalSelect.innerHTML = '';
      depts.forEach(dept => {
        const opt = document.createElement('option');
        opt.value = dept;
        opt.textContent = dept;
        modalSelect.appendChild(opt);
      });
    }

    let filtered = data.employees.filter(emp => {
      const matchSearch = emp.name.toLowerCase().includes(searchQuery) ||
                          emp.email.toLowerCase().includes(searchQuery) ||
                          emp.id.toLowerCase().includes(searchQuery);
      const matchDept = !departmentQuery || emp.department === departmentQuery;
      return matchSearch && matchDept;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">No employees found.</td></tr>';
      return;
    }

    filtered.forEach(emp => {
      // Calculate active allocations count
      const activeAllocations = data.assets.filter(a => a.status === 'Allocated' && a.assignedTo === emp.id).length;

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${emp.id}</strong></td>
        <td>${emp.name}</td>
        <td><a href="mailto:${emp.email}" style="color: var(--primary); text-decoration: underline;">${emp.email}</a></td>
        <td>${emp.department}</td>
        <td><span class="status-pill ${activeAllocations > 0 ? 'allocated' : 'disposed'}" style="font-size:12px; font-weight:700;">${activeAllocations} assigned</span></td>
        <td>${emp.addedDate}</td>
        <td class="text-right">
          <span class="status-pill instock">Active</span>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // ==================== REPORTS AND EXPORTS ====================
  function renderReportsView() {
    const data = DB.getData();
    
    // Value computations
    const totalAssets = data.assets.length;
    const allocated = data.assets.filter(a => a.status === 'Allocated').length;
    const damaged = data.assets.filter(a => a.status === 'Damaged').length;
    
    const damageRate = totalAssets > 0 ? ((damaged / totalAssets) * 100).toFixed(1) : 0;
    const utilizationRate = totalAssets > 0 ? ((allocated / totalAssets) * 100).toFixed(1) : 0;

    document.getElementById('report-total-value').textContent = totalAssets;
    document.getElementById('report-active-allocations').textContent = allocated;
    document.getElementById('report-repair-rate').textContent = `${damageRate}%`;
    document.getElementById('report-utilization-rate').textContent = `${utilizationRate}%`;
  }

  function setupExportReports() {
    // Assets CSV Export
    document.getElementById('btnExportAssets').addEventListener('click', function() {
      const data = DB.getAssets();
      let csv = 'Asset ID,Asset Name,Serial Number,Category,Status,Assigned To Name,Assigned Date,Due Date,Added Date\n';
      
      data.forEach(a => {
        csv += `"${a.id}","${a.name}","${a.serialNumber}","${a.category}","${a.status}","${a.assignedToName || ''}","${a.assignedDate || ''}","${a.dueDate || ''}","${a.addedDate}"\n`;
      });

      downloadCSV(csv, 'assets_inventory_report.csv');
    });

    // Employees CSV Export
    document.getElementById('btnExportEmployees').addEventListener('click', function() {
      const data = DB.getData().employees;
      let csv = 'Employee ID,Full Name,Email Address,Department,Status,Joined Date\n';
      
      data.forEach(e => {
        csv += `"${e.id}","${e.name}","${e.email}","${e.department}","${e.status}","${e.addedDate}"\n`;
      });

      downloadCSV(csv, 'employees_directory_report.csv');
    });

    // Allocations CSV Export
    document.getElementById('btnExportAllocations').addEventListener('click', function() {
      const data = DB.getData().allocations;
      let csv = 'Allocation ID,Asset ID,Employee Name,Allocated Date,Due Date,Status\n';
      
      data.forEach(a => {
        csv += `"${a.id}","${a.assetId}","${a.employeeName}","${a.allocatedDate}","${a.dueDate}","${a.status}"\n`;
      });

      downloadCSV(csv, 'asset_allocations_history.csv');
    });
  }

  function downloadCSV(csvContent, fileName) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // ==================== AUDIT HISTORY VIEW ====================
  function renderHistoryTimeline() {
    const data = DB.getData();
    const container = document.getElementById('historyTimeline');
    container.innerHTML = '';

    const searchQuery = document.getElementById('historySearchFilter').value.toLowerCase().trim();

    let filtered = data.history.filter(h => {
      return h.details.toLowerCase().includes(searchQuery) ||
             h.action.toLowerCase().includes(searchQuery) ||
             h.timestamp.toLowerCase().includes(searchQuery);
    });

    if (filtered.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 30px; color: var(--text-muted);">No history events match search filters.</div>';
      return;
    }

    filtered.forEach(item => {
      const div = document.createElement('div');
      div.className = `timeline-item ${item.type || 'info'}`;
      
      let markerIcon = 'info';
      if (item.action === 'Asset Allocated') markerIcon = 'user-check';
      if (item.action === 'Asset Returned') markerIcon = 'rotate-ccw';
      if (item.action === 'Damage Reported') markerIcon = 'alert-triangle';
      if (item.action === 'Asset Deleted') markerIcon = 'trash-2';
      if (item.action === 'Data Imported') markerIcon = 'upload-cloud';

      div.innerHTML = `
        <div class="timeline-marker">
          <i data-lucide="${markerIcon}" style="width: 10px; height: 10px; color: #ffffff;"></i>
        </div>
        <div class="timeline-content">
          <div class="timeline-title">${item.action}</div>
          <div class="timeline-desc">${item.details}</div>
          <div class="timeline-time">${item.timestamp}</div>
        </div>
      `;
      container.appendChild(div);
    });

    lucide.createIcons();
  }

  // ==================== EMPLOYEE REQUESTS ====================
  function renderRequestsTable() {
    const data = DB.getData();
    const tbody = document.getElementById('requestsTableBody');
    tbody.innerHTML = '';

    if (data.requests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 30px; color: var(--text-muted);">No hardware requests logged in system.</td></tr>';
      return;
    }

    data.requests.forEach(req => {
      let statusClass = 'open';
      if (req.status === 'Approved') statusClass = 'instock';
      if (req.status === 'Rejected') statusClass = 'damaged';

      let actionButtons = '';
      if (req.status === 'Pending') {
        actionButtons = `
          <button class="btn-primary btn-req-approve" data-id="${req.id}" style="padding: 4px 8px; font-size: 11px;"><i data-lucide="check"></i> Approve</button>
          <button class="btn-danger btn-req-reject" data-id="${req.id}" style="padding: 4px 8px; font-size: 11px; margin-left:4px;"><i data-lucide="x"></i> Reject</button>
        `;
      }

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${req.id}</strong></td>
        <td>${req.employeeName}</td>
        <td><strong>${req.assetType}</strong></td>
        <td>${req.purpose}</td>
        <td>${req.requestDate}</td>
        <td><span class="status-pill ${statusClass}">${req.status}</span></td>
        <td class="text-right">${actionButtons}</td>
      `;
      tbody.appendChild(tr);
    });

    lucide.createIcons();

    // Request click listeners
    tbody.querySelectorAll('.btn-req-approve').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        const req = DB.getData().requests.find(r => r.id === id);
        if (req) {
          // Attempt to find an asset of category corresponding to request type
          const categoryId = req.assetType.toLowerCase();
          const availableAssets = DB.getAssets().filter(a => a.category === categoryId && a.status === 'In Stock');

          if (availableAssets.length === 0) {
            alert(`No ${req.assetType}s are currently In Stock to allocate. Please add an asset or return one first.`);
            return;
          }

          // Automatically allocate the first available asset in that category
          const assetToAllocate = availableAssets[0];
          const due = new Date();
          due.setDate(due.getDate() + 90); // Default 90 day loan
          const dueStr = due.toISOString().split('T')[0];

          if (DB.allocateAsset(assetToAllocate.id, req.employeeId, dueStr)) {
            DB.updateRequest(id, 'Approved');
            alert(`Approved request! Asset ${assetToAllocate.name} (${assetToAllocate.id}) has been allocated to ${req.employeeName}.`);
          }
        }
      });
    });

    tbody.querySelectorAll('.btn-req-reject').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        if (confirm('Are you sure you want to reject this request?')) {
          DB.updateRequest(id, 'Rejected');
        }
      });
    });
  }

  // ==================== REMINDERS / ALERT CENTER ====================
  function renderRemindersView() {
    const data = DB.getData();
    
    // 1. Render Overdue returns
    const overdueList = document.getElementById('overdueAlertsList');
    overdueList.innerHTML = '';
    
    const today = new Date().toISOString().split('T')[0];
    const overdueAssets = data.assets.filter(a => a.status === 'Allocated' && a.dueDate && a.dueDate < today);

    if (overdueAssets.length === 0) {
      overdueList.innerHTML = '<div style="color: var(--text-muted); padding: 12px; font-style: italic; font-size:13px;">No overdue returns pending!</div>';
    } else {
      overdueAssets.forEach(asset => {
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-item danger';
        alertDiv.innerHTML = `
          <div class="alert-item-icon"><i data-lucide="clock"></i></div>
          <div class="alert-item-content">
            <h4>Overdue return: ${asset.name} (${asset.id})</h4>
            <p>Assigned to: <strong>${asset.assignedToName}</strong> (ID: ${asset.assignedTo}). Expected return was <strong>${asset.dueDate}</strong>.</p>
            <span class="btn-alert-action btn-return-alert" data-id="${asset.id}">Mark Returned</span>
          </div>
        `;
        overdueList.appendChild(alertDiv);
      });
    }

    // 2. Render Low Stock warnings
    const lowStockList = document.getElementById('lowStockAlertsList');
    lowStockList.innerHTML = '';
    
    let lowStockFired = false;
    data.categories.forEach(cat => {
      const inStock = data.assets.filter(a => a.category === cat.id && a.status === 'In Stock').length;
      if (inStock < cat.lowStockAlert) {
        lowStockFired = true;
        const alertDiv = document.createElement('div');
        alertDiv.className = 'alert-item warning';
        alertDiv.innerHTML = `
          <div class="alert-item-icon"><i data-lucide="alert-triangle"></i></div>
          <div class="alert-item-content">
            <h4>Low stock warning: ${cat.name} category</h4>
            <p>Active In Stock count: <strong>${inStock}</strong>. Alert limit is configured at <strong>&lt; ${cat.lowStockAlert}</strong> units.</p>
            <span class="btn-alert-action btn-add-stock-alert" data-cat="${cat.id}">Add more ${cat.name} assets</span>
          </div>
        `;
        lowStockList.appendChild(alertDiv);
      }
    });

    if (!lowStockFired) {
      lowStockList.innerHTML = '<div style="color: var(--text-muted); padding: 12px; font-style: italic; font-size:13px;">All categories have sufficient stock!</div>';
    }

    lucide.createIcons();

    // Bind triggers
    overdueList.querySelectorAll('.btn-return-alert').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        if (confirm(`Check in hardware asset ${id}?`)) {
          DB.returnAsset(id);
        }
      });
    });

    lowStockList.querySelectorAll('.btn-add-stock-alert').forEach(btn => {
      btn.addEventListener('click', function () {
        const catId = this.getAttribute('data-cat');
        switchView('assets');
        openAddAssetModal(catId);
      });
    });
  }

  // ==================== SYSTEM SETTINGS VIEW ====================
  function renderSettingsView() {
    const data = DB.getData();
    
    document.getElementById('setCompanyName').value = data.settings.companyName || '';
    document.getElementById('setPortalSubName').value = data.settings.portalSubName || '';
    document.getElementById('setAdminName').value = data.settings.adminName || '';
    document.getElementById('setAdminRole').value = data.settings.adminRole || '';
  }

  // ==================== DATA IMPORT WIZARD ====================
  function setupImportWizard() {
    const textarea = document.getElementById('importTextArea');
    const runBtn = document.getElementById('btnRunImport');
    const loadDemoBtn = document.getElementById('btnLoadExampleDataset');
    const fileInput = document.getElementById('fileUploadInput');
    const feedbackBox = document.getElementById('importFeedback');

    loadDemoBtn.addEventListener('click', function () {
      const type = document.getElementById('importTableType').value;
      if (type === 'assets') {
        textarea.value = `name,serialNumber,category,status
HP ProBook 450 G10,SN-HPP7766,laptop,In Stock
MacBook Air M3,SN-MBA9988,laptop,In Stock
Logitech Lift Vertical,SN-LIF667,accessory,In Stock
Samsung 27" Curved,SN-SAM2233,monitor,In Stock
iPhone SE 2022,SN-IPSE3322,phone,In Stock`;
      } else {
        textarea.value = `name,email,department
Kunal Patel,kunal.patel@corporate.com,Engineering
Kriti Iyer,kriti.iyer@corporate.com,HR
Ravi Shastri,ravi.shastri@corporate.com,Sales
Meghna Nair,meghna.nair@corporate.com,Product`;
      }
      feedbackBox.style.display = 'none';
    });

    // Import select change wipes text
    document.getElementById('importTableType').addEventListener('change', function () {
      textarea.value = '';
      feedbackBox.style.display = 'none';
    });

    // File selection
    fileInput.addEventListener('change', function (e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function (evt) {
        textarea.value = evt.target.result;
      };
      reader.readAsText(file);
    });

    // Import Execution
    runBtn.addEventListener('click', function () {
      const type = document.getElementById('importTableType').value;
      const rawText = textarea.value.trim();
      
      if (!rawText) {
        showImportFeedback('error', 'Please paste data or select a file to import first.');
        return;
      }

      try {
        let parsedData = [];
        
        // Determine parser based on format (JSON or CSV)
        if (rawText.startsWith('[') && rawText.endsWith(']')) {
          // JSON array
          parsedData = JSON.parse(rawText);
        } else {
          // CSV Parser
          parsedData = parseCSV(rawText);
        }

        if (!Array.isArray(parsedData) || parsedData.length === 0) {
          throw new Error('Parsed dataset is not an array of objects or is empty.');
        }

        const count = DB.importDataset(type, parsedData);
        
        showImportFeedback('success', `Data import successful! Imported/merged ${count} records into the ${type} database table. View details in Assets or Employees.`);
        textarea.value = '';
        fileInput.value = '';
      } catch (err) {
        showImportFeedback('error', `Import Failed: ${err.message}. Check data format (Ensure correct column headers or valid JSON layout).`);
      }
    });
  }

  function parseCSV(text) {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l !== '');
    if (lines.length === 0) return [];
    
    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const result = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      if (values.length !== headers.length) continue; // Skip malformed rows
      
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = values[index];
      });
      result.push(obj);
    }
    return result;
  }

  function showImportFeedback(type, text) {
    const box = document.getElementById('importFeedback');
    box.className = `import-feedback-box ${type}`;
    box.style.display = 'block';
    box.innerHTML = `
      <strong>${type === 'success' ? '✔ Success' : '✖ Error'}:</strong> ${text}
    `;
  }

  // ==================== MODALS INTERACTION ====================
  function setupModals() {
    // Bind overlay click to close
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', function (e) {
        if (e.target === this) {
          closeModal(this.id);
        }
      });
    });

    // Close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', function () {
        const modalId = this.getAttribute('data-close-modal');
        closeModal(modalId);
      });
    });

    // Add Asset modal triggers
    document.getElementById('btnOpenAddAssetModal').addEventListener('click', function() {
      openAddAssetModal();
    });

    // Add Employee modal triggers
    document.getElementById('btnOpenAddEmployeeModal').addEventListener('click', function() {
      document.getElementById('modalAddEmployee').classList.add('active');
    });

    // Add Category modal triggers
    document.getElementById('btnOpenAddCategoryModal').addEventListener('click', function() {
      document.getElementById('modalAddCategory').classList.add('active');
    });

    // Allocation triggers (Global Allocate btn)
    document.getElementById('btnOpenAllocateModal').addEventListener('click', function () {
      // Find the first in-stock asset to auto-populate or prompt
      const available = DB.getAssets().filter(a => a.status === 'In Stock');
      if (available.length === 0) {
        alert('All assets are currently Allocated or Damaged! Please add more hardware assets to stock first.');
        return;
      }
      openAllocationModal(available[0].id);
    });

    // Report Damage modal trigger
    document.getElementById('btnOpenReportDamageModal').addEventListener('click', function () {
      const data = DB.getData();
      
      // Populate select asset
      const assetSelect = document.getElementById('dmgAssetId');
      assetSelect.innerHTML = '<option value="">Select Asset...</option>';
      data.assets.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.id;
        opt.textContent = `${a.name} (${a.id}) - ${a.status}`;
        assetSelect.appendChild(opt);
      });

      // Populate select employee
      const empSelect = document.getElementById('dmgEmployeeId');
      empSelect.innerHTML = '<option value="">Administrator / Not Assigned</option>';
      data.employees.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id;
        opt.textContent = `${e.name} (${e.department})`;
        empSelect.appendChild(opt);
      });

      document.getElementById('modalReportDamage').classList.add('active');
    });
  }

  function openAddAssetModal(preSelectedCatId = '') {
    const data = DB.getData();
    const select = document.getElementById('addAssetCategory');
    select.innerHTML = '';
    
    data.categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });

    if (preSelectedCatId) {
      select.value = preSelectedCatId;
    }

    // Auto-generate a dummy serial number for convenience
    document.getElementById('addAssetSerial').value = 'SN-' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('formAddAsset').reset; // don't wipe category
    
    document.getElementById('modalAddAsset').classList.add('active');
  }

  function openAllocationModal(assetId) {
    const data = DB.getData();
    const asset = data.assets.find(a => a.id === assetId);
    if (!asset || asset.status !== 'In Stock') return;

    // Preview
    const catObj = data.categories.find(c => c.id === asset.category) || { name: asset.category };
    document.getElementById('allocAssetId').value = assetId;
    document.getElementById('allocAssetPreview').innerHTML = `
      <strong>${asset.name}</strong> (${asset.id}) - ${catObj.name} [Serial: ${asset.serialNumber}]
    `;

    // Populate employees dropdown
    const empSelect = document.getElementById('allocEmployeeId');
    empSelect.innerHTML = '<option value="">Select Employee...</option>';
    data.employees.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = `${e.name} (${e.department})`;
      empSelect.appendChild(opt);
    });

    // Default due date (30 days from now)
    const due = new Date();
    due.setDate(due.getDate() + 30);
    document.getElementById('allocDueDate').value = due.toISOString().split('T')[0];

    document.getElementById('modalAllocateAsset').classList.add('active');
  }

  function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
  }

  // ==================== FORM SUBMISSIONS ====================
  function setupForms() {
    // 1. Add Asset Form
    document.getElementById('formAddAsset').addEventListener('submit', function (e) {
      e.preventDefault();
      const asset = {
        name: document.getElementById('addAssetName').value.trim(),
        category: document.getElementById('addAssetCategory').value,
        serialNumber: document.getElementById('addAssetSerial').value.trim(),
        status: document.getElementById('addAssetStatus').value
      };
      
      DB.addAsset(asset);
      closeModal('modalAddAsset');
      this.reset();
    });

    // 2. Allocate Asset Form
    document.getElementById('formAllocateAsset').addEventListener('submit', function (e) {
      e.preventDefault();
      const assetId = document.getElementById('allocAssetId').value;
      const employeeId = document.getElementById('allocEmployeeId').value;
      const dueDate = document.getElementById('allocDueDate').value;

      if (DB.allocateAsset(assetId, employeeId, dueDate)) {
        closeModal('modalAllocateAsset');
        this.reset();
      } else {
        alert('Allocation failed. Check if asset is still in stock.');
      }
    });

    // 3. Report Damage Form
    document.getElementById('formReportDamage').addEventListener('submit', function (e) {
      e.preventDefault();
      const assetId = document.getElementById('dmgAssetId').value;
      const employeeId = document.getElementById('dmgEmployeeId').value;
      const desc = document.getElementById('dmgDescription').value.trim();

      if (DB.reportDamage(assetId, employeeId, desc)) {
        closeModal('modalReportDamage');
        this.reset();
      } else {
        alert('Failed to log report.');
      }
    });

    // 4. Add Employee Form
    document.getElementById('formAddEmployee').addEventListener('submit', function (e) {
      e.preventDefault();
      const employee = {
        name: document.getElementById('empName').value.trim(),
        email: document.getElementById('empEmail').value.trim(),
        department: document.getElementById('empDepartment').value
      };

      DB.addEmployee(employee);
      closeModal('modalAddEmployee');
      this.reset();
    });

    // 5. Add Category Form
    document.getElementById('formAddCategory').addEventListener('submit', function (e) {
      e.preventDefault();
      const category = {
        name: document.getElementById('catName').value.trim(),
        icon: document.getElementById('catIcon').value,
        color: document.getElementById('catColor').value,
        lowStockAlert: parseInt(document.getElementById('catAlertThreshold').value, 10) || 5
      };

      DB.addCategory(category);
      closeModal('modalAddCategory');
      this.reset();
    });

    // 6. Settings General Form
    document.getElementById('settingsGeneralForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const data = DB.getData();
      data.settings.companyName = document.getElementById('setCompanyName').value.trim();
      data.settings.portalSubName = document.getElementById('setPortalSubName').value.trim();
      data.settings.adminName = document.getElementById('setAdminName').value.trim();
      data.settings.adminRole = document.getElementById('setAdminRole').value.trim();

      DB.saveData(data);
      alert('Portal settings saved successfully.');
    });
  }

  // ==================== MOCK AI ASSISTANT INVENTORY ANALYTICS ====================
  function setupAIInventory() {
    const input = document.getElementById('aiChatInput');
    const sendBtn = document.getElementById('btnSendAIChat');
    
    // Quick prompts clicking
    const promptCards = document.querySelectorAll('.ai-prompt-card');
    promptCards.forEach(card => {
      card.addEventListener('click', function () {
        const queryType = this.getAttribute('data-prompt');
        executeAIQuery(queryType);
      });
    });

    sendBtn.addEventListener('click', function () {
      triggerCustomAIChat();
    });

    input.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        triggerCustomAIChat();
      }
    });
  }

  function executeAIQuery(type) {
    let queryTitle = '';
    if (type === 'stock-forecast') queryTitle = 'Run Stock Depletion Forecast';
    else if (type === 'allocation-optim') queryTitle = 'Run Allocation Recommendation';
    else if (type === 'health-report') queryTitle = 'Run Inventory Health Report';

    addChatMessage('user', queryTitle);
    
    // Loading indicator
    const loadingId = addChatMessage('assistant', 'NVIDIA NIM is analyzing active SQL dataset...', true);
    
    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: type })
    })
    .then(res => {
      if (!res.ok) throw new Error("AI NIM service returned error");
      return res.json();
    })
    .then(data => {
      removeChatMessage(loadingId);
      addChatMessage('assistant', data.response || "No analysis returned from NVIDIA NIM.");
    })
    .catch(err => {
      removeChatMessage(loadingId);
      addChatMessage('assistant', `Failed to generate analysis: ${err.message}. Please verify server connection and API key permissions.`);
    });
  }

  function triggerCustomAIChat() {
    const input = document.getElementById('aiChatInput');
    const text = input.value.trim();
    if (!text) return;

    addChatMessage('user', text);
    input.value = '';

    const loadingId = addChatMessage('assistant', 'NVIDIA NIM is processing database tables...', true);

    fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: text })
    })
    .then(res => {
      if (!res.ok) throw new Error("AI NIM service returned error");
      return res.json();
    })
    .then(data => {
      removeChatMessage(loadingId);
      addChatMessage('assistant', data.response || "No response received.");
    })
    .catch(err => {
      removeChatMessage(loadingId);
      addChatMessage('assistant', `Failed to process query: ${err.message}. Please verify server connection and API key permissions.`);
    });
  }

  function addChatMessage(sender, text, isLoading = false) {
    const container = document.getElementById('aiChatMessages');
    const msgId = 'msg-' + Date.now() + Math.floor(Math.random() * 100);

    const div = document.createElement('div');
    div.className = `chat-message ${sender}`;
    div.id = msgId;
    
    let loadingDots = isLoading ? '<span class="loading-dots">...</span>' : '';
    
    div.innerHTML = `
      <div class="message-bubble">${text}${loadingDots}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    
    return msgId;
  }

  function removeChatMessage(id) {
    const msg = document.getElementById(id);
    if (msg) msg.remove();
  }

  // Date helper hence
  function daysHence(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
  }

  // Run App
  init();
});
