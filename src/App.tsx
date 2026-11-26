// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, RotateCcw, Plus, Trash2, Download, Upload,
  Sun, Moon, Filter, FileText, Image as ImageIcon, CheckCircle2, AlertTriangle,
  Wrench, Zap, Camera, Radio, Cpu, Compass, Sliders, Edit3, Save, Copy,
  Magnet, Eye, EyeOff, Info, Layers, Grid, ArrowRightLeft, Building2, Printer,
  Expand, Minimize, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen,
  MonitorPlay, X, Cloud, FolderOpen, CloudUpload, RefreshCw, MapPin, ExternalLink, FolderPlus,
  Route, Square
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

// Escala base de referencia: 112 px visuales equivalen a 30 metros reales
const BASE_CAGE_PX = 112;
const BASE_CAGE_METERS = 30;

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
    cageSizeMeters: 30,
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
    cageSizeMeters: 30,
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
          label: String(num),
          showLabel: true,
          moduleId: mod.id,
          row: r,
          col: c,
          x,
          y,
          size: mod.cageSize,
          sizeMeters: mod.cageSizeMeters || 30,
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

const INITIAL_CONDUITS = [
  {
    id: 'CAN-01',
    tag: 'CAN-200-R',
    phase: 'fase_r',
    cableSpec: 'Cable Submarino H07RN-F 3G4 mm²',
    conduitSpec: 'Ducto HDPE 32mm PN10',
    dropMeters: 6,
    points: [
      { x: 112, y: 280 },
      { x: 176, y: 280 },
    ],
  },
  {
    id: 'CAN-02',
    tag: 'CAN-200-S',
    phase: 'fase_s',
    cableSpec: 'Cable Submarino H07RN-F 3G4 mm²',
    conduitSpec: 'Ducto HDPE 32mm PN10',
    dropMeters: 6,
    points: [
      { x: 112, y: 280 },
      { x: 112, y: 152 },
      { x: 432, y: 152 },
      { x: 432, y: 280 },
    ],
  },
  {
    id: 'CAN-03',
    tag: 'CAN-200-T',
    phase: 'fase_t',
    cableSpec: 'Cable Submarino H07RN-F 3G4 mm²',
    conduitSpec: 'Ducto HDPE 32mm PN10',
    dropMeters: 6,
    points: [
      { x: 112, y: 280 },
      { x: 112, y: 408 },
      { x: 688, y: 408 },
      { x: 688, y: 280 },
    ],
  },
];

const INITIAL_COMPANY_INFO = {
  companyName: 'SERVICIOS BEQA SPA',
  projectName: 'Instalación Sistema Fotoperiodo e Infraestructura Eléctrica',
  projectDescription: 'Distribución de proyectores LED sumergibles, tableros IP66, tomas auxiliares 220V y telemetría en trenes de cultivo.',
  clientName: 'Salmones Austral S.A.',
  centerName: 'Centro de Engorda Navarro · Módulos 200 y 100',
  coordinates: '-41.784520, -73.124890',
  googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=-41.784520,-73.124890',
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

const CONDUIT_PHASE_CONFIG = {
  fase_r: {
    label: 'Fase R (L1)',
    short: 'R / L1',
    color: '#dc2626',
    dashArray: 'none',
  },
  fase_s: {
    label: 'Fase S (L2)',
    short: 'S / L2',
    color: '#2563eb',
    dashArray: '10 5',
  },
  fase_t: {
    label: 'Fase T (L3)',
    short: 'T / L3',
    color: '#16a34a',
    dashArray: '4 4',
  },
  trifasico: {
    label: 'Trifásico (3F+N+T)',
    short: '3F+N+T',
    color: '#9333ea',
    dashArray: '14 4 3 4',
  },
  control: {
    label: 'Control / Fotoperiodo',
    short: 'CTRL',
    color: '#f59e0b',
    dashArray: '7 4',
  },
};

const STATUS_CONFIG = {
  operativo: { label: 'Operativo', color: '#10b981', dot: 'bg-emerald-500' },
  mantencion: { label: 'En Mantención', color: '#f59e0b', dot: 'bg-amber-500' },
  falla: { label: 'Falla / Alerta', color: '#ef4444', dot: 'bg-rose-500' },
};

const SYMBOL_CATALOG = [
  { type: 'luminaria', label: 'Proyector LED Fotoperiodo', icon: 'sun', phase: 'fotoperiodo', power: 1000, rotation: 180 },
  { type: 'enchufe_220v', label: 'Enchufe Industrial 220V', icon: 'plug', phase: 'fuerza_aux', power: 3520, rotation: 0, amperage: '16A', ipGrade: 'IP67' },
  { type: 'fotocelda', label: 'Fotocelda Crepuscular', icon: 'eye', phase: 'fotoperiodo', power: 15, rotation: 0, luxThreshold: '15 Lux', controlledCircuit: 'Contactor Fotoperiodo' },
  { type: 'tablero', label: 'Tablero Eléctrico IP66', icon: 'zap', phase: 'control', power: 1200, rotation: 0 },
  { type: 'energizador', label: 'Energizador / Telemetría', icon: 'radio', phase: 'control', power: 450, rotation: 0 },
  { type: 'sensor', label: 'Sensor Oxígeno / Sonda', icon: 'cpu', phase: 'monitoreo', power: 60, rotation: 0 },
  { type: 'camara', label: 'Cámara Submarina / PTZ', icon: 'camera', phase: 'monitoreo', power: 85, rotation: 0 },
  { type: 'alimentador', label: 'Selector Alimentación', icon: 'compass', phase: 'alimentacion', power: 350, rotation: 0 },
];

const ICON_TO_TYPE_MAP = {
  sun: 'luminaria',
  plug: 'enchufe_220v',
  eye: 'fotocelda',
  zap: 'tablero',
  radio: 'energizador',
  cpu: 'sensor',
  camera: 'camara',
  compass: 'alimentador',
};

const buildGoogleMapsLink = (coordsText, customUrl = '') => {
  if (customUrl && customUrl.trim().startsWith('http')) return customUrl.trim();
  const clean = (coordsText || '').trim();
  if (!clean) return 'https://www.google.com/maps';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clean)}`;
};

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
  const [conduits, setConduits] = useState(INITIAL_CONDUITS);
  const [symbolCatalog, setSymbolCatalog] = useState(SYMBOL_CATALOG);
  const [isEditingCatalog, setIsEditingCatalog] = useState(false);
  const [catalogForm, setCatalogForm] = useState({
    editingIndex: null,
    label: '',
    icon: 'sun',
    phase: 'fotoperiodo',
    power: 1000,
    rotation: 180,
  });
  const [companyInfo, setCompanyInfo] = useState(INITIAL_COMPANY_INFO);
  const [trunkLabel, setTrunkLabel] = useState('Troncal Submarina 224m');
  const [showTrunkLabel, setShowTrunkLabel] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState(null);

  // Modal Nuevo Proyecto
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    projectName: '',
    projectDescription: '',
    clientName: '',
    centerName: '',
    coordinates: '',
    googleMapsUrl: '',
    clearExistingObjects: false,
  });

  // Estado de vista del plano (Pan & Zoom)
  const [zoom, setZoom] = useState(0.84);
  const [pan, setPan] = useState({ x: 24, y: 14 });
  const [snapToWalkway, setSnapToWalkway] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Herramientas y selección
  // activeTool: 'select' | 'place' | 'draw_conduit' | 'draw_cage'
  const [activeTool, setActiveTool] = useState('select');
  const [placeTemplate, setPlaceTemplate] = useState(SYMBOL_CATALOG[0]);
  const [selectedId, setSelectedId] = useState('OBJ-02');
  const [selectedKind, setSelectedKind] = useState('object'); // 'object' | 'cage' | 'module' | 'trunk' | 'conduit'

  // Estado de dibujo de canalización por fase
  const [conduitPhase, setConduitPhase] = useState('fase_r');
  const [conduitCableSpec, setConduitCableSpec] = useState('Cable Submarino H07RN-F 3G4 mm²');
  const [conduitDropMeters, setConduitDropMeters] = useState(6);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [cursorSvgPos, setCursorSvgPos] = useState(null);

  // Estado de dibujo de jaula con ingreso de tamaño (m)
  const [newCageSizeMeters, setNewCageSizeMeters] = useState(30);
  const [newCageLabelInput, setNewCageLabelInput] = useState('');

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
  const [cloudSearchQuery, setCloudSearchQuery] = useState('');
  const [currentBlueprintId, setCurrentBlueprintId] = useState('plano-principal-engorda');
  const [blueprintNameInput, setBlueprintNameInput] = useState(INITIAL_COMPANY_INFO.centerName);
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
  const pinchRef = useRef({ active: false, initialDist: 0, initialZoom: 0.84 });

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
  // CÁLCULO AUTOMÁTICO DE TRAMOS DE CABLE EN BASE AL TAMAÑO DE LA JAULA
  // ============================================================================
  const getScaleMetersPerPixelAtPoint = (pt) => {
    if (!cages || cages.length === 0) return BASE_CAGE_METERS / BASE_CAGE_PX;
    let nearestCage = cages[0];
    let minDist = Infinity;
    cages.forEach((c) => {
      const cx = c.x + (c.size || BASE_CAGE_PX) / 2;
      const cy = c.y + (c.size || BASE_CAGE_PX) / 2;
      const d = Math.hypot(pt.x - cx, pt.y - cy);
      if (d < minDist) {
        minDist = d;
        nearestCage = c;
      }
    });
    const cagePx = Number(nearestCage.size) || BASE_CAGE_PX;
    const cageMeters = Number(nearestCage.sizeMeters) || BASE_CAGE_METERS;
    return cageMeters / cagePx;
  };

  const calculateConduitMetrics = (conduit) => {
    const pts = conduit?.points || [];
    if (pts.length < 2) {
      const drop = Number(conduit?.dropMeters) || 0;
      return {
        horizontalMeters: 0,
        dropMeters: drop,
        totalMeters: Number(drop.toFixed(1)),
      };
    }

    let horizontalMeters = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const segPx = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const midPt = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const metersPerPx = getScaleMetersPerPixelAtPoint(midPt);
      horizontalMeters += segPx * metersPerPx;
    }

    const dropMeters = Number(conduit?.dropMeters) || 0;
    const totalMeters = horizontalMeters + dropMeters;

    return {
      horizontalMeters: Number(horizontalMeters.toFixed(1)),
      dropMeters: Number(dropMeters.toFixed(1)),
      totalMeters: Number(totalMeters.toFixed(1)),
    };
  };

  const cableSummaryByPhase = useMemo(() => {
    const summary = {};
    Object.keys(CONDUIT_PHASE_CONFIG).forEach((k) => {
      summary[k] = {
        phase: k,
        label: CONDUIT_PHASE_CONFIG[k].label,
        color: CONDUIT_PHASE_CONFIG[k].color,
        count: 0,
        horizontalMeters: 0,
        dropMeters: 0,
        totalMeters: 0,
      };
    });

    conduits.forEach((conduit) => {
      const key = CONDUIT_PHASE_CONFIG[conduit.phase] ? conduit.phase : 'fase_r';
      const m = calculateConduitMetrics(conduit);
      summary[key].count += 1;
      summary[key].horizontalMeters = Number((summary[key].horizontalMeters + m.horizontalMeters).toFixed(1));
      summary[key].dropMeters = Number((summary[key].dropMeters + m.dropMeters).toFixed(1));
      summary[key].totalMeters = Number((summary[key].totalMeters + m.totalMeters).toFixed(1));
    });

    return Object.values(summary);
  }, [conduits, cages]);

  const totalCableMeters = useMemo(() => {
    return Number(
      cableSummaryByPhase.reduce((acc, item) => acc + item.totalMeters, 0).toFixed(1)
    );
  }, [cableSummaryByPhase]);

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

  const handleSaveToCloud = async (customId = null, customTitle = null, overrideData = null) => {
    if (!db || !fbUser) {
      notify('Base de datos en la nube no disponible en este entorno', 'warn');
      return;
    }
    setIsSavingCloud(true);
    try {
      const infoToUse = overrideData?.companyInfo || companyInfo;
      const objectsToUse = overrideData?.objects || objects;
      const cagesToUse = overrideData?.cages || cages;
      const modulesToUse = overrideData?.modules || modules;
      const conduitsToUse = overrideData?.conduits || conduits;
      const catalogToUse = overrideData?.symbolCatalog || symbolCatalog;

      const targetId = (customId || currentBlueprintId || `plano-${Date.now()}`)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, '-');
      const targetTitle = (
        customTitle ||
        infoToUse.centerName ||
        infoToUse.projectName ||
        blueprintNameInput ||
        'Plano Centro de Engorda'
      ).trim();

      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'planos_centro_engorda', targetId);

      const payload = {
        title: targetTitle,
        projectName: infoToUse.projectName || targetTitle,
        clientName: infoToUse.clientName || '',
        centerName: infoToUse.centerName || targetTitle,
        coordinates: infoToUse.coordinates || '',
        updatedAt: new Date().toISOString(),
        updatedBy: infoToUse.responsibleName || 'Usuario Técnico',
        companyName: infoToUse.companyName || 'SERVICIOS BEQA SPA',
        totalObjects: objectsToUse.length,
        totalCages: cagesToUse.length,
        modules: modulesToUse,
        cages: cagesToUse,
        objects: objectsToUse,
        conduits: conduitsToUse,
        symbolCatalog: catalogToUse,
        trunkLabel,
        showTrunkLabel,
        companyInfo: infoToUse,
      };

      await setDoc(docRef, payload);
      setCurrentBlueprintId(targetId);
      setBlueprintNameInput(targetTitle);
      notify(`Proyecto "${targetTitle}" guardado en la nube correctamente`, 'success');
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
    if (Array.isArray(bp.conduits)) setConduits(bp.conduits);
    if (Array.isArray(bp.symbolCatalog) && bp.symbolCatalog.length > 0) {
      setSymbolCatalog(bp.symbolCatalog);
      setPlaceTemplate(bp.symbolCatalog[0]);
    }
    if (typeof bp.trunkLabel === 'string') setTrunkLabel(bp.trunkLabel);
    if (typeof bp.showTrunkLabel === 'boolean') setShowTrunkLabel(bp.showTrunkLabel);
    if (bp.companyInfo) setCompanyInfo((prev) => ({ ...prev, ...bp.companyInfo }));
    setCurrentBlueprintId(bp.id);
    setBlueprintNameInput(bp.companyInfo?.centerName || bp.title || bp.id);
    setSelectedId(null);
    setSelectedKind(null);
    setShowCloudModal(false);
    notify(`Proyecto "${bp.title || bp.id}" cargado desde la nube`, 'success');
  };

  const handleDeleteFromCloud = async (bpId, bpTitle) => {
    if (!db || !fbUser) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'planos_centro_engorda', bpId));
      notify(`Proyecto "${bpTitle}" eliminado de la nube`, 'info');
    } catch (err) {
      console.error('Error eliminando plano:', err);
      notify('No se pudo eliminar el proyecto de la nube', 'warn');
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

  const selectedModule = useMemo(
    () => (selectedKind === 'module' ? modules.find((m) => m.id === selectedModuleId) : null),
    [modules, selectedModuleId, selectedKind]
  );

  const selectedConduit = useMemo(
    () => (selectedKind === 'conduit' ? conduits.find((c) => c.id === selectedId) : null),
    [conduits, selectedId, selectedKind]
  );

  const filteredBlueprints = useMemo(() => {
    const q = cloudSearchQuery.trim().toLowerCase();
    if (!q) return savedBlueprints;
    return savedBlueprints.filter(
      (bp) =>
        (bp.title || '').toLowerCase().includes(q) ||
        (bp.projectName || '').toLowerCase().includes(q) ||
        (bp.clientName || '').toLowerCase().includes(q) ||
        (bp.companyInfo?.centerName || '').toLowerCase().includes(q) ||
        (bp.companyName || '').toLowerCase().includes(q) ||
        (bp.id || '').toLowerCase().includes(q)
    );
  }, [savedBlueprints, cloudSearchQuery]);

  // ============================================================================
  // EDICIÓN Y CREACIÓN EN LA PALETA DE SIMBOLOGÍA
  // ============================================================================
  const handleSaveCatalogSymbol = (e) => {
    e.preventDefault();
    const cleanLabel = catalogForm.label.trim();
    if (!cleanLabel) {
      notify('Ingresa un nombre para el símbolo', 'warn');
      return;
    }

    const mappedType = ICON_TO_TYPE_MAP[catalogForm.icon] || 'tablero';
    const newItem = {
      type: mappedType,
      label: cleanLabel,
      icon: catalogForm.icon,
      phase: catalogForm.phase,
      power: Number(catalogForm.power) || 0,
      rotation: Number(catalogForm.rotation) || 0,
      amperage: mappedType === 'enchufe_220v' ? '16A' : undefined,
      ipGrade: mappedType === 'enchufe_220v' ? 'IP67' : undefined,
      luxThreshold: mappedType === 'fotocelda' ? '15 Lux' : undefined,
    };

    if (catalogForm.editingIndex !== null && symbolCatalog[catalogForm.editingIndex]) {
      const updated = symbolCatalog.map((item, idx) =>
        idx === catalogForm.editingIndex ? newItem : item
      );
      setSymbolCatalog(updated);
      setPlaceTemplate(newItem);
      notify(`Símbolo "${cleanLabel}" actualizado en la paleta`, 'success');
    } else {
      const updated = [...symbolCatalog, newItem];
      setSymbolCatalog(updated);
      setPlaceTemplate(newItem);
      setActiveTool('place');
      notify(`Nuevo símbolo "${cleanLabel}" agregado a la paleta`, 'success');
    }

    setCatalogForm({
      editingIndex: null,
      label: '',
      icon: 'sun',
      phase: 'fotoperiodo',
      power: 1000,
      rotation: 180,
    });
    setIsEditingCatalog(false);
  };

  const handleEditCatalogItem = (idx, e) => {
    e.stopPropagation();
    const item = symbolCatalog[idx];
    if (!item) return;
    setCatalogForm({
      editingIndex: idx,
      label: item.label,
      icon: item.icon || 'zap',
      phase: item.phase || 'control',
      power: Number(item.power) || 0,
      rotation: Number(item.rotation) || 0,
    });
    setIsEditingCatalog(true);
  };

  const handleDeleteCatalogItem = (idx, e) => {
    e.stopPropagation();
    if (symbolCatalog.length <= 1) {
      notify('Debe quedar al menos un símbolo en la paleta', 'warn');
      return;
    }
    const removed = symbolCatalog[idx];
    const updated = symbolCatalog.filter((_, i) => i !== idx);
    setSymbolCatalog(updated);
    if (placeTemplate?.label === removed?.label) {
      setPlaceTemplate(updated[0]);
    }
    notify(`Símbolo "${removed?.label}" eliminado de la paleta`, 'info');
  };

  // ============================================================================
  // CREAR NUEVO PROYECTO
  // ============================================================================
  const handleCreateNewProject = async (e) => {
    e.preventDefault();
    const pName = newProjectForm.projectName.trim();
    const cName = newProjectForm.centerName.trim();
    const client = newProjectForm.clientName.trim();

    if (!pName || !cName) {
      notify('Ingresa al menos el nombre del proyecto y el nombre del centro', 'warn');
      return;
    }

    const coords = newProjectForm.coordinates.trim();
    const mapsLink = buildGoogleMapsLink(coords, newProjectForm.googleMapsUrl);
    const newCode = `PRJ-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 899))}`;

    const updatedInfo = {
      ...companyInfo,
      projectName: pName,
      projectDescription: newProjectForm.projectDescription.trim(),
      clientName: client || 'Cliente No Especificado',
      centerName: cName,
      coordinates: coords,
      googleMapsUrl: mapsLink,
      code: newCode,
    };

    const nextObjects = newProjectForm.clearExistingObjects ? [] : objects;
    const nextConduits = newProjectForm.clearExistingObjects ? [] : conduits;
    const nextCages = newProjectForm.clearExistingObjects ? generateInitialCages() : cages;
    const nextModules = newProjectForm.clearExistingObjects ? INITIAL_MODULES : modules;

    setCompanyInfo(updatedInfo);
    if (newProjectForm.clearExistingObjects) {
      setObjects([]);
      setConduits([]);
      setCages(nextCages);
      setModules(nextModules);
    }

    const slugId = `${cName}-${pName}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `proyecto-${Date.now()}`;

    setCurrentBlueprintId(slugId);
    setBlueprintNameInput(cName);
    setShowNewProjectModal(false);
    setNewProjectForm({
      projectName: '',
      projectDescription: '',
      clientName: '',
      centerName: '',
      coordinates: '',
      googleMapsUrl: '',
      clearExistingObjects: false,
    });

    notify(`Nuevo proyecto "${pName}" creado para ${cName}`, 'success');

    if (db && fbUser) {
      await handleSaveToCloud(slugId, cName, {
        companyInfo: updatedInfo,
        objects: nextObjects,
        conduits: nextConduits,
        cages: nextCages,
        modules: nextModules,
        symbolCatalog,
      });
    }
  };

  // ============================================================================
  // FINALIZAR TRAZO DE CANALIZACIÓN
  // ============================================================================
  const finishDrawingConduit = (ptsOverride = null) => {
    const pts = ptsOverride || drawingPoints;
    if (pts.length < 2) {
      setDrawingPoints([]);
      setCursorSvgPos(null);
      setActiveTool('select');
      return;
    }

    const phaseCfg = CONDUIT_PHASE_CONFIG[conduitPhase] || CONDUIT_PHASE_CONFIG.fase_r;
    const nextNum = conduits.length + 1;
    const newConduit = {
      id: `CAN-${Date.now()}`,
      tag: `CAN-${phaseCfg.short.replace(/[^A-Z0-9]/g, '')}-${String(nextNum).padStart(2, '0')}`,
      phase: conduitPhase,
      cableSpec: conduitCableSpec || 'Cable Submarino H07RN-F 3G4 mm²',
      conduitSpec: 'Ducto HDPE 32mm PN10',
      dropMeters: Number(conduitDropMeters) || 0,
      points: pts,
    };

    const metrics = calculateConduitMetrics(newConduit);
    setConduits((prev) => [...prev, newConduit]);
    setDrawingPoints([]);
    setCursorSvgPos(null);
    setActiveTool('select');
    setSelectedId(newConduit.id);
    setSelectedKind('conduit');
    setShowRightSidebar(true);
    notify(
      `Canalización "${newConduit.tag}" (${phaseCfg.label}) creada: ${metrics.totalMeters} m totales`,
      'success'
    );
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if (e.key === 'Enter' && activeTool === 'draw_conduit' && drawingPoints.length >= 2) {
        e.preventDefault();
        finishDrawingConduit();
        return;
      }

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

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObject) {
          e.preventDefault();
          deleteObject(selectedObject.id);
        } else if (selectedConduit) {
          e.preventDefault();
          deleteConduit(selectedConduit.id);
        }
      }

      if (e.key === 'Escape') {
        if (activeTool === 'draw_conduit') {
          setDrawingPoints([]);
          setCursorSvgPos(null);
          setActiveTool('select');
          notify('Trazo de canalización cancelado', 'info');
        } else if (activeTool !== 'select') {
          setActiveTool('select');
        } else if (showPreviewModal) {
          setShowPreviewModal(false);
        } else if (isFullscreen) {
          toggleFullscreen();
        } else {
          setSelectedId(null);
          setSelectedKind(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObject, selectedConduit, clipboardObj, objects, showPreviewModal, isFullscreen, activeTool, drawingPoints]);

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

  const placeSymbolAtCoords = (rawX, rawY) => {
    const snapped = applySnap(rawX, rawY);
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
  };

  // ============================================================================
  // CREAR JAULA EN EL PLANO CON TAMAÑO EN METROS
  // ============================================================================
  const placeCageAtCoords = (rawX, rawY) => {
    const meters = Math.max(5, Number(newCageSizeMeters) || 30);
    const visualPx = Math.round((meters / BASE_CAGE_METERS) * BASE_CAGE_PX);
    const nextNum =
      cages.reduce((maxN, c) => Math.max(maxN, Number(c.number) || 0), 300) + 1;
    const customLabel = newCageLabelInput.trim() || String(nextNum);
    const modId = detectModuleId(rawX);

    const newCage = {
      id: `JAULA-${Date.now()}`,
      number: nextNum,
      label: customLabel,
      showLabel: true,
      moduleId: modId,
      x: Math.round(rawX),
      y: Math.round(rawY),
      size: visualPx,
      sizeMeters: meters,
      dimensions: `${meters}m x ${meters}m`,
      depth: '22m',
      species: 'Salmón del Atlántico (Salmo salar)',
      biomassTons: 150,
      photoperiodActive: true,
      targetLux: 180,
      notes: `Jaula ${customLabel} (${meters}m x ${meters}m) agregada manualmente.`,
    };

    setCages((prev) => [...prev, newCage]);
    setSelectedId(newCage.id);
    setSelectedKind('cage');
    setShowRightSidebar(true);
    setActiveTool('select');
    notify(`Jaula "${customLabel}" (${meters}m x ${meters}m) dibujada en el plano`, 'success');
  };

  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0) return;
    const coords = clientToSvgCoords(e.clientX, e.clientY);

    if (activeTool === 'place') {
      placeSymbolAtCoords(coords.x, coords.y);
      return;
    }

    if (activeTool === 'draw_cage') {
      placeCageAtCoords(coords.x, coords.y);
      return;
    }

    if (activeTool === 'draw_conduit') {
      const snapped = applySnap(coords.x, coords.y);
      setDrawingPoints((prev) => [...prev, snapped]);
      setCursorSvgPos(snapped);
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

  const handleCanvasDoubleClick = (e) => {
    if (activeTool === 'draw_conduit' && drawingPoints.length >= 2) {
      e.preventDefault();
      finishDrawingConduit();
    }
  };

  const handleCanvasMouseMove = (e) => {
    const coords = clientToSvgCoords(e.clientX, e.clientY);

    if (activeTool === 'draw_conduit') {
      const snapped = applySnap(coords.x, coords.y);
      setCursorSvgPos(snapped);
      return;
    }

    if (draggingObjId) {
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
        placeSymbolAtCoords(coords.x, coords.y);
        return;
      }

      if (activeTool === 'draw_cage') {
        placeCageAtCoords(coords.x, coords.y);
        return;
      }

      if (activeTool === 'draw_conduit') {
        const snapped = applySnap(coords.x, coords.y);
        setDrawingPoints((prev) => [...prev, snapped]);
        setCursorSvgPos(snapped);
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
      prev.map((c) => {
        if (c.id !== selectedCage.id) return c;
        if (field === 'sizeMeters') {
          const meters = Math.max(5, Number(value) || 30);
          const visualPx = Math.round((meters / BASE_CAGE_METERS) * BASE_CAGE_PX);
          return {
            ...c,
            sizeMeters: meters,
            size: visualPx,
            dimensions: `${meters}m x ${meters}m`,
          };
        }
        return { ...c, [field]: value };
      })
    );
  };

  const updateSelectedModule = (field, value) => {
    if (!selectedModule) return;
    setModules((prev) =>
      prev.map((m) => (m.id === selectedModule.id ? { ...m, [field]: value } : m))
    );
  };

  const updateSelectedConduit = (field, value) => {
    if (!selectedConduit) return;
    setConduits((prev) =>
      prev.map((c) => (c.id === selectedConduit.id ? { ...c, [field]: value } : c))
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

  const deleteConduit = (id) => {
    setConduits((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedKind(null);
    }
    notify('Canalización eliminada del plano', 'warn');
  };

  const deleteCage = (id) => {
    setCages((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedKind(null);
    }
    notify('Jaula eliminada del plano', 'warn');
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

  const slugifyCenterFileName = (fallbackPrefix) => {
    const rawName = (
      companyInfo.centerName ||
      companyInfo.projectName ||
      companyInfo.companyName ||
      fallbackPrefix ||
      'plano_centro'
    )
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return rawName || fallbackPrefix;
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
          if (Array.isArray(data.conduits)) setConduits(data.conduits);
          if (Array.isArray(data.symbolCatalog) && data.symbolCatalog.length > 0) {
            setSymbolCatalog(data.symbolCatalog);
            setPlaceTemplate(data.symbolCatalog[0]);
          }
          if (typeof data.trunkLabel === 'string') setTrunkLabel(data.trunkLabel);
          if (typeof data.showTrunkLabel === 'boolean') setShowTrunkLabel(data.showTrunkLabel);
          if (data.companyInfo) {
            setCompanyInfo((prev) => ({ ...prev, ...data.companyInfo }));
            if (data.companyInfo.centerName) setBlueprintNameInput(data.companyInfo.centerName);
          }
          setSelectedId(null);
          notify('Plano cargado exitosamente desde archivo', 'success');
        } else {
          notify('Formato de archivo inválido', 'warn');
        }
      } catch {
        notify('No se pudo leer el archivo', 'warn');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const generateSvgStringForExport = () => {
    const svgEl = svgRef.current;
    if (!svgEl) return null;

    const clone = svgEl.cloneNode(true);
    const exportWidth = 1820;
    const exportHeight = 470;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('viewBox', `40 65 ${exportWidth} ${exportHeight}`);
    clone.setAttribute('width', String(exportWidth));
    clone.setAttribute('height', String(exportHeight));

    const viewportG = clone.querySelector('#plan-viewport');
    if (viewportG) {
      viewportG.setAttribute('transform', 'translate(0, 0) scale(1)');
    }

    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', '40');
    bgRect.setAttribute('y', '65');
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
      canvas.height = 620;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${slugifyCenterFileName('plano_centro')}.png`;
      a.click();
      notify(`Imagen "${slugifyCenterFileName('plano_centro')}.png" descargada`, 'success');
    };
    img.src = url;
  };

  // Agrupación resumida de equipos iguales
  const summarizedEquipment = useMemo(() => {
    const map = new Map();
    objects.forEach((o) => {
      const specKey = (o.spec || '').trim();
      const key = `${specKey}__${o.phase}__${Number(o.power) || 0}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          spec: specKey,
          phase: o.phase,
          unitPower: Number(o.power) || 0,
          totalPower: 0,
          count: 0,
          tags: [],
          modules: new Set(),
          statuses: [],
        });
      }
      const entry = map.get(key);
      entry.count += 1;
      entry.totalPower += Number(o.power) || 0;
      entry.tags.push(o.tag);
      if (o.moduleId) entry.modules.add(o.moduleId);
      entry.statuses.push(o.status);
    });

    return Array.from(map.values()).map((entry) => {
      const hasFault = entry.statuses.includes('falla');
      const hasMaint = entry.statuses.includes('mantencion');
      const summaryStatus = hasFault
        ? 'Con Falla / Alerta'
        : hasMaint
        ? 'En Mantención'
        : 'Operativo';
      return {
        ...entry,
        modulesLabel: Array.from(entry.modules).join(', '),
        tagsLabel: entry.tags.join(', '),
        summaryStatus,
      };
    });
  }, [objects]);

  const handleExportPDF = () => {
    const svgString = generateSvgStringForExport();
    if (!svgString) return;

    const totalWatts = objects.reduce((acc, o) => acc + (Number(o.power) || 0), 0);
    const activePhotoperiodCages = cages.filter((c) => c.photoperiodActive).length;
    const mapsLink = buildGoogleMapsLink(companyInfo.coordinates, companyInfo.googleMapsUrl);
    const printWin = window.open('', '_blank', 'width=1200,height=850');
    if (!printWin) {
      notify('Permite ventanas emergentes para generar el PDF', 'warn');
      return;
    }

    const rowsHtml = summarizedEquipment
      .map(
        (g) => `
        <tr>
          <td style="text-align:center; font-weight:800;">${g.count}</td>
          <td style="font-weight:700; font-size:10px;">${g.tagsLabel}</td>
          <td>${g.modulesLabel}</td>
          <td>${g.spec}</td>
          <td>${PHASE_CONFIG[g.phase]?.label || g.phase}</td>
          <td style="text-align:right;">${g.unitPower} W</td>
          <td style="text-align:right; font-weight:700;">${g.totalPower} W</td>
          <td>${g.summaryStatus}</td>
        </tr>`
      )
      .join('');

    const conduitRowsHtml = conduits
      .map((c) => {
        const m = calculateConduitMetrics(c);
        const pCfg = CONDUIT_PHASE_CONFIG[c.phase] || CONDUIT_PHASE_CONFIG.fase_r;
        return `
        <tr>
          <td style="font-weight:700;">${c.tag}</td>
          <td><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${pCfg.color};margin-right:5px;"></span>${pCfg.label}</td>
          <td>${c.cableSpec || '-'}</td>
          <td style="text-align:right;">${m.horizontalMeters} m</td>
          <td style="text-align:right;">${m.dropMeters} m</td>
          <td style="text-align:right; font-weight:800;">${m.totalMeters} m</td>
        </tr>`;
      })
      .join('');

    const htmlDoc = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>${companyInfo.centerName}</title>
        <style>
          @page { margin: 8mm; }
          body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 12px 16px; }
          .logo-bar { margin-bottom: 8px; }
          .logo { max-height: 46px; max-width: 170px; object-fit: contain; }
          .plan-box { border: 1.5px solid #94a3b8; border-radius: 8px; padding: 6px; background: #f8fafc; margin-bottom: 10px; }
          .plan-box svg { width: 100%; height: auto; max-height: 360px; display: block; }
          .title-block { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10.5px; }
          .title-block td { border: 1.5px solid #0f172a; padding: 5px 8px; }
          .tb-label { font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #475569; display: block; }
          .tb-val { font-size: 11.5px; font-weight: 700; color: #0f172a; }
          .kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin-bottom: 10px; }
          .kpi { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; background: #f1f5f9; }
          .kpi-label { font-size: 9px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .kpi-val { font-size: 13px; font-weight: 800; color: #0f172a; }
          h4 { font-size: 11px; text-transform: uppercase; margin: 10px 0 4px 0; color: #0f172a; }
          table.inv { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 12px; }
          table.inv th, table.inv td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
          table.inv th { background: #0f172a; color: #ffffff; font-weight: 700; }
          .footer-bottom { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; border-top: 1.5px solid #cbd5e1; padding-top: 10px; }
          .company-footer { font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 0.3px; }
          .sign-box { width: 250px; text-align: center; border-top: 1px solid #334155; padding-top: 5px; font-size: 10.5px; }
          .sign-img { max-height: 46px; margin: 0 auto 4px auto; display: block; }
        </style>
      </head>
      <body>
        ${companyInfo.logoDataUrl ? `<div class="logo-bar"><img src="${companyInfo.logoDataUrl}" class="logo" /></div>` : ''}

        <div class="plan-box">${svgString}</div>

        <table class="title-block">
          <tr>
            <td style="width:36%;"><span class="tb-label">Proyecto</span><span class="tb-val">${companyInfo.projectName || '-'}</span></td>
            <td style="width:32%;"><span class="tb-label">Cliente / Mandante</span><span class="tb-val">${companyInfo.clientName || '-'}</span></td>
            <td style="width:32%;"><span class="tb-label">Centro / Pontón</span><span class="tb-val">${companyInfo.centerName || '-'}</span></td>
          </tr>
          <tr>
            <td colspan="2"><span class="tb-label">Descripción del Alcance</span><span>${companyInfo.projectDescription || '-'}</span></td>
            <td><span class="tb-label">Coordenadas Geográficas</span><a href="${mapsLink}" target="_blank" style="color:#0284c7;font-weight:700;">${companyInfo.coordinates || 'Sin coordenadas'}</a></td>
          </tr>
        </table>

        <div class="kpis">
          <div class="kpi"><div class="kpi-label">Jaulas Totales</div><div class="kpi-val">${cages.length} Unidades</div></div>
          <div class="kpi"><div class="kpi-label">Con Fotoperiodo</div><div class="kpi-val">${activePhotoperiodCages} Jaulas</div></div>
          <div class="kpi"><div class="kpi-label">Equipos Instalados</div><div class="kpi-val">${objects.length} Equipos</div></div>
          <div class="kpi"><div class="kpi-label">Potencia Total</div><div class="kpi-val">${(totalWatts / 1000).toFixed(2)} kW</div></div>
          <div class="kpi"><div class="kpi-label">Cableado Total</div><div class="kpi-val">${totalCableMeters} m</div></div>
        </div>

        <h4>1. Resumen de Equipos Instalados</h4>
        <table class="inv">
          <thead>
            <tr>
              <th style="text-align:center;">Cant.</th>
              <th>TAGs Agrupados</th>
              <th>Módulo</th>
              <th>Especificación Técnica</th>
              <th>Circuito / Fase</th>
              <th style="text-align:right;">Pot. Unit.</th>
              <th style="text-align:right;">Pot. Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        ${
          conduits.length > 0
            ? `
        <h4>2. Cubicación de Canalizaciones y Tramos de Cable por Fase</h4>
        <table class="inv">
          <thead>
            <tr>
              <th>TAG Tramo</th>
              <th>Fase Eléctrica</th>
              <th>Conductor / Canalización</th>
              <th style="text-align:right;">Tramo Pasillo</th>
              <th style="text-align:right;">Bajada / Holgura</th>
              <th style="text-align:right;">Total Cable</th>
            </tr>
          </thead>
          <tbody>
            ${conduitRowsHtml}
            <tr style="background:#f1f5f9; font-weight:800;">
              <td colspan="5" style="text-align:right;">TOTAL GENERAL DE CABLE UTILIZADO:</td>
              <td style="text-align:right;">${totalCableMeters} m</td>
            </tr>
          </tbody>
        </table>`
            : ''
        }

        <div class="footer-bottom">
          <div class="company-footer">${companyInfo.companyName || 'SERVICIOS BEQA SPA'}</div>
          <div class="sign-box">
            ${companyInfo.signatureDataUrl ? `<img src="${companyInfo.signatureDataUrl}" class="sign-img" />` : '<div style="height:28px;"></div>'}
            <strong>${companyInfo.responsibleName}</strong><br/>
            <span>${companyInfo.responsibleRole}</span><br/>
            <span style="color:#64748b;">${companyInfo.responsibleLicense}</span>
          </div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `;
    printWin.document.open();
    printWin.document.write(htmlDoc);
    printWin.document.close();
  };

  const filteredObjects = useMemo(() => {
    return objects.filter((obj) => {
      if (filterPhase !== 'all' && obj.phase !== filterPhase) return false;
      if (filterStatus !== 'all' && obj.status !== filterStatus) return false;
      if (filterModule !== 'all' && obj.moduleId !== filterModule) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTag = obj.tag.toLowerCase().includes(q);
        const matchSpec = obj.spec.toLowerCase().includes(q);
        const matchLoc = (obj.locationLabel || '').toLowerCase().includes(q);
        if (!matchTag && !matchSpec && !matchLoc) return false;
      }
      return true;
    });
  }, [objects, filterPhase, filterStatus, filterModule, searchQuery]);

  const metrics = useMemo(() => {
    const totalPower = objects.reduce((sum, o) => sum + (Number(o.power) || 0), 0);
    const activeCages = cages.filter((c) => c.photoperiodActive).length;
    const alertCount = objects.filter((o) => o.status !== 'operativo').length;
    return {
      totalPower,
      totalPowerKw: (totalPower / 1000).toFixed(2),
      activeCages,
      alertCount,
    };
  }, [objects, cages]);

  const renderSymbolGraphic = (obj, isSelected) => {
    const phaseColor = PHASE_CONFIG[obj.phase]?.color || '#0284c7';
    const statusColor = STATUS_CONFIG[obj.status]?.color || '#10b981';
    const rot = Number(obj.rotation) || 0;

    return (
      <g>
        {isSelected && (
          <circle
            r="24"
            fill="none"
            stroke="#0284c7"
            strokeWidth="2"
            strokeDasharray="4 3"
          />
        )}

        {/* Diseño Especial Realista de Proyector LED Industrial */}
        {obj.type === 'luminaria' ? (
          <g>
            <g transform={`rotate(${rot})`}>
              <polygon
                points="10,-12 46,-26 46,26 10,12"
                fill="url(#ledBeamGrad)"
                opacity="0.72"
                pointerEvents="none"
              />
              <line
                x1="13"
                y1="-8"
                x2="40"
                y2="-18"
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />
              <line
                x1="14"
                y1="0"
                x2="43"
                y2="0"
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />
              <line
                x1="13"
                y1="8"
                x2="40"
                y2="18"
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />

              <rect
                x="-16"
                y="-2.4"
                width="4.5"
                height="4.8"
                rx="1.5"
                fill="#1d4ed8"
              />

              <path
                d="M -3,-14.5 L -11.5,-14.5 L -11.5,14.5 L -3,14.5"
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              <rect
                x="-8.5"
                y="-11.5"
                width="4.5"
                height="23"
                rx="1.2"
                fill={darkMode ? '#1e293b' : '#ffffff'}
                stroke="#1d4ed8"
                strokeWidth="1.8"
              />
              <line x1="-8.5" y1="-7.5" x2="-4" y2="-7.5" stroke="#1d4ed8" strokeWidth="1.4" />
              <line x1="-8.5" y1="-3.8" x2="-4" y2="-3.8" stroke="#1d4ed8" strokeWidth="1.4" />
              <line x1="-8.5" y1="0" x2="-4" y2="0" stroke="#1d4ed8" strokeWidth="1.4" />
              <line x1="-8.5" y1="3.8" x2="-4" y2="3.8" stroke="#1d4ed8" strokeWidth="1.4" />
              <line x1="-8.5" y1="7.5" x2="-4" y2="7.5" stroke="#1d4ed8" strokeWidth="1.4" />

              <rect
                x="-4"
                y="-12.5"
                width="13.5"
                height="25"
                rx="3"
                fill={darkMode ? '#0f172a' : '#ffffff'}
                stroke="#1d4ed8"
                strokeWidth="2.2"
              />

              {[-7.5, -2.5, 2.5, 7.5].map((cy, rIdx) =>
                [-0.5, 2.8, 6.1].map((cx, cIdx) => (
                  <circle
                    key={`${rIdx}-${cIdx}`}
                    cx={cx}
                    cy={cy}
                    r="1.05"
                    fill="#1d4ed8"
                  />
                ))
              )}
            </g>
          </g>
        ) : (
          <>
            <circle
              r="17"
              fill={darkMode ? '#0f172a' : '#ffffff'}
              stroke={phaseColor}
              strokeWidth="2.6"
            />
            {obj.type === 'enchufe_220v' && (
              <g>
                <rect x="-8" y="-8" width="16" height="16" rx="4" fill="#2563eb" />
                <circle cx="-3.5" cy="-1.5" r="1.6" fill="#ffffff" />
                <circle cx="3.5" cy="-1.5" r="1.6" fill="#ffffff" />
                <rect x="-1.2" y="2.5" width="2.4" height="3.2" rx="0.6" fill="#fde047" />
              </g>
            )}
            {obj.type === 'fotocelda' && (
              <g>
                <path
                  d="M -10,0 Q 0,-9 10,0 Q 0,9 -10,0 Z"
                  fill="#fef3c7"
                  stroke="#d97706"
                  strokeWidth="1.8"
                />
                <circle r="3.8" fill="#0f172a" />
                <circle cx="-1.2" cy="-1.2" r="1.1" fill="#ffffff" />
              </g>
            )}
            {obj.type === 'tablero' && (
              <g>
                <rect x="-7" y="-8" width="14" height="16" rx="2" fill="#ef4444" />
                <polygon points="1,-5 -3,1 0,1 -1,5 4,-1 1,-1" fill="#ffffff" />
              </g>
            )}
            {obj.type === 'energizador' && (
              <g>
                <circle r="6" fill="#ef4444" />
                <path
                  d="M -10,-6 A 12,12 0 0,1 -10,6 M 10,-6 A 12,12 0 0,0 10,6"
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.8"
                />
              </g>
            )}
            {obj.type === 'sensor' && (
              <g>
                <circle r="6.5" fill="#06b6d4" />
                <circle r="2.5" fill="#ffffff" />
              </g>
            )}
            {obj.type === 'camara' && (
              <g>
                <rect x="-8" y="-5" width="11" height="10" rx="2" fill="#06b6d4" />
                <polygon points="3,-3 9,-6 9,6 3,3" fill="#0891b2" />
              </g>
            )}
            {obj.type === 'alimentador' && (
              <g>
                <polygon points="0,-9 8,6 -8,6" fill="#10b981" />
                <circle r="2.2" fill="#ffffff" />
              </g>
            )}
          </>
        )}

        {/* Indicador de Estado Operativo */}
        <circle
          cx="13"
          cy="-13"
          r="5"
          fill={statusColor}
          stroke={darkMode ? '#0f172a' : '#ffffff'}
          strokeWidth="1.8"
        />

        {/* Etiqueta TAG del equipo */}
        {showLabels && (
          <g transform="translate(0, 26)">
            <rect
              x="-34"
              y="-8"
              width="68"
              height="15"
              rx="4"
              fill={darkMode ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)'}
              stroke={phaseColor}
              strokeWidth="1"
            />
            <text
              textAnchor="middle"
              y="2.5"
              fontSize="8.5"
              fontWeight="800"
              fill={darkMode ? '#f8fafc' : '#0f172a'}
            >
              {obj.tag}
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderPalettePreviewIcon = (iconName) => {
    switch (iconName) {
      case 'sun':
        return (
          <svg viewBox="0 0 32 32" className="w-5 h-5">
            <g transform="translate(13, 18) rotate(-42)">
              <polygon points="6,-8 22,-15 22,15 6,8" fill="#bfdbfe" opacity="0.85" />
              <line x1="8" y1="-4" x2="19" y2="-9" stroke="#2563eb" strokeWidth="1.3" strokeDasharray="2 2" />
              <line x1="8" y1="0" x2="20" y2="0" stroke="#2563eb" strokeWidth="1.3" strokeDasharray="2 2" />
              <line x1="8" y1="4" x2="19" y2="9" stroke="#2563eb" strokeWidth="1.3" strokeDasharray="2 2" />
              <rect x="-11" y="-2" width="3.5" height="4" rx="1" fill="#1d4ed8" />
              <path d="M -2,-10 L -8,-10 L -8,10 L -2,10" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="-3" y="-8.5" width="9" height="17" rx="2" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.8" />
              <circle cx="0" cy="-4" r="1" fill="#1d4ed8" />
              <circle cx="3" cy="-4" r="1" fill="#1d4ed8" />
              <circle cx="0" cy="0" r="1" fill="#1d4ed8" />
              <circle cx="3" cy="0" r="1" fill="#1d4ed8" />
              <circle cx="0" cy="4" r="1" fill="#1d4ed8" />
              <circle cx="3" cy="4" r="1" fill="#1d4ed8" />
            </g>
          </svg>
        );
      case 'plug':
        return <Zap className="w-4 h-4 text-blue-500" />;
      case 'eye':
        return <Eye className="w-4 h-4 text-amber-500" />;
      case 'zap':
        return <Zap className="w-4 h-4 text-rose-500" />;
      case 'radio':
        return <Radio className="w-4 h-4 text-rose-500" />;
      case 'cpu':
        return <Cpu className="w-4 h-4 text-cyan-500" />;
      case 'camera':
        return <Camera className="w-4 h-4 text-cyan-500" />;
      default:
        return <Compass className="w-4 h-4 text-emerald-500" />;
    }
  };

  const mapsHref = buildGoogleMapsLink(companyInfo.coordinates, companyInfo.googleMapsUrl);

  return (
    <div
      ref={appContainerRef}
      className={`h-screen w-screen overflow-hidden flex flex-col select-none ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* ====================================================================
          BARRA SUPERIOR DE HERRAMIENTAS Y ACCIONES
      ==================================================================== */}
      <header
        className={`z-30 border-b px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Identidad Empresa + Botón Nuevo Proyecto */}
        <div className="flex items-center gap-2.5 min-w-0">
          {companyInfo.logoDataUrl ? (
            <img
              src={companyInfo.logoDataUrl}
              alt="Logo"
              className="h-9 max-w-[110px] object-contain rounded-lg border border-slate-200/40 bg-white p-1"
            />
          ) : (
            <div className="h-9 px-2.5 rounded-xl bg-sky-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs">
              <Building2 className="w-4 h-4" />
              <span>BEQA</span>
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-xs sm:text-sm font-extrabold truncate">
                {companyInfo.companyName}
              </h1>
              <button
                onClick={() => setShowCompanyModal(true)}
                className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:bg-sky-500/25 transition-colors"
              >
                Configurar Empresa / Firma
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {companyInfo.centerName} · {companyInfo.projectName}
            </p>
          </div>
        </div>

        {/* Acciones Principales (Sin botón JSON) */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => {
              setNewProjectForm({
                projectName: '',
                projectDescription: '',
                clientName: companyInfo.clientName || '',
                centerName: '',
                coordinates: '',
                googleMapsUrl: '',
                clearExistingObjects: false,
              });
              setShowNewProjectModal(true);
            }}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>Nuevo Proyecto</span>
          </button>

          <button
            onClick={() => {
              setCloudSearchQuery('');
              setShowCloudModal(true);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-sky-300 hover:bg-slate-700'
                : 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-500" />
            <span>Buscar Proyectos ({savedBlueprints.length})</span>
          </button>

          <button
            onClick={() => handleSaveToCloud()}
            disabled={isSavingCloud}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
          >
            <CloudUpload className="w-3.5 h-3.5" />
            <span>{isSavingCloud ? 'Guardando...' : 'Guardar en Nube'}</span>
            <span
              className={`w-2 h-2 rounded-full ${
                cloudStatus === 'connected'
                  ? 'bg-emerald-700'
                  : cloudStatus === 'connecting'
                  ? 'bg-slate-700 animate-pulse'
                  : 'bg-rose-700'
              }`}
            />
          </button>

          <button
            onClick={() => setSnapToWalkway((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-colors ${
              snapToWalkway
                ? 'bg-blue-600 text-white border-blue-600'
                : darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Imán Pasillos</span>
          </button>

          <button
            onClick={() => setShowLabels((v) => !v)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-colors ${
              showLabels
                ? 'bg-indigo-600 text-white border-indigo-600'
                : darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Etiquetas</span>
          </button>

          <button
            onClick={() => setDarkMode((v) => !v)}
            className={`p-1.5 rounded-xl border ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-amber-400'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Modo Oscuro / Claro"
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setShowInventoryModal(true)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Inventario ({objects.length})</span>
          </button>

          <button
            onClick={handleExportPNG}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>PNG</span>
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white flex items-center gap-1"
          >
            <MonitorPlay className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Vista Previa</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => jsonInputRef.current?.click()}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Cargar</span>
          </button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            className="hidden"
          />

          <button
            onClick={toggleFullscreen}
            className={`p-1.5 rounded-xl border ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ====================================================================
          CUERPO PRINCIPAL: PANEL IZQUIERDO + LIENZO CENTRAL + PANEL DERECHO SUPERPUESTO
      ==================================================================== */}
      <div className="relative flex-1 flex overflow-hidden">
        {/* PANEL IZQUIERDO */}
        {showLeftSidebar && (
          <aside
            className={`w-72 shrink-0 border-r overflow-y-auto p-3.5 space-y-4 z-20 ${
              darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            {/* HERRAMIENTAS DE DIBUJO: CANALIZACIÓN POR FASE Y JAULAS */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Herramientas de Trazado
              </span>

              {/* 1. Dibujar Canalización por Fase */}
              <div
                className={`p-2.5 rounded-xl border space-y-2 ${
                  activeTool === 'draw_conduit'
                    ? 'border-rose-500 bg-rose-500/10'
                    : darkMode
                    ? 'border-slate-800 bg-slate-800/50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold flex items-center gap-1.5">
                    <Route className="w-3.5 h-3.5 text-rose-500" />
                    <span>Canalización por Fase</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTool === 'draw_conduit') {
                        setDrawingPoints([]);
                        setCursorSvgPos(null);
                        setActiveTool('select');
                      } else {
                        setDrawingPoints([]);
                        setActiveTool('draw_conduit');
                        notify(
                          `Haz clic en el plano para trazar canalización (${CONDUIT_PHASE_CONFIG[conduitPhase]?.label}). Doble clic o Enter para finalizar.`,
                          'info'
                        );
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors ${
                      activeTool === 'draw_conduit'
                        ? 'bg-rose-600 text-white'
                        : 'bg-sky-600 hover:bg-sky-700 text-white'
                    }`}
                  >
                    {activeTool === 'draw_conduit' ? 'Cancelar' : 'Dibujar'}
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">
                    Fase Eléctrica del Tramo
                  </label>
                  <select
                    value={conduitPhase}
                    onChange={(e) => setConduitPhase(e.target.value)}
                    className={`w-full px-2 py-1.5 rounded-lg text-xs font-bold border ${
                      darkMode
                        ? 'bg-slate-900 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {Object.entries(CONDUIT_PHASE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Bajada / Holgura (m)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={conduitDropMeters}
                      onChange={(e) => setConduitDropMeters(Number(e.target.value))}
                      className={`w-full px-2 py-1 rounded-lg text-xs font-bold border ${
                        darkMode
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div className="flex flex-col justify-end">
                    <div className="px-2 py-1 rounded-lg bg-slate-200/70 dark:bg-slate-900 text-[10px] font-extrabold flex items-center justify-between">
                      <span>Total:</span>
                      <span className="text-sky-600 dark:text-sky-400">{totalCableMeters} m</span>
                    </div>
                  </div>
                </div>

                {/* Leyenda compacta de colores por fase */}
                <div className="grid grid-cols-2 gap-1 pt-1">
                  {Object.entries(CONDUIT_PHASE_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setConduitPhase(key)}
                      className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[10px] font-bold border text-left ${
                        conduitPhase === key
                          ? 'border-sky-500 bg-sky-500/10'
                          : 'border-transparent hover:bg-slate-200/50 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cfg.color }}
                      />
                      <span className="truncate">{cfg.short}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Dibujar Jaula con Tamaño en Metros */}
              <div
                className={`p-2.5 rounded-xl border space-y-2 ${
                  activeTool === 'draw_cage'
                    ? 'border-amber-500 bg-amber-500/10'
                    : darkMode
                    ? 'border-slate-800 bg-slate-800/50'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold flex items-center gap-1.5">
                    <Square className="w-3.5 h-3.5 text-amber-500" />
                    <span>Dibujar Jaula</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTool === 'draw_cage') {
                        setActiveTool('select');
                      } else {
                        setActiveTool('draw_cage');
                        notify(
                          `Haz clic en el plano para ubicar la jaula de ${newCageSizeMeters}m x ${newCageSizeMeters}m`,
                          'info'
                        );
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors ${
                      activeTool === 'draw_cage'
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {activeTool === 'draw_cage' ? 'Cancelar' : 'Ubicar'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Tamaño Jaula (m)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="150"
                      value={newCageSizeMeters}
                      onChange={(e) => setNewCageSizeMeters(Number(e.target.value))}
                      className={`w-full px-2 py-1 rounded-lg text-xs font-extrabold border ${
                        darkMode
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      N° / Etiqueta
                    </label>
                    <input
                      type="text"
                      placeholder="Auto"
                      value={newCageLabelInput}
                      onChange={(e) => setNewCageLabelInput(e.target.value)}
                      className={`w-full px-2 py-1 rounded-lg text-xs font-bold border ${
                        darkMode
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Dimensión: <strong>{newCageSizeMeters}m × {newCageSizeMeters}m</strong>. Define la escala métrica de los cables cercanos.
                </p>
              </div>
            </div>

            {/* Identidad y Firma PDF */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Identidad y Firma PDF
                </span>
                <button
                  onClick={() => setShowCompanyModal(true)}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                >
                  Editar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className={`p-2.5 rounded-xl border border-dashed text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors ${
                    darkMode
                      ? 'border-slate-700 hover:border-sky-500 bg-slate-800/60'
                      : 'border-slate-300 hover:border-sky-500 bg-slate-50'
                  }`}
                >
                  <Upload className="w-4 h-4 text-sky-500" />
                  <span>Insertar Logo</span>
                </button>
                <button
                  onClick={() => signatureInputRef.current?.click()}
                  className={`p-2.5 rounded-xl border border-dashed text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors ${
                    darkMode
                      ? 'border-slate-700 hover:border-emerald-500 bg-slate-800/60'
                      : 'border-slate-300 hover:border-emerald-500 bg-slate-50'
                  }`}
                >
                  <Edit3 className="w-4 h-4 text-emerald-500" />
                  <span>Insertar Firma</span>
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

            {/* PALETA DE SIMBOLOGÍA EDITABLE Y EXTENSIBLE */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Paleta de Simbología
                </span>
                <button
                  onClick={() => {
                    setCatalogForm({
                      editingIndex: null,
                      label: '',
                      icon: 'sun',
                      phase: 'fotoperiodo',
                      power: 1000,
                      rotation: 180,
                    });
                    setIsEditingCatalog((v) => !v);
                  }}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-extrabold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isEditingCatalog ? 'Cerrar' : 'Agregar'}</span>
                </button>
              </div>

              {isEditingCatalog && (
                <form
                  onSubmit={handleSaveCatalogSymbol}
                  className={`p-3 rounded-xl border space-y-2.5 ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700'
                      : 'bg-sky-50/70 border-sky-200'
                  }`}
                >
                  <div className="text-[11px] font-extrabold text-sky-600 dark:text-sky-400 uppercase">
                    {catalogForm.editingIndex !== null
                      ? 'Editar Elemento de Paleta'
                      : 'Nuevo Elemento de Simbología'}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Nombre del Equipo / Símbolo
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Proyector LED 1500W"
                      value={catalogForm.label}
                      onChange={(e) =>
                        setCatalogForm((prev) => ({ ...prev, label: e.target.value }))
                      }
                      className={`w-full px-2.5 py-1.5 text-xs rounded-lg border ${
                        darkMode
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Ícono Gráfico
                      </label>
                      <select
                        value={catalogForm.icon}
                        onChange={(e) =>
                          setCatalogForm((prev) => ({ ...prev, icon: e.target.value }))
                        }
                        className={`w-full px-2 py-1.5 text-xs rounded-lg border ${
                          darkMode
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      >
                        <option value="sun">Proyector LED</option>
                        <option value="plug">Enchufe 220V</option>
                        <option value="eye">Fotocelda</option>
                        <option value="zap">Tablero IP66</option>
                        <option value="radio">Energizador</option>
                        <option value="cpu">Sensor / Sonda</option>
                        <option value="camera">Cámara PTZ</option>
                        <option value="compass">Alimentador</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                        Potencia (W)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={catalogForm.power}
                        onChange={(e) =>
                          setCatalogForm((prev) => ({ ...prev, power: Number(e.target.value) }))
                        }
                        className={`w-full px-2 py-1.5 text-xs rounded-lg border ${
                          darkMode
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Sistema / Circuito
                    </label>
                    <select
                      value={catalogForm.phase}
                      onChange={(e) =>
                        setCatalogForm((prev) => ({ ...prev, phase: e.target.value }))
                      }
                      className={`w-full px-2 py-1.5 text-xs rounded-lg border ${
                        darkMode
                          ? 'bg-slate-900 border-slate-700 text-white'
                          : 'bg-white border-slate-300 text-slate-900'
                      }`}
                    >
                      {Object.entries(PHASE_CONFIG).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold"
                    >
                      {catalogForm.editingIndex !== null ? 'Guardar Cambios' : 'Añadir a Paleta'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingCatalog(false)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}

              {/* Lista de Elementos de la Paleta */}
              <div className="space-y-1.5">
                {symbolCatalog.map((item, idx) => {
                  const isActivePlace =
                    activeTool === 'place' && placeTemplate?.label === item.label;
                  return (
                    <div
                      key={`${item.label}-${idx}`}
                      onClick={() => {
                        setPlaceTemplate(item);
                        setActiveTool('place');
                        notify(`Modo inserción: Haz clic en el plano para ubicar "${item.label}"`, 'info');
                      }}
                      className={`group flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all ${
                        isActivePlace
                          ? 'border-sky-500 bg-sky-500/15 ring-1 ring-sky-500'
                          : darkMode
                          ? 'border-slate-800 bg-slate-800/50 hover:border-slate-700'
                          : 'border-slate-200 bg-white hover:border-sky-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-900 flex items-center justify-center shrink-0">
                          {renderPalettePreviewIcon(item.icon)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{item.label}</div>
                          <div className="text-[10px] text-slate-400">
                            {PHASE_CONFIG[item.phase]?.label || item.phase} · {item.power}W
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleEditCatalogItem(idx, e)}
                          title="Editar símbolo"
                          className="p-1 rounded-md text-slate-400 hover:text-sky-500 hover:bg-sky-500/10"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCatalogItem(idx, e)}
                          title="Eliminar símbolo"
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Filtros de Capas y Búsqueda */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Filtros de Capas
              </span>

              <input
                type="text"
                placeholder="Buscar TAG o equipo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-3 py-1.5 rounded-xl text-xs border ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-200 text-slate-900'
                }`}
              />

              <select
                value={filterPhase}
                onChange={(e) => setFilterPhase(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs border ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="all">Todos los Circuitos / Fases</option>
                {Object.entries(PHASE_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.label}
                  </option>
                ))}
              </select>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className={`w-full px-2.5 py-1.5 rounded-xl text-xs border ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                <option value="all">Todos los Estados Operativos</option>
                <option value="operativo">Operativo</option>
                <option value="mantencion">En Mantención</option>
                <option value="falla">Falla / Alerta</option>
              </select>
            </div>
          </aside>
        )}

        {/* LIENZO CENTRAL INTERACTIVO */}
        <main className="relative flex-1 overflow-hidden flex flex-col">
          {/* Botones flotantes superiores del lienzo */}
          <div className="absolute top-3 left-3 z-20 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowLeftSidebar((v) => !v)}
              className={`p-2 rounded-xl border shadow-sm ${
                darkMode
                  ? 'bg-slate-900/95 border-slate-700 text-slate-200'
                  : 'bg-white/95 border-slate-200 text-slate-700'
              }`}
              title="Mostrar/Ocultar Paleta Izquierda"
            >
              {showLeftSidebar ? (
                <PanelLeftClose className="w-4 h-4" />
              ) : (
                <PanelLeftOpen className="w-4 h-4" />
              )}
            </button>

            <div
              className={`px-3 py-1.5 rounded-xl border shadow-sm flex flex-wrap items-center gap-3 text-xs font-bold ${
                darkMode
                  ? 'bg-slate-900/95 border-slate-700 text-slate-200'
                  : 'bg-white/95 border-slate-200 text-slate-800'
              }`}
            >
              <span className="flex items-center gap-1 text-sky-500">
                <Grid className="w-3.5 h-3.5" /> {cages.length} Jaulas
              </span>
              <span className="flex items-center gap-1 text-amber-500">
                <Sun className="w-3.5 h-3.5" /> {metrics.activeCages} con Fotoperiodo
              </span>
              <span className="flex items-center gap-1 text-emerald-500">
                <Zap className="w-3.5 h-3.5" /> {metrics.totalPowerKw} kW
              </span>
              <span className="flex items-center gap-1 text-rose-500">
                <Route className="w-3.5 h-3.5" /> {totalCableMeters} m Cable
              </span>
              {metrics.alertCount > 0 && (
                <span className="flex items-center gap-1 text-rose-500">
                  <AlertTriangle className="w-3.5 h-3.5" /> {metrics.alertCount} Alerta(s)
                </span>
              )}
            </div>

            {activeTool === 'place' && (
              <div className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-extrabold shadow-md flex items-center gap-2">
                <span>Haz clic en el plano para insertar: {placeTemplate?.label}</span>
                <button
                  onClick={() => setActiveTool('select')}
                  className="px-1.5 py-0.5 bg-white/20 rounded-md hover:bg-white/30"
                >
                  Cancelar
                </button>
              </div>
            )}

            {activeTool === 'draw_cage' && (
              <div className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-extrabold shadow-md flex items-center gap-2">
                <span>
                  Haz clic en el plano para ubicar Jaula ({newCageSizeMeters}m × {newCageSizeMeters}m)
                </span>
                <button
                  onClick={() => setActiveTool('select')}
                  className="px-1.5 py-0.5 bg-white/20 rounded-md hover:bg-white/30"
                >
                  Cancelar
                </button>
              </div>
            )}

            {activeTool === 'draw_conduit' && (
              <div className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-extrabold shadow-md flex items-center gap-2">
                <span>
                  Trazando {CONDUIT_PHASE_CONFIG[conduitPhase]?.label} ({drawingPoints.length} ptos)
                </span>
                {drawingPoints.length >= 2 && (
                  <button
                    onClick={() => finishDrawingConduit()}
                    className="px-2 py-0.5 bg-emerald-500 text-slate-950 rounded-md hover:bg-emerald-400 font-extrabold"
                  >
                    Finalizar Tramo
                  </button>
                )}
                <button
                  onClick={() => {
                    setDrawingPoints([]);
                    setCursorSvgPos(null);
                    setActiveTool('select');
                  }}
                  className="px-1.5 py-0.5 bg-white/20 rounded-md hover:bg-white/30"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Botón flotante para abrir el inspector derecho */}
          {!showRightSidebar && (
            <button
              onClick={() => setShowRightSidebar(true)}
              className={`absolute top-3 right-3 z-20 px-3 py-2 rounded-xl border shadow-md text-xs font-extrabold flex items-center gap-1.5 ${
                darkMode
                  ? 'bg-slate-900 border-slate-700 text-sky-400'
                  : 'bg-white border-slate-200 text-sky-700'
              }`}
            >
              <PanelRightOpen className="w-4 h-4" />
              <span>Inspector</span>
            </button>
          )}

          {/* SVG DEL PLANO */}
          <svg
            ref={svgRef}
            onMouseDown={handleCanvasMouseDown}
            onDoubleClick={handleCanvasDoubleClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseUp}
            onWheel={handleWheel}
            onTouchStart={handleCanvasTouchStart}
            onTouchMove={handleCanvasTouchMove}
            onTouchEnd={handleCanvasTouchEnd}
            className={`w-full flex-1 touch-none ${
              activeTool !== 'select'
                ? 'cursor-crosshair'
                : isPanning
                ? 'cursor-grabbing'
                : 'cursor-grab'
            }`}
            style={{
              backgroundColor: darkMode ? '#020617' : '#e0f2fe',
            }}
          >
            <defs>
              <pattern id="seaGrid" width="32" height="32" patternUnits="userSpaceOnUse">
                <path
                  d="M 32 0 L 0 0 0 32"
                  fill="none"
                  stroke={darkMode ? '#0f172a' : '#bae6fd'}
                  strokeWidth="1"
                />
              </pattern>
              <radialGradient id="cageLightGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fde047" stopOpacity="0.65" />
                <stop offset="65%" stopColor="#f59e0b" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="ledBeamGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.06" />
              </linearGradient>
            </defs>

            <rect width="100%" height="100%" fill="url(#seaGrid)" />

            <g id="plan-viewport" transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Estructuras de Módulos y Pasillos */}
              {modules.map((mod) => {
                const totalW = mod.cols * (mod.cageSize + mod.walkwayWidth) + mod.walkwayWidth;
                const totalH = mod.rows * (mod.cageSize + mod.walkwayWidth) + mod.walkwayWidth;
                const boxX = mod.originX - mod.walkwayWidth;
                const boxY = mod.originY - mod.walkwayWidth;

                return (
                  <g key={mod.id}>
                    <g
                      transform={`translate(${boxX}, ${boxY - 54})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedModuleId(mod.id);
                        setSelectedId(mod.id);
                        setSelectedKind('module');
                        setShowRightSidebar(true);
                      }}
                      className="cursor-pointer"
                    >
                      <rect
                        width="320"
                        height="44"
                        rx="10"
                        fill={darkMode ? '#0f172a' : '#ffffff'}
                        stroke={selectedModuleId === mod.id && selectedKind === 'module' ? '#0284c7' : '#94a3b8'}
                        strokeWidth="1.8"
                      />
                      <text
                        x="14"
                        y="19"
                        fontSize="14"
                        fontWeight="800"
                        fill={darkMode ? '#f8fafc' : '#0f172a'}
                      >
                        {mod.name}
                      </text>
                      <text
                        x="14"
                        y="34"
                        fontSize="10.5"
                        fontWeight="600"
                        fill={darkMode ? '#94a3b8' : '#475569'}
                      >
                        {mod.subtitle}
                      </text>
                    </g>

                    <rect
                      x={boxX}
                      y={boxY}
                      width={totalW}
                      height={totalH}
                      rx="12"
                      fill={darkMode ? '#334155' : '#64748b'}
                      stroke={darkMode ? '#475569' : '#334155'}
                      strokeWidth="2.5"
                    />
                  </g>
                );
              })}

              {/* Línea Troncal Submarina entre Módulos */}
              <g>
                <line
                  x1="888"
                  y1="280"
                  x2="1104"
                  y2="280"
                  stroke="#0284c7"
                  strokeWidth="4"
                  strokeDasharray="10 6"
                />
                {showTrunkLabel && (
                  <g
                    transform="translate(996, 266)"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId('TRUNK');
                      setSelectedKind('trunk');
                      setShowRightSidebar(true);
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      x="-74"
                      y="-13"
                      width="148"
                      height="22"
                      rx="8"
                      fill={darkMode ? '#0f172a' : '#ffffff'}
                      stroke="#0284c7"
                      strokeWidth="1.5"
                    />
                    <text
                      textAnchor="middle"
                      y="2"
                      fontSize="10.5"
                      fontWeight="800"
                      fill={darkMode ? '#38bdf8' : '#0369a1'}
                    >
                      {trunkLabel}
                    </text>
                  </g>
                )}
              </g>

              {/* Jaulas de Cultivo */}
              {cages.map((cage) => {
                const isSel = selectedKind === 'cage' && selectedId === cage.id;
                const displayText = cage.label !== undefined ? cage.label : String(cage.number);
                const cMeters = Number(cage.sizeMeters) || BASE_CAGE_METERS;

                return (
                  <g
                    key={cage.id}
                    transform={`translate(${cage.x}, ${cage.y})`}
                    onClick={(e) => {
                      if (activeTool !== 'select') return;
                      e.stopPropagation();
                      setSelectedId(cage.id);
                      setSelectedKind('cage');
                      setShowRightSidebar(true);
                    }}
                    className="cursor-pointer"
                  >
                    <rect
                      width={cage.size}
                      height={cage.size}
                      rx="6"
                      fill={darkMode ? '#0c4a6e' : '#bae6fd'}
                      stroke={isSel ? '#f59e0b' : darkMode ? '#38bdf8' : '#0284c7'}
                      strokeWidth={isSel ? '3' : '1.8'}
                    />

                    {/* Halo de Fotoperiodo Activo */}
                    {cage.photoperiodActive && (
                      <>
                        <circle
                          cx={cage.size / 2}
                          cy={cage.size / 2}
                          r={cage.size * 0.44}
                          fill="url(#cageLightGlow)"
                        />
                        <circle
                          cx={cage.size - 14}
                          cy="14"
                          r="5"
                          fill="#f59e0b"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                        />
                      </>
                    )}

                    {/* Etiqueta de la jaula */}
                    {cage.showLabel !== false && displayText !== '' && (
                      <text
                        x={cage.size / 2}
                        y={cage.size / 2 + 2}
                        textAnchor="middle"
                        fontSize="15"
                        fontWeight="800"
                        fill={darkMode ? '#f0f9ff' : '#0f172a'}
                      >
                        {displayText}
                      </text>
                    )}

                    {/* Cota de dimensión real en metros */}
                    <text
                      x={cage.size / 2}
                      y={cage.size - 8}
                      textAnchor="middle"
                      fontSize="9"
                      fontWeight="700"
                      fill={darkMode ? '#7dd3fc' : '#0369a1'}
                    >
                      {cMeters}×{cMeters}m
                    </text>
                  </g>
                );
              })}

              {/* Canalizaciones Eléctricas Diferenciadas por Fase */}
              {conduits.map((conduit) => {
                const pts = conduit.points || [];
                if (pts.length < 2) return null;
                const isSel = selectedKind === 'conduit' && selectedId === conduit.id;
                const pCfg = CONDUIT_PHASE_CONFIG[conduit.phase] || CONDUIT_PHASE_CONFIG.fase_r;
                const metrics = calculateConduitMetrics(conduit);
                const pointsStr = pts.map((p) => `${p.x},${p.y}`).join(' ');

                // Punto medio del tramo más largo para ubicar la etiqueta de metraje
                let labelPt = pts[0];
                let maxSegLen = -1;
                for (let i = 0; i < pts.length - 1; i++) {
                  const d = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
                  if (d > maxSegLen) {
                    maxSegLen = d;
                    labelPt = {
                      x: (pts[i].x + pts[i + 1].x) / 2,
                      y: (pts[i].y + pts[i + 1].y) / 2,
                    };
                  }
                }

                return (
                  <g
                    key={conduit.id}
                    onClick={(e) => {
                      if (activeTool !== 'select') return;
                      e.stopPropagation();
                      setSelectedId(conduit.id);
                      setSelectedKind('conduit');
                      setShowRightSidebar(true);
                    }}
                    className="cursor-pointer"
                  >
                    {/* Área invisible ancha para facilitar selección con clic */}
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="14"
                    />
                    {/* Halo de selección */}
                    {isSel && (
                      <polyline
                        points={pointsStr}
                        fill="none"
                        stroke="#fde047"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity="0.8"
                      />
                    )}
                    {/* Trazo principal por fase */}
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke={pCfg.color}
                      strokeWidth={isSel ? '4.5' : '3.5'}
                      strokeDasharray={pCfg.dashArray === 'none' ? undefined : pCfg.dashArray}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Nodos de vértices */}
                    {pts.map((pt, idx) => (
                      <circle
                        key={idx}
                        cx={pt.x}
                        cy={pt.y}
                        r={isSel ? '4.5' : '3'}
                        fill={pCfg.color}
                        stroke="#ffffff"
                        strokeWidth="1.2"
                      />
                    ))}
                    {/* Etiqueta de fase y metros calculados */}
                    {showLabels && (
                      <g transform={`translate(${labelPt.x}, ${labelPt.y - 12})`}>
                        <rect
                          x="-44"
                          y="-9"
                          width="88"
                          height="16"
                          rx="5"
                          fill={darkMode ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.96)'}
                          stroke={pCfg.color}
                          strokeWidth="1.3"
                        />
                        <text
                          textAnchor="middle"
                          y="2"
                          fontSize="8.5"
                          fontWeight="800"
                          fill={pCfg.color}
                        >
                          {pCfg.short} · {metrics.totalMeters}m
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Previsualización en vivo mientras se dibuja una canalización */}
              {activeTool === 'draw_conduit' && drawingPoints.length > 0 && (
                <g pointerEvents="none">
                  {(() => {
                    const pCfg = CONDUIT_PHASE_CONFIG[conduitPhase] || CONDUIT_PHASE_CONFIG.fase_r;
                    const previewPts = cursorSvgPos
                      ? [...drawingPoints, cursorSvgPos]
                      : drawingPoints;
                    const ptsStr = previewPts.map((p) => `${p.x},${p.y}`).join(' ');
                    const tempMetrics = calculateConduitMetrics({
                      points: previewPts,
                      dropMeters: conduitDropMeters,
                    });
                    const lastPt = previewPts[previewPts.length - 1];

                    return (
                      <>
                        <polyline
                          points={ptsStr}
                          fill="none"
                          stroke={pCfg.color}
                          strokeWidth="3.5"
                          strokeDasharray="6 4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {drawingPoints.map((pt, idx) => (
                          <circle
                            key={idx}
                            cx={pt.x}
                            cy={pt.y}
                            r="4.5"
                            fill={pCfg.color}
                            stroke="#ffffff"
                            strokeWidth="1.5"
                          />
                        ))}
                        {lastPt && (
                          <g transform={`translate(${lastPt.x + 14}, ${lastPt.y - 14})`}>
                            <rect
                              x="0"
                              y="-11"
                              width="92"
                              height="19"
                              rx="5"
                              fill="#0f172a"
                              stroke={pCfg.color}
                              strokeWidth="1.5"
                            />
                            <text
                              x="46"
                              y="1.5"
                              textAnchor="middle"
                              fontSize="9.5"
                              fontWeight="800"
                              fill="#ffffff"
                            >
                              {tempMetrics.totalMeters} m ({pCfg.short})
                            </text>
                          </g>
                        )}
                      </>
                    );
                  })()}
                </g>
              )}

              {/* Equipos Eléctricos y Luminarias */}
              {filteredObjects.map((obj) => {
                const isSel = selectedKind === 'object' && selectedId === obj.id;
                return (
                  <g
                    key={obj.id}
                    transform={`translate(${obj.x}, ${obj.y})`}
                    onMouseDown={(e) => {
                      if (activeTool !== 'select') return;
                      e.stopPropagation();
                      setSelectedId(obj.id);
                      setSelectedKind('object');
                      setDraggingObjId(obj.id);
                      setShowRightSidebar(true);
                    }}
                    onTouchStart={(e) => {
                      if (activeTool !== 'select') return;
                      e.stopPropagation();
                      setSelectedId(obj.id);
                      setSelectedKind('object');
                      setDraggingObjId(obj.id);
                      setShowRightSidebar(true);
                    }}
                    onMouseEnter={() => setHoveredObj(obj)}
                    onMouseLeave={() => setHoveredObj(null)}
                    className="cursor-move"
                  >
                    {renderSymbolGraphic(obj, isSel)}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Controles inferiores de Zoom */}
          <div className="absolute bottom-24 left-3 z-20 flex items-center gap-1.5">
            <div
              className={`px-2 py-1 rounded-xl border shadow-sm flex items-center gap-1 text-xs font-bold ${
                darkMode
                  ? 'bg-slate-900/95 border-slate-700 text-slate-200'
                  : 'bg-white/95 border-slate-200 text-slate-800'
              }`}
            >
              <button
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                className="p-1 hover:text-sky-500"
                title="Alejar"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-1.5">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                className="p-1 hover:text-sky-500"
                title="Acercar"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  setZoom(0.84);
                  setPan({ x: 24, y: 14 });
                }}
                className="p-1 hover:text-sky-500 border-l border-slate-200 dark:border-slate-700 pl-1.5"
                title="Centrar Plano"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ================================================================
              CUADRO INFERIOR DE INFORMACIÓN DEL PROYECTO (VIÑETA TÉCNICA)
          ================================================================ */}
          <div
            className={`z-20 border-t-2 px-4 py-2.5 shadow-md ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-900 text-slate-900'
            }`}
          >
            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-center text-xs">
              <div className="lg:col-span-2 border-l-4 border-sky-600 pl-2.5 min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Proyecto
                </div>
                <div className="font-extrabold truncate">
                  {companyInfo.projectName || 'Sin nombre de proyecto'}
                </div>
                {companyInfo.projectDescription && (
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {companyInfo.projectDescription}
                  </div>
                )}
              </div>

              <div className="border-l border-slate-200 dark:border-slate-700 pl-2.5 min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Cliente
                </div>
                <div className="font-bold truncate">
                  {companyInfo.clientName || 'No especificado'}
                </div>
              </div>

              <div className="border-l border-slate-200 dark:border-slate-700 pl-2.5 min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Centro / Ubicación
                </div>
                <div className="font-bold truncate">
                  {companyInfo.centerName || 'No especificado'}
                </div>
              </div>

              <div className="border-l border-slate-200 dark:border-slate-700 pl-2.5 min-w-0">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Coordenadas / Mapa
                </div>
                {companyInfo.coordinates ? (
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 truncate"
                    title="Abrir ubicación en Google Maps"
                  >
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{companyInfo.coordinates}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-slate-400">Sin coordenadas</span>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* ====================================================================
            PANEL DERECHO DESPLEGABLE SUPERPUESTO Y TOTALMENTE OPACO (z-50)
        ==================================================================== */}
        {showRightSidebar && (
          <aside
            className={`fixed top-14 right-0 bottom-0 w-80 sm:w-96 z-50 border-l-2 shadow-2xl overflow-y-auto p-4 space-y-4 ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            {/* Cabecera del Inspector */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-sky-500" />
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  Panel Inspector
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAutoHideRightPanel((v) => !v)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${
                    autoHideRightPanel
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  Auto-ocultar: {autoHideRightPanel ? 'ON' : 'OFF'}
                </button>
                <button
                  onClick={() => setShowRightSidebar(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800"
                  title="Cerrar panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* EDITOR DE EQUIPO SELECCIONADO */}
            {selectedObject ? (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-sky-500">
                      Equipo / Luminaria Seleccionada
                    </span>
                    <h2 className="text-lg font-extrabold">{selectedObject.tag}</h2>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => duplicateObject(selectedObject)}
                      className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:bg-sky-500/25"
                      title="Duplicar equipo"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteObject(selectedObject.id)}
                      className="p-2 rounded-xl bg-rose-500/15 text-rose-600 hover:bg-rose-500/25"
                      title="Eliminar equipo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Identificador (TAG)</label>
                  <input
                    type="text"
                    value={selectedObject.tag}
                    onChange={(e) => updateSelectedObject('tag', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-bold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Especificación Técnica</label>
                  <input
                    type="text"
                    value={selectedObject.spec}
                    onChange={(e) => updateSelectedObject('spec', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold mb-1">Sistema / Circuito</label>
                    <select
                      value={selectedObject.phase}
                      onChange={(e) => updateSelectedObject('phase', e.target.value)}
                      className={`w-full px-2.5 py-2 rounded-xl text-xs border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
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
                    <label className="block text-xs font-bold mb-1">Potencia (W)</label>
                    <input
                      type="number"
                      value={selectedObject.power}
                      onChange={(e) => updateSelectedObject('power', Number(e.target.value))}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                {/* ORIENTACIÓN / ÁNGULO DIGITANDO EL NÚMERO + SLIDER */}
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span>Orientación / Ángulo del Haz (°)</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="360"
                        step="1"
                        value={selectedObject.rotation ?? 0}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          const clamped = Number.isNaN(val)
                            ? 0
                            : ((val % 360) + 360) % 360;
                          updateSelectedObject('rotation', val === 360 ? 360 : clamped);
                        }}
                        className={`w-20 px-2 py-1 rounded-lg text-right text-xs font-extrabold border ${
                          darkMode
                            ? 'bg-slate-800 border-slate-600 text-sky-400'
                            : 'bg-slate-50 border-slate-300 text-sky-700'
                        }`}
                      />
                      <span className="text-sky-500 font-extrabold">°</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={selectedObject.rotation ?? 0}
                    onChange={(e) => updateSelectedObject('rotation', Number(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">Estado Operativo</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        onClick={() => updateSelectedObject('status', key)}
                        className={`py-2 px-2 rounded-xl text-[11px] font-extrabold border transition-all ${
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
                  <label className="block text-xs font-bold mb-1">Ubicación en Pasillo</label>
                  <input
                    type="text"
                    value={selectedObject.locationLabel || ''}
                    onChange={(e) => updateSelectedObject('locationLabel', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            ) : selectedConduit ? (
              /* EDITOR DE CANALIZACIÓN SELECCIONADA */
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-rose-500">
                      Canalización / Tramo Eléctrico
                    </span>
                    <h2 className="text-lg font-extrabold">{selectedConduit.tag}</h2>
                  </div>
                  <button
                    onClick={() => deleteConduit(selectedConduit.id)}
                    className="p-2 rounded-xl bg-rose-500/15 text-rose-600 hover:bg-rose-500/25"
                    title="Eliminar canalización"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Identificador de Tramo (TAG)</label>
                  <input
                    type="text"
                    value={selectedConduit.tag}
                    onChange={(e) => updateSelectedConduit('tag', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-bold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Fase Eléctrica</label>
                  <select
                    value={selectedConduit.phase}
                    onChange={(e) => updateSelectedConduit('phase', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    {Object.entries(CONDUIT_PHASE_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Tipo de Conductor / Cable</label>
                  <input
                    type="text"
                    value={selectedConduit.cableSpec || ''}
                    onChange={(e) => updateSelectedConduit('cableSpec', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Bajada a Equipo / Holgura (m)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={selectedConduit.dropMeters ?? 0}
                    onChange={(e) => updateSelectedConduit('dropMeters', Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {(() => {
                  const m = calculateConduitMetrics(selectedConduit);
                  return (
                    <div
                      className={`p-3 rounded-xl border space-y-1.5 ${
                        darkMode
                          ? 'bg-slate-800/80 border-slate-700'
                          : 'bg-sky-50 border-sky-200'
                      }`}
                    >
                      <div className="text-[10px] font-extrabold uppercase text-sky-600 dark:text-sky-400">
                        Cálculo Automático (Escala Jaula)
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Recorrido en pasillo:</span>
                        <span className="font-bold">{m.horizontalMeters} m</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>Bajada / holgura:</span>
                        <span className="font-bold">{m.dropMeters} m</span>
                      </div>
                      <div className="flex justify-between text-sm font-extrabold border-t border-slate-300 dark:border-slate-700 pt-1.5 text-sky-600 dark:text-sky-400">
                        <span>Total Cable Tramo:</span>
                        <span>{m.totalMeters} m</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : selectedCage ? (
              /* EDITOR DE JAULA SELECCIONADA */
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-sky-500">
                      Jaula Seleccionada
                    </span>
                    <h2 className="text-lg font-extrabold">
                      Jaula {selectedCage.label || selectedCage.number}
                    </h2>
                  </div>
                  <button
                    onClick={() => deleteCage(selectedCage.id)}
                    className="p-2 rounded-xl bg-rose-500/15 text-rose-600 hover:bg-rose-500/25"
                    title="Eliminar jaula"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold">Nombre / Número de Jaula</label>
                    <button
                      type="button"
                      onClick={() => {
                        updateSelectedCage('label', '');
                        updateSelectedCage('showLabel', false);
                        notify('Texto de la jaula eliminado', 'info');
                      }}
                      className="text-[11px] font-bold text-rose-500 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Eliminar Texto</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={selectedCage.label !== undefined ? selectedCage.label : String(selectedCage.number)}
                    onChange={(e) => {
                      updateSelectedCage('label', e.target.value);
                      updateSelectedCage('showLabel', true);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-bold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    Tamaño Real de la Jaula (metros por lado)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="150"
                    value={selectedCage.sizeMeters || BASE_CAGE_METERS}
                    onChange={(e) => updateSelectedCage('sizeMeters', Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-extrabold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-sky-400'
                        : 'bg-slate-50 border-slate-200 text-sky-700'
                    }`}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Dimensiones: {selectedCage.sizeMeters || 30}m × {selectedCage.sizeMeters || 30}m (recalcula automáticamente los tramos de cable).
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold">Fotoperiodo Activo en Jaula</span>
                  <input
                    type="checkbox"
                    checked={Boolean(selectedCage.photoperiodActive)}
                    onChange={(e) => updateSelectedCage('photoperiodActive', e.target.checked)}
                    className="w-4 h-4 accent-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Especie en Cultivo</label>
                  <input
                    type="text"
                    value={selectedCage.species || ''}
                    onChange={(e) => updateSelectedCage('species', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            ) : selectedModule ? (
              /* EDITOR DE TÍTULO DE MÓDULO */
              <div className="space-y-3.5">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-sky-500">
                    Encabezado de Módulo
                  </span>
                  <h2 className="text-lg font-extrabold">{selectedModule.name}</h2>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Título del Módulo</label>
                  <input
                    type="text"
                    value={selectedModule.name}
                    onChange={(e) => updateSelectedModule('name', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-bold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Subtítulo / Descripción</label>
                  <input
                    type="text"
                    value={selectedModule.subtitle}
                    onChange={(e) => updateSelectedModule('subtitle', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            ) : selectedKind === 'trunk' ? (
              /* EDITOR DE ETIQUETA TRONCAL */
              <div className="space-y-3.5">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-sky-500">
                    Etiqueta Troncal
                  </span>
                  <h2 className="text-lg font-extrabold">Línea Interconexión</h2>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold">Texto Troncal</label>
                    <button
                      type="button"
                      onClick={() => setShowTrunkLabel(false)}
                      className="text-[11px] font-bold text-rose-500 hover:underline"
                    >
                      Ocultar / Eliminar
                    </button>
                  </div>
                  <input
                    type="text"
                    value={trunkLabel}
                    onChange={(e) => {
                      setTrunkLabel(e.target.value);
                      setShowTrunkLabel(true);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-bold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            ) : (
              /* RESUMEN DE CABLEADO POR FASE CUANDO NO HAY ELEMENTO SELECCIONADO */
              <div className="space-y-3">
                <div className="text-xs text-slate-500 text-center py-2">
                  <Info className="w-6 h-6 mx-auto text-sky-500 opacity-80 mb-1" />
                  <p>
                    Haz clic sobre cualquier <strong>equipo, canalización, jaula o módulo</strong> para editarlo.
                  </p>
                </div>

                <div
                  className={`p-3 rounded-xl border space-y-2 ${
                    darkMode
                      ? 'bg-slate-800/60 border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    Cubicación de Cable por Fase
                  </div>
                  {cableSummaryByPhase.map((item) => (
                    <div
                      key={item.phase}
                      className="flex items-center justify-between text-xs py-1 border-b last:border-b-0 border-slate-200/60 dark:border-slate-700/60"
                    >
                      <span className="flex items-center gap-1.5 font-bold">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span>{item.label}</span>
                      </span>
                      <span className="font-extrabold">{item.totalMeters} m</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs font-extrabold pt-1 text-sky-600 dark:text-sky-400">
                    <span>Total Cableado:</span>
                    <span>{totalCableMeters} m</span>
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ====================================================================
          MODAL: NUEVO PROYECTO (CON COORDENADAS Y GOOGLE MAPS)
      ==================================================================== */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5" />
                <div>
                  <h3 className="text-base font-extrabold">Nuevo Proyecto de Instalación</h3>
                  <p className="text-xs text-emerald-100">
                    Configura la viñeta técnica, ubicación geográfica y datos del centro
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNewProjectModal(false)}
                className="p-1 rounded-lg hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewProject} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-bold mb-1">Nombre del Proyecto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Instalación Fotoperiodo Tren Norte y Sur"
                  value={newProjectForm.projectName}
                  onChange={(e) =>
                    setNewProjectForm((prev) => ({ ...prev, projectName: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border text-sm font-semibold ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Descripción del Proyecto</label>
                <textarea
                  rows={2}
                  placeholder="Breve resumen técnico del alcance, potencia o equipamiento..."
                  value={newProjectForm.projectDescription}
                  onChange={(e) =>
                    setNewProjectForm((prev) => ({ ...prev, projectDescription: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border text-xs ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Nombre del Cliente *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Salmones Austral S.A."
                    value={newProjectForm.clientName}
                    onChange={(e) =>
                      setNewProjectForm((prev) => ({ ...prev, clientName: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Nombre del Centro *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Centro Engorda Canal Dalcahue"
                    value={newProjectForm.centerName}
                    onChange={(e) =>
                      setNewProjectForm((prev) => ({ ...prev, centerName: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Coordenadas (Lat, Lon)</label>
                  <input
                    type="text"
                    placeholder="Ej. -42.381240, -73.654120"
                    value={newProjectForm.coordinates}
                    onChange={(e) =>
                      setNewProjectForm((prev) => ({ ...prev, coordinates: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-mono ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-bold mb-1">Enlace Google Maps (Opcional)</label>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/..."
                    value={newProjectForm.googleMapsUrl}
                    onChange={(e) =>
                      setNewProjectForm((prev) => ({ ...prev, googleMapsUrl: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newProjectForm.clearExistingObjects}
                  onChange={(e) =>
                    setNewProjectForm((prev) => ({
                      ...prev,
                      clearExistingObjects: e.target.checked,
                    }))
                  }
                  className="w-4 h-4 accent-emerald-600"
                />
                <span className="text-xs font-semibold">
                  Iniciar con el plano limpio (sin equipos ni canalizaciones previas)
                </span>
              </label>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-xl font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Crear Nuevo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: BUSCAR Y GESTIONAR PROYECTOS GUARDADOS EN CLOUD FIRESTORE
      ==================================================================== */}
      {showCloudModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="text-base font-extrabold">
                    Buscar Proyectos Guardados en Base de Datos
                  </h3>
                  <p className="text-xs text-slate-400">
                    Carga cualquier centro o proyecto guardado anteriormente en Firebase
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCloudModal(false)}
                className="p-1 rounded-lg hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  autoFocus
                  placeholder="Buscar por nombre de centro, proyecto, cliente o empresa..."
                  value={cloudSearchQuery}
                  onChange={(e) => setCloudSearchQuery(e.target.value)}
                  className={`flex-1 px-3.5 py-2 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  onClick={() => handleSaveToCloud()}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Guardar Actual</span>
                </button>
              </div>

              {filteredBlueprints.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl text-xs text-slate-500">
                  No se encontraron proyectos con ese criterio en la nube.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredBlueprints.map((bp) => (
                    <div
                      key={bp.id}
                      className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        bp.id === currentBlueprintId
                          ? 'border-sky-500 bg-sky-500/10'
                          : darkMode
                          ? 'border-slate-800 bg-slate-800/60'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm truncate">
                            {bp.centerName || bp.title || bp.id}
                          </span>
                          {bp.id === currentBlueprintId && (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-sky-600 text-white">
                              Abierto
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {bp.projectName || 'Proyecto'} {bp.clientName ? `· Cliente: ${bp.clientName}` : ''}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {bp.totalObjects || 0} equipos · Actualizado:{' '}
                          {bp.updatedAt ? new Date(bp.updatedAt).toLocaleString('es-CL') : '-'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleLoadFromCloud(bp)}
                          className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold"
                        >
                          Abrir Proyecto
                        </button>
                        <button
                          onClick={() => handleDeleteFromCloud(bp.id, bp.title || bp.id)}
                          className="p-1.5 rounded-xl text-rose-500 hover:bg-rose-500/15"
                          title="Eliminar de la nube"
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
      )}

      {/* ====================================================================
          MODAL: CONFIGURAR EMPRESA Y FIRMA TÉCNICA
      ==================================================================== */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-5 py-4 bg-slate-950 text-white flex items-center justify-between">
              <h3 className="text-base font-extrabold">Datos de Empresa y Viñeta Técnica</h3>
              <button onClick={() => setShowCompanyModal(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block font-bold mb-1">Empresa Ejecutora</label>
                <input
                  type="text"
                  value={companyInfo.companyName}
                  onChange={(e) =>
                    setCompanyInfo((p) => ({ ...p, companyName: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Nombre del Proyecto</label>
                <input
                  type="text"
                  value={companyInfo.projectName}
                  onChange={(e) =>
                    setCompanyInfo((p) => ({ ...p, projectName: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                  }`}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Cliente</label>
                  <input
                    type="text"
                    value={companyInfo.clientName || ''}
                    onChange={(e) =>
                      setCompanyInfo((p) => ({ ...p, clientName: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Nombre del Centro</label>
                  <input
                    type="text"
                    value={companyInfo.centerName}
                    onChange={(e) =>
                      setCompanyInfo((p) => ({ ...p, centerName: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">Coordenadas</label>
                  <input
                    type="text"
                    value={companyInfo.coordinates || ''}
                    onChange={(e) =>
                      setCompanyInfo((p) => ({
                        ...p,
                        coordinates: e.target.value,
                        googleMapsUrl: buildGoogleMapsLink(e.target.value),
                      }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border font-mono ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">Responsable Técnico</label>
                  <input
                    type="text"
                    value={companyInfo.responsibleName}
                    onChange={(e) =>
                      setCompanyInfo((p) => ({ ...p, responsibleName: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border ${
                      darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-300'
                    }`}
                  />
                </div>
              </div>
              <div className="pt-3 flex justify-end">
                <button
                  onClick={() => setShowCompanyModal(false)}
                  className="px-5 py-2 rounded-xl bg-sky-600 text-white font-extrabold"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: INVENTARIO TÉCNICO RESUMIDO Y CUBICACIÓN DE CABLE
      ==================================================================== */}
      {showInventoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-4xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${
              darkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-5 py-4 bg-violet-700 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold">
                  Inventario Técnico y Cubicación de Cable ({totalCableMeters} m totales)
                </h3>
                <p className="text-xs text-violet-200">
                  Equipos agrupados y cálculo automático de canalizaciones por fase
                </p>
              </div>
              <button onClick={() => setShowInventoryModal(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto space-y-6">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Equipos Instalados ({objects.length} unidades)
                </h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase">
                      <th className="py-2 px-2 text-center">Cant.</th>
                      <th className="py-2 px-2">TAGs Agrupados</th>
                      <th className="py-2 px-2">Módulo</th>
                      <th className="py-2 px-2">Especificación</th>
                      <th className="py-2 px-2 text-right">Pot. Total</th>
                      <th className="py-2 px-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {summarizedEquipment.map((g) => (
                      <tr
                        key={g.key}
                        onClick={() => {
                          const firstObj = objects.find((o) => o.tag === g.tags[0]);
                          if (firstObj) {
                            setSelectedId(firstObj.id);
                            setSelectedKind('object');
                            setShowInventoryModal(false);
                            setShowRightSidebar(true);
                          }
                        }}
                        className="cursor-pointer hover:bg-sky-500/10"
                      >
                        <td className="py-2.5 px-2 text-center font-extrabold text-sky-600 dark:text-sky-400">
                          {g.count}
                        </td>
                        <td className="py-2.5 px-2 font-bold">{g.tagsLabel}</td>
                        <td className="py-2.5 px-2">{g.modulesLabel}</td>
                        <td className="py-2.5 px-2">{g.spec}</td>
                        <td className="py-2.5 px-2 text-right font-extrabold">{g.totalPower} W</td>
                        <td className="py-2.5 px-2">{g.summaryStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                  Tramos de Canalización y Cable por Fase ({conduits.length} tramos · {totalCableMeters} m)
                </h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 uppercase">
                      <th className="py-2 px-2">TAG Tramo</th>
                      <th className="py-2 px-2">Fase</th>
                      <th className="py-2 px-2">Conductor</th>
                      <th className="py-2 px-2 text-right">Pasillo</th>
                      <th className="py-2 px-2 text-right">Bajada</th>
                      <th className="py-2 px-2 text-right">Total Cable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {conduits.map((c) => {
                      const m = calculateConduitMetrics(c);
                      const pCfg = CONDUIT_PHASE_CONFIG[c.phase] || CONDUIT_PHASE_CONFIG.fase_r;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => {
                            setSelectedId(c.id);
                            setSelectedKind('conduit');
                            setShowInventoryModal(false);
                            setShowRightSidebar(true);
                          }}
                          className="cursor-pointer hover:bg-sky-500/10"
                        >
                          <td className="py-2 px-2 font-bold">{c.tag}</td>
                          <td className="py-2 px-2 font-bold" style={{ color: pCfg.color }}>
                            {pCfg.label}
                          </td>
                          <td className="py-2 px-2">{c.cableSpec}</td>
                          <td className="py-2 px-2 text-right">{m.horizontalMeters} m</td>
                          <td className="py-2 px-2 text-right">{m.dropMeters} m</td>
                          <td className="py-2 px-2 text-right font-extrabold text-sky-600 dark:text-sky-400">
                            {m.totalMeters} m
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: VISTA PREVIA FULLSCREEN
      ==================================================================== */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 flex flex-col p-4">
          <div className="flex items-center justify-between text-white pb-3">
            <div>
              <h3 className="text-sm font-extrabold">
                Vista Previa de Plano · {companyInfo.centerName}
              </h3>
              <p className="text-xs text-slate-400">
                {companyInfo.projectName} · Cliente: {companyInfo.clientName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="px-3.5 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-extrabold flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir / PDF</span>
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-white rounded-2xl overflow-hidden flex items-center justify-center p-4">
            <div
              className="w-full h-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:max-h-full"
              dangerouslySetInnerHTML={{ __html: generateSvgStringForExport() || '' }}
            />
          </div>
        </div>
      )}

      {/* NOTIFICACIÓN FLOTANTE (TOAST) */}
      {toast && (
        <div className="fixed bottom-16 right-4 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}