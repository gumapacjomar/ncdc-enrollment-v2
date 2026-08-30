import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import API from '../../services/api';

const ConfirmEnrollment = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState('');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/admin/approved`);
      const apps = response.data || [];
      const found = apps.find(a => a.application_id === parseInt(id));
      if (found) {
        setApplication(found);
      } else {
        setMessage({ type: 'error', text: 'Application not found' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to load application' });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!window.confirm('Are you sure you want to confirm this enrollment?')) return;
    
    setConfirming(true);
    setMessage('');
    
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const response = await API.post(`/admin/confirm/${id}`, {
        adminId: user.id,
        remarks: remarks || 'Confirmed by Admin'
      });
      
      setMessage({ type: 'success', text: response.data.message });
      
      if (response.data.data) {
        alert(`✅ Enrollment Confirmed!\n\nStudent ID: ${response.data.data.studentId}\nUsername: ${response.data.data.username}\nPassword: ${response.data.data.password}`);
      }
      
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 3000);
      
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to confirm enrollment' });
    } finally {
      setConfirming(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Please enter reason for rejection:');
    if (reason === null) return;
    
    setConfirming(true);
    setMessage('');
    
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      await API.put(`/admin/reject/${id}`, {
        adminId: user.id,
        remarks: reason || 'Rejected by Admin'
      });
      
      setMessage({ type: 'success', text: 'Application rejected and returned to registrar' });
      
      setTimeout(() => {
        navigate('/admin/dashboard');
      }, 2000);
      
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to reject application' });
    } finally {
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', color: '#6b7280' }}>⏳ Loading application details...</div>
      </div>
    );
  }

  if (!application) {
    return (
      <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', color: '#ef4444' }}>❌ Application not found</div>
        <Link to="/admin/dashboard" style={{ color: '#1a56db', textDecoration: 'none', marginTop: '16px', display: 'inline-block' }}>
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
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
          <span style={{ color: '#6b7280', fontWeight: '500' }}>Confirm Enrollment</span>
        </div>
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
      </nav>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
        <Link to="/admin/dashboard" style={{ color: '#1a56db', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>
          ← Back to Dashboard
        </Link>

        {message && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#34d399' : '#fca5a5'}`
          }}>
            {message.text}
          </div>
        )}

        <div style={{
          background: 'white',
          padding: '32px',
          borderRadius: '12px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ fontSize: '24px', color: '#1f2937', marginBottom: '8px' }}>
            ✅ Confirm Enrollment
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '24px' }}>
            Review the application details before confirming
          </p>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px' }}>
            <h3 style={{ fontSize: '18px', color: '#1f2937' }}>👤 Student Information</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <p><strong>Name:</strong> {application.first_name} {application.middle_name || ''} {application.last_name} {application.suffix || ''}</p>
              <p><strong>Email:</strong> {application.email}</p>
              <p><strong>Contact:</strong> {application.contact_number || 'N/A'}</p>
              <p><strong>Birth Date:</strong> {application.birth_date}</p>
              <p><strong>Gender:</strong> {application.gender}</p>
              <p><strong>Address:</strong> {application.address}</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>
            <h3 style={{ fontSize: '18px', color: '#1f2937' }}>👨‍👩‍👦 Parent/Guardian</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
              <p><strong>Father:</strong> {application.father_name || 'N/A'} ({application.father_occupation || 'N/A'})</p>
              <p><strong>Father Contact:</strong> {application.father_contact || 'N/A'}</p>
              <p><strong>Mother:</strong> {application.mother_name || 'N/A'} ({application.mother_occupation || 'N/A'})</p>
              <p><strong>Mother Contact:</strong> {application.mother_contact || 'N/A'}</p>
              <p><strong>Guardian:</strong> {application.guardian_name || 'N/A'}</p>
              <p><strong>Guardian Contact:</strong> {application.guardian_contact || 'N/A'}</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>
            <h3 style={{ fontSize: '18px', color: '#1f2937' }}>📋 Requirements</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', marginTop: '8px' }}>
              <p>✅ Birth Certificate: {application.birth_certificate ? 'Uploaded' : 'Not uploaded'}</p>
              <p>✅ Immunization: {application.immunization_record ? 'Uploaded' : 'Not uploaded'}</p>
              <p>✅ Medical Clearance: {application.medical_clearance ? 'Uploaded' : 'Not uploaded'}</p>
              <p>✅ ID Picture: {application.id_picture ? 'Uploaded' : 'Not uploaded'}</p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '16px', marginTop: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>
              Remarks (Optional)
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                resize: 'vertical',
                minHeight: '80px'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              style={{
                flex: 1,
                background: confirming ? '#93c5fd' : '#10b981',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: confirming ? 'not-allowed' : 'pointer'
              }}
            >
              {confirming ? 'Processing...' : '✅ Confirm Enrollment'}
            </button>
            <button
              onClick={handleReject}
              disabled={confirming}
              style={{
                flex: 1,
                background: confirming ? '#93c5fd' : '#ef4444',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '16px',
                cursor: confirming ? 'not-allowed' : 'pointer'
              }}
            >
              ❌ Reject
            </button>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #f59e0b' }}>
            <p style={{ fontSize: '13px', color: '#92400e', margin: 0 }}>
              ⚠️ Confirming will auto-generate: Student ID, Username, Password
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEnrollment;