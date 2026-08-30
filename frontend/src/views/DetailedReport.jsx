import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getDiseaseDetails } from '../utils/diseaseDetails';
import { 
  FileText, ArrowLeft, Download, Share2, ShieldAlert, Sparkles, 
  CheckCircle2, Info, ShoppingBag, Eye, Copy, Mail, ExternalLink 
} from 'lucide-react';
import { jsPDF } from 'jspdf';

export const DetailedReport = () => {
  const { token, API_URL } = useApp();
  const { scanId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [reportData, setReportData] = useState({
    crop: '',
    disease: '',
    confidence: 0,
    severity: 'Moderate',
    recommendation: '',
    createdAt: ''
  });

  useEffect(() => {
    const fetchReport = async () => {
      // If we have a scanId, fetch from the database
      if (scanId) {
        try {
          setLoading(true);
          const res = await fetch(`${API_URL}/history/scans/${scanId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setReportData(data);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.error('Error fetching detailed report:', err);
        }
      }

      // Fallback or override with search parameters
      const cropParam = searchParams.get('crop');
      const diseaseParam = searchParams.get('disease');
      const confidenceParam = searchParams.get('confidence');
      const severityParam = searchParams.get('severity');
      const recommendationParam = searchParams.get('recommendation');

      if (cropParam && diseaseParam) {
        setReportData({
          crop: cropParam,
          disease: diseaseParam,
          confidence: confidenceParam ? parseFloat(confidenceParam) : 90,
          severity: severityParam || 'Moderate',
          recommendation: recommendationParam || 'Apply protective sprays.',
          createdAt: new Date().toISOString()
        });
        setLoading(false);
      } else if (!scanId) {
        setError('No report details provided. Please run a scan first.');
        setLoading(false);
      }
    };

    fetchReport();
  }, [scanId, searchParams, token, API_URL]);

  const details = getDiseaseDetails(reportData.crop, reportData.disease);

  const triggerPDFDownload = () => {
    try {
      const doc = new jsPDF();
      
      // Header banner
      doc.setFillColor(46, 125, 50); // Agro Green
      doc.rect(0, 0, 210, 35, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("AGROASSIST AI", 15, 18);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Professional Plant Disease Diagnosis Report", 15, 26);
      
      // Title
      doc.setTextColor(46, 125, 50);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("Disease Detection Summary", 15, 50);
      
      // Line separator
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 55, 195, 55);
      
      // Info table layout
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Crop Analyzed:", 15, 65);
      doc.setFont("helvetica", "normal");
      doc.text(`${reportData.crop}`, 60, 65);
      
      doc.setFont("helvetica", "bold");
      doc.text("Diagnosis:", 15, 72);
      doc.setFont("helvetica", "normal");
      doc.text(`${reportData.disease}`, 60, 72);
      
      doc.setFont("helvetica", "bold");
      doc.text("Scientific Name:", 15, 79);
      doc.setFont("helvetica", "oblique");
      doc.text(`${details.scientificName}`, 60, 79);
      
      doc.setFont("helvetica", "bold");
      doc.text("Confidence Score:", 15, 86);
      doc.setFont("helvetica", "normal");
      doc.text(`${reportData.confidence}%`, 60, 86);
      
      doc.setFont("helvetica", "bold");
      doc.text("Severity Level:", 15, 93);
      doc.setFont("helvetica", "normal");
      doc.text(`${reportData.severity || 'Moderate'}`, 60, 93);
      
      doc.setFont("helvetica", "bold");
      doc.text("Date of Scan:", 15, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`${new Date(reportData.createdAt || Date.now()).toLocaleDateString()}`, 60, 100);
      
      // Symptoms Section
      doc.setTextColor(46, 125, 50);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Key Symptoms Identified", 15, 115);
      doc.line(15, 118, 195, 118);
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "normal");
      let yPos = 125;
      details.symptoms.forEach(sym => {
        doc.text(`- ${sym}`, 20, yPos);
        yPos += 7;
      });
      
      // Causes Section
      yPos += 3;
      doc.setTextColor(46, 125, 50);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Associated Causes", 15, yPos);
      doc.line(15, yPos + 3, 195, yPos + 3);
      yPos += 9;
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "normal");
      details.causes.forEach(cause => {
        doc.text(`- ${cause}`, 20, yPos);
        yPos += 7;
      });
      
      // Treatment & Prevention
      yPos += 3;
      doc.setTextColor(46, 125, 50);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Treatment & Prevention Recommendations", 15, yPos);
      doc.line(15, yPos + 3, 195, yPos + 3);
      yPos += 9;
      
      doc.setTextColor(80, 80, 80);
      doc.setFontSize(10);
      
      doc.setFont("helvetica", "bold");
      doc.text("Immediate Treatment:", 15, yPos);
      yPos += 5;
      doc.setFont("helvetica", "normal");
      const splitTreatment = doc.splitTextToSize(details.treatment, 175);
      doc.text(splitTreatment, 15, yPos);
      yPos += splitTreatment.length * 5 + 3;
      
      doc.setFont("helvetica", "bold");
      doc.text("Prevention Measures:", 15, yPos);
      yPos += 5;
      doc.setFont("helvetica", "normal");
      const splitPrevention = doc.splitTextToSize(details.prevention, 175);
      doc.text(splitPrevention, 15, yPos);
      
      // Footer banner
      doc.setFillColor(245, 245, 245);
      doc.rect(0, 280, 210, 17, 'F');
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.text("Report generated by AgroAssist AI Assistant. All recommendations are advisory.", 15, 290);
      
      const fileName = `${reportData.crop.replace(/\s+/g, '_')}_${reportData.disease.replace(/\s+/g, '_')}_Disease_Report.pdf`;
      doc.save(fileName);
      showToast('Report PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PDF.', 'error');
    }
  };

  const handleShare = () => {
    const reportUrl = window.location.href;
    const shareText = `Crop: ${reportData.crop}\nDisease: ${reportData.disease}\nConfidence: ${reportData.confidence}%\nSeverity: ${reportData.severity}\nReport details: ${reportUrl}`;
    
    if (navigator.share) {
      navigator.share({
        title: `${reportData.crop} Disease Diagnostic Report`,
        text: shareText,
        url: reportUrl
      }).then(() => {
        showToast('Report shared successfully!', 'success');
      }).catch(console.error);
    } else {
      setShowShareModal(true);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Report URL copied to clipboard!', 'success');
    setShowShareModal(false);
  };

  const shareViaWhatsApp = () => {
    const reportUrl = window.location.href;
    const shareText = encodeURIComponent(`Crop: ${reportData.crop}\nDisease: ${reportData.disease}\nConfidence: ${reportData.confidence}%\nSeverity: ${reportData.severity}\nReport: ${reportUrl}`);
    window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
    setShowShareModal(false);
  };

  const shareViaEmail = () => {
    const reportUrl = window.location.href;
    const subject = encodeURIComponent(`${reportData.crop} Disease Diagnostic Report`);
    const body = encodeURIComponent(`Disease detected: ${reportData.disease}\nConfidence: ${reportData.confidence}%\nSeverity: ${reportData.severity}\nView full report: ${reportUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setShowShareModal(false);
  };

  const showToast = (msg, type = 'success') => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  if (loading) {
    return (
      <div className="report-loading-container">
        <div className="spinner"></div>
        <p>Analyzing diagnostic database records...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-error-container glass-card">
        <ShieldAlert size={48} color="#ff4757" />
        <h2>Unable to load report</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/scan')} className="btn btn-primary mt-3">
          <ArrowLeft size={16} /> Back to Scanner
        </button>
      </div>
    );
  }

  const getSeverityClass = (sev) => {
    switch (sev?.toLowerCase()) {
      case 'severe':
      case 'critical':
        return 'danger';
      case 'moderate':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <div className="report-page-wrapper slide-in">
      {successMsg && (
        <div className="alert alert-success floating-alert">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}

      {/* Navigation and Action Bar */}
      <div className="report-navbar">
        <button onClick={() => navigate(-1)} className="btn-back">
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>
        <div className="report-nav-actions">
          <button onClick={handleShare} className="btn btn-outline btn-sm">
            <Share2 size={16} /> Share
          </button>
          <button onClick={triggerPDFDownload} className="btn btn-primary btn-sm">
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="report-grid mt-4">
        {/* Core Summary Card */}
        <section className="glass-card summary-card">
          <div className="summary-header">
            <FileText size={32} color="#2e7d32" />
            <div>
              <span className="badge badge-meta">DIAGNOSTIC REPORT</span>
              <h2>{reportData.crop} Health Report</h2>
            </div>
          </div>

          <div className="info-grid mt-4">
            <div className="info-cell">
              <span className="info-label">Crop Name</span>
              <span className="info-val">{reportData.crop}</span>
            </div>
            <div className="info-cell">
              <span className="info-label">Diagnosis</span>
              <span className="info-val highlighting-text">{reportData.disease}</span>
            </div>
            <div className="info-cell">
              <span className="info-label">Scientific Name</span>
              <span className="info-val italic-text">{details.scientificName}</span>
            </div>
            <div className="info-cell">
              <span className="info-label">Confidence</span>
              <span className="info-val confidence-badge">{reportData.confidence}%</span>
            </div>
            <div className="info-cell">
              <span className="info-label">Severity Level</span>
              <span className={`info-val badge-${getSeverityClass(reportData.severity)}`}>
                {reportData.severity}
              </span>
            </div>
            <div className="info-cell">
              <span className="info-label">Detection Date</span>
              <span className="info-val">
                {new Date(reportData.createdAt || Date.now()).toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Dynamic recommended products helper */}
          <div className="products-banner mt-4">
            <div className="banner-details">
              <ShoppingBag size={20} className="banner-icon" />
              <div>
                <h4>Recommended Care Products Available</h4>
                <p>We found products suitable to treat {reportData.disease} in your {reportData.crop}.</p>
              </div>
            </div>
            <button 
              onClick={() => navigate(`/recommended-products?crop=${reportData.crop}&disease=${reportData.disease}`)} 
              className="btn btn-secondary btn-sm"
            >
              View Products <ExternalLink size={14} className="ml-1" />
            </button>
          </div>
        </section>

        {/* Symptoms & Causes details */}
        <section className="glass-card details-card">
          <h3>Symptoms & Observations</h3>
          <div className="bullet-container mt-2">
            {details.symptoms.map((sym, idx) => (
              <div key={idx} className="bullet-row">
                <Info size={16} className="bullet-icon symptoms" />
                <p>{sym}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-4">Primary Environmental Causes</h3>
          <div className="bullet-container mt-2">
            {details.causes.map((cause, idx) => (
              <div key={idx} className="bullet-row">
                <ShieldAlert size={16} className="bullet-icon causes" />
                <p>{cause}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Treatment & Recommended Actions */}
        <section className="glass-card treatment-card">
          <div className="card-header-icon">
            <Sparkles size={24} color="#ffa000" />
            <h3>Actionable Treatment Plan</h3>
          </div>

          <div className="section-block mt-3">
            <strong>Immediate Treatment:</strong>
            <p className="mt-1">{details.treatment}</p>
          </div>

          <div className="section-block mt-3">
            <strong>Prevention Strategies:</strong>
            <p className="mt-1">{details.prevention}</p>
          </div>

          <div className="recommended-list-box mt-4">
            <h4>Steps to Take Right Now:</h4>
            <div className="step-list mt-2">
              {details.recommendedActions.map((action, idx) => (
                <div key={idx} className="step-item">
                  <span className="step-num">{idx + 1}</span>
                  <p>{action}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Share Modal Dialog Fallback */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share Diagnostic Report</h3>
              <button onClick={() => setShowShareModal(false)} className="btn-close">
                Back
              </button>
            </div>
            <div className="share-actions-list mt-3">
              <button onClick={copyShareLink} className="share-modal-btn">
                <Copy size={18} /> Copy Report Link
              </button>
              <button onClick={shareViaWhatsApp} className="share-modal-btn">
                <ExternalLink size={18} /> WhatsApp
              </button>
              <button onClick={shareViaEmail} className="share-modal-btn">
                <Mail size={18} /> Email
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .report-page-wrapper {
          max-width: 900px;
          margin: 0 auto;
          padding-bottom: 80px;
        }
        
        .report-loading-container, .report-error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          text-align: center;
        }

        .report-navbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--border-color);
        }
        .btn-back {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: none;
          color: #fff;
          font-weight: 700;
          cursor: pointer;
        }
        .report-nav-actions {
          display: flex;
          gap: 12px;
        }

        .report-grid {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .summary-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .badge-meta {
          background: rgba(46, 125, 50, 0.1);
          color: #81c784;
          font-size: 10px;
          padding: 2px 8px;
          border: 1px solid rgba(46, 125, 50, 0.3);
        }
        .summary-card h2 {
          font-size: 20px;
          color: #fff;
          font-weight: 800;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }
        .info-cell {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .info-label {
          font-size: 11px;
          color: var(--text-secondary);
          font-weight: 700;
        }
        .info-val {
          font-size: 15px;
          color: #fff;
          font-weight: 700;
        }
        .highlighting-text {
          color: #ffa000;
        }
        .italic-text {
          font-style: italic;
          color: var(--text-secondary);
        }
        .confidence-badge {
          color: #2e7d32;
        }
        
        .badge-danger {
          color: #ff4757;
        }
        .badge-warning {
          color: #ffa000;
        }
        .badge-success {
          color: #2e7d32;
        }

        /* Products banner */
        .products-banner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%);
          border-radius: var(--border-radius-sm);
          padding: 16px 20px;
          gap: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .banner-details {
          display: flex;
          align-items: center;
          gap: 12px;
          color: #fff;
        }
        .banner-details h4 {
          font-weight: 700;
          font-size: 14px;
        }
        .banner-details p {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
        }

        .bullet-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .bullet-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .bullet-icon {
          flex-shrink: 0;
          margin-top: 2px;
        }
        .bullet-icon.symptoms {
          color: #ffb74d;
        }
        .bullet-icon.causes {
          color: #e57373;
        }

        .card-header-icon {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
        }

        .section-block strong {
          color: #fff;
          font-size: 14px;
        }
        .section-block p {
          font-size: 13.5px;
          line-height: 1.6;
          color: var(--text-secondary);
        }

        .recommended-list-box {
          border-top: 1px solid var(--border-color);
          padding-top: 16px;
        }
        .recommended-list-box h4 {
          color: #fff;
          font-weight: 700;
        }
        .step-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .step-item {
          display: flex;
          gap: 12px;
          align-items: center;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 8px 12px;
          border-radius: 6px;
        }
        .step-num {
          background: #ffa000;
          color: #000;
          font-weight: 800;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          flex-shrink: 0;
        }

        /* Modal styling */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          z-index: 100;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .modal-content {
          width: 90%;
          max-width: 400px;
          background: #18221b;
          border: 1px solid var(--border-color);
          padding: 24px;
        }
        .share-actions-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .share-modal-btn {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid var(--border-color);
          color: #fff;
          padding: 12px;
          border-radius: var(--border-radius-sm);
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .share-modal-btn:hover {
          background: rgba(46,125,50,0.15);
          border-color: #2e7d32;
        }
      `}</style>
    </div>
  );
};
