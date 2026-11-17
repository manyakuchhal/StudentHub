
const STORAGE_KEY = "studentHubData_v1";

let students = [];
let attendance = {};

const $ = id => document.getElementById(id);

function loadData() {
  try {
    students = JSON.parse(localStorage.getItem(STORAGE_KEY + "_students")) || [];
    attendance = JSON.parse(localStorage.getItem(STORAGE_KEY + "_attendance")) || {};
  } catch (error) {
    students = [];
    attendance = {};
  }
}

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY + "_students", JSON.stringify(students));
    localStorage.setItem(STORAGE_KEY + "_attendance", JSON.stringify(attendance));
  } catch (error) {
    alert("Data could not be saved. Browser storage may be full.");
  }
}

function localDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDate(date) {
  if (!date) return "-";
  return new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[char]);
}

function showToast(message) {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function updateHeaderDate() {
  const el = $("todayLabel");
  if (el) {
    el.textContent = new Date().toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }
}

function getStatus(date, studentId) {
  return attendance[date]?.[studentId] || "";
}

function getStats(date) {
  let present = 0;
  let absent = 0;

  students.forEach(student => {
    const status = getStatus(date, student.id);
    if (status === "Present") present++;
    if (status === "Absent") absent++;
  });

  const total = present + absent;

  return {
    present,
    absent,
    total,
    pending: students.length - total,
    rate: total ? Math.round((present / total) * 100) : 0
  };
}

// DASHBOARD

function renderDashboard() {
  if (!$("totalStudents")) return;

  const date = $("dashboardDate").value || localDate();
  const stats = getStats(date);

  $("totalStudents").textContent = students.length;
  $("presentToday").textContent = stats.present;
  $("absentToday").textContent = stats.absent;
  $("attendanceRate").textContent = stats.rate + "%";

  $("dashboardProgress").style.width = stats.rate + "%";
  $("progressText").textContent = stats.rate + "%";

  const recent = [...students].reverse().slice(0, 5);

  $("recentStudents").innerHTML = recent.length
    ? recent.map(student => `
      <tr>
        <td>
          <span class="avatar">${escapeHTML(student.name.charAt(0).toUpperCase())}</span>
          <span class="student-name">${escapeHTML(student.name)}</span>
        </td>
        <td>${escapeHTML(student.id)}</td>
        <td>${escapeHTML(student.className)}</td>
        <td>${escapeHTML(student.email || "-")}</td>
      </tr>
    `).join("")
    : `<tr><td colspan="4" class="empty">No students registered yet.</td></tr>`;
}

// STUDENT MODAL

function openStudentModal(id = "") {
  const form = $("studentForm");
  if (!form) return;

  form.reset();
  $("editStudentId").value = id;

  if (id) {
    const student = students.find(s => s.id === id);
    if (!student) return;

    $("modalTitle").textContent = "Edit Student";
    $("studentName").value = student.name;
    $("studentClass").value = student.className;
    $("studentEmail").value = student.email || "";
    $("studentPhone").value = student.phone || "";
  } else {
    $("modalTitle").textContent = "Add New Student";
  }

  $("studentModal").classList.add("open");
}

function closeStudentModal() {
  if ($("studentModal")) {
    $("studentModal").classList.remove("open");
  }
}

// ADD AND EDIT STUDENTS

function setupStudentForm() {
  if (!$("studentForm")) return;

  $("addStudentBtn").addEventListener("click", () => openStudentModal());

  $("closeModal").addEventListener("click", closeStudentModal);
  $("cancelModal").addEventListener("click", closeStudentModal);

  $("studentModal").addEventListener("click", event => {
    if (event.target === $("studentModal")) closeStudentModal();
  });

  $("studentForm").addEventListener("submit", event => {
    event.preventDefault();

    const id = $("editStudentId").value;
    const name = $("studentName").value.trim();
    const className = $("studentClass").value.trim();
    const email = $("studentEmail").value.trim();
    const phone = $("studentPhone").value.trim();

    if (!name || !className) return;

    if (id) {
      const student = students.find(s => s.id === id);
      if (!student) return;

      Object.assign(student, { name, className, email, phone });
      showToast("Student updated successfully!");
    } else {
      const newStudent = {
        id: "STU" + Date.now().toString().slice(-8),
        name,
        className,
        email,
        phone,
        createdAt: new Date().toISOString()
      };

      students.push(newStudent);
      showToast("Student added successfully!");
    }

    saveData();
    closeStudentModal();
    renderStudents();
    renderDashboard();
    renderAttendance();
    renderReports();
  });
}

// STUDENT LIST

function renderStudents() {
  if (!$("studentsTable")) return;

  const search = ($("studentSearch")?.value || "").toLowerCase();

  const filtered = students.filter(student =>
    [student.name, student.id, student.className, student.email, student.phone]
      .some(value => String(value || "").toLowerCase().includes(search))
  );

  $("studentCount").textContent =
    `${filtered.length} of ${students.length} students`;

  $("studentsTable").innerHTML = filtered.length
    ? filtered.map(student => `
      <tr>
        <td>
          <span class="avatar">${escapeHTML(student.name.charAt(0).toUpperCase())}</span>
          <span class="student-name">${escapeHTML(student.name)}</span>
        </td>
        <td>${escapeHTML(student.id)}</td>
        <td>${escapeHTML(student.className)}</td>
        <td>${escapeHTML(student.email || "-")}</td>
        <td>${escapeHTML(student.phone || "-")}</td>
        <td>
          <button class="action-btn" data-action="edit" data-id="${escapeHTML(student.id)}">Edit</button>
          <button class="action-btn delete-btn" data-action="delete" data-id="${escapeHTML(student.id)}">Delete</button>
        </td>
      </tr>
    `).join("")
    : `<tr><td colspan="6" class="empty">No students found.</td></tr>`;
}

function setupStudentList() {
  if (!$("studentsTable")) return;

  $("studentSearch").addEventListener("input", renderStudents);

  $("studentsTable").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const id = button.dataset.id;

    if (button.dataset.action === "edit") {
      openStudentModal(id);
    }

    if (button.dataset.action === "delete") {
      deleteStudent(id);
    }
  });
}

function deleteStudent(id) {
  const student = students.find(s => s.id === id);
  if (!student) return;

  if (!confirm(`Are you sure you want to delete ${student.name}? Their attendance records will also be deleted.`)) return;

  students = students.filter(s => s.id !== id);

  Object.keys(attendance).forEach(date => {
    delete attendance[date][id];

    if (Object.keys(attendance[date]).length === 0) {
      delete attendance[date];
    }
  });

  saveData();
  renderStudents();
  renderDashboard();
  renderAttendance();
  renderReports();

  showToast("Student deleted successfully!");
}

// ATTENDANCE

function renderAttendance() {
  if (!$("attendanceTable")) return;

  const date = $("attendanceDate").value || localDate();
  const search = ($("attendanceSearch")?.value || "").toLowerCase();

  const stats = getStats(date);

  $("attendancePresent").textContent = "Present: " + stats.present;
  $("attendanceAbsent").textContent = "Absent: " + stats.absent;
  $("attendancePending").textContent = "Not Marked: " + stats.pending;

  const filtered = students.filter(student =>
    [student.name, student.id, student.className]
      .some(value => String(value).toLowerCase().includes(search))
  );

  $("attendanceTable").innerHTML = filtered.length
    ? filtered.map(student => {
      const status = getStatus(date, student.id);

      return `
        <tr>
          <td>
            <span class="avatar">${escapeHTML(student.name.charAt(0).toUpperCase())}</span>
            <span class="student-name">${escapeHTML(student.name)}</span>
          </td>
          <td>${escapeHTML(student.id)}</td>
          <td>${escapeHTML(student.className)}</td>
          <td>
            <select class="status-select" data-id="${escapeHTML(student.id)}">
              <option value="" ${status === "" ? "selected" : ""}>Not Marked</option>
              <option value="Present" ${status === "Present" ? "selected" : ""}>Present</option>
              <option value="Absent" ${status === "Absent" ? "selected" : ""}>Absent</option>
            </select>
          </td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="4" class="empty">No students available.</td></tr>`;

  document.querySelectorAll(".status-select").forEach(select => {
    select.addEventListener("change", () => {
      const selectedDate = $("attendanceDate").value;
      const studentId = select.dataset.id;

      if (!attendance[selectedDate]) {
        attendance[selectedDate] = {};
      }

      if (select.value) {
        attendance[selectedDate][studentId] = select.value;
      } else {
        delete attendance[selectedDate][studentId];
      }

      saveData();
      renderAttendance();
      renderDashboard();
      renderReports();
    });
  });
}

function setupAttendance() {
  if (!$("attendanceDate")) return;

  $("attendanceDate").value = localDate();

  $("attendanceDate").addEventListener("change", renderAttendance);
  $("attendanceSearch").addEventListener("input", renderAttendance);

  $("saveAttendanceBtn").addEventListener("click", () => {
    saveData();
    renderAttendance();
    renderDashboard();
    renderReports();
    showToast("Attendance saved successfully!");
  });
}

// REPORTS

function renderReports() {
  if (!$("reportTable")) return;

  const from = $("reportFrom").value;
  const to = $("reportTo").value;

  const dates = Object.keys(attendance)
    .filter(date => (!from || date >= from) && (!to || date <= to))
    .sort();

  let totalPresent = 0;
  let totalAbsent = 0;

  const rows = students.map(student => {
    let present = 0;
    let absent = 0;

    dates.forEach(date => {
      const status = getStatus(date, student.id);
      if (status === "Present") present++;
      if (status === "Absent") absent++;
    });

    totalPresent += present;
    totalAbsent += absent;

    const total = present + absent;
    const percentage = total ? Math.round((present / total) * 100) : 0;

    return { student, present, absent, total, percentage };
  });

  const total = totalPresent + totalAbsent;
  const rate = total ? Math.round((totalPresent / total) * 100) : 0;

  $("reportRecords").textContent = total;
  $("reportPresent").textContent = totalPresent;
  $("reportAbsent").textContent = totalAbsent;
  $("reportRate").textContent = rate + "%";

  $("reportTable").innerHTML = rows.length
    ? rows.map(row => `
      <tr>
        <td class="student-name">${escapeHTML(row.student.name)}</td>
        <td>${escapeHTML(row.student.id)}</td>
        <td>${row.present}</td>
        <td>${row.absent}</td>
        <td>${row.total}</td>
        <td class="percent">${row.percentage}%</td>
      </tr>
    `).join("")
    : `<tr><td colspan="6" class="empty">No students available.</td></tr>`;

  $("dateReportTable").innerHTML = dates.length
    ? dates.map(date => {
      let present = 0;
      let absent = 0;

      Object.values(attendance[date] || {}).forEach(status => {
        if (status === "Present") present++;
        if (status === "Absent") absent++;
      });

      const marked = present + absent;
      const percentage = marked
        ? Math.round((present / marked) * 100)
        : 0;

      return `
        <tr>
          <td>${formatDate(date)}</td>
          <td>${present}</td>
          <td>${absent}</td>
          <td>${marked}</td>
          <td class="percent">${percentage}%</td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="5" class="empty">No attendance records found.</td></tr>`;
}

function setupReports() {
  if (!$("reportTable")) return;

  const today = localDate();
  const firstDay = new Date();
  firstDay.setDate(1);

  $("reportFrom").value = localDate(firstDay);
  $("reportTo").value = today;

  $("generateReportBtn").addEventListener("click", () => {
    if ($("reportFrom").value && $("reportTo").value &&
        $("reportFrom").value > $("reportTo").value) {
      showToast("Start date cannot be after end date.");
      return;
    }
    renderReports();
  });

  $("reportFrom").addEventListener("change", renderReports);
  $("reportTo").addEventListener("change", renderReports);
}

// INITIALIZE

function initializeApp() {
  loadData();
  updateHeaderDate();

  if ($("dashboardDate")) {
    $("dashboardDate").value = localDate();
    $("dashboardDate").addEventListener("change", renderDashboard);
    renderDashboard();
  }

  setupStudentForm();
  setupStudentList();
  renderStudents();

  setupAttendance();
  renderAttendance();

  setupReports();
  renderReports();
}

initializeApp();
