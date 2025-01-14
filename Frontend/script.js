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
const courseTableBody = document.getElementId("courseTableBody");
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
    console.error("Error during initialization:", err);
    showNotification("Error ininitializing application:", "error");
  } finally {
    hideLoading();
  }
}

//Navigation Functions
function navigateToSection(section) {
  currentSection = section;

  //Update active nav item
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.section === section) {
      item.classList.add("active");
    }
  });

  //Hide All Sections
  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  //Show Selected or Active Sections
  document.getElementById(`${section}Section`).classList.add("active");

  //Refresh data when switching between sections
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
    renderStudentTables(students);
  } catch (error) {
    console.error("Error loading students", error);
    showNotification("Error loading students", "error");
    students = [];
    renderStudentTables([]);
  }
}

//Load Courses data from the API server
async function loadCourses() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/courses`);
    if (!response.ok) throw new Error("Failed to fetch Courses");

    courses = await response.json();
    updateCourseDropdown(courses);
    renderCourseTables(courses);
    return courses;
  } catch (error) {
    console.error("Failed to load Courses", error);
    showNotification("Error loading Courses", "error");
    courses = [];
    renderCourseTables([]);
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
async function comfirmDelete(){
    showLoading();
    try{
        if(deleteType === "student"){
            const response = await fetch(`${API_BASE_URL}/api/students/${deleteId}`, {
                method: "DELETE"
            });

            if(!response.ok){
                throw new Error("Failed to delete student");
            }

            showNotification("Student deleted successfully!", "success");
            await loadStudents();
            await updateDashboardStats();
        }else if(deleteType === "course"){
            const response = await fetch(`${API_BASE_URL}/api/course/${deleteId}`, {
                method: "DELETE"
            });

            if(!response.ok){
                const error = await response.json();
                throw new Error(error.message || "Failed to delete course");
            }
            showNotification("Course deleted successfully!", "success");
            await loadCourses();
            await updateDashboardStats();
        }
    }catch(error){
        console.error("An error occurred while deleting", error);
        showNotification(error.message || "An error occurred while deleting", "error");
    }finally{
        hideLoading();
        closeDeleteModal();
    }
}

//Form Handling
async function handleFormSubmit(e){
    e.preventDefault();
    showLoading();

    const studentData = {
        name: document.getElementById("studentName").value.trim(),
        email: document.getElementById("studentEmail").value.trim(),
        course: document.getElementById("studentCourse").value.trim(),
        enrollmentDate: document.getElementById("enrollmentDate").value, status: "active", 
        //
    };

    try{
        if(editingId){
            await updateStudent(editingId, studentData);
            showNotification("Student updated successfully", "success");
        }else{
            await createStudent(studentData);
            showNotification("Student created successfully", "success");
        }
        closeModal();
        await loadStudents();
        await updateDashboardStats();
    }catch(error){
        console.error("Error", error);
        showNotification("Error saving student data", "error");
    }finally{
        hideLoading();
    }
}

//Handle course form submission
async function handleCourseFormSubmit(e){
    e.preventDefault();
    showLoading();

    const courseData = {
        name: document.getElementById("courseName").value.trim(),
        description: document.getElementById("courseDescription").value.trim(),
        duration: pasedInt(document.getElementById("courseDuration").value),
        status: document.getElementById("courseStatus").value,
    };

    try{
        if(editingId){
            await updateCourse(editingId, courseData);
            showNotification("Course updated successfully", "success");
        }else{
            await createCourse(courseData);
            showNotification("Course created successfully", "success");
        }
        closeModal();
        await loadCourses();
        await updateDashboardStats();
    }catch(error){
        console.error("Error", error);
        showNotification("Error saving course data", "error");
    }finally{
        hideLoading();
    }
}
