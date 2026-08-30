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
    database: process.env.DB_NAME || 'ncdc_enrollment_v2'
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
        fileSize: 2 * 1024 * 1024 // 2MB limit
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

// Generate Username (firstname.lastname)
const generateUsername = (firstName, lastName) => {
    const base = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
    return base.replace(/[^a-z0-9.]/g, '');
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

        const emailCheckQuery = `SELECT id FROM students WHERE email = ?`;
        db.query(emailCheckQuery, [email], (err, results) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            
            if (results.length > 0) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            const studentQuery = `
                INSERT INTO students (
                    first_name, middle_name, last_name, suffix,
                    birth_date, gender, address, contact_number, email,
                    father_name, father_occupation, father_contact,
                    mother_name, mother_occupation, mother_contact,
                    guardian_name, guardian_contact
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const studentValues = [
                firstName, middleName || null, lastName, suffix || null,
                birthDate, gender, address, contactNumber || null, email,
                fatherName || null, fatherOccupation || null, fatherContact || null,
                motherName || null, motherOccupation || null, motherContact || null,
                guardianName || null, guardianContact || null
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
                        studentId: studentId
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
// 2. REGISTRAR - Get Pending Applications
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
// 3. REGISTRAR - Get Single Application Details
// =============================================
app.get('/api/registrar/application/:id', (req, res) => {
    const applicationId = req.params.id;
    
    const query = `
        SELECT 
            a.*,
            s.*,
            u.username as registrar_name
        FROM applications a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN users u ON a.registrar_id = u.id
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
// 4. REGISTRAR - Approve Application
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
// 5. REGISTRAR - Decline Application
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
// 6. ADMIN - Get Approved Applications
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
            u.username as registrar_name
        FROM applications a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN users u ON a.registrar_id = u.id
        WHERE a.status = 'approved'
        ORDER BY a.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 7. ADMIN - Confirm Enrollment (FINAL)
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
            
            const username = `${student.first_name.toLowerCase()}.${student.last_name.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
            console.log('✅ Username:', username);
            
            const defaultPassword = studentId.replace('NCDC-', '');
            console.log('✅ Password:', defaultPassword);
            
            const hashedPassword = await bcrypt.hash(defaultPassword, 10);

            await new Promise((resolve, reject) => {
                db.query(
                    'UPDATE students SET student_id = ? WHERE id = ?',
                    [studentId, student.id],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            console.log('✅ Student updated');

            await new Promise((resolve, reject) => {
                db.query(
                    `INSERT INTO users (student_id, student_number, username, password, email, role, is_first_login) 
                     VALUES (?, ?, ?, ?, ?, 'student', TRUE)`,
                    [student.id, studentId, username, hashedPassword, student.email],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
            console.log('✅ User created with student_number:', studentId);

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
                    username: username,
                    password: defaultPassword,
                    email: student.email
                }
            });

        });
    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// =============================================
// 8. ADMIN - Reject Application
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
// 9. ADMIN - Get All Applications
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
            u1.username as registrar_name,
            u2.username as admin_name
        FROM applications a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN users u1 ON a.registrar_id = u1.id
        LEFT JOIN users u2 ON a.admin_id = u2.id
        ORDER BY a.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 10. ADMIN - Get Rejected Applications
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
            u.username as admin_name
        FROM applications a
        JOIN students s ON a.student_id = s.id
        LEFT JOIN users u ON a.admin_id = u.id
        WHERE a.status = 'rejected'
        ORDER BY a.created_at DESC
    `;

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// =============================================
// 11. ADMIN - Registrar Management
// =============================================
app.get('/api/admin/registrars', (req, res) => {
    const query = `
        SELECT id, employee_id, first_name, last_name, username, email, role, created_at
        FROM users 
        WHERE role = 'registrar'
        ORDER BY id DESC
    `;
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.post('/api/admin/registrars', async (req, res) => {
    const { employeeId, firstName, lastName, username, email, password } = req.body;

    if (!employeeId || !firstName || !lastName || !username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const checkEmpQuery = `SELECT id FROM users WHERE employee_id = ?`;
    db.query(checkEmpQuery, [employeeId], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length > 0) {
            return res.status(400).json({ error: 'Employee ID already exists' });
        }

        const checkUserQuery = `SELECT id FROM users WHERE username = ?`;
        db.query(checkUserQuery, [username], async (err, results) => {
            if (err) return res.status(500).json({ error: err.message });
            if (results.length > 0) {
                return res.status(400).json({ error: 'Username already exists' });
            }

            const checkEmailQuery = `SELECT id FROM users WHERE email = ?`;
            db.query(checkEmailQuery, [email], async (err, results) => {
                if (err) return res.status(500).json({ error: err.message });
                if (results.length > 0) {
                    return res.status(400).json({ error: 'Email already exists' });
                }

                const hashedPassword = await bcrypt.hash(password, 10);

                const insertQuery = `
                    INSERT INTO users (employee_id, first_name, last_name, username, password, email, role, is_first_login)
                    VALUES (?, ?, ?, ?, ?, ?, 'registrar', TRUE)
                `;

                db.query(insertQuery, [employeeId, firstName, lastName, username, hashedPassword, email], (err, result) => {
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
    const { employeeId, firstName, lastName, username, email } = req.body;

    const checkQuery = `SELECT id FROM users WHERE id = ? AND role = 'registrar'`;
    db.query(checkQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Registrar not found' });
        }

        const updateQuery = `
            UPDATE users 
            SET employee_id = ?, first_name = ?, last_name = ?, username = ?, email = ?
            WHERE id = ?
        `;

        db.query(updateQuery, [employeeId, firstName, lastName, username, email, id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Registrar updated successfully' });
        });
    });
});

app.delete('/api/admin/registrars/:id', (req, res) => {
    const id = req.params.id;

    const checkQuery = `SELECT id, username FROM users WHERE id = ? AND role = 'registrar'`;
    db.query(checkQuery, [id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Registrar not found' });
        }

        const deleteQuery = `DELETE FROM users WHERE id = ? AND role = 'registrar'`;
        db.query(deleteQuery, [id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true, message: 'Registrar deleted successfully' });
        });
    });
});

// =============================================
// 12. LOGIN
// =============================================
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    const query = `
        SELECT u.*, s.first_name, s.last_name, s.student_id 
        FROM users u
        LEFT JOIN students s ON u.student_id = s.id
        WHERE u.username = ?
    `;

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

        const updateQuery = `UPDATE users SET last_login = NOW() WHERE id = ?`;
        db.query(updateQuery, [user.id]);

        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET || 'my_secret_key',
            { expiresIn: '7d' }
        );

        let studentId = null;
        let studentNumber = null;

        if (user.role === 'student' && user.student_id) {
            studentId = user.student_id;
            studentNumber = user.student_number;
        }

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                firstName: user.first_name,
                lastName: user.last_name,
                studentId: studentId,
                studentNumber: studentNumber,
                isFirstLogin: user.is_first_login === 1
            }
        });
    });
});

