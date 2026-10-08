import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import API from '../../services/api';
import UPLOADS_URL from '../../services/uploads';
import { computeHonorFromSubjects } from '../../utils/honors';

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

    useEffect(() => {
        if (!user || (user.role !== 'admin' && user.role !== 'registrar')) {
            navigate('/login');
        }
    }, [navigate]);

    useEffect(() => {
        if (user && (user.role === 'admin' || user.role === 'registrar')) {
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
            const endpoint = user.role === 'admin' ? 'admin' : 'registrar';
            const response = await API.get(`/${endpoint}/profile/${user.id}`);
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

    const getMenuItems = () => {
        if (user.role === 'registrar') {
            return [
                { id: 'applications', icon: '📋', label: 'Applications', path: '/registrar/dashboard' },
                { id: 'enrolled', icon: '🎓', label: 'Enrolled Students', path: '/registrar/dashboard' },
                { id: 'sections', icon: '🏫', label: 'Sections', path: '/registrar/sections' },
                { id: 'subjects', icon: '📚', label: 'Subjects', path: '/registrar/subjects' },
                { id: 'enrollments', icon: '📝', label: 'Enrollments', path: '/registrar/enrollments' },
                { id: 'reenrollment', icon: '🔄', label: 'Re-enrollment', path: '/registrar/re-enrollment-requests' },
                { id: 'grades', icon: '📊', label: 'Grades', path: '/registrar/grades' },
                { id: 'remarks', icon: '💬', label: 'Remarks', path: '/registrar/remarks' },
                { id: 'honor-students', icon: '🏆', label: 'Honor Students', path: '/registrar/honor-students' },
                { id: 'student-history', icon: '📚', label: 'Student History', path: '/registrar/student-history' }
            ];
        } else {
            return [
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
        }
    };

    const menuItems = getMenuItems();
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

    const detectSystem = (gradesForEnrollment) => {
        if (!gradesForEnrollment || gradesForEnrollment.length === 0) {
            return { isOldSystem: false, columns: ['Term 1', 'Term 2', 'Term 3'], displayHeaders: ['Term 1', 'Term 2', 'Term 3'] };
        }

        const hasOldQuarters = gradesForEnrollment.some(g =>
            g.quarter && g.quarter.toLowerCase().includes('quarter')
        );

        if (hasOldQuarters) {
            return {
                isOldSystem: true,
                columns: ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter'],
                displayHeaders: ['Q1', 'Q2', 'Q3', 'Q4']
            };
        }

        return {
            isOldSystem: false,
            columns: ['Term 1', 'Term 2', 'Term 3'],
            displayHeaders: ['Term 1', 'Term 2', 'Term 3']
        };
    };

    // =============================================
    // ✅ FIXED: buildRoadmap — per enrollment, dili per grade level
    // Kada enrollment (school year) kay separate record — labi na retained
    // =============================================
    const buildRoadmap = () => {
        if (!history) return [];

        const enrollments = history.enrollments || [];
        const grades = history.grades || [];

        // ✅ Sort enrollments chronologically (oldest first)
        const sortedEnrollments = [...enrollments].sort((a, b) => {
            if (a.school_year !== b.school_year) return a.school_year.localeCompare(b.school_year);
            return a.id - b.id;
        });

        // ✅ Map EACH enrollment to a separate roadmap entry
        return sortedEnrollments.map((enrollment, idx) => {
            const gradeLevel = enrollment.grade_level;

            // Get grades for THIS specific enrollment only
            const gradesForEnrollment = grades.filter(g =>
                g.enrollment_id === enrollment.id
            );

            const subjectsForGrade = allSubjects.filter(s => s.grade_level === gradeLevel);
            const detection = detectSystem(gradesForEnrollment);

            const subjects = subjectsForGrade.map(subject => {
                const cellValues = detection.columns.map(col =>
                    gradesForEnrollment.find(g =>
                        g.subject === subject.subject_name && g.quarter === col
                    )
                );

                const grades_list = cellValues.filter(Boolean).map(g => parseFloat(g.grade));
                const finalAve = grades_list.length > 0
                    ? (grades_list.reduce((a, b) => a + b, 0) / grades_list.length).toFixed(2)
                    : null;

                const remarks = cellValues.filter(Boolean).slice(-1)[0]?.remarks || null;

                const dynamicFields = {};
                cellValues.forEach((cell, i) => {
                    if (detection.isOldSystem) {
                        dynamicFields[`q${i + 1}`] = cell?.grade || null;
                    } else {
                        dynamicFields[`t${i + 1}`] = cell?.grade || null;
                    }
                });

                // ✅ Check kung naay term < 75 (DepEd promotion rule)
                const hasFailingTerm = cellValues.some(c => c && parseFloat(c.grade) < 75);

                return {
                    subject_name: subject.subject_name,
                    ...dynamicFields,
                    finalAve,
                    remarks,
                    isFailed: hasFailingTerm,
                    hasFailingTerm
                };
            });

            // ✅ Status determination
            let status = 'future';
            if (enrollment.status === 'enrolled') status = 'current';
            else if (enrollment.status === 'passed') status = 'completed';
            else if (enrollment.status === 'graduated') status = 'graduated';
            else if (enrollment.status === 'failed') status = 'failed';
            else if (enrollment.status === 'dropped') status = 'dropped';
            else if (enrollment.status === 'transferred') status = 'transferred';
            else status = 'completed';

            const hasFailedSubjects = subjects.some(s => s.isFailed);

            // ✅ Honor computation
            const subjectsWithGrades = subjects.filter(s => s.finalAve !== null);
            const hasAnyGrades = subjectsWithGrades.length > 0;

            let honor = { isHonor: false, tier: null };
            if (hasAnyGrades && !hasFailedSubjects) {
                const computedHonor = computeHonorFromSubjects(
                    subjectsWithGrades.map(s => ({ subject: s.subject_name, finalAve: s.finalAve }))
                );
                if (computedHonor.isHonor) {
                    honor = computedHonor;
                }
            }

            // ✅ Detect if this is a RETAIN (same grade as previous enrollment)
            const previousEnrollment = idx > 0 ? sortedEnrollments[idx - 1] : null;
            const isRetained = previousEnrollment && previousEnrollment.grade_level === gradeLevel;

            return {
                grade_level: gradeLevel,
                enrollment,
                school_year: enrollment.school_year,
                section: enrollment.section_name,
                subjects,
                status,
                hasFailedSubjects,
                isOldSystem: detection.isOldSystem,
                displayHeaders: detection.displayHeaders,
                columnsCount: detection.columns.length,
                honor,
                hasAnyGrades,
                isRetained,
                enrollmentIndex: idx
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

    const renderRoadmap = () => {
        const roadmap = buildRoadmap();

        if (roadmap.length === 0) {
            return (
                <div style={{
                    background: 'white', padding: '60px', borderRadius: '14px',
                    textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb'
                }}>
                    <div style={{ fontSize: '64px', marginBottom: '12px' }}>📭</div>
                    <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>Walay Enrollment Records</h3>
                    <p>Wala pa ma-enroll ni nga student sa bisan unsang grade level.</p>
                </div>
            );
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {roadmap.map((grade, idx) => {
                    let bgColor, borderColor, headerBg, headerText, badgeColor;

                    if (grade.status === 'current') {
                        bgColor = '#dbeafe';
                        borderColor = '#3b82f6';
                        headerBg = 'linear-gradient(135deg, #1a56db, #3b82f6)';
                        headerText = 'white';
                        badgeColor = { bg: '#1a56db', color: 'white', label: 'Current' };
                    } else if (grade.status === 'completed') {
                        bgColor = '#dcfce7';
                        borderColor = '#10b981';
                        headerBg = 'linear-gradient(135deg, #059669, #10b981)';
                        headerText = 'white';
                        badgeColor = { bg: '#10b981', color: 'white', label: '✅ Completed' };
                    } else if (grade.status === 'failed') {
                        bgColor = '#fee2e2';
                        borderColor = '#ef4444';
                        headerBg = 'linear-gradient(135deg, #dc2626, #ef4444)';
                        headerText = 'white';
                        badgeColor = { bg: '#dc2626', color: 'white', label: '❌ FAILED' };
                    } else if (grade.status === 'graduated') {
                        bgColor = '#e0e7ff';
                        borderColor = '#8b5cf6';
                        headerBg = 'linear-gradient(135deg, #7c3aed, #8b5cf6)';
                        headerText = 'white';
                        badgeColor = { bg: '#7c3aed', color: 'white', label: '🎓 Graduated' };
                    } else if (grade.status === 'dropped' || grade.status === 'transferred') {
                        bgColor = '#fef3c7';
                        borderColor = '#f59e0b';
                        headerBg = 'linear-gradient(135deg, #d97706, #f59e0b)';
                        headerText = 'white';
                        badgeColor = { bg: '#d97706', color: 'white', label: `⚠️ ${grade.status.toUpperCase()}` };
                    } else {
                        bgColor = '#f9fafb';
                        borderColor = '#e5e7eb';
                        headerBg = '#f3f4f6';
                        headerText = '#6b7280';
                        badgeColor = { bg: '#e5e7eb', color: '#6b7280', label: 'Unknown' };
                    }

                    const overallAve = calculateOverallAverage(grade.subjects);
                    const isHonor = grade.hasAnyGrades && grade.honor && grade.honor.isHonor;

                    return (
                        <div key={`${grade.grade_level}-${grade.school_year}-${idx}`} style={{
                            background: 'white',
                            borderRadius: '16px',
                            border: `2px solid ${isHonor ? grade.honor.tier.border : borderColor}`,
                            overflow: 'hidden',
                            boxShadow: isHonor
                                ? `0 4px 20px ${grade.honor.tier.border}40`
                                : '0 2px 8px rgba(0,0,0,0.04)',
                            position: 'relative'
                        }}>
                            {/* ✅ Retain indicator — separate entry para sa same grade */}
                            {grade.isRetained && (
                                <div style={{
                                    position: 'absolute',
                                    top: '12px',
                                    right: '12px',
                                    background: '#fbbf24',
                                    color: '#78350f',
                                    padding: '4px 12px',
                                    borderRadius: '12px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    zIndex: 10,
                                    boxShadow: '0 2px 8px rgba(251,191,36,0.4)'
                                }}>
                                    🔁 RETAINED
                                </div>
                            )}

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
                                            fontSize: '13px', opacity: 0.95,
                                            background: 'rgba(255,255,255,0.2)',
                                            padding: '4px 12px', borderRadius: '12px'
                                        }}>S.Y. {grade.school_year}</span>
                                    )}
                                    {grade.section && (
                                        <span style={{
                                            fontSize: '13px', opacity: 0.95,
                                            background: 'rgba(255,255,255,0.2)',
                                            padding: '4px 12px', borderRadius: '12px'
                                        }}>{grade.section}</span>
                                    )}
                                    {grade.enrollment && (
                                        <span style={{
                                            fontSize: '10px',
                                            background: 'rgba(255,255,255,0.25)',
                                            color: 'white',
                                            padding: '3px 8px',
                                            borderRadius: '8px',
                                            fontWeight: '700'
                                        }}>
                                            {grade.isOldSystem ? '📗 4Q' : '📘 3T'}
                                        </span>
                                    )}
                                    {isHonor && (
                                        <span style={{
                                            fontSize: '12px',
                                            background: grade.honor.tier.bg,
                                            color: grade.honor.tier.color,
                                            padding: '5px 12px',
                                            borderRadius: '12px',
                                            fontWeight: '800',
                                            border: `2px solid ${grade.honor.tier.border}`,
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            boxShadow: `0 2px 8px ${grade.honor.tier.border}60`
                                        }}>
                                            <span style={{ fontSize: '14px' }}>{grade.honor.tier.icon}</span>
                                            {grade.honor.tier.label}
                                        </span>
                                    )}
                                    {grade.hasFailedSubjects && grade.status !== 'failed' && (
                                        <span style={{
                                            fontSize: '11px',
                                            background: '#fee2e2',
                                            color: '#991b1b',
                                            padding: '4px 10px',
                                            borderRadius: '12px',
                                            fontWeight: '700'
                                        }}>⚠️ May bagsak</span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {overallAve && (
                                        <div style={{
                                            fontSize: '14px', fontWeight: '700',
                                            background: 'rgba(255,255,255,0.2)',
                                            padding: '6px 14px', borderRadius: '12px'
                                        }}>Overall Ave: {overallAve}</div>
                                    )}
                                    <span style={{
                                        fontSize: '11px', fontWeight: '700',
                                        background: badgeColor.bg, color: badgeColor.color,
                                        padding: '4px 12px', borderRadius: '12px',
                                        textTransform: 'uppercase'
                                    }}>{badgeColor.label}</span>
                                </div>
                            </div>

                            {grade.subjects.length === 0 ? (
                                <div style={{
                                    padding: '40px 20px', textAlign: 'center',
                                    background: bgColor, color: '#6b7280'
                                }}>
                                    <div style={{ fontSize: '40px', marginBottom: '8px' }}>📚</div>
                                    <div style={{ fontSize: '14px', fontWeight: '600' }}>
                                        Wala pay subjects nga gi-setup for {grade.grade_level}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', background: bgColor }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ background: 'rgba(255,255,255,0.5)' }}>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase' }}>Subject</th>
                                                {grade.displayHeaders.map((h, i) => (
                                                    <th key={i} style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', width: '70px' }}>
                                                        {h}
                                                    </th>
                                                ))}
                                                <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', width: '100px' }}>Final Ave</th>
                                                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: '#374151', textTransform: 'uppercase', width: '140px' }}>Remarks</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {grade.subjects.map((subject, sidx) => {
                                                const cellValues = grade.isOldSystem
                                                    ? [subject.q1, subject.q2, subject.q3, subject.q4]
                                                    : [subject.t1, subject.t2, subject.t3];

                                                return (
                                                    <tr key={sidx} style={{
                                                        borderTop: '1px solid rgba(0,0,0,0.05)',
                                                        background: subject.isFailed
                                                            ? 'rgba(254, 226, 226, 0.7)'
                                                            : (sidx % 2 === 0 ? 'rgba(255,255,255,0.4)' : 'transparent')
                                                    }}>
                                                        <td style={{
                                                            padding: '12px 16px', fontSize: '14px',
                                                            fontWeight: subject.isFailed ? '700' : '600',
                                                            color: subject.isFailed ? '#991b1b' : '#1f2937'
                                                        }}>
                                                            {subject.subject_name}
                                                            {subject.isFailed && (
                                                                <span style={{
                                                                    marginLeft: '8px',
                                                                    padding: '2px 8px',
                                                                    background: '#dc2626',
                                                                    color: 'white',
                                                                    borderRadius: '8px',
                                                                    fontSize: '10px',
                                                                    fontWeight: '700'
                                                                }}>FAILED</span>
                                                            )}
                                                        </td>
                                                        {cellValues.map((q, qi) => (
                                                            <td key={qi} style={{
                                                                padding: '12px 16px',
                                                                textAlign: 'center',
                                                                fontSize: '14px',
                                                                fontWeight: q && parseFloat(q) < 75 ? '700' : '500',
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
                                                                    background: subject.isFailed ? '#fee2e2' : '#dbeafe',
                                                                    color: getGradeColor(subject.finalAve)
                                                                }}>
                                                                    {subject.finalAve}
                                                                </span>
                                                            ) : '—'}
                                                        </td>
                                                        <td style={{
                                                            padding: '12px 16px',
                                                            fontSize: '13px',
                                                            color: subject.isFailed ? '#991b1b' : '#6b7280',
                                                            fontStyle: 'italic',
                                                            fontWeight: subject.isFailed ? '600' : '400'
                                                        }}>
                                                            {subject.remarks || (subject.isFailed ? 'Needs Improvement' : '—')}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
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
                            <span style={{ fontSize: '10px', color: '#6b7280', fontWeight: '500' }}>
                                {user?.role === 'admin' ? 'Principal Panel' : 'Teacher Panel'}
                            </span>
                        </div>
                    </div>
                </div>

                <Link to={`/${user?.role === 'admin' ? 'admin' : 'registrar'}/profile`} style={{
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
                            user?.username?.charAt(0).toUpperCase() || 'A'
                        )}
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937' }}>
                            {user?.username || 'User'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            {user?.role === 'admin' ? 'Principal' : 'Teacher / Staff'}
                        </div>
                    </div>
                </Link>

                <div style={{ padding: '16px 12px', flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
                    {menuItems.map((item) => (
                        <Link key={item.id} to={item.path} style={{
                            display: 'flex', alignItems: 'center', gap: '14px',
                            width: '100%', padding: '12px 16px', borderRadius: '12px',
                            textDecoration: 'none',
                            background: isActive(item.path) ? `linear-gradient(135deg, ${item.color || '#a855f7'}15, ${item.color || '#a855f7'}08)` : 'transparent',
                            color: isActive(item.path) ? (item.color || '#a855f7') : '#6b7280',
                            fontWeight: isActive(item.path) ? '600' : '500',
                            fontSize: '14px', transition: 'all 0.3s ease',
                            marginBottom: '4px', position: 'relative', boxSizing: 'border-box'
                        }}>
                            {isActive(item.path) && (
                                <span style={{
                                    position: 'absolute', left: '0', top: '50%',
                                    transform: 'translateY(-50%)', width: '4px', height: '28px',
                                    background: `linear-gradient(180deg, ${item.color || '#a855f7'}, ${item.color || '#a855f7'}80)`,
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
                        📚 Student Academic History
                    </h1>
                    <p style={{ color: '#6b7280', marginTop: '4px', fontSize: '15px' }}>
                        Complete enrollment history — kada school year separate record
                    </p>
                </div>

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
                            <button onClick={handleClearSelection} style={{
                                position: 'absolute', right: '10px', top: '50%',
                                transform: 'translateY(-50%)', background: '#e5e7eb',
                                border: 'none', width: '26px', height: '26px',
                                borderRadius: '50%', cursor: 'pointer',
                                fontSize: '14px', color: '#6b7280'
                            }}>×</button>
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
                                    <div key={s.application_id} onClick={() => handleSelectStudent(s)}
                                        style={{
                                            padding: '12px 16px', borderBottom: '1px solid #f3f4f6',
                                            cursor: 'pointer', transition: 'background 0.15s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4ff'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
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
                    <div onClick={() => setShowResults(false)}
                        style={{ position: 'fixed', inset: 0, zIndex: 5, background: 'transparent' }} />
                )}

                {loading ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: '#6b7280' }}>
                        ⏳ Loading student history...
                    </div>
                ) : history ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                                }}>{history.student.first_name?.charAt(0).toUpperCase()}</div>
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
                                <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#fee2e2', border: '2px solid #ef4444' }}></span>
                                <span style={{ color: '#991b1b' }}>Failed</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#fef3c7', border: '2px solid #f59e0b' }}></span>
                                <span style={{ color: '#92400e' }}>🔁 Retained</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ width: '16px', height: '16px', borderRadius: '4px', background: '#fef3c7', border: '2px solid #f59e0b' }}></span>
                                <span style={{ color: '#92400e' }}>🏆 Honor Student</span>
                            </div>
                        </div>

                        {renderRoadmap()}
                    </div>
                ) : (
                    <div style={{
                        background: 'white', padding: '60px', borderRadius: '14px',
                        textAlign: 'center', color: '#6b7280', border: '1px solid #e5e7eb'
                    }}>
                        <div style={{ fontSize: '64px', marginBottom: '12px' }}>📚</div>
                        <h3 style={{ color: '#1f2937', marginBottom: '8px' }}>Search for a Student</h3>
                        <p>Type a student's name or ID above to view their complete enrollment history.</p>
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