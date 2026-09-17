// CarePulse Client Application Logic

let state = {
  token: localStorage.getItem('carepulse_token') || null,
  user: JSON.parse(localStorage.getItem('carepulse_user') || 'null'),
  currentPage: 1,
  totalPages: 1,
  searchQuery: '',
  selectedSpecialty: 'All',
  sortBy: 'rating',
  sortOrder: 'DESC',
  currentDoctorForBooking: null,
  doctorsListAll: []
};

// DOM Load Initialization
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  updateAuthUI();
  fetchStats();
  fetchSpecialties();
  fetchDoctors();
  fetchAllDoctorsForFrontDesk();

  // Set minimum date for booking & front desk date picker to today
  const dateInput = document.getElementById('book-date');
  const fdDateInput = document.getElementById('fd-date-select');
  const today = new Date().toISOString().split('T')[0];
  
  if (dateInput) {
    dateInput.min = today;
    dateInput.value = today;
  }
  if (fdDateInput) {
    fdDateInput.min = today;
    fdDateInput.value = today;
  }
}

// Update Header User UI
function updateAuthUI() {
  const container = document.getElementById('auth-buttons');
  if (!container) return;

  if (state.token && state.user) {
    const initial = state.user.name ? state.user.name.charAt(0).toUpperCase() : 'U';
    container.innerHTML = `
      <div class="user-pill">
        <div class="user-avatar-sm">${initial}</div>
        <div style="font-size: 0.88rem; font-weight: 600;">${escapeHtml(state.user.name)}</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="handleLogout()">Logout</button>
    `;
  } else {
    container.innerHTML = `
      <button class="btn btn-secondary" onclick="openAuthModal('login')">Login</button>
      <button class="btn btn-primary" onclick="openAuthModal('register')">Register</button>
    `;
  }
}

