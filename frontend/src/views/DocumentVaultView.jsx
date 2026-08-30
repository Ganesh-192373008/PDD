import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Search,
  Plus,
  Trash2,
  Edit3,
  Eye,
  Download,
  X,
  Lock,
  Calendar,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  FolderLock,
  RefreshCw,
  Info
} from 'lucide-react';

const CATEGORIES = [
  { group: 'Identity', name: 'Aadhaar Card', icon: '🪪' },
  { group: 'Identity', name: 'PAN Card', icon: '🪪' },
  { group: 'Identity', name: 'Voter ID', icon: '🪪' },
  { group: 'Identity', name: 'Driving License', icon: '🪪' },
  { group: 'Farming', name: 'Land Documents', icon: '🌾' },
  { group: 'Farming', name: 'Soil Test Report', icon: '🧪' },
  { group: 'Farming', name: 'Crop Insurance', icon: '🛡️' },
  { group: 'Farming', name: 'Farmer Registration', icon: '📜' },
  { group: 'Farming', name: 'Crop Certificate', icon: '🌱' },
  { group: 'Farming', name: 'Agriculture Certificate', icon: '🏆' },
  { group: 'Government', name: 'Ration Card', icon: '🏠' },
  { group: 'Government', name: 'Income Certificate', icon: '🏛️' },
  { group: 'Government', name: 'Government Scheme Document', icon: '📑' },
  { group: 'Government', name: 'Government Certificate', icon: '🏛️' },
  { group: 'Bills', name: 'Agricultural Invoice / Bill', icon: '🧾' },
  { group: 'Bills', name: 'Receipt', icon: '💳' },
  { group: 'Other', name: 'Other Document', icon: '📄' }
];

const GROUP_TABS = [
  { id: 'All', label: 'All Documents', icon: FolderLock },
  { id: 'Identity', label: '🪪 Identity', icon: ShieldCheck },
  { id: 'Farming', label: '🌾 Farming', icon: FileSpreadsheet },
  { id: 'Government', label: '🏛️ Government', icon: FileCheck2 },
  { id: 'Bills', label: '📄 Bills & Invoices', icon: FileText },
  { id: 'Other', label: '📑 Other', icon: Info }
];

