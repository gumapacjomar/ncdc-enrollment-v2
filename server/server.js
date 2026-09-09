const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// =============================================
// MIDDLEWARE
// =============================================
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =============================================
// DATABASE CONNECTION
// =============================================
const db = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3307,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ncdc_enrollment_v3'
});

db.connect((err) => {
    if (err) {
        console.error('❌ Database connection failed!');
        console.error('Error Code:', err.code);
        console.error('Error Message:', err.message);
        return;
    }
    console.log('✅ Connected to MySQL database on port ' + (process.env.DB_PORT || 3307));
});

// =============================================
// FILE UPLOAD CONFIGURATION (MULTER)
// =============================================
const uploadDir = path.join(__dirname, 'uploads', 'requirements');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Only images and PDF files are allowed'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024
    },
    fileFilter: fileFilter
});

// =============================================
// PROFILE PICTURE UPLOAD CONFIGURATION
// =============================================
const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, 'uploads', 'profiles');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'profile-' + uniqueSuffix + ext);
    }
});

const profileUpload = multer({
    storage: profileStorage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

// =============================================
// EMAIL CONFIGURATION - DISABLED
// =============================================
console.log('📧 Email service: Disabled');

// =============================================
// HELPER FUNCTIONS
// =============================================

// Generate Student ID (NCDC-000001)
const generateStudentId = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT student_id FROM students WHERE student_id IS NOT NULL ORDER BY id DESC LIMIT 1`;
        db.query(query, (err, results) => {
            if (err) return reject(err);
            
            if (results.length === 0 || !results[0].student_id) {
                return resolve('NCDC-000001');
            }
            
            const lastId = results[0].student_id;
            const num = parseInt(lastId.split('-')[1]) + 1;
            const padded = String(num).padStart(6, '0');
            resolve(`NCDC-${padded}`);
        });
    });
};

// =============================================
// API ROUTES
// =============================================

// Test Route
app.get('/api/test', (req, res) => {
    res.json({ message: 'NCDC Enrollment System API is running!' });
});

// =============================================
// 1. STUDENT APPLICATION
// =============================================
app.post('/api/apply', upload.fields([
    { name: 'birthCertificate', maxCount: 1 },
    { name: 'immunizationRecord', maxCount: 1 },
    { name: 'medicalClearance', maxCount: 1 },
    { name: 'idPicture', maxCount: 1 }
]), async (req, res) => {
    try {
        const {
            firstName, middleName, lastName, suffix,
            birthDate, gender, address, contactNumber, email,
            fatherName, fatherOccupation, fatherContact,
            motherName, motherOccupation, motherContact,
            guardianName, guardianContact,
            academicYear
        } = req.body;

        const files = req.files || {};
        const birthCertificate = files.birthCertificate ? files.birthCertificate[0].filename : null;
        const immunizationRecord = files.immunizationRecord ? files.immunizationRecord[0].filename : null;
        const medicalClearance = files.medicalClearance ? files.medicalClearance[0].filename : null;
        const idPicture = files.idPicture ? files.idPicture[0].filename : null;

        if (!firstName || !lastName || !birthDate || !gender || !address || !email) {
            return res.status(400).json({ error: 'Please fill in all required fields' });
        }

        // Validate age (4-5 years old)
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        if (age < 4 || age > 5) {
            return res.status(400).json({ error: `Age must be 4-5 years old. Current age: ${age} years old.` });
        }

        // Check if email already exists
        const emailCheckQuery = `SELECT id FROM students WHERE email = ?`;
        db.query(emailCheckQuery, [email], (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            // Generate username
            const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
            
            // Generate default password
            const defaultPassword = Math.random().toString(36).slice(-8);
            
            // Hash password
            bcrypt.hash(defaultPassword, 10, (err, hashedPassword) => {
                if (err) {
                    return res.status(500).json({ error: 'Password hashing error: ' + err.message });
                }

                // Insert into students table
                const studentQuery = `
                    INSERT INTO students (
                        first_name, middle_name, last_name, suffix,
                        birth_date, gender, address, contact_number, email,
                        username, password,
                        father_name, father_occupation, father_contact,
                        mother_name, mother_occupation, mother_contact,
                        guardian_name, guardian_contact,
                        is_first_login
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const studentValues = [
                    firstName, middleName || null, lastName, suffix || null,
                    birthDate, gender, address, contactNumber || null, email,
                    username, hashedPassword,
                    fatherName || null, fatherOccupation || null, fatherContact || null,
                    motherName || null, motherOccupation || null, motherContact || null,
                    guardianName || null, guardianContact || null,
                    true
                ];

                db.query(studentQuery, studentValues, (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: 'Student insert error: ' + err.message });
                    }

                    const studentId = result.insertId;

                    // Insert into applications
                    const appQuery = `
                        INSERT INTO applications (
                            student_id, academic_year,
                            birth_certificate, immunization_record, medical_clearance, id_picture,
                            status
                        ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    `;

                    const appValues = [
                        studentId,
                        academicYear || '2026-2027',
                        birthCertificate,
                        immunizationRecord,
                        medicalClearance,
                        idPicture,
                        'pending'
                    ];

                    db.query(appQuery, appValues, (err) => {
                        if (err) {
                            return res.status(500).json({ error: 'Application insert error: ' + err.message });
                        }

                        res.status(201).json({
                            success: true,
                            message: 'Application submitted successfully!',
                            studentId: studentId,
                            username: username,
                            password: defaultPassword
                        });
                    });
                });
            });
        });
    } catch (error) {
        console.error('Application error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// =============================================
// 2. LOGIN
// =============================================
app.post('/api/login', (req, res) => {
    const { username, password, role } = req.body;

    // Determine which table to query based on role
    let tableName = '';
    let idField = '';
    let profileFields = '';

    if (role === 'student') {
        tableName = 'students';
        idField = 'id';
        profileFields = 'id, first_name, middle_name, last_name, student_id';
    } else if (role === 'admin') {
        tableName = 'admins';
        idField = 'id';
        profileFields = 'id, first_name, last_name, employee_id, position, department';
    } else if (role === 'registrar') {
        tableName = 'registrars';
        idField = 'id';
        profileFields = 'id, first_name, last_name, employee_id, department';
    } else {
        // Try all tables
        return loginWithAllTables(username, password, res);
    }

    const query = `SELECT * FROM ${tableName} WHERE username = ?`;
    db.query(query, [username], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        const updateQuery = `UPDATE ${tableName} SET last_login = NOW() WHERE id = ?`;
        db.query(updateQuery, [user.id]);

        // Generate JWT
        const token = jwt.sign(
            { id: user.id, username: user.username, role: role },
            process.env.JWT_SECRET || 'my_secret_key',
            { expiresIn: '7d' }
        );

        // Get profile data
        const profileQuery = `SELECT ${profileFields} FROM ${tableName} WHERE id = ?`;
        db.query(profileQuery, [user.id], (err, profileResults) => {
            if (err) return res.status(500).json({ error: err.message });

            const profile = profileResults[0] || {};

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: role,
                    isFirstLogin: user.is_first_login === 1,
                    firstName: profile.first_name,
                    lastName: profile.last_name,
                    studentId: profile.student_id || null,
                    employeeId: profile.employee_id || null,
                    email: user.email,
                    profile: profile
                }
            });
        });
    });
});

