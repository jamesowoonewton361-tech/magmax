// Initialize Google Sheets Apps Script API Web Endpoint
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzT0HxDdlNMVRBRmTuxaRelMgmq0kGXJwNzlZ_Mjeny0iybsTkIiGYoZhVTQI21xrqM/exec"; 

let db = []; // Local operational array synchronized with Google Sheet rows

// Class Departments Config Structure (Updated to 14 classes)
const departmentsConfig = {
    early: ["Creche", "Nursery 1", "Nursery 2", "KG 1", "KG 2"],
    primary: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"],
    jhs: ["Basic 7", "Basic 8", "Basic 9"]
};

// Escapes text before it is dropped into innerHTML, so a name/phone value
// coming back from the Sheet (which a user could have typed as <script>...)
// can never execute as HTML/JS in the page.
function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Pull entire data registry down from Google Sheet using GET
async function fetchCloudData() {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL);
        const data = await response.json();
        
        if (data && Array.isArray(data)) {
            db = data;
            
            // Sort alphabetically by surname
            db.sort((a, b) => {
                const nameA = String(a.surname || "").toLowerCase();
                const nameB = String(b.surname || "").toLowerCase();
                return nameA.localeCompare(nameB);
            });
        } else {
            console.warn("Google didn't return an array list. Received:", data);
            db = [];
        }
        
        updateMetrics();
    } catch (err) {
        console.error("Google Sheets syncing failed:", err.message);
        db = [];
        updateMetrics();
    }
}

// Router Manager Component Engine
function showSection(sectionId) {
    document.querySelectorAll('.view-section').forEach(view => view.style.display = 'none');
    document.getElementById('studentForm').reset();
    document.getElementById('editStudentId').value = '';
    document.getElementById('formTitle').innerText = "Register New Student";
    document.getElementById('activeRosterPanel').classList.add('d-none'); 

    if (sectionId === 'dashboard') {
        document.getElementById('dashboardView').style.display = 'block';
        fetchCloudData();
    } else if (sectionId === 'add-student') {
        document.getElementById('addStudentView').style.display = 'block';
    } else if (sectionId === 'directory') {
        document.getElementById('directoryView').style.display = 'block';
        renderDirectory();
    } else if (sectionId === 'class-departments') {
        document.getElementById('classDepartmentsView').style.display = 'block';
        renderDepartmentMenus();
    }
    updateMetrics();
}

// Security login form submission handler
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    if (user === 'admin' && pass === 'password123') {
        document.getElementById('loginSection').classList.add('d-none');
        document.getElementById('appSection').classList.remove('d-none');
        showSection('dashboard');
    } else {
        const errorAlert = document.getElementById('loginError');
        errorAlert.classList.remove('d-none');
        setTimeout(() => errorAlert.classList.add('d-none'), 3000);
    }
});

function logout() {
    document.getElementById('appSection').classList.add('d-none');
    document.getElementById('loginSection').classList.remove('d-none');
    document.getElementById('loginForm').reset();
}

// Statistics Metric Counter
function updateMetrics() {
    document.getElementById('statStudents').innerText = db.length;
    document.getElementById('statParents').innerText = db.filter(s => s.fatherPhone || s.motherPhone || s.guardianPhone).length;
    const totalClassCount = departmentsConfig.early.length + departmentsConfig.primary.length + departmentsConfig.jhs.length;
    document.getElementById('statClasses').innerText = totalClassCount;
}

function triggerAlert(message) {
    const alertBox = document.getElementById('notificationAlert');
    alertBox.innerText = message;
    alertBox.classList.remove('d-none');
    setTimeout(() => alertBox.classList.add('d-none'), 3000);
}

// Helper to format clickable phone badge
function formatPhoneLink(label, name, phone) {
    if (!name && !phone) return '';
    const safePhone = escapeHtml(phone);
    const phoneLink = phone
        ? `<a href="tel:${safePhone}" class="fw-bold text-decoration-none text-success"><i class="bi bi-telephone-fill small"></i> ${safePhone}</a>`
        : '<span class="text-muted small">No #</span>';
    return `<div class="small"><span class="text-muted">${label}:</span> <strong>${escapeHtml(name) || 'N/A'}</strong> (${phoneLink})</div>`;
}

