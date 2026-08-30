import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';

const AllApplications = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
    fetchApplications();
  }, [navigate]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await API.get('/admin/applications');
      setApplications(response.data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  // ========== DROP FUNCTION ==========
  const handleDrop = async (applicationId, studentId, name) => {
    if (!window.confirm(`⚠️ WARNING: You are about to DROP the enrollment record of ${name}.\n\nThis will permanently delete:\n- Student information\n- Application records\n- User account\n- All related data\n\nThis action CANNOT be undone!\n\nAre you sure you want to continue?`)) {
      return;
    }

    // Second confirmation for safety
    if (!window.confirm(`🔴 FINAL CONFIRMATION: Drop ${name}?`)) {
      return;
    }

    setDeleting(true);
    try {
      // Delete user account first
      await API.delete(`/admin/user/${studentId}`);
      
      // Delete application
      await API.delete(`/admin/application/${applicationId}`);
      
      // Delete student
      await API.delete(`/admin/student/${studentId}`);
      
      alert(`✅ Successfully dropped ${name}'s enrollment record.`);
      fetchApplications(); // Refresh the list
    } catch (error) {
      console.error('Error dropping record:', error);
      alert('❌ Failed to drop record. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const statusBadge = (status) => {
    const colors = {
      pending: { bg: '#fef3c7', text: '#92400e' },
      approved: { bg: '#dbeafe', text: '#1e40af' },
      confirmed: { bg: '#d1fae5', text: '#065f46' },
      rejected: { bg: '#fee2e2', text: '#991b1b' },
      declined: { bg: '#fef3c7', text: '#92400e' }
    };
    const color = colors[status] || colors.pending;
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

  const filteredApplications = applications.filter(app => {
    const fullName = `${app.first_name} ${app.middle_name || ''} ${app.last_name}`.toLowerCase();
    const studentId = app.student_id ? app.student_id.replace('NCDC-', '') : '';
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          app.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          studentId.includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || app.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const statusCounts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    confirmed: applications.filter(a => a.status === 'confirmed').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    declined: applications.filter(a => a.status === 'declined').length
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Navbar */}
      <nav style={{
        background: 'white',
        padding: '16px 32px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1a56db' }}>🎓 NCDC</span>
          <span style={{ color: '#6b7280' }}>|</span>
          <span style={{ color: '#6b7280', fontWeight: '500' }}>All Applications</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '14px', color: '#374151' }}>
            👋 {JSON.parse(localStorage.getItem('user'))?.username || 'Admin'}
          </span>
          <button
            onClick={() => {
              localStorage.clear();
              navigate('/login');
            }}
            style={{
              background: '#ef4444',
              color: 'white',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Logout
          </button>
        </div>
      </nav>

      <div style={{ padding: '24px 32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0 }}>📋 All Applications</h1>
            <p style={{ color: '#6b7280', marginTop: '4px' }}>
              View and manage all enrollment applications
            </p>
          </div>
          <Link to="/admin/dashboard" style={{
            background: '#6b7280',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '14px'
          }}>
            ← Back to Dashboard
          </Link>
        </div>

        {/* Status Filters */}
        <div style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '24px'
        }}>
          {['all', 'pending', 'approved', 'confirmed', 'rejected', 'declined'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              style={{
                padding: '8px 20px',
                borderRadius: '20px',
                border: filterStatus === status ? '2px solid #1a56db' : '1px solid #d1d5db',
                background: filterStatus === status ? '#dbeafe' : 'white',
                color: filterStatus === status ? '#1a56db' : '#374151',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: filterStatus === status ? '600' : '400'
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)} ({statusCounts[status] || 0})
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div style={{
          background: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          marginBottom: '24px',
          border: '1px solid #e5e7eb'
        }}>
          <input
            type="text"
            placeholder="🔍 Search by name, email, or Student ID (e.g., 000001)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Applications Table */}
        <div style={{
          background: 'white',
          padding: '20px',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              ⏳ Loading applications...
            </div>
          ) : filteredApplications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              {searchTerm ? 'No applications match your search.' : 'No applications found.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>#</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Student ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Contact</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Date</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Registrar</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((app, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{index + 1}</td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#1a56db' }}>
                        {app.student_id ? app.student_id.replace('NCDC-', '') : '—'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937', fontWeight: '500' }}>
                        {app.first_name} {app.middle_name || ''} {app.last_name} {app.suffix || ''}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{app.email}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{app.contact_number || 'N/A'}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={statusBadge(app.status)}>
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                        {app.registrar_name || 'N/A'}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleDrop(app.application_id, app.student_id, `${app.first_name} ${app.last_name}`)}
                          disabled={deleting}
                          style={{
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            padding: '6px 16px',
                            borderRadius: '6px',
                            cursor: deleting ? 'not-allowed' : 'pointer',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                        >
                          🗑️ Drop
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AllApplications;