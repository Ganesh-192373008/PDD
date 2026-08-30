import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { 
  Camera, Upload, AlertCircle, RefreshCw, Sparkles, CheckCircle2, 
  ShieldAlert, Share2, Download, ArrowLeft, Eye, ShoppingBag 
} from 'lucide-react';
import { getDiseaseDetails } from '../utils/diseaseDetails';
import { jsPDF } from 'jspdf';

export const ScanCrop = () => {
  const { token, API_URL, t } = useApp();
  const navigate = useNavigate();
  const [image, setImage] = useState(null); // base64 or file
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  const triggerPDFDownload = (scanResult) => {
    try {
      const doc = new jsPDF();
      const details = getDiseaseDetails(scanResult.crop, scanResult.disease);
      
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
      doc.text(`${scanResult.crop}`, 60, 65);
      
      doc.setFont("helvetica", "bold");
      doc.text("Diagnosis:", 15, 72);
      doc.setFont("helvetica", "normal");
      doc.text(`${scanResult.disease}`, 60, 72);
      
      doc.setFont("helvetica", "bold");
      doc.text("Scientific Name:", 15, 79);
      doc.setFont("helvetica", "oblique");
      doc.text(`${details.scientificName}`, 60, 79);
      
      doc.setFont("helvetica", "bold");
      doc.text("Confidence Score:", 15, 86);
      doc.setFont("helvetica", "normal");
      doc.text(`${scanResult.confidence}%`, 60, 86);
      
      doc.setFont("helvetica", "bold");
      doc.text("Severity Level:", 15, 93);
      doc.setFont("helvetica", "normal");
      doc.text(`${scanResult.severity || 'Moderate'}`, 60, 93);
      
      doc.setFont("helvetica", "bold");
      doc.text("Date of Scan:", 15, 100);
      doc.setFont("helvetica", "normal");
      doc.text(`${new Date().toLocaleDateString()}`, 60, 100);
      
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
      
      const fileName = `${scanResult.crop.replace(/\s+/g, '_')}_${scanResult.disease.replace(/\s+/g, '_')}_Disease_Report.pdf`;
      doc.save(fileName);
      showToast('Report PDF downloaded successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate PDF.', 'error');
    }
  };

  const handleShare = (scanResult) => {
    const reportUrl = scanResult._id 
      ? `${window.location.origin}/report/${scanResult._id}`
      : `${window.location.origin}/report?crop=${encodeURIComponent(scanResult.crop)}&disease=${encodeURIComponent(scanResult.disease)}&confidence=${scanResult.confidence}&severity=${encodeURIComponent(scanResult.severity)}`;
    
    const shareText = `Disease detected: ${scanResult.disease}\nConfidence: ${scanResult.confidence}%\nSeverity: ${scanResult.severity}\nReport details: ${reportUrl}`;

    if (navigator.share) {
      navigator.share({
        title: `${scanResult.crop} Disease Diagnostic Report`,
        text: shareText,
        url: reportUrl
      }).then(() => {
        showToast('Report shared successfully!', 'success');
      }).catch(console.error);
    } else {
      setShowShareModal(true);
    }
  };

  const showToast = (msg, type = 'success') => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };
  
  // Camera-specific states
  const [useCamera, setUseCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraError, setCameraError] = useState('');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Close camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [cameraStream]);

  const startCamera = async () => {
    setCameraError('');
    setUseCamera(true);
    setPreview(null);
    setImage(null);
    setResult(null);

    try {
      const constraints = {
        video: { facingMode: 'environment' } // Preferred rear camera on phones
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setCameraError('Unable to access camera. Please ensure permissions are granted and you are using HTTPS or localhost.');
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const compressImage = (file, callback) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Define max dimensions
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          const compressedFile = new File([blob], file.name || 'compressed_image.jpg', {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          callback(compressedFile, URL.createObjectURL(blob));
        }, 'image/jpeg', 0.6); // 0.6 quality compression
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Resize to a maximum of 600px width/height while keeping aspect ratio
      let width = video.videoWidth;
      let height = video.videoHeight;
      const MAX_WIDTH = 600;
      const MAX_HEIGHT = 600;
      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas frame to blob/file with 0.6 quality compression
      canvas.toBlob((blob) => {
        const file = new File([blob], 'captured_leaf.jpg', { type: 'image/jpeg' });
        setImage(file);
        setPreview(URL.createObjectURL(blob));
        setUseCamera(false);
        stopCamera();
      }, 'image/jpeg', 0.6);
    }
  };

  // Upload handler from local storage
  const handleFileChange = (e) => {
    setError('');
    setResult(null);
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file (PNG, JPG, JPEG).');
        return;
      }
      compressImage(file, (compressedFile, previewUrl) => {
        setImage(compressedFile);
        setPreview(previewUrl);
      });
      setUseCamera(false);
      stopCamera();
    }
  };

  // Trigger analysis call to backend
  const analyzeImage = async () => {
    if (!image || loading) return;
    
    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('image', image);

    try {
      const res = await fetch(`${API_URL}/disease/scan`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      
      if (res.ok) {
        setResult(data);
      } else {
        setError(data.message || 'An error occurred during diagnosis analysis.');
      }
    } catch (e) {
      setError('Connection to backend classification model failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError('');
    startCamera();
  };

  // Helper to color-code crop disease severity level badge
  const renderSeverityBadge = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'none':
        return <span className="badge badge-success">Healthy</span>;
      case 'moderate':
        return <span className="badge badge-warning">Moderate</span>;
      case 'severe':
        return <span className="badge badge-danger">Severe</span>;
      case 'critical':
        return <span className="badge badge-danger blink">Critical Threat</span>;
      default:
        return <span className="badge badge-info">{severity}</span>;
    }
  };

  return (
    <div className="scan-wrapper slide-in">
      {successMsg && (
        <div className="alert alert-success floating-alert">
          <CheckCircle2 size={16} />
          {successMsg}
        </div>
      )}
      <header className="scan-header mb-4">
        <h1>AI Crop Disease Detection</h1>
        <p className="subtitle">Snap or upload a leaf photo to diagnose diseases instantly using the PlantVillage model.</p>
      </header>

      <div className="grid-2">
        {/* Input/Camera Container */}
        <section className="glass-card scan-control-card">
          {cameraError && <div className="alert alert-error">{cameraError}</div>}
          
          {useCamera ? (
            <div className="camera-view-container">
              <video ref={videoRef} autoPlay playsInline className="camera-feed"></video>
              <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
              <div className="camera-actions mt-3">
                <button onClick={capturePhoto} className="btn btn-primary">
                  <Camera size={18} /> Capture
                </button>
                <button onClick={() => { setUseCamera(false); stopCamera(); }} className="btn btn-outline">
                  Cancel
                </button>
              </div>
            </div>
          ) : preview ? (
            <div className="preview-container">
              <img src={preview} alt="Leaf Preview" className="leaf-preview" />
              <div className="preview-actions mt-3">
                <button onClick={analyzeImage} disabled={loading} className="btn btn-primary">
                  {loading ? 'Analyzing Plant...' : 'Start Diagnostic Analysis'}
                </button>
                <button onClick={handleRetake} className="btn btn-secondary">
                  <RefreshCw size={16} /> Retake / Camera
                </button>
                <button onClick={() => { setPreview(null); setImage(null); setResult(null); }} className="btn btn-outline">
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="upload-options-wrapper">
              <div className="camera-prompt-box" onClick={startCamera}>
                <Camera size={48} color="#81c784" />
                <h3>Open Live Camera</h3>
                <p>Allow camera permission and photograph leaf directly.</p>
              </div>

              <div className="divider"><span>OR</span></div>

              <div className="upload-prompt-box">
                <Upload size={48} color="#ffa000" />
                <h3>Upload Image File</h3>
                <p>Drag or select PNG, JPG, or JPEG file from gallery.</p>
                <input
                  type="file"
                  id="leaf-upload-input"
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <button 
                  onClick={() => document.getElementById('leaf-upload-input').click()} 
                  className="btn btn-secondary mt-3"
                >
                  Choose Image File
                </button>
              </div>
            </div>
          )}

          {loading && (
            <div className="analysis-overlay">
              <div className="spinner"></div>
              <p>PlantVillage model running tensor calculations...</p>
            </div>
          )}
        </section>

        {/* Diagnostic Results Card */}
        <section className="glass-card result-card">
          <h2>Diagnosis Result</h2>
          
          {error && (
            <div className="alert alert-error mt-3">
              <div className="flex-row">
                <AlertCircle size={20} />
                <div>
                  <strong>Diagnostic Error:</strong>
                  <p>{error}</p>
                </div>
              </div>
            </div>
          )}

          {result ? (
            result.confidenceTooLow ? (
              <div className="alert alert-warning low-confidence-box mt-3">
                <ShieldAlert size={36} color="#ffa000" />
                <div>
                  <h4>Low Inference Confidence</h4>
                  <p>{result.message}</p>
                </div>
              </div>
            ) : (
              <div className="diagnosis-result-details mt-3 animate-fade-in">
                <div className="result-success-header">
                  <ShieldAlert size={28} color="#e74c3c" className="alert-pulse mr-2" />
                  <div>
                    <h3 style={{ margin: 0, color: '#e74c3c' }}>Disease Detected!</h3>
                    <p className="detection-subtitle" style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                      {result.confidence}% Confidence
                    </p>
                  </div>
                </div>

                <div className="info-box-wrapper mt-3">
                  <div className="info-box-row">
                    <span className="info-box-label">Disease:</span>
                    <span className="info-box-value highlight-disease">{result.disease}</span>
                  </div>
                  <div className="info-box-row">
                    <span className="info-box-label">Scientific Name:</span>
                    <span className="info-box-value italic-value">
                      {getDiseaseDetails(result.crop, result.disease).scientificName}
                    </span>
                  </div>
                  <div className="info-box-row">
                    <span className="info-box-label">Severity:</span>
                    <span className="info-box-value">
                      {renderSeverityBadge(result.severity)}
                    </span>
                  </div>
                  <div className="info-box-row">
                    <span className="info-box-label">Risk Level:</span>
                    <span className="info-box-value" style={{ color: '#ff4757', fontWeight: 700 }}>
                      {result.severity || 'High'}
                    </span>
                  </div>
                </div>

                {/* Recommended Products Quick Button */}
                <div className="products-shortcut-box mt-4">
                  <button 
                    onClick={() => navigate(`/recommended-products?crop=${result.crop}&disease=${result.disease}`)} 
                    className="btn btn-secondary btn-block font-bold"
                  >
                    🛒 View Recommended Products
                  </button>
                </div>

                {/* Grid Action Buttons */}
                <div className="action-buttons-grid mt-3">
                  <button 
                    onClick={() => {
                      if (result._id) {
                        navigate(`/report/${result._id}`);
                      } else {
                        navigate(`/report?crop=${result.crop}&disease=${result.disease}&confidence=${result.confidence}&severity=${result.severity}`);
                      }
                    }} 
                    className="btn btn-primary"
                  >
                    <Eye size={16} /> View Detailed Report
                  </button>

                  <button 
                    onClick={() => triggerPDFDownload(result)} 
                    className="btn btn-outline"
                  >
                    <Download size={16} /> Download Report
                  </button>

                  <button 
                    onClick={() => handleShare(result)} 
                    className="btn btn-outline"
                  >
                    <Share2 size={16} /> Share Report
                  </button>

                  <button 
                    onClick={() => navigate('/')} 
                    className="btn btn-outline-danger"
                  >
                    Back to Home
                  </button>
                </div>
              </div>
            )
          ) : (
            <div className="empty-results mt-4">
              <Sparkles size={48} color="rgba(144, 165, 149, 0.2)" />
              <p>Diagnostic details will populate here after capturing or uploading a plant image.</p>
            </div>
          )}
        </section>
      </div>

      {/* Share Modal Dialog Fallback */}
      {showShareModal && result && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0 }}>Share Diagnostic Report</h3>
              <button onClick={() => setShowShareModal(false)} className="btn-close" style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>
                Close
              </button>
            </div>
            <div className="share-actions-list mt-3" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={() => {
                  const reportUrl = result._id 
                    ? `${window.location.origin}/report/${result._id}`
                    : `${window.location.origin}/report?crop=${encodeURIComponent(result.crop)}&disease=${encodeURIComponent(result.disease)}&confidence=${result.confidence}&severity=${encodeURIComponent(result.severity)}`;
                  navigator.clipboard.writeText(reportUrl);
                  showToast('Report URL copied to clipboard!', 'success');
                  setShowShareModal(false);
                }} 
                className="share-modal-btn"
                style={{ display: 'flex', padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer' }}
              >
                Copy Report Link
              </button>
              <button 
                onClick={() => {
                  const reportUrl = result._id 
                    ? `${window.location.origin}/report/${result._id}`
                    : `${window.location.origin}/report?crop=${encodeURIComponent(result.crop)}&disease=${encodeURIComponent(result.disease)}&confidence=${result.confidence}&severity=${encodeURIComponent(result.severity)}`;
                  const shareText = encodeURIComponent(`Disease detected: ${result.disease}\nConfidence: ${result.confidence}%\nSeverity: ${result.severity}\nReport: ${reportUrl}`);
                  window.open(`https://api.whatsapp.com/send?text=${shareText}`, '_blank');
                  setShowShareModal(false);
                }} 
                className="share-modal-btn"
                style={{ display: 'flex', padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer' }}
              >
                WhatsApp
              </button>
              <button 
                onClick={() => {
                  const reportUrl = result._id 
                    ? `${window.location.origin}/report/${result._id}`
                    : `${window.location.origin}/report?crop=${encodeURIComponent(result.crop)}&disease=${encodeURIComponent(result.disease)}&confidence=${result.confidence}&severity=${encodeURIComponent(result.severity)}`;
                  const subject = encodeURIComponent(`${result.crop} Disease Diagnostic Report`);
                  const body = encodeURIComponent(`Disease detected: ${result.disease}\nConfidence: ${result.confidence}%\nSeverity: ${result.severity}\nView full report: ${reportUrl}`);
                  window.location.href = `mailto:?subject=${subject}&body=${body}`;
                  setShowShareModal(false);
                }} 
                className="share-modal-btn"
                style={{ display: 'flex', padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', cursor: 'pointer' }}
              >
                Email
              </button>
            </div>
          </div>
        </div>
      )}


      <style>{`
        .camera-view-container {
          position: relative;
          width: 100%;
          border-radius: var(--border-radius-sm);
          overflow: hidden;
          background: #000;
        }
        .camera-feed {
          width: 100%;
          max-height: 400px;
          object-fit: cover;
          display: block;
        }
        .camera-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
        .preview-container {
          width: 100%;
          text-align: center;
        }
        .leaf-preview {
          max-width: 100%;
          max-height: 350px;
          border-radius: var(--border-radius-sm);
          border: 1px solid var(--border-color);
          object-fit: contain;
        }
        .preview-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
        }
        .upload-options-wrapper {
          display: flex;
          flex-direction: column;
          gap: 20px;
          height: 100%;
          justify-content: center;
        }
        .camera-prompt-box, .upload-prompt-box {
          border: 2px dashed var(--border-color);
          border-radius: var(--border-radius-md);
          padding: 30px;
          text-align: center;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .camera-prompt-box:hover, .upload-prompt-box:hover {
          border-color: var(--primary-color);
          background: rgba(46, 125, 50, 0.05);
        }
        .camera-prompt-box h3, .upload-prompt-box h3 {
          margin-top: 10px;
          color: #fff;
        }
        .camera-prompt-box p, .upload-prompt-box p {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
        }
        
        .scan-control-card {
          position: relative;
        }
        .analysis-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(10, 15, 13, 0.85);
          backdrop-filter: blur(4px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 16px;
          border-radius: var(--border-radius-md);
          z-index: 10;
        }
        
        /* Diagnosis Details */
        .result-metric-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .metric-box {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid var(--border-color);
          border-radius: var(--border-radius-sm);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .metric-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-secondary);
        }
        .metric-val {
          font-size: 18px;
          font-weight: 700;
          color: #fff;
        }
        .result-status-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(46, 125, 50, 0.15);
          border-radius: var(--border-radius-sm);
        }
        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: var(--text-secondary);
        }
        .status-item span:first-child {
          font-weight: 500;
        }
        .confidence-percentage {
          font-weight: 700;
          color: var(--secondary-color);
        }
        .recommendations-box {
          background: rgba(46, 125, 50, 0.08);
          border: 1px solid rgba(46, 125, 50, 0.25);
          border-radius: var(--border-radius-sm);
          padding: 20px;
        }
        .rec-header {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #fff;
        }
        .rec-text {
          font-size: 14px;
          line-height: 1.6;
          color: var(--text-primary);
        }
        .success-banner {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #81c784;
          background: rgba(56, 142, 60, 0.05);
          padding: 10px;
          border-radius: var(--border-radius-sm);
          justify-content: center;
        }
        .low-confidence-box {
          display: flex;
          gap: 16px;
          align-items: center;
          padding: 20px;
        }
        .low-confidence-box h4 {
          color: var(--secondary-color);
          margin-bottom: 4px;
        }
        .empty-results {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 0;
          color: var(--text-secondary);
          text-align: center;
          gap: 16px;
        }
        .flex-row {
          display: flex;
          gap: 12px;
        }
        .blink {
          animation: blinker 1.5s linear infinite;
        }
        @keyframes blinker {
          50% { opacity: 0.5; }
        }

        /* New Disease Detection Results Styling */
        .result-success-header {
          display: flex;
          align-items: center;
          background: rgba(231, 76, 60, 0.08);
          border: 1px solid rgba(231, 76, 60, 0.2);
          border-radius: var(--border-radius-sm);
          padding: 16px;
        }
        .alert-pulse {
          animation: alertPulse 2s infinite ease-in-out;
        }
        @keyframes alertPulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.8; }
        }
        .info-box-wrapper {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .info-box-row {
          display: flex;
          justify-content: space-between;
          padding: 12px 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: var(--border-radius-sm);
          font-size: 13.5px;
        }
        .info-box-label {
          color: var(--text-secondary);
          font-weight: 700;
        }
        .info-box-value {
          color: #fff;
          font-weight: 700;
        }
        .highlight-disease {
          color: #ffa000;
        }
        .italic-value {
          font-style: italic;
          color: var(--text-secondary);
        }
        .action-buttons-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        .btn-outline-danger {
          background: transparent;
          border: 1px solid #ff4757;
          color: #ff4757;
          font-weight: 700;
          padding: 10px;
          border-radius: var(--border-radius-sm);
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .btn-outline-danger:hover {
          background: rgba(255, 71, 87, 0.1);
        }
        
        /* Modal styling */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.7);
          backdrop-filter: blur(4px);
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
          border-radius: var(--border-radius-md);
        }
      `}</style>
    </div>
  );
};