// Global directory search queries mapping
function renderDirectory() {
    const searchQuery = document.getElementById('directorySearch').value.toLowerCase();
    const classFilter = document.getElementById('directoryClassFilter').value;
    const tableBody = document.getElementById('directoryTableBody');
    
    tableBody.innerHTML = '';

    const filteredRecords = db.filter(student => {
        const matchesSearch = 
            (student.firstName || '').toLowerCase().includes(searchQuery) ||
            (student.surname || '').toLowerCase().includes(searchQuery) ||
            (student.admNo || '').toString().toLowerCase().includes(searchQuery) ||
            (student.fatherPhone && student.fatherPhone.toString().includes(searchQuery)) ||
            (student.motherPhone && student.motherPhone.toString().includes(searchQuery)) ||
            (student.guardianPhone && student.guardianPhone.toString().includes(searchQuery));

        const matchesClass = !classFilter || student.className === classFilter;
        return matchesSearch && matchesClass;
    });

    if (filteredRecords.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No student records found.</td></tr>`;
        return;
    }

    filteredRecords.forEach(student => {
        const contactsHTML = [
            formatPhoneLink('Father', student.fatherName, student.fatherPhone),
            formatPhoneLink('Mother', student.motherName, student.motherPhone),
            formatPhoneLink('Guardian', student.guardianName, student.guardianPhone)
        ].filter(Boolean).join('') || '<span class="text-muted small">No contacts saved</span>';

        tableBody.innerHTML += `
            <tr>
                <td class="fw-bold text-primary">${escapeHtml(student.admNo)}</td>
                <td>${escapeHtml(student.firstName)} ${escapeHtml(student.surname)}</td>
                <td><span class="badge bg-secondary">${escapeHtml(student.className)}</span></td>
                <td>${escapeHtml(student.dob) || '<span class="text-muted small">N/A</span>'}</td>
                <td>${contactsHTML}</td>
                <td class="text-center">
                    <div class="btn-group">
                        <button onclick="editStudent('${escapeHtml(student.id)}')" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></button>
                        <button onclick="deleteStudent('${escapeHtml(student.id)}')" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
}

// Prepopulate fields for editor 
function editStudent(id) {
    const student = db.find(s => s.id.toString() === id.toString());
    if (!student) return;

    showSection('add-student');
    document.getElementById('formTitle').innerText = "Modify Student & Contact Record";
    document.getElementById('editStudentId').value = student.id;

    document.getElementById('admNo').value = student.admNo || '';
    document.getElementById('firstName').value = student.firstName || '';
    document.getElementById('surname').value = student.surname || '';
    document.getElementById('dob').value = student.dob || '';
    document.getElementById('gender').value = student.gender || '';
    document.getElementById('className').value = student.className || '';
    document.getElementById('fatherName').value = student.fatherName || '';
    document.getElementById('fatherPhone').value = student.fatherPhone || '';
    document.getElementById('motherName').value = student.motherName || '';
    document.getElementById('motherPhone').value = student.motherPhone || '';
    document.getElementById('guardianName').value = student.guardianName || '';
    document.getElementById('guardianPhone').value = student.guardianPhone || '';
    document.getElementById('address').value = student.address || '';
}

async function deleteStudent(id) {
    if (confirm("Are you sure you want to delete this profile from Google Sheets?")) {
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "delete", id: id })
            });
            await fetchCloudData();
            renderDirectory();
            triggerAlert("Student record removed from spreadsheet row.");
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Could not delete this record. Check your connection and try again.");
        }
    }
}

// Department menu logic
function renderDepartmentMenus() {
    const earlyContainer = document.getElementById('deptEarlyChildhood');
    const primaryContainer = document.getElementById('deptPrimary');
    const jhsContainer = document.getElementById('deptJHS');

    earlyContainer.innerHTML = '';
    primaryContainer.innerHTML = '';
    jhsContainer.innerHTML = '';

    departmentsConfig.early.forEach(cls => {
        const count = db.filter(s => s.className === cls).length;
        earlyContainer.innerHTML += `<button onclick="viewClassRoster('${cls}')" class="btn btn-outline-info text-start d-flex justify-content-between align-items-center"><span><i class="bi bi-folder-fill"></i> ${cls}</span> <span class="badge bg-info">${count}</span></button>`;
    });

    departmentsConfig.primary.forEach(cls => {
        const count = db.filter(s => s.className === cls).length;
        primaryContainer.innerHTML += `<button onclick="viewClassRoster('${cls}')" class="btn btn-outline-primary text-start d-flex justify-content-between align-items-center"><span><i class="bi bi-folder-fill"></i> ${cls}</span> <span class="badge bg-primary">${count}</span></button>`;
    });

    departmentsConfig.jhs.forEach(cls => {
        const count = db.filter(s => s.className === cls).length;
        jhsContainer.innerHTML += `<button onclick="viewClassRoster('${cls}')" class="btn btn-outline-dark text-start d-flex justify-content-between align-items-center"><span><i class="bi bi-folder-fill"></i> ${cls}</span> <span class="badge bg-dark">${count}</span></button>`;
    });
}

function viewClassRoster(className) {
    const panel = document.getElementById('activeRosterPanel');
    const title = document.getElementById('activeRosterTitle');
    const countBadge = document.getElementById('activeRosterCount');
    const tableBody = document.getElementById('activeRosterTableBody');

    tableBody.innerHTML = '';
    title.innerText = `${className} Learner Roster`;

    const classMembers = db.filter(student => student.className === className);
    countBadge.innerText = `${classMembers.length} Learner${classMembers.length === 1 ? '' : 's'}`;

    panel.classList.remove('d-none');

    if(classMembers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-3 text-muted">No learners registered in ${className} yet.</td></tr>`;
        panel.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    classMembers.forEach(student => {
        const contactsHTML = [
            formatPhoneLink('Father', student.fatherName, student.fatherPhone),
            formatPhoneLink('Mother', student.motherName, student.motherPhone),
            formatPhoneLink('Guardian', student.guardianName, student.guardianPhone)
        ].filter(Boolean).join('') || '<span class="text-muted small">No contacts saved</span>';

        tableBody.innerHTML += `
            <tr>
                <td class="fw-bold text-primary">${escapeHtml(student.admNo)}</td>
                <td>${escapeHtml(student.firstName)} ${escapeHtml(student.surname)}</td>
                <td>${escapeHtml(student.dob) || '<span class="text-muted small">N/A</span>'}</td>
                <td>${escapeHtml(student.gender)}</td>
                <td>${contactsHTML}</td>
                <td class="text-center">
                    <div class="btn-group">
                        <button onclick="editStudent('${escapeHtml(student.id)}')" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></button>
                        <button onclick="deleteStudentRosterRow('${escapeHtml(student.id)}', '${escapeHtml(className)}')" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    panel.scrollIntoView({ behavior: 'smooth' });
}

async function deleteStudentRosterRow(id, className) {
    if (confirm("Are you sure you want to delete this profile?")) {
        try {
            await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify({ action: "delete", id: id })
            });
            await fetchCloudData();
            renderDepartmentMenus();
            viewClassRoster(className);
            triggerAlert("Student record removed.");
        } catch (err) {
            console.error("Delete failed:", err);
            alert("Could not delete this record. Check your connection and try again.");
        }
    }
}

// Export backup handlers
function exportToExcel() {
    if (db.length === 0) { alert("The directory is empty."); return; }
    const worksheet = XLSX.utils.json_to_sheet(db);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet Contacts");
    XLSX.writeFile(workbook, "magmax_parent_contacts.xlsx");
}

function downloadBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "magmax_school_backup.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

// Restore a previously downloaded .json backup by pushing its records
// back up to the Google Sheet (was referenced by the Restore button but
// never implemented).
async function restoreBackup() {
    const fileInput = document.getElementById('backupFile');
    const file = fileInput.files[0];
    if (!file) {
        alert("Please choose a backup .json file first.");
        return;
    }

    let records;
    try {
        const text = await file.text();
        records = JSON.parse(text);
    } catch (err) {
        alert("That file isn't a valid backup (couldn't be read as JSON).");
        return;
    }

    if (!Array.isArray(records) || records.length === 0) {
        alert("That backup file has no student records in it.");
        return;
    }

    if (!confirm(`This will restore ${records.length} record(s) into the Google Sheet. Continue?`)) {
        return;
    }

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify({ action: "restore", records: records })
        });
        await fetchCloudData();
        triggerAlert(`Restored ${records.length} record(s) to Google Sheets.`);
        fileInput.value = '';
    } catch (err) {
        console.error("Restore failed:", err);
        alert("Restore failed. Check your connection and try again.");
    }
}

// Initial script execution start loop
fetchCloudData();

// Form submit listener
document.getElementById('studentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const editId = document.getElementById('editStudentId').value;

    const studentData = {
        id: editId ? editId : Date.now().toString(),
        admNo: document.getElementById('admNo').value,
        firstName: document.getElementById('firstName').value,
        surname: document.getElementById('surname').value,
        dob: document.getElementById('dob').value,
        gender: document.getElementById('gender').value,
        className: document.getElementById('className').value,
        fatherName: document.getElementById('fatherName').value,
        fatherPhone: document.getElementById('fatherPhone').value,
        motherName: document.getElementById('motherName').value,
        motherPhone: document.getElementById('motherPhone').value,
        guardianName: document.getElementById('guardianName').value,
        guardianPhone: document.getElementById('guardianPhone').value,
        address: document.getElementById('address').value
    };

    const postHeaders = { "Content-Type": "text/plain;charset=utf-8" };

    if (editId) {
        studentData.action = "update";
        try {
            await fetch(GOOGLE_SCRIPT_URL, { method: "POST", headers: postHeaders, body: JSON.stringify(studentData) });
            triggerAlert("Student updated successfully in Google Sheets!");
            await fetchCloudData();
            showSection('directory');
        } catch (err) {
            console.error("Update failed:", err);
            alert("Could not save changes. Check your connection and try again.");
        }
    } else {
        if (db.some(s => s.admNo == studentData.admNo)) {
            alert("Error: A student with this Admission Number already exists!");
            return;
        }
        studentData.action = "insert";
        try {
            await fetch(GOOGLE_SCRIPT_URL, { method: "POST", headers: postHeaders, body: JSON.stringify(studentData) });
            triggerAlert("New student saved cleanly to Google Sheets!");
            await fetchCloudData();
            showSection('dashboard');
        } catch (err) {
            console.error("Insert failed:", err);
            alert("Could not save this student. Check your connection and try again.");
        }
    }
});