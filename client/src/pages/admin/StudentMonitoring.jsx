import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';

const StudentMonitoring = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [studentsByGrade, setStudentsByGrade] = useState({});
    const [studentsBySection, setStudentsBySection] = useState([]);
    const [studentsByStatus, setStudentsByStatus] = useState([]);
    const [summary, setSummary] = useState({});
    const [allEnrollments, setAllEnrollments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('grade');
    const [profilePic, setProfilePic] = useState(null);

    // Graduate State
    const [graduating, setGraduating] = useState(null);
    const [showGraduateModal, setShowGraduateModal] = useState(false);
    const [graduateStudent, setGraduateStudent] = useState(null);
    const [graduateRemarks, setGraduateRemarks] = useState('');
    const [graduateMessage, setGraduateMessage] = useState({ type: '', text: '' });

    // View Section Modal
    const [showSectionModal, setShowSectionModal] = useState(false);
    const [viewingSection, setViewingSection] = useState(null);

    const user = JSON.parse(localStorage.getItem('user'));
    const currentPath = location.pathname;

    useEffect(() => {
        if (!user || user.role !== 'admin') {
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        if (user && user.role === 'admin') {
            fetchProfile();
            fetchAllData();
        }
    }, []);

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

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [gradeRes, sectionRes, statusRes, summaryRes, enrollRes] = await Promise.all([
                API.get('/admin/reports/students-by-grade').catch(() => ({ data: {} })),
                API.get('/admin/reports/students-by-section').catch(() => ({ data: [] })),
                API.get('/admin/reports/students-by-status').catch(() => ({ data: [] })),
                API.get('/admin/reports/summary').catch(() => ({ data: {} })),
                API.get('/registrar/enrollments').catch(() => ({ data: [] }))
            ]);

            setStudentsByGrade(gradeRes.data || {});
            setStudentsBySection(sectionRes.data || []);
            setStudentsByStatus(statusRes.data || []);
            setSummary(summaryRes.data || {});
            setAllEnrollments(Array.isArray(enrollRes.data) ? enrollRes.data : []);
        } catch (error) {
            console.error('Error fetching monitoring data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStudentsInSection = (sectionId) => {
        if (!sectionId) return [];
        return allEnrollments.filter(e => {
            const enrollmentSectionId = parseInt(e.section_id);
            const targetSectionId = parseInt(sectionId);
            return enrollmentSectionId === targetSectionId && e.status === 'enrolled';
        });
    };

    const handleViewSection = (section) => {
        setViewingSection(section);
        setShowSectionModal(true);
    };

    // ✅ Open Graduate Modal
    const handleOpenGraduate = (student) => {
        setGraduateStudent(student);
        setGraduateRemarks('');
        setGraduateMessage({ type: '', text: '' });
        setShowGraduateModal(true);
    };

    // ✅ Confirm Graduate
    const handleConfirmGraduate = async () => {
        if (!graduateStudent) return;

        const confirm = window.confirm(
            `🎓 GRADUATE STUDENT?\n\n` +
            `Name: ${graduateStudent.first_name} ${graduateStudent.middle_name || ''} ${graduateStudent.last_name}\n` +
            `Student ID: ${graduateStudent.public_id}\n` +
            `Current Grade: ${graduateStudent.current_grade_level}\n\n` +
            `⚠️ Kini nga aksyon kay dili ma-undo.\n` +
            `Ang student ma-mark as "Graduated" ug dili na ma-enroll pag-usab.\n\n` +
            `Magpadayon?`
        );

        if (!confirm) return;

        setGraduating(graduateStudent.student_id);
        setGraduateMessage({ type: '', text: '' });

        try {
            const res = await API.post(`/admin/graduate-student/${graduateStudent.student_id}`, {
                adminId: user.id,
                remarks: graduateRemarks || 'Graduated successfully'
            });

            setGraduateMessage({ type: 'success', text: res.data.message });

            // Refresh data
            await fetchAllData();

            setTimeout(() => {
                setShowGraduateModal(false);
                setGraduateStudent(null);
                setGraduateRemarks('');
                setGraduateMessage({ type: '', text: '' });
            }, 2000);
        } catch (err) {
            console.error('Graduate error:', err);
            setGraduateMessage({
                type: 'error',
                text: err.response?.data?.error || 'Failed to graduate student'
            });
        } finally {
            setGraduating(null);
        }
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

    const filterStudents = (students) => {
        if (!searchTerm.trim()) return students;
        const search = searchTerm.toLowerCase();
        return students.filter(s => {
            const name = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
            return name.includes(search) || (s.public_id || '').toLowerCase().includes(search);
        });
    };

    const statusColor = (status) => {
        const colors = {
            enrolled: { bg: '#dbeafe', color: '#1a56db' },
            passed: { bg: '#d1fae5', color: '#065f46' },
            failed: { bg: '#fee2e2', color: '#991b1b' },
            dropped: { bg: '#fef3c7', color: '#92400e' },
            transferred: { bg: '#e0e7ff', color: '#4338ca' },
            graduated: { bg: '#ddd6fe', color: '#6d28d9' }
        };
        return colors[status] || colors.enrolled;
    };

    const renderGradeView = () => {
        const grades = Object.keys(studentsByGrade).sort();
        if (grades.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                    No students enrolled yet.
                </div>
            );
        }
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {grades.map(grade => {
                    const filtered = filterStudents(studentsByGrade[grade]);
                    if (filtered.length === 0 && searchTerm) return null;
                    const isGrade6 = grade === 'Grade 6';
                    return (
                        <div key={grade} style={{
                            background: 'white', borderRadius: '14px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            overflow: 'hidden'
                        }}>
                            <div style={{
                                padding: '16px 24px',
                                background: isGrade6 
                                    ? 'linear-gradient(135deg, #7c3aed, #a855f7)' 
                                    : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                color: 'white',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                                        🎓 {grade}
                                    </h3>
                                    <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
                                        {studentsByGrade[grade].length} student(s)
                                        {isGrade6 && ' — Pwede na i-graduate kung passed tanan subjects'}
                                    </p>
                                </div>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Student ID</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Section</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map((student, idx) => (
                                            <tr key={student.student_id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{idx + 1}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#1a56db' }}>
                                                    {student.public_id || '—'}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                                                    {student.first_name} {student.middle_name || ''} {student.last_name}
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>
                                                    {student.current_section || '—'}
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{
                                                        padding: '4px 12px', borderRadius: '12px',
                                                        fontSize: '12px', fontWeight: '600',
                                                        background: '#d1fae5', color: '#065f46'
                                                    }}>
                                                        {student.enrollment_status || 'active'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                                        <Link to={`/admin/student-history?studentId=${student.student_id}`} style={{
                                                            background: '#dbeafe', color: '#1a56db',
                                                            textDecoration: 'none', padding: '6px 14px',
                                                            borderRadius: '6px', fontSize: '12px', fontWeight: '600'
                                                        }}>
                                                            👁️ History
                                                        </Link>
                                                        {/* ✅ GRADUATE BUTTON — Only Grade 6 */}
                                                        {isGrade6 && student.enrollment_status !== 'graduated' && (
                                                            <button
                                                                onClick={() => handleOpenGraduate(student)}
                                                                style={{
                                                                    background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                                                                    color: 'white',
                                                                    border: 'none',
                                                                    padding: '6px 14px',
                                                                    borderRadius: '6px',
                                                                    fontSize: '12px',
                                                                    fontWeight: '600',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    gap: '4px'
                                                                }}
                                                            >
                                                                🎓 Graduate
                                                            </button>
                                                        )}
                                                        {student.enrollment_status === 'graduated' && (
                                                            <span style={{
                                                                padding: '6px 14px',
                                                                background: '#ddd6fe',
                                                                color: '#6d28d9',
                                                                borderRadius: '6px',
                                                                fontSize: '12px',
                                                                fontWeight: '600'
                                                            }}>
                                                                🎓 Graduated
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderSectionView = () => {
        const filtered = studentsBySection.filter(s => {
            if (!searchTerm.trim()) return true;
            const search = searchTerm.toLowerCase();
            return (s.section_name || '').toLowerCase().includes(search) ||
                   (s.grade_level || '').toLowerCase().includes(search);
        });

        if (filtered.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                    No sections found.
                </div>
            );
        }

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                {filtered.map(section => {
                    const studentCount = getStudentsInSection(section.section_id).length;
                    return (
                        <div
                            key={section.section_id}
                            onClick={() => handleViewSection(section)}
                            style={{
                                background: 'white', padding: '20px', borderRadius: '14px',
                                border: '1px solid #e5e7eb',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                                borderLeft: '4px solid #06b6d4',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-4px)';
                                e.currentTarget.style.boxShadow = '0 12px 30px rgba(6,182,212,0.15)';
                                e.currentTarget.style.borderLeftColor = '#3b82f6';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
                                e.currentTarget.style.borderLeftColor = '#06b6d4';
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <h3 style={{ margin: '0 0 5px', color: '#1f2937', fontSize: '18px' }}>
                                        {section.section_name}
                                    </h3>
                                    <span style={{
                                        display: 'inline-block', padding: '3px 10px',
                                        background: '#dbeafe', color: '#1a56db',
                                        borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                                    }}>
                                        {section.grade_level}
                                    </span>
                                </div>
                            </div>
                            <div style={{ marginTop: '15px', fontSize: '14px', color: '#475569' }}>
                                <div style={{ marginBottom: '6px' }}>
                                    📅 SY: <strong>{section.school_year || 'N/A'}</strong>
                                </div>
                                <div style={{ marginBottom: '6px' }}>
                                    👥 Students: <strong>{studentCount} / {section.max_students || 40}</strong>
                                </div>
                            </div>
                            <div style={{ marginTop: '12px', height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{
                                    height: '100%',
                                    width: `${Math.min((studentCount / (section.max_students || 40)) * 100, 100)}%`,
                                    background: 'linear-gradient(90deg, #06b6d4, #3b82f6)',
                                    transition: 'width 0.5s ease'
                                }} />
                            </div>
                            <div style={{
                                marginTop: '12px', paddingTop: '10px',
                                borderTop: '1px solid #f3f4f6',
                                textAlign: 'center', fontSize: '12px',
                                color: '#1a56db', fontWeight: '600'
                            }}>
                                👁️ Click to view enrolled students
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderStatusView = () => {
        const statusColors = {
            active: { bg: '#d1fae5', color: '#065f46', icon: '✅' },
            enrolled: { bg: '#dbeafe', color: '#1a56db', icon: '🎓' },
            graduated: { bg: '#ddd6fe', color: '#6d28d9', icon: '🎓' },
            failed: { bg: '#fee2e2', color: '#991b1b', icon: '❌' },
            dropped: { bg: '#fef3c7', color: '#92400e', icon: '⚠️' },
            transferred: { bg: '#e0e7ff', color: '#4338ca', icon: '➡️' }
        };

        if (studentsByStatus.length === 0) {
            return (
                <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                    <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                    No status data available.
                </div>
            );
        }

        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                {studentsByStatus.map((item, idx) => {
                    const sc = statusColors[item.enrollment_status] || { bg: '#f3f4f6', color: '#6b7280', icon: '❓' };
                    return (
                        <div key={idx} style={{
                            background: 'white', padding: '24px', borderRadius: '14px',
                            border: '1px solid #e5e7eb',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            borderTop: `4px solid ${sc.color}`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500', textTransform: 'capitalize' }}>
                                        {item.enrollment_status}
                                    </div>
                                    <div style={{ fontSize: '32px', fontWeight: '800', color: sc.color, marginTop: '4px' }}>
                                        {item.count}
                                    </div>
                                </div>
                                <div style={{ fontSize: '32px', opacity: 0.6 }}>{sc.icon}</div>
                            </div>
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
                            <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>Principal Panel</span>
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
                            user?.username?.charAt(0).toUpperCase() || 'P'
                        )}
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                            {user?.username || 'Principal'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Principal</div>
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
                    <button onClick={handleLogout} style={{
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
                    }}>
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
                        👁️ Student Monitoring
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '15px' }}>
                        Overview of all students by grade, section, and status
                    </p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '16px',
                    marginBottom: '28px'
                }}>
                    {[
                        { label: 'Active Students', value: summary.active_students || 0, icon: '👨‍🎓', color: '#10b981' },
                        { label: 'Graduated', value: summary.graduated_students || 0, icon: '🎓', color: '#8b5cf6' },
                        { label: 'Failed', value: summary.failed_students || 0, icon: '❌', color: '#ef4444' },
                        { label: 'Dropped', value: summary.dropped_students || 0, icon: '⚠️', color: '#f59e0b' },
                        { label: 'Total Sections', value: summary.total_sections || 0, icon: '🏫', color: '#06b6d4' },
                        { label: 'Current Enrollments', value: summary.current_enrollments || 0, icon: '📝', color: '#3b82f6' }
                    ].map((stat, idx) => (
                        <div key={idx} style={{
                            background: 'rgba(255,255,255,0.7)',
                            backdropFilter: 'blur(20px)',
                            padding: '20px',
                            borderRadius: '14px',
                            border: '1px solid rgba(255,255,255,0.3)',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
                            borderTop: `4px solid ${stat.color}`
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>{stat.label}</div>
                                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#1f2937', marginTop: '4px' }}>
                                        {stat.value}
                                    </div>
                                </div>
                                <div style={{ fontSize: '28px', opacity: 0.6 }}>{stat.icon}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{
                    background: 'white', padding: '16px 20px', borderRadius: '12px',
                    marginBottom: '24px', border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center'
                }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Search by name, ID, section, or grade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 16px',
                                border: '1px solid #e5e7eb', borderRadius: '8px',
                                fontSize: '14px', outline: 'none', background: '#f9fafb',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[
                            { id: 'grade', label: '📚 By Grade' },
                            { id: 'section', label: '🏫 By Section' },
                            { id: 'status', label: '📊 By Status' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: activeTab === tab.id ? 'linear-gradient(135deg, #1a56db, #3b82f6)' : '#f3f4f6',
                                    color: activeTab === tab.id ? 'white' : '#6b7280',
                                    fontWeight: '600',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                        ⏳ Loading monitoring data...
                    </div>
                ) : (
                    <>
                        {activeTab === 'grade' && renderGradeView()}
                        {activeTab === 'section' && renderSectionView()}
                        {activeTab === 'status' && renderStatusView()}
                    </>
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

            {/* ✅ GRADUATE MODAL */}
            {showGraduateModal && graduateStudent && (
                <div
                    onClick={() => !graduating && setShowGraduateModal(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: '20px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'white', borderRadius: '16px',
                            maxWidth: '500px', width: '100%', padding: '32px',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
                        }}
                    >
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ fontSize: '64px', marginBottom: '8px' }}>🎓</div>
                            <h2 style={{ fontSize: '22px', color: '#1f2937', margin: '0 0 8px' }}>
                                Graduate Student
                            </h2>
                            <p style={{ color: '#6b7280', fontSize: '14px' }}>
                                Kini nga aksyon kay dili ma-undo.
                            </p>
                        </div>

                        {/* Student Info */}
                        <div style={{
                            background: '#f0f4ff', padding: '16px', borderRadius: '12px',
                            marginBottom: '16px'
                        }}>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>Student</div>
                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
                                {graduateStudent.first_name} {graduateStudent.middle_name || ''} {graduateStudent.last_name}
                            </div>
                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                {graduateStudent.public_id} • {graduateStudent.current_grade_level}
                            </div>
                        </div>

                        {graduateMessage.text && (
                            <div style={{
                                padding: '12px 16px', borderRadius: '8px',
                                marginBottom: '16px',
                                background: graduateMessage.type === 'success' ? '#d1fae5' : '#fee2e2',
                                color: graduateMessage.type === 'success' ? '#065f46' : '#991b1b',
                                border: `1px solid ${graduateMessage.type === 'success' ? '#34d399' : '#fca5a5'}`,
                                fontSize: '14px'
                            }}>
                                {graduateMessage.text}
                            </div>
                        )}

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{
                                display: 'block', fontSize: '13px', fontWeight: '600',
                                color: '#374151', marginBottom: '6px'
                            }}>
                                Graduation Remarks (Optional)
                            </label>
                            <textarea
                                value={graduateRemarks}
                                onChange={(e) => setGraduateRemarks(e.target.value)}
                                placeholder="e.g., Graduated with honors, Complete requirements..."
                                rows={3}
                                disabled={graduating}
                                style={{
                                    width: '100%', padding: '10px 14px',
                                    border: '1px solid #d1d5db', borderRadius: '8px',
                                    fontSize: '14px', outline: 'none',
                                    resize: 'vertical', boxSizing: 'border-box'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setShowGraduateModal(false)}
                                disabled={graduating}
                                style={{
                                    flex: 1, padding: '12px', background: '#f3f4f6',
                                    color: '#6b7280', border: '1px solid #d1d5db',
                                    borderRadius: '10px', fontWeight: '600',
                                    cursor: graduating ? 'not-allowed' : 'pointer',
                                    fontSize: '14px'
                                }}
                            >Cancel</button>
                            <button
                                onClick={handleConfirmGraduate}
                                disabled={graduating}
                                style={{
                                    flex: 1, padding: '12px',
                                    background: graduating ? '#c4b5fd' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                                    color: 'white', border: 'none', borderRadius: '10px',
                                    fontWeight: '600', cursor: graduating ? 'not-allowed' : 'pointer',
                                    fontSize: '14px'
                                }}
                            >{graduating ? 'Graduating...' : '🎓 Confirm Graduate'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SECTION MODAL */}
            {showSectionModal && viewingSection && (
                <div
                    onClick={() => setShowSectionModal(false)}
                    style={{
                        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, padding: '20px', overflowY: 'auto'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'white', borderRadius: '16px',
                            maxWidth: '800px', width: '100%', maxHeight: '90vh',
                            overflowY: 'auto', padding: '32px',
                            boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
                        }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div>
                                <h2 style={{ fontSize: '24px', color: '#1f2937', margin: 0, fontWeight: '700' }}>
                                    🏫 {viewingSection.section_name}
                                </h2>
                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                    <span style={{
                                        padding: '4px 12px', background: '#dbeafe', color: '#1a56db',
                                        borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                                    }}>{viewingSection.grade_level}</span>
                                    <span style={{
                                        padding: '4px 12px', background: '#f3f4f6', color: '#6b7280',
                                        borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                                    }}>SY: {viewingSection.school_year}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowSectionModal(false)}
                                style={{
                                    background: 'transparent', border: 'none',
                                    fontSize: '24px', cursor: 'pointer', color: '#9ca3af'
                                }}
                            >×</button>
                        </div>

                        <div style={{
                            background: '#f0f4ff', padding: '16px 20px', borderRadius: '12px',
                            marginBottom: '20px'
                        }}>
                            <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Enrolled Students</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: '#1a56db' }}>
                                {getStudentsInSection(viewingSection.section_id).length} / {viewingSection.max_students || 40}
                            </div>
                        </div>

                        {getStudentsInSection(viewingSection.section_id).length === 0 ? (
                            <div style={{
                                padding: '60px 20px', textAlign: 'center',
                                background: '#f9fafb', borderRadius: '12px',
                                border: '1px dashed #d1d5db'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                                <h3 style={{ color: '#1f2937', marginBottom: '8px', fontSize: '18px' }}>
                                    No Students Enrolled Yet
                                </h3>
                                <p style={{ color: '#6b7280', fontSize: '14px' }}>
                                    Wala pay students nga na-enroll sa section nga ito.
                                </p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Student ID</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>SY</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {getStudentsInSection(viewingSection.section_id).map((student, index) => {
                                            const sc = statusColor(student.status);
                                            return (
                                                <tr key={student.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{index + 1}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#1a56db' }}>
                                                        {student.public_id || '—'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                                                        {student.first_name} {student.middle_name || ''} {student.last_name}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                                                        {student.school_year}
                                                    </td>
                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{
                                                            padding: '4px 12px', borderRadius: '12px',
                                                            fontSize: '12px', fontWeight: '600',
                                                            background: sc.bg, color: sc.color
                                                        }}>{student.status}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setShowSectionModal(false)}
                                style={{
                                    padding: '10px 24px', background: '#f3f4f6',
                                    color: '#6b7280', border: '1px solid #d1d5db',
                                    borderRadius: '8px', fontWeight: '600',
                                    cursor: 'pointer', fontSize: '14px'
                                }}
                            >Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentMonitoring;