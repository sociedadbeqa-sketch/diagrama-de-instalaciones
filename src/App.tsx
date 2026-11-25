// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, RotateCcw, Plus, Trash2, Download, Upload,
  Sun, Moon, Filter, FileText, Image as ImageIcon, CheckCircle2, AlertTriangle,
  Wrench, Zap, Camera, Radio, Cpu, Compass, Sliders, Edit3, Save, Copy,
  Magnet, Eye, EyeOff, Info, Layers, Grid, ArrowRightLeft, Building2, Printer,
  Expand, Minimize, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  MonitorPlay, X,
  Cloud, FolderOpen, CloudUpload, RefreshCw
} from 'lucide-react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';

// ============================================================================
// CONFIGURACIÓN DE FIREBASE (PROYECTO INDEPENDIENTE: diagrama-centro-engorda)
// ============================================================================
const BEQA_FIREBASE_CONFIG = {
  apiKey: "AIzaSyD7G4jZt8U9e2zyfg6MqYDRBAZSoPld2FM",
  authDomain: "diagrama-centro-engorda.firebaseapp.com",
  projectId: "diagrama-centro-engorda",
  storageBucket: "diagrama-centro-engorda.firebasestorage.app",
  messagingSenderId: "659070110505",
  appId: "1:659070110505:web:d802604e29abf55cad8538"
};

const getFirebaseConfig = () => {
  try {
    if (typeof __firebase_config !== 'undefined' && __firebase_config) {
      return JSON.parse(__firebase_config);
    }
  } catch (e) {}
  try {
    const metaEnv = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {};
    if (metaEnv.VITE_FIREBASE_API_KEY) {
      return {
        apiKey: metaEnv.VITE_FIREBASE_API_KEY,
        authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: metaEnv.VITE_FIREBASE_PROJECT_ID,
        storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: metaEnv.VITE_FIREBASE_APP_ID,
      };
    }
  } catch (e) {}
  return BEQA_FIREBASE_CONFIG;
};

const firebaseConfig = getFirebaseConfig();
const firebaseApp = firebaseConfig
  ? (getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0])
  : null;
const auth = firebaseApp ? getAuth(firebaseApp) : null;
const db = firebaseApp ? getFirestore(firebaseApp) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'plano-centro-engorda-beqa';

// ============================================================================
// MODELO DE DATOS INICIAL: CENTRO DE ENGORDA DE SALMONES (MÓDULOS 200 Y 100)
// ============================================================================

const INITIAL_MODULES = [
  {
    id: 'MOD-200',
    name: 'MÓDULO 200',
    subtitle: 'Tren Norte - 12 Jaulas de Engorda (201 - 212)',
    originX: 120,
    originY: 160,
    rows: 2,
    cols: 6,
    cageSize: 112,
    walkwayWidth: 16,
    startNumber: 201,
  },
  {
    id: 'MOD-100',
    name: 'MÓDULO 100',
    subtitle: 'Tren Sur - 10 Jaulas de Engorda (101 - 110)',
    originX: 1120,
    originY: 160,
    rows: 2,
    cols: 5,
    cageSize: 112,
    walkwayWidth: 16,
    startNumber: 101,
  },
];

const generateInitialCages = () => {
  const cages = [];
  const speciesList = ['Salmón del Atlántico (Salmo salar)', 'Salmón Coho (Oncorhynchus kisutch)'];
  INITIAL_MODULES.forEach((mod, mIdx) => {
    let counter = mod.startNumber;
    for (let r = 0; r < mod.rows; r++) {
      for (let c = 0; c < mod.cols; c++) {
        const num = counter++;
        const x = mod.originX + c * (mod.cageSize + mod.walkwayWidth);
        const y = mod.originY + r * (mod.cageSize + mod.walkwayWidth);
        cages.push({
          id: `JAULA-${num}`,
          number: num,
          moduleId: mod.id,
          row: r,
          col: c,
          x,
          y,
          size: mod.cageSize,
          dimensions: '30m x 30m',
          depth: '22m',
          species: speciesList[mIdx % 2],
          biomassTons: Number((145 + ((num * 7) % 55)).toFixed(1)),
          photoperiodActive: num % 3 !== 0,
          targetLux: 180,
          notes: `Jaula ${num} - Red lobera y pecera inspeccionada. Sistema de fotoperiodo sumergible.`,
        });
      }
    }
  });
  return cages;
};

const INITIAL_OBJECTS = [
  {
    id: 'OBJ-01',
    tag: 'TAB-200-A',
    type: 'tablero',
    icon: 'zap',
    phase: 'fotoperiodo',
    power: 1200,
    rotation: 0,
    spec: 'Tablero Distribución Fotoperiodo IP66 400V / 3F',
    status: 'operativo',
    x: 112,
    y: 280,
    moduleId: 'MOD-200',
    locationLabel: 'Cabecera Oeste Módulo 200',
    description: 'Tablero principal de control automático y protecciones diferenciales para luminarias de fotoperiodo Módulo 200.',
    lastInspection: '2026-10-12',
  },
  {
    id: 'OBJ-02',
    tag: 'PROY-201',
    type: 'luminaria',
    icon: 'sun',
    phase: 'fotoperiodo',
    power: 1000,
    rotation: 180,
    spec: 'Proyector LED Fotoperiodo Sumergible 1000W 5000K',
    status: 'operativo',
    x: 176,
    y: 280,
    moduleId: 'MOD-200',
    locationLabel: 'Pasillo Central Jaula 201',
    description: 'Unidad luminaria sumergida a 6m de profundidad para inhibición de maduración sexual temprana.',
    lastInspection: '2026-10-18',
  },
  {
    id: 'OBJ-03',
    tag: 'PROY-203',
    type: 'luminaria',
    icon: 'sun',
    phase: 'fotoperiodo',
    power: 1000,
    rotation: 180,
    spec: 'Proyector LED Fotoperiodo Sumergible 1000W 5000K',
    status: 'operativo',
    x: 432,
    y: 280,
    moduleId: 'MOD-200',
    locationLabel: 'Pasillo Central Jaula 203',
    description: 'Luminaria de fotoperiodo con lastre marino y cable umbilical reforzado.',
    lastInspection: '2026-10-18',
  },
  {
    id: 'OBJ-04',
    tag: 'PROY-205',
    type: 'luminaria',
    icon: 'sun',
    phase: 'fotoperiodo',
    power: 1000,
    rotation: 180,
    spec: 'Proyector LED Fotoperiodo Sumergible 1000W',
    status: 'mantencion',
    x: 688,
    y: 280,
    moduleId: 'MOD-200',
    locationLabel: 'Pasillo Central Jaula 205',
    description: 'Programada limpieza de fouling marino en difusor óptico y revisión de prensaestopa.',
    lastInspection: '2026-09-29',
  },
  {
    id: 'OBJ-05',
    tag: 'ERG-200',
    type: 'energizador',
    icon: 'radio',
    phase: 'control',
    power: 450,
    rotation: 0,
    spec: 'Unidad Energizadora Cerco Lobero / Telemetría',
    status: 'operativo',
    x: 504,
    y: 152,
    moduleId: 'MOD-200',
    locationLabel: 'Pasillo Norte Módulo 200',
    description: 'Energizador perimetral de defensa contra lobos marinos y enlace inalámbrico a pontón.',
    lastInspection: '2026-10-20',
  },
  {
    id: 'OBJ-06',
    tag: 'SEN-O2-204',
    type: 'sensor',
    icon: 'cpu',
    phase: 'monitoreo',
    power: 60,
    rotation: 0,
    spec: 'Sonda Multiparámetro Oxígeno Disuelto / Temp / Salinidad',
    status: 'operativo',
    x: 560,
    y: 280,
    moduleId: 'MOD-200',
    locationLabel: 'Intersección Jaulas 204-210',
    description: 'Monitoreo continuo de saturación de O2 y temperatura en columna de agua (5m y 12m).',
    lastInspection: '2026-10-22',
  },
  {
    id: 'OBJ-07',
    tag: 'CAM-206',
    type: 'camara',
    icon: 'camera',
    phase: 'monitoreo',
    power: 85,
    rotation: 0,
    spec: 'Cámara Submarina Detección Pellets + Superficie PTZ',
    status: 'operativo',
    x: 816,
    y: 280,
    moduleId: 'MOD-200',
    locationLabel: 'Pasillo Central Jaula 206',
    description: 'Control visual de saciedad durante alimentación automática y vigilancia perimetral.',
    lastInspection: '2026-10-15',
  },
  {
    id: 'OBJ-08',
    tag: 'TAB-100-A',
    type: 'tablero',
    icon: 'zap',
    phase: 'fotoperiodo',
    power: 1200,
    rotation: 0,
    spec: 'Tablero Distribución Fotoperiodo IP66 Módulo 100',
    status: 'operativo',
    x: 1112,
    y: 280,
    moduleId: 'MOD-100',
    locationLabel: 'Cabecera Oeste Módulo 100',
    description: 'Tablero de fuerza y control astronómico para encendido escalonado Módulo 100.',
    lastInspection: '2026-10-14',
  },
  {
    id: 'OBJ-09',
    tag: 'PROY-102',
    type: 'luminaria',
    icon: 'sun',
    phase: 'fotoperiodo',
    power: 1000,
    rotation: 180,
    spec: 'Proyector LED Fotoperiodo Sumergible 1000W',
    status: 'operativo',
    x: 1304,
    y: 280,
    moduleId: 'MOD-100',
    locationLabel: 'Pasillo Central Jaula 102',
    description: 'Luminaria sumergible operativa con respaldo automático desde grupo electrógeno pontón.',
    lastInspection: '2026-10-19',
  },
  {
    id: 'OBJ-10',
    tag: 'PROY-104',
    type: 'luminaria',
    icon: 'sun',
    phase: 'fotoperiodo',
    power: 1000,
    rotation: 180,
    spec: 'Proyector LED Fotoperiodo Sumergible 1000W',
    status: 'falla',
    x: 1560,
    y: 280,
    moduleId: 'MOD-100',
    locationLabel: 'Pasillo Central Jaula 104',
    description: 'Alerta de aislamiento en circuito L2. Requiere reemplazo de conector subacuático.',
    lastInspection: '2026-10-24',
  },
  {
    id: 'OBJ-11',
    tag: 'SEN-O2-103',
    type: 'sensor',
    icon: 'cpu',
    phase: 'monitoreo',
    power: 60,
    rotation: 0,
    spec: 'Estación Oceanográfica & Correntómetro Doppler',
    status: 'operativo',
    x: 1432,
    y: 280,
    moduleId: 'MOD-100',
    locationLabel: 'Pasillo Central Jaula 103',
    description: 'Registro de velocidad de corriente y oxigenación en tren sur.',
    lastInspection: '2026-10-21',
  },
  {
    id: 'OBJ-12',
    tag: 'ALI-105',
    type: 'alimentador',
    icon: 'compass',
    phase: 'alimentacion',
    power: 350,
    rotation: 0,
    spec: 'Selector Rotatorio & Esparcidor Neumático',
    status: 'operativo',
    x: 1688,
    y: 280,
    moduleId: 'MOD-100',
    locationLabel: 'Pasillo Central Jaula 105',
    description: 'Válvula neumática de distribución de alimento con sensor de flujo.',
    lastInspection: '2026-10-17',
  },
  {
    id: 'OBJ-13',
    tag: 'ENCH-200-01',
    type: 'enchufe_220v',
    icon: 'plug',
    phase: 'fuerza_aux',
    power: 3520,
    rotation: 0,
    amperage: '16A',
    ipGrade: 'IP67',
    spec: 'Toma Industrial CEE 220V 16A 2P+T IP67',
    status: 'operativo',
    x: 240,
    y: 280,
    moduleId: 'MOD-200',
    locationLabel: 'Pasillo Central Jaula 201-202',
    description: 'Enchufe hembra industrial 220V monofásico estanco para herramientas, hidrolavadora y bombas auxiliares.',
    lastInspection: '2026-10-20',
  },
  {
    id: 'OBJ-14',
    tag: 'FC-200-N',
    type: 'fotocelda',
    icon: 'eye',
    phase: 'fotoperiodo',
    power: 15,
    rotation: 0,
    luxThreshold: '15 Lux',
    controlledCircuit: 'Contactor Fotoperiodo Módulo 200',
    spec: 'Fotocelda Crepuscular 220V IP65 (15 Lux)',
    status: 'operativo',
    x: 112,
    y: 168,
    moduleId: 'MOD-200',
    locationLabel: 'Mástil Cabecera Módulo 200',
    description: 'Sensor crepuscular automático para encendido/apagado de luminarias de fotoperiodo por nivel de luz natural.',
    lastInspection: '2026-10-20',
  },
  {
    id: 'OBJ-15',
    tag: 'ENCH-100-01',
    type: 'enchufe_220v',
    icon: 'plug',
    phase: 'fuerza_aux',
    power: 3520,
    rotation: 0,
    amperage: '16A',
    ipGrade: 'IP67',
    spec: 'Toma Industrial CEE 220V 16A 2P+T IP67',
    status: 'operativo',
    x: 1240,
    y: 280,
    moduleId: 'MOD-100',
    locationLabel: 'Pasillo Central Jaula 101-102',
    description: 'Toma industrial 220V con protección diferencial 30mA en pasillo Módulo 100.',
    lastInspection: '2026-10-21',
  },
  {
    id: 'OBJ-16',
    tag: 'FC-100-N',
    type: 'fotocelda',
    icon: 'eye',
    phase: 'fotoperiodo',
    power: 15,
    rotation: 0,
    luxThreshold: '15 Lux',
    controlledCircuit: 'Contactor Fotoperiodo Módulo 100',
    spec: 'Fotocelda Crepuscular 220V IP65 (15 Lux)',
    status: 'operativo',
    x: 1112,
    y: 168,
    moduleId: 'MOD-100',
    locationLabel: 'Mástil Cabecera Módulo 100',
    description: 'Sensor crepuscular automático para encendido de proyectores sumergibles Módulo 100.',
    lastInspection: '2026-10-21',
  },
];

const INITIAL_COMPANY_INFO = {
  companyName: 'SERVICIOS BEQA SPA',
  centerName: 'Centro de Engorda de Salmones · Módulos 200 y 100',
  code: 'SIEP-2026-01',
  responsibleName: 'Ing. Carlos Mendoza R.',
  responsibleRole: 'Jefe de Mantención Eléctrica & Fotoperiodo',
  responsibleLicense: 'SEC Clase A · Reg. 18.492',
  logoDataUrl: null,
  signatureDataUrl: null,
};

const PHASE_CONFIG = {
  fotoperiodo: { label: 'Fotoperiodo LED', color: '#f59e0b', badgeBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  fuerza_aux: { label: 'Fuerza 220V Auxiliar', color: '#2563eb', badgeBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  control: { label: 'Fuerza y Control', color: '#ef4444', badgeBg: 'bg-rose-500/15 text-rose-400 border-rose-500/30' },
  monitoreo: { label: 'Sensores / Cámaras', color: '#06b6d4', badgeBg: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  alimentacion: { label: 'Alimentación', color: '#10b981', badgeBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
};

const STATUS_CONFIG = {
  operativo: { label: 'Operativo', color: '#10b981', dot: 'bg-emerald-500' },
  mantencion: { label: 'En Mantención', color: '#f59e0b', dot: 'bg-amber-500' },
  falla: { label: 'Falla / Alerta', color: '#ef4444', dot: 'bg-rose-500' },
};

const SYMBOL_CATALOG = [
  { type: 'luminaria', label: 'Luminaria Fotoperiodo', icon: 'sun', phase: 'fotoperiodo', power: 1000, rotation: 180 },
  { type: 'enchufe_220v', label: 'Enchufe Industrial 220V', icon: 'plug', phase: 'fuerza_aux', power: 3520, rotation: 0, amperage: '16A', ipGrade: 'IP67' },
  { type: 'fotocelda', label: 'Fotocelda Crepuscular', icon: 'eye', phase: 'fotoperiodo', power: 15, rotation: 0, luxThreshold: '15 Lux', controlledCircuit: 'Contactor Fotoperiodo' },
  { type: 'tablero', label: 'Tablero Eléctrico IP66', icon: 'zap', phase: 'control', power: 1200, rotation: 0 },
  { type: 'energizador', label: 'Energizador / Telemetría', icon: 'radio', phase: 'control', power: 450, rotation: 0 },
  { type: 'sensor', label: 'Sensor Oxígeno / Sonda', icon: 'cpu', phase: 'monitoreo', power: 60, rotation: 0 },
  { type: 'camara', label: 'Cámara Submarina / PTZ', icon: 'camera', phase: 'monitoreo', power: 85, rotation: 0 },
  { type: 'alimentador', label: 'Selector Alimentación', icon: 'compass', phase: 'alimentacion', power: 350, rotation: 0 },
];

export default function App() {
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn-injected')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn-injected';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
    if (!document.getElementById('inter-font-injected')) {
      const link = document.createElement('link');
      link.id = 'inter-font-injected';
      link.rel = 'stylesheet';
      link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap';
      document.head.appendChild(link);
    }
    document.body.style.fontFamily = "'Inter', system-ui, -apple-system, sans-serif";
    document.body.style.margin = '0';
  }, []);

  const [darkMode, setDarkMode] = useState(false);
  const [modules, setModules] = useState(INITIAL_MODULES);
  const [cages, setCages] = useState(generateInitialCages);
  const [objects, setObjects] = useState(INITIAL_OBJECTS);
  const [companyInfo, setCompanyInfo] = useState(INITIAL_COMPANY_INFO);

  // Estado de vista del plano (Pan & Zoom)
  const [zoom, setZoom] = useState(0.88);
  const [pan, setPan] = useState({ x: 24, y: 18 });
  const [snapToWalkway, setSnapToWalkway] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Herramientas y selección
  const [activeTool, setActiveTool] = useState('select');
  const [placeTemplate, setPlaceTemplate] = useState(SYMBOL_CATALOG[0]);
  const [selectedId, setSelectedId] = useState('OBJ-02');
  const [selectedKind, setSelectedKind] = useState('object');

  // Filtros
  const [filterPhase, setFilterPhase] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modales y notificaciones
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [toast, setToast] = useState(null);

  // Estado de Firebase / Base de Datos en la Nube
  const [fbUser, setFbUser] = useState(null);
  const [cloudStatus, setCloudStatus] = useState(db ? 'connecting' : 'offline');
  const [savedBlueprints, setSavedBlueprints] = useState([]);
  const [currentBlueprintId, setCurrentBlueprintId] = useState('plano-principal-engorda');
  const [blueprintNameInput, setBlueprintNameInput] = useState('Plano Maestro Centro Engorda (Módulos 200 y 100)');
  const [isSavingCloud, setIsSavingCloud] = useState(false);

  // Visibilidad de paneles laterales, pantalla completa y vista previa
  const [showLeftSidebar, setShowLeftSidebar] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [showRightSidebar, setShowRightSidebar] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [autoHideRightPanel, setAutoHideRightPanel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Interacción de arrastre y soporte táctil (móvil / tablet)
  const [draggingObjId, setDraggingObjId] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredObj, setHoveredObj] = useState(null);
  const [clipboardObj, setClipboardObj] = useState(null);
  const pinchRef = useRef({ active: false, initialDist: 0, initialZoom: 0.88 });

  const svgRef = useRef(null);
  const logoInputRef = useRef(null);
  const signatureInputRef = useRef(null);
  const jsonInputRef = useRef(null);
  const appContainerRef = useRef(null);

  const notify = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3400);
  };

  // ============================================================================
  // CONEXIÓN AUTOMÁTICA A FIREBASE AUTH Y CLOUD FIRESTORE
  // ============================================================================
  useEffect(() => {
    if (!auth) {
      setCloudStatus('offline');
      return;
    }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Error autenticando con Firebase:', err);
        setCloudStatus('error');
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
      if (user) setCloudStatus('connected');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!db || !fbUser) return;
    const planosRef = collection(db, 'artifacts', appId, 'public', 'data', 'planos_centro_engorda');
    const unsub = onSnapshot(
      planosRef,
      (snapshot) => {
        const list = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        list.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        setSavedBlueprints(list);
        setCloudStatus('connected');
      },
      (error) => {
        console.error('Error escuchando planos en Firestore:', error);
        setCloudStatus('error');
      }
    );
    return () => unsub();
  }, [fbUser]);

  const handleSaveToCloud = async (customId = null, customTitle = null) => {
    if (!db || !fbUser) {
      notify('Base de datos en la nube no disponible en este entorno', 'warn');
      return;
    }
    setIsSavingCloud(true);
    try {
      const targetId = (customId || currentBlueprintId || `plano-${Date.now()}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-');
      const targetTitle = (customTitle || blueprintNameInput || 'Plano Centro de Engorda').trim();
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'planos_centro_engorda', targetId);

      const payload = {
        title: targetTitle,
        updatedAt: new Date().toISOString(),
        updatedBy: companyInfo.responsibleName || 'Usuario Técnico',
        companyName: companyInfo.companyName || 'SERVICIOS BEQA SPA',
        totalObjects: objects.length,
        totalCages: cages.length,
        modules,
        cages,
        objects,
        companyInfo,
      };

      await setDoc(docRef, payload);
      setCurrentBlueprintId(targetId);
      setBlueprintNameInput(targetTitle);
      notify(`Plano "${targetTitle}" guardado en la nube correctamente`, 'success');
    } catch (err) {
      console.error('Error guardando en Firestore:', err);
      notify('Error al guardar en la nube. Verifica permisos de Firestore.', 'warn');
    } finally {
      setIsSavingCloud(false);
    }
  };

  const handleLoadFromCloud = (bp) => {
    if (!bp) return;
    if (Array.isArray(bp.modules)) setModules(bp.modules);
    if (Array.isArray(bp.cages)) setCages(bp.cages);
    if (Array.isArray(bp.objects)) setObjects(bp.objects);
    if (bp.companyInfo) setCompanyInfo((prev) => ({ ...prev, ...bp.companyInfo }));
    setCurrentBlueprintId(bp.id);
    setBlueprintNameInput(bp.title || bp.id);
    setSelectedId(null);
    setSelectedKind(null);
    setShowCloudModal(false);
    notify(`Plano "${bp.title || bp.id}" cargado desde la nube`, 'success');
  };

  const handleDeleteFromCloud = async (bpId, bpTitle) => {
    if (!db || !fbUser) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'planos_centro_engorda', bpId));
      notify(`Plano "${bpTitle}" eliminado de la nube`, 'info');
    } catch (err) {
      console.error('Error eliminando plano:', err);
      notify('No se pudo eliminar el plano de la nube', 'warn');
    }
  };

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (appContainerRef.current?.requestFullscreen) {
          await appContainerRef.current.requestFullscreen();
        } else {
          setIsFullscreen(true);
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
      }
    } catch {
      setIsFullscreen((prev) => !prev);
    }
  };

  const selectedObject = useMemo(
    () => (selectedKind === 'object' ? objects.find((o) => o.id === selectedId) : null),
    [objects, selectedId, selectedKind]
  );

  const selectedCage = useMemo(
    () => (selectedKind === 'cage' ? cages.find((c) => c.id === selectedId) : null),
    [cages, selectedId, selectedKind]
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (selectedObject) {
          e.preventDefault();
          setClipboardObj({ ...selectedObject });
          notify(`Equipo "${selectedObject.tag}" copiado. Presiona Ctrl+V para duplicar`, 'info');
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboardObj) {
          e.preventDefault();
          duplicateObject(clipboardObj, 36, 36);
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedObject) {
          e.preventDefault();
          duplicateObject(selectedObject, 36, 36);
        }
      }

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedObject) {
        e.preventDefault();
        deleteObject(selectedObject.id);
      }

      if (e.key === 'Escape') {
        if (showPreviewModal) setShowPreviewModal(false);
        else if (isFullscreen) toggleFullscreen();
        else setSelectedId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, clipboardObj, objects, showPreviewModal, isFullscreen]);

  const walkwayLines = useMemo(() => {
    const xs = [];
    const ys = [];
    modules.forEach((mod) => {
      for (let c = 0; c <= mod.cols; c++) {
        xs.push(mod.originX + c * (mod.cageSize + mod.walkwayWidth) - mod.walkwayWidth / 2);
      }
      for (let r = 0; r <= mod.rows; r++) {
        ys.push(mod.originY + r * (mod.cageSize + mod.walkwayWidth) - mod.walkwayWidth / 2);
      }
    });
    return { xs, ys };
  }, [modules]);

  const applySnap = (rawX, rawY) => {
    if (!snapToWalkway) return { x: Math.round(rawX), y: Math.round(rawY) };
    const threshold = 22;
    let snappedX = rawX;
    let snappedY = rawY;

    let minDx = threshold;
    walkwayLines.xs.forEach((wx) => {
      const d = Math.abs(rawX - wx);
      if (d < minDx) {
        minDx = d;
        snappedX = wx;
      }
    });

    let minDy = threshold;
    walkwayLines.ys.forEach((wy) => {
      const d = Math.abs(rawY - wy);
      if (d < minDy) {
        minDy = d;
        snappedY = wy;
      }
    });

    return { x: Math.round(snappedX), y: Math.round(snappedY) };
  };

  const detectModuleId = (x) => (x < 980 ? 'MOD-200' : 'MOD-100');

  const clientToSvgCoords = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const duplicateObject = (sourceObj, offsetX = 32, offsetY = 32) => {
    if (!sourceObj) return;
    const newX = Math.round(sourceObj.x + offsetX);
    const newY = Math.round(sourceObj.y + offsetY);
    const modId = detectModuleId(newX);
    const count = objects.filter((o) => o.type === sourceObj.type).length + 1;

    const baseTag = sourceObj.tag.replace(/-\d+$/, '');
    const newTag = `${baseTag}-${String(count).padStart(2, '0')}`;

    const clonedObj = {
      ...sourceObj,
      id: `OBJ-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tag: newTag,
      x: newX,
      y: newY,
      moduleId: modId,
      locationLabel: `${sourceObj.locationLabel} (Copia)`,
    };

    setObjects((prev) => [...prev, clonedObj]);
    setSelectedId(clonedObj.id);
    setSelectedKind('object');
    setShowRightSidebar(true);
    notify(`Elemento duplicado como "${clonedObj.tag}"`, 'success');
  };

  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0) return;
    const coords = clientToSvgCoords(e.clientX, e.clientY);

    if (activeTool === 'place') {
      const snapped = applySnap(coords.x, coords.y);
      const modId = detectModuleId(snapped.x);
      const modShort = modId === 'MOD-200' ? '200' : '100';
      const prefixMap = {
        luminaria: 'PROY',
        enchufe_220v: 'ENCH',
        fotocelda: 'FC',
        tablero: 'TAB',
        energizador: 'ERG',
        sensor: 'SEN',
        camara: 'CAM',
        alimentador: 'ALI',
      };
      const prefix = prefixMap[placeTemplate.type] || placeTemplate.type.slice(0, 3).toUpperCase();
      const count = objects.filter((o) => o.type === placeTemplate.type).length + 1;
      const defaultSpec =
        placeTemplate.type === 'enchufe_220v'
          ? `Toma Industrial CEE 220V ${placeTemplate.amperage || '16A'} 2P+T ${placeTemplate.ipGrade || 'IP67'}`
          : placeTemplate.type === 'fotocelda'
          ? `Fotocelda Crepuscular ${placeTemplate.luxThreshold || '15 Lux'} (${placeTemplate.controlledCircuit || `Módulo ${modShort}`})`
          : `${placeTemplate.label} (${placeTemplate.power}W)`;

      const newObj = {
        id: `OBJ-${Date.now()}`,
        tag: `${prefix}-${modShort}-${String(count).padStart(2, '0')}`,
        type: placeTemplate.type,
        icon: placeTemplate.icon,
        phase: placeTemplate.phase,
        power: placeTemplate.power,
        rotation: placeTemplate.rotation ?? 180,
        amperage: placeTemplate.amperage || '16A',
        ipGrade: placeTemplate.ipGrade || 'IP67',
        luxThreshold: placeTemplate.luxThreshold || '15 Lux',
        controlledCircuit: placeTemplate.controlledCircuit || `Contactor Módulo ${modShort}`,
        spec: defaultSpec,
        status: 'operativo',
        x: snapped.x,
        y: snapped.y,
        moduleId: modId,
        locationLabel: `Pasillo ${modId === 'MOD-200' ? 'Módulo 200' : 'Módulo 100'}`,
        description: `${defaultSpec} incorporado en pasillo del ${modId === 'MOD-200' ? 'Módulo 200' : 'Módulo 100'}.`,
        lastInspection: new Date().toISOString().slice(0, 10),
      };
      setObjects((prev) => [...prev, newObj]);
      setSelectedId(newObj.id);
      setSelectedKind('object');
      setShowRightSidebar(true);
      setActiveTool('select');
      notify(`Equipo "${newObj.tag}" añadido al plano`, 'success');
      return;
    }

    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setSelectedId(null);
    setSelectedKind(null);
    if (autoHideRightPanel) {
      setShowRightSidebar(false);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (draggingObjId) {
      const coords = clientToSvgCoords(e.clientX, e.clientY);
      const snapped = applySnap(coords.x, coords.y);
      const modId = detectModuleId(snapped.x);
      setObjects((prev) =>
        prev.map((obj) =>
          obj.id === draggingObjId
            ? { ...obj, x: snapped.x, y: snapped.y, moduleId: modId }
            : obj
        )
      );
      return;
    }

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setDraggingObjId(null);
    setIsPanning(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(2.5, Math.max(0.4, Number((z * factor).toFixed(2)))));
  };

  // Soporte táctil completo para celulares y tablets (arrastrar equipos, mover plano y pellizcar zoom)
  const handleCanvasTouchStart = (e) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      pinchRef.current = { active: true, initialDist: dist, initialZoom: zoom };
      setIsPanning(false);
      setDraggingObjId(null);
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const coords = clientToSvgCoords(touch.clientX, touch.clientY);

      if (activeTool === 'place') {
        const snapped = applySnap(coords.x, coords.y);
        const modId = detectModuleId(snapped.x);
        const modShort = modId === 'MOD-200' ? '200' : '100';
        const prefixMap = {
          luminaria: 'PROY',
          enchufe_220v: 'ENCH',
          fotocelda: 'FC',
          tablero: 'TAB',
          energizador: 'ERG',
          sensor: 'SEN',
          camara: 'CAM',
          alimentador: 'ALI',
        };
        const prefix = prefixMap[placeTemplate.type] || placeTemplate.type.slice(0, 3).toUpperCase();
        const count = objects.filter((o) => o.type === placeTemplate.type).length + 1;
        const defaultSpec =
          placeTemplate.type === 'enchufe_220v'
            ? `Toma Industrial CEE 220V ${placeTemplate.amperage || '16A'} 2P+T ${placeTemplate.ipGrade || 'IP67'}`
            : placeTemplate.type === 'fotocelda'
            ? `Fotocelda Crepuscular ${placeTemplate.luxThreshold || '15 Lux'} (${placeTemplate.controlledCircuit || `Módulo ${modShort}`})`
            : `${placeTemplate.label} (${placeTemplate.power}W)`;

        const newObj = {
          id: `OBJ-${Date.now()}`,
          tag: `${prefix}-${modShort}-${String(count).padStart(2, '0')}`,
          type: placeTemplate.type,
          icon: placeTemplate.icon,
          phase: placeTemplate.phase,
          power: placeTemplate.power,
          rotation: placeTemplate.rotation ?? 180,
          amperage: placeTemplate.amperage || '16A',
          ipGrade: placeTemplate.ipGrade || 'IP67',
          luxThreshold: placeTemplate.luxThreshold || '15 Lux',
          controlledCircuit: placeTemplate.controlledCircuit || `Contactor Módulo ${modShort}`,
          spec: defaultSpec,
          status: 'operativo',
          x: snapped.x,
          y: snapped.y,
          moduleId: modId,
          locationLabel: `Pasillo ${modId === 'MOD-200' ? 'Módulo 200' : 'Módulo 100'}`,
          description: `${defaultSpec} incorporado en pasillo del ${modId === 'MOD-200' ? 'Módulo 200' : 'Módulo 100'}.`,
          lastInspection: new Date().toISOString().slice(0, 10),
        };
        setObjects((prev) => [...prev, newObj]);
        setSelectedId(newObj.id);
        setSelectedKind('object');
        setShowRightSidebar(true);
        setActiveTool('select');
        notify(`Equipo "${newObj.tag}" añadido al plano`, 'success');
        return;
      }

      setIsPanning(true);
      setPanStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      setSelectedId(null);
      setSelectedKind(null);
      if (autoHideRightPanel) {
        setShowRightSidebar(false);
      }
    }
  };

  const handleCanvasTouchMove = (e) => {
    if (e.touches.length === 2 && pinchRef.current.active) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const scaleRatio = dist / (pinchRef.current.initialDist || 1);
      const nextZoom = Math.min(2.5, Math.max(0.35, Number((pinchRef.current.initialZoom * scaleRatio).toFixed(2))));
      setZoom(nextZoom);
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (draggingObjId) {
        e.preventDefault();
        const coords = clientToSvgCoords(touch.clientX, touch.clientY);
        const snapped = applySnap(coords.x, coords.y);
        const modId = detectModuleId(snapped.x);
        setObjects((prev) =>
          prev.map((obj) =>
            obj.id === draggingObjId
              ? { ...obj, x: snapped.x, y: snapped.y, moduleId: modId }
              : obj
          )
        );
        return;
      }

      if (isPanning) {
        setPan({
          x: touch.clientX - panStart.x,
          y: touch.clientY - panStart.y,
        });
      }
    }
  };

  const handleCanvasTouchEnd = () => {
    pinchRef.current.active = false;
    setDraggingObjId(null);
    setIsPanning(false);
  };

  const updateSelectedObject = (field, value) => {
    if (!selectedObject) return;
    setObjects((prev) =>
      prev.map((obj) => (obj.id === selectedObject.id ? { ...obj, [field]: value } : obj))
    );
  };

  const updateSelectedCage = (field, value) => {
    if (!selectedCage) return;
    setCages((prev) =>
      prev.map((c) => (c.id === selectedCage.id ? { ...c, [field]: value } : c))
    );
  };

  const deleteObject = (id) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedKind(null);
    }
    notify('Equipo eliminado del plano', 'warn');
  };

  const handleImageUpload = (e, targetField) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCompanyInfo((prev) => ({ ...prev, [targetField]: reader.result }));
      notify(
        targetField === 'logoDataUrl'
          ? 'Logotipo de empresa cargado'
          : 'Firma digital cargada para exportación PDF',
        'success'
      );
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleExportJSON = () => {
    const payload = {
      version: '2.4',
      exportedAt: new Date().toISOString(),
      companyInfo,
      modules,
      cages,
      objects,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plano_engorda_${companyInfo.code.toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('Plano guardado en formato JSON', 'success');
  };

  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (data.modules && data.cages && data.objects) {
          setModules(data.modules);
          setCages(data.cages);
          setObjects(data.objects);
          if (data.companyInfo) setCompanyInfo((prev) => ({ ...prev, ...data.companyInfo }));
          setSelectedId(null);
          notify('Plano cargado exitosamente desde JSON', 'success');
        } else {
          notify('Formato de archivo JSON inválido', 'warn');
        }
      } catch {
        notify('No se pudo leer el archivo JSON', 'warn');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const generateSvgStringForExport = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return null;

    const clone = svgEl.cloneNode(true);
    const exportWidth = 1860;
    const exportHeight = 680;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('viewBox', `0 0 ${exportWidth} ${exportHeight}`);
    clone.setAttribute('width', String(exportWidth));
    clone.setAttribute('height', String(exportHeight));

    const viewportG = clone.querySelector('#plan-viewport');
    if (viewportG) {
      viewportG.setAttribute('transform', 'translate(0, 0) scale(1)');
    }

    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '0');
    bgRect.setAttribute('y', '0');
    bgRect.setAttribute('width', String(exportWidth));
    bgRect.setAttribute('height', String(exportHeight));
    bgRect.setAttribute('fill', '#f0f9ff');
    clone.insertBefore(bgRect, clone.firstChild);

    return new XMLSerializer().serializeToString(clone);
  };

  const handleExportPNG = () => {
    const svgString = generateSvgStringForExport();
    if (!svgString) return;

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2400;
      canvas.height = 880;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `plano_centro_engorda_${companyInfo.code}.png`;
      a.click();
      notify('Imagen PNG de alta resolución descargada', 'success');
    };
    img.src = url;
  };

  const handleExportPDF = () => {
    const svgString = generateSvgStringForExport();
    if (!svgString) return;

    const totalWatts = objects.reduce((acc, o) => acc + (Number(o.power) || 0), 0);
    const activePhotoperiodCages = cages.filter((c) => c.photoperiodActive).length;
    const printWin = window.open('', '_blank', 'width=1200,height=850');
    if (!printWin) {
      notify('Permite ventanas emergentes para generar el PDF', 'warn');
      return;
    }

    const rowsHtml = objects
      .map(
        (o) => `
        <tr>
          <td style="font-weight:700;">${o.tag}</td>
          <td>${o.moduleId}</td>
          <td>${o.spec}</td>
          <td>${PHASE_CONFIG[o.phase]?.label || o.phase}</td>
          <td style="text-align:right;">${o.power} W</td>
          <td>${STATUS_CONFIG[o.status]?.label || o.status}</td>
        </tr>`
      )
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Plano Eléctrico y Fotoperiodo - ${companyInfo.companyName}</title>
        <style>
          @page { size: A3 landscape; margin: 12mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 0; padding: 0; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 14px; }
          .brand { display: flex; align-items: center; gap: 14px; }
          .brand img { max-height: 54px; max-width: 160px; object-fit: contain; }
          .title-block h1 { margin: 0; font-size: 18px; color: #0c4a6e; }
          .title-block p { margin: 2px 0 0; font-size: 12px; color: #475569; }
          .meta-box { text-align: right; font-size: 11px; color: #334155; background: #f1f5f9; padding: 8px 12px; border-radius: 6px; }
          .plan-frame { border: 1.5px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #f0f9ff; margin-bottom: 14px; }
          .plan-frame svg { width: 100%; height: auto; display: block; }
          .bottom-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; align-items: start; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
          th { background: #e0f2fe; color: #0c4a6e; font-weight: 700; }
          .sign-box { border: 1.5px solid #94a3b8; border-radius: 8px; padding: 12px; background: #f8fafc; text-align: center; }
          .sign-img { height: 64px; display: flex; align-items: center; justify-content: center; border-bottom: 1px dashed #64748b; margin-bottom: 8px; }
          .sign-img img { max-height: 58px; max-width: 200px; object-fit: contain; }
          .kpis { display: flex; gap: 10px; margin-bottom: 10px; font-size: 11px; }
          .kpi { background: #f1f5f9; padding: 6px 10px; border-radius: 6px; border-left: 3px solid #0284c7; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            ${companyInfo.logoDataUrl ? `<img src="${companyInfo.logoDataUrl}" alt="Logo" />` : ''}
            <div class="title-block">
              <h1>${companyInfo.companyName}</h1>
              <p>${companyInfo.centerName} · Plano Técnico de Fotoperiodo e Infraestructura Eléctrica</p>
            </div>
          </div>
          <div class="meta-box">
            <div><strong>Código Plano:</strong> ${companyInfo.code}</div>
            <div><strong>Fecha Emisión:</strong> ${new Date().toLocaleDateString('es-CL')}</div>
            <div><strong>Módulos:</strong> 200 (12 Jaulas) & 100 (10 Jaulas)</div>
          </div>
        </div>

        <div class="kpis">
          <div class="kpi"><strong>Total Jaulas:</strong> ${cages.length} unidades</div>
          <div class="kpi"><strong>Jaulas con Fotoperiodo Activo:</strong> ${activePhotoperiodCages} / ${cages.length}</div>
          <div class="kpi"><strong>Equipos Instalados:</strong> ${objects.length} unidades</div>
          <div class="kpi"><strong>Potencia Instalada Total:</strong> ${(totalWatts / 1000).toFixed(2)} kW</div>
        </div>

        <div class="plan-frame">
          ${svgString}
        </div>

        <div class="bottom-grid">
          <div>
            <table>
              <thead>
                <tr>
                  <th>TAG</th>
                  <th>Módulo</th>
                  <th>Especificación Técnica</th>
                  <th>Sistema</th>
                  <th style="text-align:right;">Potencia</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>
          </div>
          <div class="sign-box">
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px;">Aprobación y Firma Técnica</div>
            <div class="sign-img">
              ${companyInfo.signatureDataUrl ? `<img src="${companyInfo.signatureDataUrl}" alt="Firma" />` : '<span style="color:#94a3b8;font-style:italic;font-size:11px;">Firma Digital Responsable</span>'}
            </div>
            <div style="font-weight: 700; font-size: 13px;">${companyInfo.responsibleName}</div>
            <div style="font-size: 11px; color: #475569;">${companyInfo.responsibleRole}</div>
            <div style="font-size: 10px; color: #0284c7; font-weight: 600; margin-top: 2px;">${companyInfo.responsibleLicense}</div>
          </div>
        </div>
        <script>
          window.onload = function() { setTimeout(function() { window.print(); }, 350); };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  };

  const filteredObjectIds = useMemo(() => {
    const set = new Set();
    objects.forEach((obj) => {
      const matchPhase = filterPhase === 'all' || obj.phase === filterPhase;
      const matchStatus = filterStatus === 'all' || obj.status === filterStatus;
      const matchModule = filterModule === 'all' || obj.moduleId === filterModule;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery =
        !q ||
        obj.tag.toLowerCase().includes(q) ||
        obj.spec.toLowerCase().includes(q) ||
        obj.locationLabel.toLowerCase().includes(q);
      if (matchPhase && matchStatus && matchModule && matchQuery) {
        set.add(obj.id);
      }
    });
    return set;
  }, [objects, filterPhase, filterStatus, filterModule, searchQuery]);

  const stats = useMemo(() => {
    const totalPower = objects.reduce((s, o) => s + (Number(o.power) || 0), 0);
    const activeLights = objects.filter((o) => o.type === 'luminaria' && o.status === 'operativo').length;
    const alertsCount = objects.filter((o) => o.status !== 'operativo').length;
    const photoCages = cages.filter((c) => c.photoperiodActive).length;
    return { totalPower, activeLights, alertsCount, photoCages };
  }, [objects, cages]);

  const renderObjectSymbol = (obj) => {
    const isSelected = selectedId === obj.id && selectedKind === 'object';
    const isDimmed = !filteredObjectIds.has(obj.id);
    const phaseColor = PHASE_CONFIG[obj.phase]?.color || '#38bdf8';
    const statusColor = STATUS_CONFIG[obj.status]?.color || '#10b981';
    const rot = Number(obj.rotation) || 0;

    return (
      <g
        key={obj.id}
        transform={`translate(${obj.x}, ${obj.y})`}
        opacity={isDimmed ? 0.2 : 1}
        className="cursor-grab active:cursor-grabbing transition-opacity duration-150"
        onMouseDown={(e) => {
          e.stopPropagation();
          setSelectedId(obj.id);
          setSelectedKind('object');
          setShowRightSidebar(true);
          setDraggingObjId(obj.id);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
          setSelectedId(obj.id);
          setSelectedKind('object');
          setShowRightSidebar(true);
          setDraggingObjId(obj.id);
        }}
        onMouseEnter={() => setHoveredObj(obj)}
        onMouseLeave={() => setHoveredObj(null)}
      >
        {isSelected && (
          <circle
            r="23"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="4 3"
          />
        )}

        <circle
          r="15"
          fill={darkMode ? '#0f172a' : '#ffffff'}
          stroke={phaseColor}
          strokeWidth={isSelected ? '3' : '2.2'}
        />

        {obj.type === 'luminaria' && (
          <g transform={`rotate(${rot})`}>
            <polygon points="-14,-8 -28,-16 -28,16 -14,8" fill="#fef08a" opacity="0.45" />
            <line x1="-15" y1="0" x2="-26" y2="0" stroke="#f59e0b" strokeWidth="1.6" />
            <line x1="-14" y1="-5" x2="-24" y2="-11" stroke="#f59e0b" strokeWidth="1.4" />
            <line x1="-14" y1="5" x2="-24" y2="11" stroke="#f59e0b" strokeWidth="1.4" />
            <rect x="-8" y="-6" width="14" height="12" rx="2" fill="#f59e0b" stroke="#78350f" strokeWidth="1.2" />
            <rect x="-11" y="-5" width="3" height="10" rx="1" fill="#fef08a" />
            <circle cx="8" cy="0" r="2.2" fill={darkMode ? '#e2e8f0' : '#334155'} />
          </g>
        )}

        {obj.type === 'enchufe_220v' && (
          <g transform={`rotate(${rot})`}>
            <rect x="-8" y="-7" width="16" height="14" rx="3" fill="#2563eb" stroke="#1e3a8a" strokeWidth="1.3" />
            <circle cx="-3.5" cy="-1.5" r="1.6" fill="#ffffff" />
            <circle cx="3.5" cy="-1.5" r="1.6" fill="#ffffff" />
            <rect x="-1.5" y="2" width="3" height="3.2" rx="0.6" fill="#fde047" />
          </g>
        )}

        {obj.type === 'fotocelda' && (
          <g transform={`rotate(${rot})`}>
            <circle cx="0" cy="0" r="8.5" fill="#fef3c7" stroke="#d97706" strokeWidth="1.5" />
            <path d="M -6,0 Q 0,-5.5 6,0 Q 0,5.5 -6,0 Z" fill="#ffffff" stroke="#b45309" strokeWidth="1.3" />
            <circle cx="0" cy="0" r="2.4" fill="#d97706" />
            <line x1="0" y1="-8.5" x2="0" y2="-12" stroke="#f59e0b" strokeWidth="1.4" />
            <line x1="-5.5" y1="-6.5" x2="-8" y2="-9" stroke="#f59e0b" strokeWidth="1.3" />
            <line x1="5.5" y1="-6.5" x2="8" y2="-9" stroke="#f59e0b" strokeWidth="1.3" />
          </g>
        )}

        {obj.type === 'tablero' && (
          <g transform={`rotate(${rot})`}>
            <rect x="-7" y="-8" width="14" height="16" rx="2" fill="#ef4444" stroke="#7f1d1d" strokeWidth="1.2" />
            <polygon points="-1,-5 3,-1 0,-1 2,5 -3,1 0,1" fill="#ffffff" />
          </g>
        )}

        {obj.type === 'energizador' && (
          <g transform={`rotate(${rot})`}>
            <rect x="-7" y="-7" width="14" height="14" rx="2" fill="#dc2626" />
            <path d="M-4,0 L-1,-4 L2,4 L5,0" stroke="#fff" strokeWidth="1.8" fill="none" />
          </g>
        )}

        {obj.type === 'sensor' && (
          <g transform={`rotate(${rot})`}>
            <circle r="7" fill="#06b6d4" />
            <text x="0" y="3" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fff">
              O₂
            </text>
          </g>
        )}

        {obj.type === 'camara' && (
          <g transform={`rotate(${rot})`}>
            <rect x="-7" y="-5" width="11" height="10" rx="2" fill="#0891b2" />
            <polygon points="4,-3 9,-6 9,6 4,3" fill="#06b6d4" />
          </g>
        )}

        {obj.type === 'alimentador' && (
          <g transform={`rotate(${rot})`}>
            <polygon points="0,-8 8,6 -8,6" fill="#10b981" />
            <circle cy="2" r="2.2" fill="#fff" />
          </g>
        )}

        <circle
          cx="11"
          cy="-11"
          r="4.2"
          fill={statusColor}
          stroke={darkMode ? '#0f172a' : '#ffffff'}
          strokeWidth="1.5"
        />

        {showLabels && (
          <g transform="translate(0, 26)">
            <rect
              x="-34"
              y="-9"
              width="68"
              height="15"
              rx="4"
              fill={darkMode ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)'}
              stroke={isSelected ? '#0284c7' : darkMode ? '#334155' : '#cbd5e1'}
              strokeWidth="1"
            />
            <text
              x="0"
              y="1.5"
              textAnchor="middle"
              fontSize="8.5"
              fontWeight="700"
              fill={darkMode ? '#f1f5f9' : '#0f172a'}
            >
              {obj.tag}
            </text>
          </g>
        )}
      </g>
    );
  };

  return (
    <div
      ref={appContainerRef}
      className={`flex flex-col h-screen w-screen overflow-hidden select-none ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* BARRA SUPERIOR */}
      <header
        className={`flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b z-20 ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2.5">
          {!isFullscreen && (
            <button
              onClick={() => setShowLeftSidebar((v) => !v)}
              title={showLeftSidebar ? 'Ocultar panel de herramientas' : 'Mostrar panel de herramientas'}
              className={`p-2 rounded-lg border transition ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {showLeftSidebar ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => setShowCompanyModal(true)}
            title="Haz clic para subir logo y configurar empresa"
            className={`flex items-center justify-center h-10 px-2.5 rounded-lg border transition ${
              darkMode
                ? 'bg-slate-800 border-slate-700 hover:border-sky-500'
                : 'bg-slate-50 border-slate-200 hover:border-sky-400'
            }`}
          >
            {companyInfo.logoDataUrl ? (
              <img
                src={companyInfo.logoDataUrl}
                alt="Logo Empresa"
                className="h-8 max-w-[120px] object-contain"
              />
            ) : (
              <div className="flex items-center gap-1.5 text-sky-500 font-bold text-xs">
                <Building2 className="w-4 h-4" />
                <span>Tu Logo</span>
              </div>
            )}
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm md:text-base font-extrabold tracking-tight leading-tight">
                {companyInfo.companyName}
              </h1>
              <button
                onClick={() => setShowCompanyModal(true)}
                className="text-[11px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400 font-semibold hover:bg-sky-500/25 transition"
              >
                Configurar Empresa / Firma
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {companyInfo.centerName} · Resp: <strong>{companyInfo.responsibleName}</strong>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setSnapToWalkway(!snapToWalkway)}
            title="Activar/Desactivar imán magnético a los pasillos entre jaulas"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              snapToWalkway
                ? 'bg-sky-600 text-white border-sky-600'
                : darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Imán Pasillos</span>
          </button>

          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {showLabels ? <Eye className="w-3.5 h-3.5 text-sky-500" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Etiquetas</span>
          </button>

          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            <span>{darkMode ? 'Modo Claro' : 'Modo Oscuro'}</span>
          </button>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          <button
            onClick={() => setShowCloudModal(true)}
            title="Abrir gestor de planos guardados en la nube (Firebase)"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              cloudStatus === 'connected'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-300 hover:bg-amber-500/25'
                : darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-amber-500" />
            <span>Base de Datos</span>
            <span
              className={`w-2 h-2 rounded-full ${
                cloudStatus === 'connected'
                  ? 'bg-emerald-500'
                  : cloudStatus === 'connecting'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-rose-500'
              }`}
            />
          </button>

          <button
            onClick={() => handleSaveToCloud()}
            disabled={isSavingCloud || cloudStatus !== 'connected'}
            title="Guardar cambios directamente en Cloud Firestore"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 transition shadow-xs"
          >
            <CloudUpload className={`w-3.5 h-3.5 ${isSavingCloud ? 'animate-bounce' : ''}`} />
            <span>{isSavingCloud ? 'Guardando...' : 'Guardar en Nube'}</span>
          </button>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          <button
            onClick={() => setShowInventoryModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Inventario ({objects.length})</span>
          </button>

          <button
            onClick={handleExportPNG}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            title="Ver plano limpio en pantalla completa sin menús"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-700 text-white transition shadow-xs"
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span>Vista Previa</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Exportar PDF</span>
          </button>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          <button
            onClick={handleExportJSON}
            title="Guardar archivo de proyecto (.json)"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Guardar JSON</span>
          </button>

          <button
            onClick={() => jsonInputRef.current?.click()}
            title="Cargar proyecto guardado (.json)"
            className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Cargar</span>
          </button>
          <input ref={jsonInputRef} type="file" accept=".json" onChange={handleImportJSON} className="hidden" />

          <button
            onClick={() => {
              setObjects(INITIAL_OBJECTS);
              setCages(generateInitialCages());
              notify('Plano restablecido a valores iniciales');
            }}
            title="Restablecer plano inicial"
            className={`p-1.5 rounded-lg border ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-0.5" />

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Salir de pantalla completa (Esc)' : 'Expandir plano en pantalla completa'}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
              isFullscreen
                ? 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700'
                : darkMode
                ? 'bg-slate-800 border-slate-700 text-sky-400 hover:bg-slate-700'
                : 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100'
            }`}
          >
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Salir Pantalla Completa' : 'Pantalla Completa'}</span>
          </button>

          {!isFullscreen && (
            <button
              onClick={() => setShowRightSidebar((v) => !v)}
              title={showRightSidebar ? 'Ocultar panel de propiedades' : 'Mostrar panel de propiedades'}
              className={`p-2 rounded-lg border transition ${
                darkMode
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {showRightSidebar ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          )}
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL DE 3 COLUMNAS */}
      <div className="flex flex-1 overflow-hidden relative">
        {showLeftSidebar && !isFullscreen && (
        <aside
          className={`fixed md:static inset-y-0 left-0 z-30 w-72 flex-shrink-0 flex flex-col border-r overflow-y-auto shadow-2xl md:shadow-none ${
            darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className={`p-3.5 border-b ${darkMode ? 'border-slate-800 bg-slate-800/30' : 'border-slate-200 bg-slate-50/70'}`}>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-sky-500" />
                Identidad y Firma PDF
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCompanyModal(true)}
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400"
                >
                  Editar
                </button>
                <button
                  onClick={() => setShowLeftSidebar(false)}
                  title="Cerrar panel izquierdo"
                  className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => logoInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border border-dashed text-[11px] font-medium transition ${
                  darkMode
                    ? 'border-slate-700 hover:border-sky-500 bg-slate-800/60 text-slate-300'
                    : 'border-slate-300 hover:border-sky-500 bg-white text-slate-700'
                }`}
              >
                {companyInfo.logoDataUrl ? (
                  <img src={companyInfo.logoDataUrl} alt="Logo" className="h-7 object-contain mb-1" />
                ) : (
                  <Upload className="w-4 h-4 text-sky-500 mb-1" />
                )}
                <span>{companyInfo.logoDataUrl ? 'Cambiar Logo' : 'Insertar Logo'}</span>
              </button>

              <button
                onClick={() => signatureInputRef.current?.click()}
                className={`flex flex-col items-center justify-center p-2 rounded-lg border border-dashed text-[11px] font-medium transition ${
                  darkMode
                    ? 'border-slate-700 hover:border-emerald-500 bg-slate-800/60 text-slate-300'
                    : 'border-slate-300 hover:border-emerald-500 bg-white text-slate-700'
                }`}
              >
                {companyInfo.signatureDataUrl ? (
                  <img src={companyInfo.signatureDataUrl} alt="Firma" className="h-7 object-contain mb-1" />
                ) : (
                  <Edit3 className="w-4 h-4 text-emerald-500 mb-1" />
                )}
                <span>{companyInfo.signatureDataUrl ? 'Cambiar Firma' : 'Insertar Firma'}</span>
              </button>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'logoDataUrl')}
              className="hidden"
            />
            <input
              ref={signatureInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImageUpload(e, 'signatureDataUrl')}
              className="hidden"
            />
          </div>

          <div className="p-3.5 border-b border-slate-200 dark:border-slate-800">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-sky-500" />
              Paleta de Simbología
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2.5">
              Selecciona un elemento y haz clic o toca un pasillo del plano para insertarlo.
            </p>
            <div className="space-y-1.5">
              {SYMBOL_CATALOG.map((item) => {
                const isPlacingThis = activeTool === 'place' && placeTemplate.type === item.type;
                const phaseCol = PHASE_CONFIG[item.phase]?.color || '#38bdf8';
                return (
                  <button
                    key={item.type}
                    onClick={() => {
                      if (isPlacingThis) {
                        setActiveTool('select');
                      } else {
                        setPlaceTemplate(item);
                        setActiveTool('place');
                        notify(`Modo inserción: Haz clic en el plano para colocar "${item.label}"`);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border transition ${
                      isPlacingThis
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : darkMode
                        ? 'bg-slate-800/70 border-slate-700/80 hover:bg-slate-800 text-slate-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: isPlacingThis ? '#ffffff' : phaseCol }}
                      />
                      {item.label}
                    </span>
                    <span className={`text-[10px] ${isPlacingThis ? 'text-sky-100' : 'text-slate-400'}`}>
                      {item.power}W
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-3.5 space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-sky-500" />
              Filtros de Capas
            </h2>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Buscar TAG / Equipo</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ej. PROY-201, TAB, O2..."
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs border ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Módulo / Tren</label>
              <select
                value={filterModule}
                onChange={(e) => setFilterModule(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs border ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="all">Todos los Módulos (200 y 100)</option>
                <option value="MOD-200">Módulo 200 (12 Jaulas)</option>
                <option value="MOD-100">Módulo 100 (10 Jaulas)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Sistema / Circuito</label>
              <select
                value={filterPhase}
                onChange={(e) => setFilterPhase(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs border ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="all">Todos los Sistemas</option>
                {Object.entries(PHASE_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">Estado Operativo</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-lg text-xs border ${
                  darkMode ? 'bg-slate-800 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <option value="all">Todos los Estados</option>
                {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                  <option key={key} value={key}>
                    {val.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>
        )}

        {/* LIENZO CENTRAL INTERACTIVO (CANVAS SVG) */}
        <main
          className={`flex-1 relative overflow-hidden ${
            darkMode ? 'bg-[#071526]' : 'bg-[#e0f2fe]'
          }`}
        >
          {/* Barra flotante superior izquierda del canvas */}
          <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
            <div
              className={`flex items-center gap-3 px-3 py-1.5 rounded-xl border text-xs backdrop-blur-md ${
                darkMode
                  ? 'bg-slate-900/85 border-slate-700 text-slate-200'
                  : 'bg-white/90 border-slate-200/80 text-slate-800 shadow-xs'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-sky-500" />
                <strong>{cages.length}</strong> Jaulas
              </span>
              <span className="text-slate-400">|</span>
              <span className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <strong>{stats.photoCages}</strong> con Fotoperiodo
              </span>
              <span className="text-slate-400">|</span>
              <span className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-emerald-500" />
                <strong>{(stats.totalPower / 1000).toFixed(2)}</strong> kW
              </span>
              {stats.alertsCount > 0 && (
                <>
                  <span className="text-slate-400">|</span>
                  <span className="flex items-center gap-1 text-rose-500 font-bold">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {stats.alertsCount} Alerta(s)
                  </span>
                </>
              )}
            </div>

            {activeTool === 'place' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-md animate-pulse">
                <span>Haz clic o toca en el plano para ubicar: {placeTemplate.label}</span>
                <button
                  onClick={() => setActiveTool('select')}
                  className="underline text-sky-100 hover:text-white ml-1"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Controles flotantes de Zoom */}
          <div
            className={`absolute bottom-3 left-3 z-10 flex items-center gap-1 p-1 rounded-xl border backdrop-blur-md ${
              darkMode
                ? 'bg-slate-900/90 border-slate-700'
                : 'bg-white/90 border-slate-200 shadow-xs'
            }`}
          >
            <button
              onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.12).toFixed(2))))}
              className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800"
              title="Alejar"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 text-xs font-bold min-w-[48px] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.12).toFixed(2))))}
              className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800"
              title="Acercar"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setZoom(0.88);
                setPan({ x: 24, y: 18 });
              }}
              className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800"
              title="Encuadrar ambos módulos"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Leyenda de simbología flotante inferior */}
          <div
            className={`hidden sm:flex absolute bottom-3 right-3 z-10 flex-wrap items-center gap-3 px-3 py-1.5 rounded-xl border text-[11px] backdrop-blur-md ${
              darkMode
                ? 'bg-slate-900/90 border-slate-700 text-slate-300'
                : 'bg-white/90 border-slate-200 text-slate-700 shadow-xs'
            }`}
          >
            <span className="font-bold text-slate-500">Simbología:</span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Fotoperiodo LED / Fotocelda
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /> Enchufe 220V Aux.
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> Fuerza / Tableros
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" /> Sensores / Cámaras
            </span>
          </div>

          {/* SVG PRINCIPAL */}
          <svg
            ref={svgRef}
            className={`w-full h-full touch-none ${
              activeTool === 'place' ? 'cursor-crosshair' : isPanning ? 'cursor-grabbing' : 'cursor-default'
            }`}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onTouchStart={handleCanvasTouchStart}
            onTouchMove={handleCanvasTouchMove}
            onTouchEnd={handleCanvasTouchEnd}
            onWheel={handleWheel}
          >
            <defs>
              <pattern id="seaGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path
                  d="M 40 0 L 0 0 0 40"
                  fill="none"
                  stroke={darkMode ? 'rgba(56,189,248,0.08)' : 'rgba(2,132,199,0.12)'}
                  strokeWidth="1"
                />
              </pattern>

              <pattern id="walkwayGrating" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill={darkMode ? '#334155' : '#94a3b8'} />
                <path d="M 0 4 L 8 4 M 4 0 L 4 8" stroke={darkMode ? '#1e293b' : '#cbd5e1'} strokeWidth="0.8" />
              </pattern>

              <radialGradient id="photoperiodGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fde047" stopOpacity="0.45" />
                <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.16" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
            </defs>

            <g id="plan-viewport" transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              <rect x="-400" y="-300" width="3000" height="1600" fill="url(#seaGrid)" />

              {/* Rosa de los vientos */}
              <g transform="translate(65, 75)">
                <circle r="24" fill={darkMode ? '#0f172a' : '#ffffff'} stroke="#0284c7" strokeWidth="1.5" />
                <polygon points="0,-18 5,0 0,-4 -5,0" fill="#ef4444" />
                <polygon points="0,18 5,0 0,4 -5,0" fill="#64748b" />
                <text x="0" y="-27" textAnchor="middle" fontSize="10" fontWeight="800" fill="#0284c7">
                  N
                </text>
              </g>

              {/* Puente / Pasarela flotante de interconexión entre Módulo 200 y Módulo 100 */}
              <g>
                <line
                  x1="888"
                  y1="280"
                  x2="1112"
                  y2="280"
                  stroke="#0284c7"
                  strokeWidth="6"
                  strokeDasharray="10 6"
                  opacity="0.65"
                />
                <rect
                  x="930"
                  y="258"
                  width="140"
                  height="20"
                  rx="6"
                  fill={darkMode ? '#0f172a' : '#ffffff'}
                  stroke="#0284c7"
                  strokeWidth="1.2"
                />
                <text
                  x="1000"
                  y="271"
                  textAnchor="middle"
                  fontSize="9.5"
                  fontWeight="700"
                  fill={darkMode ? '#38bdf8' : '#0369a1'}
                >
                  Troncal Submarina 224m
                </text>
              </g>

              {/* RENDERIZADO DE MÓDULOS Y PASILLOS PERIMETRALES */}
              {modules.map((mod) => {
                const totalW = mod.cols * mod.cageSize + (mod.cols + 1) * mod.walkwayWidth;
                const totalH = mod.rows * mod.cageSize + (mod.rows + 1) * mod.walkwayWidth;
                const startX = mod.originX - mod.walkwayWidth;
                const startY = mod.originY - mod.walkwayWidth;

                return (
                  <g key={mod.id}>
                    <rect
                      x={startX}
                      y={startY}
                      width={totalW}
                      height={totalH}
                      rx="6"
                      fill="url(#walkwayGrating)"
                      stroke={darkMode ? '#64748b' : '#475569'}
                      strokeWidth="2.5"
                    />

                    <g transform={`translate(${startX}, ${startY - 56})`}>
                      <rect
                        x="0"
                        y="0"
                        width="320"
                        height="42"
                        rx="8"
                        fill={darkMode ? '#0f172a' : '#0c4a6e'}
                        stroke="#0284c7"
                        strokeWidth="1.5"
                      />
                      <text x="14" y="18" fontSize="14" fontWeight="800" fill="#ffffff">
                        {mod.name}
                      </text>
                      <text x="14" y="33" fontSize="10" fill="#bae6fd">
                        {mod.subtitle}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* RENDERIZADO DE JAULAS (30m x 30m) */}
              {cages.map((cage) => {
                const isSelected = selectedId === cage.id && selectedKind === 'cage';
                return (
                  <g
                    key={cage.id}
                    onMouseDown={(e) => {
                      if (activeTool === 'place') return;
                      e.stopPropagation();
                      setSelectedId(cage.id);
                      setSelectedKind('cage');
                      setShowRightSidebar(true);
                    }}
                    onTouchStart={(e) => {
                      if (activeTool === 'place') return;
                      e.stopPropagation();
                      setSelectedId(cage.id);
                      setSelectedKind('cage');
                      setShowRightSidebar(true);
                    }}
                    className="cursor-pointer group"
                  >
                    <rect
                      x={cage.x}
                      y={cage.y}
                      width={cage.size}
                      height={cage.size}
                      rx="4"
                      fill={darkMode ? '#082f49' : '#bae6fd'}
                      stroke={isSelected ? '#f59e0b' : darkMode ? '#0284c7' : '#0369a1'}
                      strokeWidth={isSelected ? '3.5' : '2'}
                    />

                    <rect
                      x={cage.x + 6}
                      y={cage.y + 6}
                      width={cage.size - 12}
                      height={cage.size - 12}
                      rx="3"
                      fill="none"
                      stroke={darkMode ? 'rgba(125,211,252,0.25)' : 'rgba(3,105,161,0.25)'}
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />

                    {cage.photoperiodActive && (
                      <circle
                        cx={cage.x + cage.size / 2}
                        cy={cage.y + cage.size / 2}
                        r={cage.size * 0.44}
                        fill="url(#photoperiodGlow)"
                      />
                    )}

                    <text
                      x={cage.x + cage.size / 2}
                      y={cage.y + cage.size / 2 - 4}
                      textAnchor="middle"
                      fontSize="18"
                      fontWeight="800"
                      fill={darkMode ? '#f0f9ff' : '#0c4a6e'}
                    >
                      {cage.number}
                    </text>

                    <text
                      x={cage.x + cage.size / 2}
                      y={cage.y + cage.size / 2 + 6}
                      textAnchor="middle"
                      fontSize="19"
                      fontWeight="800"
                      fill={darkMode ? '#f0f9ff' : '#0c4a6e'}
                    >
                      {cage.number}
                    </text>

                    {cage.photoperiodActive && (
                      <g transform={`translate(${cage.x + cage.size - 16}, ${cage.y + 16})`}>
                        <circle r="8" fill="#f59e0b" />
                        <circle r="3.5" fill="#fef08a" />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* LÍNEAS DE CANALIZACIÓN ELÉCTRICA */}
              <g opacity="0.7" pointerEvents="none">
                <polyline
                  points="112,280 816,280"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                />
                <polyline
                  points="1112,280 1688,280"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                />
              </g>

              {/* RENDERIZADO DE EQUIPOS Y LUMINARIAS */}
              {objects.map((obj) => renderObjectSymbol(obj))}
            </g>
          </svg>

          {/* Tooltip rápido al pasar el mouse */}
          {hoveredObj && !draggingObjId && (
            <div
              className={`pointer-events-none absolute top-14 right-4 z-10 p-3 rounded-xl border max-w-xs text-xs shadow-lg ${
                darkMode
                  ? 'bg-slate-900/95 border-slate-700 text-slate-100'
                  : 'bg-white/95 border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-extrabold text-sky-500">{hoveredObj.tag}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-500/15 font-semibold">
                  {hoveredObj.moduleId}
                </span>
              </div>
              <p className="font-semibold">{hoveredObj.spec}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Ubicación: {hoveredObj.locationLabel} · {hoveredObj.power}W
              </p>
            </div>
          )}
        </main>

        {/* PESTAÑA FLOTANTE PARA ABRIR EL PANEL DERECHO CUANDO ESTÁ CERRADO */}
        {!showRightSidebar && !isFullscreen && (
          <button
            onClick={() => setShowRightSidebar(true)}
            title="Abrir panel desplegable de propiedades"
            className={`fixed md:absolute right-0 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-2.5 py-3 rounded-l-xl border border-r-0 shadow-lg text-xs font-bold transition-all ${
              darkMode
                ? 'bg-slate-900/95 border-slate-700 text-sky-400 hover:bg-slate-800'
                : 'bg-white/95 border-slate-300 text-sky-700 hover:bg-sky-50'
            }`}
          >
            <PanelRightOpen className="w-4 h-4" />
            <span className="[writing-mode:vertical-rl] rotate-180 tracking-wider uppercase text-[10px]">
              Inspector
            </span>
          </button>
        )}

        {/* PANEL DERECHO DESPLEGABLE (CON BOTÓN X Y AUTO-OCULTAR) */}
        {showRightSidebar && !isFullscreen && (
        <aside
          className={`fixed md:absolute top-0 right-0 bottom-0 z-30 w-80 max-w-[90vw] flex flex-col border-l overflow-y-auto shadow-2xl transition-transform duration-200 ${
            darkMode ? 'bg-slate-900/98 border-slate-700' : 'bg-white/98 border-slate-200'
          }`}
        >
          {/* Barra superior fija del panel desplegable */}
          <div
            className={`sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 border-b backdrop-blur-md ${
              darkMode ? 'bg-slate-900/95 border-slate-800' : 'bg-slate-50/95 border-slate-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-sky-500" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Panel Desplegable
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setAutoHideRightPanel((v) => !v)}
                title="Si está activo, el panel se oculta automáticamente al tocar el plano"
                className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition ${
                  autoHideRightPanel
                    ? 'bg-sky-600 text-white border-sky-600'
                    : darkMode
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {autoHideRightPanel ? 'Auto-ocultar: ON' : 'Auto-ocultar: OFF'}
              </button>
              <button
                type="button"
                onClick={() => setShowRightSidebar(false)}
                title="Cerrar panel derecho"
                className={`p-1.5 rounded-lg transition ${
                  darkMode
                    ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    : 'text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {selectedObject ? (
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
                    Equipo / Luminaria Seleccionada
                  </span>
                  <h2 className="text-base font-extrabold">{selectedObject.tag}</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => duplicateObject(selectedObject, 36, 36)}
                    title="Duplicar elemento (Ctrl+D)"
                    className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteObject(selectedObject.id)}
                    title="Eliminar equipo del plano (Supr)"
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Identificador (TAG)</label>
                  <input
                    type="text"
                    value={selectedObject.tag}
                    onChange={(e) => updateSelectedObject('tag', e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border font-bold ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Especificación Técnica</label>
                  <input
                    type="text"
                    value={selectedObject.spec}
                    onChange={(e) => updateSelectedObject('spec', e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">Sistema</label>
                    <select
                      value={selectedObject.phase}
                      onChange={(e) => updateSelectedObject('phase', e.target.value)}
                      className={`w-full px-2 py-1.5 rounded-lg border ${
                        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      {Object.entries(PHASE_CONFIG).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">Potencia (W)</label>
                    <input
                      type="number"
                      value={selectedObject.power}
                      onChange={(e) => updateSelectedObject('power', Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border ${
                        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-500">Orientación / Ángulo del Haz</label>
                    <span className="font-bold text-sky-500">{selectedObject.rotation ?? 0}°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0"
                      max="315"
                      step="45"
                      value={selectedObject.rotation ?? 0}
                      onChange={(e) => updateSelectedObject('rotation', Number(e.target.value))}
                      className="flex-1 accent-sky-500 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => updateSelectedObject('rotation', ((selectedObject.rotation ?? 0) + 90) % 360)}
                      title="Rotar 90° en sentido horario"
                      className={`px-2 py-1 rounded-lg border text-[11px] font-bold ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-200'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      +90°
                    </button>
                  </div>
                </div>

                {selectedObject.type === 'enchufe_220v' && (
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div>
                      <label className="block font-semibold text-blue-600 dark:text-blue-400 mb-1">Corriente Nominal</label>
                      <select
                        value={selectedObject.amperage || '16A'}
                        onChange={(e) => updateSelectedObject('amperage', e.target.value)}
                        className={`w-full px-2 py-1.5 rounded-lg border ${
                          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      >
                        <option value="16A">16A (3.52 kW)</option>
                        <option value="32A">32A (7.04 kW)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-blue-600 dark:text-blue-400 mb-1">Grado Estanqueidad</label>
                      <select
                        value={selectedObject.ipGrade || 'IP67'}
                        onChange={(e) => updateSelectedObject('ipGrade', e.target.value)}
                        className={`w-full px-2 py-1.5 rounded-lg border ${
                          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      >
                        <option value="IP67">IP67 Sumergible</option>
                        <option value="IP66">IP66 Intemperie</option>
                      </select>
                    </div>
                  </div>
                )}

                {selectedObject.type === 'fotocelda' && (
                  <div className="space-y-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div>
                      <label className="block font-semibold text-amber-600 dark:text-amber-400 mb-1">Umbral Activación (Lux)</label>
                      <input
                        type="text"
                        value={selectedObject.luxThreshold || '15 Lux'}
                        onChange={(e) => updateSelectedObject('luxThreshold', e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border ${
                          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-amber-600 dark:text-amber-400 mb-1">Circuito / Contactor Comandado</label>
                      <input
                        type="text"
                        value={selectedObject.controlledCircuit || ''}
                        onChange={(e) => updateSelectedObject('controlledCircuit', e.target.value)}
                        className={`w-full px-2.5 py-1.5 rounded-lg border ${
                          darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                        }`}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Estado Operativo</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => updateSelectedObject('status', key)}
                        className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition ${
                          selectedObject.status === key
                            ? 'border-sky-500 bg-sky-500/15 text-sky-600 dark:text-sky-300'
                            : darkMode
                            ? 'border-slate-700 bg-slate-800 text-slate-400'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                        }`}
                      >
                        {cfg.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Ubicación en Pasillo</label>
                  <input
                    type="text"
                    value={selectedObject.locationLabel}
                    onChange={(e) => updateSelectedObject('locationLabel', e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">Coord. X</label>
                    <input
                      type="number"
                      value={selectedObject.x}
                      onChange={(e) => updateSelectedObject('x', Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border ${
                        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">Coord. Y</label>
                    <input
                      type="number"
                      value={selectedObject.y}
                      onChange={(e) => updateSelectedObject('y', Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border ${
                        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Observaciones Técnicas</label>
                  <textarea
                    rows={3}
                    value={selectedObject.description}
                    onChange={(e) => updateSelectedObject('description', e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <button
                  onClick={() => duplicateObject(selectedObject, 36, 36)}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold transition shadow-xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicar Elemento (Ctrl+D)</span>
                </button>
              </div>
            </div>
          ) : selectedCage ? (
            <div className="p-4 space-y-4">
              <div className="border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  Unidad de Cultivo ({selectedCage.moduleId})
                </span>
                <h2 className="text-lg font-extrabold">Jaula N° {selectedCage.number}</h2>
                <p className="text-xs text-slate-500">Dimensiones: {selectedCage.dimensions} · Prof: {selectedCage.depth}</p>
              </div>

              <div className="space-y-3 text-xs">
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between ${
                    selectedCage.photoperiodActive
                      ? 'bg-amber-500/10 border-amber-500/30'
                      : darkMode
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <Sun className="w-4 h-4 text-amber-500" />
                      <span>Fotoperiodo Artificial</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selectedCage.photoperiodActive ? 'Encendido (24h continuo)' : 'Apagado / Fotoperiodo Natural'}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={selectedCage.photoperiodActive}
                    onChange={(e) => updateSelectedCage('photoperiodActive', e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Especie en Cultivo</label>
                  <input
                    type="text"
                    value={selectedCage.species}
                    onChange={(e) => updateSelectedCage('species', e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">Biomasa (Ton)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={selectedCage.biomassTons}
                      onChange={(e) => updateSelectedCage('biomassTons', Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border ${
                        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-500 mb-1">Intensidad (Lux)</label>
                    <input
                      type="number"
                      value={selectedCage.targetLux}
                      onChange={(e) => updateSelectedCage('targetLux', Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-lg border ${
                        darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Notas Operativas Jaula</label>
                  <textarea
                    rows={3}
                    value={selectedCage.notes}
                    onChange={(e) => updateSelectedCage('notes', e.target.value)}
                    className={`w-full px-2.5 py-1.5 rounded-lg border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-5 text-center space-y-3 my-auto">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold">Inspector de Propiedades</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Haz clic o toca cualquier <strong>Jaula (201–212 / 101–110)</strong> o cualquier{' '}
                <strong>Luminaria, Tablero o Sensor</strong> en el plano para editar sus parámetros o arrastrarlo por los pasillos.
              </p>
            </div>
          )}
        </aside>
        )}
      </div>

      {/* MODAL VISTA PREVIA LIMPIA EN PANTALLA COMPLETA */}
      {showPreviewModal && (
        <div
          className={`fixed inset-0 z-50 flex flex-col ${
            darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
          }`}
        >
          <div
            className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-3">
              {companyInfo.logoDataUrl && (
                <img
                  src={companyInfo.logoDataUrl}
                  alt="Logo"
                  className="h-9 max-w-[140px] object-contain"
                />
              )}
              <div>
                <h2 className="text-base font-extrabold leading-tight">
                  {companyInfo.companyName} · Vista Previa del Plano
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {companyInfo.centerName} · Código: <strong>{companyInfo.code}</strong> · Resp:{' '}
                  <strong>{companyInfo.responsibleName}</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPNG}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Descargar PNG</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Exportar PDF</span>
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition"
              >
                <X className="w-4 h-4" />
                <span>Cerrar Vista Previa (Esc)</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
            <div
              className={`w-full max-w-[1800px] rounded-2xl border-2 overflow-hidden shadow-2xl ${
                darkMode ? 'border-slate-700 bg-[#071526]' : 'border-slate-300 bg-[#f0f9ff]'
              }`}
              dangerouslySetInnerHTML={{ __html: generateSvgStringForExport() || '' }}
            />
          </div>
        </div>
      )}

      {/* MODAL DE EMPRESA, LOGOTIPO Y FIRMA PARA EXPORTACIÓN PDF */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <h3 className="text-base font-extrabold flex items-center gap-2">
                <Building2 className="w-5 h-5 text-sky-500" />
                Configuración de Empresa y Firma PDF
              </h3>
              <button
                onClick={() => setShowCompanyModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-500 mb-1">Nombre de la Empresa</label>
                <input
                  type="text"
                  value={companyInfo.companyName}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, companyName: e.target.value })}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Nombre Centro / Pontón</label>
                  <input
                    type="text"
                    value={companyInfo.centerName}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, centerName: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Código de Plano</label>
                  <input
                    type="text"
                    value={companyInfo.code}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, code: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Responsable Técnico</label>
                  <input
                    type="text"
                    value={companyInfo.responsibleName}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, responsibleName: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-500 mb-1">Cargo / Registro SEC</label>
                  <input
                    type="text"
                    value={companyInfo.responsibleLicense}
                    onChange={(e) => setCompanyInfo({ ...companyInfo, responsibleLicense: e.target.value })}
                    className={`w-full px-3 py-2 rounded-lg border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                  <div className="font-bold mb-1.5">Logotipo Empresa</div>
                  {companyInfo.logoDataUrl ? (
                    <img src={companyInfo.logoDataUrl} alt="Logo" className="h-12 mx-auto object-contain mb-2" />
                  ) : (
                    <div className="h-12 flex items-center justify-center text-slate-400">Sin logo</div>
                  )}
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="px-2.5 py-1 rounded bg-sky-600 text-white font-semibold"
                  >
                    Subir Imagen
                  </button>
                </div>

                <div className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center">
                  <div className="font-bold mb-1.5">Firma Responsable</div>
                  {companyInfo.signatureDataUrl ? (
                    <img src={companyInfo.signatureDataUrl} alt="Firma" className="h-12 mx-auto object-contain mb-2" />
                  ) : (
                    <div className="h-12 flex items-center justify-center text-slate-400">Sin firma</div>
                  )}
                  <button
                    onClick={() => signatureInputRef.current?.click()}
                    className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                  >
                    Subir Firma
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowCompanyModal(false)}
                className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE INVENTARIO TABULAR */}
      {showInventoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-4xl rounded-2xl border p-5 shadow-2xl max-h-[85vh] flex flex-col ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-3">
              <div>
                <h3 className="text-base font-extrabold">Inventario de Equipos y Luminarias</h3>
                <p className="text-xs text-slate-500">
                  Módulo 200 (12 Jaulas) y Módulo 100 (10 Jaulas) · Potencia Total: {(stats.totalPower / 1000).toFixed(2)} kW
                </p>
              </div>
              <button
                onClick={() => setShowInventoryModal(false)}
                className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 text-xs font-bold"
              >
                Cerrar ✕
              </button>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'}>
                    <th className="p-2.5">TAG</th>
                    <th className="p-2.5">Módulo</th>
                    <th className="p-2.5">Especificación</th>
                    <th className="p-2.5">Sistema</th>
                    <th className="p-2.5">Potencia</th>
                    <th className="p-2.5">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {objects.map((o) => (
                    <tr
                      key={o.id}
                      onClick={() => {
                        setSelectedId(o.id);
                        setSelectedKind('object');
                        setShowRightSidebar(true);
                        setShowInventoryModal(false);
                      }}
                      className="cursor-pointer hover:bg-sky-500/10"
                    >
                      <td className="p-2.5 font-bold text-sky-500">{o.tag}</td>
                      <td className="p-2.5">{o.moduleId}</td>
                      <td className="p-2.5">{o.spec}</td>
                      <td className="p-2.5">{PHASE_CONFIG[o.phase]?.label}</td>
                      <td className="p-2.5 font-semibold">{o.power} W</td>
                      <td className="p-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${STATUS_CONFIG[o.status]?.dot}`} />
                          {STATUS_CONFIG[o.status]?.label}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BASE DE DATOS EN LA NUBE (FIREBASE CLOUD FIRESTORE) */}
      {showCloudModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[88vh] ${
              darkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold">Base de Datos y Acceso desde Celular</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    Estado:
                    {cloudStatus === 'connected' && (
                      <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                        ● Conectado a Cloud Firestore (BEQA)
                      </span>
                    )}
                    {cloudStatus === 'connecting' && (
                      <span className="text-amber-600 font-semibold">● Conectando...</span>
                    )}
                    {cloudStatus === 'error' && (
                      <span className="text-rose-600 font-semibold">
                        ● Error de permisos o dominio en Firestore
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCloudModal(false)}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              <div
                className={`p-3.5 rounded-xl border ${
                  darkMode
                    ? 'bg-sky-950/30 border-sky-800 text-sky-200'
                    : 'bg-sky-50 border-sky-200 text-sky-950'
                }`}
              >
                <h4 className="font-bold text-xs mb-1">📱 ¿Por qué no abre desde el celular en StackBlitz?</h4>
                <p className="leading-relaxed text-[11px]">
                  Los enlaces de vista previa interna de StackBlitz (<code>*.local-credentialless.webcontainer-api.io</code>) solo funcionan dentro del navegador de tu computador. Para abrirlo en tu celular y sincronizar tus planos en vivo:
                </p>
                <ol className="list-decimal list-inside mt-1.5 space-y-1 text-[11px]">
                  <li>En StackBlitz, haz clic en <strong>"Deploy"</strong> (arriba a la derecha) o súbelo gratis a <strong>Vercel / Netlify</strong> para obtener una URL pública (<code>https://tu-app.vercel.app</code>).</li>
                  <li>En Firebase Console → <strong>Authentication → Configuración → Dominios autorizados</strong>, agrega ese dominio público.</li>
                  <li>¡Listo! Desde el celular podrás tocar los equipos, arrastrarlos con el dedo y hacer zoom con dos dedos.</li>
                </ol>
              </div>

              <div
                className={`p-4 rounded-xl border ${
                  darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-amber-50/60 border-amber-200'
                }`}
              >
                <h4 className="font-bold text-sm mb-2 flex items-center gap-1.5">
                  <CloudUpload className="w-4 h-4 text-amber-500" />
                  Guardar Plano Actual en la Nube
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      Nombre del Plano / Centro
                    </label>
                    <input
                      type="text"
                      value={blueprintNameInput}
                      onChange={(e) => setBlueprintNameInput(e.target.value)}
                      placeholder="Ej. Centro Engorda Canal Puyuhuapi"
                      className={`w-full px-3 py-2 rounded-lg border text-xs ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                      ID Único del Documento
                    </label>
                    <input
                      type="text"
                      value={currentBlueprintId}
                      onChange={(e) => setCurrentBlueprintId(e.target.value)}
                      placeholder="plano-centro-01"
                      className={`w-full px-3 py-2 rounded-lg border text-xs font-mono ${
                        darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleSaveToCloud()}
                    disabled={isSavingCloud || cloudStatus !== 'connected'}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-lg font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 transition"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingCloud ? 'Guardando...' : 'Guardar / Sobrescribir Actual'}</span>
                  </button>
                  <button
                    onClick={() => handleSaveToCloud(`plano-${Date.now()}`, `${blueprintNameInput} (Copia)`)}
                    disabled={isSavingCloud || cloudStatus !== 'connected'}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold border transition ${
                      darkMode
                        ? 'bg-slate-800 border-slate-600 text-slate-200 hover:bg-slate-700'
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Guardar como Nuevo Plano</span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm flex items-center gap-1.5">
                    <FolderOpen className="w-4 h-4 text-sky-500" />
                    Planos Guardados en Cloud Firestore ({savedBlueprints.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">Sincronización en tiempo real</span>
                </div>

                {savedBlueprints.length === 0 ? (
                  <div
                    className={`p-6 rounded-xl border border-dashed text-center ${
                      darkMode ? 'border-slate-700 text-slate-400' : 'border-slate-300 text-slate-500'
                    }`}
                  >
                    Aún no hay planos guardados en la nube. Haz clic en <strong>"Guardar / Sobrescribir Actual"</strong> arriba para crear el primero.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedBlueprints.map((bp) => (
                      <div
                        key={bp.id}
                        className={`flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl border ${
                          bp.id === currentBlueprintId
                            ? darkMode
                              ? 'bg-sky-950/40 border-sky-600'
                              : 'bg-sky-50 border-sky-400'
                            : darkMode
                            ? 'bg-slate-800/50 border-slate-700'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm flex items-center gap-2">
                            <span>{bp.title || bp.id}</span>
                            {bp.id === currentBlueprintId && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300 font-semibold">
                                Activo
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {bp.companyName || 'SERVICIOS BEQA SPA'} · {bp.totalObjects || 0} equipos ·{' '}
                            {bp.updatedAt ? new Date(bp.updatedAt).toLocaleString('es-CL') : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleLoadFromCloud(bp)}
                            className="px-3 py-1.5 rounded-lg font-bold bg-sky-600 hover:bg-sky-700 text-white transition"
                          >
                            Cargar Plano
                          </button>
                          <button
                            onClick={() => handleDeleteFromCloud(bp.id, bp.title || bp.id)}
                            title="Eliminar plano de la nube"
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-500/15 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NOTIFICACIÓN TOAST */}
      {toast && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold shadow-xl border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}