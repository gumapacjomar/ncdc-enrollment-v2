import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';

const StudentApplication = () => {
  const [formData, setFormData] = useState({
    // Personal Info
    firstName: '',
    middleName: '',
    lastName: '',
    suffix: '',
    birthDate: '',
    gender: '',
    address: '',
    contactNumber: '',
    email: '',
    // Parent/Guardian
    fatherName: '',
    fatherOccupation: '',
    fatherContact: '',
    motherName: '',
    motherOccupation: '',
    motherContact: '',
    guardianName: '',
    guardianContact: '',
    // Requirements (files)
    birthCertificate: null,
    immunizationRecord: null,
    medicalClearance: null,
    idPicture: null,
    academicYear: '2026-2027'
  });

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [ageError, setAgeError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    } else if (type === 'radio') {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    // Check age if birthDate changes
    if (name === 'birthDate') {
      validateAge(value);
    }
  };

  const validateAge = (birthDate) => {
    if (!birthDate) return;
    
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    if (age < 4 || age > 5) {
      setAgeError(`⚠️ Age must be 4-5 years old. Current age: ${age} years old.`);
    } else {
      setAgeError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check age validation
    if (ageError) {
      setMessage({ type: 'error', text: ageError });
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Create FormData for file uploads
      const formDataToSend = new FormData();
      
      // Append all fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });

      const response = await API.post('/apply', formDataToSend, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setMessage({ type: 'success', text: '✅ ' + response.data.message });
      
      // Reset form
      setFormData({
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        birthDate: '',
        gender: '',
        address: '',
        contactNumber: '',
        email: '',
        fatherName: '',
        fatherOccupation: '',
        fatherContact: '',
        motherName: '',
        motherOccupation: '',
        motherContact: '',
        guardianName: '',
        guardianContact: '',
        birthCertificate: null,
        immunizationRecord: null,
        medicalClearance: null,
        idPicture: null,
        academicYear: '2026-2027'
      });
      setAgeError('');
      
      // Reset file inputs
      document.querySelectorAll('input[type="file"]').forEach(input => {
        input.value = '';
      });

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: '❌ ' + (error.response?.data?.error || 'Something went wrong') 
      });
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    marginTop: '4px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '4px'
  };

  const radioStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px'
  };

  const fileInputStyle = {
    width: '100%',
    padding: '6px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '13px',
    marginTop: '4px',
    background: 'white'
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', padding: '32px 16px' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto', background: 'white', borderRadius: '12px', padding: '32px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
        
        {/* ========== BACK TO HOME BUTTON ========== */}
        <div style={{ marginBottom: '16px' }}>
          <Link to="/" style={{
            color: '#1a56db',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}>
            ← Back to Home
          </Link>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a56db' }}>
            🎓 NCDC Enrollment Application
          </h1>
          <p style={{ color: '#6b7280' }}>
            National Children Development Center - Academic Year {formData.academicYear}
          </p>
          <p style={{ color: '#dc2626', fontSize: '14px', marginTop: '4px', fontWeight: '600' }}>
            ⚠️ For children ages 4-5 years old only
          </p>
        </div>

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

        {ageError && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #f59e0b'
          }}>
            {ageError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* ============================================ */}
          {/* PERSONAL INFORMATION */}
          {/* ============================================ */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px' }}>
              👤 Personal Information
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* First Name */}
              <div>
                <label style={labelStyle}>First Name *</label>
                <input
                  type="text"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                  placeholder="Enter first name"
                />
              </div>

              {/* Middle Name */}
              <div>
                <label style={labelStyle}>Middle Name</label>
                <input
                  type="text"
                  name="middleName"
                  value={formData.middleName}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Enter middle name"
                />
              </div>

              {/* Last Name */}
              <div>
                <label style={labelStyle}>Last Name *</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                  placeholder="Enter last name"
                />
              </div>

              {/* Suffix */}
              <div>
                <label style={labelStyle}>Suffix</label>
                <select
                  name="suffix"
                  value={formData.suffix}
                  onChange={handleChange}
                  style={inputStyle}
                >
                  <option value="">None</option>
                  <option value="Jr.">Jr.</option>
                  <option value="Sr.">Sr.</option>
                  <option value="II">II</option>
                  <option value="III">III</option>
                  <option value="IV">IV</option>
                </select>
              </div>

              {/* Birth Date */}
              <div>
                <label style={labelStyle}>Birth Date *</label>
                <input
                  type="date"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Age must be 4-5 years old
                </small>
              </div>

              {/* Gender - Radio Buttons */}
              <div>
                <label style={labelStyle}>Gender *</label>
                <div style={radioStyle}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="radio"
                      name="gender"
                      value="Male"
                      checked={formData.gender === 'Male'}
                      onChange={handleChange}
                      required
                    />
                    Male
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '16px' }}>
                    <input
                      type="radio"
                      name="gender"
                      value="Female"
                      checked={formData.gender === 'Female'}
                      onChange={handleChange}
                      required
                    />
                    Female
                  </label>
                </div>
              </div>

              {/* Contact Number */}
              <div>
                <label style={labelStyle}>Contact Number *</label>
                <input
                  type="text"
                  name="contactNumber"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                  placeholder="e.g., 09123456789"
                />
              </div>

              {/* Address - Full Width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Home Address *</label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  rows="2"
                  style={inputStyle}
                  placeholder="Enter complete address"
                />
              </div>

              {/* Email - Full Width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={inputStyle}
                  placeholder="parent@email.com"
                />
                <small style={{ color: '#6b7280', fontSize: '12px' }}>
                  Credentials will be sent to this email
                </small>
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* PARENT/GUARDIAN INFORMATION */}
          {/* ============================================ */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px' }}>
              👨‍👩‍👦 Parent/Guardian Information
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Father's Name */}
              <div>
                <label style={labelStyle}>Father's Name</label>
                <input
                  type="text"
                  name="fatherName"
                  value={formData.fatherName}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Enter father's full name"
                />
              </div>

              {/* Father's Occupation */}
              <div>
                <label style={labelStyle}>Father's Occupation</label>
                <input
                  type="text"
                  name="fatherOccupation"
                  value={formData.fatherOccupation}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Enter father's occupation"
                />
              </div>

              {/* Father's Contact - Full Width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Father's Contact Number</label>
                <input
                  type="text"
                  name="fatherContact"
                  value={formData.fatherContact}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Enter father's contact number"
                />
              </div>

              {/* Mother's Name */}
              <div>
                <label style={labelStyle}>Mother's Name</label>
                <input
                  type="text"
                  name="motherName"
                  value={formData.motherName}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Enter mother's full name"
                />
              </div>

              {/* Mother's Occupation */}
              <div>
                <label style={labelStyle}>Mother's Occupation</label>
                <input
                  type="text"
                  name="motherOccupation"
                  value={formData.motherOccupation}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Enter mother's occupation"
                />
              </div>

              {/* Mother's Contact - Full Width */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Mother's Contact Number</label>
                <input
                  type="text"
                  name="motherContact"
                  value={formData.motherContact}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Enter mother's contact number"
                />
              </div>

              {/* Guardian's Name */}
              <div>
                <label style={labelStyle}>Guardian's Name (if applicable)</label>
                <input
                  type="text"
                  name="guardianName"
                  value={formData.guardianName}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Enter guardian's full name"
                />
              </div>

              {/* Guardian's Contact */}
              <div>
                <label style={labelStyle}>Guardian's Contact</label>
                <input
                  type="text"
                  name="guardianContact"
                  value={formData.guardianContact}
                  onChange={handleChange}
                  style={inputStyle}
                  placeholder="Enter guardian's contact"
                />
              </div>
            </div>
          </div>

          {/* ============================================ */}
          {/* REQUIREMENTS WITH FILE UPLOAD */}
          {/* ============================================ */}
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#374151', borderBottom: '2px solid #e5e7eb', paddingBottom: '8px', marginBottom: '16px' }}>
              📋 Requirements Checklist
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '12px' }}>
              Please upload the following requirements (PDF, JPG, or PNG format)
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Birth Certificate */}
              <div>
                <label style={labelStyle}>Birth Certificate *</label>
                <input
                  type="file"
                  name="birthCertificate"
                  onChange={handleChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  style={fileInputStyle}
                />
                <small style={{ color: '#6b7280', fontSize: '11px' }}>
                  PDF, JPG, PNG (Max 5MB)
                </small>
              </div>

              {/* Immunization Record */}
              <div>
                <label style={labelStyle}>Immunization Record *</label>
                <input
                  type="file"
                  name="immunizationRecord"
                  onChange={handleChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  style={fileInputStyle}
                />
                <small style={{ color: '#6b7280', fontSize: '11px' }}>
                  PDF, JPG, PNG (Max 5MB)
                </small>
              </div>

              {/* Medical Clearance */}
              <div>
                <label style={labelStyle}>Medical Clearance *</label>
                <input
                  type="file"
                  name="medicalClearance"
                  onChange={handleChange}
                  accept=".pdf,.jpg,.jpeg,.png"
                  required
                  style={fileInputStyle}
                />
                <small style={{ color: '#6b7280', fontSize: '11px' }}>
                  PDF, JPG, PNG (Max 5MB)
                </small>
              </div>

              {/* 2x2 ID Picture */}
              <div>
                <label style={labelStyle}>2x2 ID Picture *</label>
                <input
                  type="file"
                  name="idPicture"
                  onChange={handleChange}
                  accept=".jpg,.jpeg,.png"
                  required
                  style={fileInputStyle}
                />
                <small style={{ color: '#6b7280', fontSize: '11px' }}>
                  JPG, PNG (Max 2MB)
                </small>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ textAlign: 'center', borderTop: '1px solid #e5e7eb', paddingTop: '24px' }}>
            <button 
              type="submit" 
              disabled={loading}
              style={{
                background: loading ? '#93c5fd' : '#1a56db',
                color: 'white',
                fontWeight: 'bold',
                padding: '14px 48px',
                borderRadius: '8px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                transition: 'background 0.2s'
              }}
            >
              {loading ? '⏳ Submitting...' : '📝 Submit Application'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StudentApplication;