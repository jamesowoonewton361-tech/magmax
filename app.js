// Initialize Google Sheets Apps Script API Web Endpoint
const GOOGLE_SCRIPT_URL = "PASTE_YOUR_DEPLOYED_WEB_APP_URL_HERE"; 

let db = []; // Local operational array synchronized with Google Sheet rows

// Class Departments Config Structure
const departmentsConfig = {
    early: ["Creche", "Nursery", "KG 1", "KG 2"],
    primary: ["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6"],
    jhs: ["JHS 1", "JHS 2", "JHS 3"]
};

// Pull entire data registry down from Google Sheet
async function fetchCloudData() {
    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ action: "read" })
        });
        db = await response.json();
        // Sort alphabetically by surname
        db.sort((a, b) => a.surname.localeCompare(b.surname));
        updateMetrics();
    } catch (err) {
        console.error("Google Sheets syncing failed:", err.message);
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
        fetchCloudData(); // Sync live data from Google Sheet
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
    document.getElementById('statParents').innerText = db.filter(s => s.fatherPhone || s.motherPhone).length;
}

// Save / Update record inside Google Sheets row
document.getElementById('studentForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const editId = document.getElementById('editStudentId').value;

    const studentData = {
        id: editId ? editId : Date.now().toString(),
        admNo: document.getElementById('admNo').value,
        firstName: document.getElementById('firstName').value,
        surname: document.getElementById('surname').value,
        gender: document.getElementById('gender').value,
        className: document.getElementById('className').value,
        fatherName: document.getElementById('fatherName').value,
        fatherPhone: document.getElementById('fatherPhone').value,
        motherName: document.getElementById('motherName').value,
        motherPhone: document.getElementById('motherPhone').value,
        address: document.getElementById('address').value,
        gpsAddress: document.getElementById('gpsAddress').value
    };

    if (editId) {
        studentData.action = "update";
        await fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(studentData) });
        triggerAlert("Student updated successfully in Google Sheets!");
        await fetchCloudData();
        showSection('directory');
    } else {
        if (db.some(s => s.admNo.toLowerCase() === studentData.admNo.toLowerCase())) {
            alert("Error: A student with this Admission Number already exists!");
            return;
        }
        studentData.action = "insert";
        await fetch(GOOGLE_SCRIPT_URL, { method: "POST", body: JSON.stringify(studentData) });
        triggerAlert("New student saved cleanly to Google Sheets!");
        await fetchCloudData();
        showSection('dashboard');
    }
});

function triggerAlert(message) {
    const alertBox = document.getElementById('notificationAlert');
    alertBox.innerText = message;
    alertBox.classList.remove('d-none');
    setTimeout(() => alertBox.classList.add('d-none'), 3000);
}

// Global directory search queries mapping
function renderDirectory() {
    const searchQuery = document.getElementById('directorySearch').value.toLowerCase();
    const classFilter = document.getElementById('directoryClassFilter').value;
    const tableBody = document.getElementById('directoryTableBody');
    
    tableBody.innerHTML = '';

    const filteredRecords = db.filter(student => {
        const matchesSearch = 
            student.firstName.toLowerCase().includes(searchQuery) ||
            student.surname.toLowerCase().includes(searchQuery) ||
            student.admNo.toLowerCase().includes(searchQuery) ||
            (student.fatherPhone && student.fatherPhone.toString().includes(searchQuery)) ||
            (student.motherPhone && student.motherPhone.toString().includes(searchQuery));

        const matchesClass = !classFilter || student.className === classFilter;
        return matchesSearch && matchesClass;
    });

    if (filteredRecords.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No student records found.</td></tr>`;
        return;
    }

    filteredRecords.forEach(student => {
        tableBody.innerHTML += `
            <tr>
                <td class="fw-bold text-primary">${student.admNo}</td>
                <td>${student.firstName} ${student.surname}</td>
                <td><span class="badge bg-secondary">${student.className}</span></td>
                <td>
                    <div class="small fw-bold">${student.fatherName || 'N/A'}</div>
                    <div class="text-muted small">${student.fatherPhone || 'N/A'}</div>
                </td>
                <td>
                    <div class="small fw-bold">${student.motherName || 'N/A'}</div>
                    <div class="text-muted small">${student.motherPhone || 'N/A'}</div>
                </td>
                <td class="text-center">
                    <div class="btn-group">
                        <button onclick="editStudent('${student.id}')" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></button>
                        <button onclick="deleteStudent('${student.id}')" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
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
    document.getElementById('formTitle').innerText = "Modify Student & Parent Record";
    document.getElementById('editStudentId').value = student.id;

    document.getElementById('admNo').value = student.admNo;
    document.getElementById('firstName').value = student.firstName;
    document.getElementById('surname').value = student.surname;
    document.getElementById('gender').value = student.gender;
    document.getElementById('className').value = student.className;
    document.getElementById('fatherName').value = student.fatherName || '';
    document.getElementById('fatherPhone').value = student.fatherPhone || '';
    document.getElementById('motherName').value = student.motherName || '';
    document.getElementById('motherPhone').value = student.motherPhone || '';
    document.getElementById('address').value = student.address || '';
    document.getElementById('gpsAddress').value = student.gpsAddress || '';
}

async function deleteStudent(id) {
    if (confirm("Are you sure you want to delete this profile from Google Sheets?")) {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ action: "delete", id: id })
        });
        await fetchCloudData();
        renderDirectory();
        triggerAlert("Student record removed from spreadsheet row.");
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
        tableBody.innerHTML += `
            <tr>
                <td class="fw-bold text-primary">${student.admNo}</td>
                <td>${student.firstName} ${student.surname}</td>
                <td>${student.gender}</td>
                <td>
                    <div class="small fw-bold">${student.fatherName || 'N/A'}</div>
                    <div class="text-muted small">${student.fatherPhone || 'N/A'}</div>
                </td>
                <td>
                    <div class="small fw-bold">${student.motherName || 'N/A'}</div>
                    <div class="text-muted small">${student.motherPhone || 'N/A'}</div>
                </td>
                <td class="text-center">
                    <div class="btn-group">
                        <button onclick="editStudent('${student.id}')" class="btn btn-sm btn-outline-secondary"><i class="bi bi-pencil"></i></button>
                        <button onclick="deleteStudentRosterRow('${student.id}', '${className}')" class="btn btn-sm btn-outline-danger"><i class="bi bi-trash"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });

    panel.scrollIntoView({ behavior: 'smooth' });
}

async function deleteStudentRosterRow(id, className) {
    if (confirm("Are you sure you want to delete this profile?")) {
        await fetch(GOOGLE_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ action: "delete", id: id })
        });
        await fetchCloudData();
        renderDepartmentMenus();
        viewClassRoster(className);
        triggerAlert("Student record removed.");
    }
}

// Export backup handlers remain the same local functions
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

// Initial script execution start loop
fetchCloudData();