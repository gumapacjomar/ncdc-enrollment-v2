import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';

const Sections = () => {
    const navigate = useNavigate();
    const [sections, setSections] = useState([]);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingSection, setViewingSection] = useState(null);
    const [editingItem, setEditingItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [filterGrade, setFilterGrade] = useState('');

    const [formData, setFormData] = useState({
        section_name: '',
        grade_level: '',
        school_year: '2026-2027',
        max_students: 40,
        status: 'active'
    });

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
        fetchData();
        fetchEnrollments();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await API.get('/registrar/sections');
            setSections(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load sections' });
        } finally {
            setLoading(false);
        }
    };

    const fetchEnrollments = async () => {
        try {
            const res = await API.get('/registrar/enrollments');
            setEnrollments(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch enrollments error:', err);
        }
    };

    // ✅ FIX: Only show CURRENTLY ENROLLED students (status='enrolled')
    // Excludes passed/failed/graduated/dropped/transferred
    const getStudentsInSection = (sectionId) => {
        if (!sectionId) return [];
        return enrollments.filter(e => {
            const enrollmentSectionId = parseInt(e.section_id);
            const targetSectionId = parseInt(sectionId);
            return enrollmentSectionId === targetSectionId && e.status === 'enrolled';
        });
    };

    const handleViewSection = (section) => {
        setViewingSection(section);
        setShowViewModal(true);
    };

    const handleAdd = () => {
        setEditingItem(null);
        setFormData({
            section_name: '',
            grade_level: '',
            school_year: '2026-2027',
            max_students: 40,
            status: 'active'
        });
        setShowModal(true);
        setMessage({ type: '', text: '' });
    };

    const handleEdit = (item, e) => {
        e.stopPropagation();
        setEditingItem(item);
        setFormData({
            section_name: item.section_name || '',
            grade_level: item.grade_level || '',
            school_year: item.school_year || '2026-2027',
            max_students: item.max_students || 40,
            status: item.status || 'active'
        });
        setShowModal(true);
        setMessage({ type: '', text: '' });
    };

    const handleSave = async () => {
        if (!formData.section_name.trim()) {
            setMessage({ type: 'error', text: 'Section name is required' });
            return;
        }
        if (!formData.grade_level) {
            setMessage({ type: 'error', text: 'Grade level is required' });
            return;
        }
        try {
            setSaving(true);
            setMessage({ type: '', text: '' });
            const payload = {
                ...formData,
                max_students: parseInt(formData.max_students) || 40
            };
            if (editingItem) {
                await API.put(`/registrar/sections/${editingItem.id}`, payload);
            } else {
                await API.post('/registrar/sections', payload);
            }
            setShowModal(false);
            await fetchData();
            setMessage({ type: 'success', text: editingItem ? 'Section updated!' : 'Section created!' });
        } catch (err) {
            console.error('Save error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save section' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name, e) => {
        e.stopPropagation();
        if (!window.confirm(`Delete section "${name}"?`)) return;
        try {
            const res = await API.delete(`/registrar/sections/${id}`);
            await fetchData();
            setMessage({ type: 'success', text: res.data?.message || 'Section deleted!' });
        } catch (err) {
            console.error('Delete error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete' });
        }
    };

    const filtered = filterGrade
        ? sections.filter(s => s.grade_level === filterGrade)
        : sections;

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

    const currentPage = 'sections';

    const inputStyle = {
        width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
        borderRadius: '8px', fontSize: '14px', marginTop: '4px',
        outline: 'none', boxSizing: 'border-box'
    };

    const labelStyle = {
        display: 'block', fontSize: '13px', fontWeight: '600',
        color: '#374151', marginBottom: '4px'
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

    const viewingStudents = viewingSection ? getStudentsInSection(viewingSection.id) : [];

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
                            🏫 Sections Management
                        </h1>
                        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                            Manage class sections per grade level • Click a section to view enrolled students
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
                    >
                        ➕ Add Section
                    </button>
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

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                        ⏳ Loading sections...
                    </div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        background: 'white', padding: '60px', borderRadius: '14px',
                        textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                        No sections found. Click "Add Section" to create one.
                    </div>
                ) : (
                    // ✅ SINGLE COLUMN LAYOUT
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        {filtered.map(item => {
                            const studentCount = getStudentsInSection(item.id).length;
                            return (
                                <div
                                    key={item.id}
                                    onClick={() => handleViewSection(item)}
                                    style={{
                                        background: 'white',
                                        padding: '16px 20px',
                                        borderRadius: '12px',
                                        border: '1px solid #e5e7eb',
                                        boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
                                        borderLeft: '4px solid #1a56db',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '20px',
                                        flexWrap: 'wrap'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateX(4px)';
                                        e.currentTarget.style.boxShadow = '0 4px 15px rgba(26,86,219,0.1)';
                                        e.currentTarget.style.borderLeftColor = '#3b82f6';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateX(0)';
                                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.03)';
                                        e.currentTarget.style.borderLeftColor = '#1a56db';
                                    }}
                                >
                                    <div style={{ minWidth: '180px', flex: '0 0 auto' }}>
                                        <h3 style={{ margin: '0 0 4px', color: '#1f2937', fontSize: '17px', fontWeight: '700' }}>
                                            {item.section_name}
                                        </h3>
                                        <span style={{
                                            display: 'inline-block', padding: '2px 10px',
                                            background: '#dbeafe', color: '#1a56db',
                                            borderRadius: '10px', fontSize: '11px', fontWeight: '600'
                                        }}>
                                            {item.grade_level}
                                        </span>
                                    </div>

                                    <div style={{ minWidth: '130px', flex: '1 1 auto' }}>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>School Year</div>
                                        <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                                            {item.school_year || 'N/A'}
                                        </div>
                                    </div>

                                    <div style={{ minWidth: '100px', flex: '1 1 auto' }}>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>Students</div>
                                        <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                                            {studentCount} / {item.max_students || 40}
                                        </div>
                                    </div>

                                    {item.adviser_first_name && (
                                        <div style={{ minWidth: '140px', flex: '1 1 auto' }}>
                                            <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500' }}>Adviser</div>
                                            <div style={{ fontSize: '14px', color: '#374151', fontWeight: '600' }}>
                                                {item.adviser_first_name} {item.adviser_last_name}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ flex: '0 0 auto' }}>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '12px',
                                            fontSize: '11px', fontWeight: '600',
                                            background: item.status === 'active' ? '#d1fae5' : '#fee2e2',
                                            color: item.status === 'active' ? '#065f46' : '#991b1b'
                                        }}>
                                            {item.status || 'active'}
                                        </span>
                                    </div>

                                    <div style={{ display: 'flex', gap: '6px', flex: '0 0 auto', marginLeft: 'auto' }}>
                                        <button
                                            onClick={(e) => handleEdit(item, e)}
                                            style={{
                                                padding: '6px 14px',
                                                background: 'linear-gradient(135deg, #f59e0b, #fbbf24)',
                                                color: 'white', border: 'none', borderRadius: '6px',
                                                fontWeight: '600', cursor: 'pointer', fontSize: '12px'
                                            }}
                                        >✏️ Edit</button>
                                        <button
                                            onClick={(e) => handleDelete(item.id, item.section_name, e)}
                                            style={{
                                                padding: '6px 14px',
                                                background: 'linear-gradient(135deg, #ef4444, #f87171)',
                                                color: 'white', border: 'none', borderRadius: '6px',
                                                fontWeight: '600', cursor: 'pointer', fontSize: '12px'
                                            }}
                                        >🗑️ Delete</button>
                                    </div>
                                </div>
                            );
                        })}
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

            {/* ADD/EDIT MODAL */}
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
                                {editingItem ? '✏️ Edit Section' : '➕ Add Section'}
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
                            <label style={labelStyle}>Section Name *</label>
                            <input
                                type="text"
                                value={formData.section_name}
                                onChange={(e) => setFormData({ ...formData, section_name: e.target.value })}
                                placeholder="e.g., Sampaguita, Rizal"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ marginBottom: '15px' }}>
                            <label style={labelStyle}>Grade Level *</label>
                            <select
                                value={formData.grade_level}
                                onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="">-- Select Grade --</option>
                                {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
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
                            <label style={labelStyle}>Max Students</label>
                            <input
                                type="number"
                                value={formData.max_students}
                                onChange={(e) => setFormData({ ...formData, max_students: e.target.value })}
                                min="1"
                                style={inputStyle}
                            />
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={labelStyle}>Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                style={inputStyle}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
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
                            >{saving ? 'Saving...' : (editingItem ? 'Update' : 'Create')}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* VIEW SECTION MODAL */}
            {showViewModal && viewingSection && (
                <div
                    onClick={() => setShowViewModal(false)}
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
                                    <span style={{
                                        padding: '4px 12px',
                                        background: viewingSection.status === 'active' ? '#d1fae5' : '#fee2e2',
                                        color: viewingSection.status === 'active' ? '#065f46' : '#991b1b',
                                        borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                                    }}>{viewingSection.status || 'active'}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowViewModal(false)}
                                style={{
                                    background: 'transparent', border: 'none',
                                    fontSize: '24px', cursor: 'pointer', color: '#9ca3af'
                                }}
                            >×</button>
                        </div>

                        <div style={{
                            background: '#f0f4ff', padding: '16px 20px', borderRadius: '12px',
                            marginBottom: '20px', display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', flexWrap: 'wrap', gap: '12px'
                        }}>
                            <div>
                                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Currently Enrolled Students</div>
                                <div style={{ fontSize: '24px', fontWeight: '800', color: '#1a56db' }}>
                                    {viewingStudents.length} / {viewingSection.max_students || 40}
                                </div>
                            </div>
                            {viewingSection.adviser_first_name && (
                                <div>
                                    <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Adviser</div>
                                    <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                                        {viewingSection.adviser_first_name} {viewingSection.adviser_last_name}
                                    </div>
                                </div>
                            )}
                        </div>

                        {viewingStudents.length === 0 ? (
                            <div style={{
                                padding: '60px 20px', textAlign: 'center',
                                background: '#f9fafb', borderRadius: '12px',
                                border: '1px dashed #d1d5db'
                            }}>
                                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                                <h3 style={{ color: '#1f2937', marginBottom: '8px', fontSize: '18px' }}>
                                    No Currently Enrolled Students
                                </h3>
                                <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>
                                    Wala pay students nga currently enrolled sa section nga ito. Adto sa Enrollments page para mag-enroll.
                                </p>
                                <Link
                                    to="/registrar/enrollments"
                                    style={{
                                        display: 'inline-block',
                                        background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                                        color: 'white', textDecoration: 'none',
                                        padding: '10px 24px', borderRadius: '8px',
                                        fontWeight: '600', fontSize: '14px',
                                        boxShadow: '0 4px 15px rgba(26,86,219,0.3)'
                                    }}
                                >
                                    ➕ Go to Enrollments
                                </Link>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Student ID</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>School Year</th>
                                            <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {viewingStudents.map((student, index) => {
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
                                onClick={() => setShowViewModal(false)}
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

export default Sections;