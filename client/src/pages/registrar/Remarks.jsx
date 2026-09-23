import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';

const Remarks = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [remarks, setRemarks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Student search
    const [searchTerm, setSearchTerm] = useState('');
    const [showResults, setShowResults] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    const [formData, setFormData] = useState({
        student_id: '',
        enrollment_id: '',
        remark_type: 'general',
        remark: ''
    });

    const remarkTypes = [
        { value: 'general', label: 'General' },
        { value: 'academic', label: 'Academic' },
        { value: 'behavior', label: 'Behavior' },
        { value: 'attendance', label: 'Attendance' },
        { value: 'achievement', label: 'Achievement' },
        { value: 'warning', label: 'Warning' }
    ];

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
        fetchStudents();
    }, []);

    // Fetch unique students from enrollments (deduplicated by student_id)
    const fetchStudents = async () => {
        try {
            const res = await API.get('/registrar/enrollments');
            const enrollments = Array.isArray(res.data) ? res.data : [];

            // Dedupe by student_id — get latest enrollment per student
            const uniqueStudentsMap = new Map();
            enrollments.forEach(e => {
                if (!uniqueStudentsMap.has(e.student_id)) {
                    uniqueStudentsMap.set(e.student_id, e);
                } else {
                    // Keep latest enrollment (by school_year or id)
                    const existing = uniqueStudentsMap.get(e.student_id);
                    if ((e.school_year || '') > (existing.school_year || '')) {
                        uniqueStudentsMap.set(e.student_id, e);
                    }
                }
            });

            const uniqueStudents = Array.from(uniqueStudentsMap.values());
            console.log('Unique students:', uniqueStudents);
            setStudents(uniqueStudents);
        } catch (err) {
            console.error('Fetch students error:', err);
        }
    };

    const fetchRemarks = async (studentId) => {
        try {
            setLoading(true);
            const res = await API.get(`/registrar/remarks/student/${studentId}`);
            setRemarks(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch remarks error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load remarks' });
        } finally {
            setLoading(false);
        }
    };

    // Filter students by search
    const filteredStudents = students.filter(s => {
        if (!searchTerm.trim()) return true;
        const search = searchTerm.toLowerCase();
        const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
        const publicId = (s.public_id || '').toLowerCase();
        return fullName.includes(search) || publicId.includes(search);
    });

    const handleSelectStudent = (student) => {
        setSelectedStudent(student);
        setSearchTerm(`${student.first_name} ${student.middle_name || ''} ${student.last_name}`);
        setShowResults(false);
        fetchRemarks(student.student_id);
    };

    const handleClearSelection = () => {
        setSelectedStudent(null);
        setSearchTerm('');
        setShowResults(false);
        setRemarks([]);
    };

    const handleAdd = () => {
        if (!selectedStudent) {
            setMessage({ type: 'error', text: 'Please select a student first' });
            return;
        }
        setFormData({
            student_id: selectedStudent.student_id,
            enrollment_id: selectedStudent.id || '',
            remark_type: 'general',
            remark: ''
        });
        setShowModal(true);
        setMessage({ type: '', text: '' });
    };

    const handleSave = async () => {
        if (!formData.remark.trim()) {
            setMessage({ type: 'error', text: 'Remark is required' });
            return;
        }
        try {
            setSaving(true);
            setMessage({ type: '', text: '' });

            const payload = {
                ...formData,
                student_id: parseInt(formData.student_id),
                enrollment_id: formData.enrollment_id ? parseInt(formData.enrollment_id) : null,
                created_by: user.id,
                created_by_role: 'registrar'
            };

            await API.post('/registrar/remarks', payload);
            setShowModal(false);
            await fetchRemarks(selectedStudent.student_id);
            setMessage({ type: 'success', text: 'Remark added!' });
        } catch (err) {
            console.error('Save error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save remark' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Delete this remark?')) return;
        try {
            await API.delete(`/registrar/remarks/${id}`);
            if (selectedStudent) {
                await fetchRemarks(selectedStudent.student_id);
            }
            setMessage({ type: 'success', text: 'Remark deleted!' });
        } catch (err) {
            console.error('Delete error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete' });
        }
    };

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

    const currentPage = 'remarks';

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

    const remarkTypeColor = (type) => {
        const colors = {
            general: { bg: '#e5e7eb', color: '#374151' },
            academic: { bg: '#dbeafe', color: '#1a56db' },
            behavior: { bg: '#fef3c7', color: '#92400e' },
            attendance: { bg: '#e0e7ff', color: '#4338ca' },
            achievement: { bg: '#d1fae5', color: '#065f46' },
            warning: { bg: '#fee2e2', color: '#991b1b' }
        };
        return colors[type] || colors.general;
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '700', letterSpacing: '-0.5px' }}>
                            💬 Student Remarks
                        </h1>
                        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                            Add and view remarks per student
                        </p>
                    </div>
                    {selectedStudent && (
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
                        >➕ Add Remark</button>
                    )}
                </div>

                {message.text && (
                    <div style={{
                        padding: '12px 20px', borderRadius: '8px', marginBottom: '20px',
                        background: message.type === 'error' ? '#fee2e2' : '#d1fae5',
                        color: message.type === 'error' ? '#991b1b' : '#065f46',
                        border: `1px solid ${message.type === 'error' ? '#fca5a5' : '#34d399'}`
                    }}>{message.text}</div>
                )}

                {/* Student Search */}
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
                                width: '100%',
                                padding: '12px 44px 12px 16px',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                fontSize: '14px',
                                outline: 'none',
                                boxSizing: 'border-box',
                                background: '#f9fafb'
                            }}
                        />
                        {searchTerm && (
                            <button
                                onClick={handleClearSelection}
                                style={{
                                    position: 'absolute',
                                    right: '10px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: '#e5e7eb',
                                    border: 'none',
                                    width: '26px',
                                    height: '26px',
                                    borderRadius: '50%',
                                    cursor: 'pointer',
                                    fontSize: '14px',
                                    color: '#6b7280',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                                title="Clear"
                            >×</button>
                        )}
                    </div>

                    {/* Search Results */}
                    {showResults && searchTerm && !selectedStudent && (
                        <div style={{
                            position: 'absolute',
                            top: 'calc(100% - 12px)',
                            left: '20px',
                            right: '20px',
                            background: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            maxHeight: '280px',
                            overflowY: 'auto',
                            boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
                            zIndex: 100,
                            marginTop: '8px'
                        }}>
                            {filteredStudents.length === 0 ? (
                                <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', fontSize: '14px' }}>
                                    No students found matching "{searchTerm}"
                                </div>
                            ) : (
                                filteredStudents.slice(0, 20).map(s => (
                                    <div
                                        key={s.student_id}
                                        onClick={() => handleSelectStudent(s)}
                                        style={{
                                            padding: '12px 16px',
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
                                            {s.public_id || 'No ID'} — {s.grade_level} {s.section_name ? `(${s.section_name})` : ''}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Click-away */}
                {showResults && searchTerm && !selectedStudent && (
                    <div
                        onClick={() => setShowResults(false)}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 5,
                            background: 'transparent'
                        }}
                    />
                )}

                {/* Selected Student Info Card */}
                {selectedStudent && (
                    <div style={{
                        background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                        padding: '20px 24px',
                        borderRadius: '14px',
                        marginBottom: '24px',
                        color: 'white',
                        boxShadow: '0 8px 25px rgba(26,86,219,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '20px',
                        flexWrap: 'wrap'
                    }}>
                        <div style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            fontWeight: '700',
                            flexShrink: 0
                        }}>
                            {selectedStudent.first_name?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '18px', fontWeight: '700' }}>
                                {selectedStudent.first_name} {selectedStudent.middle_name || ''} {selectedStudent.last_name}
                            </div>
                            <div style={{ fontSize: '13px', opacity: 0.95, marginTop: '2px' }}>
                                {selectedStudent.public_id || 'No ID'} — {selectedStudent.grade_level} {selectedStudent.section_name ? `(${selectedStudent.section_name})` : ''}
                            </div>
                        </div>
                    </div>
                )}

                {/* Remarks List */}
                {selectedStudent ? (
                    <div style={{
                        background: 'white', padding: '24px', borderRadius: '14px',
                        border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', marginBottom: '16px' }}>
                            💬 Remarks ({remarks.length})
                        </h3>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                                ⏳ Loading remarks...
                            </div>
                        ) : remarks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                                <div style={{ fontSize: '48px', marginBottom: '8px' }}>💭</div>
                                No remarks yet. Click "Add Remark" to create one.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {remarks.map(item => {
                                    const tc = remarkTypeColor(item.remark_type);
                                    return (
                                        <div key={item.id} style={{
                                            padding: '16px 20px', borderRadius: '12px',
                                            border: '1px solid #e5e7eb', background: '#f9fafb',
                                            display: 'flex', justifyContent: 'space-between',
                                            alignItems: 'flex-start', gap: '12px'
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                                    <span style={{
                                                        padding: '3px 12px', borderRadius: '12px',
                                                        fontSize: '11px', fontWeight: '600',
                                                        background: tc.bg, color: tc.color,
                                                        textTransform: 'uppercase'
                                                    }}>{item.remark_type}</span>
                                                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                                        {item.created_by_role}
                                                    </span>
                                                    {item.school_year && (
                                                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                                            • {item.school_year} {item.semester ? `(${item.semester})` : ''}
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                        • {new Date(item.created_at).toLocaleDateString('en-US', {
                                                            month: 'short', day: 'numeric', year: 'numeric',
                                                            hour: '2-digit', minute: '2-digit'
                                                        })}
                                                    </span>
                                                </div>
                                                <p style={{ margin: 0, color: '#1f2937', fontSize: '14px', lineHeight: '1.5' }}>
                                                    {item.remark}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                style={{
                                                    background: '#fee2e2', color: '#991b1b',
                                                    border: 'none', padding: '6px 12px',
                                                    borderRadius: '6px', cursor: 'pointer',
                                                    fontSize: '12px', fontWeight: '600',
                                                    flexShrink: 0
                                                }}
                                            >🗑️ Delete</button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div style={{
                        background: 'white', padding: '60px', borderRadius: '14px',
                        textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb'
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '12px' }}>💬</div>
                        <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>Search for a Student</h3>
                        <p>Type a student's name above to view or add remarks.</p>
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
                        maxWidth: '500px', width: '100%', maxHeight: '90vh',
                        overflowY: 'auto', padding: '32px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.3)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h2 style={{ fontSize: '20px', color: '#1f2937', margin: 0 }}>
                                ➕ Add Remark
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

                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Remark Type</label>
                            <select
                                value={formData.remark_type}
                                onChange={(e) => setFormData({ ...formData, remark_type: e.target.value })}
                                style={inputStyle}
                            >
                                {remarkTypes.map(rt => (
                                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Remark *</label>
                            <textarea
                                value={formData.remark}
                                onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                                rows={4}
                                placeholder="Enter your remark here..."
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
                            >{saving ? 'Saving...' : 'Add Remark'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Remarks;