// Helper function to try all tables
const loginWithAllTables = (username, password, res) => {
    const tables = ['students', 'admins', 'registrars'];
    const roles = ['student', 'admin', 'registrar'];
    let currentIndex = 0;

    const tryNextTable = () => {
        if (currentIndex >= tables.length) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const tableName = tables[currentIndex];
        const role = roles[currentIndex];
        let profileFields = '';

        if (role === 'student') {
            profileFields = 'id, first_name, middle_name, last_name, student_id';
        } else if (role === 'admin') {
            profileFields = 'id, first_name, last_name, employee_id, position, department';
        } else if (role === 'registrar') {
            profileFields = 'id, first_name, last_name, employee_id, department';
        }

        const query = `SELECT * FROM ${tableName} WHERE username = ?`;
        db.query(query, [username], async (err, results) => {
            if (err) {
                currentIndex++;
                return tryNextTable();
            }
            
            if (results.length === 0) {
                currentIndex++;
                return tryNextTable();
            }

            const user = results[0];

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                currentIndex++;
                return tryNextTable();
            }

            // Update last login
            const updateQuery = `UPDATE ${tableName} SET last_login = NOW() WHERE id = ?`;
            db.query(updateQuery, [user.id]);

            const token = jwt.sign(
                { id: user.id, username: user.username, role: role },
                process.env.JWT_SECRET || 'my_secret_key',
                { expiresIn: '7d' }
            );

            const profileQuery = `SELECT ${profileFields} FROM ${tableName} WHERE id = ?`;
            db.query(profileQuery, [user.id], (err, profileResults) => {
                if (err) return res.status(500).json({ error: err.message });

                const profile = profileResults[0] || {};

                res.json({
                    success: true,
                    token,
                    user: {
                        id: user.id,
                        username: user.username,
                        role: role,
                        isFirstLogin: user.is_first_login === 1,
                        firstName: profile.first_name,
                        lastName: profile.last_name,
                        studentId: profile.student_id || null,
                        employeeId: profile.employee_id || null,
                        email: user.email,
                        profile: profile
                    }
                });
            });
        });
    };

    tryNextTable();
};