// Tab Switching
function switchTab(tab) {
  const briefSec = document.getElementById('product-brief');
  const docSec = document.getElementById('doctors-section');
  const fdSec = document.getElementById('frontdesk-section');
  const apptSec = document.getElementById('appointments-section');
  const logSec = document.getElementById('logs-section');

  document.querySelectorAll('.nav-link').forEach((link) => link.classList.remove('active'));

  briefSec.style.display = 'none';
  docSec.style.display = 'none';
  fdSec.style.display = 'none';
  apptSec.style.display = 'none';
  logSec.style.display = 'none';

  if (tab === 'landing') {
    briefSec.style.display = 'block';
    docSec.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (tab === 'doctors') {
    docSec.style.display = 'block';
    docSec.scrollIntoView({ behavior: 'smooth' });
  } else if (tab === 'frontdesk') {
    fdSec.style.display = 'block';
    loadDoctorDayGrid();
  } else if (tab === 'appointments') {
    if (!state.token) {
      showToast('Please login to view your appointments.', 'error');
      openAuthModal('login');
      return;
    }
    apptSec.style.display = 'block';
    fetchMyAppointments();
  } else if (tab === 'logs') {
    logSec.style.display = 'block';
    fetchLogs();
  }
}

// Fetch Summary Stats
async function fetchStats() {
  try {
    const res = await fetch('/api/stats/summary');
    const data = await res.json();
    if (data.success) {
      document.getElementById('stat-doctors').innerText = data.stats.totalDoctors + '+';
      document.getElementById('stat-specialties').innerText = data.stats.totalSpecialties;
      document.getElementById('stat-appts').innerText = data.stats.totalAppointments;
      document.getElementById('stat-emergency').innerText = data.stats.emergencyAppointments;
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// Fetch Specialties
async function fetchSpecialties() {
  try {
    const res = await fetch('/api/doctors/specialties/all');
    const data = await res.json();
    if (data.success) {
      const container = document.getElementById('specialty-pills');
      let html = `<div class="pill ${state.selectedSpecialty === 'All' ? 'active' : ''}" onclick="filterSpecialty('All')">All Specialties</div>`;
      data.specialties.forEach((spec) => {
        html += `<div class="pill ${state.selectedSpecialty === spec ? 'active' : ''}" onclick="filterSpecialty('${escapeHtml(spec)}')">${escapeHtml(spec)}</div>`;
      });
      container.innerHTML = html;
    }
  } catch (err) {
    console.error('Error fetching specialties:', err);
  }
}

// Fetch All Doctors for Front Desk Dropdown
async function fetchAllDoctorsForFrontDesk() {
  try {
    const res = await fetch('/api/doctors?limit=50');
    const data = await res.json();
    if (data.success) {
      state.doctorsListAll = data.data;
      const select = document.getElementById('fd-doctor-select');
      if (select) {
        select.innerHTML = data.data.map((d) => `<option value="${d.id}">${escapeHtml(d.name)} (${escapeHtml(d.specialty)})</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Error fetching front desk doctors list:', err);
  }
}

// Fetch Paginated Doctors
async function fetchDoctors() {
  const container = document.getElementById('doctors-container');
  container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Loading doctors...</div>`;

  try {
    const url = `/api/doctors?search=${encodeURIComponent(state.searchQuery)}&specialty=${encodeURIComponent(state.selectedSpecialty)}&sortBy=${state.sortBy}&order=${state.sortOrder}&page=${state.currentPage}&limit=6`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      renderDoctors(data.data);
      updatePagination(data.pagination);
    } else {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--danger);">Failed to load doctors.</div>`;
    }
  } catch (err) {
    console.error('Error fetching doctors:', err);
  }
}

// Render Doctor Cards
function renderDoctors(doctors) {
  const container = document.getElementById('doctors-container');
  if (!doctors || doctors.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border);">
        <div style="font-size: 3rem; margin-bottom: 10px;">🔍</div>
        <h3>No Doctors Found</h3>
        <p style="color: var(--text-muted);">Try adjusting your search keywords or specialty filters.</p>
      </div>
    `;
    return;
  }

  let html = '';
  doctors.forEach((doc) => {
    const daysHtml = doc.available_days.map((day) => `<span class="day-badge">${day}</span>`).join('');
    
    html += `
      <div class="doc-card">
        <div>
          <div class="doc-header">
            <img src="${doc.avatar || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300'}" alt="${escapeHtml(doc.name)}" class="doc-avatar">
            <div class="doc-info">
              <h3>${escapeHtml(doc.name)}</h3>
              <span class="specialty-badge">${escapeHtml(doc.specialty)}</span>
              <div class="doc-qualification">${escapeHtml(doc.qualification)}</div>
            </div>
          </div>

          <div class="doc-stats">
            <div class="stat-item">
              <span>Experience</span>
              <span>${doc.experience} Years</span>
            </div>
            <div class="stat-item">
              <span>Rating</span>
              <span>⭐ ${doc.rating} (${doc.review_count})</span>
            </div>
            <div class="stat-item">
              <span>Fee</span>
              <span>₹${doc.fee}</span>
            </div>
          </div>

          <div class="doc-address">
            📍 <span>${escapeHtml(doc.clinic_address)}, ${escapeHtml(doc.city)}</span>
          </div>

          <div style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 6px;">Available Days:</div>
          <div class="doc-days">${daysHtml}</div>
        </div>

        <button class="btn btn-primary" style="width: 100%; justify-content: center;" onclick="openBookingModal(${doc.id}, '${escapeHtml(doc.name)}', '${escapeHtml(doc.specialty)}', ${doc.fee})">
          📅 Book Consultation (₹${doc.fee})
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
}

// FRONT DESK: Load Doctor's Day Schedule Grid
async function loadDoctorDayGrid() {
  const docSelect = document.getElementById('fd-doctor-select');
  const dateSelect = document.getElementById('fd-date-select');
  const container = document.getElementById('fd-schedule-container');

  if (!docSelect || !docSelect.value || !dateSelect || !dateSelect.value) return;

  container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Loading schedule grid...</div>`;

  try {
    const res = await fetch(`/api/appointments/doctor-day?doctor_id=${docSelect.value}&date=${dateSelect.value}`);
    const data = await res.json();

    if (data.success) {
      let gridHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
          <div>
            <h3 style="font-size: 1.2rem;">Dr. ${escapeHtml(data.doctor.name)} — Schedule Grid</h3>
            <p style="font-size: 0.88rem; color: var(--text-muted);">${escapeHtml(data.doctor.specialty)} • Consultation Fee: ₹${data.doctor.fee} • Date: <strong>${data.date}</strong></p>
          </div>
          <div style="display: flex; gap: 10px;">
            <span style="background: #d1fae5; color: #065f46; font-size: 0.82rem; font-weight: 700; padding: 4px 12px; border-radius: var(--radius-full);">Available: ${data.available_count}</span>
            <span style="background: #fee2e2; color: #991b1b; font-size: 0.82rem; font-weight: 700; padding: 4px 12px; border-radius: var(--radius-full);">Booked: ${data.booked_count}</span>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px;">
      `;

      data.schedule.forEach((slot) => {
        const isBooked = slot.status === 'BOOKED';
        gridHtml += `
          <div style="background: ${isBooked ? '#fef2f2' : '#f0fdf4'}; border: 1px solid ${isBooked ? '#fca5a5' : '#86efac'}; border-radius: var(--radius-md); padding: 16px;">
            <div style="font-weight: 800; font-size: 1.05rem; color: ${isBooked ? '#991b1b' : '#166534'}; margin-bottom: 6px;">
              ⏰ ${slot.time_slot}
            </div>
            
            ${isBooked ? `
              <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-primary);">👤 ${escapeHtml(slot.patient_name)}</div>
              <div style="font-size: 0.8rem; color: var(--text-muted);">📞 ${escapeHtml(slot.patient_phone)}</div>
              ${slot.is_emergency ? '<span style="display:inline-block; margin-top:4px; font-size:0.75rem; background:#dc2626; color:white; padding:1px 6px; border-radius:4px;">EMERGENCY</span>' : ''}
              <div style="font-size: 0.78rem; color: #991b1b; font-weight: 600; margin-top: 6px;">🚫 LOCKED (Booked)</div>
            ` : `
              <div style="font-size: 0.85rem; color: #166534; font-weight: 600; margin-top: 10px;">✅ OPEN FOR BOOKING</div>
            `}
          </div>
        `;
      });

      gridHtml += `</div>`;
      container.innerHTML = gridHtml;
    }
  } catch (err) {
    console.error('Error loading schedule grid:', err);
    container.innerHTML = `<div style="color: var(--danger); text-align: center;">Failed to load schedule grid.</div>`;
  }
}

// FRONT DESK: Patient Search Lookup
let fdSearchTimeout;
function handleFrontDeskPatientSearch() {
  clearTimeout(fdSearchTimeout);
  fdSearchTimeout = setTimeout(async () => {
    const query = document.getElementById('fd-patient-search').value;
    const container = document.getElementById('fd-search-results-container');
    const grid = document.getElementById('fd-search-grid');

    if (!query.trim()) {
      container.style.display = 'none';
      return;
    }

    try {
      const res = await fetch(`/api/appointments/search?query=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.success) {
        container.style.display = 'block';
        if (data.appointments.length === 0) {
          grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 20px;">No patient appointments found matching "${escapeHtml(query)}".</div>`;
          return;
        }

        let html = '';
        data.appointments.forEach((app) => {
          const isCancelled = app.status === 'Cancelled';
          html += `
            <div class="appt-card" style="margin: 0;">
              <span class="appt-status ${isCancelled ? 'status-cancelled' : 'status-confirmed'}">${escapeHtml(app.status)}</span>
              <h3>👤 ${escapeHtml(app.patient_name)}</h3>
              <div style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 10px;">📞 ${escapeHtml(app.patient_phone)}</div>
              
              <div style="background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-md); font-size: 0.88rem;">
                <div>👨‍⚕️ <strong>Doctor:</strong> Dr. ${escapeHtml(app.doctor_name)} (${escapeHtml(app.doctor_specialty)})</div>
                <div>📆 <strong>Date:</strong> ${app.appointment_date} at ${app.time_slot}</div>
                ${app.cancellation_fee > 0 ? `<div style="color: var(--danger); margin-top:4px;">⚠️ Late Cancellation Fee Charged: ₹${app.cancellation_fee}</div>` : ''}
              </div>
            </div>
          `;
        });
        grid.innerHTML = html;
      }
    } catch (err) {
      console.error('Error doing patient search:', err);
    }
  }, 300);
}

// Pagination Controls
function updatePagination(pagination) {
  state.totalPages = pagination.totalPages;
  document.getElementById('page-info').innerText = `Showing Page ${pagination.currentPage} of ${pagination.totalPages || 1} (${pagination.totalRecords} Doctors Total)`;
  
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');

  btnPrev.disabled = !pagination.hasPrevPage;
  btnNext.disabled = !pagination.hasNextPage;
}

function changePage(delta) {
  state.currentPage += delta;
  fetchDoctors();
}

// Search & Filter Handlers
let searchTimeout;
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    state.searchQuery = document.getElementById('search-input').value;
    state.currentPage = 1;
    fetchDoctors();
  }, 300);
}

function filterSpecialty(spec) {
  state.selectedSpecialty = spec;
  state.currentPage = 1;
  fetchSpecialties();
  fetchDoctors();
}

function handleSortChange() {
  const val = document.getElementById('sort-select').value;
  const [field, order] = val.split('-');
  state.sortBy = field;
  state.sortOrder = order;
  state.currentPage = 1;
  fetchDoctors();
}

// Booking Modal Operations
function openBookingModal(doctorId, docName, specialty, fee) {
  if (!state.token) {
    showToast('Please login to book an appointment.', 'error');
    openAuthModal('login');
    return;
  }

  state.currentDoctorForBooking = { id: doctorId, name: docName, specialty, fee };
  document.getElementById('book-doctor-id').value = doctorId;
  document.getElementById('modal-doctor-sub').innerText = `Dr. ${docName} (${specialty}) • Consultation Fee: ₹${fee}`;
  
  if (state.user) {
    document.getElementById('book-patient-name').value = state.user.name || '';
    document.getElementById('book-patient-phone').value = state.user.phone || '';
  }

  document.getElementById('booking-modal').classList.add('active');
}

function closeBookingModal() {
  document.getElementById('booking-modal').classList.remove('active');
}

// Submit Appointment Booking
async function submitAppointment(e) {
  e.preventDefault();

  const doctor_id = document.getElementById('book-doctor-id').value;
  const patient_name = document.getElementById('book-patient-name').value;
  const patient_phone = document.getElementById('book-patient-phone').value;
  const appointment_date = document.getElementById('book-date').value;
  const time_slot = document.getElementById('book-slot').value;
  const symptoms = document.getElementById('book-symptoms').value;
  const is_emergency = document.getElementById('book-emergency').checked;

  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        doctor_id,
        patient_name,
        patient_phone,
        appointment_date,
        time_slot,
        symptoms,
        is_emergency
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, 'success');
      closeBookingModal();
      fetchStats();
      switchTab('appointments');
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    console.error('Error booking appointment:', err);
    showToast('Server error booking appointment.', 'error');
  }
}

