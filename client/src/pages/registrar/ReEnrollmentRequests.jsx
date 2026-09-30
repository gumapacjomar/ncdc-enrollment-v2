import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';

const ReEnrollmentRequests = () => {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [processing, setProcessing] = useState(null);
    const [profilePic, setProfilePic] = useState(null);

    const [showViewModal, setShowViewModal] = useState(false);
    const [viewingRequest, setViewingRequest] = useState(null);
    const [viewingGrades, setViewingGrades] = useState([]);
    const [loadingGrades, setLoadingGrades] = useState(false);

    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectingId, setRejectingId] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const OLD_QUARTERS = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'];
    const NEW_TERMS = ['Term 1', 'Term 2', 'Term 3'];

    const TERM_SHORT_MAP = {
        '1st Quarter': 'Q1',
        '2nd Quarter': 'Q2',
        '3rd Quarter': 'Q3',
        '4th Quarter': 'Q4',
        'Term 1': 'T1',
        'Term 2': 'T2',
        'Term 3': 'T3'
    };

    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user || (user.role !== 'registrar' && user.role !== 'admin')) {
            navigate('/login');
        }
        if (user) {
            fetchProfile();
            fetchRequests();
        }
        // eslint-disable-next-line
    }, [navigate]);

    const fetchProfile = async () => {
        try {
            const res = await API.get(`/registrar/profile/${user.id}`);
            if (res.data.profile_pic) {
                setProfilePic(`${UPLOADS_URL}/profiles/${res.data.profile_pic}`);
            }
        } catch (err) {
            console.error('Profile fetch error:', err);
        }
    };

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await API.get('/registrar/reenrollment/pending');
            setRequests(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch requests error:', err);
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to load requests' });
        } finally {
            setLoading(false);
        }
    };

    const handleView = async (req) => {
        setViewingRequest(req);
        setShowViewModal(true);
        setLoadingGrades(true);
        setViewingGrades([]);

        try {
            const res = await API.get(`/registrar/grades/enrollment/${req.current_enrollment_id}`);
            setViewingGrades(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Fetch grades error:', err);
            setViewingGrades([]);
        } finally {
            setLoadingGrades(false);
        }
    };

    const handleApprove = async (id, studentName) => {
        if (!window.confirm(`✅ Approve re-enrollment for ${studentName}?\n\nMa-enroll siya sa next grade automatically.`)) return;

        setProcessing(id);
        try {
            const res = await API.post(`/registrar/reenrollment/approve/${id}`, {
                registrarId: user.id,
                remarks: 'Approved by Teacher'
            });
            setMessage({ type: 'success', text: res.data.message });
            setShowViewModal(false);
            await fetchRequests();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to approve' });
        } finally {
            setProcessing(null);
        }
    };

    const handleOpenReject = (id) => {
        setRejectingId(id);
        setRejectReason('');
        setShowRejectModal(true);
    };

    const handleConfirmReject = async () => {
        if (!rejectReason.trim()) {
            alert('Please enter a reason for rejection');
            return;
        }

        setProcessing(rejectingId);
        try {
            await API.post(`/registrar/reenrollment/reject/${rejectingId}`, {
                registrarId: user.id,
                remarks: rejectReason
            });
            setMessage({ type: 'success', text: '❌ Request rejected.' });
            setShowRejectModal(false);
            setShowViewModal(false);
            setRejectingId(null);
            setRejectReason('');
            await fetchRequests();
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to reject' });
        } finally {
            setProcessing(null);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // HYBRID GRADING SYSTEM DETECTION
    // ─────────────────────────────────────────────────────────────
    const detectSystem = (gradeList) => {
        if (!gradeList || gradeList.length === 0) {
            return {
                isOldSystem: false,
                columns: NEW_TERMS,
                displayHeaders: ['T1', 'T2', 'T3']
            };
        }

        const hasOldQuarters = gradeList.some(g =>
            g.quarter && g.quarter.toLowerCase().includes('quarter')
        );

        if (hasOldQuarters) {
            return {
                isOldSystem: true,
                columns: OLD_QUARTERS,
                displayHeaders: ['Q1', 'Q2', 'Q3', 'Q4']
            };
        }

        return {
            isOldSystem: false,
            columns: NEW_TERMS,
            displayHeaders: ['T1', 'T2', 'T3']
        };
    };

    // ─────────────────────────────────────────────────────────────
    // buildSubjectAverages
    // → Groups grades by subject
    // → Computes finalAve (only expected terms)
    // → Flags hasFailingTerm if ANY term < 75
    // → Returns failingTerms array for detail display
    // ─────────────────────────────────────────────────────────────
    const buildSubjectAverages = (gradeList) => {
        if (!gradeList || gradeList.length === 0) return [];

        const detection = detectSystem(gradeList);
        const expectedTerms = detection.columns;

        const bySubject = {};

        gradeList.forEach(g => {
            if (!bySubject[g.subject]) {
                bySubject[g.subject] = {
                    subject: g.subject,
                    q1: null, q2: null, q3: null, q4: null,
                    t1: null, t2: null, t3: null,
                    remarks: ''
                };
            }

            const q = (g.quarter || '').toLowerCase();
            const gradeVal = parseFloat(g.grade);

            if (q.includes('1st quarter')) bySubject[g.subject].q1 = gradeVal;
            else if (q.includes('2nd quarter')) bySubject[g.subject].q2 = gradeVal;
            else if (q.includes('3rd quarter')) bySubject[g.subject].q3 = gradeVal;
            else if (q.includes('4th quarter')) bySubject[g.subject].q4 = gradeVal;
            else if (q === 'term 1') bySubject[g.subject].t1 = gradeVal;
            else if (q === 'term 2') bySubject[g.subject].t2 = gradeVal;
            else if (q === 'term 3') bySubject[g.subject].t3 = gradeVal;

            if (g.remarks) bySubject[g.subject].remarks = g.remarks;
        });

        return Object.entries(bySubject).map(([subject, data]) => {
            const termMap = {};

            if (detection.isOldSystem) {
                if (data.q1 !== null) termMap['1st Quarter'] = data.q1;
                if (data.q2 !== null) termMap['2nd Quarter'] = data.q2;
                if (data.q3 !== null) termMap['3rd Quarter'] = data.q3;
                if (data.q4 !== null) termMap['4th Quarter'] = data.q4;
            } else {
                if (data.t1 !== null) termMap['Term 1'] = data.t1;
                if (data.t2 !== null) termMap['Term 2'] = data.t2;
                if (data.t3 !== null) termMap['Term 3'] = data.t3;
            }

            // Only expected terms for average
            const values = expectedTerms
                .map(t => termMap[t])
                .filter(v => v !== null && v !== undefined && !isNaN(v));

            const finalAve = values.length > 0
                ? parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2))
                : null;

            // ✅ NEW POLICY: flag ANY term below 75
            const failingTerms = [];
            expectedTerms.forEach(term => {
                const val = termMap[term];
                if (val !== null && val !== undefined && !isNaN(val) && val < 75) {
                    failingTerms.push({
                        term,
                        short: TERM_SHORT_MAP[term] || term,
                        value: val
                    });
                }
            });

            const hasFailingTerm = failingTerms.length > 0;

            return {
                subject,
                q1: data.q1, q2: data.q2, q3: data.q3, q4: data.q4,
                t1: data.t1, t2: data.t2, t3: data.t3,
                termMap,
                finalAve,
                isOldSystem: detection.isOldSystem,
                failingTerms,
                hasFailingTerm,
                remarks: data.remarks
            };
        });
    };

    const calculateAverage = (gradeList) => {
        if (gradeList.length === 0) return 0;
        const sum = gradeList.reduce((acc, g) => acc + parseFloat(g.grade || 0), 0);
        return (sum / gradeList.length).toFixed(2);
    };

    const getGradeColor = (grade) => {
        if (!grade) return { bg: '#f3f4f6', color: '#6b7280' };
        const num = parseFloat(grade);
        if (num >= 90) return { bg: '#d1fae5', color: '#065f46' };
        if (num >= 85) return { bg: '#dbeafe', color: '#1a56db' };
        if (num >= 75) return { bg: '#fef3c7', color: '#92400e' };
        return { bg: '#fee2e2', color: '#991b1b' };
    };

    // ─────────────────────────────────────────────────────────────
    // ✅ NEW ELIGIBILITY: checkEligibility uses hasFailingTerm
    // FAILED if ANY subject has hasFailingTerm = true
    // PROMOTED otherwise
    // ─────────────────────────────────────────────────────────────
    const checkEligibility = (gradeList) => {
        if (gradeList.length === 0) {
            return {
                status: 'NO_DATA',
                eligible: false,
                reason: 'No grades recorded',
                color: '#6b7280',
                bgColor: '#f3f4f6',
                borderColor: '#d1d5db',
                icon: '❓',
                label: 'NO DATA',
                failedSubjects: []
            };
        }

        const subjectAves = buildSubjectAverages(gradeList);
        const failedSubjects = subjectAves.filter(s => s.hasFailingTerm);

        const overall = calculateAverage(gradeList);

        // ✅ PROMOTED — walay bisan usa ka subject with failing term
        if (failedSubjects.length === 0) {
            return {
                status: 'PROMOTED',
                eligible: true,
                reason: `All terms passed (Ave: ${overall})`,
                color: '#065f46',
                bgColor: '#d1fae5',
                borderColor: '#34d399',
                icon: '✅',
                label: 'PROMOTED',
                failedSubjects: []
            };
        }

        // ❌ FAILED — naay bisan usa ka subject with term below 75
        const detail = failedSubjects
            .map(s =>
                `${s.subject} (${s.failingTerms
                    .map(ft => `${ft.short}: ${ft.value.toFixed(2)}`)
                    .join(', ')})`
            )
            .join('; ');

        return {
            status: 'FAILED',
            eligible: false,
            reason: `❌ FAILED — Subject(s) with term below 75: ${detail}`,
            color: '#991b1b',
            bgColor: '#fee2e2',
            borderColor: '#fca5a5',
            icon: '❌',
            label: 'FAILED — RETAINED',
            failedSubjects
        };
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

    const currentPage = 'reenrollment';

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
                    display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0
                }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #dbeafe, #bfdbfe)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#1a56db', fontSize: '20px', fontWeight: 'bold',
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

                <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto' }}>
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
                                fontSize: '14px', marginBottom: '2px',
                                position: 'relative', boxSizing: 'border-box'
                            }}>
                                {isActive && (
                                    <span style={{
                                        position: 'absolute', left: '0', top: '50%',
                                        transform: 'translateY(-50%)', width: '3px', height: '24px',
                                        background: '#1a56db', borderRadius: '0 4px 4px 0'
                                    }} />
                                )}
                                <span style={{ fontSize: '18px', width: '24px' }}>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
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
                <div style={{ marginBottom: '28px' }}>
                    <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0, fontWeight: '700' }}>
                        🔄 Re-enrollment Requests
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '14px' }}>
                        Review student applications. Click "View Grades" before approving.
                    </p>
                </div>

                {message.text && (
                    <div style={{
                        padding: '12px 20px', borderRadius: '8px', marginBottom: '20px',
                        background: message.type === 'error' ? '#fee2e2' : '#d1fae5',
                        color: message.type === 'error' ? '#991b1b' : '#065f46'
                    }}>{message.text}</div>
                )}

                <div style={{
                    background: '#fef3c7', padding: '14px 20px', borderRadius: '12px',
                    marginBottom: '20px', border: '1px solid #f59e0b',
                    fontSize: '13px', color: '#92400e'
                }}>
                    <strong>⚠️ Promotion Policy:</strong> Students with <em>ANY term below 75</em> must <strong>RETAIN</strong> in the same grade level. No conditional promotion.
                </div>

                <div style={{
                    background: 'white', padding: '24px', borderRadius: '14px',
                    border: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                            ⏳ Pending Requests
                        </h3>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                            {requests.length} request(s)
                        </span>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                            ⏳ Loading...
                        </div>
                    ) : requests.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                            <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                            <h3 style={{ color: '#1f2937' }}>No Pending Requests</h3>
                            <p style={{ fontSize: '14px' }}>Wala pay re-enrollment applications from students.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {requests.map(req => (
                                <div key={req.id} style={{
                                    padding: '20px',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '12px',
                                    background: '#f9fafb',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    flexWrap: 'wrap',
                                    gap: '16px'
                                }}>
                                    <div style={{ flex: 1, minWidth: '250px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
                                                {req.first_name} {req.middle_name || ''} {req.last_name}
                                            </h4>
                                            <span style={{
                                                padding: '2px 10px', borderRadius: '10px',
                                                fontSize: '11px', fontWeight: '600',
                                                background: '#dbeafe', color: '#1a56db'
                                            }}>{req.public_id}</span>
                                        </div>
                                        <div style={{ fontSize: '13px', color: '#6b7280', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            <div><strong>Current:</strong> {req.current_grade_level} (SY {req.current_school_year})</div>
                                            <div><strong>Applying for:</strong> <span style={{ color: '#1a56db', fontWeight: '600' }}>{req.next_grade_level} (SY {req.next_school_year})</span></div>
                                            {req.average_grade && (
                                                <div><strong>Average:</strong> <span style={{ color: parseFloat(req.average_grade) >= 75 ? '#065f46' : '#991b1b', fontWeight: '700' }}>{req.average_grade}</span></div>
                                            )}
                                            {req.remarks && <div style={{ fontStyle: 'italic', marginTop: '4px' }}>"{req.remarks}"</div>}
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                                        <button
                                            onClick={() => handleView(req)}
                                            style={{
                                                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                                                color: 'white', border: 'none',
                                                padding: '10px 20px', borderRadius: '8px',
                                                fontSize: '13px', fontWeight: '600', cursor: 'pointer'
                                            }}
                                        >👁️ View Grades</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ===== VIEW MODAL ===== */}
            {showViewModal && viewingRequest && (() => {
                const detection = detectSystem(viewingGrades);
                const subjectAves = buildSubjectAverages(viewingGrades);

                return (
                    <div
                        onClick={() => setShowViewModal(false)}
                        style={{
                            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 1000, padding: '20px', overflowY: 'auto'
                        }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                background: 'white', borderRadius: '16px',
                                maxWidth: '900px', width: '100%', maxHeight: '90vh',
                                overflowY: 'auto', padding: '32px'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                                <div>
                                    <h2 style={{ fontSize: '24px', color: '#1f2937', margin: 0, fontWeight: '700' }}>
                                        👤 {viewingRequest.first_name} {viewingRequest.middle_name || ''} {viewingRequest.last_name}
                                    </h2>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
                                        <span style={{
                                            padding: '4px 12px', background: '#dbeafe', color: '#1a56db',
                                            borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                                        }}>{viewingRequest.public_id}</span>
                                        <span style={{
                                            padding: '4px 12px', background: '#f3f4f6', color: '#6b7280',
                                            borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                                        }}>Current: {viewingRequest.current_grade_level}</span>
                                        <span style={{
                                            padding: '4px 12px', background: '#d1fae5', color: '#065f46',
                                            borderRadius: '12px', fontSize: '12px', fontWeight: '600'
                                        }}>Applying for: {viewingRequest.next_grade_level}</span>
                                        <span style={{
                                            padding: '4px 12px',
                                            background: detection.isOldSystem ? '#fef3c7' : '#dbeafe',
                                            color: detection.isOldSystem ? '#92400e' : '#1a56db',
                                            borderRadius: '12px', fontSize: '12px', fontWeight: '700'
                                        }}>
                                            {detection.isOldSystem ? '📗 Old System (4Q)' : '📘 New System (3T)'}
                                        </span>
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

                            {!loadingGrades && viewingGrades.length > 0 && (() => {
                                const elig = checkEligibility(viewingGrades);
                                return (
                                    <div style={{
                                        padding: '16px 20px',
                                        background: elig.bgColor,
                                        border: `2px solid ${elig.borderColor}`,
                                        borderRadius: '12px',
                                        marginBottom: '20px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '32px' }}>{elig.icon}</span>
                                            <div style={{ flex: 1 }}>
                                                <div style={{
                                                    fontSize: '16px',
                                                    fontWeight: '700',
                                                    color: elig.color
                                                }}>
                                                    {elig.label}
                                                </div>
                                                <div style={{
                                                    fontSize: '13px',
                                                    color: elig.color,
                                                    marginTop: '2px'
                                                }}>
                                                    {elig.reason}
                                                </div>
                                            </div>
                                        </div>

                                        {elig.status === 'FAILED' && (
                                            <div style={{
                                                marginTop: '12px',
                                                padding: '10px 14px',
                                                background: 'rgba(255,255,255,0.5)',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                color: '#991b1b',
                                                fontWeight: '600'
                                            }}>
                                                📌 Policy: Students with ANY term below 75 must RETAIN in the same grade level. No conditional promotion.
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}

                            <div style={{
                                background: '#f9fafb', borderRadius: '12px',
                                padding: '20px', marginBottom: '20px',
                                border: '1px solid #e5e7eb'
                            }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '16px',
                                    flexWrap: 'wrap',
                                    gap: '12px'
                                }}>
                                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>
                                        📊 Grades — {viewingRequest.current_grade_level} ({viewingRequest.current_school_year})
                                    </h3>
                                    {viewingGrades.length > 0 && (
                                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                            Average:{' '}
                                            <strong style={{
                                                color: parseFloat(calculateAverage(viewingGrades)) >= 75 ? '#065f46' : '#991b1b',
                                                fontSize: '18px'
                                            }}>
                                                {calculateAverage(viewingGrades)}
                                            </strong>
                                        </div>
                                    )}
                                </div>

                                {loadingGrades ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                        ⏳ Loading grades...
                                    </div>
                                ) : viewingGrades.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                                        <div style={{ fontSize: '48px', marginBottom: '8px' }}>📭</div>
                                        <p style={{ fontSize: '14px' }}>No grades recorded yet.</p>
                                    </div>
                                ) : (
                                    <div style={{ overflowX: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                                            <thead>
                                                <tr style={{ background: '#1a56db', color: 'white' }}>
                                                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700' }}>SUBJECT</th>
                                                    {detection.displayHeaders.map((h, i) => (
                                                        <th key={i} style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12px', fontWeight: '700', width: '70px' }}>{h}</th>
                                                    ))}
                                                    <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: '12px', fontWeight: '700', width: '90px' }}>FINAL</th>
                                                    <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: '12px', fontWeight: '700' }}>REMARKS</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {subjectAves.map((subj, idx) => {
                                                    const gc = getGradeColor(subj.finalAve);
                                                    const isFail = subj.hasFailingTerm;

                                                    const cellValues = detection.isOldSystem
                                                        ? [subj.q1, subj.q2, subj.q3, subj.q4]
                                                        : [subj.t1, subj.t2, subj.t3];

                                                    const termKeys = detection.isOldSystem
                                                        ? ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter']
                                                        : ['Term 1', 'Term 2', 'Term 3'];

                                                    return (
                                                        <tr key={idx} style={{
                                                            borderBottom: '1px solid #e5e7eb',
                                                            background: isFail ? 'rgba(254,226,226,0.5)' : 'white'
                                                        }}>
                                                            <td style={{ padding: '10px 14px', fontSize: '14px', fontWeight: '600', color: isFail ? '#991b1b' : '#1f2937' }}>
                                                                {subj.subject}
                                                                {isFail && (
                                                                    <span style={{
                                                                        marginLeft: '6px', padding: '1px 6px',
                                                                        fontSize: '9px', fontWeight: '700',
                                                                        background: '#dc2626', color: 'white',
                                                                        borderRadius: '4px'
                                                                    }}>FAILED</span>
                                                                )}
                                                            </td>
                                                            {cellValues.map((v, i) => {
                                                                const termKey = termKeys[i];
                                                                const termVal = subj.termMap[termKey];
                                                                const isFailingTerm = termVal !== undefined && termVal !== null && termVal < 75;
                                                                return (
                                                                    <td
                                                                        key={i}
                                                                        style={{
                                                                            padding: '10px 14px',
                                                                            textAlign: 'center',
                                                                            fontSize: '13px',
                                                                            fontWeight: isFailingTerm ? '700' : '400',
                                                                            color: isFailingTerm ? '#991b1b' : '#374151',
                                                                            background: isFailingTerm ? 'rgba(220,38,38,0.15)' : 'transparent'
                                                                        }}
                                                                    >
                                                                        {v !== null && v !== undefined ? parseFloat(v).toFixed(2) : '—'}
                                                                    </td>
                                                                );
                                                            })}
                                                            <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                                {subj.finalAve !== null ? (
                                                                    <span style={{
                                                                        padding: '4px 12px', borderRadius: '10px',
                                                                        fontSize: '13px', fontWeight: '700',
                                                                        background: gc.bg, color: gc.color
                                                                    }}>{subj.finalAve}</span>
                                                                ) : '—'}
                                                            </td>
                                                            <td style={{ padding: '10px 14px', fontSize: '13px', color: '#6b7280', fontStyle: 'italic' }}>
                                                                {subj.remarks || '—'}
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
                                display: 'flex',
                                gap: '12px',
                                justifyContent: 'flex-end',
                                flexWrap: 'wrap',
                                paddingTop: '20px',
                                borderTop: '2px solid #e5e7eb'
                            }}>
                                <button
                                    onClick={() => setShowViewModal(false)}
                                    style={{
                                        padding: '12px 24px', background: '#f3f4f6',
                                        color: '#6b7280', border: '1px solid #d1d5db',
                                        borderRadius: '10px', fontWeight: '600',
                                        cursor: 'pointer', fontSize: '14px'
                                    }}
                                >Close</button>

                                <button
                                    onClick={() => handleOpenReject(viewingRequest.id)}
                                    disabled={processing === viewingRequest.id}
                                    style={{
                                        padding: '12px 24px',
                                        background: 'linear-gradient(135deg, #ef4444, #f87171)',
                                        color: 'white', border: 'none',
                                        borderRadius: '10px', fontWeight: '600',
                                        cursor: processing === viewingRequest.id ? 'not-allowed' : 'pointer',
                                        fontSize: '14px'
                                    }}
                                >❌ Reject</button>

                                <button
                                    onClick={() => handleApprove(viewingRequest.id, `${viewingRequest.first_name} ${viewingRequest.last_name}`)}
                                    disabled={processing === viewingRequest.id}
                                    style={{
                                        padding: '12px 32px',
                                        background: processing === viewingRequest.id ? '#93c5fd' : 'linear-gradient(135deg, #10b981, #34d399)',
                                        color: 'white', border: 'none',
                                        borderRadius: '10px', fontWeight: '700',
                                        cursor: processing === viewingRequest.id ? 'not-allowed' : 'pointer',
                                        fontSize: '15px',
                                        boxShadow: '0 4px 15px rgba(16,185,129,0.3)'
                                    }}
                                >{processing === viewingRequest.id ? '⏳ Processing...' : '✅ Approve Re-enrollment'}</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* REJECT MODAL */}
            {showRejectModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1100, padding: '20px'
                }}>
                    <div style={{
                        background: 'white', borderRadius: '16px',
                        maxWidth: '450px', width: '100%', padding: '32px'
                    }}>
                        <h2 style={{ fontSize: '20px', color: '#1f2937', margin: '0 0 16px' }}>
                            ❌ Reject Request
                        </h2>
                        <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
                            Kinahanglan i-explain ang reason for rejection.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="e.g., May term below 75 (failed), Incomplete grades, Failed subjects..."
                            rows={4}
                            style={{
                                width: '100%', padding: '10px 14px',
                                border: '1px solid #d1d5db', borderRadius: '8px',
                                fontSize: '14px', outline: 'none',
                                resize: 'vertical', boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <button
                                onClick={() => {
                                    setShowRejectModal(false);
                                    setRejectingId(null);
                                    setRejectReason('');
                                }}
                                style={{
                                    flex: 1, padding: '12px', background: '#f3f4f6',
                                    color: '#6b7280', border: 'none',
                                    borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                                }}
                            >Cancel</button>
                            <button
                                onClick={handleConfirmReject}
                                disabled={processing === rejectingId}
                                style={{
                                    flex: 1, padding: '12px',
                                    background: 'linear-gradient(135deg, #ef4444, #f87171)',
                                    color: 'white', border: 'none',
                                    borderRadius: '8px', fontWeight: '600', cursor: 'pointer'
                                }}
                            >{processing === rejectingId ? 'Rejecting...' : 'Confirm Reject'}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReEnrollmentRequests;