import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';

const StudentHistory = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [history, setHistory] = useState(null);
    const [allSubjects, setAllSubjects] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [profilePic, setProfilePic] = useState(null);

    const user = JSON.parse(localStorage.getItem('user'));
    const currentPath = location.pathname;

    const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        if (user && user.role === 'admin') {
            fetchProfile();
            fetchStudents();
            fetchAllSubjects();
        }
    }, []);

    useEffect(() => {
        const studentId = searchParams.get('studentId');
        if (studentId && students.length > 0) {
            const student = students.find(s => String(s.student_id) === String(studentId));
            if (student) handleSelectStudent(student);
        }
    }, [searchParams, students]);

    const fetchProfile = async () => {
        try {
            const response = await API.get(`/admin/profile/${user.id}`);
            if (response.data.profile_pic) {
                setProfilePic(`${UPLOADS_URL}/profiles/${response.data.profile_pic}`);
            }
        } catch (error) {
            console.error('Error fetching profile pic:', error);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await API.get('/admin/applications');
            const confirmed = (res.data || []).filter(app => app.status === 'confirmed');
            setStudents(confirmed);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const fetchAllSubjects = async () => {
        try {
            const res = await API.get('/registrar/subjects');
            setAllSubjects(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Error fetching subjects:', error);
        }
    };

    const fetchHistory = async (studentId) => {
        setLoading(true);
        try {
            const res = await API.get(`/admin/reports/student-history/${studentId}`);
            setHistory(res.data);
        } catch (error) {
            console.error('Error fetching history:', error);
            setHistory(null);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStudent = (student) => {
        setSelectedStudent(student);
        setSearchTerm(`${student.first_name} ${student.middle_name || ''} ${student.last_name}`);
        setShowResults(false);
        fetchHistory(student.student_id);
    };

    const handleClearSelection = () => {
        setSelectedStudent(null);
        setSearchTerm('');
        setShowResults(false);
        setHistory(null);
    };

    const menuItems = [
        { id: 'dashboard', icon: '📊', label: 'Dashboard', path: '/admin/dashboard', color: '#3b82f6' },
        { id: 'applications', icon: '📋', label: 'Applications', path: '/admin/applications', color: '#8b5cf6' },
        { id: 'approved', icon: '✅', label: 'Confirm Enrollments', path: '/admin/approved', color: '#10b981' },
        { id: 'reports', icon: '📈', label: 'Reports', path: '/admin/reports', color: '#f59e0b' },
        { id: 'monitoring', icon: '👁️', label: 'Student Monitoring', path: '/admin/student-monitoring', color: '#06b6d4' },
        { id: 'grade-reports', icon: '📉', label: 'Grade Reports', path: '/admin/grade-reports', color: '#ef4444' },
        { id: 'student-history', icon: '📚', label: 'Student History', path: '/admin/student-history', color: '#a855f7' },
        { id: 'registrars', icon: '👨‍💼', label: 'Registrar Management', path: '/admin/registrars', color: '#ec4899' },
        { id: 'password-requests', icon: '🔑', label: 'Password Requests', path: '/admin/password-requests', color: '#f43f5e' }
    ];

    const isActive = (path) => currentPath === path;

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const filteredStudents = students.filter(s => {
        if (!searchTerm.trim()) return true;
        const search = searchTerm.toLowerCase();
        const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
        return fullName.includes(search) || (s.student_public_id || '').toLowerCase().includes(search);
    });

    // ============================================================
    // ROADMAP DATA BUILDER — Grade 1 to 6
    // ============================================================
    const buildRoadmap = () => {
        if (!history) return [];

        const enrollments = history.enrollments || [];
        const grades = history.grades || [];

        // Determine current year (from active enrollment)
        const currentEnrollment = enrollments.find(e => e.status === 'enrolled');
        const currentGrade = currentEnrollment?.grade_level || history.student.current_grade_level;

        return gradeLevels.map(gradeLevel => {
            // Find enrollment for this grade
            const enrollment = enrollments.find(e => e.grade_level === gradeLevel);

            // Get subjects for this grade level
            const subjectsForGrade = allSubjects.filter(s => s.grade_level === gradeLevel);

            // Get grades for this enrollment
            const gradesForEnrollment = enrollment
                ? grades.filter(g => g.enrollment_id === enrollment.id)
                : [];

            // Build subject rows
            const subjects = subjectsForGrade.map(subject => {
                const q1 = gradesForEnrollment.find(g => g.subject === subject.subject_name && g.quarter === '1st Quarter');
                const q2 = gradesForEnrollment.find(g => g.subject === subject.subject_name && g.quarter === '2nd Quarter');
                const q3 = gradesForEnrollment.find(g => g.subject === subject.subject_name && g.quarter === '3rd Quarter');
                const q4 = gradesForEnrollment.find(g => g.subject === subject.subject_name && g.quarter === '4th Quarter');

                const grades_list = [q1, q2, q3, q4].filter(Boolean).map(g => parseFloat(g.grade));
                const finalAve = grades_list.length > 0
                    ? (grades_list.reduce((a, b) => a + b, 0) / grades_list.length).toFixed(2)
                    : null;

                // Overall remarks (last non-null)
                const remarks = q4?.remarks || q3?.remarks || q2?.remarks || q1?.remarks || null;

                return {
                    subject_name: subject.subject_name,
                    q1: q1?.grade || null,
                    q2: q2?.grade || null,
                    q3: q3?.grade || null,
                    q4: q4?.grade || null,
                    finalAve,
                    remarks
                };
            });

            // Determine status: 'completed', 'current', 'future'
            let status = 'future';
            if (enrollment) {
                if (enrollment.status === 'enrolled') status = 'current';
                else if (enrollment.status === 'passed' || enrollment.status === 'graduated') status = 'completed';
                else if (enrollment.status === 'failed') status = 'failed';
                else status = 'completed'; // dropped, transferred
            }

            return {
                grade_level: gradeLevel,
                enrollment,
                subjects,
                status,
                school_year: enrollment?.school_year || null,
                section: enrollment?.section_name || null
            };
        });
    };

    const getGradeColor = (grade) => {
        if (!grade) return '#9ca3af';
        const num = parseFloat(grade);
        if (num >= 90) return '#065f46';
        if (num >= 85) return '#1a56db';
        if (num >= 75) return '#92400e';
        return '#991b1b';
    };

    const calculateOverallAverage = (subjects) => {
        const aves = subjects.filter(s => s.finalAve).map(s => parseFloat(s.finalAve));
        if (aves.length === 0) return null;
        return (aves.reduce((a, b) => a + b, 0) / aves.length).toFixed(2);
    };

    // ============================================================
    // RENDER ROADMAP
    // ============================================================
    const renderRoadmap = () => {
        const roadmap = buildRoadmap();

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {roadmap.map((grade, idx) => {
                    // ===== COLOR CODING =====
                    // Green = completed (previous years)
                    // Blue = current enrollment
                    // White/gray = future (wala pa naabot)
                    let bgColor, borderColor, headerBg, headerText, badgeColor;
                    
                    if (grade.status === 'current') {
                        // 🔵 BLUE = Current school year
                        bgColor = '#dbeafe';
                        borderColor = '#3b82f6';
                        headerBg = 'linear-gradient(135deg, #1a56db, #3b82f6)';
                        headerText = 'white';
                        badgeColor = { bg: '#1a56db', color: 'white', label: 'Current' };
                    } else if (grade.status === 'completed') {
                        // 🟢 GREEN = Completed school years
                        bgColor = '#dcfce7';
                        borderColor = '#10b981';
                        headerBg = 'linear-gradient(135deg, #059669, #10b981)';
                        headerText = 'white';
                        badgeColor = { bg: '#10b981', color: 'white', label: 'Completed' };
                    } else if (grade.status === 'failed') {
                        bgColor = '#fee2e2';
                        borderColor = '#ef4444';
                        headerBg = 'linear-gradient(135deg, #dc2626, #ef4444)';
                        headerText = 'white';
                        badgeColor = { bg: '#dc2626', color: 'white', label: 'Failed' };
                    } else {
                        // ⚪ WHITE = Future (not yet reached)
                        bgColor = '#f9fafb';
                        borderColor = '#e5e7eb';
                        headerBg = '#f3f4f6';
                        headerText = '#6b7280';
                        badgeColor = { bg: '#e5e7eb', color: '#6b7280', label: 'Not Yet Enrolled' };
                    }

                    const overallAve = calculateOverallAverage(grade.subjects);

                    return (
                        <div
                            key={grade.grade_level}
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                border: `2px solid ${borderColor}`,
                                overflow: 'hidden',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                            }}
                        >
                            {/* Header */}
                            <div style={{
                                padding: '16px 24px',
                                background: headerBg,
                                color: headerText,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: '12px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                    <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>
                                        🎓 {grade.grade_level}
                                    </h3>
                                    {grade.school_year && (
                                        <span style={{
                                            fontSize: '13px',
                                            opacity: 0.95,
                                            background: 'rgba(255,255,255,0.2)',
                                            padding: '4px 12px',
                                            borderRadius: '12px'
                                        }}>
                                            S.Y. {grade.school_year}
                                        </span>
                                    )}
                                    {grade.section && (
                                        <span style={{
                                            fontSize: '13px',
                                            opacity: 0.95,
                                            background: 'rgba(255,255,255,0.2)',
                                            padding: '4px 12px',
                                            borderRadius: '12px'
                                        }}>
                                            {grade.section}
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {overallAve && (
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            background: 'rgba(255,255,255,0.2)',
                                            padding: '6px 14px',
                                            borderRadius: '12px'
                                        }}>
                                            Overall Ave: {overallAve}
                                        </div>
                                    )}
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        background: badgeColor.bg,
                                        color: badgeColor.color,
                                        padding: '4px 12px',
                                        borderRadius: '12px',
                                        textTransform: 'uppercase'
                                    }}>
                                        {badgeColor.label}
                                    </span>
                                </div>
                            </div>

                            {/* Body */}
                            {grade.status === 'future' ? (
                                // ⚪ Future — No data
                                <div style={{
                                    padding: '40px 20px',
                                    textAlign: 'center',
                                    background: '#f9fafb',
                                    color: '#9ca3af'
                                }}>
                                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>⏳</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#6b7280' }}>
                                        Wala pa naabot ang student ani nga grade
                                    </div>
                                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                                        Mag-enroll pa sa {grade.grade_level}
                                    </div>
                                </div>
                            ) : grade.subjects.length === 0 ? (
                                // Enrolled pero walay subjects nga naka-setup
                                <div style={{
                                    padding: '40px 20px',
                                    textAlign: 'center',
                                    background: bgColor,
                                    color: '#6b7280'
                                }}>
                                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>📚</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600' }}>
                                        Wala pay subjects nga gi-setup for {grade.grade_level}
                                    </div>
                                </div>
                            ) : (
                                // Table with subjects + grades
                                <div style={{ overflowX: 'auto', background: bgColor }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.5)' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Subject</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', width: '70px' }}>Q1</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', width: '70px' }}>Q2</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', width: '70px' }}>Q3</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', width: '70px' }}>Q4</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', width: '100px' }}>Final Ave</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', width: '140px' }}>Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {grade.subjects.map((subject, sidx) => (
                                                <tr
                                                    key={sidx}
                                                    style={{
                                                        borderTop: '1px solid rgba(0,0,0,0.05)',
                                                        background: sidx % 2 === 0 ? 'rgba(255,255,255,0.4)' : 'transparent'
                                                    }}
                                                >
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                                                        {subject.subject_name}
                                                    </td>
                                                    {[subject.q1, subject.q2, subject.q3, subject.q4].map((q, qi) => (
                                                        <td key={qi} style={{
                                                            padding: '12px 16px',
                                                            textAlign: 'center',
                                                            fontSize: '14px',
                                                            fontWeight: '500',
                                                            color: q ? getGradeColor(q) : '#9ca3af'
                                                        }}>
                                                            {q ? parseFloat(q).toFixed(2) : '—'}
                                                        </td>
                                                    ))}
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        {subject.finalAve ? (
                                                            <span style={{
                                                                padding: '4px 12px',
                                                                borderRadius: '10px',
                                                                fontSize: '13px',
                                                                fontWeight: '700',
                                                                background: '#dbeafe',
                                                                color: getGradeColor(subject.finalAve)
                                                            }}>
                                                                {subject.finalAve}
                                                            </span>
                                                        ) : '—'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                                                        {subject.remarks || '—'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f0f4ff 0%, #e8ecf1 50%, #f5f3ff 100%)',
            fontFamily: 'Segoe UI, Arial, sans-serif',
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
                <div style={{ padding: '28px 24px 20px', borderBottom: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                            width: '44px', height: '44px', borderRadius: '12px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '22px', boxShadow: '0 4px 15px rgba(26,86,219,0.3)'
                        }}>🎓</div>
                        <div>
                            <span style={{ fontSize: '20px', fontWeight: '800', color: '#1f2937' }}>NCDC</span>
                            <br />
                            <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>Admin Panel</span>
                        </div>
                    </div>
                </div>

                <Link to="/admin/profile" style={{
                    textDecoration: 'none', padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    cursor: 'pointer', flexShrink: 0
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
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
                            user?.username?.charAt(0).toUpperCase() || 'A'
                        )}
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                            {user?.username || 'Admin'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Administrator</div>
                    </div>
                </Link>

                <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    {menuItems.map((item) => (
                        <Link key={item.id} to={item.path} style={{
                            display: 'flex', alignItems: 'center', gap: '14px',
                            width: '100%', padding: '12px 16px', borderRadius: '12px',
                            textDecoration: 'none',
                            background: isActive(item.path) ? `linear-gradient(135deg, ${item.color}15, ${item.color}08)` : 'transparent',
                            color: isActive(item.path) ? item.color : '#6b7280',
                            fontWeight: isActive(item.path) ? '600' : '500',
                            fontSize: '14px', transition: 'all 0.3s ease',
                            marginBottom: '4px', position: 'relative', boxSizing: 'border-box'
                        }}
                        onMouseEnter={(e) => {
                            if (!isActive(item.path)) {
                                e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                                e.currentTarget.style.transform = 'translateX(4px)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isActive(item.path)) {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.transform = 'translateX(0)';
                            }
                        }}>
                            {isActive(item.path) && (
                                <span style={{
                                    position: 'absolute', left: '0', top: '50%',
                                    transform: 'translateY(-50%)', width: '4px', height: '28px',
                                    background: `linear-gradient(180deg, ${item.color}, ${item.color}80)`,
                                    borderRadius: '0 4px 4px 0'
                                }} />
                            )}
                            <span style={{ fontSize: '18px', width: '24px' }}>{item.icon}</span>
                            <span>{item.label}</span>
                        </Link>
                    ))}
                </div>

                <div style={{
                    padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.2)',
                    flexShrink: 0, background: 'rgba(255,255,255,0.3)'
                }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '12px',
                            width: '100%', padding: '10px 14px', borderRadius: '10px',
                            border: 'none', background: 'transparent', color: '#ef4444',
                            fontWeight: '500', cursor: 'pointer', fontSize: '14px',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(239,68,68,0.08)';
                            e.target.style.transform = 'translateX(4px)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.background = 'transparent';
                            e.target.style.transform = 'translateX(0)';
                        }}
                    >
                        <span style={{ fontSize: '18px', width: '24px' }}>🚪</span>
                        Logout
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT */}
            <div style={{
                flex: 1, marginLeft: '280px', padding: '32px 36px',
                minHeight: '100vh', overflowY: 'auto'
            }}>
                <div style={{ marginBottom: '28px' }}>
                    <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '800', letterSpacing: '-0.5px' }}>
                        📚 Student Academic History
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '15px' }}>
                        Complete curriculum roadmap — Grade 1 to Grade 6
                    </p>
                </div>

                {/* Search */}
                <div style={{
                    background: 'white', padding: '20px', borderRadius: '14px',
                    marginBottom: '24px', border: '1px solid #e5e7eb',
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
                            <button
                                onClick={handleClearSelection}
                                style={{
                                    position: 'absolute', right: '10px', top: '50%',
                                    transform: 'translateY(-50%)', background: '#e5e7eb',
                                    border: 'none', width: '26px', height: '26px',
                                    borderRadius: '50%', cursor: 'pointer',
                                    fontSize: '14px', color: '#6b7280'
                                }}
                            >×</button>
                        )}
                    </div>

                    {showResults && searchTerm && !selectedStudent && (
                        <div style={{
                            position: 'absolute', top: 'calc(100% - 12px)',
                            left: '20px', right: '20px',
                            background: 'white', border: '1px solid #e5e7eb',
                            borderRadius: '8px', maxHeight: '300px',
                            overflowY: 'auto',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
                            zIndex: 100, marginTop: '8px'
                        }}>
                            {filteredStudents.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                                    No students found
                                </div>
                            ) : (
                                filteredStudents.slice(0, 20).map(s => (
                                    <div
                                        key={s.application_id}
                                        onClick={() => handleSelectStudent(s)}
                                        style={{
                                            padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
                                            cursor: 'pointer', transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4ff'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
                                    >
                                        <div style={{ fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                                            {s.first_name} {s.middle_name || ''} {s.last_name}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                            {s.student_public_id || 'No ID'} — {s.current_grade_level || 'No grade'}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {showResults && searchTerm && !selectedStudent && (
                    <div
                        onClick={() => setShowResults(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 5, background: 'transparent' }}
                    />
                )}

                {/* History Content */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                        ⏳ Loading student history...
                    </div>
                ) : history ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Student Info Card */}
                        <div style={{
                            background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                            borderRadius: '16px', padding: '24px',
                            color: 'white', boxShadow: '0 8px 25px rgba(26,86,219,0.3)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                                <div style={{
                                    width: '72px', height: '72px', borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.2)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '28px', fontWeight: '700'
                                }}>
                                    {history.student.first_name?.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700' }}>
                                        {history.student.first_name} {history.student.middle_name || ''} {history.student.last_name}
                                    </h2>
                                    <div style={{ marginTop: '6px', fontSize: '14px', opacity: 0.95 }}>
                                        🆔 {history.student.public_id || 'No ID'} &nbsp;|&nbsp;
                                        📧 {history.student.email || 'No email'} &nbsp;|&nbsp;
                                        📞 {history.student.contact_number || 'No contact'}
                                    </div>
                                </div>
                            </div>
                            <div style={{
                                marginTop: '20px', display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                gap: '12px'
                            }}>
                                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 16px', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '12px', opacity: 0.9 }}>Current Grade</div>
                                    <div style={{ fontSize: '16px', fontWeight: '700' }}>{history.student.current_grade_level || '—'}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 16px', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '12px', opacity: 0.9 }}>Section</div>
                                    <div style={{ fontSize: '16px', fontWeight: '700' }}>{history.student.current_section || '—'}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.15)', padding: '12px 16px', borderRadius: '10px' }}>
                                    <div style={{ fontSize: '12px', opacity: 0.9 }}>Status</div>
                                    <div style={{ fontSize: '16px', fontWeight: '700', textTransform: 'capitalize' }}>
                                        {history.student.enrollment_status || '—'}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Legend */}
                        <div style={{
                            background: 'white', padding: '16px 20px', borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            display: 'flex', gap: '20px', flexWrap: 'wrap',
                            fontSize: '13px', fontWeight: '600'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#dcfce7', border: '2px solid #10b981' }}></span>
                                <span style={{ color: '#065f46' }}>Completed</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#dbeafe', border: '2px solid #3b82f6' }}></span>
                                <span style={{ color: '#1e40af' }}>Currently Enrolled</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#f9fafb', border: '2px solid #e5e7eb' }}></span>
                                <span style={{ color: '#6b7280' }}>Not Yet Enrolled</span>
                            </div>
                        </div>

                        {/* Roadmap — Grade 1 to 6 */}
                        {renderRoadmap()}
                    </div>
                ) : (
                    <div style={{
                        background: 'white', padding: '60px', borderRadius: '14px',
                        textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb'
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '12px' }}>📚</div>
                        <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>Search for a Student</h3>
                        <p>Type a student's name or ID above to view their complete Grade 1-6 academic roadmap.</p>
                    </div>
                )}

                <div style={{
                    marginTop: '32px', paddingTop: '20px',
                    borderTop: '1px solid rgba(0,0,0,0.05)', textAlign: 'center'
                }}>
                    <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                        Nurturing Today, <strong style={{ color: '#1a56db' }}>Empowering Tomorrow</strong>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StudentHistory;