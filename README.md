# 🎙️ Convertidor & Grabador de Audio CRM (.OGG / .MP3 / .WAV)

Aplicación Web Progresiva (**PWA**) diseñada para dispositivos móviles (Android / iOS) y computadoras, pensada para **grabar notas de voz**, **recortar/editar audio visualmente** y **convertir a formato .OGG (Opus), .MP3 o .WAV** optimizado para sistemas CRM (HubSpot, Kommo/AmoCRM, Zoho, Bitrix24, WhatsApp, etc.).

---

## ✨ Características Principales

- **🎙️ Grabación Directa**: Micrófono táctil de alta fidelidad con visualizador de ondas y temporizador.
- **📁 Soporta Cualquier Formato**: Importa archivos `.mp3`, `.m4a`, `.aac`, `.wav`, `.ogg`, `.opus`, llamadas grabadas y notas de voz.
- **✂️ Recorte Visual (Waveform)**: Forma de onda interactiva con pines de inicio y fin para recortar silencios con precisión.
- **⚡ Preset OGG para CRM**: Codifica en `.ogg` (Opus Voice) para que el CRM lo reconozca nativamente como nota de voz con barra de reproducción.
- **🔊 Voz Nítida**: Normaliza automáticamente el volumen para que audios grabados a distancia se escuchen claros y fuertes.
- **📥 Guardado Directo en el Teléfono**: Descarga instantánea en la carpeta de descargas de tu móvil con un solo toque.
- **🔒 100% Local y Privado**: Todo el procesamiento se realiza en el navegador usando WebAssembly, sin enviar tus audios a servidores externos.

---

## 🚀 Instalación y Desarrollo Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/kaliman12345678/CONVERTIDOR-DE-AUDIO-.git

# 2. Entrar a la carpeta
cd CONVERTIDOR-DE-AUDIO-

# 3. Instalar dependencias
npm install

# 4. Iniciar servidor local
npm run dev -- --host
```

---

## 🛠️ Tecnologías

- **React 18 + Vite + TypeScript**
- **Tailwind CSS v4**
- **Wavesurfer.js** (Visualizador y recorte de audio)
- **Opus WebAssembly Worker** (Codificación nativa .OGG)
- **LAME JS** (Codificación .MP3)