export const DocumentVaultView = () => {
  const { token, API_URL, t } = useApp();

  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({ totalDocuments: 0, totalMB: '0.00', countsByGroup: {} });
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewBlobUrl, setPreviewBlobUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState(null);

  // Notifications
  const [alert, setAlert] = useState(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Aadhaar Card');
  const [uploadMasked, setUploadMasked] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      let url = `${API_URL}/documents?`;
      if (activeGroup !== 'All') url += `group=${activeGroup}&`;
      if (searchQuery.trim()) url += `q=${encodeURIComponent(searchQuery.trim())}&`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDocuments(data.documents || []);
      }
    } catch (e) {
      console.error('Fetch docs error:', e);
    } finally {
      setLoading(false);
    }
  }, [token, API_URL, activeGroup, searchQuery]);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/documents/stats/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Fetch stats error:', e);
    }
  }, [token, API_URL]);

  useEffect(() => {
    fetchDocuments();
    fetchStats();
  }, [fetchDocuments, fetchStats]);

  // Handle File Upload
  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      showAlert('Please select a file to upload.', 'error');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('documentName', uploadName || uploadFile.name);
      formData.append('category', uploadCategory);
      formData.append('maskedNumber', uploadMasked);
      formData.append('notes', uploadNotes);

      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showAlert('Document securely saved to your private vault!', 'success');
        setShowUploadModal(false);
        setUploadFile(null);
        setUploadName('');
        setUploadMasked('');
        setUploadNotes('');
        fetchDocuments();
        fetchStats();
      } else {
        showAlert(data.message || 'Upload failed.', 'error');
      }
    } catch (err) {
      showAlert('Upload request failed. Please check network connection.', 'error');
    } finally {
      setUploading(false);
    }
  };

  // Handle Preview
  const handleOpenPreview = async (doc) => {
    setPreviewDoc(doc);
    setShowPreviewModal(true);
    setPreviewLoading(true);
    setPreviewBlobUrl('');

    try {
      const res = await fetch(`${API_URL}/documents/${doc._id}/view`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPreviewBlobUrl(url);
      } else {
        showAlert('Unable to load document preview.', 'error');
      }
    } catch (e) {
      showAlert('Error streaming document preview.', 'error');
    } finally {
      setPreviewLoading(false);
    }
  };

  // Handle Download
  const handleDownload = async (doc) => {
    try {
      showAlert(`Downloading ${doc.documentName}...`, 'info');
      const res = await fetch(`${API_URL}/documents/${doc._id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${doc.documentName.replace(/[^a-zA-Z0-9_-]/g, '_')}${doc.fileExtension || '.pdf'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        showAlert('Failed to download document.', 'error');
      }
    } catch (e) {
      showAlert('Download failed.', 'error');
    }
  };

  // Handle Edit Metadata
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingDoc) return;

    try {
      const res = await fetch(`${API_URL}/documents/${editingDoc._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentName: editingDoc.documentName,
          category: editingDoc.category,
          maskedNumber: editingDoc.maskedNumber,
          notes: editingDoc.notes
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert('Document details updated successfully!', 'success');
        setShowEditModal(false);
        setEditingDoc(null);
        fetchDocuments();
        fetchStats();
      } else {
        showAlert(data.message || 'Update failed.', 'error');
      }
    } catch (e) {
      showAlert('Update failed.', 'error');
    }
  };

  // Handle Delete
  const handleDeleteConfirm = async () => {
    if (!deletingDoc) return;
    try {
      const res = await fetch(`${API_URL}/documents/${deletingDoc._id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showAlert('Document permanently removed from vault.', 'success');
        setShowDeleteModal(false);
        setDeletingDoc(null);
        fetchDocuments();
        fetchStats();
      } else {
        showAlert(data.message || 'Delete failed.', 'error');
      }
    } catch (e) {
      showAlert('Delete request failed.', 'error');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getDocBadgeColor = (group) => {
    switch (group) {
      case 'Identity': return 'badge-identity';
      case 'Farming': return 'badge-farming';
      case 'Government': return 'badge-govt';
      case 'Bills': return 'badge-bills';
      default: return 'badge-other';
    }
  };

  return (
    <div className="vault-container slide-in">
      {/* Alert Notification Toast */}
      {alert && (
        <div className={`alert-toast ${alert.type === 'error' ? 'alert-error' : alert.type === 'info' ? 'alert-info' : 'alert-success'}`}>
          {alert.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <header className="vault-header">
        <div className="vault-title-area">
          <div className="vault-icon-badge">
            <FolderLock size={32} color="#81c784" />
          </div>
          <div>
            <h1>🔐 {t('vault') || 'My Secure Documents'}</h1>
            <p className="subtitle">Farmer Document Vault • Bank-Grade Private Storage for Farm & Identity Records</p>
          </div>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="btn btn-primary btn-upload-vault">
          <Plus size={18} /> Upload Document
        </button>
      </header>

      {/* Security Privacy Notice */}
      <div className="privacy-pill-banner">
        <Lock size={16} color="#81c784" />
        <span><strong>Enterprise Privacy Guaranteed:</strong> All documents are privately stored with end-to-end authorization. Files are strictly confidential and never shared with public URLs or AI models.</span>
      </div>

      {/* Vault Statistics Overview */}
      <div className="vault-stats-grid">
        <div className="vault-stat-card glass-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(46, 125, 50, 0.2)' }}>
            <FolderLock size={24} color="#81c784" />
          </div>
          <div>
            <h3>{stats.totalDocuments || 0}</h3>
            <p>Total Documents</p>
          </div>
        </div>

        <div className="vault-stat-card glass-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(255, 160, 0, 0.2)' }}>
            <HardDrive size={24} color="#ffa000" />
          </div>
          <div>
            <h3>{stats.totalMB || '0.00'} MB</h3>
            <p>Vault Storage Used</p>
          </div>
        </div>

        <div className="vault-stat-card glass-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(0, 150, 136, 0.2)' }}>
            <ShieldCheck size={24} color="#4db6ac" />
          </div>
          <div>
            <h3>{stats.countsByGroup?.Identity || 0}</h3>
            <p>Identity Records</p>
          </div>
        </div>

        <div className="vault-stat-card glass-card">
          <div className="stat-icon-wrapper" style={{ background: 'rgba(102, 187, 106, 0.2)' }}>
            <FileSpreadsheet size={24} color="#66bb6a" />
          </div>
          <div>
            <h3>{stats.countsByGroup?.Farming || 0}</h3>
            <p>Land & Crop Proofs</p>
          </div>
        </div>
      </div>

      {/* Search & Category Filter Toolbar */}
      <div className="vault-toolbar glass-card">
        <div className="search-box-wrapper">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="vault-search-input"
            placeholder="Search by document name, masked ID, category, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="clear-search-btn">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="group-tabs-list">
          {GROUP_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveGroup(tab.id)}
              className={`group-tab-btn ${activeGroup === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid / Listing */}
      {loading ? (
        <div className="glass-card vault-loading-state">
          <RefreshCw size={36} className="spinner" color="#81c784" />
          <p>Retrieving secure vault documents...</p>
        </div>
      ) : documents.length > 0 ? (
        <div className="documents-grid">
          {documents.map((doc) => {
            const isPdf = doc.fileType === 'application/pdf' || doc.fileExtension?.toLowerCase() === '.pdf';

            return (
              <div key={doc._id} className="doc-card glass-card">
                <div className="doc-card-top">
                  <div className="doc-type-icon-wrapper">
                    {isPdf ? (
                      <div className="icon-badge-pdf">
                        <FileText size={24} color="#e57373" />
                        <span className="file-ext-tag">PDF</span>
                      </div>
                    ) : (
                      <div className="icon-badge-img">
                        <ImageIcon size={24} color="#81c784" />
                        <span className="file-ext-tag">{doc.fileExtension?.replace('.', '').toUpperCase() || 'IMG'}</span>
                      </div>
                    )}
                  </div>
                  <div className="doc-card-title-area">
                    <h4 title={doc.documentName}>{doc.documentName}</h4>
                    <span className={`doc-category-badge ${getDocBadgeColor(doc.groupCategory)}`}>
                      {doc.category}
                    </span>
                  </div>
                </div>

                {doc.maskedNumber && (
                  <div className="masked-id-box">
                    <ShieldCheck size={14} color="#ffa000" />
                    <span>ID: <strong>{doc.maskedNumber}</strong></span>
                  </div>
                )}

                {doc.notes && (
                  <p className="doc-notes" title={doc.notes}>
                    "{doc.notes}"
                  </p>
                )}

                <div className="doc-meta-row">
                  <span className="doc-meta-item">
                    <Calendar size={13} /> {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                  <span className="doc-meta-item">
                    <HardDrive size={13} /> {formatFileSize(doc.fileSize)}
                  </span>
                </div>

                <div className="doc-card-actions">
                  <button onClick={() => handleOpenPreview(doc)} className="btn-doc-action view" title="View Document">
                    <Eye size={16} /> View
                  </button>
                  <button onClick={() => handleDownload(doc)} className="btn-doc-action download" title="Download Document">
                    <Download size={16} />
                  </button>
                  <button onClick={() => { setEditingDoc({ ...doc }); setShowEditModal(true); }} className="btn-doc-action edit" title="Edit Metadata">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => { setDeletingDoc(doc); setShowDeleteModal(true); }} className="btn-doc-action delete" title="Delete Document">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass-card vault-empty-state">
          <FolderLock size={64} color="rgba(129, 199, 132, 0.25)" />
          <h3>No Documents Found</h3>
          <p>{searchQuery ? 'No documents matched your search query.' : 'You have not uploaded any documents in this category yet.'}</p>
          <button onClick={() => setShowUploadModal(true)} className="btn btn-primary mt-3">
            <Plus size={16} /> Upload First Document
          </button>
        </div>
      )}

      {/* ========================================== */}
      {/* 🚀 MODAL 1: UPLOAD DOCUMENT */}
      {/* ========================================== */}
      {showUploadModal && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card slide-in">
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <UploadCloud size={24} color="#81c784" />
                <h3>Upload to Secure Vault</h3>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="btn-close-modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="modal-body">
              {/* Drag and Drop File Dropzone */}
              <div
                className={`file-dropzone ${isDragOver ? 'drag-over' : ''} ${uploadFile ? 'file-selected' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files?.[0]) {
                    const f = e.dataTransfer.files[0];
                    setUploadFile(f);
                    if (!uploadName) setUploadName(f.name.replace(/\.[^/.]+$/, ''));
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      const f = e.target.files[0];
                      setUploadFile(f);
                      if (!uploadName) setUploadName(f.name.replace(/\.[^/.]+$/, ''));
                    }
                  }}
                />

                {uploadFile ? (
                  <div className="selected-file-info">
                    <CheckCircle2 size={36} color="#81c784" />
                    <div>
                      <strong>{uploadFile.name}</strong>
                      <p>{formatFileSize(uploadFile.size)} • Click to change file</p>
                    </div>
                  </div>
                ) : (
                  <div className="dropzone-prompt">
                    <UploadCloud size={40} color="#81c784" />
                    <p><strong>Click to browse</strong> or drag & drop document file here</p>
                    <span>Supported formats: PDF, JPG, JPEG, PNG (Up to 10MB)</span>
                  </div>
                )}
              </div>

              {/* Document Category Selector */}
              <div className="form-group mt-3">
                <label>Document Category *</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="form-control"
                  required
                >
                  <optgroup label="🪪 Identity Documents">
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Voter ID">Voter ID</option>
                    <option value="Driving License">Driving License</option>
                  </optgroup>
                  <optgroup label="🌾 Agriculture & Farming">
                    <option value="Land Documents">Land Documents / Patta</option>
                    <option value="Soil Test Report">Soil Test Report</option>
                    <option value="Crop Insurance">Crop Insurance Policy</option>
                    <option value="Farmer Registration">Farmer Registration Proof</option>
                    <option value="Crop Certificate">Crop Certificate</option>
                    <option value="Agriculture Certificate">Agriculture Certificate</option>
                  </optgroup>
                  <optgroup label="🏛️ Government & Family">
                    <option value="Ration Card">Ration Card</option>
                    <option value="Income Certificate">Income Certificate</option>
                    <option value="Government Scheme Document">Government Scheme Document</option>
                    <option value="Government Certificate">Government Certificate</option>
                  </optgroup>
                  <optgroup label="📄 Invoices & Other">
                    <option value="Agricultural Invoice / Bill">Agricultural Invoice / Bill</option>
                    <option value="Receipt">Fertilizer/Seed Receipt</option>
                    <option value="Other Document">Other Important Document</option>
                  </optgroup>
                </select>
              </div>

              {/* Document Custom Name */}
              <div className="form-group mt-3">
                <label>Document Title / Name *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. My Land Survey Record 2026"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  required
                />
              </div>

              {/* Optional Masked Identification Number */}
              <div className="form-group mt-3">
                <label>Masked Reference Number (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. XXXX XXXX 4821 or AP-LAND-092"
                  value={uploadMasked}
                  onChange={(e) => setUploadMasked(e.target.value)}
                />
                <span className="field-hint">For your privacy, we recommend entering masked numbers only.</span>
              </div>

              {/* Notes / Description */}
              <div className="form-group mt-3">
                <label>Remarks / Notes (Optional)</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="e.g. Submitted for PM-Kisan verification"
                  value={uploadNotes}
                  onChange={(e) => setUploadNotes(e.target.value)}
                ></textarea>
              </div>

              <div className="modal-actions mt-4">
                <button type="button" onClick={() => setShowUploadModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" disabled={uploading || !uploadFile} className="btn btn-primary">
                  {uploading ? 'Encrypting & Storing...' : 'Save to Vault'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 👁️ MODAL 2: DOCUMENT PREVIEW */}
      {/* ========================================== */}
      {showPreviewModal && previewDoc && (
        <div className="modal-backdrop">
          <div className="modal-content modal-preview glass-card slide-in">
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <FileText size={24} color="#81c784" />
                <div>
                  <h3>{previewDoc.documentName}</h3>
                  <span className="doc-category-badge">{previewDoc.category}</span>
                </div>
              </div>
              <div className="preview-header-actions">
                <button onClick={() => handleDownload(previewDoc)} className="btn btn-secondary btn-sm">
                  <Download size={16} /> Download
                </button>
                <button onClick={() => { setShowPreviewModal(false); setPreviewBlobUrl(''); }} className="btn-close-modal">
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="modal-body preview-body">
              {previewLoading ? (
                <div className="preview-loading">
                  <RefreshCw size={36} className="spinner" color="#81c784" />
                  <p>Decrypting and loading document stream...</p>
                </div>
              ) : previewBlobUrl ? (
                previewDoc.fileType === 'application/pdf' || previewDoc.fileExtension?.toLowerCase() === '.pdf' ? (
                  <iframe src={previewBlobUrl} className="preview-iframe" title="PDF Document Viewer" />
                ) : (
                  <div className="preview-image-wrapper">
                    <img src={previewBlobUrl} alt={previewDoc.documentName} className="preview-image" />
                  </div>
                )
              ) : (
                <div className="preview-error">
                  <AlertCircle size={36} color="#e57373" />
                  <p>Unable to display document preview. You can still download the file.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* ✏️ MODAL 3: EDIT DOCUMENT METADATA */}
      {/* ========================================== */}
      {showEditModal && editingDoc && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card slide-in">
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <Edit3 size={22} color="#ffa000" />
                <h3>Edit Document Details</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="btn-close-modal">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="modal-body">
              <div className="form-group">
                <label>Document Title *</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingDoc.documentName}
                  onChange={(e) => setEditingDoc({ ...editingDoc, documentName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group mt-3">
                <label>Category *</label>
                <select
                  value={editingDoc.category}
                  onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value })}
                  className="form-control"
                  required
                >
                  {CATEGORIES.map(c => (
                    <option key={c.name} value={c.name}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group mt-3">
                <label>Masked Reference Number</label>
                <input
                  type="text"
                  className="form-control"
                  value={editingDoc.maskedNumber || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, maskedNumber: e.target.value })}
                />
              </div>

              <div className="form-group mt-3">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  rows="2"
                  value={editingDoc.notes || ''}
                  onChange={(e) => setEditingDoc({ ...editingDoc, notes: e.target.value })}
                ></textarea>
              </div>

              <div className="modal-actions mt-4">
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================== */}
      {/* 🗑️ MODAL 4: DELETE CONFIRMATION */}
      {/* ========================================== */}
      {showDeleteModal && deletingDoc && (
        <div className="modal-backdrop">
          <div className="modal-content glass-card slide-in" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <Trash2 size={24} color="#e57373" />
                <h3>Delete Document?</h3>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="btn-close-modal">
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <p>Are you sure you want to permanently delete <strong>"{deletingDoc.documentName}"</strong> from your secure vault?</p>
              <p className="delete-warning-text">⚠️ This action is irreversible. The encrypted file will be permanently removed from disk.</p>
            </div>

            <div className="modal-actions">
              <button onClick={() => setShowDeleteModal(false)} className="btn btn-outline">
                Cancel
              </button>
              <button onClick={handleDeleteConfirm} className="btn btn-danger">
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS Styles for Document Vault */}
      <style>{`
        .vault-container {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .vault-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .vault-title-area {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .vault-icon-badge {
          width: 56px;
          height: 56px;
          border-radius: 16px;
          background: rgba(46, 125, 50, 0.2);
          border: 1px solid rgba(129, 199, 132, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .privacy-pill-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 18px;
          background: rgba(46, 125, 50, 0.12);
          border: 1px solid rgba(129, 199, 132, 0.3);
          border-radius: 12px;
          color: #c8e6c9;
          font-size: 13px;
        }

        .vault-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .vault-stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 18px 20px;
        }

        .stat-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .vault-stat-card h3 {
          font-size: 22px;
          font-weight: 800;
          color: #fff;
          margin-bottom: 2px;
        }

        .vault-stat-card p {
          font-size: 12px;
          color: var(--text-secondary);
        }

        /* Toolbar */
        .vault-toolbar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding: 16px 20px;
        }

        .search-box-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          color: var(--text-secondary);
        }

        .vault-search-input {
          width: 100%;
          padding: 12px 40px 12px 42px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          color: #fff;
          font-family: var(--font-family);
          font-size: 14px;
        }

        .vault-search-input:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .clear-search-btn {
          position: absolute;
          right: 12px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .group-tabs-list {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 4px;
        }

        .group-tab-btn {
          padding: 8px 16px;
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid var(--border-color);
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 13px;
          cursor: pointer;
          white-space: nowrap;
          transition: var(--transition-smooth);
        }

        .group-tab-btn:hover {
          color: #fff;
          background: rgba(46, 125, 50, 0.15);
        }

        .group-tab-btn.active {
          color: #fff;
          background: var(--primary-color);
          border-color: var(--primary-color);
          box-shadow: 0 4px 12px rgba(46, 125, 50, 0.3);
        }

        /* Documents Grid */
        .documents-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 20px;
        }

        .doc-card {
          display: flex;
          flex-direction: column;
          padding: 20px;
          border-radius: 16px;
          transition: transform 0.2s ease, border-color 0.2s ease;
        }

        .doc-card:hover {
          transform: translateY(-3px);
          border-color: rgba(129, 199, 132, 0.5);
        }

        .doc-card-top {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 12px;
        }

        .doc-type-icon-wrapper {
          flex-shrink: 0;
        }

        .icon-badge-pdf, .icon-badge-img {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .icon-badge-pdf {
          background: rgba(229, 115, 115, 0.15);
          border: 1px solid rgba(229, 115, 115, 0.3);
        }

        .icon-badge-img {
          background: rgba(129, 199, 132, 0.15);
          border: 1px solid rgba(129, 199, 132, 0.3);
        }

        .file-ext-tag {
          font-size: 8px;
          font-weight: 800;
          color: #fff;
          margin-top: 1px;
        }

        .doc-card-title-area h4 {
          font-size: 15px;
          font-weight: 700;
          color: #fff;
          margin-bottom: 6px;
          line-height: 1.3;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .doc-category-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 6px;
        }

        .badge-identity { background: rgba(0, 150, 136, 0.2); color: #80cbc4; border: 1px solid rgba(0, 150, 136, 0.3); }
        .badge-farming { background: rgba(46, 125, 50, 0.2); color: #a5d6a7; border: 1px solid rgba(46, 125, 50, 0.3); }
        .badge-govt { background: rgba(255, 160, 0, 0.2); color: #ffe082; border: 1px solid rgba(255, 160, 0, 0.3); }
        .badge-bills { background: rgba(156, 39, 176, 0.2); color: #ce93d8; border: 1px solid rgba(156, 39, 176, 0.3); }
        .badge-other { background: rgba(255, 255, 255, 0.1); color: #ccc; border: 1px solid rgba(255, 255, 255, 0.2); }

        .masked-id-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0, 0, 0, 0.25);
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 12px;
          color: #ffe082;
          margin-bottom: 8px;
        }

        .doc-notes {
          font-size: 12px;
          color: var(--text-secondary);
          font-style: italic;
          margin-bottom: 10px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .doc-meta-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: auto;
          padding-top: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .doc-meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .doc-card-actions {
          display: flex;
          gap: 6px;
          margin-top: 12px;
        }

        .btn-doc-action {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .btn-doc-action.view {
          flex: 2;
          background: rgba(46, 125, 50, 0.2);
          border-color: rgba(129, 199, 132, 0.3);
          color: #a5d6a7;
        }

        .btn-doc-action.view:hover { background: var(--primary-color); color: #fff; }
        .btn-doc-action.download:hover { background: rgba(255, 160, 0, 0.2); color: #ffa000; }
        .btn-doc-action.edit:hover { background: rgba(0, 150, 136, 0.2); color: #4db6ac; }
        .btn-doc-action.delete:hover { background: rgba(229, 115, 115, 0.2); color: #e57373; }

        /* Empty / Loading States */
        .vault-empty-state, .vault-loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          gap: 12px;
        }

        .vault-empty-state h3 { font-size: 20px; color: #fff; }
        .vault-empty-state p { color: var(--text-secondary); max-width: 400px; font-size: 14px; }

        /* Modals */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
        }

        .modal-content {
          width: 100%;
          max-width: 520px;
          background: var(--card-background);
          border: 1px solid var(--border-color);
          border-radius: 20px;
          padding: 24px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-preview {
          max-width: 900px;
          height: 85vh;
          display: flex;
          flex-direction: column;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 16px;
        }

        .modal-title-with-icon {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .modal-title-with-icon h3 {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
        }

        .btn-close-modal {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
        }

        .btn-close-modal:hover { color: #fff; }

        /* File Dropzone */
        .file-dropzone {
          border: 2px dashed rgba(129, 199, 132, 0.4);
          border-radius: 16px;
          padding: 30px 20px;
          text-align: center;
          background: rgba(0, 0, 0, 0.2);
          cursor: pointer;
          transition: var(--transition-smooth);
        }

        .file-dropzone:hover, .file-dropzone.drag-over {
          border-color: var(--primary-color);
          background: rgba(46, 125, 50, 0.1);
        }

        .file-dropzone.file-selected {
          border-style: solid;
          border-color: #81c784;
          background: rgba(46, 125, 50, 0.15);
        }

        .dropzone-prompt {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .dropzone-prompt p { font-size: 14px; color: #fff; }
        .dropzone-prompt span { font-size: 12px; color: var(--text-secondary); }

        .selected-file-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 14px;
          text-align: left;
        }

        .selected-file-info strong { color: #fff; font-size: 15px; }
        .selected-file-info p { color: var(--text-secondary); font-size: 12px; margin-top: 2px; }

        .field-hint {
          display: block;
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 4px;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }

        /* Preview body */
        .preview-body {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 12px;
          position: relative;
        }

        .preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
          border-radius: 12px;
        }

        .preview-image-wrapper {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .preview-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 8px;
        }

        .preview-header-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .delete-warning-text {
          font-size: 12px;
          color: #ff8a80;
          margin-top: 10px;
          padding: 8px 12px;
          background: rgba(229, 115, 115, 0.1);
          border-radius: 8px;
        }

        .btn-danger {
          background: var(--danger-color);
          color: white;
          border: none;
          padding: 10px 18px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
        }

        .btn-danger:hover { background: #b71c1c; }

        .btn-sm {
          padding: 6px 12px;
          font-size: 12px;
        }

        /* Toast Alert */
        .alert-toast {
          position: fixed;
          top: 24px;
          right: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 20px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          z-index: 2000;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          animation: slideInRight 0.3s ease;
        }

        .alert-success { background: #2e7d32; color: #fff; }
        .alert-error { background: #d32f2f; color: #fff; }
        .alert-info { background: #0288d1; color: #fff; }

        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }

        .spinner { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }

        @media (max-width: 768px) {
          .vault-header { flex-direction: column; align-items: flex-start; }
          .btn-upload-vault { width: 100%; justify-content: center; }
          .documents-grid { grid-template-columns: 1fr; }
          .modal-content { padding: 18px; }
        }
      `}</style>
    </div>
  );
};