// =============================================
// 13. CHANGE PASSWORD
// =============================================
app.post('/api/change-password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    const query = `SELECT * FROM users WHERE id = ?`;
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

        const updateQuery = `UPDATE users SET password = ?, is_first_login = FALSE WHERE id = ?`;
        db.query(updateQuery, [hashedPassword, userId], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            
            res.json({ success: true, message: 'Password changed successfully!' });
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

    const query = `SELECT * FROM users WHERE id = ?`;
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

        const updateQuery = `UPDATE users SET password = ?, is_first_login = FALSE WHERE id = ?`;
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
        res.json({ success: true, message: 'Profile picture updated successfully!' });
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
        SELECT s.id, s.email, s.first_name, s.last_name, u.id as user_id, u.username
        FROM students s
        JOIN users u ON u.student_id = s.id
        WHERE s.email = ?
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
            u.id as user_id
        FROM password_reset_requests pr
        JOIN students s ON pr.student_id = s.id
        JOIN users u ON u.student_id = s.id
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
    const { userId, studentId, requestId } = req.body;

    if (!userId && !studentId) {
        return res.status(400).json({ error: 'User ID or Student ID is required' });
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    let query = '';
    let params = [];

    if (userId) {
        query = 'UPDATE users SET password = ?, is_first_login = TRUE WHERE id = ?';
        params = [hashedPassword, userId];
    } else if (studentId) {
        query = `
            UPDATE users u
            JOIN students s ON u.student_id = s.id
            SET u.password = ?, u.is_first_login = TRUE
            WHERE s.id = ?
        `;
        params = [hashedPassword, studentId];
    }

    db.query(query, params, (err) => {
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
// 24. ADMIN - Delete User Account
// =============================================
app.delete('/api/admin/user/:studentId', (req, res) => {
    const studentId = req.params.studentId;

    const query = `DELETE FROM users WHERE student_id = ?`;
    db.query(query, [studentId], (err, result) => {
        if (err) {
            console.error('❌ Error deleting user:', err);
            return res.status(500).json({ error: err.message });
        }
        
        res.json({ success: true, message: 'User deleted successfully!' });
    });
});

// =============================================
// 25. ADMIN - Get Profile
// =============================================
app.get('/api/admin/profile/:id', (req, res) => {
    const userId = req.params.id;

    const query = `
        SELECT id, employee_id, first_name, last_name, username, email, role, profile_pic, created_at
        FROM users 
        WHERE id = ? AND role = 'admin'
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
// 26. ADMIN - Update Profile
// =============================================
app.put('/api/admin/profile/:id', profileUpload.single('profile_pic'), (req, res) => {
    const userId = req.params.id;
    const { first_name, last_name, email, employee_id } = req.body;
    const profilePic = req.file ? req.file.filename : null;

    const checkQuery = `SELECT id FROM users WHERE id = ? AND role = 'admin'`;
    db.query(checkQuery, [userId], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) {
            return res.status(404).json({ error: 'Admin not found' });
        }

        let query = `
            UPDATE users 
            SET first_name = ?, last_name = ?, email = ?, employee_id = ?
        `;
        let params = [first_name, last_name, email, employee_id];

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
// 27. REGISTRAR - Get Profile
// =============================================
app.get('/api/registrar/profile/:id', (req, res) => {
    const userId = req.params.id;

    const query = `
        SELECT id, employee_id, first_name, last_name, username, email, role, profile_pic, created_at, last_login
        FROM users 
        WHERE id = ? AND role = 'registrar'
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
// 28. REGISTRAR - Update Profile (FIXED - with profile_pic upload)
// =============================================
app.put('/api/registrar/profile/:id', profileUpload.single('profile_pic'), (req, res) => {
    const userId = req.params.id;
    
    // Get data from req.body (multipart form data)
    const first_name = req.body.first_name;
    const last_name = req.body.last_name;
    const email = req.body.email;
    const employee_id = req.body.employee_id;
    const profilePic = req.file ? req.file.filename : null;

    console.log('📝 Updating registrar profile:');
    console.log('  User ID:', userId);
    console.log('  First Name:', first_name);
    console.log('  Last Name:', last_name);
    console.log('  Email:', email);
    console.log('  Employee ID:', employee_id);
    console.log('  Profile Pic:', profilePic);

    // Validate required fields
    if (!first_name || !last_name || !email) {
        return res.status(400).json({ error: 'First name, last name, and email are required' });
    }

    const checkQuery = `SELECT id FROM users WHERE id = ? AND role = 'registrar'`;
    db.query(checkQuery, [userId], (err, results) => {
        if (err) {
            console.error('❌ Error checking registrar:', err);
            return res.status(500).json({ error: err.message });
        }
        if (results.length === 0) {
            return res.status(404).json({ error: 'Registrar not found' });
        }

        let query = `
            UPDATE users 
            SET first_name = ?, last_name = ?, email = ?, employee_id = ?
        `;
        let params = [first_name, last_name, email, employee_id || null];

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
// START SERVER
// =============================================
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📧 Email service: Disabled`);
    console.log(`📁 Upload directory: ${uploadDir}`);
});

