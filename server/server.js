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
    origin: [
        'http://localhost:5173',
        'http://localhost:3000',
        'https://ncdc-enrollment-v2.vercel.app',
        'https://ncdc-enrollment-v2-git-main-marho.vercel.app',
        'https://ncdcenrollment.bscs4a.com',
        'https://ncdcenrollment.com',
        'https://www.ncdcenrollment.com'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
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
    port: process.env.DB_PORT || 3306,
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
    console.log('✅ Connected to MySQL database on port ' + (process.env.DB_PORT || 3306));
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
            gradeLevel,
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

        if (!gradeLevel) {
            return res.status(400).json({ error: 'Grade level is required' });
        }

        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        if (age < 5 || age > 25) {
            return res.status(400).json({ error: `Invalid age: ${age} years old. Must be between 5 and 25 years old.` });
        }

        const emailCheckQuery = `SELECT id FROM students WHERE email = ?`;
        db.query(emailCheckQuery, [email], (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
            const defaultPassword = Math.random().toString(36).slice(-8);
            
            bcrypt.hash(defaultPassword, 10, (err, hashedPassword) => {
                if (err) {
                    return res.status(500).json({ error: 'Password hashing error: ' + err.message });
                }

                const studentQuery = `
                    INSERT INTO students (
                        first_name, middle_name, last_name, suffix,
                        birth_date, gender, address, contact_number, email,
                        username, password,
                        father_name, father_occupation, father_contact,
                        mother_name, mother_occupation, mother_contact,
                        guardian_name, guardian_contact,
                        current_grade_level,
                        is_first_login
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `;

                const studentValues = [
                    firstName, middleName || null, lastName, suffix || null,
                    birthDate, gender, address, contactNumber || null, email,
                    username, hashedPassword,
                    fatherName || null, fatherOccupation || null, fatherContact || null,
                    motherName || null, motherOccupation || null, motherContact || null,
                    guardianName || null, guardianContact || null,
                    gradeLevel || null,
                    true
                ];

                db.query(studentQuery, studentValues, (err, result) => {
                    if (err) {
                        return res.status(500).json({ error: 'Student insert error: ' + err.message });
                    }

                    const studentId = result.insertId;

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

    let tableName = '';
    let profileFields = '';

    if (role === 'student') {
        tableName = 'students';
        profileFields = 'id, first_name, middle_name, last_name, student_id, current_grade_level';
    } else if (role === 'admin') {
        tableName = 'admins';
        profileFields = 'id, first_name, last_name, employee_id, position, department';
    } else if (role === 'registrar') {
        tableName = 'registrars';
        profileFields = 'id, first_name, last_name, employee_id, department';
    } else {
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
                    database_id: user.id,
                    username: user.username,
                    role: role,
                    isFirstLogin: user.is_first_login === 1,
                    firstName: profile.first_name || user.first_name,
                    lastName: profile.last_name || user.last_name,
                    studentId: profile.student_id || null,
                    employeeId: profile.employee_id || null,
                    currentGradeLevel: profile.current_grade_level || null,
                    email: user.email,
                    profile: profile
                }
            });
        });
    });
});

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
            profileFields = 'id, first_name, middle_name, last_name, student_id, current_grade_level';
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
                        database_id: user.id,
                        username: user.username,
                        role: role,
                        isFirstLogin: user.is_first_login === 1,
                        firstName: profile.first_name || user.first_name,
                        lastName: profile.last_name || user.last_name,
                        studentId: profile.student_id || null,
                        employeeId: profile.employee_id || null,
                        currentGradeLevel: profile.current_grade_level || null,
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
            s.current_grade_level,
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
            a.id as application_id,
            a.student_id,
            a.academic_year,
            a.birth_certificate,
            a.immunization_record,
            a.medical_clearance,
            a.id_picture,
            a.status,
            a.registrar_id,
            a.registrar_remarks,
            a.registrar_action_date,
            a.admin_id,
            a.admin_remarks,
            a.admin_action_date,
            a.created_at,
            a.updated_at,
            s.id as student_table_id,
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
            s.username,
            s.password,
            s.current_grade_level,
            s.father_name,
            s.father_occupation,
            s.father_contact,
            s.mother_name,
            s.mother_occupation,
            s.mother_contact,
            s.guardian_name,
            s.guardian_contact,
            s.profile_pic,
            s.is_first_login,
            s.last_login,
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
            s.student_id as student_public_id,
            s.current_grade_level,
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
// 8. ADMIN - Confirm Enrollment
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

            const studentId = await generateStudentId();
            console.log('✅ Student ID:', studentId);

            const defaultPassword = studentId.replace('NCDC-', '');
            console.log('🔑 Default Password:', defaultPassword);
            
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

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
            s.student_id as student_public_id,
            s.first_name, s.middle_name, s.last_name, s.suffix,
            s.email, s.contact_number,
            s.current_grade_level,
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
// 12. ADMIN - Get Single Application Details
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
            s.current_grade_level,
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

    const checkEmpQuery = `SELECT id FROM registrars WHERE employee_id = ?`;
    db.query(checkEmpQuery, [employeeId], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            return res.status(400).json({ error: 'Employee ID already exists' });
        }

        const checkUserQuery = `SELECT id FROM registrars WHERE username = ?`;
        db.query(checkUserQuery, [username], async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) {
                return res.status(400).json({ error: 'Username already exists' });
            }

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
    
    console.log('🔍 Fetching student profile with ID:', studentId);
    
    const query = `SELECT * FROM students WHERE id = ?`;
    db.query(query, [studentId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }
        console.log('✅ Found student:', results[0].first_name, results[0].last_name);
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
// 19. FORGOT PASSWORD
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

    if (!first_name || !last_name || !email) {
        return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    const checkQuery = `SELECT id FROM registrars WHERE id = ?`;
    db.query(checkQuery, [userId], (err, results) => {
        if (err) {
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
                return res.status(500).json({ error: err.message });
            }
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
// 29. REGISTRAR - Update Application Details
// =============================================
app.put('/api/registrar/application/:id', (req, res) => {
    const applicationId = req.params.id;
    const {
        first_name, middle_name, last_name, suffix,
        birth_date, gender, address, contact_number, email,
        current_grade_level,
        father_name, father_occupation, father_contact,
        mother_name, mother_occupation, mother_contact,
        guardian_name, guardian_contact,
        academic_year, registrar_remarks
    } = req.body;

    const getStudentQuery = `SELECT student_id FROM applications WHERE id = ?`;
    db.query(getStudentQuery, [applicationId], (err, results) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        const studentId = results[0].student_id;

        const updateStudentQuery = `
            UPDATE students 
            SET 
                first_name = ?, middle_name = ?, last_name = ?, suffix = ?,
                birth_date = ?, gender = ?, address = ?, contact_number = ?, email = ?,
                current_grade_level = ?,
                father_name = ?, father_occupation = ?, father_contact = ?,
                mother_name = ?, mother_occupation = ?, mother_contact = ?,
                guardian_name = ?, guardian_contact = ?
            WHERE id = ?
        `;

        const studentParams = [
            first_name, middle_name || null, last_name, suffix || null,
            birth_date, gender, address, contact_number, email,
            current_grade_level || null,
            father_name || null, father_occupation || null, father_contact || null,
            mother_name || null, mother_occupation || null, mother_contact || null,
            guardian_name || null, guardian_contact || null,
            studentId
        ];

        db.query(updateStudentQuery, studentParams, (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to update student: ' + err.message });
            }

            const updateAppQuery = `
                UPDATE applications 
                SET academic_year = ?, registrar_remarks = ?
                WHERE id = ?
            `;

            db.query(updateAppQuery, [academic_year, registrar_remarks || null, applicationId], (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to update application: ' + err.message });
                }

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
            return res.status(500).json({ error: err.message });
        }
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

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
    res.json({
        academicYear: '2026-2027',
        semester: 'Full Year',
        ageMin: 5,
        ageMax: 15,
        requirements: ['Birth Certificate', 'Immunization Record', 'Medical Clearance', '2x2 ID Picture']
    });
});

// =============================================
// 32. SETTINGS - Update Settings
// =============================================
app.put('/api/settings', (req, res) => {
    const { academicYear, semester, ageMin, ageMax, requirements } = req.body;
    
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
            s.current_grade_level,
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

        const total = results.length;
        const pending = results.filter(a => a.status === 'pending').length;
        const approved = results.filter(a => a.status === 'approved').length;
        const confirmed = results.filter(a => a.status === 'confirmed').length;
        const rejected = results.filter(a => a.status === 'rejected').length;
        const declined = results.filter(a => a.status === 'declined').length;

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
// 34. SECTIONS - Get All Sections
// =============================================
app.get('/api/registrar/sections', (req, res) => {
    console.log('📋 Fetching all sections');
    
    const query = `
        SELECT 
            s.id,
            s.section_name,
            s.grade_level,
            s.adviser_id,
            s.school_year,
            s.max_students,
            s.current_students,
            s.status,
            s.created_at,
            r.first_name as adviser_first_name,
            r.last_name as adviser_last_name
        FROM sections s
        LEFT JOIN registrars r ON s.adviser_id = r.id
        ORDER BY s.grade_level, s.section_name
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Error fetching sections:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// =============================================
// 35. SECTIONS - Get Sections by Grade Level
// =============================================
app.get('/api/registrar/sections/grade/:gradeLevel', (req, res) => {
    const { gradeLevel } = req.params;
    
    const query = `
        SELECT 
            s.id,
            s.section_name,
            s.grade_level,
            s.max_students,
            s.current_students,
            s.status,
            r.first_name as adviser_first_name,
            r.last_name as adviser_last_name
        FROM sections s
        LEFT JOIN registrars r ON s.adviser_id = r.id
        WHERE s.grade_level = ? AND s.status = 'active'
        ORDER BY s.section_name
    `;

    db.query(query, [gradeLevel], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 36. SECTIONS - Create New Section
// =============================================
app.post('/api/registrar/sections', (req, res) => {
    const { section_name, grade_level, adviser_id, school_year, max_students } = req.body;

    if (!section_name || !grade_level || !school_year) {
        return res.status(400).json({ error: 'Section name, grade level, and school year are required' });
    }

    const checkQuery = `SELECT id FROM sections WHERE section_name = ? AND grade_level = ? AND school_year = ?`;
    db.query(checkQuery, [section_name, grade_level, school_year], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length > 0) {
            return res.status(400).json({ error: 'Section already exists for this grade level and school year' });
        }

        const insertQuery = `
            INSERT INTO sections (section_name, grade_level, adviser_id, school_year, max_students)
            VALUES (?, ?, ?, ?, ?)
        `;

        db.query(insertQuery, [
            section_name, 
            grade_level, 
            adviser_id || null, 
            school_year, 
            max_students || 40
        ], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
            console.log('✅ Section created:', section_name, grade_level);
            res.status(201).json({ 
                success: true, 
                message: 'Section created successfully!',
                id: result.insertId 
            });
        });
    });
});

// =============================================
// 37. SECTIONS - Update Section
// =============================================
app.put('/api/registrar/sections/:id', (req, res) => {
    const { id } = req.params;
    const { section_name, grade_level, adviser_id, school_year, max_students, status } = req.body;

    const checkQuery = `SELECT id FROM sections WHERE id = ?`;
    db.query(checkQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Section not found' });
        }

        const updateQuery = `
            UPDATE sections 
            SET section_name = ?, grade_level = ?, adviser_id = ?, 
                school_year = ?, max_students = ?, status = ?
            WHERE id = ?
        `;

        db.query(updateQuery, [
            section_name, grade_level, adviser_id || null,
            school_year, max_students || 40, status || 'active', id
        ], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            console.log('✅ Section updated:', id);
            res.json({ success: true, message: 'Section updated successfully!' });
        });
    });
});

// =============================================
// 38. SECTIONS - Delete Section
// =============================================
app.delete('/api/registrar/sections/:id', (req, res) => {
    const { id } = req.params;

    const checkQuery = `SELECT COUNT(*) as count FROM student_enrollments WHERE section_id = ?`;
    db.query(checkQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results[0].count > 0) {
            return res.status(400).json({ 
                error: `Cannot delete section. May ${results[0].count} student(s) assigned.` 
            });
        }

        const deleteQuery = `DELETE FROM sections WHERE id = ?`;
        db.query(deleteQuery, [id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Section not found' });
            }
            
            console.log('✅ Section deleted:', id);
            res.json({ success: true, message: 'Section deleted successfully!' });
        });
    });
});

// =============================================
// 39. SUBJECTS - Get All Subjects
// =============================================
app.get('/api/registrar/subjects', (req, res) => {
    console.log('📚 Fetching all subjects');
    
    const query = `
        SELECT id, subject_name, grade_level, description, status, created_by, created_at, updated_at
        FROM subjects
        WHERE status = 'active'
        ORDER BY grade_level, subject_name
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Error fetching subjects:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// =============================================
// 40. SUBJECTS - Get Subjects by Grade Level
// =============================================
app.get('/api/registrar/subjects/grade/:gradeLevel', (req, res) => {
    const { gradeLevel } = req.params;
    
    const query = `
        SELECT id, subject_name, grade_level, description, status
        FROM subjects
        WHERE grade_level = ? AND status = 'active'
        ORDER BY subject_name
    `;

    db.query(query, [gradeLevel], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 41. SUBJECTS - Create New Subject
// =============================================
app.post('/api/registrar/subjects', (req, res) => {
    const { subject_name, grade_level, description, created_by } = req.body;

    if (!subject_name || !grade_level) {
        return res.status(400).json({ error: 'Subject name and grade level are required' });
    }

    const checkQuery = `SELECT id FROM subjects WHERE subject_name = ? AND grade_level = ?`;
    db.query(checkQuery, [subject_name, grade_level], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length > 0) {
            return res.status(400).json({ error: 'Subject already exists for this grade level' });
        }

        const insertQuery = `
            INSERT INTO subjects (subject_name, grade_level, description, created_by)
            VALUES (?, ?, ?, ?)
        `;

        db.query(insertQuery, [
            subject_name, 
            grade_level, 
            description || null, 
            created_by || null
        ], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
            console.log('✅ Subject created:', subject_name, grade_level);
            res.status(201).json({ 
                success: true, 
                message: 'Subject created successfully!',
                id: result.insertId 
            });
        });
    });
});

// =============================================
// 42. SUBJECTS - Update Subject
// =============================================
app.put('/api/registrar/subjects/:id', (req, res) => {
    const { id } = req.params;
    const { subject_name, grade_level, description, status } = req.body;

    const checkQuery = `SELECT id FROM subjects WHERE id = ?`;
    db.query(checkQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Subject not found' });
        }

        const updateQuery = `
            UPDATE subjects 
            SET subject_name = ?, grade_level = ?, description = ?, status = ?
            WHERE id = ?
        `;

        db.query(updateQuery, [
            subject_name, grade_level, description || null, 
            status || 'active', id
        ], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            console.log('✅ Subject updated:', id);
            res.json({ success: true, message: 'Subject updated successfully!' });
        });
    });
});

// =============================================
// 43. SUBJECTS - Delete Subject
// =============================================
app.delete('/api/registrar/subjects/:id', (req, res) => {
    const { id } = req.params;

    const checkQuery = `SELECT COUNT(*) as count FROM grades WHERE subject_id = ?`;
    db.query(checkQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results[0].count > 0) {
            const softDeleteQuery = `UPDATE subjects SET status = 'inactive' WHERE id = ?`;
            db.query(softDeleteQuery, [id], (err) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json({ 
                    success: true, 
                    message: 'Subject has grades. Set to inactive instead of deleting.' 
                });
            });
        } else {
            const deleteQuery = `DELETE FROM subjects WHERE id = ?`;
            db.query(deleteQuery, [id], (err, result) => {
                if (err) return res.status(500).json({ error: err.message });
                
                if (result.affectedRows === 0) {
                    return res.status(404).json({ error: 'Subject not found' });
                }
                
                console.log('✅ Subject deleted:', id);
                res.json({ success: true, message: 'Subject deleted successfully!' });
            });
        }
    });
});

// =============================================
// 44. ENROLLMENTS - Get All Enrollments
// =============================================
app.get('/api/registrar/enrollments', (req, res) => {
    console.log('📋 Fetching all enrollments');
    
    const query = `
        SELECT 
            e.id,
            e.student_id,
            e.grade_level,
            e.section_id,
            e.school_year,
            e.semester,
            e.status,
            e.remarks,
            e.enrolled_at,
            e.completed_at,
            s.student_id as public_id,
            s.first_name,
            s.middle_name,
            s.last_name,
            sec.section_name
        FROM student_enrollments e
        JOIN students s ON e.student_id = s.id
        LEFT JOIN sections sec ON e.section_id = sec.id
        ORDER BY e.enrolled_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error('❌ Error fetching enrollments:', err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

// =============================================
// 45. ENROLLMENTS - Get by Student ID
// =============================================
app.get('/api/registrar/enrollments/student/:studentId', (req, res) => {
    const { studentId } = req.params;
    
    const query = `
        SELECT 
            e.id,
            e.grade_level,
            e.section_id,
            e.school_year,
            e.semester,
            e.status,
            e.remarks,
            e.enrolled_at,
            e.completed_at,
            sec.section_name,
            sec.grade_level as section_grade
        FROM student_enrollments e
        LEFT JOIN sections sec ON e.section_id = sec.id
        WHERE e.student_id = ?
        ORDER BY e.school_year DESC, e.semester DESC
    `;

    db.query(query, [studentId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 46. ENROLLMENTS - Create New Enrollment ✅ AUTO-UPDATE STUDENT
// =============================================
app.post('/api/registrar/enrollments', (req, res) => {
    const { student_id, grade_level, section_id, school_year, semester, remarks } = req.body;

    if (!student_id || !grade_level || !school_year) {
        return res.status(400).json({ error: 'Student ID, grade level, and school year are required' });
    }

    const finalSemester = semester || 'Full Year';

    const checkQuery = `
        SELECT id FROM student_enrollments 
        WHERE student_id = ? AND school_year = ?
    `;
    db.query(checkQuery, [student_id, school_year], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (results.length > 0) {
            return res.status(400).json({ error: 'Student already enrolled for this school year' });
        }

        const insertQuery = `
            INSERT INTO student_enrollments 
            (student_id, grade_level, section_id, school_year, semester, status, remarks)
            VALUES (?, ?, ?, ?, ?, 'enrolled', ?)
        `;

        db.query(insertQuery, [
            student_id, grade_level, section_id || null, 
            school_year, finalSemester, remarks || null
        ], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (section_id) {
                db.query(
                    'UPDATE sections SET current_students = current_students + 1 WHERE id = ?',
                    [section_id]
                );
            }

            // ✅ AUTO-UPDATE: Update students.current_grade_level + current_section
            const sectionSubquery = section_id
                ? `(SELECT section_name FROM sections WHERE id = ${parseInt(section_id)})`
                : 'NULL';
            
            db.query(
                `UPDATE students 
                 SET current_grade_level = ?, 
                     current_section = ${sectionSubquery},
                     school_year_started = COALESCE(school_year_started, ?)
                 WHERE id = ?`,
                [grade_level, school_year, student_id],
                (err) => {
                    if (err) console.error('⚠️ Failed to update student current_grade_level:', err);
                    else console.log('✅ Auto-updated student.current_grade_level to', grade_level);
                }
            );
            
            console.log('✅ Enrollment created:', result.insertId);
            res.status(201).json({ 
                success: true, 
                message: 'Student enrolled successfully!',
                id: result.insertId 
            });
        });
    });
});

// =============================================
// 47. ENROLLMENTS - Update Enrollment ✅ AUTO-UPDATE STUDENT
// =============================================
app.put('/api/registrar/enrollments/:id', (req, res) => {
    const { id } = req.params;
    const { grade_level, section_id, school_year, semester, status, remarks } = req.body;

    const checkQuery = `SELECT id, student_id FROM student_enrollments WHERE id = ?`;
    db.query(checkQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }

        const studentId = results[0].student_id;
        const finalSemester = semester || 'Full Year';

        const updateQuery = `
            UPDATE student_enrollments 
            SET grade_level = ?, section_id = ?, school_year = ?, 
                semester = ?, status = ?, remarks = ?,
                completed_at = CASE WHEN ? IN ('passed', 'failed', 'dropped', 'transferred', 'graduated') 
                                    THEN NOW() ELSE completed_at END
            WHERE id = ?
        `;

        db.query(updateQuery, [
            grade_level, section_id || null, school_year, 
            finalSemester, status || 'enrolled', remarks || null,
            status, id
        ], (err) => {
            if (err) return res.status(500).json({ error: err.message });

            // ✅ AUTO-UPDATE: Kung status = 'enrolled', i-update ang students.current_grade_level
            if (status === 'enrolled') {
                const sectionSubquery = section_id
                    ? `(SELECT section_name FROM sections WHERE id = ${parseInt(section_id)})`
                    : 'NULL';
                
                db.query(
                    `UPDATE students 
                     SET current_grade_level = ?, 
                         current_section = ${sectionSubquery}
                     WHERE id = ?`,
                    [grade_level, studentId],
                    (err) => {
                        if (err) console.error('⚠️ Failed to update student grade:', err);
                        else console.log('✅ Auto-updated student.current_grade_level to', grade_level);
                    }
                );
            }
            
            console.log('✅ Enrollment updated:', id);
            res.json({ success: true, message: 'Enrollment updated successfully!' });
        });
    });
});

// =============================================
// 48. ENROLLMENTS - Delete Enrollment
// =============================================
app.delete('/api/registrar/enrollments/:id', (req, res) => {
    const { id } = req.params;

    const getQuery = `SELECT section_id FROM student_enrollments WHERE id = ?`;
    db.query(getQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Enrollment not found' });
        }

        const sectionId = results[0].section_id;

        const deleteQuery = `DELETE FROM student_enrollments WHERE id = ?`;
        db.query(deleteQuery, [id], (err, result) => {
            if (err) return res.status(500).json({ error: err.message });
            
            if (sectionId) {
                db.query(
                    'UPDATE sections SET current_students = GREATEST(current_students - 1, 0) WHERE id = ?',
                    [sectionId]
                );
            }
            
            console.log('✅ Enrollment deleted:', id);
            res.json({ success: true, message: 'Enrollment deleted successfully!' });
        });
    });
});

// =============================================
// 48b. ENROLLMENTS - Get Eligibility for Next Grade
// =============================================
app.get('/api/registrar/enrollment-eligibility/:studentId', (req, res) => {
    const { studentId } = req.params;

    // Step 1: Get student info
    const studentQuery = `SELECT id, student_id, first_name, middle_name, last_name, current_grade_level, enrollment_status FROM students WHERE id = ?`;
    
    db.query(studentQuery, [studentId], (err, studentResults) => {
        if (err) return res.status(500).json({ error: err.message });
        if (studentResults.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const student = studentResults[0];

        // Step 2: Get all enrollments ordered by school year
        const enrollQuery = `
            SELECT e.id, e.grade_level, e.school_year, e.semester, e.status, e.completed_at,
                   sec.section_name
            FROM student_enrollments e
            LEFT JOIN sections sec ON e.section_id = sec.id
            WHERE e.student_id = ?
            ORDER BY e.school_year DESC, e.enrolled_at DESC
        `;

        db.query(enrollQuery, [studentId], (err, enrollments) => {
            if (err) return res.status(500).json({ error: err.message });

            // Step 3: Get the latest enrollment (current/most recent)
            const latestEnrollment = enrollments.length > 0 ? enrollments[0] : null;

            // Step 4: If no enrollment, return "new student" status
            if (!latestEnrollment) {
                return res.json({
                    student: student,
                    latestEnrollment: null,
                    grades: [],
                    average: 0,
                    eligibility: 'NEW_STUDENT',
                    nextGradeLevel: student.current_grade_level || 'Grade 1',
                    suggestedAction: 'ENROLL',
                    message: 'Wala pay enrollment record. Pwede i-enroll.'
                });
            }

            // Step 5: Get grades for the latest enrollment
            const gradesQuery = `
                SELECT id, subject, grade, quarter, remarks
                FROM grades
                WHERE enrollment_id = ?
                ORDER BY subject, quarter
            `;

            db.query(gradesQuery, [latestEnrollment.id], (err, grades) => {
                if (err) return res.status(500).json({ error: err.message });

                // Step 6: Calculate average
                let average = 0;
                if (grades.length > 0) {
                    const sum = grades.reduce((acc, g) => acc + parseFloat(g.grade || 0), 0);
                    average = parseFloat((sum / grades.length).toFixed(2));
                }

                // Step 7: Determine eligibility
                const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
                const currentIdx = gradeLevels.indexOf(latestEnrollment.grade_level);
                const isGrade6 = latestEnrollment.grade_level === 'Grade 6';

                let eligibility = 'PENDING';
                let nextGradeLevel = null;
                let suggestedAction = 'ENROLL';
                let message = '';

                // Priority 1: Check enrollment status first (manual override)
                if (latestEnrollment.status === 'passed') {
                    if (isGrade6) {
                        eligibility = 'GRADUATED';
                        nextGradeLevel = null;
                        suggestedAction = 'GRADUATE';
                        message = '✅ Grade 6 passed — Graduate na siya! Dili na ma-enroll sa higher grade.';
                    } else {
                        eligibility = 'ELIGIBLE';
                        nextGradeLevel = gradeLevels[currentIdx + 1] || null;
                        suggestedAction = 'ENROLL';
                        message = `✅ Passed sa ${latestEnrollment.grade_level} — pwede i-enroll sa ${nextGradeLevel}.`;
                    }
                } else if (latestEnrollment.status === 'failed') {
                    eligibility = 'RETAINED';
                    nextGradeLevel = latestEnrollment.grade_level; // same grade
                    suggestedAction = 'ENROLL';
                    message = `⚠️ Failed sa ${latestEnrollment.grade_level} — kailangan i-retain (same grade) o i-review.`;
                } else if (latestEnrollment.status === 'enrolled') {
                    eligibility = 'CURRENTLY_ENROLLED';
                    nextGradeLevel = latestEnrollment.grade_level;
                    suggestedAction = 'VIEW';
                    message = `ℹ️ Currently enrolled sa ${latestEnrollment.grade_level} (${latestEnrollment.school_year}).`;
                } else if (latestEnrollment.status === 'dropped' || latestEnrollment.status === 'transferred') {
                    eligibility = 'NOT_ELIGIBLE';
                    nextGradeLevel = latestEnrollment.grade_level;
                    suggestedAction = 'REVIEW';
                    message = `⚠️ Status: ${latestEnrollment.status}. Kinahanglan i-review sa admin.`;
                } else if (latestEnrollment.status === 'graduated') {
                    eligibility = 'GRADUATED';
                    nextGradeLevel = null;
                    suggestedAction = 'GRADUATE';
                    message = '🎓 Graduated na siya. Dili na ma-enroll.';
                } else {
                    // Fallback: base sa average grades
                    if (average >= 75) {
                        eligibility = 'ELIGIBLE';
                        nextGradeLevel = isGrade6 ? null : gradeLevels[currentIdx + 1];
                        suggestedAction = isGrade6 ? 'GRADUATE' : 'ENROLL';
                        message = `✅ Average ${average} (≥75) — pwede i-enroll sa ${nextGradeLevel || 'graduate'}.`;
                    } else {
                        eligibility = 'RETAINED';
                        nextGradeLevel = latestEnrollment.grade_level;
                        suggestedAction = 'ENROLL';
                        message = `⚠️ Average ${average} (<75) — kailangan i-retain.`;
                    }
                }

                res.json({
                    student: student,
                    latestEnrollment: latestEnrollment,
                    grades: grades,
                    average: average,
                    eligibility: eligibility,
                    nextGradeLevel: nextGradeLevel,
                    suggestedAction: suggestedAction,
                    message: message
                });
            });
        });
    });
});

// =============================================
// 49. GRADES - Get Grades by Enrollment
// =============================================
app.get('/api/registrar/grades/enrollment/:enrollmentId', (req, res) => {
    const { enrollmentId } = req.params;
    
    const query = `
        SELECT 
            g.id,
            g.student_id,
            g.enrollment_id,
            g.subject,
            g.grade,
            g.remarks,
            g.quarter,
            g.semester,
            g.teacher_id,
            g.created_at,
            g.updated_at
        FROM grades g
        WHERE g.enrollment_id = ?
        ORDER BY g.subject, g.quarter
    `;

    db.query(query, [enrollmentId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 50. GRADES - Get Grades by Student
// =============================================
app.get('/api/registrar/grades/student/:studentId', (req, res) => {
    const { studentId } = req.params;
    
    const query = `
        SELECT 
            g.id,
            g.subject,
            g.grade,
            g.remarks,
            g.quarter,
            g.semester,
            e.grade_level,
            e.school_year
        FROM grades g
        JOIN student_enrollments e ON g.enrollment_id = e.id
        WHERE g.student_id = ?
        ORDER BY e.school_year DESC, g.subject
    `;

    db.query(query, [studentId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 51. GRADES - Add New Grade
// =============================================
app.post('/api/registrar/grades', (req, res) => {
    const { 
        student_id, enrollment_id, subject, 
        grade, remarks, quarter, semester, teacher_id 
    } = req.body;

    if (!student_id || !enrollment_id || !subject || grade === undefined) {
        return res.status(400).json({ 
            error: 'Student ID, enrollment ID, subject, and grade are required' 
        });
    }

    const insertQuery = `
        INSERT INTO grades 
        (student_id, enrollment_id, subject, grade, remarks, quarter, semester, teacher_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(insertQuery, [
        student_id, enrollment_id, subject,
        grade, remarks || null, quarter || null, semester || null, teacher_id || null
    ], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        console.log('✅ Grade added:', result.insertId);
        res.status(201).json({ 
            success: true, 
            message: 'Grade added successfully!',
            id: result.insertId 
        });
    });
});

// =============================================
// 52. GRADES - Update Grade
// =============================================
app.put('/api/registrar/grades/:id', (req, res) => {
    const { id } = req.params;
    const { grade, remarks, quarter, semester, teacher_id } = req.body;

    const checkQuery = `SELECT id FROM grades WHERE id = ?`;
    db.query(checkQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Grade not found' });
        }

        const updateQuery = `
            UPDATE grades 
            SET grade = ?, remarks = ?, quarter = ?, semester = ?, teacher_id = ?
            WHERE id = ?
        `;

        db.query(updateQuery, [
            grade, remarks || null, quarter || null, semester || null, teacher_id || null, id
        ], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            console.log('✅ Grade updated:', id);
            res.json({ success: true, message: 'Grade updated successfully!' });
        });
    });
});

// =============================================
// 53. GRADES - Delete Grade
// =============================================
app.delete('/api/registrar/grades/:id', (req, res) => {
    const { id } = req.params;

    const deleteQuery = `DELETE FROM grades WHERE id = ?`;
    db.query(deleteQuery, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Grade not found' });
        }
        
        console.log('✅ Grade deleted:', id);
        res.json({ success: true, message: 'Grade deleted successfully!' });
    });
});

// =============================================
// 54. REMARKS - Get All Remarks by Student
// =============================================
app.get('/api/registrar/remarks/student/:studentId', (req, res) => {
    const { studentId } = req.params;
    
    const query = `
        SELECT 
            r.id,
            r.student_id,
            r.enrollment_id,
            r.remark_type,
            r.remark,
            r.created_by,
            r.created_by_role,
            r.created_at,
            e.grade_level,
            e.school_year,
            e.semester
        FROM student_remarks r
        LEFT JOIN student_enrollments e ON r.enrollment_id = e.id
        WHERE r.student_id = ?
        ORDER BY r.created_at DESC
    `;

    db.query(query, [studentId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 55. REMARKS - Add New Remark
// =============================================
app.post('/api/registrar/remarks', (req, res) => {
    const { 
        student_id, enrollment_id, remark_type, 
        remark, created_by, created_by_role 
    } = req.body;

    if (!student_id || !remark) {
        return res.status(400).json({ 
            error: 'Student ID and remark are required' 
        });
    }

    const insertQuery = `
        INSERT INTO student_remarks 
        (student_id, enrollment_id, remark_type, remark, created_by, created_by_role)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(insertQuery, [
        student_id, 
        enrollment_id || null, 
        remark_type || 'general', 
        remark, 
        created_by || null,
        created_by_role || 'registrar'
    ], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        console.log('✅ Remark added:', result.insertId);
        res.status(201).json({ 
            success: true, 
            message: 'Remark added successfully!',
            id: result.insertId 
        });
    });
});

// =============================================
// 56. REMARKS - Delete Remark
// =============================================
app.delete('/api/registrar/remarks/:id', (req, res) => {
    const { id } = req.params;

    const deleteQuery = `DELETE FROM student_remarks WHERE id = ?`;
    db.query(deleteQuery, [id], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Remark not found' });
        }
        
        console.log('✅ Remark deleted:', id);
        res.json({ success: true, message: 'Remark deleted successfully!' });
    });
});

// =============================================
// 57. REPORTS - Students by Grade Level ✅ FIXED (No duplicates)
// =============================================
app.get('/api/admin/reports/students-by-grade', (req, res) => {
    const query = `
        SELECT 
            s.id as student_id,
            s.student_id as public_id,
            s.first_name,
            s.middle_name,
            s.last_name,
            s.current_grade_level,
            s.current_section,
            s.enrollment_status
        FROM students s
        WHERE s.current_grade_level IS NOT NULL
        AND s.student_id IS NOT NULL
        ORDER BY s.current_grade_level, s.last_name, s.first_name
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        
        const grouped = {};
        results.forEach(student => {
            const grade = student.current_grade_level || 'Unassigned';
            if (!grouped[grade]) grouped[grade] = [];
            grouped[grade].push(student);
        });
        
        res.json(grouped);
    });
});

// =============================================
// 58. REPORTS - Students by Section
// =============================================
app.get('/api/admin/reports/students-by-section', (req, res) => {
    const query = `
        SELECT 
            sec.id as section_id,
            sec.section_name,
            sec.grade_level,
            sec.school_year,
            sec.current_students,
            sec.max_students,
            COUNT(e.id) as enrolled_count
        FROM sections sec
        LEFT JOIN student_enrollments e ON e.section_id = sec.id AND e.status = 'enrolled'
        GROUP BY sec.id
        ORDER BY sec.grade_level, sec.section_name
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 59. REPORTS - Students by Status
// =============================================
app.get('/api/admin/reports/students-by-status', (req, res) => {
    const query = `
        SELECT 
            enrollment_status,
            COUNT(*) as count
        FROM students
        WHERE enrollment_status IS NOT NULL
        GROUP BY enrollment_status
        ORDER BY count DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 60. REPORTS - Failing Students
// =============================================
app.get('/api/admin/reports/failing-students', (req, res) => {
    const query = `
        SELECT 
            s.id as student_id,
            s.student_id as public_id,
            s.first_name,
            s.middle_name,
            s.last_name,
            s.current_grade_level,
            s.current_section,
            AVG(g.grade) as average_grade,
            COUNT(g.id) as total_subjects
        FROM students s
        JOIN grades g ON s.id = g.student_id
        WHERE g.grade < 75
        GROUP BY s.id
        HAVING AVG(g.grade) < 75
        ORDER BY average_grade ASC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 61. REPORTS - Promotion Candidates
// =============================================
app.get('/api/admin/reports/promotion-list', (req, res) => {
    const query = `
        SELECT 
            s.id as student_id,
            s.student_id as public_id,
            s.first_name,
            s.middle_name,
            s.last_name,
            s.current_grade_level,
            s.current_section,
            e.school_year,
            e.semester,
            AVG(g.grade) as average_grade,
            CASE 
                WHEN AVG(g.grade) >= 75 THEN 'PASSED'
                ELSE 'FAILED'
            END as promotion_status
        FROM students s
        JOIN student_enrollments e ON s.id = e.student_id
        LEFT JOIN grades g ON e.id = g.enrollment_id
        WHERE e.status = 'enrolled'
        GROUP BY s.id, e.id
        ORDER BY average_grade DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 62. REPORTS - Full Student Academic History
// =============================================
app.get('/api/admin/reports/student-history/:studentId', (req, res) => {
    const { studentId } = req.params;

    const studentQuery = `
        SELECT id, student_id as public_id, first_name, middle_name, last_name,
               birth_date, gender, address, contact_number, email,
               current_grade_level, current_section, enrollment_status
        FROM students WHERE id = ?
    `;

    db.query(studentQuery, [studentId], (err, studentResults) => {
        if (err) return res.status(500).json({ error: err.message });
        if (studentResults.length === 0) {
            return res.status(404).json({ error: 'Student not found' });
        }

        const student = studentResults[0];

        const enrollmentsQuery = `
            SELECT 
                e.id,
                e.grade_level,
                e.section_id,
                e.school_year,
                e.semester,
                e.status,
                e.remarks,
                e.enrolled_at,
                e.completed_at,
                sec.section_name
            FROM student_enrollments e
            LEFT JOIN sections sec ON e.section_id = sec.id
            WHERE e.student_id = ?
            ORDER BY e.school_year ASC
        `;

        db.query(enrollmentsQuery, [studentId], (err, enrollments) => {
            if (err) return res.status(500).json({ error: err.message });

            const gradesQuery = `
                SELECT 
                    g.id,
                    g.subject,
                    g.grade,
                    g.remarks,
                    g.quarter,
                    g.semester,
                    g.enrollment_id
                FROM grades g
                WHERE g.student_id = ?
                ORDER BY g.enrollment_id ASC, g.subject
            `;

            db.query(gradesQuery, [studentId], (err, grades) => {
                if (err) return res.status(500).json({ error: err.message });

                const remarksQuery = `
                    SELECT id, remark_type, remark, created_by_role, created_at
                    FROM student_remarks
                    WHERE student_id = ?
                    ORDER BY created_at DESC
                `;

                db.query(remarksQuery, [studentId], (err, remarks) => {
                    if (err) return res.status(500).json({ error: err.message });

                    res.json({
                        student: student,
                        enrollments: enrollments,
                        grades: grades,
                        remarks: remarks
                    });
                });
            });
        });
    });
});

// =============================================
// 63. REPORTS - Summary Dashboard Stats
// =============================================
app.get('/api/admin/reports/summary', (req, res) => {
    const query = `
        SELECT 
            (SELECT COUNT(*) FROM students WHERE enrollment_status = 'active') as active_students,
            (SELECT COUNT(*) FROM students WHERE enrollment_status = 'graduated') as graduated_students,
            (SELECT COUNT(*) FROM students WHERE enrollment_status = 'failed') as failed_students,
            (SELECT COUNT(*) FROM students WHERE enrollment_status = 'dropped') as dropped_students,
            (SELECT COUNT(*) FROM sections WHERE status = 'active') as total_sections,
            (SELECT COUNT(*) FROM subjects WHERE status = 'active') as total_subjects,
            (SELECT COUNT(*) FROM student_enrollments WHERE status = 'enrolled') as current_enrollments
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

// =============================================
// START SERVER
// =============================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📧 Email service: Disabled`);
    console.log(`📁 Upload directory: ${uploadDir}`);
    console.log(`📊 Using separate tables: students, admins, registrars`);
    console.log(`⚙️  Settings enabled`);
});