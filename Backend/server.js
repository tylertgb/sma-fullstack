const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
const morgan = require("morgan");
const winston  = require("winston");
const { addColors } = require("winston/lib/winston/config");

//Define our core application
const app = express(); //Basically calling the express object. This allows all the methods and fuctions from this package to be defined

//Define our middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); //Tells express to serve static files like images, css and javascript from a directory name "public"

//To establish the mongoDB connection------------------------------------------ 
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/students-management",   
    { useNewUrlParser: true, useUnifiedTopology: true }
  )
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));
  //END OF MONGODB CONNECTION--------------------------------------------------

//Configure Winston Logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

//Define login middleware for our complete login for our backend
app.use(
  morgan(":method :url :status :response-time ms - :res[content-length]")
);

//Define our custom API logger for our middleware
//Custom API Logger Middleware
const apiLogger = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const durations = Date.now() - start;
    logger.info({
      method: res.method,
      path: res.path,
      status: res.statusCode,
      duration: `${durations}ms`,
      params: req.params,
      query: req.query,
      body: req.method !== "GET" ? req.body : undefined,
    });
  });
  next();
};

app.use(apiLogger);

//Error Handling Middleware
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.method !== "GET" ? req.body : undefined,
  });
  res.status(500).json({ message: "Internal server error" });
});

//To Define the Schemas for our Students Data
//NOTE: A Schema is a like a blue-print that define the structure and rule for documents in the collection
//This is going to create a new Schema in our mongodb database
const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true, // Because 2 students cannot have the same email
    },
    course: {
      type: String,
      required: true,
    },
    enrollmentDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"], //enum is basically a property that specifies a list of allowed values for fields
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

//For creating a Model from your schema in Mongoose
//And the object we're going to create here is going to be use to ACCESS all the functions we're going to use to update the functions we're going to use for "update", "delete", "add" etc
const Student = mongoose.model("Student", studentSchema);
//Note: This "Student" name in the Object is the collection name in the MongoDB Database
//And the studentSchema is the schema name we've created from above

const courseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const Course = mongoose.model("Course", courseSchema);

//Our API Routes
//Course Routes//Allow us to interact with Backend directly with the Frontend

//Course Routes

//This API endpoint is for retrieving courses from the database
app.get("/api/courses", async (req, res) => {
  try {
    const courses = await Course.find().sort({ name: 1 }); //This retrieves the first course from the database and sort them in alphabetical order
    logger.info(`Retrieved ${courses.length} courses successfully`);
    res.json(courses);
  } catch (error) {
    logger.error("Failed to retrieve courses", error);
    res.status(500).json({ message: error.message });
  }
});

//This API endpoint is for creating new courses
app.post("/api/courses", async (req, res) => {
  try {
    const courses = new Course(req.body);
    const savedCourse = await courses.save();
    logger.info("New Course created:", {
      couresId: savedCourse._id,
      name: savedCourse.name,
    });
    res.status(201).json(savedCourse);
  } catch (error) {
    logger.error("Error creating Course", error);
    res.status(400).json({ message: error.message });
  }
});

//THis API endpoint is for Updating or Editing a Course
app.put("/api/course/:id", async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!course) {
      logger.warn("Course not found for update:", { courseId: req.params.id });
      return res.status(404).json({ message: "Course not found" });
    }
    logger.info("Course updated successfully:", {
      courseId: course._id,
      name: course.name,
    });
    res.json(course);
  } catch (error) {
    logger.error("Error updating course:", error);
    res.status(400).json({ message: error.message });
  }
});

//This API endpoint is for Deleting a Course, but also check if the a Student is attached to the course
app.delete("/api/courses/:id", async (req, res) => {
  try {
    const enrolledStudents = await Student.countDocuments({
      courseId: req.params.id,
    });
    if (enrolledStudents > 0) {
      logger.warn("Attempting to delete course with enrolled students:", {
        courseId: req.params.id,
        enrolledStudents,
      });
      return res.status(400).json({
        message: "Course deleted successfully with enrollment students",
      });
    }
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) {
      logger.warn("Course not found for deletion:", {
        courseId: req.params.id,
      });
      return res.status(404).json({ message: "Course not found" });
    }
    logger.info("Course deleted successfully:", {
      courseId: course._id,
      name: course.name,
    });
    res.json({ message: "Course deleted successfully" });
  } catch (error) {
    logger.error("Error deleting course:", error);
    res.status(500).json({ message: error.message });
  }
});

//Student Routes

//This GET API endpoint get or retrieve the students from the Datatables from the date they were created and sort them, and '-1" means the newest students first
app.get("/api/students", async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 }); //We're getting the students from when they where created, sort them in acending order. The "-1" Means the NEWEST first    logger.info(`Retrieved ${students.length} students successfully`);
    res.json(students);
  } catch (error) {
    logger.error("Error while fetching students:", error);
    res.status(500).json({ message: error.message });
  }
});

