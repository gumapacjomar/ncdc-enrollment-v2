import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';
import { computeHonorFromGrades, sortHonorStudents, HONOR_TIERS } from '../../utils/honors';

const HonorStudents = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [honorStudents, setHonorStudents] = useState([]);
    const [availableSYs, setAvailableSYs] = useState([]);
    const [selectedSY, setSelectedSY] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterGrade, setFilterGrade] = useState('');
    const [filterTier, setFilterTier] = useState('all');
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
            fetchHonorStudents(); // No SY — auto-detect
        }
        // eslint-disable-next-line
    }, []);

    // ✅ Re-fetch when SY changes (with override, avoid closure bug)
    useEffect(() => {
        if (selectedSY && user?.role === 'admin') {
            fetchHonorStudents(selectedSY);
        }
        // eslint-disable-next-line
    }, [selectedSY]);

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

    // ✅ FIXED: Accept `overrideSY` param para walay closure bug
    const fetchHonorStudents = async (overrideSY = null) => {
        setLoading(true);
        try {
            const enrollRes = await API.get('/registrar/enrollments');
            const allEnrollments = Array.isArray(enrollRes.data) ? enrollRes.data : [];

            console.log('🐛 DEBUG: Total enrollments =', allEnrollments.length);

            // ✅ Valid statuses: passed, enrolled, graduated
            const validStatuses = ['passed', 'enrolled', 'graduated'];
            const validEnrollments = allEnrollments.filter(e =>
                validStatuses.includes(e.status)
            );

            console.log('🐛 DEBUG: Valid enrollments =', validEnrollments.length);

            // ✅ Collect unique SYs
            const sySet = new Set();
            validEnrollments.forEach(e => {
                if (e.school_year) sySet.add(e.school_year);
            });
            const syList = Array.from(sySet).sort((a, b) => b.localeCompare(a));

            console.log('🐛 DEBUG: SY list =', syList);

            setAvailableSYs(syList);

            // ✅ Determine target SY: use override or auto-detect
            let targetSY = overrideSY;

            if (!targetSY) {
                // Auto-detect: prefer latest 'passed' SY
                const passedSYs = validEnrollments
                    .filter(e => e.status === 'passed')
                    .map(e => e.school_year);
                if (passedSYs.length > 0) {
                    targetSY = passedSYs.sort((a, b) => b.localeCompare(a))[0];
                } else {
                    targetSY = syList[0];
                }
                // Sync state if different
                if (targetSY && targetSY !== selectedSY) {
                    setSelectedSY(targetSY);
                }
            }

            console.log('🐛 DEBUG: Target SY =', targetSY);

            if (!targetSY) {
                console.log('🐛 DEBUG: No target SY — exiting');
                setHonorStudents([]);
                return;
            }

            // ✅ Filter enrollments for target SY
            const syEnrollments = validEnrollments.filter(
                e => e.school_year === targetSY
            );

            console.log('🐛 DEBUG: SY enrollments =', syEnrollments.length);
            console.log('🐛 DEBUG: SY enrollments data =', syEnrollments);

            // ✅ Unique students (per SY)
            const uniqueStudents = {};
            syEnrollments.forEach(e => {
                if (!uniqueStudents[e.student_id]) {
                    uniqueStudents[e.student_id] = {
                        student_id: e.student_id,
                        public_id: e.public_id,
                        first_name: e.first_name,
                        middle_name: e.middle_name,
                        last_name: e.last_name,
                        grade_level: e.grade_level,
                        section_name: e.section_name,
                        school_year: e.school_year,
                        enrollment_id: e.id,
                        enrollment_status: e.status
                    };
                }
            });

            console.log('🐛 DEBUG: Unique students =', Object.keys(uniqueStudents).length);

            // ✅ Fetch grades + compute honor
            const honorList = [];
            const studentIds = Object.keys(uniqueStudents);

            for (const studentId of studentIds) {
                const student = uniqueStudents[studentId];
                try {
                    const gradesRes = await API.get(
                        `/registrar/grades/enrollment/${student.enrollment_id}`
                    );
                    const grades = Array.isArray(gradesRes.data) ? gradesRes.data : [];

                    console.log(`🐛 ${student.first_name} ${student.last_name} — grades count = ${grades.length}`);

                    if (grades.length === 0) continue;

                    const honor = computeHonorFromGrades(grades);

                    console.log(`🐛 ${student.first_name} — honor =`, honor);

                    if (honor.isHonor) {
                        // ✅ DEFENSIVE: fallback kung undefined ang honor.subjects
                        const subjects = honor.subjects || [];
                        honorList.push({
                            ...student,
                            tier: honor.tier,
                            average: honor.average,
                            lowestGrade: honor.lowestGrade,
                            subjects: subjects,
                            totalSubjects: subjects.length
                        });
                    }
                } catch (err) {
                    console.error(`Error fetching grades for student ${studentId}:`, err);
                }
            }

            console.log('🐛 DEBUG: Honor list =', honorList.length);

            const sorted = sortHonorStudents(honorList);
            setHonorStudents(sorted);
        } catch (error) {
            console.error('Error fetching honor students:', error);
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
        { id: 'honor-students', icon: '🏆', label: 'Honor Students', path: '/admin/honor-students', color: '#f59e0b' },
        { id: 'student-history', icon: '📚', label: 'Student History', path: '/admin/student-history', color: '#a855f7' },
        { id: 'registrars', icon: '👨‍💼', label: 'Registrar Management', path: '/admin/registrars', color: '#ec4899' },
        { id: 'password-requests', icon: '🔑', label: 'Password Requests', path: '/admin/password-requests', color: '#f43f5e' }
    ];

    const isActive = (path) => currentPath === path;

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const filtered = honorStudents.filter(s => {
        const fullName = `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.toLowerCase();
        const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                             (s.public_id || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGrade = !filterGrade || s.grade_level === filterGrade;
        const matchesTier = filterTier === 'all' || s.tier.label === filterTier;
        return matchesSearch && matchesGrade && matchesTier;
    });

    // Count per tier
    const tierCounts = {
        all: honorStudents.length,
        highest: honorStudents.filter(s => s.tier === HONOR_TIERS.HIGHEST).length,
        high: honorStudents.filter(s => s.tier === HONOR_TIERS.HIGH).length,
        with: honorStudents.filter(s => s.tier === HONOR_TIERS.WITH_HONORS).length
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
                    display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0
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
                        fontWeight: '500', cursor: 'pointer', fontSize: '14px'
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
                        🏆 Honor Students
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '15px' }}>
                        Students qualified for academic honors (DepEd Order No. 36, s. 2016)
                    </p>
                </div>

                {/* ✅ SY Selector */}
                {availableSYs.length > 0 && (
                    <div style={{
                        background: 'white', padding: '16px 20px', borderRadius: '12px',
                        marginBottom: '20px', border: '1px solid #e5e7eb',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center'
                    }}>
                        <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                            📅 School Year:
                        </label>
                        <select
                            value={selectedSY}
                            onChange={(e) => setSelectedSY(e.target.value)}
                            style={{
                                padding: '8px 14px', borderRadius: '8px',
                                border: '1px solid #d1d5db', fontSize: '14px',
                                outline: 'none', minWidth: '160px',
                                fontWeight: '600', color: '#1f2937'
                            }}
                        >
                            {availableSYs.map(sy => (
                                <option key={sy} value={sy}>{sy}</option>
                            ))}
                        </select>
                        <div style={{ fontSize: '13px', color: '#6b7280', marginLeft: 'auto' }}>
                            {honorStudents.length} honor student(s) sa SY {selectedSY}
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '16px',
                    marginBottom: '24px'
                }}>
                    <div style={{
                        background: 'white', padding: '20px', borderRadius: '14px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        borderTop: '4px solid #f59e0b'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>Highest Honors</div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#92400e' }}>{tierCounts.highest}</div>
                            </div>
                            <div style={{ fontSize: '32px', opacity: 0.6 }}>🏆</div>
                        </div>
                    </div>
                    <div style={{
                        background: 'white', padding: '20px', borderRadius: '14px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        borderTop: '4px solid #3b82f6'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>High Honors</div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#1a56db' }}>{tierCounts.high}</div>
                            </div>
                            <div style={{ fontSize: '32px', opacity: 0.6 }}>🥇</div>
                        </div>
                    </div>
                    <div style={{
                        background: 'white', padding: '20px', borderRadius: '14px',
                        border: '1px solid #e5e7eb',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                        borderTop: '4px solid #10b981'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>With Honors</div>
                                <div style={{ fontSize: '28px', fontWeight: '800', color: '#065f46' }}>{tierCounts.with}</div>
                            </div>
                            <div style={{ fontSize: '32px', opacity: 0.6 }}>🥈</div>
                        </div>
                    </div>
                    <div style={{
                        background: 'linear-gradient(135deg, #1a56db, #3b82f6)',
                        padding: '20px', borderRadius: '14px',
                        color: 'white',
                        boxShadow: '0 4px 15px rgba(26,86,219,0.3)'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: '12px', opacity: 0.9, fontWeight: '500' }}>Total Honor Students</div>
                                <div style={{ fontSize: '28px', fontWeight: '800' }}>{tierCounts.all}</div>
                            </div>
                            <div style={{ fontSize: '32px', opacity: 0.8 }}>🎓</div>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div style={{
                    background: 'white', padding: '16px 20px', borderRadius: '12px',
                    marginBottom: '24px', border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center'
                }}>
                    <div style={{ flex: 1, minWidth: '220px' }}>
                        <input
                            type="text"
                            placeholder="🔍 Search by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                width: '100%', padding: '10px 16px',
                                border: '1px solid #d1d5db', borderRadius: '8px',
                                fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                            }}
                        />
                    </div>
                    <div>
                        <label style={{ marginRight: '8px', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>Grade:</label>
                        <select
                            value={filterGrade}
                            onChange={(e) => setFilterGrade(e.target.value)}
                            style={{
                                padding: '8px 14px', borderRadius: '8px',
                                border: '1px solid #d1d5db', fontSize: '14px',
                                outline: 'none'
                            }}
                        >
                            <option value="">All Grades</option>
                            {gradeLevels.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ marginRight: '8px', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>Tier:</label>
                        <select
                            value={filterTier}
                            onChange={(e) => setFilterTier(e.target.value)}
                            style={{
                                padding: '8px 14px', borderRadius: '8px',
                                border: '1px solid #d1d5db', fontSize: '14px',
                                outline: 'none'
                            }}
                        >
                            <option value="all">All Tiers</option>
                            <option value="With Highest Honors">🏆 With Highest Honors</option>
                            <option value="With High Honors">🥇 With High Honors</option>
                            <option value="With Honors">🥈 With Honors</option>
                        </select>
                    </div>
                </div>

                {/* Honor Students Table */}
                <div style={{
                    background: 'white', padding: '24px', borderRadius: '14px',
                    border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                            🏆 Honor Students List {selectedSY && <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>(SY {selectedSY})</span>}
                        </h3>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            {filtered.length} student(s)
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                            ⏳ Loading honor students...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>🏆</div>
                            <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>No Honor Students Found</h3>
                            <p style={{ fontSize: '14px' }}>
                                {searchTerm || filterGrade || filterTier !== 'all'
                                    ? 'Try changing your filters.'
                                    : `Walay honor student sa SY ${selectedSY || 'nga napili'}.`}
                            </p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid #e5e7eb', background: '#f9fafb' }}>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', width: '60px' }}>Rank</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Student ID</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Name</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase' }}>Grade & Section</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', width: '100px' }}>Average</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', width: '110px' }}>Lowest</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', width: '200px' }}>Honor Tier</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', width: '100px' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((student, idx) => (
                                        <tr key={student.student_id} style={{
                                            borderBottom: '1px solid #e5e7eb',
                                            background: idx % 2 === 0 ? 'white' : '#fafafa'
                                        }}>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: '700', color: '#1f2937' }}>
                                                {idx + 1}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '14px', fontWeight: '600', color: '#1a56db' }}>
                                                {student.public_id || '—'}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937', fontWeight: '600' }}>
                                                {student.first_name} {student.middle_name || ''} {student.last_name}
                                            </td>
                                            <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280' }}>
                                                {student.grade_level} {student.section_name ? `- ${student.section_name}` : ''}
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <span style={{
                                                    padding: '4px 12px', borderRadius: '10px',
                                                    fontSize: '14px', fontWeight: '800',
                                                    background: student.tier.bg,
                                                    color: student.tier.color
                                                }}>
                                                    {student.average.toFixed(2)}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
                                                {student.lowestGrade.toFixed(2)}
                                            </td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    padding: '6px 12px',
                                                    borderRadius: '10px',
                                                    fontSize: '12px',
                                                    fontWeight: '700',
                                                    background: student.tier.bg,
                                                    color: student.tier.color,
                                                    border: `1px solid ${student.tier.border}`
                                                }}>
                                                    <span style={{ fontSize: '14px' }}>{student.tier.icon}</span>
                                                    {student.tier.label}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                <Link
                                                    to={`/admin/student-history?studentId=${student.student_id}`}
                                                    style={{
                                                        background: '#dbeafe', color: '#1a56db',
                                                        textDecoration: 'none', padding: '6px 14px',
                                                        borderRadius: '6px', fontSize: '12px',
                                                        fontWeight: '600', display: 'inline-block'
                                                    }}
                                                >
                                                    👁️ View
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div style={{
                    background: 'white', padding: '20px', borderRadius: '12px',
                    marginTop: '24px', border: '1px solid #e5e7eb',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                    <h4 style={{ fontSize: '14px', color: '#374151', marginBottom: '12px', fontWeight: '700' }}>
                        📖 Honor Criteria (DepEd Order No. 36, s. 2016)
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#6b7280' }}>
                        <div><strong style={{ color: '#92400e' }}>🏆 With Highest Honors:</strong> Average ≥ 98, no grade below 90</div>
                        <div><strong style={{ color: '#1a56db' }}>🥇 With High Honors:</strong> Average ≥ 95, no grade below 90</div>
                        <div><strong style={{ color: '#065f46' }}>🥈 With Honors:</strong> Average ≥ 90, no grade below 85</div>
                    </div>
                </div>

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

export default HonorStudents;