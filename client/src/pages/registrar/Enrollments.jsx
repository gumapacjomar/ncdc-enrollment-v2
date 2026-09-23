import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';

const Enrollments = () => {
    const navigate = useNavigate();
    const [enrollments, setEnrollments] = useState([]);
    const [sections, setSections] = useState([]);
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [filterGrade, setFilterGrade] = useState('');

    // Search Student State
    const [studentSearch, setStudentSearch] = useState('');
    const [showStudentResults, setShowStudentResults] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // ✅ Eligibility State
    const [eligibility, setEligibility] = useState(null);
    const [loadingEligibility, setLoadingEligibility] = useState(false);

    const [formData, setFormData] = useState({
        student_id: '',
        grade_level: '',
        section_id: '',
        school_year: '2026-2027',
        status: 'enrolled',
        remarks: ''
    });

    const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];
    const statuses = ['enrolled', 'passed', 'failed', 'dropped', 'transferred', 'graduated'];

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
        fetchData();
        fetchSections();
        fetchStudents();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await API.get('/registrar/enrollments');
            setEnrollments(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load enrollments' });
        } finally {
            setLoading(false);
        }
    };

    const fetchSections = async () => {
        try {
            const res = await API.get('/registrar/sections');
            setSections(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch sections error:', err);
        }
    };

    const fetchStudents = async () => {
        try {
            const res = await API.get('/admin/applications');
            const confirmed = (res.data || []).filter(app => app.status === 'confirmed');
            setStudents(confirmed);
        } catch (err) {
            console.error('Fetch students error:', err);
        }
    };

    const handleAdd = () => {
        setEditingItem(null);
        setSelectedStudent(null);
        setStudentSearch('');
        setShowStudentResults(false);
        setEligibility(null);
        setFormData({
            student_id: '',
            grade_level: '',
            section_id: '',
            school_year: '2026-2027',
            status: 'enrolled',
            remarks: ''
        });
        setShowModal(true);
        setMessage({ type: '', text: '' });
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setSelectedStudent({
            student_id: item.student_id,
            first_name: item.first_name,
            middle_name: item.middle_name,
            last_name: item.last_name,
            student_public_id: item.public_id
        });
        setStudentSearch(`${item.first_name} ${item.middle_name || ''} ${item.last_name}`);
        setShowStudentResults(false);
        setEligibility(null); // Hide eligibility during edit
        setFormData({
            student_id: item.student_id || '',
            grade_level: item.grade_level || '',
            section_id: item.section_id || '',
            school_year: item.school_year || '2026-2027',
            status: item.status || 'enrolled',
            remarks: item.remarks || ''
        });
        setShowModal(true);
        setMessage({ type: '', text: '' });
    };

    // ✅ Select Student + Fetch Eligibility
    const handleSelectStudent = async (student) => {
        setSelectedStudent(student);
        setStudentSearch(`${student.first_name} ${student.middle_name || ''} ${student.last_name}`);
        setShowStudentResults(false);
        setFormData(prev => ({ ...prev, student_id: student.student_id }));

        // Fetch eligibility
        setLoadingEligibility(true);
        try {
            const res = await API.get(`/registrar/enrollment-eligibility/${student.student_id}`);
            setEligibility(res.data);
            console.log('✅ Eligibility:', res.data);

            // Auto-suggest next grade level
            if (res.data.nextGradeLevel) {
                setFormData(prev => ({ ...prev, grade_level: res.data.nextGradeLevel }));
            }

            // Auto-set school year
            if (res.data.latestEnrollment?.school_year) {
                const lastYear = res.data.latestEnrollment.school_year;
                // Increment year (e.g., 2026-2027 → 2027-2028)
                const parts = lastYear.split('-');
                if (parts.length === 2) {
                    const startYear = parseInt(parts[0]) + 1;
                    const endYear = parseInt(parts[1]) + 1;
                    setFormData(prev => ({ ...prev, school_year: `${startYear}-${endYear}` }));
                }
            }
        } catch (err) {
            console.error('Eligibility fetch error:', err);
            setEligibility(null);
        } finally {
            setLoadingEligibility(false);
        }
    };

    const handleClearStudent = () => {
        setSelectedStudent(null);
        setStudentSearch('');
        setShowStudentResults(false);
        setEligibility(null);
        setFormData(prev => ({ ...prev, student_id: '', grade_level: '' }));
    };

    const handleSave = async () => {
        if (!formData.student_id) {
            setMessage({ type: 'error', text: 'Student is required' });
            return;
        }
        if (!formData.grade_level) {
            setMessage({ type: 'error', text: 'Grade level is required' });
            return;
        }

        // ✅ Warning kung retained pero nag-enroll sa higher grade
        if (eligibility?.eligibility === 'RETAINED' && eligibility.nextGradeLevel) {
            const shouldProceed = window.confirm(
                `⚠️ WARNING: Ang student kay "${eligibility.eligibility}" base sa iyang grades.\n\n` +
                `Recommended: ${eligibility.nextGradeLevel}\n` +
                `Napili nimo: ${formData.grade_level}\n\n` +
                `Gusto ba nimo i-proceed?`
            );
            if (!shouldProceed) return;
        }

        // ✅ Warning kung graduated na
        if (eligibility?.eligibility === 'GRADUATED') {
            const shouldProceed = window.confirm(
                `🎓 WARNING: Graduated na ang student.\n\n` +
                `Gusto ba nimo i-proceed gihapon sa enrollment?`
            );
            if (!shouldProceed) return;
        }

        try {
            setSaving(true);
            setMessage({ type: '', text: '' });
            const payload = {
                ...formData,
                student_id: parseInt(formData.student_id),
                section_id: formData.section_id ? parseInt(formData.section_id) : null,
                semester: 'Full Year'
            };
            if (editingItem) {
                await API.put(`/registrar/enrollments/${editingItem.id}`, payload);
            } else {
                await API.post('/registrar/enrollments', payload);
            }
            setShowModal(false);
            await fetchData();
            await fetchSections();
            setMessage({ type: 'success', text: editingItem ? 'Enrollment updated!' : 'Student enrolled!' });
        } catch (err) {
            console.error('Save error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save enrollment' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete enrollment for "${name}"?`)) return;
        try {
            await API.delete(`/registrar/enrollments/${id}`);
            await fetchData();
            await fetchSections();
            setMessage({ type: 'success', text: 'Enrollment deleted!' });
        } catch (err) {
            console.error('Delete error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete' });
        }
    };

    const filteredSections = formData.grade_level
        ? sections.filter(s => s.grade_level === formData.grade_level && s.status === 'active')
        : sections.filter(s => s.status === 'active');

    const filtered = filterGrade
        ? enrollments.filter(e => e.grade_level === filterGrade)
        : enrollments;

    const filteredStudents = students.filter(s => {
        if (!studentSearch.trim()) return true;
        const search = studentSearch.toLowerCase();
        const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
        const publicId = (s.student_public_id || '').toLowerCase();
        return fullName.includes(search) || publicId.includes(search);
    });

    const menuItems = [
        { id: 'applications', icon: '📋', label: 'Applications', type: 'link', path: '/registrar/dashboard' },
        { id: 'enrolled', icon: '🎓', label: 'Enrolled Students', type: 'link', path: '/registrar/dashboard' },
        { id: 'sections', icon: '🏫', label: 'Sections', type: 'link', path: '/registrar/sections' },
        { id: 'subjects', icon: '📚', label: 'Subjects', type: 'link', path: '/registrar/subjects' },
        { id: 'enrollments', icon: '📝', label: 'Enrollments', type: 'link', path: '/registrar/enrollments' },
        { id: 'grades', icon: '📊', label: 'Grades', type: 'link', path: '/registrar/grades' },
        { id: 'remarks', icon: '💬', label: 'Remarks', type: 'link', path: '/registrar/remarks' },
        { id: 'settings', icon: '⚙️', label: 'Settings', type: 'link', path: '/registrar/dashboard' }
    ];

    const currentPage = 'enrollments';

    const inputStyle = {
        width: '100%',
        padding: '10px 14px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        fontSize: '14px',
        marginTop: '4px',
        outline: 'none',
        boxSizing: 'border-box'
    };

    const labelStyle = {
        display: 'block',
        fontSize: '13px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '4px'
    };

    const statusColor = (status) => {
        const colors = {
            enrolled: { bg: '#dbeafe', color: '#1a56db' },
            passed: { bg: '#d1fae5', color: '#065f46' },
            failed: { bg: '#fee2e2', color: '#991b1b' },
            dropped: { bg: '#fef3c7', color: '#92400e' },
            transferred: { bg: '#e0e7ff', color: '#4338ca' },
            graduated: { bg: '#d1fae5', color: '#065f46' }
        };
        return colors[status] || colors.enrolled;
    };

    // ✅ Eligibility Card colors
    const eligibilityStyle = (type) => {
        const colors = {
            ELIGIBLE: { bg: '#d1fae5', color: '#065f46', border: '#34d399', icon: '✅', label: 'Eligible for Next Grade' },
            RETAINED: { bg: '#fef3c7', color: '#92400e', border: '#f59e0b', icon: '⚠️', label: 'Retained (Failed)' },
            CURRENTLY_ENROLLED: { bg: '#dbeafe', color: '#1a56db', border: '#60a5fa', icon: 'ℹ️', label: 'Currently Enrolled' },
            GRADUATED: { bg: '#e0e7ff', color: '#4338ca', border: '#818cf8', icon: '🎓', label: 'Graduated' },
            NOT_ELIGIBLE: { bg: '#fee2e2', color: '#991b1b', border: '#fca5a5', icon: '❌', label: 'Not Eligible' },
            NEW_STUDENT: { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db', icon: '🆕', label: 'New Student' },
            PENDING: { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db', icon: '⏳', label: 'Pending Review' }
        };
        return colors[type] || colors.PENDING;
    };

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
                            <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>Registrar Panel</span>
                        </div>
                    </div>
                </div>

                <Link to="/registrar/profile" style={{
                    textDecoration: 'none', padding: '20px 24px',
                    borderBottom: '1px solid rgba(255,255,255,0.2)',
                    display: 'flex', alignItems: 'center', gap: '14px',
                    cursor: 'pointer', transition: 'all 0.3s ease', flexShrink: 0
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
                            user?.username?.charAt(0).toUpperCase() || 'R'
                        )}
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                            {user?.username || 'Registrar'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>Registrar</div>
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
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                                    e.currentTarget.style.transform = 'translateX(4px)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.transform = 'translateX(0)';
                                }
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
                flex: 1, marginLeft: '280px', padding: '28px 36px',
                minHeight: '100vh', overflowY: 'auto'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '700', letterSpacing: '-0.5px' }}>
                            📝 Enrollments Management
                        </h1>
                        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                            Enroll students to sections per school year
                        </p>
                    </div>
                    <button
                        onClick={handleAdd}
                        style={{
                            background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                            color: 'white', border: 'none', padding: '10px 24px',
                            borderRadius: '10px', cursor: 'pointer', fontSize: '14px',
                            fontWeight: '600', boxShadow: '0 4px 15px rgba(26,86,219,0.3)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 8px 25px rgba(26,86,219,0.4)';
                        }}
                        onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 4px 15px rgba(26,86,219,0.3)';
                        }}
                    >➕ Enroll Student</button>
                </div>

                {message.text && (
                    <div style={{
                        padding: '12px 20px', borderRadius: '8px', marginBottom: '20px',
                        background: message.type === 'error' ? '#fee2e2' : '#d1fae5',
                        color: message.type === 'error' ? '#991b1b' : '#065f46',
                        border: `1px solid ${message.type === 'error' ? '#fca5a5' : '#34d399'}`
                    }}>{message.text}</div>
                )}

                <div style={{
                    background: 'white', padding: '16px 20px', borderRadius: '12px',
                    marginBottom: '24px', border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                    <label style={{ marginRight: '10px', fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                        Filter by Grade:
                    </label>
                    <select
                        value={filterGrade}
                        onChange={(e) => setFilterGrade(e.target.value)}
                        style={{
                            padding: '8px 14px', borderRadius: '8px',
                            border: '1px solid #d1d5db', fontSize: '14px',
                            minWidth: '160px', outline: 'none'
                        }}
                    >
                        <option value="">All Grades</option>
                        {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                </div>

                <div style={{
                    background: 'white', padding: '24px', borderRadius: '14px',
                    border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                            📋 All Enrollments
                        </h3>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            {filtered.length} enrollments
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                            ⏳ Loading enrollments...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
                            No enrollments found. Click "Enroll Student" to add one.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Student</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Grade</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Section</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>School Year</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((item, index) => {
                                        const sc = statusColor(item.status);
                                        return (
                                            <tr key={item.id} style={{ borderBottom: '1px solid #e5e7eb' }}
                                                onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{index + 1}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                                                    {item.first_name} {item.middle_name || ''} {item.last_name}
                                                    <div style={{ fontSize: '11px', color: '#6b7280' }}>{item.public_id}</div>
                                                </td>
                                                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937' }}>{item.grade_level}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{item.section_name || '—'}</td>
                                                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                                                    {item.school_year}
                                                </td>
                                                <td style={{ padding: '12px 16px' }}>
                                                    <span style={{
                                                        padding: '4px 12px', borderRadius: '12px',
                                                        fontSize: '12px', fontWeight: '600',
                                                        background: sc.bg, color: sc.color
                                                    }}>{item.status}</span>
                                                </td>
                                                <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        style={{
                                                            background: '#fef3c7', color: '#92400e',
                                                            border: 'none', padding: '6px 12px',
                                                            borderRadius: '6px', cursor: 'pointer',
                                                            fontSize: '12px', fontWeight: '600', marginRight: '6px'
                                                        }}
                                                    >✏️</button>
                                                    <button
                                                        onClick={() => handleDelete(item.id, `${item.first_name} ${item.last_name}`)}
                                                        style={{
                                                            background: '#fee2e2', color: '#991b1b',
                                                            border: 'none', padding: '6px 12px',
                                                            borderRadius: '6px', cursor: 'pointer',
                                                            fontSize: '12px', fontWeight: '600'
                                                        }}
                                                    >🗑️</button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div style={{
                    marginTop: '28px', paddingTop: '16px',
                    borderTop: '1px solid #e5e7eb', textAlign: 'center'
                }}>
                    <p style={{ fontSize: '13px', color: '#9ca3af' }}>
                        Nurturing Today, <strong style={{ color: '#1a56db' }}>Empowering Tomorrow</strong>
                    </p>
                </div>
            </div>

            {/* MODAL */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '20px', overflowY: 'auto'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '16px',
                        maxWidth: '650px', width: '100%', maxHeight: '90vh',
                        overflowY: 'auto', padding: '32px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                        position: 'relative', zIndex: 10
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '20px', color: '#1f2937', margin: 0 }}>
                                {editingItem ? '✏️ Edit Enrollment' : '➕ Enroll Student'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                style={{
                                    background: 'transparent', border: 'none',
                                    fontSize: '24px', cursor: 'pointer', color: '#9ca3af'
                                }}
                            >×</button>
                        </div>

                        {message.text && message.type === 'error' && (
                            <div style={{
                                padding: '10px 14px', background: '#fee2e2',
                                color: '#991b1b', borderRadius: '8px',
                                marginBottom: '15px', fontSize: '13px'
                            }}>{message.text}</div>
                        )}

                        {/* SEARCH STUDENT */}
                        <div style={{ marginBottom: '15px', position: 'relative' }}>
                            <label style={labelStyle}>Student *</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    placeholder="🔍 Search student by name or NCDC ID..."
                                    value={studentSearch}
                                    onChange={(e) => {
                                        setStudentSearch(e.target.value);
                                        setShowStudentResults(true);
                                        if (selectedStudent) setSelectedStudent(null);
                                        if (!e.target.value) {
                                            setFormData(prev => ({ ...prev, student_id: '' }));
                                            setEligibility(null);
                                        }
                                    }}
                                    onFocus={() => setShowStudentResults(true)}
                                    disabled={!!editingItem}
                                    style={{
                                        ...inputStyle,
                                        paddingRight: '40px',
                                        background: editingItem ? '#f3f4f6' : 'white'
                                    }}
                                />
                                {studentSearch && !editingItem && (
                                    <button
                                        onClick={handleClearStudent}
                                        style={{
                                            position: 'absolute', right: '10px', top: '50%',
                                            transform: 'translateY(-50%)',
                                            background: '#e5e7eb', border: 'none',
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            cursor: 'pointer', fontSize: '12px', color: '#6b7280',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}
                                        title="Clear"
                                    >×</button>
                                )}
                            </div>

                            {/* Search results dropdown */}
                            {showStudentResults && studentSearch && !selectedStudent && !editingItem && (
                                <div style={{
                                    position: 'absolute',
                                    top: '100%',
                                    left: 0,
                                    right: 0,
                                    background: 'white',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '8px',
                                    maxHeight: '250px',
                                    overflowY: 'auto',
                                    boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                                    zIndex: 100,
                                    marginTop: '4px'
                                }}>
                                    {filteredStudents.length === 0 ? (
                                        <div style={{ padding: '16px', textAlign: 'center', color: '#6b7280', fontSize: '13px' }}>
                                            No students found matching "{studentSearch}"
                                        </div>
                                    ) : (
                                        filteredStudents.slice(0, 20).map(s => (
                                            <div
                                                key={s.application_id}
                                                onClick={() => handleSelectStudent(s)}
                                                style={{
                                                    padding: '10px 14px',
                                                    borderBottom: '1px solid #f3f4f6',
                                                    cursor: 'pointer',
                                                    transition: 'background 0.15s'
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

                        {/* Click-away overlay */}
                        {showStudentResults && studentSearch && !selectedStudent && !editingItem && (
                            <div
                                onClick={() => setShowStudentResults(false)}
                                style={{
                                    position: 'fixed', inset: 0, zIndex: 5,
                                    background: 'transparent'
                                }}
                            />
                        )}

                        {/* ✅ ELIGIBILITY CARD */}
                        {loadingEligibility && (
                            <div style={{
                                padding: '20px', background: '#f9fafb',
                                borderRadius: '12px', marginBottom: '15px',
                                textAlign: 'center', color: '#6b7280', fontSize: '13px'
                            }}>
                                ⏳ Loading eligibility...
                            </div>
                        )}

                        {eligibility && !loadingEligibility && (
                            <div style={{
                                padding: '16px 20px',
                                background: eligibilityStyle(eligibility.eligibility).bg,
                                border: `2px solid ${eligibilityStyle(eligibility.eligibility).border}`,
                                borderRadius: '12px',
                                marginBottom: '15px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '24px' }}>
                                        {eligibilityStyle(eligibility.eligibility).icon}
                                    </span>
                                    <div>
                                        <div style={{
                                            fontSize: '14px',
                                            fontWeight: '700',
                                            color: eligibilityStyle(eligibility.eligibility).color
                                        }}>
                                            {eligibilityStyle(eligibility.eligibility).label}
                                        </div>
                                        <div style={{
                                            fontSize: '12px',
                                            color: eligibilityStyle(eligibility.eligibility).color,
                                            marginTop: '2px'
                                        }}>
                                            {eligibility.message}
                                        </div>
                                    </div>
                                </div>

                                {/* Previous enrollment info */}
                                {eligibility.latestEnrollment && (
                                    <div style={{
                                        marginTop: '12px',
                                        paddingTop: '12px',
                                        borderTop: `1px solid ${eligibilityStyle(eligibility.eligibility).border}`,
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                                        gap: '8px',
                                        fontSize: '12px',
                                        color: eligibilityStyle(eligibility.eligibility).color
                                    }}>
                                        <div>
                                            <strong>Previous Grade:</strong> {eligibility.latestEnrollment.grade_level}
                                        </div>
                                        <div>
                                            <strong>School Year:</strong> {eligibility.latestEnrollment.school_year}
                                        </div>
                                        {eligibility.latestEnrollment.section_name && (
                                            <div>
                                                <strong>Section:</strong> {eligibility.latestEnrollment.section_name}
                                            </div>
                                        )}
                                        <div>
                                            <strong>Status:</strong> {eligibility.latestEnrollment.status}
                                        </div>
                                        {eligibility.average > 0 && (
                                            <div>
                                                <strong>Average:</strong>{' '}
                                                <span style={{
                                                    fontWeight: '700',
                                                    color: eligibility.average >= 75 ? '#065f46' : '#991b1b'
                                                }}>
                                                    {eligibility.average}
                                                </span>
                                            </div>
                                        )}
                                        {eligibility.grades.length > 0 && (
                                            <div>
                                                <strong>Subjects:</strong> {eligibility.grades.length}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Suggested next grade */}
                                {eligibility.nextGradeLevel && (
                                    <div style={{
                                        marginTop: '12px',
                                        padding: '8px 12px',
                                        background: 'rgba(255,255,255,0.5)',
                                        borderRadius: '8px',
                                        fontSize: '12px',
                                        color: eligibilityStyle(eligibility.eligibility).color,
                                        fontWeight: '600'
                                    }}>
                                        💡 Recommended: <strong>{eligibility.nextGradeLevel}</strong>
                                    </div>
                                )}
                            </div>
                        )}

                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Grade Level *</label>
                            <select
                                value={formData.grade_level}
                                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value, section_id: '' })}
                                style={inputStyle}
                            >
                                <option value="">-- Select Grade --</option>
                                {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                            </select>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Section</label>
                            <select
                                value={formData.section_id}
                                onChange={(e) => setFormData({ ...formData, section_id: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="">-- No Section --</option>
                                {filteredSections.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.section_name} ({s.grade_level}) — {s.current_students || 0}/{s.max_students || 40}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>School Year</label>
                            <input
                                type="text"
                                value={formData.school_year}
                                onChange={(e) => setFormData({ ...formData, school_year: e.target.value })}
                                placeholder="2026-2027"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                style={inputStyle}
                            >
                                {statuses.map(s => (
                                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Remarks</label>
                            <textarea
                                value={formData.remarks}
                                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                                rows={2}
                                placeholder="Optional"
                                style={{ ...inputStyle, resize: 'vertical' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => setShowModal(false)}
                                disabled={saving}
                                style={{
                                    flex: 1, padding: '12px', background: '#f3f4f6',
                                    color: '#6b7280', border: '1px solid #d1d5db',
                                    borderRadius: '10px', fontWeight: '600',
                                    cursor: 'pointer', fontSize: '14px'
                                }}
                            >Cancel</button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                style={{
                                    flex: 1, padding: '12px',
                                    background: saving ? '#93c5fd' : 'linear-gradient(135deg, #1a56db, #3b82f6)',
                                    color: 'white', border: 'none', borderRadius: '10px',
                                    fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer',
                                    fontSize: '14px'
                                }}
                            >{saving ? 'Saving...' : (editingItem ? 'Update' : 'Enroll')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Enrollments;