//This POST API endpoint will creates a new students in the database using the data sent in the request body...
//Basically the data sent from the frontend it's going to be used in the backend from this request body inorder to pass...
//onto our object and then use this data to create a new students

app.post("/api/students", async (req, res) => {
  try {
    const student = new Student(req.body);
    const savedStudent = await student.save();
    logger.info("Student created successfully:", {
      studentId: savedStudent._id,
      name: savedStudent.name,
      course: savedStudent.course,
    });
    res.status(201).json(savedStudent);
  } catch (error) {
    logger.error("Error creating student:", error);
    res.status(400).json({ message: error.message });
  }
});

//THis API endpoint is for Updating or Editing a Student
app.put("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!student) {
      logger.warn("Student not found for update:", {
        studentId: req.params.id,
      });
      return res.status(404).json({ message: "Student not found" });
    }
    logger.info("Student updated successfully:", {
      studentId: student._id,
      name: student.name,
      course: student.course,
    });
    res.json(student);
  } catch (error) {
    logger.error("Error updating student:", error);
    res.status(400).json({ message: error.message });
  }
});

//This API endpoint is for Deleting a Student
app.delete("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) {
      logger.warn("Student not found for deletion:", {
        studentId: req.params.id,
      });
      return res.status(404).json({ message: "Student not found" });
    }
    logger.info("Student deleted successfully:", {
      courseId: student._id,
      name: student.name,
    });
    res.json({ message: "Student deleted successfully" });
  } catch (error) {
    logger.error("Error deleting student:", error);
    res.status(500).json({ message: error.message });
  }
});

//This API endpoint is for Searching students
app.get("/api/student/search", async (req, res) => {
  try {
    const searchTerm = req.query.term;
    logger.info("Searching students initiated:", { searchTerm });

    const students = await Student.find({
      $or: [
        { name: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
        { course: { $regex: searchTerm, $options: "i" } },
      ],
    });
    logger.info("Student search completed:", {
      searchTerm,
      resultsCount: students.length,
    });
    res.json(students);
  } catch (error) {
    logger.error("Error searching student:", error);
    res.status(500).json({ message: error.message });
  }
});

//Final endpoint for our students dashboard.
//This endpoint will help agregate all the data we've stored

//Dashboard Stats
app.get("/api/dashboard/stats", async (req, res) => {
  try {
    const stats = await getDashboardStats();
    logger.info("Dashboard statistics retrieved successfully", stats);
    res.status(500).json({ message: error.message });
  } catch (error) {
    logger.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: error.message });
  }
});

//Helper function for dashboard stats
async function getDashboardStats() {
  const totalStudents = await Student.countDocuments();
  const activeStudents = await Student.countDocuments({ status: "active" });
  const totalCourses = await Course.countDocuments();
  const activeCourses = await Course.countDocuments({ status: "active" });
  const graduates = await Student.countDocuments({ status: "inactive" });
  const courseCouts = await Student.aggregate([
    { $group: { _id: "$course", count: { $sum: 1 } } },
  ]);

  return {
    totalStudents,
    activeStudents,
    totalCourses,
    activeCourses,
    graduates,
    courseCouts,
    successRate:
      totalStudents > 0 ? Math.round((graduates / totalStudents) * 100) : 0,
  };
}

//Basic health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV !== "development",
  });
});

//Detailed health check endpoint with MongoDB connection status
app.get("/health/detailed", async (req, res) => {
  try {
    //Check MongoDB connection
    const dbStatus =
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

    //Get system metrics
    const systemInfo = {
      memory: {
        total: Math.round((process.memoryUsage() / 1024) * 1024),
        used: Math.round((process.memoryUsage() / 1024) * 1024),
        unit: "MB",
      },
      uptime: {
        seconds: Math.round(process.uptime()),
        formatted: formatUptime(process.uptime()),
      },
      nodeVersion: process.versions,
      platform: process.platform,
    };

    //Response object
    const healthCheck = {
      status: "UP",
      timestamp: new Date(),
      database: {
        status: dbStatus,
        name: "MongoDB",
        host: mongoose.connection.host,
      },
      system: systemInfo,
      environment: process.env.NODE_ENV !== "development",
    };
    res.status(200).json(healthCheck);
  } catch (error) {
    res.status(500).json({
      statusL: "DOWN",
      timestamp: new Date(),
      error: error.message,
    });
  }
});

//Get single student by ID
app.get("/api/students/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }
    res.json(student);
  } catch (error) {
    logger.error("Error fetching student:", error);
    res.status(500).json({ message: error.message });
  }
});

//Helper function to format the uptime of the App
function formatUptime(seconds) {
  const days = Math.floor(seconds / (3600 * 24));
  const hours = Math.floor((seconds % (3600 * 24)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (remainingSeconds > 0) parts.push(`${remainingSeconds}s`);

  return parts.join(" ");
}

//Now Lets Start our Server

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
