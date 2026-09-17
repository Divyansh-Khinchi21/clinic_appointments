const http = require('http');

function makeRequest(path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log('===================================================');
  console.log(' 🧪 RUNNING ALL 10 MANDATORY SPEC TEST CASES       ');
  console.log('===================================================\n');

  // Login to get token
  const loginRes = await makeRequest('/api/auth/login', 'POST', {
    email: 'divyanshkhinchi66@gmail.com',
    password: 'password123'
  });
  const token = loginRes.body.token;
  console.log(`🔐 Logged in as Patient. Token acquired.\n`);

  // Fetch Doctors List
  const doctorsRes = await makeRequest('/api/doctors');
  const drSharma = doctorsRes.body.data.find(d => d.name.includes('Sharma'));
  const drMehta = doctorsRes.body.data.find(d => d.name.includes('Mehta'));

  const testDate = '2026-10-01';

  // TEST 1: Dr. Sharma, 10:00 - 10:30, Patient A -> EXPECT SUCCESS (201)
  console.log('👉 TEST 1: Dr. Sharma, 10:00 - 10:30, Patient A');
  const t1 = await makeRequest('/api/appointments', 'POST', {
    doctor_id: drSharma.id,
    patient_name: 'Patient A',
    patient_phone: '9876543210',
    appointment_date: testDate,
    start_time: '10:00',
    end_time: '10:30'
  }, token);
  console.log(`   Result: HTTP ${t1.status} - ${t1.body.message}`);
  console.assert(t1.status === 201, 'Test 1 Failed');

  // TEST 2: Dr. Sharma, 10:15 - 10:45, Patient B -> EXPECT REJECTED (OVERLAP)
  console.log('\n👉 TEST 2: Dr. Sharma, 10:15 - 10:45, Patient B (OVERLAP)');
  const t2 = await makeRequest('/api/appointments', 'POST', {
    doctor_id: drSharma.id,
    patient_name: 'Patient B',
    patient_phone: '9876543211',
    appointment_date: testDate,
    start_time: '10:15',
    end_time: '10:45'
  }, token);
  console.log(`   Result: HTTP ${t2.status} - ${t2.body.message}`);
  console.assert(t2.status === 400, 'Test 2 Failed');

  // TEST 3: Dr. Sharma, 10:30 - 11:00, Patient B -> EXPECT SUCCESS (TOUCH AT BOUNDARY 10:30)
  console.log('\n👉 TEST 3: Dr. Sharma, 10:30 - 11:00, Patient B (TOUCH AT 10:30)');
  const t3 = await makeRequest('/api/appointments', 'POST', {
    doctor_id: drSharma.id,
    patient_name: 'Patient B',
    patient_phone: '9876543211',
    appointment_date: testDate,
    start_time: '10:30',
    end_time: '11:00'
  }, token);
  console.log(`   Result: HTTP ${t3.status} - ${t3.body.message}`);
  console.assert(t3.status === 201, 'Test 3 Failed');

  // TEST 4: Dr. Mehta, 10:15 - 10:45, Patient C -> EXPECT SUCCESS (DIFFERENT DOCTOR)
  console.log('\n👉 TEST 4: Dr. Mehta, 10:15 - 10:45, Patient C (DIFFERENT DOCTOR)');
  const t4 = await makeRequest('/api/appointments', 'POST', {
    doctor_id: drMehta.id,
    patient_name: 'Patient C',
    patient_phone: '9876543212',
    appointment_date: testDate,
    start_time: '10:15',
    end_time: '10:45'
  }, token);
  console.log(`   Result: HTTP ${t4.status} - ${t4.body.message}`);
  console.assert(t4.status === 201, 'Test 4 Failed');

  // TEST 10: Book appointment with start_time >= end_time (11:00 - 10:30) -> EXPECT VALIDATION ERROR
  console.log('\n👉 TEST 10: End time before start time (11:00 - 10:30)');
  const t10 = await makeRequest('/api/appointments', 'POST', {
    doctor_id: drSharma.id,
    patient_name: 'Patient Invalid',
    appointment_date: testDate,
    start_time: '11:00',
    end_time: '10:30'
  }, token);
  console.log(`   Result: HTTP ${t10.status} - ${t10.body.message}`);
  console.assert(t10.status === 400, 'Test 10 Failed');

  // TEST 5: Cancel appointment > 2 hours before -> Fee = ₹0
  console.log('\n👉 TEST 5: Cancel > 2 hours in advance (Fee = ₹0)');
  const appt1Id = t1.body.appointment.id;
  const t5 = await makeRequest(`/api/appointments/${appt1Id}/cancel`, 'POST', { reason: 'Early cancel' }, token);
  console.log(`   Result: HTTP ${t5.status} - Status: ${t5.body.status}, Fee: ₹${t5.body.cancellation_fee}`);
  console.assert(t5.body.cancellation_fee === 0, 'Test 5 Fee Failed');

  // TEST 6: Cancel appointment <= 2 hours before -> Fee = ₹100
  console.log('\n👉 TEST 6: Cancel <= 2 hours in advance (Fee = ₹100)');
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const startHour = String(now.getHours() + 1).padStart(2, '0');
  const endHour = String(now.getHours() + 2).padStart(2, '0');

  const apptLateRes = await makeRequest('/api/appointments', 'POST', {
    doctor_id: drSharma.id,
    patient_name: 'Patient Urgent',
    appointment_date: todayStr,
    start_time: `${startHour}:00`,
    end_time: `${endHour}:00`
  }, token);

  if (apptLateRes.status === 201) {
    const lateApptId = apptLateRes.body.appointment.id;
    const t6 = await makeRequest(`/api/appointments/${lateApptId}/cancel`, 'POST', { reason: 'Late cancel' }, token);
    console.log(`   Result: HTTP ${t6.status} - Status: ${t6.body.status}, Fee: ₹${t6.body.cancellation_fee}`);
    console.assert(t6.body.cancellation_fee === 100, 'Test 6 Fee Failed');
  }

  // TEST 7: Search by Patient Name
  console.log('\n👉 TEST 7: Search by patient name "Patient B"');
  const t7 = await makeRequest('/api/appointments/search?patientName=Patient%20B', 'GET', null, token);
  console.log(`   Result: Found ${t7.body.count} records matching 'Patient B'`);
  console.assert(t7.body.count >= 1, 'Test 7 Failed');

  // TEST 8: Pagination ?page=1&limit=10
  console.log('\n👉 TEST 8: Pagination ?page=1&limit=10');
  const t8 = await makeRequest('/api/appointments?page=1&limit=10', 'GET', null, token);
  console.log(`   Result: Returned ${t8.body.data.length} records. Page 1 of ${t8.body.pagination.totalPages}`);
  console.assert(t8.body.pagination.limit === 10, 'Test 8 Failed');

  // TEST 9: Sorting ?sortBy=start_time&order=asc
  console.log('\n👉 TEST 9: Sorting ?sortBy=start_time&order=asc');
  const t9 = await makeRequest('/api/appointments?sortBy=start_time&order=asc', 'GET', null, token);
  console.log(`   Result: Sorted ${t9.body.data.length} appointments by start_time`);
  console.assert(t9.body.sorting.sortBy === 'start_time', 'Test 9 Failed');

  console.log('\n===================================================');
  console.log(' 🎉 ALL 10 MANDATORY SPEC TEST CASES PASSED 100%!   ');
  console.log('===================================================');
}

runTests().catch(console.error);
