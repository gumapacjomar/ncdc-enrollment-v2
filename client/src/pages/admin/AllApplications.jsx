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
  
  // ===== VIEW MODAL STATE =====
  const [showModal, setShowModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

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

  // ===== VIEW FUNCTION - FIXED =====
  const handleView = async (applicationId, name) => {
    console.log('🔍 View clicked for application ID:', applicationId);
    
    if (!applicationId) {
      alert('Error: No application ID found');
      return;
    }

    setModalLoading(true);
    setShowModal(true);
    try {
      // Use the registrar/application endpoint
      const response = await API.get(`/registrar/application/${applicationId}`);
      console.log('📋 Application data loaded:', response.data);
      setSelectedStudent(response.data);
    } catch (error) {
      console.error('❌ Error fetching student details:', error);
      alert('Failed to load student details. Please try again.');
      setShowModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  // ===== DROP FUNCTION =====
  const handleDrop = async (applicationId, studentId, name) => {
    if (!window.confirm(`⚠️ WARNING: You are about to DROP the enrollment record of ${name}.\n\nThis will permanently delete:\n- Student information\n- Application records\n- User account\n- All related data\n\nThis action CANNOT be undone!\n\nAre you sure you want to continue?`)) {
      return;
    }

    if (!window.confirm(`🔴 FINAL CONFIRMATION: Drop ${name}?`)) {
      return;
    }

    setDeleting(true);
    try {
      await API.delete(`/admin/user/${studentId}`);
      await API.delete(`/admin/application/${applicationId}`);
      await API.delete(`/admin/student/${studentId}`);
      
      alert(`✅ Successfully dropped ${name}'s enrollment record.`);
      fetchApplications();
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
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Actions</th>
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
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                          {/* ===== VIEW BUTTON - FIXED: Use application_id ===== */}
                          <button
                            onClick={() => handleView(app.application_id, `${app.first_name} ${app.last_name}`)}
                            style={{
                              background: '#1a56db',
                              color: 'white',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            👁️ View
                          </button>
                          <button
                            onClick={() => handleDrop(app.application_id, app.student_id, `${app.first_name} ${app.last_name}`)}
                            disabled={deleting}
                            style={{
                              background: '#dc2626',
                              color: 'white',
                              border: 'none',
                              padding: '6px 14px',
                              borderRadius: '6px',
                              cursor: deleting ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                              fontWeight: '600'
                            }}
                          >
                            🗑️ Drop
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* ===== VIEW MODAL - UPDATED ===== */}
      {/* ============================================================ */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '20px',
          overflow: 'auto'
        }} onClick={() => setShowModal(false)}>
          <div style={{
            background: 'white',
            borderRadius: '16px',
            maxWidth: '900px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '32px',
            position: 'relative',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '20px',
                background: 'none',
                border: 'none',
                fontSize: '28px',
                cursor: 'pointer',
                color: '#6b7280'
              }}
            >
              ✕
            </button>

            {modalLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                ⏳ Loading student details...
              </div>
            ) : selectedStudent ? (
              <>
                {/* Header */}
                <div style={{ marginBottom: '24px', borderBottom: '2px solid #e5e7eb', paddingBottom: '16px' }}>
                  <h2 style={{ fontSize: '24px', color: '#1f2937', margin: 0 }}>
                    👤 Student Information
                  </h2>
                  <p style={{ color: '#6b7280', marginTop: '4px' }}>
                    Student ID: <strong>{selectedStudent.student_id || 'Not yet assigned'}</strong>
                  </p>
                </div>

                {/* Two Column Layout */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  {/* LEFT COLUMN - Personal Info */}
                  <div>
                    <h3 style={{ fontSize: '16px', color: '#1a56db', marginBottom: '12px' }}>📋 Personal Information</h3>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                      <p><strong>Name:</strong> {selectedStudent.first_name} {selectedStudent.middle_name || ''} {selectedStudent.last_name} {selectedStudent.suffix || ''}</p>
                      <p><strong>Birth Date:</strong> {selectedStudent.birth_date ? new Date(selectedStudent.birth_date).toLocaleDateString() : 'N/A'}</p>
                      <p><strong>Gender:</strong> {selectedStudent.gender || 'N/A'}</p>
                      <p><strong>Address:</strong> {selectedStudent.address || 'N/A'}</p>
                      <p><strong>Contact:</strong> {selectedStudent.contact_number || 'N/A'}</p>
                      <p><strong>Email:</strong> {selectedStudent.email || 'N/A'}</p>
                    </div>

                    {/* Parent/Guardian */}
                    <h3 style={{ fontSize: '16px', color: '#1a56db', marginTop: '16px', marginBottom: '12px' }}>👨‍👩‍👦 Parent/Guardian</h3>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                      <p><strong>Father:</strong> {selectedStudent.father_name || 'N/A'}</p>
                      <p><strong>Father's Occupation:</strong> {selectedStudent.father_occupation || 'N/A'}</p>
                      <p><strong>Father's Contact:</strong> {selectedStudent.father_contact || 'N/A'}</p>
                      <hr style={{ margin: '8px 0' }} />
                      <p><strong>Mother:</strong> {selectedStudent.mother_name || 'N/A'}</p>
                      <p><strong>Mother's Occupation:</strong> {selectedStudent.mother_occupation || 'N/A'}</p>
                      <p><strong>Mother's Contact:</strong> {selectedStudent.mother_contact || 'N/A'}</p>
                      <hr style={{ margin: '8px 0' }} />
                      <p><strong>Guardian:</strong> {selectedStudent.guardian_name || 'N/A'}</p>
                      <p><strong>Guardian's Contact:</strong> {selectedStudent.guardian_contact || 'N/A'}</p>
                    </div>
                  </div>

                  {/* RIGHT COLUMN - Application & Documents */}
                  <div>
                    <h3 style={{ fontSize: '16px', color: '#1a56db', marginBottom: '12px' }}>📄 Application Details</h3>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                      <p><strong>Academic Year:</strong> {selectedStudent.academic_year || 'N/A'}</p>
                      <p><strong>Status:</strong> 
                        <span style={{ 
                          ...statusBadge(selectedStudent.status),
                          marginLeft: '8px'
                        }}>
                          {selectedStudent.status ? selectedStudent.status.charAt(0).toUpperCase() + selectedStudent.status.slice(1) : 'N/A'}
                        </span>
                      </p>
                      <p><strong>Date Applied:</strong> {selectedStudent.created_at ? new Date(selectedStudent.created_at).toLocaleDateString() : 'N/A'}</p>
                      <p><strong>Registrar:</strong> {selectedStudent.registrar_first_name || 'N/A'} {selectedStudent.registrar_last_name || ''}</p>
                      <p><strong>Registrar Remarks:</strong> {selectedStudent.registrar_remarks || 'N/A'}</p>
                      <p><strong>Admin:</strong> {selectedStudent.admin_first_name || 'N/A'} {selectedStudent.admin_last_name || ''}</p>
                      <p><strong>Admin Remarks:</strong> {selectedStudent.admin_remarks || 'N/A'}</p>
                    </div>

                    {/* Requirements */}
                    <h3 style={{ fontSize: '16px', color: '#1a56db', marginTop: '16px', marginBottom: '12px' }}>📎 Requirements</h3>
                    <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px' }}>
                      {selectedStudent.birth_certificate ? (
                        <p><a href={`http://localhost:5000/uploads/requirements/${selectedStudent.birth_certificate}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1a56db' }}>📄 Birth Certificate</a></p>
                      ) : <p>📄 Birth Certificate: <span style={{ color: '#6b7280' }}>Not uploaded</span></p>}
                      
                      {selectedStudent.immunization_record ? (
                        <p><a href={`http://localhost:5000/uploads/requirements/${selectedStudent.immunization_record}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1a56db' }}>📄 Immunization Record</a></p>
                      ) : <p>📄 Immunization Record: <span style={{ color: '#6b7280' }}>Not uploaded</span></p>}
                      
                      {selectedStudent.medical_clearance ? (
                        <p><a href={`http://localhost:5000/uploads/requirements/${selectedStudent.medical_clearance}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1a56db' }}>📄 Medical Clearance</a></p>
                      ) : <p>📄 Medical Clearance: <span style={{ color: '#6b7280' }}>Not uploaded</span></p>}
                      
                      {selectedStudent.id_picture ? (
                        <p><a href={`http://localhost:5000/uploads/requirements/${selectedStudent.id_picture}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1a56db' }}>🖼️ ID Picture</a></p>
                      ) : <p>🖼️ ID Picture: <span style={{ color: '#6b7280' }}>Not uploaded</span></p>}
                    </div>
                  </div>
                </div>

                {/* Footer Buttons */}
                <div style={{ marginTop: '24px', borderTop: '2px solid #e5e7eb', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => window.print()}
                    style={{
                      background: '#1a56db',
                      color: 'white',
                      border: 'none',
                      padding: '10px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    🖨️ Print
                  </button>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
                No data found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AllApplications;