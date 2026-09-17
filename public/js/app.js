// CarePulse Client Application Logic

let state = {
  token: localStorage.getItem('carepulse_token') || null,
  user: JSON.parse(localStorage.getItem('carepulse_user') || 'null'),
  currentPage: 1,
  totalPages: 1,
  limit: 10,
  sortBy: 'start_time',
  sortOrder: 'asc',
  doctors: []
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  updateAuthUI();
  fetchStats();
  fetchDoctorsList();

  const today = new Date().toISOString().split('T')[0];
  const dateInput = document.getElementById('book-date');
  const staffDateInput = document.getElementById('staff-date-select');

  if (dateInput) {
    dateInput.min = today;
    dateInput.value = today;
  }
  if (staffDateInput) {
    staffDateInput.min = today;
    staffDateInput.value = today;
  }
}

function updateAuthUI() {
  const container = document.getElementById('auth-buttons');
  if (!container) return;

  if (state.token && state.user) {
    const initial = state.user.name ? state.user.name.charAt(0).toUpperCase() : 'U';
    const roleBadge = state.user.role === 'staff' ? ' (Staff)' : '';
    container.innerHTML = `
      <div class="user-pill">
        <div class="user-avatar-sm">${initial}</div>
        <div style="font-size: 0.88rem; font-weight: 600;">${escapeHtml(state.user.name)}${roleBadge}</div>
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

function switchTab(tab) {
  const briefSec = document.getElementById('product-brief');
  const bookSec = document.getElementById('book-section');
  const patientSec = document.getElementById('patient-section');
  const staffSec = document.getElementById('staff-section');

  document.querySelectorAll('.nav-link').forEach((link) => link.classList.remove('active'));

  briefSec.style.display = 'none';
  bookSec.style.display = 'none';
  patientSec.style.display = 'none';
  staffSec.style.display = 'none';

  if (tab === 'landing') {
    briefSec.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (tab === 'book') {
    bookSec.style.display = 'block';
    bookSec.scrollIntoView({ behavior: 'smooth' });
  } else if (tab === 'patient') {
    if (!state.token) {
      showToast('Please login to view your dashboard.', 'error');
      openAuthModal('login');
      return;
    }
    patientSec.style.display = 'block';
    fetchPatientAppointments();
  } else if (tab === 'staff') {
    staffSec.style.display = 'block';
    loadDoctorDayView();
    fetchStaffAllAppointments();
  }
}

// Fetch Platform Stats
async function fetchStats() {
  try {
    const res = await fetch('/api/stats/summary');
    const data = await res.json();
    if (data.success) {
      document.getElementById('stat-doctors').innerText = data.stats.totalDoctors + '+';
      document.getElementById('stat-appts').innerText = data.stats.totalAppointments;
      document.getElementById('stat-cancellations').innerText = data.stats.emergencyAppointments || 0;
      document.getElementById('stat-overlap').innerText = '100%';
    }
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

// Fetch Doctors for Dropdowns
async function fetchDoctorsList() {
  try {
    const res = await fetch('/api/doctors');
    const data = await res.json();
    if (data.success) {
      state.doctors = data.data;
      const bookSelect = document.getElementById('book-doctor-select');
      const staffSelect = document.getElementById('staff-doctor-select');

      const optionsHtml = data.data.map(d => `<option value="${d.id}">${escapeHtml(d.name)} (${escapeHtml(d.specialization)}) — ₹${d.fee}</option>`).join('');

      if (bookSelect) bookSelect.innerHTML = optionsHtml;
      if (staffSelect) staffSelect.innerHTML = optionsHtml;
    }
  } catch (err) {
    console.error('Error fetching doctors:', err);
  }
}

// Submit Booking Form
async function submitMainBooking(e) {
  e.preventDefault();

  const doctor_id = document.getElementById('book-doctor-select').value;
  const patient_name = document.getElementById('book-patient-name').value;
  const patient_phone = document.getElementById('book-patient-phone').value;
  const appointment_date = document.getElementById('book-date').value;
  const start_time = document.getElementById('book-start-time').value;
  const end_time = document.getElementById('book-end-time').value;
  const symptoms = document.getElementById('book-symptoms').value;

  if (start_time >= end_time) {
    showToast('Validation Error: Start time must be earlier than End time.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/appointments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': state.token ? `Bearer ${state.token}` : ''
      },
      body: JSON.stringify({
        doctor_id,
        patient_name,
        patient_phone,
        appointment_date,
        start_time,
        end_time,
        symptoms
      })
    });

    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      fetchStats();
      if (state.token) {
        switchTab('patient');
      } else {
        switchTab('staff');
      }
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    console.error('Booking Error:', err);
    showToast('Failed to connect to server.', 'error');
  }
}

// Fetch Patient Appointments
async function fetchPatientAppointments() {
  const container = document.getElementById('patient-appts-container');
  container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px;">Loading your appointments...</div>`;

  try {
    const res = await fetch(`/api/appointments?patient_id=${state.user.id}&limit=50`, {
      headers: state.token ? { 'Authorization': `Bearer ${state.token}` } : {}
    });
    const data = await res.json();

    if (data.success) {
      renderAppointmentsList(data.data, container, true);
    } else {
      container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--danger); padding: 40px;">${escapeHtml(data.message)}</div>`;
    }
  } catch (err) {
    console.error('Error fetching patient appointments:', err);
  }
}