// =============================================
// 3. REGISTRAR - Get Pending Applications
// =============================================
app.get('/api/registrar/pending', (req, res) => {
    const query = `
        SELECT 
            a.id as application_id,
            s.id as student_id,
            s.first_name, s.middle_name, s.last_name, s.suffix,
            s.email, s.contact_number,
            s.address, s.birth_date, s.gender,
            a.academic_year,
            a.status,
            a.birth_certificate, a.immunization_record, a.medical_clearance, a.id_picture,
            a.created_at
        FROM applications a
        JOIN students s ON a.student_id = s.id
        WHERE a.status = 'pending'
        ORDER BY a.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 4. REGISTRAR - Get Single Application Details
// =============================================
app.get('/api/registrar/application/:id', (req, res) => {
    const applicationId = req.params.id;
    
    const query = `
        SELECT 
            a.*,
            s.*,
            r.first_name as registrar_first_name,
            r.last_name as registrar_last_name
        FROM applications a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN registrars r ON a.registrar_id = r.id
        WHERE a.id = ?
    `;

    db.query(query, [applicationId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }
        
        res.json(results[0]);
    });
});

// =============================================
// 5. REGISTRAR - Approve Application
// =============================================
app.put('/api/registrar/approve/:id', (req, res) => {
    const applicationId = req.params.id;
    const { registrarId, remarks } = req.body;

    const query = `
        UPDATE applications 
        SET 
            status = 'approved',
            registrar_id = ?,
            registrar_remarks = ?,
            registrar_action_date = NOW()
        WHERE id = ?
    `;

    db.query(query, [registrarId, remarks || 'Approved by Registrar', applicationId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        res.json({ success: true, message: 'Application approved successfully!' });
    });
});

// =============================================
// 6. REGISTRAR - Decline Application
// =============================================
app.put('/api/registrar/decline/:id', (req, res) => {
    const applicationId = req.params.id;
    const { registrarId, remarks } = req.body;

    const query = `
        UPDATE applications 
        SET 
            status = 'declined',
            registrar_id = ?,
            registrar_remarks = ?,
            registrar_action_date = NOW()
        WHERE id = ?
    `;

    db.query(query, [registrarId, remarks || 'Declined by Registrar', applicationId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        res.json({ success: true, message: 'Application declined!' });
    });
});

// =============================================
// 7. ADMIN - Get Approved Applications
// =============================================
app.get('/api/admin/approved', (req, res) => {
    const query = `
        SELECT 
            a.id as application_id,
            s.id as student_id,
            s.first_name, s.middle_name, s.last_name, s.suffix,
            s.email, s.contact_number,
            s.address, s.birth_date, s.gender,
            s.father_name, s.mother_name, s.guardian_name,
            s.student_id,
            a.academic_year,
            a.status,
            a.birth_certificate, a.immunization_record, a.medical_clearance, a.id_picture,
            a.registrar_remarks,
            a.created_at,
            r.first_name as registrar_first_name,
            r.last_name as registrar_last_name
        FROM applications a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN registrars r ON a.registrar_id = r.id
        WHERE a.status = 'approved'
        ORDER BY a.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 8. ADMIN - Confirm Enrollment (Student ID as Password)
// =============================================
app.post('/api/admin/confirm/:id', async (req, res) => {
    const applicationId = req.params.id;
    const { adminId, remarks } = req.body;

    console.log('📝 Confirm enrollment:');
    console.log('  Application ID:', applicationId);

    try {
        const getStudentQuery = `
            SELECT s.*, a.academic_year 
            FROM applications a
            JOIN students s ON a.student_id = s.id
            WHERE a.id = ?
        `;

        db.query(getStudentQuery, [applicationId], async (err, results) => {
            if (err) {
                console.error('❌ Error:', err);
                return res.status(500).json({ error: err.message });
            }
            
            if (results.length === 0) {
                return res.status(404).json({ error: 'Application not found' });
            }

            const student = results[0];
            console.log('✅ Student:', student.first_name, student.last_name);

            // Generate Student ID
            const studentId = await generateStudentId();
            console.log('✅ Student ID:', studentId);

            // ===== PASSWORD = STUDENT ID NUMBER (6 digits) =====
            const defaultPassword = studentId.replace('NCDC-', '');
            console.log('🔑 Default Password:', defaultPassword);
            
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            // Update student with student_id and password
            await new Promise((resolve, reject) => {
                db.query(
                    'UPDATE students SET student_id = ?, password = ?, is_first_login = TRUE WHERE id = ?',
                    [studentId, hashedPassword, student.id],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            console.log('✅ Student updated with ID and password');

            // Update application
            await new Promise((resolve, reject) => {
                db.query(
                    'UPDATE applications SET status = ?, admin_id = ?, admin_remarks = ?, admin_action_date = NOW() WHERE id = ?',
                    ['confirmed', adminId, remarks || 'Confirmed by Admin', applicationId],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            console.log('✅ Application confirmed');

            res.json({
                success: true,
                message: 'Student confirmed and enrolled successfully!',
                data: {
                    studentId: studentId,
                    username: student.username,
                    password: defaultPassword,
                    email: student.email,
                    note: 'Use your 6-digit Student ID number as your password.'
                }
            });

        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// =============================================
// 9. ADMIN - Reject Application
// =============================================
app.put('/api/admin/reject/:id', (req, res) => {
    const applicationId = req.params.id;
    const { adminId, remarks } = req.body;

    const query = `
        UPDATE applications 
        SET 
            status = 'rejected',
            admin_id = ?,
            admin_remarks = ?,
            admin_action_date = NOW()
        WHERE id = ?
    `;

    db.query(query, [adminId, remarks || 'Rejected by Admin', applicationId], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        res.json({ success: true, message: 'Application rejected and returned to registrar' });
    });
});

// =============================================
// 10. ADMIN - Get All Applications
// =============================================
app.get('/api/admin/applications', (req, res) => {
    const query = `
        SELECT 
            a.id as application_id,
            s.id as student_id,
            s.student_id,
            s.first_name, s.middle_name, s.last_name, s.suffix,
            s.email, s.contact_number,
            a.status,
            a.created_at,
            a.registrar_remarks,
            a.admin_remarks,
            r.first_name as registrar_first_name,
            r.last_name as registrar_last_name,
            ad.first_name as admin_first_name,
            ad.last_name as admin_last_name
        FROM applications a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN registrars r ON a.registrar_id = r.id
        LEFT JOIN admins ad ON a.admin_id = ad.id
        ORDER BY a.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 11. ADMIN - Get Rejected Applications
// =============================================
app.get('/api/admin/rejected', (req, res) => {
    const query = `
        SELECT 
            a.id as application_id,
            s.id as student_id,
            s.first_name, s.middle_name, s.last_name, s.suffix,
            s.email, s.contact_number,
            a.status,
            a.admin_remarks,
            a.created_at,
            ad.first_name as admin_first_name,
            ad.last_name as admin_last_name
        FROM applications a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN admins ad ON a.admin_id = ad.id
        WHERE a.status = 'rejected'
        ORDER BY a.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 12. ADMIN - Get Single Application Details (FOR VIEW)
// =============================================
app.get('/api/admin/application/:id', (req, res) => {
    const studentId = req.params.id;
    
    console.log('🔍 Admin viewing application for student ID:', studentId);

    const query = `
        SELECT 
            s.id as student_id,
            s.student_id as public_id,
            s.first_name,
            s.middle_name,
            s.last_name,
            s.suffix,
            s.birth_date,
            s.gender,
            s.address,
            s.contact_number,
            s.email,
            s.father_name,
            s.father_occupation,
            s.father_contact,
            s.mother_name,
            s.mother_occupation,
            s.mother_contact,
            s.guardian_name,
            s.guardian_contact,
            s.profile_pic,
            a.id as application_id,
            a.academic_year,
            a.birth_certificate,
            a.immunization_record,
            a.medical_clearance,
            a.id_picture,
            a.status as application_status,
            a.registrar_remarks,
            a.admin_remarks,
            a.created_at as application_date,
            a.registrar_action_date,
            a.admin_action_date,
            r.first_name as registrar_first_name,
            r.last_name as registrar_last_name,
            ad.first_name as admin_first_name,
            ad.last_name as admin_last_name
        FROM students s
        LEFT JOIN applications a ON s.id = a.student_id
        LEFT JOIN registrars r ON a.registrar_id = r.id
        LEFT JOIN admins ad ON a.admin_id = ad.id
        WHERE s.id = ?
        ORDER BY a.id DESC LIMIT 1
    `;

    db.query(query, [studentId], (err, results) => {
        if (err) {
            console.error('❌ Error fetching application:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (results.length === 0) {
            console.log('⚠️ No application found for ID:', req.params.id);
            return res.status(404).json({ error: 'Application not found' });
        }
        
        console.log('✅ Application found');
        res.json(results[0]);
    });
});

// =============================================
// 13. ADMIN - Registrar Management
// =============================================
app.get('/api/admin/registrars', (req, res) => {
    const query = `
        SELECT id, employee_id, first_name, last_name, username, email, department, created_at, last_login
        FROM registrars 
        ORDER BY id DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/admin/registrars', async (req, res) => {
    const { employeeId, firstName, lastName, username, email, password, department } = req.body;

    if (!employeeId || !firstName || !lastName || !username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if employee_id exists
    const checkEmpQuery = `SELECT id FROM registrars WHERE employee_id = ?`;
    db.query(checkEmpQuery, [employeeId], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            return res.status(400).json({ error: 'Employee ID already exists' });
        }

        // Check if username exists
        const checkUserQuery = `SELECT id FROM registrars WHERE username = ?`;
        db.query(checkUserQuery, [username], async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            // Check if email exists
            const checkEmailQuery = `SELECT id FROM registrars WHERE email = ?`;
            db.query(checkEmailQuery, [email], async (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                if (results.length > 0) {
                    return res.status(400).json({ error: 'Email already exists' });
                }

                const hashedPassword = await bcrypt.hash(password, 10);

                const insertQuery = `
                    INSERT INTO registrars (employee_id, first_name, last_name, username, password, email, department, is_first_login)
                    VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
                `;

                db.query(insertQuery, [employeeId, firstName, lastName, username, hashedPassword, email, department || null], (err, result) => {
                    if (err) return res.status(500).json({ error: err.message });
                    res.status(201).json({ 
                        success: true, 
                        message: 'Registrar created successfully',
                        id: result.insertId 
                    });
                });
            });
        });
    });
});

app.put('/api/admin/registrars/:id', async (req, res) => {
    const id = req.params.id;
    const { employeeId, firstName, lastName, username, email, department } = req.body;

    const checkQuery = `SELECT id FROM registrars WHERE id = ?`;
    db.query(checkQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Registrar not found' });
        }

        const updateQuery = `
            UPDATE registrars 
            SET employee_id = ?, first_name = ?, last_name = ?, username = ?, email = ?, department = ?
            WHERE id = ?
        `;

        db.query(updateQuery, [employeeId, firstName, lastName, username, email, department || null, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Registrar updated successfully' });
        });
    });
});

app.delete('/api/admin/registrars/:id', (req, res) => {
    const id = req.params.id;

    const checkQuery = `SELECT id FROM registrars WHERE id = ?`;
    db.query(checkQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Registrar not found' });
        }

        const deleteQuery = `DELETE FROM registrars WHERE id = ?`;
        db.query(deleteQuery, [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Registrar deleted successfully' });
        });
    });
});

// =============================================
// 14. STUDENT - Get Profile
// =============================================
app.get('/api/student/profile/:studentId', (req, res) => {
    const studentId = req.params.studentId;
    
    const query = `SELECT * FROM students WHERE id = ?`;
    db.query(query, [studentId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        res.json(results[0]);
    });
});

// =============================================
// 15. STUDENT - Get Application Status
// =============================================
app.get('/api/student/application/:studentId', (req, res) => {
    const studentId = req.params.studentId;
    
    const query = `
        SELECT a.*, a.status 
        FROM applications a 
        WHERE a.student_id = ? 
        ORDER BY a.id DESC LIMIT 1
    `;
    db.query(query, [studentId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }
        res.json(results[0]);
    });
});

// =============================================
// 16. STUDENT - Change Password
// =============================================
app.post('/api/student/change-password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    const query = `SELECT * FROM students WHERE id = ?`;
    db.query(query, [userId], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updateQuery = `UPDATE students SET password = ?, is_first_login = FALSE WHERE id = ?`;
        db.query(updateQuery, [hashedPassword, userId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Password changed successfully!' });
        });
    });
});

// =============================================
// 17. STUDENT - Update Profile
// =============================================
app.put('/api/student/update-profile/:id', (req, res) => {
    const studentId = req.params.id;
    const { first_name, middle_name, last_name, contact_number, address } = req.body;

    const query = `
        UPDATE students 
        SET first_name = ?, middle_name = ?, last_name = ?, contact_number = ?, address = ?
        WHERE id = ?
    `;

    db.query(query, [first_name, middle_name, last_name, contact_number, address, studentId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Profile updated successfully!' });
    });
});

// =============================================
// 18. STUDENT - Upload Profile Picture
// =============================================
app.post('/api/student/upload-profile-pic/:id', profileUpload.single('profile_pic'), (req, res) => {
    const studentId = req.params.id;
    const profilePic = req.file ? req.file.filename : null;

    if (!profilePic) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const query = `UPDATE students SET profile_pic = ? WHERE id = ?`;
    db.query(query, [profilePic, studentId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Profile picture updated successfully!', filename: profilePic });
    });
});

// =============================================
// 19. FORGOT PASSWORD - Request Temporary Password
// =============================================
app.post('/api/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const checkStudentQuery = `
        SELECT id, email, first_name, last_name, username
        FROM students
        WHERE email = ?
    `;

    db.query(checkStudentQuery, [email], (err, results) => {
        if (err) {
            console.error('❌ Error checking email:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Email not found. Please check your email address.' });
        }

        const student = results[0];

        const insertQuery = `
            INSERT INTO password_reset_requests (student_id, email, status)
            VALUES (?, ?, 'pending')
        `;

        db.query(insertQuery, [student.id, student.email], (err) => {
            if (err) {
                console.error('❌ Error saving request:', err);
                return res.status(500).json({ error: 'Failed to save request' });
            }

            console.log('📧 Forgot password request saved:');
            console.log('  Student:', student.first_name, student.last_name);
            console.log('  Email:', student.email);

            res.json({
                success: true,
                message: '✅ Request sent to admin. You will receive a temporary password shortly.',
                data: {
                    studentId: student.id,
                    username: student.username,
                    email: student.email
                }
            });
        });
    });
});

// =============================================
// 20. ADMIN - Get Password Reset Requests
// =============================================
app.get('/api/admin/password-requests', (req, res) => {
    const query = `
        SELECT 
            pr.id as request_id,
            pr.student_id,
            pr.email,
            pr.status,
            pr.created_at,
            s.first_name,
            s.last_name,
            s.username
        FROM password_reset_requests pr
        JOIN students s ON pr.student_id = s.id
        WHERE pr.status = 'pending'
        ORDER BY pr.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Error fetching requests:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// =============================================
// 21. ADMIN - Generate Temporary Password
// =============================================
app.post('/api/admin/generate-temp-password', async (req, res) => {
    const { studentId, requestId } = req.body;

    if (!studentId) {
        return res.status(400).json({ error: 'Student ID is required' });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const query = `UPDATE students SET password = ?, is_first_login = TRUE WHERE id = ?`;
    db.query(query, [hashedPassword, studentId], (err) => {
        if (err) {
            console.error('❌ Error generating temp password:', err);
            return res.status(500).json({ error: 'Failed to generate temporary password' });
        }

        if (requestId) {
            const updateRequestQuery = `UPDATE password_reset_requests SET status = 'resolved' WHERE id = ?`;
            db.query(updateRequestQuery, [requestId], (err) => {
                if (err) {
                    console.error('❌ Error updating request status:', err);
                }
            });
        }

        res.json({
            success: true,
            message: 'Temporary password generated successfully',
            data: {
                temporaryPassword: tempPassword,
                note: 'Student must change password after first login'
            }
        });
    });
});

// =============================================
// 22. ADMIN - Delete Application
// =============================================
app.delete('/api/admin/application/:id', (req, res) => {
    const applicationId = req.params.id;

    const query = `DELETE FROM applications WHERE id = ?`;
    db.query(query, [applicationId], (err, result) => {
        if (err) {
            console.error('❌ Error deleting application:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        res.json({ success: true, message: 'Application deleted successfully!' });
    });
});

// =============================================
// 23. ADMIN - Delete Student
// =============================================
app.delete('/api/admin/student/:id', (req, res) => {
    const studentId = req.params.id;

    const query = `DELETE FROM students WHERE id = ?`;
    db.query(query, [studentId], (err, result) => {
        if (err) {
            console.error('❌ Error deleting student:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        res.json({ success: true, message: 'Student deleted successfully!' });
    });
});

// =============================================
// 24. ADMIN - Get Profile
// =============================================
app.get('/api/admin/profile/:id', (req, res) => {
    const userId = req.params.id;

    const query = `
        SELECT id, employee_id, first_name, last_name, username, email, position, department, profile_pic, created_at, last_login
        FROM admins 
        WHERE id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }
        res.json(results[0]);
    });
});

// =============================================
// 25. ADMIN - Update Profile
// =============================================
app.put('/api/admin/profile/:id', profileUpload.single('profile_pic'), (req, res) => {
    const userId = req.params.id;
    const { first_name, last_name, email, employee_id, position, department } = req.body;
    const profilePic = req.file ? req.file.filename : null;

    const checkQuery = `SELECT id FROM admins WHERE id = ?`;
    db.query(checkQuery, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        let query = `
            UPDATE admins 
            SET first_name = ?, last_name = ?, email = ?, employee_id = ?, position = ?, department = ?
        `;
        let params = [first_name, last_name, email, employee_id, position || null, department || null];

        if (profilePic) {
            query += `, profile_pic = ?`;
            params.push(profilePic);
        }

        query += ` WHERE id = ?`;
        params.push(userId);

        db.query(query, params, (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Profile updated successfully!' });
        });
    });
});

// =============================================
// 26. REGISTRAR - Get Profile
// =============================================
app.get('/api/registrar/profile/:id', (req, res) => {
    const userId = req.params.id;

    const query = `
        SELECT id, employee_id, first_name, last_name, username, email, department, profile_pic, created_at, last_login
        FROM registrars 
        WHERE id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Registrar not found' });
        }
        res.json(results[0]);
    });
});

// =============================================
// 27. REGISTRAR - Update Profile
// =============================================
app.put('/api/registrar/profile/:id', profileUpload.single('profile_pic'), (req, res) => {
    const userId = req.params.id;
    const { first_name, last_name, email, employee_id, department } = req.body;
    const profilePic = req.file ? req.file.filename : null;

    console.log('📝 Updating registrar profile:');
    console.log('  User ID:', userId);
    console.log('  First Name:', first_name);
    console.log('  Last Name:', last_name);
    console.log('  Email:', email);
    console.log('  Employee ID:', employee_id);
    console.log('  Department:', department);
    console.log('  Profile Pic:', profilePic);

    if (!first_name || !last_name || !email) {
        return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    const checkQuery = `SELECT id FROM registrars WHERE id = ?`;
    db.query(checkQuery, [userId], (err, results) => {
        if (err) {
            console.error('❌ Error checking registrar:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Registrar not found' });
        }

        let query = `
            UPDATE registrars 
            SET first_name = ?, last_name = ?, email = ?, employee_id = ?, department = ?
        `;
        let params = [first_name, last_name, email, employee_id || null, department || null];

        if (profilePic) {
            query += `, profile_pic = ?`;
            params.push(profilePic);
        }

        query += ` WHERE id = ?`;
        params.push(userId);

        db.query(query, params, (err) => {
            if (err) {
                console.error('❌ Error updating registrar:', err);
                return res.status(500).json({ error: err.message });
            }
            console.log('✅ Registrar profile updated successfully');
            res.json({ success: true, message: 'Profile updated successfully!' });
        });
    });
});

// =============================================
// 28. CHANGE PASSWORD (for admin/registrar)
// =============================================
app.post('/api/change-password', async (req, res) => {
    const { userId, currentPassword, newPassword, role } = req.body;

    let tableName = '';
    if (role === 'student') tableName = 'students';
    else if (role === 'admin') tableName = 'admins';
    else if (role === 'registrar') tableName = 'registrars';
    else return res.status(400).json({ error: 'Invalid role' });

    const query = `SELECT * FROM ${tableName} WHERE id = ?`;
    db.query(query, [userId], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = results[0];

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        const updateQuery = `UPDATE ${tableName} SET password = ?, is_first_login = FALSE WHERE id = ?`;
        db.query(updateQuery, [hashedPassword, userId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Password changed successfully!' });
        });
    });
});

// =============================================
// 29. REGISTRAR - Update Application Details (EDIT)
// =============================================
app.put('/api/registrar/application/:id', (req, res) => {
    const applicationId = req.params.id;
    const {
        first_name, middle_name, last_name, suffix,
        birth_date, gender, address, contact_number, email,
        father_name, father_occupation, father_contact,
        mother_name, mother_occupation, mother_contact,
        guardian_name, guardian_contact,
        academic_year, registrar_remarks
    } = req.body;

    console.log('📝 Registrar editing application:', applicationId);

    // First, get the student_id from application
    const getStudentQuery = `SELECT student_id FROM applications WHERE id = ?`;
    db.query(getStudentQuery, [applicationId], (err, results) => {
        if (err) {
            console.error('❌ Error:', err);
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const studentId = results[0].student_id;

        // Update student information
        const updateStudentQuery = `
            UPDATE students 
            SET 
                first_name = ?,
                middle_name = ?,
                last_name = ?,
                suffix = ?,
                birth_date = ?,
                gender = ?,
                address = ?,
                contact_number = ?,
                email = ?,
                father_name = ?,
                father_occupation = ?,
                father_contact = ?,
                mother_name = ?,
                mother_occupation = ?,
                mother_contact = ?,
                guardian_name = ?,
                guardian_contact = ?
            WHERE id = ?
        `;

        const studentParams = [
            first_name, middle_name || null, last_name, suffix || null,
            birth_date, gender, address, contact_number, email,
            father_name || null, father_occupation || null, father_contact || null,
            mother_name || null, mother_occupation || null, mother_contact || null,
            guardian_name || null, guardian_contact || null,
            studentId
        ];

        db.query(updateStudentQuery, studentParams, (err) => {
            if (err) {
                console.error('❌ Error updating student:', err);
                return res.status(500).json({ error: 'Failed to update student: ' + err.message });
            }

            // Update application (academic_year and registrar_remarks only)
            const updateAppQuery = `
                UPDATE applications 
                SET 
                    academic_year = ?,
                    registrar_remarks = ?
                WHERE id = ?
            `;

            db.query(updateAppQuery, [academic_year, registrar_remarks || null, applicationId], (err) => {
                if (err) {
                    console.error('❌ Error updating application:', err);
                    return res.status(500).json({ error: 'Failed to update application: ' + err.message });
                }

                console.log('✅ Application updated successfully');
                res.json({
                    success: true,
                    message: 'Application updated successfully!'
                });
            });
        });
    });
});

// =============================================
// 30. ADMIN - Return Application to Registrar
// =============================================
app.put('/api/admin/return/:id', (req, res) => {
    const applicationId = req.params.id;
    const { adminId, remarks } = req.body;

    console.log('🔄 Admin returning application:', applicationId);

    const query = `
        UPDATE applications 
        SET 
            status = 'approved',
            admin_id = ?,
            admin_remarks = ?,
            admin_action_date = NOW()
        WHERE id = ?
    `;

    db.query(query, [adminId, remarks || 'Returned to Registrar by Admin', applicationId], (err, result) => {
        if (err) {
            console.error('❌ Error returning application:', err);
            return res.status(500).json({ error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        console.log('✅ Application returned to registrar');
        res.json({ 
            success: true, 
            message: 'Application returned to Registrar successfully!' 
        });
    });
});

// =============================================
// 31. SETTINGS - Get Settings
// =============================================
app.get('/api/settings', (req, res) => {
    console.log('📋 Settings requested');
    
    // Return default settings
    res.json({
        academicYear: '2026-2027',
        semester: '1st Semester',
        ageMin: 4,
        ageMax: 5,
        requirements: ['Birth Certificate', 'Immunization Record', 'Medical Clearance', '2x2 ID Picture']
    });
});

// =============================================
// 32. SETTINGS - Update Settings
// =============================================
app.put('/api/settings', (req, res) => {
    const { academicYear, semester, ageMin, ageMax, requirements } = req.body;
    
    console.log('📝 Settings updated:', req.body);
    
    // For now, just log and return success
    // You can add database storage later
    res.json({
        success: true,
        message: 'Settings saved successfully!',
        data: {
            academicYear,
            semester,
            ageMin,
            ageMax,
            requirements
        }
    });
});

// =============================================
// 33. ADMIN - Get Reports Data
// =============================================
app.get('/api/admin/reports', (req, res) => {
    console.log('📊 Reports requested');

    // Get all applications with student and staff info
    const query = `
        SELECT 
            a.id as application_id,
            a.student_id,
            a.academic_year,
            a.status,
            a.created_at,
            a.registrar_remarks,
            a.admin_remarks,
            a.registrar_action_date,
            a.admin_action_date,
            s.first_name,
            s.middle_name,
            s.last_name,
            s.suffix,
            s.email,
            s.contact_number,
            s.birth_date,
            s.gender,
            s.address,
            s.student_id as student_number,
            r.first_name as registrar_first_name,
            r.last_name as registrar_last_name,
            ad.first_name as admin_first_name,
            ad.last_name as admin_last_name
        FROM applications a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN registrars r ON a.registrar_id = r.id
        LEFT JOIN admins ad ON a.admin_id = ad.id
        ORDER BY a.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Error fetching reports:', err);
            return res.status(500).json({ error: err.message });
        }

        // Calculate statistics
        const total = results.length;
        const pending = results.filter(a => a.status === 'pending').length;
        const approved = results.filter(a => a.status === 'approved').length;
        const confirmed = results.filter(a => a.status === 'confirmed').length;
        const rejected = results.filter(a => a.status === 'rejected').length;
        const declined = results.filter(a => a.status === 'declined').length;

        // Monthly data
        const months = {};
        results.forEach(app => {
            const date = new Date(app.created_at);
            const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
            if (!months[monthYear]) {
                months[monthYear] = 0;
            }
            months[monthYear]++;
        });
        const monthlyData = Object.entries(months).map(([month, count]) => ({ month, count }));

        res.json({
            success: true,
            data: results,
            stats: {
                total,
                pending,
                approved,
                confirmed,
                rejected,
                declined
            },
            monthlyData
        });
    });
});

// =============================================
// START SERVER
// =============================================
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📧 Email service: Disabled`);
    console.log(`📁 Upload directory: ${uploadDir}`);
    console.log(`📊 Using separate tables: students, admins, registrars`);
    console.log(`⚙️  Settings endpoints enabled`);
});