import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';

const Subjects = () => {
    const navigate = useNavigate();
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [filterGrade, setFilterGrade] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState({
        subject_name: '',
        grade_level: '',
        description: '',
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
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await API.get('/registrar/subjects');
            setSubjects(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load subjects' });
        } finally {
            setLoading(false);
        }
    };

    // Generate a subject code from name (e.g., "Mathematics" → "MATH")
    const getSubjectCode = (name) => {
        if (!name) return '—';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) {
            return name.slice(0, 4).toUpperCase();
        }
        return words.map(w => w.charAt(0).toUpperCase()).join('').slice(0, 6);
    };

    const handleAdd = () => {
        setEditingItem(null);
        setFormData({
            subject_name: '',
            grade_level: filterGrade || '',
            description: '',
            status: 'active'
        });
        setShowModal(true);
        setMessage({ type: '', text: '' });
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setFormData({
            subject_name: item.subject_name || '',
            grade_level: item.grade_level || '',
            description: item.description || '',
            status: item.status || 'active'
        });
        setShowModal(true);
        setMessage({ type: '', text: '' });
    };

    const handleSave = async () => {
        if (!formData.subject_name.trim()) {
            setMessage({ type: 'error', text: 'Subject name is required' });
            return;
        }
        if (!formData.grade_level) {
            setMessage({ type: 'error', text: 'Grade level is required' });
            return;
        }
        try {
            setSaving(true);
            setMessage({ type: '', text: '' });
            if (editingItem) {
                await API.put(`/registrar/subjects/${editingItem.id}`, formData);
            } else {
                await API.post('/registrar/subjects', formData);
            }
            setShowModal(false);
            await fetchData();
            setMessage({ type: 'success', text: editingItem ? 'Subject updated!' : 'Subject created!' });
        } catch (err) {
            console.error('Save error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to save subject' });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete subject "${name}"?`)) return;
        try {
            const res = await API.delete(`/registrar/subjects/${id}`);
            await fetchData();
            setMessage({ type: 'success', text: res.data?.message || 'Subject deleted!' });
        } catch (err) {
            console.error('Delete error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to delete' });
        }
    };

    // Filter subjects
    const filtered = subjects.filter(s => {
        const matchesGrade = !filterGrade || s.grade_level === filterGrade;
        const matchesSearch = !searchTerm ||
            s.subject_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.description || '').toLowerCase().includes(searchTerm.toLowerCase());
        return matchesGrade && matchesSearch;
    });

    // Sort by grade then by subject name
    const sorted = [...filtered].sort((a, b) => {
        if (a.grade_level !== b.grade_level) {
            return a.grade_level.localeCompare(b.grade_level);
        }
        return a.subject_name.localeCompare(b.subject_name);
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

    const currentPage = 'subjects';

    const inputStyle = {
        width: '100%', padding: '10px 14px', border: '1px solid #d1d5db',
        borderRadius: '8px', fontSize: '14px', marginTop: '4px',
        outline: 'none', boxSizing: 'border-box'
    };

    const labelStyle = {
        display: 'block', fontSize: '13px', fontWeight: '600',
        color: '#374151', marginBottom: '4px'
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
                            📚 Subjects Management
                        </h1>
                        <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                            Manage subjects per grade level (DepEd K-12 Curriculum)
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
                        ➕ Add Subject
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

                {/* Filter + Search */}
                <div style={{
                    background: 'white', padding: '16px 20px', borderRadius: '12px',
                    marginBottom: '20px', border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                            Filter:
                        </label>
                        <select
                            value={filterGrade}
                            onChange={(e) => setFilterGrade(e.target.value)}
                            style={{
                                padding: '8px 14px', borderRadius: '8px',
                                border: '1px solid #d1d5db', fontSize: '14px',
                                minWidth: '150px', outline: 'none', background: 'white'
                            }}
                        >
                            <option value="">All Grades</option>
                            {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Search subject..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '8px 14px',
                                border: '1px solid #d1d5db', borderRadius: '8px',
                                fontSize: '14px', outline: 'none', background: '#f9fafb',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#1a56db';
                                e.target.style.background = 'white';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#d1d5db';
                                e.target.style.background = '#f9fafb';
                            }}
                        />
                    </div>
                    <span style={{
                        fontSize: '13px', color: '#6b7280',
                        background: '#f3f4f6', padding: '6px 14px',
                        borderRadius: '12px', fontWeight: '600', whiteSpace: 'nowrap'
                    }}>
                        📊 {sorted.length} subject{sorted.length !== 1 ? 's' : ''}
                    </span>
                </div>

                {/* TABLE */}
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                        ⏳ Loading subjects...
                    </div>
                ) : sorted.length === 0 ? (
                    <div style={{
                        background: 'white', padding: '60px', borderRadius: '14px',
                        textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb'
                    }}>
                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                        No subjects found. Click "Add Subject" to create one.
                    </div>
                ) : (
                    <div style={{
                        background: 'white',
                        borderRadius: '14px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        overflow: 'hidden'
                    }}>
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                                        <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', width: '100px' }}>
                                            Code
                                        </th>
                                        <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', width: '110px' }}>
                                            Grade
                                        </th>
                                        <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Subject Description
                                        </th>
                                        <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', width: '100px' }}>
                                            Status
                                        </th>
                                        <th style={{ padding: '14px 20px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', width: '150px' }}>
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sorted.map((item, idx) => (
                                        <tr
                                            key={item.id}
                                            style={{
                                                borderBottom: idx < sorted.length - 1 ? '1px solid #f3f4f6' : 'none',
                                                transition: 'background 0.15s ease'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: '600', color: '#1a56db', fontFamily: 'Consolas, monospace' }}>
                                                {getSubjectCode(item.subject_name)}
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <span style={{
                                                    display: 'inline-block',
                                                    padding: '3px 10px',
                                                    background: '#dbeafe',
                                                    color: '#1a56db',
                                                    borderRadius: '10px',
                                                    fontSize: '12px',
                                                    fontWeight: '600',
                                                    whiteSpace: 'nowrap'
                                                }}>
                                                    {item.grade_level}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px' }}>
                                                <div style={{ fontSize: '14px', color: '#1f2937', fontWeight: '600' }}>
                                                    {item.subject_name}
                                                </div>
                                                {item.description && (
                                                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                        {item.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '3px 10px',
                                                    borderRadius: '10px',
                                                    fontSize: '11px',
                                                    fontWeight: '700',
                                                    background: item.status === 'active' ? '#d1fae5' : '#fee2e2',
                                                    color: item.status === 'active' ? '#065f46' : '#991b1b',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.3px'
                                                }}>
                                                    {item.status || 'active'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                                                <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        title="Edit"
                                                        style={{
                                                            background: '#fef3c7',
                                                            color: '#92400e',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#fbbf24';
                                                            e.currentTarget.style.color = 'white';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = '#fef3c7';
                                                            e.currentTarget.style.color = '#92400e';
                                                        }}
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id, item.subject_name)}
                                                        title="Delete"
                                                        style={{
                                                            background: '#fee2e2',
                                                            color: '#991b1b',
                                                            border: 'none',
                                                            padding: '6px 12px',
                                                            borderRadius: '6px',
                                                            cursor: 'pointer',
                                                            fontSize: '12px',
                                                            fontWeight: '600',
                                                            transition: 'all 0.2s ease'
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.background = '#ef4444';
                                                            e.currentTarget.style.color = 'white';
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.background = '#fee2e2';
                                                            e.currentTarget.style.color = '#991b1b';
                                                        }}
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                                {editingItem ? '✏️ Edit Subject' : '➕ Add Subject'}
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
                            <label style={labelStyle}>Subject Name *</label>
                            <input
                                type="text"
                                value={formData.subject_name}
                                onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                                placeholder="e.g., Mathematics"
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
                            <label style={labelStyle}>Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Optional description"
                                rows={3}
                                style={{ ...inputStyle, resize: 'vertical' }}
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
        </div>
    );
};

export default Subjects;