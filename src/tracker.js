export class FaceTracker {
  constructor(smoother) {
    this.smoother = smoother;
    this.videoElement = document.getElementById('webcam');
    this.detector = null;
    this.running = false;
    this.videoWidth = 640;
    this.videoHeight = 480;
  }

  async init() {
    // Start webcam
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: this.videoWidth, height: this.videoHeight, facingMode: 'user' }
      });
      this.videoElement.srcObject = stream;
      await new Promise(resolve => {
        this.videoElement.onloadeddata = resolve;
      });
    } catch (err) {
      console.warn('Webcam not available, running without head tracking:', err.message);
      return;
    }

    // Create face detector
    try {
      const model = window.faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
      this.detector = await window.faceLandmarksDetection.createDetector(model, {
        runtime: 'mediapipe',
        solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619',
        maxFaces: 1,
        refineLandmarks: false
      });
      console.log('Face detector initialized');
    } catch (err) {
      console.warn('Face detector failed to initialize:', err.message);
      // Try TF.js runtime as fallback
      try {
        const model = window.faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh;
        this.detector = await window.faceLandmarksDetection.createDetector(model, {
          runtime: 'tfjs',
          maxFaces: 1,
          refineLandmarks: false
        });
        console.log('Face detector initialized (tfjs fallback)');
      } catch (err2) {
        console.warn('Face detector fallback also failed:', err2.message);
        return;
      }
    }

    this.startTracking();
  }

  startTracking() {
    this.running = true;

    const detect = async () => {
      if (!this.running || !this.detector) return;

      try {
        const faces = await this.detector.estimateFaces(this.videoElement, {
          flipHorizontal: false
        });

        if (faces.length > 0) {
          const face = faces[0];
          const box = face.box;

          // Normalized head position from bounding box center
          const centerX = (box.xMin + box.width / 2) / this.videoWidth;
          const centerY = (box.yMin + box.height / 2) / this.videoHeight;

          // Map to -1..1 range, invert X (webcam mirror)
          const headX = -(centerX - 0.5) * 2;
          const headY = -(centerY - 0.5) * 2;

          // Depth estimate from face size
          const faceSize = box.width * box.height;
          const refSize = 0.04 * this.videoWidth * this.videoHeight;
          const headZ = Math.sqrt(refSize / Math.max(faceSize, 1));

          this.smoother.setTarget(headX, headY, headZ);
        }
      } catch (err) {
        // Silently continue on detection errors
      }

      // Schedule next detection (~15-20 FPS for tracking)
      if (this.running) {
        setTimeout(detect, 60);
      }
    };

    detect();
  }

  stop() {
    this.running = false;
  }
}
