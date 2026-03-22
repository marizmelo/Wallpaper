# 🌍 Wallpaper

A fullscreen Electron desktop wallpaper featuring a realistic 3D Earth (and Saturn on secondary monitors) with **webcam-based head tracking** for a holographic parallax effect. Move your head and the perspective shifts — like looking through a window into space.

https://github.com/user-attachments/assets/placeholder

## ✨ Features

- **Holographic Parallax** — Webcam tracks your face using MediaPipe Face Mesh and shifts the 3D camera accordingly, creating an asymmetric perspective illusion
- **Day/Night Cycle** — Custom GLSL shader blends daytime surface with night city lights based on your actual system time
- **Multi-Monitor** — Earth on primary display, Saturn (with rings) on secondary. Both fade in together
- **Head Tracking Sync** — Face position from primary monitor is forwarded to secondary monitors via IPC
- **Smooth Interpolation** — Dual-threaded linear interpolation (lerp) smooths head movement for fluid motion
- **Clock Overlay** — Time, date, and detected location displayed with a liquid glass text effect
- **Procedural Starfield** — 8,000 stars as background across all monitors
- **Bloom Post-Processing** — UnrealBloomPass for subtle glow on bright areas

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 34 |
| 3D Rendering | Three.js 0.170 |
| Head Tracking | MediaPipe Face Mesh + TensorFlow.js |
| Shaders | Custom GLSL (day/night blend, specular oceans) |
| Post-Processing | UnrealBloomPass |
| Geolocation | Browser API + Nominatim OSM reverse geocoding |

## 📦 Installation

```bash
git clone https://github.com/marizmelo/Wallpaper.git
cd Wallpaper
npm install
```

## 🚀 Usage

```bash
npm start
```

- The app launches in **fullscreen** on all monitors
- **Move your head** in front of the webcam to see the parallax effect
- Press **ESC** to quit

## 📁 Project Structure

```
├── main.js                 # Electron main process, multi-monitor window management
├── preload.js              # IPC bridge (head data, ready sync, quit)
├── index.html              # Entry point, clock overlay, external script imports
├── src/
│   ├── app.js              # Main app — phased loading, render loop, clock
│   ├── earth.js            # Earth mesh + custom day/night GLSL shader
│   ├── saturn.js           # Saturn mesh + procedural ring UVs
│   ├── camera.js           # Holographic orbital camera (±15° parallax)
│   ├── tracker.js          # Webcam face detection → head position
│   ├── smoother.js         # Exponential smoothing for head movement
│   ├── stars.js            # Procedural starfield (8k points)
│   ├── sun.js              # Time-based sun direction
│   └── postprocessing.js   # Bloom compositor
└── assets/textures/        # Earth (day, night, specular, clouds) + Saturn
```

## 🔧 How It Works

### Head Tracking Pipeline

```
Webcam → MediaPipe Face Mesh → Bounding Box → Normalize to [-1, 1]
  → Exponential Smoothing (lerp 0.08) → Orbital Camera Position
```

### Day/Night Shader

The Earth uses a custom fragment shader that:
1. Computes `dot(normal, sunDirection)` per pixel
2. Uses `smoothstep(-0.15, 0.3, NdotL)` for a soft terminator
3. Blends daytime texture with boosted night city lights
4. Adds specular highlights on oceans using a specular map
5. Sun direction rotates based on system clock — noon lights the front face, midnight lights the back

### Multi-Monitor Sync

1. Each window loads its planet textures asynchronously
2. Signals `window-ready` to the main process
3. Main process waits for **all** windows, then broadcasts `all-ready`
4. All planets fade in simultaneously (~1.25s)
5. Head tracking data is forwarded from primary → secondary windows at ~20fps

## 📄 License

MIT