// Staff: Load Doctor Day View
async function loadDoctorDayView() {
  const docSelect = document.getElementById('staff-doctor-select');
  const dateSelect = document.getElementById('staff-date-select');
  const container = document.getElementById('staff-day-container');

  if (!docSelect || !docSelect.value || !dateSelect || !dateSelect.value) return;

  container.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--text-muted);">Loading doctor day view...</div>`;

  try {
    const res = await fetch(`/api/doctors/${docSelect.value}/appointments?date=${dateSelect.value}`);
    const data = await res.json();

    if (data.success) {
      let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
          <div>
            <h3 style="font-size: 1.2rem;">${escapeHtml(data.doctor.name)} — Day Schedule View</h3>
            <p style="font-size: 0.88rem; color: var(--text-muted);">${escapeHtml(data.doctor.specialization)} • Date: <strong>${data.date}</strong></p>
          </div>
          <span style="background: var(--primary-light); color: var(--primary-dark); font-size: 0.85rem; font-weight: 700; padding: 4px 12px; border-radius: var(--radius-full);">Booked Appointments: ${data.count}</span>
        </div>
      `;

      if (data.appointments.length === 0) {
        html += `<div style="text-align: center; padding: 30px; color: var(--text-muted);">No appointments booked for this doctor on ${data.date}.</div>`;
      } else {
        html += `<div class="appointments-grid">`;
        data.appointments.forEach((app) => {
          const isCancelled = app.status === 'CANCELLED';
          html += `
            <div class="appt-card ${isCancelled ? 'emergency' : ''}" style="margin: 0;">
              <span class="appt-status ${isCancelled ? 'status-cancelled' : 'status-confirmed'}">${escapeHtml(app.status)}</span>
              
              <h4 style="font-size: 1.05rem; margin-bottom: 4px;">⏰ ${app.start_time} - ${app.end_time}</h4>
              <div style="font-weight: 700; color: var(--text-primary);">👤 ${escapeHtml(app.patient_name)}</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">📞 ${escapeHtml(app.patient_phone)}</div>
              ${app.symptoms ? `<div style="font-size: 0.82rem; margin-top:6px;">📝 ${escapeHtml(app.symptoms)}</div>` : ''}
              ${isCancelled ? `<div style="color: var(--danger); font-size: 0.8rem; margin-top: 6px;">Late Fee Charged: ₹${app.cancellation_fee}</div>` : ''}
            </div>
          `;
        });
        html += `</div>`;
      }

      container.innerHTML = html;
    }
  } catch (err) {
    console.error('Error loading doctor day view:', err);
  }
}

// Staff: Patient Search Lookup
let searchTimeout;
function handlePatientSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(async () => {
    const query = document.getElementById('staff-search-input').value;
    const container = document.getElementById('staff-all-appts');

    if (!query.trim()) {
      fetchStaffAllAppointments();
      return;
    }

    try {
      const res = await fetch(`/api/appointments/search?patientName=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (data.success) {
        renderAppointmentsList(data.appointments, container, false);
      }
    } catch (err) {
      console.error('Search error:', err);
    }
  }, 300);
}

