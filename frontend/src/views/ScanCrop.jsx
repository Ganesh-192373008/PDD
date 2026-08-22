import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Camera, Upload, AlertCircle, RefreshCw, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';

export const ScanCrop = () => {
  const { token, API_URL, t } = useApp();
  const [image, setImage] = useState(null); // base64 or file
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  
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

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Match canvas dimensions to video aspect ratio
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas frame to blob/file
      canvas.toBlob((blob) => {
        const file = new File([blob], 'captured_leaf.jpg', { type: 'image/jpeg' });
        setImage(file);
        setPreview(URL.createObjectURL(blob));
        setUseCamera(false);
        stopCamera();
      }, 'image/jpeg', 0.95);
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
      setImage(file);
      setPreview(URL.createObjectURL(file));
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
              <div className="diagnosis-result-details mt-3">
                <div className="result-metric-row">
                  <div className="metric-box">
                    <span className="metric-label">CROP</span>
                    <span className="metric-val">{result.crop}</span>
                  </div>
                  <div className="metric-box">
                    <span className="metric-label">DIAGNOSIS</span>
                    <span className="metric-val">{result.disease}</span>
                  </div>
                </div>

                <div className="result-status-row mt-3">
                  <div className="status-item">
                    <span>Severity Level:</span>
                    {renderSeverityBadge(result.severity)}
                  </div>
                  <div className="status-item">
                    <span>Model Confidence:</span>
                    <span className="confidence-percentage">{result.confidence}%</span>
                  </div>
                </div>

                <div className="recommendations-box mt-3">
                  <div className="rec-header">
                    <Sparkles size={18} color="#ffa000" />
                    <strong>Recommended Actions & Care:</strong>
                  </div>
                  <p className="rec-text mt-2">{result.recommendation}</p>
                </div>

                <div className="success-banner mt-3">
                  <CheckCircle2 size={18} color="#81c784" />
                  <span>Analysis complete. Saved to history log.</span>
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
      `}</style>
    </div>
  );
};
