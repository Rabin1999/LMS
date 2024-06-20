const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/LMS')
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.log(err));

// Student Schema
const studentSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    phone: Number,
    role: { type: String, default: 'student' },
});

const Student = mongoose.model('Student', studentSchema);

// Instructor Schema
const instructorSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    phone: Number,
    role: { type: String, default: 'instructor' },
});

const Instructor = mongoose.model('Instructor', instructorSchema);

// Admin Schema
const adminSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    phone: Number,
    role: { type: String, default: 'admin' },
});

const Admin = mongoose.model('Admin', adminSchema);

// Course Schema
const courseSchema = new mongoose.Schema({
    course: String,
    description: String,
    price: Number,
    students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],  // Array of student IDs
    instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'Instructor' } // Instructor ID
});

const Course = mongoose.model('Course', courseSchema);

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

// Middleware to check user role
const checkRole = (roles) => {
    return (req, res, next) => {
        const { userId, role } = req.body; // Assuming userId and role are sent in the request body

        if (!roles.includes(role)) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        next();
    };
};

// Register Student
app.post('/api/register/student', async (req, res) => {
    const { name, email, password, phone } = req.body;
    const student = new Student({ name, email, password, phone });

    try {
        const savedStudent = await student.save();
        res.json({ message: 'Student Registered Successfully', userId: savedStudent._id });
    } catch (err) {
        res.status(400).json({ message: 'Error Occurred' });
    }
});

// Register Instructor
app.post('/api/register/instructor', async (req, res) => {
    const { name, email, password, phone } = req.body;
    const instructor = new Instructor({ name, email, password, phone });

    try {
        const savedInstructor = await instructor.save();
        res.json({ message: 'Instructor Registered Successfully', userId: savedInstructor._id });
    } catch (err) {
        res.status(400).json({ message: 'Error Occurred' });
    }
});

// Register Admin
app.post('/api/register/admin', async (req, res) => {
    const { name, email, password, phone } = req.body;
    const admin = new Admin({ name, email, password, phone });

    try {
        const savedAdmin = await admin.save();
        res.json({ message: 'Admin Registered Successfully', userId: savedAdmin._id });
    } catch (err) {
        res.status(400).json({ message: 'Error Occurred' });
    }
});

// Create Course (Admin Only)
app.post('/api/courses', checkRole(['admin']), async (req, res) => {
    const { course, description, price, userId } = req.body;

    const newCourse = new Course({ course, description, price });

    try {
        const savedCourse = await newCourse.save();
        res.json({ message: 'Course Created Successfully' });
    } catch (err) {
        res.status(400).json({ message: 'Error Occurred' });
    }
});

// Get All Courses (Accessible to all roles)
app.get('/api/courses', async (req, res) => {
    try {
        const courses = await Course.find();
        res.json(courses);
    } catch (err) {
        res.status(400).json({ message: 'Error Occurred' });
    }
});

// Purchase Course (Student Only)
app.post('/api/purchase/:courseId', checkRole(['student']), async (req, res) => {
    const { studentId } = req.body;

    try {
        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(403).json({ message: 'Access Denied' });
        }

        const course = await Course.findById(req.params.courseId);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        // Add the student's ID to the students array
        course.students.push(studentId);
        await course.save();

        res.json({ message: `Course ${course.course} purchased successfully by ${student.name}` });
    } catch (err) {
        res.status(400).json({ message: 'Error Occurred' });
    }
});

// Upload file (Instructor Only)
app.post('/api/upload', upload.single('file'), checkRole(['instructor']), async (req, res) => {
    const { instructorId } = req.body;

    const instructor = await Instructor.findById(instructorId);
    if (!instructor) {
        return res.status(403).json({ message: 'Access Denied' });
    }

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    res.json({ message: 'File uploaded successfully', file: req.file });
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