// Staff: Fetch All Appointments (Paginated & Sorted)
async function fetchStaffAllAppointments() {
  const container = document.getElementById('staff-all-appts');
  try {
    const url = `/api/appointments?page=${state.currentPage}&limit=${state.limit}&sortBy=${state.sortBy}&order=${state.sortOrder}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      renderAppointmentsList(data.data, container, false);
      updatePagination(data.pagination);
    }
  } catch (err) {
    console.error('Fetch all appointments error:', err);
  }
}

// Render Appointments List Utility
function renderAppointmentsList(appts, container, isPatientView) {
  if (!appts || appts.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; background: white; border-radius: var(--radius-lg); border: 1px solid var(--border);">
        <div style="font-size: 2.5rem; margin-bottom: 10px;">📅</div>
        <h3>No Appointments Found</h3>
      </div>
    `;
    return;
  }

  let html = '';
  appts.forEach((app) => {
    const isCancelled = app.status === 'CANCELLED';

    html += `
      <div class="appt-card ${isCancelled ? 'emergency' : ''}">
        <span class="appt-status ${isCancelled ? 'status-cancelled' : 'status-confirmed'}">${escapeHtml(app.status)}</span>
        
        <h3 style="font-size: 1.1rem; margin-bottom: 4px;">Dr. ${escapeHtml(app.doctor_name)}</h3>
        <div style="color: var(--primary); font-weight: 600; font-size: 0.88rem; margin-bottom: 12px;">${escapeHtml(app.doctor_specialization || 'Clinic Doctor')}</div>

        <div style="background: var(--bg-subtle); padding: 12px; border-radius: var(--radius-md); font-size: 0.88rem; margin-bottom: 14px;">
          <div>📆 <strong>Date:</strong> ${app.appointment_date}</div>
          <div>⏰ <strong>Time Slot:</strong> ${app.start_time} - ${app.end_time}</div>
          <div>👤 <strong>Patient:</strong> ${escapeHtml(app.patient_name)} (${escapeHtml(app.patient_phone || 'N/A')})</div>
          ${app.symptoms ? `<div style="margin-top: 4px; color: var(--text-secondary);">📝 <em>${escapeHtml(app.symptoms)}</em></div>` : ''}
          ${isCancelled ? `
            <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid var(--border); font-weight: 700; color: ${app.cancellation_fee > 0 ? 'var(--danger)' : 'var(--success)'};">
              ${app.cancellation_fee > 0 ? `⚠️ Late Cancellation Fee: ₹${app.cancellation_fee}` : `✅ Cancelled for FREE (in good time)`}
            </div>
          ` : ''}
        </div>

        ${!isCancelled ? `
          <button class="btn btn-danger btn-sm" style="width: 100%; justify-content: center;" onclick="cancelAppointment(${app.id}, '${app.appointment_date}', '${app.start_time}')">
            Cancel Appointment
          </button>
        ` : `<div style="font-size: 0.82rem; color: var(--danger); text-align: center;">Slot is CANCELLED (unblocked for others).</div>`}
      </div>
    `;
  });

  container.innerHTML = html;
}

// Cancel Appointment with Rule 6 Calculation Notice
async function cancelAppointment(id, dateStr, startTimeStr) {
  if (!confirm('Are you sure you want to cancel this appointment?\n\nRule: Cancellations > 2 hours before start time = ₹0 fee. Cancellations <= 2 hours = ₹100 fee.')) return;

  try {
    const res = await fetch(`/api/appointments/${id}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': state.token ? `Bearer ${state.token}` : ''
      },
      body: JSON.stringify({ reason: 'User requested cancellation' })
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message, data.cancellation_fee > 0 ? 'error' : 'success');
      fetchStats();
      if (state.token) fetchPatientAppointments();
      fetchStaffAllAppointments();
      loadDoctorDayView();
    } else {
      showToast(data.message, 'error');
    }
  } catch (err) {
    showToast('Failed to cancel appointment.', 'error');
  }
}

// Pagination & Sorting Handlers
function updatePagination(pagination) {
  state.totalPages = pagination.totalPages;
  document.getElementById('page-info').innerText = `Page ${pagination.currentPage} of ${pagination.totalPages || 1} (${pagination.totalRecords} Records Total)`;

  document.getElementById('btn-prev').disabled = !pagination.hasPrevPage;
  document.getElementById('btn-next').disabled = !pagination.hasNextPage;
}

function changePage(delta) {
  state.currentPage += delta;
  fetchStaffAllAppointments();
}

function handleSortChange() {
  const val = document.getElementById('sort-by-select').value;
  const [field, order] = val.split('-');
  state.sortBy = field;
  state.sortOrder = order;
  state.currentPage = 1;
  fetchStaffAllAppointments();
}

function handleLimitChange() {
  state.limit = document.getElementById('page-limit-select').value;
  state.currentPage = 1;
  fetchStaffAllAppointments();
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
      
      if (data.user.role === 'staff') {
        switchTab('staff');
      } else {
        switchTab('patient');
      }
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
  const role = document.getElementById('reg-role').value;
  const password = document.getElementById('reg-password').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role, password })
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

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
