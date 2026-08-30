import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';

const RegistrarManagement = () => {
  const navigate = useNavigate();
  const [registrars, setRegistrars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRegistrar, setEditingRegistrar] = useState(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: ''
  });
  const [message, setMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || user.role !== 'admin') {
      navigate('/login');
    }
    fetchRegistrars();
  }, [navigate]);

  const fetchRegistrars = async () => {
    setLoading(true);
    try {
      const response = await API.get('/admin/registrars');
      setRegistrars(response.data);
    } catch (error) {
      console.error('Error fetching registrars:', error);
      setMessage({ type: 'error', text: 'Failed to load registrars' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'firstName' || name === 'lastName') {
      const firstName = name === 'firstName' ? value : formData.firstName;
      const lastName = name === 'lastName' ? value : formData.lastName;
      const username = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`.replace(/[^a-z0-9.]/g, '');
      setFormData(prev => ({
        ...prev,
        [name]: value,
        username: username || prev.username
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setMessage('');

    try {
      if (editingRegistrar) {
        await API.put(`/admin/registrars/${editingRegistrar.id}`, formData);
        setMessage({ type: 'success', text: '✅ Registrar updated successfully!' });
      } else {
        await API.post('/admin/registrars', formData);
        setMessage({ type: 'success', text: '✅ Registrar created successfully!' });
      }
      
      resetForm();
      fetchRegistrars();
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || '❌ Operation failed' 
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this registrar?')) return;
    
    try {
      await API.delete(`/admin/registrars/${id}`);
      setMessage({ type: 'success', text: '✅ Registrar deleted successfully!' });
      fetchRegistrars();
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Failed to delete registrar' });
    }
  };

  const editRegistrar = (registrar) => {
    setEditingRegistrar(registrar);
    setFormData({
      employeeId: registrar.employee_id || '',
      firstName: registrar.first_name || '',
      lastName: registrar.last_name || '',
      username: registrar.username || '',
      email: registrar.email || '',
      password: ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      firstName: '',
      lastName: '',
      username: '',
      email: '',
      password: ''
    });
    setEditingRegistrar(null);
    setShowModal(false);
  };

  const generateEmployeeId = () => {
    const lastRegistrar = registrars[registrars.length - 1];
    let nextNum = 1;
    if (lastRegistrar && lastRegistrar.employee_id) {
      const num = parseInt(lastRegistrar.employee_id.split('-')[1]);
      nextNum = num + 1;
    }
    const padded = String(nextNum).padStart(6, '0');
    setFormData(prev => ({
      ...prev,
      employeeId: `REG-${padded}`
    }));
  };

  const cardStyle = {
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    border: '1px solid #e5e7eb'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '24px 32px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header with Back Button */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <h1 style={{ fontSize: '28px', color: '#1f2937', margin: 0 }}>👨‍💼 Registrar Management</h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0' }}>
              Manage registrar accounts
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <Link 
              to="/admin/dashboard" 
              style={{
                background: '#6b7280',
                color: 'white',
                padding: '10px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.3s ease',
                display: 'inline-block'
              }}
              onMouseEnter={(e) => e.target.style.background = '#4b5563'}
              onMouseLeave={(e) => e.target.style.background = '#6b7280'}
            >
              ← Back to Dashboard
            </Link>
            <button
              onClick={() => {
                resetForm();
                generateEmployeeId();
                setShowModal(true);
              }}
              style={{
                background: '#1a56db',
                color: 'white',
                border: 'none',
                padding: '10px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => e.target.style.background = '#1e40af'}
              onMouseLeave={(e) => e.target.style.background = '#1a56db'}
            >
              + Add Registrar
            </button>
          </div>
        </div>

        {/* Message */}
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

        {/* Registrars Table */}
        <div style={cardStyle}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              ⏳ Loading registrars...
            </div>
          ) : registrars.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              No registrars found. Click "Add Registrar" to create one.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Employee ID</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Username</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Email</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: '600', color: '#374151' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {registrars.map((reg) => (
                    <tr key={reg.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{reg.id}</td>
                      <td style={{ padding: '12px', fontSize: '14px', fontWeight: '600', color: '#1a56db' }}>
                        {reg.employee_id || 'N/A'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#1f2937' }}>
                        {reg.first_name} {reg.last_name}
                      </td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{reg.username}</td>
                      <td style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>{reg.email}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={() => editRegistrar(reg)}
                          style={{
                            background: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            marginRight: '6px'
                          }}
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(reg.id)}
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Delete
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'white',
            borderRadius: '12px',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            padding: '32px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '22px', color: '#1f2937' }}>
                {editingRegistrar ? '✏️ Edit Registrar' : '➕ Add Registrar'}
              </h2>
              <button
                onClick={resetForm}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Employee ID (6 digits) *
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    name="employeeId"
                    value={formData.employeeId}
                    onChange={handleChange}
                    placeholder="REG-000001"
                    required
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <button
                    type="button"
                    onClick={generateEmployeeId}
                    style={{
                      background: '#e5e7eb',
                      border: 'none',
                      padding: '10px 16px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    Auto
                  </button>
                </div>
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Format: REG-000001 (6 digits)
                </small>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Username (Auto-generated)
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  readOnly
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    background: '#f3f4f6',
                    color: '#6b7280'
                  }}
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Auto-generated from firstname.lastname
                </small>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#374151',
                  marginBottom: '4px'
                }}>
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              {!editingRegistrar && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    marginBottom: '4px'
                  }}>
                    Default Password *
                  </label>
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter default password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>
                    Registrar will use this to login
                  </small>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                  type="submit"
                  disabled={actionLoading}
                  style={{
                    flex: 1,
                    background: actionLoading ? '#93c5fd' : '#1a56db',
                    color: 'white',
                    border: 'none',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: actionLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {actionLoading ? 'Saving...' : editingRegistrar ? 'Update Registrar' : 'Create Registrar'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: '#6b7280',
                    border: '1px solid #d1d5db',
                    padding: '12px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegistrarManagement;