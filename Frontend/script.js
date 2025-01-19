//This's where we'll be accessing our apis, that's where the server runs
const API_BASE_URL = "http://localhost:3000";

let students = [];
let courses = [];
let currentSection = "dashboard";
let editingId = null;
let editingCourseId = null;
let deleteType = ""; //Type can be Student or Course
let deleteId = null;

//Get all the DOM elements
const studentTableBody = document.getElementById("studentTableBody");
const allStudentTableBody = document.getElementById("allStudentTableBody");
const courseTableBody = document.getElementById("courseTableBody");
const studentModal = document.getElementById("studentModal");
const courseModal = document.getElementById("courseModal");
const studentForm = document.getElementById("studentForm");
const courseForm = document.getElementById("courseForm");
const searchInput = document.querySelector(".search-bar input");
const loadingSpinner = document.querySelector(".loading-spinner");

//Initialize the Dashboard
//It'll be listening if the content on the DOM is loaded, we'll call the initialize listeners function
document.addEventListener("DOMContentLoaded", async () => {
  initializeEventListeners();
  await checkAndLoadData();
});

//Initialize all event listeners
function initializeEventListeners() {
  //Form submission
  studentForm.addEventListener("submit", handleFormSubmit);
  courseForm.addEventListener("submit", handleCourseFormSubmit);

  //Search functionality
  searchInput.addEventListener("input", handleSearch);

  //Navigation functionality
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", () => {
      const section = item.dataset.section;
      navigateToSection(section);
    });
  });

  //Modal outside click handlers
  window.onclick = (e) => {
    if (e.target === studentModal) closeModal();
    if (e.target === courseModal) closeCourseModal();
  };
}

//Initialize data load and checks
async function checkAndLoadData() {
  showLoading();
  try {
    await loadCourses();

    //Check inf we have any courses
    if (courses.length === 0) {
      showNotification(
        "Please add courses before managing students",
        "warning"
      );
      navigateToSection("courses");
      openCourseModal();
      return;
    }

    await Promise.all([loadStudents(), updateDashboardStats()]);
  } catch (error) {
    console.error("Error during initialization:", error);
    showNotification("Error ininitializing application:", "error");
  } finally {
    hideLoading();
  }
}

// Navigation functions
function navigateToSection(section) {
  currentSection = section;

  // Update active nav item
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.section === section) {
      item.classList.add("active");
    }
  });

  // Hide all sections
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  // Show selected section
  document.getElementById(`${section}Section`).classList.add("active");

  // Refresh data when switching sections
  if (section === "courses") {
    loadCourses();
  } else if (section === "students" || section === "dashboard") {
    loadStudents();
    updateDashboardStats();
  }
}


async function updateDashboardStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
    if (!response.ok) throw new Error("Failed to fetch dashboard stats");

    const stats = await response.json();

    //Update dashboard cards with the data from the API
    document.querySelector(".card:nth-child(1) . card-value").textContent =
      stats.totalStudents.toLocaleString();
    document.querySelector(".card:nth-child(2) . card-value").textContent =
      stats.activeCourses.toLocaleString();
    document.querySelector(".card:nth-child(3) . card-value").textContent =
      stats.graduates.toLocaleString();
    document.querySelector(
      ".card:nth-child(4) . card-value"
    ).textContent = `${stats.successRate}%`;
  } catch (error) {
    console.error("Error updating dashboard stats", error);
    showNotification("Error updating dashboard stats", "error");
  }
}

//Load students data
async function loadStudents() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/students`);
    if (!response.ok) throw new Error("Failed to load students data");

    students = await response.json();
    renderStudentTable(students);
  } catch (error) {
    console.error("Error loading students", error);
    showNotification("Error loading students", "error");
    students = [];
    renderStudentTable([]);
  }
}

//Load Courses data from the API server
async function loadCourses() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/courses`);
    if (!response.ok) throw new Error("Failed to fetch Courses");

    courses = await response.json();
    updateCourseDropdown(courses);
    renderCourseTable(courses);
    return courses;
  } catch (error) {
    console.error("Failed to load Courses", error);
    showNotification("Error loading Courses", "error");
    courses = [];
    renderCourseTable([]);
  }
}

//Now we need to add the CRUD operations for application

//CRUD Operations for Students
//---To Create Student
async function createStudent(studentData) {
  const response = await fetch(`${API_BASE_URL}/api/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(studentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create student");
  }
  return response.json();
}

//To update a Student
async function updateStudent(id, studentData) {
  const response = await fetch(`${API_BASE_URL}/api/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(studentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Faild to update student");
  }
  return response.json();
}

//To Delete a Student
async function deleteStudent(id) {
  deleteType = "student";
  deleteId = id;
  document.getElementById("deleteComfirmationModal").style.display = "flex";
}

//CRUD Operations for Courses
//---To create a Course
async function createCourse(courseData) {
  const response = await fetch(`${API_BASE_URL}/api/courses/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(courseData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Faild to create Course");
  }
  return response.json();
}

//To update a Course
async function updateCourse(id, courseData) {
  const response = await fetch(`${API_BASE_URL}/api/courses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(courseData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Faild to update course");
  }
  return response.json();
}

//To Delete a Courese
async function deleteCourse(id) {
  deleteType = "course";
  deleteId = id;
  document.getElementById("deleteComfirmationModal").style.display = "flex";
}

function closeDeleteModal() {
  document.getElementById("deleteComfirmationModal").style.display = "none";
  deleteType = "";
  deleteId = null;
}

//Comfirm Delete by type
async function comfirmDelete() {
  showLoading();
  try {
    if (deleteType === "student") {
      const response = await fetch(`${API_BASE_URL}/api/students/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete student");
      }

      showNotification("Student deleted successfully!", "success");
      await loadStudents();
      await updateDashboardStats();
    } else if (deleteType === "course") {
      const response = await fetch(`${API_BASE_URL}/api/course/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete course");
      }
      showNotification("Course deleted successfully!", "success");
      await loadCourses();
      await updateDashboardStats();
    }
  } catch (error) {
    console.error("An error occurred while deleting", error);
    showNotification(
      error.message || "An error occurred while deleting",
      "error"
    );
  } finally {
    hideLoading();
    closeDeleteModal();
  }
}

//Form Handling
async function handleFormSubmit(e) {
  e.preventDefault();
  showLoading();

  const studentData = {
    name: document.getElementById("studentName").value.trim(),
    email: document.getElementById("studentEmail").value.trim(),
    course: document.getElementById("studentCourse").value.trim(),
    enrollmentDate: document.getElementById("enrollmentDate").value,
    status: "active",
    //
  };

  try {
    if (editingId) {
      await updateStudent(editingId, studentData);
      showNotification("Student updated successfully", "success");
    } else {
      await createStudent(studentData);
      showNotification("Student created successfully", "success");
    }
    closeModal();
    await loadStudents();
    await updateDashboardStats();
  } catch (error) {
    console.error("Error", error);
    showNotification("Error saving student data", "error");
  } finally {
    hideLoading();
  }
}

//Handle course form submission
async function handleCourseFormSubmit(e) {
  e.preventDefault();
  showLoading();

  const courseData = {
    name: document.getElementById("courseName").value.trim(),
    description: document.getElementById("courseDescription").value.trim(),
    duration: parseInt(document.getElementById("courseDuration").value, 10),
    status: document.getElementById("courseStatus").value,
  };

  try {
    if (editingId) {
      await updateCourse(editingId, courseData);
      showNotification("Course updated successfully", "success");
    } else {
      await createCourse(courseData);
      showNotification("Course created successfully", "success");
    }
    closeModal();
    await loadCourses();
    await updateDashboardStats();
  } catch (error) {
    console.error("Error", error);
    showNotification("Error saving course data", "error");
  } finally {
    hideLoading();
  }
}
//UI Rendering Functions
function renderStudentTable(studentToRender) {
  const tables = [studentTableBody, allStudentTableBody];

  tables.forEach((table) => {
    if (!table) return; // Skiip if table doesn't exist

    table.innerHTML = "";

    if (studentToRender.length === 0) {
      const colSpan = table.closest("table").querySelectorAll("th").length;
      table.innerHTML = `
            <tr>
                <td colSpan="${colSpan}"
                class="empty-state">
                    <i class="fa fa-users"></i>
                    <h3>No student found!</h3>
                    <p>Click "Add Student" to add your first student </p>
                </td>
            </tr>
            `;
      return;
    }

    studentToRender.forEach((student) => {
      const row = document.createElement("tr");
      row.innerHTML = `
            <td>${student._id}</td>
            <td>${escapeHtml(student.name)}</td>
            <td>${escapeHtml(student.courseName || student.crouse)}</td>
            <td>${formDate(student.enrollmentDate)}</td>
            <td>
                <span class="status-badge status-${student.status}">
                ${capitalizedFirstLetter(student.status)}
                </span>
            </td>
            <td class="action-buttons">
                <button class="action-btn edit-btn" onClick="editStudent(student._id)">
                <i class="fa fa-edit"></i>Edit
                </button>

                <button class="action-btn delete-btn" onClick="deleteStudent(student._id)">
                <i class = "fa fa-trash"></i>Delete
                </button>
            </td>
            `;
      table.appendChild(row);
    });
  });
}

//Update Course Dropdown
function updateCourseDropdown(courses) {
  const courseSelect = document.getElementById("studentCourse"); // Replace with the actual ID of your dropdown element
  
  if(!courseSelect){
    console.log("Course dropdown element not found!");
    return;
  }

   // Clear existing options in the dropdown (if needed)
  courseSelect.innerHTML = "";
  
  courses
    .filter((course) => course.status === "active")
    .forEach((course) => {
      const option = document.createElement("option");
      option.value = course._id;
      option.textContent = course.name;
      courseSelect.appendChild(option);
    });
}

function renderCourseTable(coursesToRender) {
  courseTableBody.innerHTML = "";

  if (coursesToRender.length === 0) {
    courseTableBody.innerHTML = `
        <tr>
            <td colspan="6" class="empty-state">
                <i class="fa fa-book"></i>
                <h3>No Courses Found!</h3>
                <p>Click "Add Course" to add your first course</p>
            </td>
        </tr>
        `;
    return;
  }

  // To define escapeHtml
  function escapeHtml(str) {
    if (typeof str !== "string") return str;
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  function capitalizedFirstLetter(str) {
    if (typeof str !== "string" || str.length === 0) return str;
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  
  coursesToRender.forEach((course) => {
    const row = document.createElement("tr");
    row.innerHTML = `
        <td>${course._id}</td>
        <td>${escapeHtml(course.name)}</td>
        <td>${escapeHtml(course.description)}</td>
        <td>${course.duration}</td>
        <td>
            <span class="status-badge status-${course.status}">
                ${capitalizedFirstLetter(course.status)}
            </span>
        </td>
        <td class="action-buttons">
            <button class="action-btn edit-btn" onclick="editCourse('${course._id}')">
            <i class="fa fa-edit"></i>Edit
            </button>

            <button class="action-btn delete-btn" onClick="deleteCourse('${course._id}')">
            <i class = "fa fa-trash"></i>Delete
            </button>
        </td>
    `;
    courseTableBody.appendChild(row);
  });
}

//Modal Operations
function openModal() {
  if (courses.length === 0) {
    showNotification(
      "Please add at least one course before adding a student",
      "warning"
    );
    navigateToSection("courses");
    openCourseModal();
    return;
  }

  studentModal.style.display = "flex";
  editingId = null;
  studentForm.reset();
  document.getElementById("modalTitle").textContent = "Add New Student";
}

function closeModal() {
  studentModal.style.display = "none";
  editingId = null;
  studentForm.reset();
}

function openCourseModal() {
  courseModal.style.display = "flex";
  editingCourseId = null;
  courseForm.reset();
  document.getElementById("courseModalTitle").textContent = "Add New Course";
}

function closeCourseModal() {
  courseModal.style.display = "none";
  editingCourseId = null;
  courseForm.reset();
}

//Update the editCourse function
async function editCourse(id) {
  showLoading();

  try {
    const response = await fetch(`${API_BASE_URL}/api/courses/${id}`);
    const contentType = response.headers.get("content-type");

    if (!response.ok) {
      const errorMessage = contentType.includes("application/json")
        ? (await response.json()).message
        : await response.text();
      throw new Error(errorMessage || "Failed to fetch Course");
    }

    const course = await response.json();

    editingCourseId = id;
    document.getElementById("courseModalTitle").textContent = "Edit Course";
    document.getElementById("courseName").value = course.name;
    document.getElementById("courseDescription").value = course.description;
    document.getElementById("courseDuration").value = course.duration;
    document.getElementById("courseStatus").value = course.status;

    courseModal.style.display = "flex";
  } catch (error) {
    console.error("An error occurred while loading course for edit", error);
    showNotification(error.message || "Error loading course data", "error");
  } finally {
    hideLoading();
  }
}


//Search Functionality
let searchTimeout;
function handleSearch(e) {
  clearTimeout(searchTimeout);
  const searchTerm = e.target.value.trim();

  searchTimeout = setTimeout(async () => {
    if (searchTerm.length === 0) {
      await loadStudents();
      return;
    }

    showLoading();
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/students/search?q${encodeURIComponent(searchTerm)}`
      );

      if (!response.ok) throw new Error("Search failed");

      const filteredStudents = await response.json();
      renderStudentTables(filteredStudents);
    } catch (error) {
      console.error("Error searching students", error);
      showNotification("Error searching students", "error");
    } finally {
      hideLoading();
    }
  }, 300); //Debounce search request
}

//Untility Functions
function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatDateForInput(dateString) {
  return new Date(dateString).toISOString().split("T")[0];
}

function showLoading() {
  document.querySelector(".loading-spinner").classList.add("active");
}
function hideLoading() {
  document.querySelector(".loading-spinner").classList.remove("active");
}

function showNotification(message, type = "info") {
  //Remove any existing notification
  const existingNotifications = document.querySelectorAll(".notifications");
  existingNotifications.forEach((notification) => notification.remove());

  //Create new notification
  const notification = document.createElement("div");
  notification.className = `notification${type}`;
  notification.textContent = message;

  //Add notification to the document
  document.body.appendChild(notification);

  //Remove notification after delay
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.removeChild(), 500);
  }, 3000);
}

//Error Handler
function handleError(error, defaultMessage = "An error has occurred") {
    console.error(error);
    showNotification(error.message || defaultMessage, "error");
}

//Update modal close Handler
window.onclick = (e) => {
    if(e.target === studentModal) closeModal();
    if(e.target === courseModal) closeCourseModal();
    if(e.target === document.getElementById("deleteComfirmationModal")) closeDeleteModal();
};