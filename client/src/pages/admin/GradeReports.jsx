import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';

const GradeReports = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [failingStudents, setFailingStudents] = useState([]);
    const [promotionList, setPromotionList] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('failing'); // 'failing' | 'promotion'
    const [profilePic, setProfilePic] = useState(null);

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
            fetchData();
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

    const fetchData = async () => {
        setLoading(true);
        try {
            const [failingRes, promotionRes] = await Promise.all([
                API.get('/admin/reports/failing-students').catch(() => ({ data: [] })),
                API.get('/admin/reports/promotion-list').catch(() => ({ data: [] }))
            ]);
            setFailingStudents(failingRes.data || []);
            setPromotionList(promotionRes.data || []);
        } catch (error) {
            console.error('Error fetching grade reports:', error);
        } finally {
            setLoading(false);
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

    const filterData = (data) => {
        if (!searchTerm.trim()) return data;
        const search = searchTerm.toLowerCase();
        return data.filter(s => {
            const name = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
            return name.includes(search) || (s.public_id || '').toLowerCase().includes(search);
        });
    };

    const renderFailingView = () => {
        const filtered = filterData(failingStudents);

        if (filtered.length === 0) {
            return (
                <div style={{
                    background: 'white', padding: '60px', borderRadius: '14px',
                    textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '12px' }}>🎉</div>
                    <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>No Failing Students</h3>
                    <p>All students are performing well (average ≥ 75).</p>
                </div>
            );
        }

        return (
            <div style={{
                background: 'white', borderRadius: '14px',
                border: '1px solid #e5e7eb', overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
            }}>
                <div style={{
                    padding: '16px 24px',
                    background: 'linear-gradient(135deg, #ef4444, #f87171)',
                    color: 'white'
                }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                        ❌ Failing Students ({filtered.length})
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
                        Students with average grade below 75
                    </p>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Student ID</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Grade & Section</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Average</th>
                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Subjects</th>
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
                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                                        {student.current_grade_level || '—'} {student.current_section ? `- ${student.current_section}` : ''}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <span style={{
                                            padding: '6px 14px', borderRadius: '12px',
                                            fontSize: '14px', fontWeight: '700',
                                            background: '#fee2e2', color: '#991b1b'
                                        }}>
                                            {parseFloat(student.average_grade || 0).toFixed(2)}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
                                        {student.total_subjects || 0}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                        <Link to={`/admin/student-history?studentId=${student.student_id}`} style={{
                                            background: '#dbeafe', color: '#1a56db',
                                            textDecoration: 'none', padding: '6px 14px',
                                            borderRadius: '6px', fontSize: '12px', fontWeight: '600'
                                        }}>
                                            👁️ View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderPromotionView = () => {
        const filtered = filterData(promotionList);
        const passed = filtered.filter(s => s.promotion_status === 'PASSED');
        const failed = filtered.filter(s => s.promotion_status === 'FAILED');

        if (filtered.length === 0) {
            return (
                <div style={{
                    background: 'white', padding: '60px', borderRadius: '14px',
                    textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '12px' }}>📭</div>
                    <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>No Promotion Data</h3>
                    <p>No enrollment records found for the current school year.</p>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div style={{
                        background: 'white', padding: '24px', borderRadius: '14px',
                        border: '1px solid #e5e7eb', borderTop: '4px solid #10b981',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>PASSED</div>
                                <div style={{ fontSize: '32px', fontWeight: '800', color: '#065f46' }}>{passed.length}</div>
                            </div>
                            <div style={{ fontSize: '36px', opacity: 0.6 }}>✅</div>
                        </div>
                    </div>
                    <div style={{
                        background: 'white', padding: '24px', borderRadius: '14px',
                        border: '1px solid #e5e7eb', borderTop: '4px solid #ef4444',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>FAILED</div>
                                <div style={{ fontSize: '32px', fontWeight: '800', color: '#991b1b' }}>{failed.length}</div>
                            </div>
                            <div style={{ fontSize: '36px', opacity: 0.6 }}>❌</div>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div style={{
                    background: 'white', borderRadius: '14px',
                    border: '1px solid #e5e7eb', overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                    <div style={{
                        padding: '16px 24px',
                        background: 'linear-gradient(135deg, #10b981, #34d399)',
                        color: 'white'
                    }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>
                            📊 Promotion List ({filtered.length})
                        </h3>
                        <p style={{ margin: '4px 0 0', fontSize: '13px', opacity: 0.9 }}>
                            Students qualified for promotion (average ≥ 75)
                        </p>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>#</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Student ID</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Grade</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Average</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Status</th>
                                    <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((student, idx) => (
                                    <tr key={`${student.student_id}-${idx}`} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{idx + 1}</td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#1a56db' }}>
                                            {student.public_id || '—'}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                                            {student.first_name} {student.middle_name || ''} {student.last_name}
                                        </td>
                                        <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                                            {student.current_grade_level || '—'} {student.current_section ? `- ${student.current_section}` : ''}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '600', color: '#1f2937' }}>
                                            {student.average_grade ? parseFloat(student.average_grade).toFixed(2) : '—'}
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '6px 14px', borderRadius: '12px',
                                                fontSize: '12px', fontWeight: '700',
                                                background: student.promotion_status === 'PASSED' ? '#d1fae5' : '#fee2e2',
                                                color: student.promotion_status === 'PASSED' ? '#065f46' : '#991b1b'
                                            }}>
                                                {student.promotion_status}
                                            </span>
                                        </td>
                                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                            <Link to={`/admin/student-history?studentId=${student.student_id}`} style={{
                                                background: '#dbeafe', color: '#1a56db',
                                                textDecoration: 'none', padding: '6px 14px',
                                                borderRadius: '6px', fontSize: '12px', fontWeight: '600'
                                            }}>
                                                👁️ View
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
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
                        📉 Grade Reports
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '15px' }}>
                        Failing students and promotion candidates
                    </p>
                </div>

                {/* Search + Tabs */}
                <div style={{
                    background: 'white', padding: '16px 20px', borderRadius: '12px',
                    marginBottom: '24px', border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center'
                }}>
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Search by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 16px',
                                border: '1px solid #e5e7eb', borderRadius: '8px',
                                fontSize: '14px', outline: 'none', background: '#f9fafb',
                                boxSizing: 'border-box'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#1a56db';
                                e.target.style.background = 'white';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e5e7eb';
                                e.target.style.background = '#f9fafb';
                            }}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {[
                            { id: 'failing', label: '❌ Failing Students' },
                            { id: 'promotion', label: '📊 Promotion List' }
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
                                    transition: 'all 0.3s ease',
                                    boxShadow: activeTab === tab.id ? '0 4px 12px rgba(26,86,219,0.3)' : 'none'
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                        ⏳ Loading grade reports...
                    </div>
                ) : (
                    <>
                        {activeTab === 'failing' && renderFailingView()}
                        {activeTab === 'promotion' && renderPromotionView()}
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
        </div>
    );
};

export default GradeReports;