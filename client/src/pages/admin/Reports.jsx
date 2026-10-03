import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';
import { computeHonorFromGrades, HONOR_TIERS } from '../../utils/honors';

const Reports = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('enrollment');
  const [error, setError] = useState('');

  // ── Enrollment Reports State ──
  const [applications, setApplications] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    confirmed: 0,
    rejected: 0,
    declined: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // ── Academic Reports State ──
  const [academicLoading, setAcademicLoading] = useState(false);
  const [academicSY, setAcademicSY] = useState('');
  const [availableSYs, setAvailableSYs] = useState([]);
  const [academicStats, setAcademicStats] = useState({
    totalStudents: 0,
    honorStudents: 0,
    highestHonors: 0,
    highHonors: 0,
    withHonors: 0,
    failingStudents: 0,
    promotedStudents: 0,
    retainedStudents: 0
  });
  const [honorStudentsList, setHonorStudentsList] = useState([]);
  const [failingStudentsList, setFailingStudentsList] = useState([]);
  const [gradeDistribution, setGradeDistribution] = useState([]);

  const gradeLevels = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6'];

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/login');
      return;
    }
    fetchEnrollmentData();
    fetchAcademicData();
    // eslint-disable-next-line
  }, [navigate]);

  // ══════════════════════════════════════════════════════════
  // ENROLLMENT DATA (existing)
  // ══════════════════════════════════════════════════════════
  const fetchEnrollmentData = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await API.get('/admin/reports');
      if (response.data.success) {
        setApplications(response.data.data || []);
        setStats(response.data.stats || {
          total: 0, pending: 0, approved: 0, confirmed: 0, rejected: 0, declined: 0
        });
        setMonthlyData(response.data.monthlyData || []);
      } else {
        setError('Failed to load reports data');
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════
  // ACADEMIC DATA (NEW)
  // ══════════════════════════════════════════════════════════
  const fetchAcademicData = async (overrideSY = null) => {
    setAcademicLoading(true);
    try {
      const enrollRes = await API.get('/registrar/enrollments');
      const allEnrollments = Array.isArray(enrollRes.data) ? enrollRes.data : [];

      // Valid statuses
      const validStatuses = ['passed', 'enrolled', 'graduated'];
      const validEnrollments = allEnrollments.filter(e =>
        validStatuses.includes(e.status)
      );

      // Collect SYs
      const sySet = new Set();
      validEnrollments.forEach(e => e.school_year && sySet.add(e.school_year));
      const syList = Array.from(sySet).sort((a, b) => b.localeCompare(a));
      setAvailableSYs(syList);

      // Pick target SY
      let targetSY = overrideSY;
      if (!targetSY) {
        const passedSYs = validEnrollments
          .filter(e => e.status === 'passed')
          .map(e => e.school_year);
        targetSY = passedSYs.length > 0
          ? passedSYs.sort((a, b) => b.localeCompare(a))[0]
          : syList[0];
        if (targetSY) setAcademicSY(targetSY);
      }

      if (!targetSY) {
        setAcademicStats({
          totalStudents: 0, honorStudents: 0, highestHonors: 0, highHonors: 0,
          withHonors: 0, failingStudents: 0, promotedStudents: 0, retainedStudents: 0
        });
        setHonorStudentsList([]);
        setFailingStudentsList([]);
        setGradeDistribution([]);
        return;
      }

      // Filter enrollments for target SY
      const syEnrollments = validEnrollments.filter(e => e.school_year === targetSY);

      // Unique students
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

      // Compute stats per student
      const honors = [];
      const failing = [];
      const promoted = [];
      const retained = [];
      const gradeDist = {};

      gradeLevels.forEach(g => {
        gradeDist[g] = { total: 0, honors: 0, failing: 0 };
      });

      const studentIds = Object.keys(uniqueStudents);

      for (const studentId of studentIds) {
        const student = uniqueStudents[studentId];
        try {
          const gradesRes = await API.get(
            `/registrar/grades/enrollment/${student.enrollment_id}`
          );
          const grades = Array.isArray(gradesRes.data) ? gradesRes.data : [];

          // Grade distribution (total per grade level)
          if (gradeDist[student.grade_level]) {
            gradeDist[student.grade_level].total++;
          }

          if (grades.length === 0) continue;

          // Compute honor
          const honor = computeHonorFromGrades(grades);
          const subjects = honor.subjects || [];

          // ✅ Detect failing subjects (any term < 75)
          const failingSubjects = detectFailingSubjects(grades);
          const hasFailing = failingSubjects.length > 0;

          // ── Update stats ──
          if (honor.isHonor) {
            honors.push({
              ...student,
              tier: honor.tier,
              average: honor.average,
              lowestGrade: honor.lowestGrade
            });
            if (gradeDist[student.grade_level]) {
              gradeDist[student.grade_level].honors++;
            }
          }

          if (hasFailing) {
            failing.push({
              ...student,
              failingSubjects,
              average: honor.average
            });
            retained.push(student);
            if (gradeDist[student.grade_level]) {
              gradeDist[student.grade_level].failing++;
            }
          } else {
            promoted.push(student);
          }
        } catch (err) {
          console.error(`Error processing student ${studentId}:`, err);
        }
      }

      // Sort honors by tier + average
      honors.sort((a, b) => {
        if (a.tier.rank !== b.tier.rank) return a.tier.rank - b.tier.rank;
        return b.average - a.average;
      });

      // Sort failing by average ascending (worst first)
      failing.sort((a, b) => (a.average || 0) - (b.average || 0));

      // Build grade distribution array
      const gradeDistArray = gradeLevels.map(g => ({
        grade_level: g,
        ...gradeDist[g]
      }));

      setAcademicStats({
        totalStudents: studentIds.length,
        honorStudents: honors.length,
        highestHonors: honors.filter(s => s.tier === HONOR_TIERS.HIGHEST).length,
        highHonors: honors.filter(s => s.tier === HONOR_TIERS.HIGH).length,
        withHonors: honors.filter(s => s.tier === HONOR_TIERS.WITH_HONORS).length,
        failingStudents: failing.length,
        promotedStudents: promoted.length,
        retainedStudents: retained.length
      });

      setHonorStudentsList(honors);
      setFailingStudentsList(failing);
      setGradeDistribution(gradeDistArray);
    } catch (error) {
      console.error('Error fetching academic data:', error);
    } finally {
      setAcademicLoading(false);
    }
  };

  // ✅ Detect failing subjects — ANY term < 75
  const detectFailingSubjects = (grades) => {
    const bySubject = {};
    grades.forEach(g => {
      const key = g.subject;
      if (!bySubject[key]) bySubject[key] = [];
      const val = parseFloat(g.grade);
      if (!isNaN(val)) {
        bySubject[key].push({ term: g.quarter, value: val });
      }
    });

    const failing = [];
    Object.entries(bySubject).forEach(([subject, terms]) => {
      const failingTerms = terms.filter(t => t.value < 75);
      if (failingTerms.length > 0) {
        failing.push({
          subject,
          failingTerms: failingTerms.map(t => ({ term: t.term, value: t.value }))
        });
      }
    });
    return failing;
  };

  const handleAcademicSYChange = (newSY) => {
    setAcademicSY(newSY);
    fetchAcademicData(newSY);
  };

  // ══════════════════════════════════════════════════════════
  // ENROLLMENT FILTERS (existing)
  // ══════════════════════════════════════════════════════════
  const filteredApplications = applications.filter(app => {
    const fullName = `${app.first_name || ''} ${app.middle_name || ''} ${app.last_name || ''}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) ||
                          (app.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || app.status === filterStatus;

    let matchesDate = true;
    if (dateFrom && dateTo && app.created_at) {
      const appDate = new Date(app.created_at);
      const from = new Date(dateFrom);
      const to = new Date(dateTo);
      matchesDate = appDate >= from && appDate <= to;
    }

    return matchesSearch && matchesFilter && matchesDate;
  });

  // ══════════════════════════════════════════════════════════
  // EXPORT CSV (existing — application export)
  // ══════════════════════════════════════════════════════════
  const exportEnrollmentToCSV = () => {
    const headers = ['Name', 'Email', 'Contact', 'Status', 'Date', 'Teacher', 'Principal'];
    const rows = filteredApplications.map(app => [
      `${app.first_name || ''} ${app.last_name || ''}`,
      app.email || 'N/A',
      app.contact_number || 'N/A',
      app.status || 'N/A',
      app.created_at ? new Date(app.created_at).toLocaleDateString() : 'N/A',
      app.registrar_first_name ? `${app.registrar_first_name} ${app.registrar_last_name || ''}` : 'N/A',
      app.admin_first_name ? `${app.admin_first_name} ${app.admin_last_name || ''}` : 'N/A'
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
      csv += row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `enrollment-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ✅ NEW: Export Academic reports to CSV
  const exportAcademicToCSV = () => {
    const lines = [];

    // Header
    lines.push(`Academic Report — SY ${academicSY}`);
    lines.push(`Generated: ${new Date().toLocaleString()}`);
    lines.push('');

    // Stats summary
    lines.push('== SUMMARY ==');
    lines.push(`Total Students,${academicStats.totalStudents}`);
    lines.push(`Honor Students,${academicStats.honorStudents}`);
    lines.push(`Highest Honors,${academicStats.highestHonors}`);
    lines.push(`High Honors,${academicStats.highHonors}`);
    lines.push(`With Honors,${academicStats.withHonors}`);
    lines.push(`Failing Students,${academicStats.failingStudents}`);
    lines.push(`Promoted,${academicStats.promotedStudents}`);
    lines.push(`Retained,${academicStats.retainedStudents}`);
    lines.push('');

    // Honor students
    lines.push('== HONOR STUDENTS ==');
    lines.push('Rank,Student ID,Name,Grade & Section,Average,Lowest,Tier');
    honorStudentsList.forEach((s, idx) => {
      lines.push([
        idx + 1,
        s.public_id || '',
        `"${s.first_name} ${s.last_name}"`,
        `${s.grade_level}${s.section_name ? ` - ${s.section_name}` : ''}`,
        s.average.toFixed(2),
        s.lowestGrade.toFixed(2),
        s.tier.label
      ].join(','));
    });
    lines.push('');

    // Failing students
    lines.push('== FAILING STUDENTS ==');
    lines.push('Student ID,Name,Grade & Section,Failing Subjects');
    failingStudentsList.forEach(s => {
      const failDetail = s.failingSubjects
        .map(fs => `${fs.subject} (${fs.failingTerms.map(ft => `${ft.term}: ${ft.value.toFixed(2)}`).join(', ')})`)
        .join('; ');
      lines.push([
        s.public_id || '',
        `"${s.first_name} ${s.last_name}"`,
        `${s.grade_level}${s.section_name ? ` - ${s.section_name}` : ''}`,
        `"${failDetail}"`
      ].join(','));
    });

    const csv = lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic-report-SY${academicSY}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const printReport = () => window.print();

  const statusColors = {
    pending: { bg: '#fef3c7', text: '#92400e' },
    approved: { bg: '#dbeafe', text: '#1e40af' },
    confirmed: { bg: '#d1fae5', text: '#065f46' },
    rejected: { bg: '#fee2e2', text: '#991b1b' },
    declined: { bg: '#fef3c7', text: '#92400e' }
  };

  const statusBadge = (status) => {
    const color = statusColors[status] || statusColors.pending;
    return {
      background: color.bg,
      color: color.text,
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-block'
    };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Navbar */}
      <nav style={{
        background: 'white', padding: '16px 32px',
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a56db' }}>🎓 NCDC</span>
          <span style={{ color: '#6b7280' }}>|</span>
          <span style={{ color: '#6b7280', fontWeight: '500' }}>Reports</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#374151' }}>
            👋 {JSON.parse(localStorage.getItem('user'))?.username || 'Principal'}
          </span>
          <button
            onClick={() => { localStorage.clear(); navigate('/login'); }}
            style={{
              background: '#ef4444', color: 'white', border: 'none',
              padding: '8px 20px', borderRadius: '6px',
              cursor: 'pointer', fontSize: '14px'
            }}
          >Logout</button>
        </div>
      </nav>

      <div style={{ padding: '24px 32px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0 }}>📊 Reports</h1>
            <p style={{ color: '#6b7280', marginTop: '4px' }}>
              View, analyze, and export enrollment + academic statistics
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={printReport}
              style={{
                background: '#6b7280', color: 'white', border: 'none',
                padding: '10px 20px', borderRadius: '8px',
                cursor: 'pointer', fontSize: '14px', fontWeight: '500'
              }}
            >🖨️ Print</button>
            <button
              onClick={activeTab === 'enrollment' ? exportEnrollmentToCSV : exportAcademicToCSV}
              style={{
                background: '#10b981', color: 'white', border: 'none',
                padding: '10px 20px', borderRadius: '8px',
                cursor: 'pointer', fontSize: '14px', fontWeight: '500'
              }}
            >📥 Export CSV</button>
            <Link to="/admin/dashboard" style={{
              background: '#6b7280', color: 'white',
              padding: '10px 20px', borderRadius: '8px',
              textDecoration: 'none', fontSize: '14px'
            }}>← Back</Link>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '4px', marginBottom: '24px',
          background: 'white', padding: '6px', borderRadius: '12px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          width: 'fit-content'
        }}>
          <button
            onClick={() => setActiveTab('enrollment')}
            style={{
              padding: '10px 24px', borderRadius: '8px',
              border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: '600',
              background: activeTab === 'enrollment' ? 'linear-gradient(135deg, #1a56db, #3b82f6)' : 'transparent',
              color: activeTab === 'enrollment' ? 'white' : '#6b7280',
              transition: 'all 0.2s'
            }}
          >📋 Enrollment Reports</button>
          <button
            onClick={() => setActiveTab('academic')}
            style={{
              padding: '10px 24px', borderRadius: '8px',
              border: 'none', cursor: 'pointer',
              fontSize: '14px', fontWeight: '600',
              background: activeTab === 'academic' ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : 'transparent',
              color: activeTab === 'academic' ? 'white' : '#6b7280',
              transition: 'all 0.2s'
            }}
          >🎓 Academic Reports</button>
        </div>

        {error && (
          <div style={{
            padding: '12px 16px', borderRadius: '8px', marginBottom: '16px',
            background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5'
          }}>❌ {error}</div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 1: ENROLLMENT REPORTS */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'enrollment' && (
          <>
            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px', marginBottom: '24px'
            }}>
              {[
                { label: 'Total', value: stats.total, color: '#3b82f6' },
                { label: 'Pending', value: stats.pending, color: '#f59e0b' },
                { label: 'Approved', value: stats.approved, color: '#8b5cf6' },
                { label: 'Confirmed', value: stats.confirmed, color: '#10b981' },
                { label: 'Rejected', value: stats.rejected, color: '#ef4444' },
                { label: 'Declined', value: stats.declined, color: '#6b7280' }
              ].map((s, i) => (
                <div key={i} style={{
                  background: 'white', padding: '20px',
                  borderRadius: '12px', textAlign: 'center',
                  borderTop: `4px solid ${s.color}`
                }}>
                  <div style={{ fontSize: '28px', fontWeight: 'bold', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Monthly Chart */}
            {monthlyData.length > 0 && (
              <div style={{
                background: 'white', padding: '20px', borderRadius: '12px',
                marginBottom: '24px', border: '1px solid #e5e7eb'
              }}>
                <h3 style={{ fontSize: '18px', color: '#1f2937', marginBottom: '16px' }}>
                  📈 Monthly Enrollment
                </h3>
                <div style={{
                  display: 'flex', gap: '12px', alignItems: 'flex-end',
                  height: '200px', padding: '10px 0'
                }}>
                  {monthlyData.map((item, index) => {
                    const maxCount = Math.max(...monthlyData.map(d => d.count), 1);
                    const height = (item.count / maxCount) * 100;
                    return (
                      <div key={index} style={{
                        flex: 1, display: 'flex',
                        flexDirection: 'column', alignItems: 'center', gap: '4px'
                      }}>
                        <div style={{
                          width: '100%', background: '#1a56db',
                          height: `${height}%`, minHeight: '4px',
                          borderRadius: '4px', position: 'relative'
                        }}>
                          <span style={{
                            position: 'absolute', top: '-20px', left: '50%',
                            transform: 'translateX(-50%)',
                            fontSize: '12px', fontWeight: '600', color: '#1f2937'
                          }}>{item.count}</span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#6b7280' }}>{item.month}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Filters */}
            <div style={{
              background: 'white', padding: '20px', borderRadius: '12px',
              marginBottom: '24px', border: '1px solid #e5e7eb'
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '16px'
              }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px',
                      border: '1px solid #d1d5db', borderRadius: '6px',
                      fontSize: '14px', marginTop: '4px'
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="rejected">Rejected</option>
                    <option value="declined">Declined</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Date From</label>
                  <input
                    type="date" value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px',
                      border: '1px solid #d1d5db', borderRadius: '6px',
                      fontSize: '14px', marginTop: '4px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Date To</label>
                  <input
                    type="date" value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px',
                      border: '1px solid #d1d5db', borderRadius: '6px',
                      fontSize: '14px', marginTop: '4px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Search</label>
                  <input
                    type="text" placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px',
                      border: '1px solid #d1d5db', borderRadius: '6px',
                      fontSize: '14px', marginTop: '4px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Applications Table */}
            <div style={{
              background: 'white', padding: '20px', borderRadius: '12px',
              border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
              <h3 style={{ fontSize: '18px', color: '#1f2937', marginBottom: '16px' }}>
                📋 Application List
                <span style={{ fontSize: '14px', color: '#6b7280', fontWeight: 'normal', marginLeft: '8px' }}>
                  ({filteredApplications.length} records)
                </span>
              </h3>

              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>⏳ Loading...</div>
              ) : filteredApplications.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                  No applications found.
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>#</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Name</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Email</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Status</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Date</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Teacher</th>
                        <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Principal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.map((app, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                          <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{index + 1}</td>
                          <td style={{ padding: '10px', fontSize: '13px', color: '#1f2937', fontWeight: '500' }}>
                            {app.first_name || ''} {app.middle_name || ''} {app.last_name || ''} {app.suffix || ''}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>{app.email || 'N/A'}</td>
                          <td style={{ padding: '10px' }}>
                            <span style={statusBadge(app.status)}>
                              {app.status ? app.status.charAt(0).toUpperCase() + app.status.slice(1) : 'N/A'}
                            </span>
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>
                            {formatDate(app.created_at)}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>
                            {app.registrar_first_name ? `${app.registrar_first_name} ${app.registrar_last_name || ''}` : 'N/A'}
                          </td>
                          <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>
                            {app.admin_first_name ? `${app.admin_first_name} ${app.admin_last_name || ''}` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* TAB 2: ACADEMIC REPORTS */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeTab === 'academic' && (
          <>
            {/* SY Selector */}
            {availableSYs.length > 0 && (
              <div style={{
                background: 'white', padding: '16px 20px', borderRadius: '12px',
                marginBottom: '20px', border: '1px solid #e5e7eb',
                display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center'
              }}>
                <label style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                  📅 School Year:
                </label>
                <select
                  value={academicSY}
                  onChange={(e) => handleAcademicSYChange(e.target.value)}
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
                  {academicStats.totalStudents} student(s) sa SY {academicSY}
                </div>
              </div>
            )}

            {/* Academic Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
              gap: '16px', marginBottom: '24px'
            }}>
              <div style={{
                background: 'white', padding: '20px', borderRadius: '12px',
                borderTop: '4px solid #3b82f6'
              }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#3b82f6' }}>
                  {academicStats.totalStudents}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
                  🎓 Total Students
                </div>
              </div>

              <div style={{
                background: 'white', padding: '20px', borderRadius: '12px',
                borderTop: '4px solid #f59e0b'
              }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#92400e' }}>
                  {academicStats.honorStudents}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
                  🏆 Honor Students
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                  🏆 {academicStats.highestHonors} • 🥇 {academicStats.highHonors} • 🥈 {academicStats.withHonors}
                </div>
              </div>

              <div style={{
                background: 'white', padding: '20px', borderRadius: '12px',
                borderTop: '4px solid #ef4444'
              }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#dc2626' }}>
                  {academicStats.failingStudents}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
                  ❌ Failing Students
                </div>
                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                  Any term below 75
                </div>
              </div>

              <div style={{
                background: 'white', padding: '20px', borderRadius: '12px',
                borderTop: '4px solid #10b981'
              }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#065f46' }}>
                  {academicStats.promotedStudents}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
                  ✅ Promoted
                </div>
              </div>

              <div style={{
                background: 'white', padding: '20px', borderRadius: '12px',
                borderTop: '4px solid #f97316'
              }}>
                <div style={{ fontSize: '28px', fontWeight: '800', color: '#c2410c' }}>
                  {academicStats.retainedStudents}
                </div>
                <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
                  🔁 Retained
                </div>
              </div>
            </div>

            {academicLoading ? (
              <div style={{
                background: 'white', padding: '60px', borderRadius: '12px',
                textAlign: 'center', color: '#6b7280'
              }}>⏳ Loading academic data...</div>
            ) : (
              <>
                {/* Grade Distribution */}
                {gradeDistribution.length > 0 && (
                  <div style={{
                    background: 'white', padding: '20px', borderRadius: '12px',
                    marginBottom: '24px', border: '1px solid #e5e7eb'
                  }}>
                    <h3 style={{ fontSize: '18px', color: '#1f2937', marginBottom: '16px' }}>
                      📊 Grade Level Distribution (SY {academicSY})
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Grade Level</th>
                            <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Students</th>
                            <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Honor</th>
                            <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Failing</th>
                          </tr>
                        </thead>
                        <tbody>
                          {gradeDistribution.map((g, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '10px', fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>{g.grade_level}</td>
                              <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#374151' }}>{g.total}</td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '4px 12px', borderRadius: '12px',
                                  fontSize: '13px', fontWeight: '700',
                                  background: '#fef3c7', color: '#92400e'
                                }}>{g.honors}</span>
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '4px 12px', borderRadius: '12px',
                                  fontSize: '13px', fontWeight: '700',
                                  background: g.failing > 0 ? '#fee2e2' : '#f3f4f6',
                                  color: g.failing > 0 ? '#991b1b' : '#6b7280'
                                }}>{g.failing}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Honor Students Table */}
                <div style={{
                  background: 'white', padding: '20px', borderRadius: '12px',
                  marginBottom: '24px', border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{ fontSize: '18px', color: '#1f2937', marginBottom: '16px' }}>
                    🏆 Honor Students ({honorStudentsList.length})
                  </h3>
                  {honorStudentsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏆</div>
                      Walay honor students sa SY {academicSY}.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151', width: '50px' }}>Rank</th>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Student ID</th>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Name</th>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Grade & Section</th>
                            <th style={{ padding: '10px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#374151', width: '90px' }}>Average</th>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151', width: '180px' }}>Tier</th>
                          </tr>
                        </thead>
                        <tbody>
                          {honorStudentsList.map((s, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '10px', textAlign: 'center', fontSize: '13px', fontWeight: '700', color: '#1f2937' }}>{i + 1}</td>
                              <td style={{ padding: '10px', fontSize: '13px', fontWeight: '600', color: '#1a56db' }}>{s.public_id}</td>
                              <td style={{ padding: '10px', fontSize: '13px', color: '#1f2937', fontWeight: '600' }}>
                                {s.first_name} {s.middle_name || ''} {s.last_name}
                              </td>
                              <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>
                                {s.grade_level} {s.section_name ? `- ${s.section_name}` : ''}
                              </td>
                              <td style={{ padding: '10px', textAlign: 'center' }}>
                                <span style={{
                                  padding: '4px 12px', borderRadius: '10px',
                                  fontSize: '13px', fontWeight: '800',
                                  background: s.tier.bg, color: s.tier.color
                                }}>{s.average.toFixed(2)}</span>
                              </td>
                              <td style={{ padding: '10px' }}>
                                <span style={{
                                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                                  padding: '4px 12px', borderRadius: '10px',
                                  fontSize: '12px', fontWeight: '700',
                                  background: s.tier.bg, color: s.tier.color,
                                  border: `1px solid ${s.tier.border}`
                                }}>
                                  <span>{s.tier.icon}</span>{s.tier.label}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Failing Students Table */}
                <div style={{
                  background: 'white', padding: '20px', borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}>
                  <h3 style={{ fontSize: '18px', color: '#1f2937', marginBottom: '16px' }}>
                    ❌ Failing Students ({failingStudentsList.length})
                  </h3>
                  {failingStudentsList.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                      <div style={{ fontSize: '40px', marginBottom: '8px' }}>✅</div>
                      Walay failing students sa SY {academicSY}.
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Student ID</th>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Name</th>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Grade & Section</th>
                            <th style={{ padding: '10px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#374151' }}>Failing Subject(s)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {failingStudentsList.map((s, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', background: 'rgba(254,226,226,0.3)' }}>
                              <td style={{ padding: '10px', fontSize: '13px', fontWeight: '600', color: '#1a56db' }}>{s.public_id}</td>
                              <td style={{ padding: '10px', fontSize: '13px', color: '#1f2937', fontWeight: '600' }}>
                                {s.first_name} {s.middle_name || ''} {s.last_name}
                              </td>
                              <td style={{ padding: '10px', fontSize: '13px', color: '#6b7280' }}>
                                {s.grade_level} {s.section_name ? `- ${s.section_name}` : ''}
                              </td>
                              <td style={{ padding: '10px' }}>
                                {s.failingSubjects.map((fs, j) => (
                                  <div key={j} style={{
                                    fontSize: '12px', color: '#991b1b',
                                    fontWeight: '600', marginBottom: '2px'
                                  }}>
                                    ❌ <strong>{fs.subject}</strong>: {fs.failingTerms.map(ft => `${ft.term} (${ft.value.toFixed(2)})`).join(', ')}
                                  </div>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Reports;