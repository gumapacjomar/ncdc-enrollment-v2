import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';
import { computeHonorFromGrades } from '../../utils/honors';

const Grades = () => {
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fixing, setFixing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
    const [showResults, setShowResults] = useState(false);

    const [bulkGrades, setBulkGrades] = useState({});
    const [activeColumns, setActiveColumns] = useState(['Term 1', 'Term 2', 'Term 3']);

    const [selectedGradeFilter, setSelectedGradeFilter] = useState('');
    const [gradeStudentList, setGradeStudentList] = useState([]);

    const OLD_QUARTERS = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];
    const NEW_TERMS = ['Term 1', 'Term 2', 'Term 3'];
    const OLD_DISPLAY = ['Q1', 'Q2', 'Q3', 'Q4'];
    const NEW_DISPLAY = ['Term 1', 'Term 2', 'Term 3'];

    const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

    const [profilePic, setProfilePic] = useState(null);
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user || user.role !== 'registrar') {
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        if (user && user.role === 'registrar') {
            fetchProfile();
        }
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await API.get(`/registrar/profile/${user.id}`);
            if (response.data.profile_pic) {
                setProfilePic(`${UPLOADS_URL}/profiles/${response.data.profile_pic}`);
            }
        } catch (error) {
            console.error('Error fetching profile pic:', error);
        }
    };

    useEffect(() => {
        fetchEnrollments();
        fetchAllSubjects();
    }, []);

    const fetchEnrollments = async () => {
        try {
            setLoading(true);
            const res = await API.get('/registrar/enrollments');
            setEnrollments(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch enrollments error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllSubjects = async () => {
        try {
            const res = await API.get('/registrar/subjects');
            setSubjects(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch subjects error:', err);
        }
    };

    const fetchGradesByEnrollment = async (enrollmentId) => {
        try {
            const res = await API.get(`/registrar/grades/enrollment/${enrollmentId}`);
            return Array.isArray(res.data) ? res.data : [];
        } catch (err) {
            console.error('Fetch grades error:', err);
            return [];
        }
    };

    const getAutoRemarks = (gradeValue) => {
        const num = parseFloat(gradeValue);
        if (isNaN(num)) return '';
        if (num >= 95) return 'Excellent';
        if (num >= 90) return 'Outstanding';
        if (num >= 85) return 'Very Good';
        if (num >= 80) return 'Good';
        if (num >= 75) return 'Satisfactory';
        return 'Failed';
    };

    const detectColumns = (existingGrades) => {
        if (!existingGrades || existingGrades.length === 0) {
            return { isOldSystem: false, quarters: NEW_TERMS, displayHeaders: NEW_DISPLAY };
        }

        const hasOldQuarters = existingGrades.some(g => 
            g.quarter && g.quarter.toLowerCase().includes('quarter')
        );

        if (hasOldQuarters) {
            return { isOldSystem: true, quarters: OLD_QUARTERS, displayHeaders: OLD_DISPLAY };
        }

        return { isOldSystem: false, quarters: NEW_TERMS, displayHeaders: NEW_DISPLAY };
    };

    const getUniqueStudents = () => {
        const map = {};
        enrollments.forEach(e => {
            if (e.status === 'enrolled') {
                if (!map[e.student_id]) {
                    map[e.student_id] = {
                        student_id: e.student_id,
                        public_id: e.public_id,
                        first_name: e.first_name,
                        middle_name: e.middle_name,
                        last_name: e.last_name,
                        enrollments: []
                    };
                }
                map[e.student_id].enrollments.push(e);
            }
        });

        return Object.values(map).map(s => {
            s.enrollments.sort((a, b) => {
                const numA = parseInt((a.grade_level || '').replace(/\D/g, '')) || 0;
                const numB = parseInt((b.grade_level || '').replace(/\D/g, '')) || 0;
                return numA - numB;
            });

            const current = s.enrollments[s.enrollments.length - 1];
            s.current_grade_level = current?.grade_level || '';
            s.current_school_year = current?.school_year || '';
            s.current_section = current?.section_name || '';

            return s;
        });
    };

    const uniqueStudents = getUniqueStudents();

    const filteredStudents = uniqueStudents.filter(s => {
        if (!searchTerm.trim()) return true;
        const search = searchTerm.toLowerCase();
        const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
        return fullName.includes(search) || (s.public_id || '').toLowerCase().includes(search);
    });

    const getGradeCount = (gradeLevel) => {
        return uniqueStudents.filter(s => s.current_grade_level === gradeLevel).length;
    };

    const handleGradeFilterClick = (gradeLevel) => {
        if (selectedGradeFilter === gradeLevel) {
            setSelectedGradeFilter('');
            setGradeStudentList([]);
        } else {
            setSelectedGradeFilter(gradeLevel);
            const students = uniqueStudents.filter(s => s.current_grade_level === gradeLevel);
            // Sort by last name
            students.sort((a, b) => (a.last_name || '').localeCompare(b.last_name || ''));
            setGradeStudentList(students);
        }
    };

    const prepareBulkEntries = (student, gradeLevel, existingGrades, columns) => {
        const gradeSubjects = subjects.filter(s => s.grade_level === gradeLevel);
        const bulk = {};

        gradeSubjects.forEach(subject => {
            bulk[subject.subject_name] = {};
            columns.forEach(q => {
                const existing = existingGrades.find(
                    g => g.subject === subject.subject_name && g.quarter === q
                );
                bulk[subject.subject_name][q] = {
                    grade: existing ? existing.grade : '',
                    existing_id: existing ? existing.id : null,
                    enrollment_id: existing?.enrollment_id || null,
                    student_id: student.student_id,
                    subject: subject.subject_name,
                    quarter: q
                };
            });
        });

        setBulkGrades(bulk);
    };

    const handleSelectStudent = async (student) => {
        setSelectedStudent(student);
        setSearchTerm(`${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim());
        setShowResults(false);
        setMessage({ type: '', text: '' });
        setBulkGrades({});

        const currentGrade = student.current_grade_level;
        setSelectedGradeLevel(currentGrade);

        const enrollment = student.enrollments.find(e => e.grade_level === currentGrade);
        if (enrollment) {
            const existing = await fetchGradesByEnrollment(enrollment.id);
            const detection = detectColumns(existing);
            setActiveColumns(detection.quarters);
            prepareBulkEntries(student, currentGrade, existing, detection.quarters);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStudentFromListClick = (student) => {
        handleSelectStudent(student);
        setSelectedGradeFilter('');
        setGradeStudentList([]);
    };

    const handleGradeLevelChange = async (gradeLevel) => {
        if (!selectedStudent) return;
        setSelectedGradeLevel(gradeLevel);
        setBulkGrades({});
        setMessage({ type: '', text: '' });

        const enrollment = selectedStudent.enrollments.find(e => e.grade_level === gradeLevel);
        if (enrollment) {
            const existing = await fetchGradesByEnrollment(enrollment.id);
            const detection = detectColumns(existing);
            setActiveColumns(detection.quarters);
            prepareBulkEntries(selectedStudent, gradeLevel, existing, detection.quarters);
        }
    };

    const handleClearSelection = () => {
        setSelectedStudent(null);
        setSelectedGradeLevel('');
        setSearchTerm('');
        setShowResults(false);
        setBulkGrades({});
        setActiveColumns(NEW_TERMS);
        setSelectedGradeFilter('');
        setGradeStudentList([]);
    };

    const handleGradeChange = (subject, quarter, value) => {
        setBulkGrades(prev => ({
            ...prev,
            [subject]: {
                ...prev[subject],
                [quarter]: {
                    ...prev[subject][quarter],
                    grade: value
                }
            }
        }));
    };

    const handleSaveAll = async () => {
        if (!selectedStudent || !selectedGradeLevel) {
            setMessage({ type: 'error', text: 'Please select a student first' });
            return;
        }

        const enrollment = selectedStudent.enrollments.find(e => e.grade_level === selectedGradeLevel);
        if (!enrollment) {
            setMessage({ type: 'error', text: 'No enrollment found for this grade level' });
            return;
        }

        const allEntries = [];
        Object.keys(bulkGrades).forEach(subject => {
            activeColumns.forEach(q => {
                const entry = bulkGrades[subject][q];
                if (entry.grade !== '' && entry.grade !== null && entry.grade !== undefined) {
                    allEntries.push({
                        ...entry,
                        enrollment_id: enrollment.id,
                        student_id: selectedStudent.student_id
                    });
                }
            });
        });

        if (allEntries.length === 0) {
            setMessage({ type: 'error', text: 'Please enter at least one grade' });
            return;
        }

        const invalid = allEntries.filter(e => isNaN(e.grade) || parseFloat(e.grade) < 0 || parseFloat(e.grade) > 100);
        if (invalid.length > 0) {
            setMessage({ type: 'error', text: 'All grades must be between 0 and 100' });
            return;
        }

        try {
            setSaving(true);
            setMessage({ type: '', text: '' });

            let added = 0;
            let updated = 0;
            let failed = 0;

            for (const entry of allEntries) {
                try {
                    const autoRemarks = getAutoRemarks(entry.grade);
                    const payload = {
                        student_id: entry.student_id,
                        enrollment_id: entry.enrollment_id,
                        subject: entry.subject,
                        grade: parseFloat(entry.grade),
                        remarks: autoRemarks,
                        quarter: entry.quarter
                    };

                    if (entry.existing_id) {
                        await API.put(`/registrar/grades/${entry.existing_id}`, {
                            grade: parseFloat(entry.grade),
                            remarks: autoRemarks,
                            quarter: entry.quarter
                        });
                        updated++;
                    } else {
                        await API.post('/registrar/grades', payload);
                        added++;
                    }
                } catch (err) {
                    console.error('Failed to save grade:', entry, err);
                    failed++;
                }
            }

            const existing = await fetchGradesByEnrollment(enrollment.id);
            prepareBulkEntries(selectedStudent, selectedGradeLevel, existing, activeColumns);

            setMessage({
                type: 'success',
                text: `✅ Saved! Added: ${added} | Updated: ${updated}${failed > 0 ? ` | Failed: ${failed}` : ''}`
            });
        } catch (err) {
            console.error('Save error:', err);
            setMessage({ type: 'error', text: 'Failed to save grades' });
        } finally {
            setSaving(false);
        }
    };

    const handleFixRemarks = async () => {
        if (!window.confirm('⚠️ FIX ALL EXISTING GRADES REMARKS?\n\nThis will check both Q1-Q4 (old) and Term 1-3 (new) formats.')) return;

        setFixing(true);
        setMessage({ type: '', text: '' });

        try {
            const allEnrollmentsRes = await API.get('/registrar/enrollments');
            const allEnrollments = Array.isArray(allEnrollmentsRes.data) ? allEnrollmentsRes.data : [];

            let totalFixed = 0;

            for (const enrollment of allEnrollments) {
                try {
                    const gradesRes = await API.get(`/registrar/grades/enrollment/${enrollment.id}`);
                    const enrollmentGrades = Array.isArray(gradesRes.data) ? gradesRes.data : [];

                    for (const grade of enrollmentGrades) {
                        const autoRemarks = getAutoRemarks(grade.grade);
                        if (!grade.remarks || grade.remarks !== autoRemarks) {
                            try {
                                await API.put(`/registrar/grades/${grade.id}`, {
                                    grade: grade.grade,
                                    remarks: autoRemarks,
                                    quarter: grade.quarter
                                });
                                totalFixed++;
                            } catch (err) {
                                console.warn('Failed:', grade.id, err);
                            }
                        }
                    }
                } catch (err) {
                    console.warn('Failed enrollment:', enrollment.id);
                }
            }

            setMessage({ type: 'success', text: `✅ Fixed ${totalFixed} grade(s)!` });

            if (selectedStudent && selectedGradeLevel) {
                const enrollment = selectedStudent.enrollments.find(e => e.grade_level === selectedGradeLevel);
                if (enrollment) {
                    const existing = await fetchGradesByEnrollment(enrollment.id);
                    prepareBulkEntries(selectedStudent, selectedGradeLevel, existing, activeColumns);
                }
            }
        } catch (err) {
            console.error('Fix remarks error:', err);
            setMessage({ type: 'error', text: 'Failed to fix remarks' });
        } finally {
            setFixing(false);
        }
    };

    const computeSubjectAverage = (subjectQuarters) => {
        const vals = activeColumns.map(q => parseFloat(subjectQuarters[q]?.grade)).filter(v => !isNaN(v));
        if (vals.length === 0) return null;
        return (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2);
    };

    const calculateOverallAverage = () => {
        if (!bulkGrades || Object.keys(bulkGrades).length === 0) return 0;
        const allVals = [];
        Object.keys(bulkGrades).forEach(subject => {
            activeColumns.forEach(q => {
                const g = parseFloat(bulkGrades[subject][q]?.grade);
                if (!isNaN(g)) allVals.push(g);
            });
        });
        if (allVals.length === 0) return 0;
        return (allVals.reduce((a, b) => a + b, 0) / allVals.length).toFixed(2);
    };

    const getCurrentHonor = () => {
        if (!bulkGrades || Object.keys(bulkGrades).length === 0) return null;
        
        const allGrades = [];
        Object.keys(bulkGrades).forEach(subject => {
            activeColumns.forEach(q => {
                const gradeVal = bulkGrades[subject][q]?.grade;
                if (gradeVal !== '' && gradeVal !== null && gradeVal !== undefined) {
                    allGrades.push({ subject, grade: gradeVal });
                }
            });
        });

        if (allGrades.length === 0) return null;
        
        const honor = computeHonorFromGrades(allGrades);
        return honor.isHonor ? honor : null;
    };

    const gradeColor = (grade) => {
        const num = parseFloat(grade);
        if (num >= 95) return { bg: '#d1fae5', color: '#065f46' };
        if (num >= 90) return { bg: '#dbeafe', color: '#1a56db' };
        if (num >= 85) return { bg: '#e0e7ff', color: '#4338ca' };
        if (num >= 80) return { bg: '#fef3c7', color: '#92400e' };
        if (num >= 75) return { bg: '#fff7ed', color: '#c2410c' };
        return { bg: '#fee2e2', color: '#991b1b' };
    };

    const remarksColor = (remarks) => {
        const colors = {
            'Excellent': { bg: '#d1fae5', color: '#065f46' },
            'Outstanding': { bg: '#dbeafe', color: '#1a56db' },
            'Very Good': { bg: '#e0e7ff', color: '#4338ca' },
            'Good': { bg: '#fef3c7', color: '#92400e' },
            'Satisfactory': { bg: '#fff7ed', color: '#c2410c' },
            'Failed': { bg: '#fee2e2', color: '#991b1b' }
        };
        return colors[remarks] || { bg: '#f3f4f6', color: '#6b7280' };
    };

    const menuItems = [
        { id: 'applications', icon: '📋', label: 'Applications', type: 'link', path: '/registrar/dashboard' },
        { id: 'enrolled', icon: '🎓', label: 'Enrolled Students', type: 'link', path: '/registrar/dashboard' },
        { id: 'sections', icon: '🏫', label: 'Sections', type: 'link', path: '/registrar/sections' },
        { id: 'subjects', icon: '📚', label: 'Subjects', type: 'link', path: '/registrar/subjects' },
        { id: 'enrollments', icon: '📝', label: 'Enrollments', type: 'link', path: '/registrar/enrollments' },
        { id: 'reenrollment', icon: '🔄', label: 'Re-enrollment', type: 'link', path: '/registrar/re-enrollment-requests' },
        { id: 'grades', icon: '📊', label: 'Grades', type: 'link', path: '/registrar/grades' },
        { id: 'remarks', icon: '💬', label: 'Remarks', type: 'link', path: '/registrar/remarks' },
        { id: 'honor-students', icon: '🏆', label: 'Honor Students', type: 'link', path: '/registrar/honor-students' },
        { id: 'student-history', icon: '📚', label: 'Student History', type: 'link', path: '/registrar/student-history' },
        { id: 'settings', icon: '⚙️', label: 'Settings', type: 'link', path: '/registrar/dashboard' }
    ];

    const currentPage = 'grades';

    const selectedEnrollmentData = selectedStudent && selectedGradeLevel
        ? selectedStudent.enrollments.find(e => e.grade_level === selectedGradeLevel)
        : null;

    const availableGradeLevels = selectedStudent
        ? selectedStudent.enrollments.map(e => e.grade_level)
        : [];

    const currentHonor = getCurrentHonor();

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f0f4ff 0%, #e8ecf1 50%, #f5f3ff 100%)',
            fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, Roboto, sans-serif',
            display: 'flex'
        }}>
            {/* SIDEBAR */}
            <div style={{
                width: '280px', minHeight: '100vh', height: '100vh',
                background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(20px)',
                borderRight: '1px solid rgba(255,255,255,0.2)',
                display: 'flex', flexDirection: 'column',
                position: 'fixed', top: 0, left: 0,
                overflow: 'hidden', flexShrink: 0, zIndex: 50,
                boxShadow: '4px 0 30px rgba(0,0,0,0.06)'
            }}>
                <div style={{ padding: '24px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                            width: '40px', height: '40px', borderRadius: '10px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '20px', boxShadow: '0 4px 15px rgba(26,86,219,0.3)'
                        }}>🎓</div>
                        <div>
                            <span style={{ fontSize: '18px', fontWeight: '800', color: '#1f2937' }}>NCDC</span>
                            <br />
                            <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>Teacher Panel</span>
                        </div>
                    </div>
                </div>

                <Link to="/registrar/profile" style={{
                    textDecoration: 'none', padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    cursor: 'pointer', flexShrink: 0
                }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#1a56db', fontSize: '20px', fontWeight: 'bold',
                        border: '2px solid rgba(255,255,255,0.5)',
                        overflow: 'hidden', flexShrink: 0
                    }}>
                        {profilePic ? (
                            <img src={profilePic} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            user?.username?.charAt(0).toUpperCase() || 'T'
                        )}
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                            {user?.username || 'Teacher'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Teacher / Staff</div>
                    </div>
                </Link>

                <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    {menuItems.map((item) => {
                        const isActive = currentPage === item.id;
                        return (
                            <Link key={item.id} to={item.path} style={{
                                display: 'flex', alignItems: 'center', gap: '12px',
                                width: '100%', padding: '10px 14px', borderRadius: '8px',
                                textDecoration: 'none',
                                background: isActive ? 'rgba(59,130,246,0.08)' : 'transparent',
                                color: isActive ? '#1a56db' : '#6b7280',
                                fontWeight: isActive ? '600' : '500',
                                fontSize: '14px', transition: 'all 0.3s ease',
                                marginBottom: '2px', position: 'relative', boxSizing: 'border-box'
                            }}>
                                {isActive && (
                                    <span style={{
                                        position: 'absolute', left: '0', top: '50%',
                                        transform: 'translateY(-50%)', width: '3px', height: '24px',
                                        background: 'linear-gradient(180deg, #1a56db, #3b82f6)',
                                        borderRadius: '0 4px 4px 0'
                                    }} />
                                )}
                                <span style={{ fontSize: '18px', width: '24px' }}>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                <div style={{
                    padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.2)',
                    flexShrink: 0, background: 'rgba(255,255,255,0.3)'
                }}>
                    <button
                        onClick={() => { localStorage.clear(); navigate('/login'); }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            width: '100%', padding: '10px 14px', borderRadius: '8px',
                            border: 'none', background: 'transparent', color: '#ef4444',
                            fontWeight: '500', cursor: 'pointer', fontSize: '14px'
                        }}
                    >
                        <span style={{ fontSize: '18px', width: '24px' }}>🚪</span>
                        Logout
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div style={{
                flex: 1, marginLeft: '280px', padding: '28px 36px',
                minHeight: '100vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '700', letterSpacing: '-0.5px' }}>
                            📊 Grades Management
                        </h1>
                        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                            Select a student, choose grade level, and enter grades per term
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                            onClick={handleFixRemarks}
                            disabled={fixing}
                            style={{
                                background: fixing ? '#fcd34d' : 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                                color: 'white', border: 'none', padding: '10px 20px',
                                borderRadius: '10px', cursor: fixing ? 'not-allowed' : 'pointer',
                                fontSize: '14px', fontWeight: '600',
                                boxShadow: '0 4px 15px rgba(245,158,11,0.3)'
                            }}
                        >
                            {fixing ? '⏳ Fixing...' : '🔧 Fix Remarks'}
                        </button>
                        {selectedStudent && selectedGradeLevel && (
                            <button
                                onClick={handleSaveAll}
                                disabled={saving}
                                style={{
                                    background: saving ? '#93c5fd' : 'linear-gradient(135deg, #10b981, #34d399)',
                                    color: 'white', border: 'none', padding: '12px 28px',
                                    borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer',
                                    fontSize: '14px', fontWeight: '700',
                                    boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
                                }}
                            >
                                {saving ? '⏳ Saving...' : '💾 Save All Grades'}
                            </button>
                        )}
                    </div>
                </div>

                {message.text && (
                    <div style={{
                        padding: '12px 20px', borderRadius: '8px', marginBottom: '20px',
                        background: message.type === 'error' ? '#fee2e2' : '#d1fae5',
                        color: message.type === 'error' ? '#991b1b' : '#065f46',
                        border: `1px solid ${message.type === 'error' ? '#fca5a5' : '#34d399'}`
                    }}>{message.text}</div>
                )}

                {/* SEARCH */}
                <div style={{
                    background: 'white', padding: '20px', borderRadius: '14px',
                    marginBottom: '20px', border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    position: 'relative', zIndex: 10
                }}>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                        🔍 Search Student:
                    </label>
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Type student name or NCDC ID..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowResults(true);
                                if (!e.target.value) handleClearSelection();
                            }}
                            onFocus={() => setShowResults(true)}
                            style={{
                                width: '100%', padding: '12px 44px 12px 16px',
                                border: '1px solid #d1d5db', borderRadius: '8px',
                                fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                                background: '#f9fafb'
                            }}
                        />
                        {searchTerm && (
                            <button onClick={handleClearSelection} style={{
                                position: 'absolute', right: '10px', top: '50%',
                                transform: 'translateY(-50%)', background: '#e5e7eb',
                                border: 'none', width: '26px', height: '26px',
                                borderRadius: '50%', cursor: 'pointer', fontSize: '14px', color: '#6b7280'
                            }}>×</button>
                        )}
                    </div>

                    {showResults && searchTerm && !selectedStudent && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% - 24px)', left: '20px', right: '20px',
                            background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px',
                            maxHeight: '300px', overflowY: 'auto',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.12)', zIndex: 100, marginTop: '8px'
                        }}>
                            {filteredStudents.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                                    No students found
                                </div>
                            ) : (
                                filteredStudents.slice(0, 20).map(s => (
                                    <div key={s.student_id} onClick={() => handleSelectStudent(s)} style={{
                                        padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
                                        cursor: 'pointer', transition: 'background 0.15s',
                                        display: 'flex', justifyContent: 'space-between',
                                        alignItems: 'center', gap: '12px'
                                    }}
                                    onMouseEnter={(ev) => ev.currentTarget.style.background = '#f0f4ff'}
                                    onMouseLeave={(ev) => ev.currentTarget.style.background = 'white'}>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                                                {s.first_name} {s.middle_name || ''} {s.last_name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                                {s.public_id} — {s.enrollments.length} grade level{s.enrollments.length !== 1 ? 's' : ''}
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: '11px', color: '#1a56db', fontWeight: '600',
                                            background: '#dbeafe', padding: '4px 10px', borderRadius: '10px'
                                        }}>
                                            {s.current_grade_level}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {showResults && searchTerm && !selectedStudent && (
                    <div onClick={() => setShowResults(false)} style={{ position: 'fixed', inset: 0, zIndex: 5, background: 'transparent' }} />
                )}

                {/* ✅ GRADE FILTER + STUDENT LIST */}
                {!selectedStudent && (
                    <div style={{
                        background: 'white', padding: '20px', borderRadius: '14px',
                        marginBottom: '20px', border: '1px solid #e5e7eb',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ 
                            marginBottom: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap'
                        }}>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                📚 Browse by Grade Level:
                            </span>
                            <span style={{ fontSize: '12px', color: '#9ca3af', fontStyle: 'italic' }}>
                                (Click to view students)
                            </span>
                        </div>

                        {/* Compact text-based grade filter */}
                        <div style={{ 
                            display: 'flex', 
                            gap: '20px', 
                            flexWrap: 'wrap',
                            paddingBottom: '8px',
                            borderBottom: '1px solid #f3f4f6'
                        }}>
                            {gradeLevels.map(grade => {
                                const count = getGradeCount(grade);
                                const isActive = selectedGradeFilter === grade;
                                return (
                                    <button
                                        key={grade}
                                        onClick={() => handleGradeFilterClick(grade)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            padding: '4px 0',
                                            cursor: count > 0 ? 'pointer' : 'not-allowed',
                                            fontSize: '14px',
                                            fontWeight: isActive ? '700' : '500',
                                            color: isActive 
                                                ? '#1a56db' 
                                                : count > 0 ? '#374151' : '#9ca3af',
                                            borderBottom: isActive 
                                                ? '2px solid #1a56db' 
                                                : '2px solid transparent',
                                            transition: 'all 0.2s ease',
                                            opacity: count > 0 ? 1 : 0.5
                                        }}
                                        onMouseEnter={(e) => {
                                            if (count > 0 && !isActive) {
                                                e.currentTarget.style.color = '#1a56db';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (count > 0 && !isActive) {
                                                e.currentTarget.style.color = '#374151';
                                            }
                                        }}
                                    >
                                        {grade} <span style={{ fontSize: '12px', opacity: 0.7 }}>({count})</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* ✅ NEW: List-style student display */}
                        {selectedGradeFilter && (
                            <div style={{ marginTop: '16px' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '12px',
                                    paddingBottom: '10px',
                                    borderBottom: '1px solid #f3f4f6'
                                }}>
                                    <div style={{ 
                                        fontSize: '14px', 
                                        fontWeight: '700', 
                                        color: '#1f2937',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                    }}>
                                        📋 {selectedGradeFilter} Students
                                        <span style={{ 
                                            fontSize: '12px', 
                                            fontWeight: '500',
                                            color: '#6b7280',
                                            background: '#f3f4f6',
                                            padding: '2px 10px',
                                            borderRadius: '10px'
                                        }}>
                                            {gradeStudentList.length}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setSelectedGradeFilter('');
                                            setGradeStudentList([]);
                                        }}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#6b7280',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        ✖ Close
                                    </button>
                                </div>

                                {gradeStudentList.length === 0 ? (
                                    <div style={{ 
                                        padding: '30px 20px', 
                                        textAlign: 'center', 
                                        color: '#6b7280',
                                        fontSize: '14px'
                                    }}>
                                        Wala pay students sa {selectedGradeFilter}
                                    </div>
                                ) : (
                                    <div style={{
                                        background: 'white',
                                        borderRadius: '8px',
                                        border: '1px solid #f3f4f6',
                                        overflow: 'hidden'
                                    }}>
                                        {gradeStudentList.map((student, index) => (
                                            <div
                                                key={student.student_id}
                                                onClick={() => handleStudentFromListClick(student)}
                                                style={{
                                                    padding: '12px 16px',
                                                    borderBottom: index < gradeStudentList.length - 1 ? '1px solid #f3f4f6' : 'none',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.15s ease',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '16px'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#f0f4ff';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'white';
                                                }}
                                            >
                                                {/* Number */}
                                                <div style={{
                                                    fontSize: '13px',
                                                    color: '#9ca3af',
                                                    fontWeight: '600',
                                                    minWidth: '24px',
                                                    flexShrink: 0
                                                }}>
                                                    {index + 1}
                                                </div>

                                                {/* Name + ID */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{
                                                        fontSize: '14px',
                                                        fontWeight: '600',
                                                        color: '#1f2937',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis'
                                                    }}>
                                                        {student.first_name} {student.middle_name || ''} {student.last_name}
                                                    </div>
                                                    <div style={{
                                                        fontSize: '11px',
                                                        color: '#6b7280',
                                                        marginTop: '2px'
                                                    }}>
                                                        {student.public_id || '—'}
                                                    </div>
                                                </div>

                                                {/* Grade */}
                                                <div style={{
                                                    fontSize: '13px',
                                                    color: '#374151',
                                                    fontWeight: '500',
                                                    minWidth: '70px',
                                                    flexShrink: 0
                                                }}>
                                                    {student.current_grade_level}
                                                </div>

                                                {/* Section */}
                                                <div style={{
                                                    fontSize: '13px',
                                                    color: '#6b7280',
                                                    minWidth: '100px',
                                                    flexShrink: 0
                                                }}>
                                                    {student.current_section || '—'}
                                                </div>

                                                {/* School Year */}
                                                <div style={{
                                                    fontSize: '13px',
                                                    color: '#9ca3af',
                                                    minWidth: '90px',
                                                    flexShrink: 0
                                                }}>
                                                    {student.current_school_year}
                                                </div>

                                                {/* Icon */}
                                                <div style={{
                                                    fontSize: '18px',
                                                    color: '#1a56db',
                                                    flexShrink: 0,
                                                    opacity: 0.6
                                                }}>
                                                    📊
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {selectedStudent && (
                    <>
                        {/* Student Info Card */}
                        <div style={{
                            background: 'white', padding: '20px', borderRadius: '14px',
                            marginBottom: '20px', border: '1px solid #e5e7eb',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                    <div>
                                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#1f2937' }}>
                                            {selectedStudent.first_name} {selectedStudent.middle_name || ''} {selectedStudent.last_name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                            {selectedStudent.public_id}
                                        </div>
                                    </div>
                                    {currentHonor && (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '6px',
                                            padding: '6px 14px',
                                            borderRadius: '12px',
                                            fontSize: '12px',
                                            fontWeight: '700',
                                            background: currentHonor.tier.bg,
                                            color: currentHonor.tier.color,
                                            border: `2px solid ${currentHonor.tier.border}`,
                                            boxShadow: `0 2px 8px ${currentHonor.tier.border}40`
                                        }}>
                                            <span style={{ fontSize: '16px' }}>{currentHonor.tier.icon}</span>
                                            {currentHonor.tier.label}
                                            <span style={{ marginLeft: '4px', fontSize: '11px', opacity: 0.85 }}>
                                                (Ave: {currentHonor.average.toFixed(2)})
                                            </span>
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Current Grade</div>
                                        <div style={{ fontSize: '16px', fontWeight: '700', color: '#1a56db' }}>
                                            {selectedStudent.current_grade_level}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Current Section</div>
                                        <div style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                                            {selectedStudent.current_section || '—'}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClearSelection}
                                        style={{
                                            background: '#f3f4f6',
                                            color: '#6b7280',
                                            border: '1px solid #d1d5db',
                                            padding: '8px 16px',
                                            borderRadius: '8px',
                                            cursor: 'pointer',
                                            fontSize: '13px',
                                            fontWeight: '600'
                                        }}
                                    >
                                        ✖ Clear
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Grade Level Tabs */}
                        {availableGradeLevels.length > 1 && (
                            <div style={{
                                background: 'white', padding: '8px', borderRadius: '12px',
                                marginBottom: '20px', border: '1px solid #e5e7eb',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                display: 'flex', gap: '8px', flexWrap: 'wrap'
                            }}>
                                {availableGradeLevels.map(gl => {
                                    const enrollment = selectedStudent.enrollments.find(e => e.grade_level === gl);
                                    const isActive = selectedGradeLevel === gl;
                                    return (
                                        <button
                                            key={gl}
                                            onClick={() => handleGradeLevelChange(gl)}
                                            style={{
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                border: 'none',
                                                background: isActive ? 'linear-gradient(135deg, #1a56db, #3b82f6)' : '#f3f4f6',
                                                color: isActive ? 'white' : '#6b7280',
                                                fontWeight: '600',
                                                fontSize: '13px',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s ease',
                                                boxShadow: isActive ? '0 4px 12px rgba(26,86,219,0.3)' : 'none',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '2px'
                                            }}
                                        >
                                            <span>{gl}</span>
                                            <span style={{ fontSize: '10px', opacity: 0.85 }}>
                                                {enrollment?.school_year || ''}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}

                        {/* Report Card Entry */}
                        {Object.keys(bulkGrades).length === 0 ? (
                            <div style={{
                                background: 'white', padding: '60px', borderRadius: '14px',
                                textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                                <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>No Subjects Found</h3>
                                <p>No subjects configured for {selectedGradeLevel}.</p>
                                <Link to="/registrar/subjects" style={{
                                    display: 'inline-block',
                                    background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                                    color: 'white', textDecoration: 'none',
                                    padding: '10px 24px', borderRadius: '8px',
                                    fontWeight: '600', fontSize: '14px', marginTop: '12px'
                                }}>🔄 Configure Subjects</Link>
                            </div>
                        ) : (
                            <div style={{
                                background: 'white', padding: '24px', borderRadius: '14px',
                                border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                            }}>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    marginBottom: '16px', flexWrap: 'wrap', gap: '12px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                                            📋 {selectedGradeLevel} — Report Card Entry
                                        </h3>
                                        <span style={{
                                            fontSize: '11px',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            fontWeight: '700',
                                            background: activeColumns.length === 3 ? '#dbeafe' : '#fef3c7',
                                            color: activeColumns.length === 3 ? '#1a56db' : '#92400e'
                                        }}>
                                            {activeColumns.length === 3 ? '📘 New System (3 Terms)' : '📗 Old System (4 Quarters)'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                        <div style={{ fontSize: '13px', color: '#6b7280' }}>
                                            S.Y. <strong>{selectedEnrollmentData?.school_year}</strong>
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                            Average:{' '}
                                            <strong style={{
                                                color: parseFloat(calculateOverallAverage()) >= 75 ? '#065f46' : '#991b1b',
                                                fontSize: '18px'
                                            }}>
                                                {calculateOverallAverage()}
                                            </strong>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{
                                        width: '100%', borderCollapse: 'collapse', minWidth: activeColumns.length === 3 ? '750px' : '900px'
                                    }}>
                                        <thead>
                                            <tr style={{ background: '#800000', color: 'white' }}>
                                                <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: '180px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>SUBJECTS</th>
                                                {activeColumns.map((col, idx) => (
                                                    <th key={idx} style={{ padding: '14px 8px', textAlign: 'center', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', width: '110px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>
                                                        {col.replace('1st Quarter', 'Q1').replace('2nd Quarter', 'Q2').replace('3rd Quarter', 'Q3').replace('4th Quarter', 'Q4')}
                                                    </th>
                                                ))}
                                                <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', width: '110px', borderRight: '1px solid rgba(255,255,255,0.15)' }}>FINAL AVE</th>
                                                <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '13px', fontWeight: '700', textTransform: 'uppercase', width: '150px' }}>REMARKS</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {Object.keys(bulkGrades).map((subject, idx) => {
                                                const subjectQuarters = bulkGrades[subject];
                                                const finalAvg = computeSubjectAverage(subjectQuarters);
                                                const finalRemarks = finalAvg ? getAutoRemarks(finalAvg) : '';
                                                const avgColor = finalAvg ? gradeColor(finalAvg) : null;
                                                const remColor = finalRemarks ? remarksColor(finalRemarks) : null;

                                                return (
                                                    <tr key={subject} style={{
                                                        borderBottom: '1px solid #e5e7eb',
                                                        background: idx % 2 === 0 ? 'white' : '#fafafa'
                                                    }}>
                                                        <td style={{
                                                            padding: '12px 16px', fontSize: '14px',
                                                            fontWeight: '600', color: '#1f2937',
                                                            borderRight: '1px solid #f3f4f6'
                                                        }}>
                                                            {subject}
                                                        </td>

                                                        {activeColumns.map(q => {
                                                            const entry = subjectQuarters[q];
                                                            if (!entry) return <td key={q} style={{ padding: '10px 8px', textAlign: 'center' }}>—</td>;
                                                            
                                                            const gradeNum = parseFloat(entry.grade);
                                                            const gc = !isNaN(gradeNum) ? gradeColor(gradeNum) : null;
                                                            
                                                            return (
                                                                <td key={q} style={{
                                                                    padding: '10px 8px',
                                                                    textAlign: 'center',
                                                                    borderRight: '1px solid #f3f4f6'
                                                                }}>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        max="100"
                                                                        value={entry.grade}
                                                                        onChange={(e) => handleGradeChange(subject, q, e.target.value)}
                                                                        placeholder="—"
                                                                        style={{
                                                                            width: '90px',
                                                                            padding: '8px 6px',
                                                                            border: '2px solid ' + (gc ? gc.color : '#d1d5db'),
                                                                            borderRadius: '8px',
                                                                            fontSize: '14px',
                                                                            fontWeight: '700',
                                                                            textAlign: 'center',
                                                                            outline: 'none',
                                                                            background: 'white',
                                                                            color: '#1f2937',
                                                                            boxSizing: 'border-box'
                                                                        }}
                                                                    />
                                                                </td>
                                                            );
                                                        })}

                                                        <td style={{
                                                            padding: '12px 12px',
                                                            textAlign: 'center',
                                                            borderRight: '1px solid #f3f4f6'
                                                        }}>
                                                            {finalAvg ? (
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    padding: '6px 14px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '14px',
                                                                    fontWeight: '800',
                                                                    background: avgColor ? avgColor.bg : '#f3f4f6',
                                                                    color: avgColor ? avgColor.color : '#6b7280'
                                                                }}>{finalAvg}</span>
                                                            ) : (
                                                                <span style={{ color: '#d1d5db', fontSize: '14px' }}>—</span>
                                                            )}
                                                        </td>

                                                        <td style={{
                                                            padding: '12px 12px',
                                                            textAlign: 'center'
                                                        }}>
                                                            {finalRemarks ? (
                                                                <span style={{
                                                                    display: 'inline-block',
                                                                    padding: '6px 14px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '12px',
                                                                    fontWeight: '700',
                                                                    background: remColor ? remColor.bg : '#f3f4f6',
                                                                    color: remColor ? remColor.color : '#6b7280'
                                                                }}>{finalRemarks}</span>
                                                            ) : (
                                                                <span style={{ color: '#d1d5db', fontSize: '12px' }}>—</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                <div style={{
                                    marginTop: '20px', paddingTop: '20px',
                                    borderTop: '2px solid #e5e7eb',
                                    display: 'flex', justifyContent: 'space-between',
                                    alignItems: 'center', flexWrap: 'wrap', gap: '12px'
                                }}>
                                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                        💡 <strong>{Object.keys(bulkGrades).length}</strong> subjects • {activeColumns.length} {activeColumns.length === 3 ? 'terms' : 'quarters'}
                                    </div>
                                    <button
                                        onClick={handleSaveAll}
                                        disabled={saving}
                                        style={{
                                            background: saving ? '#93c5fd' : 'linear-gradient(135deg, #10b981, #34d399)',
                                            color: 'white', border: 'none', padding: '12px 28px',
                                            borderRadius: '10px', cursor: saving ? 'not-allowed' : 'pointer',
                                            fontSize: '14px', fontWeight: '700',
                                            boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
                                        }}
                                    >
                                        {saving ? '⏳ Saving All...' : '💾 Save All Grades'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {!selectedStudent && !searchTerm && !selectedGradeFilter && (
                    <div style={{
                        background: 'white', padding: '60px', borderRadius: '14px',
                        textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb'
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '12px' }}>📊</div>
                        <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>Select a Student</h3>
                        <p>Search above OR browse by grade level to begin entering grades.</p>
                    </div>
                )}

                <div style={{
                    marginTop: '28px', paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb', textAlign: 'center'
                }}>
                    <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                        Nurturing Today, <strong style={{ color: '#1a56db' }}>Empowering Tomorrow</strong>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Grades;