// Fetch User Appointments
async function fetchMyAppointments() {
  const container = document.getElementById('appointments-container');
  container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Fetching your appointments...</div>`;

  try {
    const res = await fetch('/api/appointments/my', {
      headers: { 'Authorization': `Bearer ${state.token}` }
    });
    const data = await res.json();

    if (data.success) {
      renderAppointments(data.appointments);
    } else {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 40px;">${escapeHtml(data.message)}</div>`;
    }
  } catch (err) {
    console.error('Error fetching my appointments:', err);
  }
}

// Render User Appointments
function renderAppointments(appts) {
  const container = document.getElementById('appointments-container');
  if (!appts || appts.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border);">
        <div style="font-size: 3rem; margin-bottom: 10px;">📅</div>
        <h3>No Appointments Scheduled</h3>
        <p style="color: var(--text-muted); margin-bottom: 16px;">You haven't booked any consultations yet.</p>
        <button class="btn btn-primary" onclick="switchTab('doctors')">🔍 Search Doctors Now</button>
      </div>
    `;
    return;
  }

  let html = '';
  appts.forEach((app) => {
    const isEmergency = app.is_emergency === 1;
    const isCancelled = app.status === 'Cancelled';
    const hasLateFee = app.cancellation_fee > 0;

    html += `
      <div class="appt-card ${isEmergency ? 'emergency' : ''}">
        <span class="appt-status ${isCancelled ? 'status-cancelled' : 'status-confirmed'}">${escapeHtml(app.status)}</span>
        
        ${isEmergency ? '<div class="emergency-tag">🚨 EMERGENCY PRIORITY SLOT</div>' : ''}
        
        <h3 style="font-size: 1.15rem; margin-bottom: 6px;">Dr. ${escapeHtml(app.doctor_name)}</h3>
        <div style="color: var(--primary); font-weight: 600; font-size: 0.88rem; margin-bottom: 12px;">${escapeHtml(app.doctor_specialty)} • Fee: ₹${app.doctor_fee}</div>

        <div style="background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-md); font-size: 0.88rem; margin-bottom: 16px;">
          <div>📆 <strong>Date:</strong> ${app.appointment_date}</div>
          <div>⏰ <strong>Slot:</strong> ${app.time_slot}</div>
          <div>👤 <strong>Patient:</strong> ${escapeHtml(app.patient_name)} (${escapeHtml(app.patient_phone)})</div>
          ${app.symptoms ? `<div style="margin-top: 6px; color: var(--text-secondary);">📝 <em>${escapeHtml(app.symptoms)}</em></div>` : ''}
          ${isCancelled ? `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border);">
              <span style="font-weight: 700; color: ${hasLateFee ? 'var(--danger)' : 'var(--success)'};">
                ${hasLateFee ? `⚠️ Late Cancellation Fee: ₹${app.cancellation_fee}` : `✅ Cancelled for FREE (in good time)`}
              </span>
            </div>
          ` : ''}
        </div>

        ${!isCancelled ? `
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-danger btn-sm" style="flex: 1; justify-content: center;" onclick="cancelAppointment(${app.id})">Cancel Appointment</button>
          </div>
        ` : `<div style="font-size: 0.85rem; color: var(--danger); text-align: center;">This slot has been cancelled.</div>`}
      </div>
    `;
  });

  container.innerHTML = html;
}

// Cancel Appointment (with Late Cancellation Calculation Notice)
async function cancelAppointment(id) {
  if (!confirm('Are you sure you want to cancel this appointment?\n\nNote: Cancellations made 2+ hours in advance are FREE (₹0). Late cancellations (within 2 hours) carry a small ₹150 fee.')) return;

  try {
    const res = await fetch(`/api/appointments/${id}/cancel`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({ reason: 'Patient requested cancellation' })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, data.is_late_cancellation ? 'error' : 'success');
      fetchMyAppointments();
      fetchStats();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to cancel appointment.', 'error');
  }
}

// Fetch Logs
async function fetchLogs() {
  const container = document.getElementById('logs-container');
  try {
    const res = await fetch('/api/stats/logs');
    const data = await res.json();
    if (data.success) {
      let html = '';
      data.logs.forEach((log) => {
        html += `<div style="padding: 8px 0; border-bottom: 1px solid #f1f5f9;">
          <span style="color: #64748b;">[${log.timestamp}]</span> 
          <strong style="color: #0d9488;">${log.action}</strong>: ${escapeHtml(log.details)}
        </div>`;
      });
      container.innerHTML = html || '<div>No logs recorded yet.</div>';
    }
  } catch (err) {
    container.innerHTML = '<div style="color: red;">Error fetching logs.</div>';
  }
}

// Auth Functions
function openAuthModal(tab = 'login') {
  toggleAuthTab(tab);
  document.getElementById('auth-modal').classList.add('active');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('active');
}

function toggleAuthTab(tab) {
  const loginForm = document.getElementById('login-form');
  const regForm = document.getElementById('register-form');
  const tabLogin = document.getElementById('auth-tab-login');
  const tabReg = document.getElementById('auth-tab-register');

  if (tab === 'login') {
    loginForm.style.display = 'block';
    regForm.style.display = 'none';
    tabLogin.classList.add('active');
    tabReg.classList.remove('active');
  } else {
    loginForm.style.display = 'none';
    regForm.style.display = 'block';
    tabReg.classList.add('active');
    tabLogin.classList.remove('active');
  }
}

async function submitLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (data.success) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('carepulse_token', data.token);
      localStorage.setItem('carepulse_user', JSON.stringify(data.user));

      updateAuthUI();
      closeAuthModal();
      showToast(`Welcome back, ${data.user.name}!`, 'success');
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Login failed.', 'error');
  }
}

async function submitRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const phone = document.getElementById('reg-phone').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, password })
    });
    const data = await res.json();

    if (data.success) {
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('carepulse_token', data.token);
      localStorage.setItem('carepulse_user', JSON.stringify(data.user));

      updateAuthUI();
      closeAuthModal();
      showToast(`Account created! Welcome, ${data.user.name}!`, 'success');
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Registration failed.', 'error');
  }
}

function handleLogout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('carepulse_token');
  localStorage.removeItem('carepulse_user');
  updateAuthUI();
  showToast('Logged out successfully.', 'success');
  switchTab('landing');
}

// Toast Alert System
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✅' : '❌'}</span> <span>${escapeHtml(message)}</span>`;

  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Helper Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
