// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ZoomIn, ZoomOut, Maximize2, Plus, Trash2, Upload,
  Sun, Moon, Image as ImageIcon, CheckCircle2, AlertTriangle,
  Zap, Camera, Radio, Cpu, Compass, Sliders, Edit3, Save, Copy,
  Magnet, Eye, Info, Layers, Grid, Building2, Printer,
  Expand, Minimize, PanelLeftClose, PanelLeftOpen, PanelRightOpen,
  MonitorPlay, X, Cloud, FolderOpen, CloudUpload, MapPin, ExternalLink, FolderPlus,
  Route, Square, Scissors, ClipboardPaste, Undo2, Redo2, Lock, Unlock,
  FlipHorizontal2, FlipVertical2, AlignCenterHorizontal, Palette,
  Type, Circle, Triangle, ArrowRight, Diamond, Minus, PlusCircle
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

// Escala base de referencia y separación estándar fija entre jaulas
const BASE_CAGE_PX = 112;
const BASE_CAGE_METERS = 30;
const STANDARD_WALKWAY_WIDTH = 16;

const TYPE_GENERIC_LABELS = {
  luminaria: 'Proyector LED Fotoperiodo',
  enchufe_220v: 'Enchufe Industrial 220V',
  fotocelda: 'Fotocelda Crepuscular',
  tablero: 'Tablero Eléctrico IP66',
  energizador: 'Energizador / Telemetría',
  sensor: 'Sensor / Sonda Multiparámetro',
  camara: 'Cámara Submarina / PTZ',
  alimentador: 'Selector de Alimentación',
};

// Paleta de 32 colores básicos organizada en 4 filas x 8 columnas
const BASIC_32_COLORS = [
  '#000000', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#ffffff', '#991b1b', '#dc2626',
  '#ef4444', '#f87171', '#c2410c', '#ea580c', '#f97316', '#f59e0b', '#eab308', '#fde047',
  '#4d7c0f', '#65a30d', '#15803d', '#16a34a', '#10b981', '#0d9488', '#0891b2', '#06b6d4',
  '#1e3a8a', '#1d4ed8', '#2563eb', '#3b82f6', '#4f46e5', '#7c3aed', '#a855f7', '#db2777',
];

const BASIC_SHAPES_CATALOG = [
  { shapeType: 'text', label: 'Cuadro de Texto' },
  { shapeType: 'arrow', label: 'Flecha' },
  { shapeType: 'rect', label: 'Cuadrado / Rectángulo' },
  { shapeType: 'circle', label: 'Círculo' },
  { shapeType: 'triangle', label: 'Triángulo' },
  { shapeType: 'diamond', label: 'Rombo' },
  { shapeType: 'line', label: 'Línea' },
];

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
    headerOffsetX: 0,
    headerOffsetY: 0,
    rows: 2,
    cols: 6,
    cageSize: 112,
    cageSizeMeters: 30,
    walkwayWidth: STANDARD_WALKWAY_WIDTH,
    startNumber: 201,
  },
  {
    id: 'MOD-100',
    name: 'MÓDULO 100',
    subtitle: 'Tren Sur - 10 Jaulas de Engorda (101 - 110)',
    originX: 1120,
    originY: 160,
    headerOffsetX: 0,
    headerOffsetY: 0,
    rows: 2,
    cols: 5,
    cageSize: 112,
    cageSizeMeters: 30,
    walkwayWidth: STANDARD_WALKWAY_WIDTH,
    startNumber: 101,
  },
];

const generateCagesFromModules = (modsList) => {
  const cages = [];
  const speciesList = ['Salmón del Atlántico (Salmo salar)', 'Salmón Coho (Oncorhynchus kisutch)'];
  modsList.forEach((mod, mIdx) => {
    let counter = Number(mod.startNumber) || 101;
    const rows = Math.max(1, Number(mod.rows) || 1);
    const cols = Math.max(1, Number(mod.cols) || 1);
    const sizePx = Number(mod.cageSize) || BASE_CAGE_PX;
    const sizeMeters = Number(mod.cageSizeMeters) || BASE_CAGE_METERS;
    const walkway = STANDARD_WALKWAY_WIDTH;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const num = counter++;
        const x = mod.originX + c * (sizePx + walkway);
        const y = mod.originY + r * (sizePx + walkway);
        cages.push({
          id: `JAULA-${mod.id}-${num}-${r}-${c}`,
          number: num,
          label: String(num),
          showLabel: true,
          moduleId: mod.id,
          row: r,
          col: c,
          x,
          y,
          size: sizePx,
          sizeMeters,
          dimensions: `${sizeMeters}m x ${sizeMeters}m`,
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

const generateInitialCages = () => generateCagesFromModules(INITIAL_MODULES);

const INITIAL_OBJECTS = [
  {
    id: 'OBJ-01',
    tag: 'TAB-200-A',
    genericName: 'Tablero Eléctrico IP66',
    brand: 'Schneider Electric',
    type: 'tablero',
    icon: 'zap',
    phase: 'fotoperiodo',
    power: 1200,
    rotation: 0,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Proyector LED Fotoperiodo',
    brand: 'Aqualed',
    type: 'luminaria',
    icon: 'sun',
    phase: 'fotoperiodo',
    power: 1000,
    rotation: 180,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Proyector LED Fotoperiodo',
    brand: 'Aqualed',
    type: 'luminaria',
    icon: 'sun',
    phase: 'fotoperiodo',
    power: 1000,
    rotation: 180,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Proyector LED Fotoperiodo',
    brand: 'Signify / Philips',
    type: 'luminaria',
    icon: 'sun',
    phase: 'fotoperiodo',
    power: 1000,
    rotation: 180,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Energizador / Telemetría',
    brand: 'JVA',
    type: 'energizador',
    icon: 'radio',
    phase: 'cerco_electrico',
    power: 450,
    rotation: 0,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Sensor / Sonda Multiparámetro',
    brand: 'OxyGuard',
    type: 'sensor',
    icon: 'cpu',
    phase: 'monitoreo',
    power: 60,
    rotation: 0,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Cámara Submarina / PTZ',
    brand: 'Hikvision',
    type: 'camara',
    icon: 'camera',
    phase: 'monitoreo',
    power: 85,
    rotation: 0,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Tablero Eléctrico IP66',
    brand: 'Schneider Electric',
    type: 'tablero',
    icon: 'zap',
    phase: 'fotoperiodo',
    power: 1200,
    rotation: 0,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Proyector LED Fotoperiodo',
    brand: 'Aqualed',
    type: 'luminaria',
    icon: 'sun',
    phase: 'fotoperiodo',
    power: 1000,
    rotation: 180,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Proyector LED Fotoperiodo',
    brand: 'Signify / Philips',
    type: 'luminaria',
    icon: 'sun',
    phase: 'fotoperiodo',
    power: 1000,
    rotation: 180,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Sensor / Sonda Multiparámetro',
    brand: 'Innovasea',
    type: 'sensor',
    icon: 'cpu',
    phase: 'monitoreo',
    power: 60,
    rotation: 0,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Selector de Alimentación',
    brand: 'AKVA Group',
    type: 'alimentador',
    icon: 'compass',
    phase: 'alimentacion',
    power: 350,
    rotation: 0,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Enchufe Industrial 220V',
    brand: 'Mennekes',
    type: 'enchufe_220v',
    icon: 'plug',
    phase: 'fuerza_aux',
    power: 3520,
    rotation: 0,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Fotocelda Crepuscular',
    brand: 'Finder',
    type: 'fotocelda',
    icon: 'eye',
    phase: 'fotoperiodo',
    power: 15,
    rotation: 0,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Enchufe Industrial 220V',
    brand: 'Mennekes',
    type: 'enchufe_220v',
    icon: 'plug',
    phase: 'fuerza_aux',
    power: 3520,
    rotation: 0,
    flipX: false,
    flipY: false,
    customColor: '',
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
    genericName: 'Fotocelda Crepuscular',
    brand: 'Finder',
    type: 'fotocelda',
    icon: 'eye',
    phase: 'fotoperiodo',
    power: 15,
    rotation: 0,
    flipX: false,
    flipY: false,
    customColor: '',
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

const INITIAL_PHASE_CONFIG = {
  fotoperiodo: { label: 'Fotoperiodo LED', color: '#f59e0b' },
  luces_perimetrales: { label: 'Luces Perimetrales', color: '#eab308' },
  cerco_electrico: { label: 'Cerco Eléctrico', color: '#dc2626' },
  fuerza_aux: { label: 'Fuerza 220V Auxiliar', color: '#2563eb' },
  control: { label: 'Fuerza y Control', color: '#ef4444' },
  monitoreo: { label: 'Sensores / Cámaras', color: '#06b6d4' },
  alimentacion: { label: 'Alimentación', color: '#10b981' },
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
  { type: 'luminaria', label: 'Proyector LED Fotoperiodo', brand: 'Aqualed', icon: 'sun', phase: 'fotoperiodo', power: 1000, rotation: 180, customColor: '' },
  { type: 'enchufe_220v', label: 'Enchufe Industrial 220V', brand: 'Mennekes', icon: 'plug', phase: 'fuerza_aux', power: 3520, rotation: 0, amperage: '16A', ipGrade: 'IP67', customColor: '' },
  { type: 'fotocelda', label: 'Fotocelda Crepuscular', brand: 'Finder', icon: 'eye', phase: 'fotoperiodo', power: 15, rotation: 0, luxThreshold: '15 Lux', controlledCircuit: 'Contactor Fotoperiodo', customColor: '' },
  { type: 'tablero', label: 'Tablero Eléctrico IP66', brand: 'Schneider Electric', icon: 'zap', phase: 'control', power: 1200, rotation: 0, customColor: '' },
  { type: 'energizador', label: 'Energizador / Cerco Eléctrico', brand: 'JVA', icon: 'radio', phase: 'cerco_electrico', power: 450, rotation: 0, customColor: '' },
  { type: 'sensor', label: 'Sensor / Sonda Multiparámetro', brand: 'OxyGuard', icon: 'cpu', phase: 'monitoreo', power: 60, rotation: 0, customColor: '' },
  { type: 'camara', label: 'Cámara Submarina / PTZ', brand: 'Hikvision', icon: 'camera', phase: 'monitoreo', power: 85, rotation: 0, customColor: '' },
  { type: 'alimentador', label: 'Selector de Alimentación', brand: 'AKVA Group', icon: 'compass', phase: 'alimentacion', power: 350, rotation: 0, customColor: '' },
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

const getModuleHeaderDimensions = (mod, cageCount = 0) => {
  const titleText = `${mod?.name || ''} (${cageCount} jaulas)`;
  const subtitleText = mod?.subtitle || '';
  const estTitleWidth = titleText.length * 8.6 + 34;
  const estSubtitleWidth = subtitleText.length * 6.0 + 34;
  const width = Math.max(190, Math.ceil(Math.max(estTitleWidth, estSubtitleWidth)));
  const height = subtitleText.trim() ? 44 : 32;
  return { width, height };
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
  const [annotations, setAnnotations] = useState([]);
  const [phaseConfigs, setPhaseConfigs] = useState(INITIAL_PHASE_CONFIG);
  const [symbolCatalog, setSymbolCatalog] = useState(SYMBOL_CATALOG);
  const [isEditingCatalog, setIsEditingCatalog] = useState(false);
  const [catalogForm, setCatalogForm] = useState({
    editingIndex: null,
    label: '',
    brand: '',
    icon: 'sun',
    phase: 'fotoperiodo',
    power: 1000,
    rotation: 180,
    customColor: '',
  });

  // Modal dedicado "Agregar Símbolo" (con selección de tipo, descripción, circuito, potencia, marca y cantidad)
  const [showAddSymbolModal, setShowAddSymbolModal] = useState(false);
  const [batchSymbolForm, setBatchSymbolForm] = useState({
    symbolType: 'luminaria',
    genericName: 'Proyector LED Fotoperiodo',
    spec: 'Proyector LED Fotoperiodo Sumergible 1000W 5000K',
    phase: 'fotoperiodo',
    power: 1000,
    brand: 'Aqualed',
    quantity: 4,
    rotation: 180,
    customColor: '',
    targetModuleId: 'MOD-200',
    saveInPalette: false,
  });

  // Formulario inline para crear o editar tipos de circuitos en propiedades de simbología
  const [circuitEditorMode, setCircuitEditorMode] = useState(null);
  const [circuitForm, setCircuitForm] = useState({
    key: '',
    label: '',
    color: '#7c3aed',
  });

  const [companyInfo, setCompanyInfo] = useState(INITIAL_COMPANY_INFO);
  const [trunkLabel, setTrunkLabel] = useState('Troncal Submarina 224m');
  const [showTrunkLabel, setShowTrunkLabel] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState(null);

  const [lockCages, setLockCages] = useState(true);

  const [pastHistory, setPastHistory] = useState([]);
  const [futureHistory, setFutureHistory] = useState([]);

  const cloneStateSnapshot = () => ({
    modules: JSON.parse(JSON.stringify(modules)),
    cages: JSON.parse(JSON.stringify(cages)),
    objects: JSON.parse(JSON.stringify(objects)),
    conduits: JSON.parse(JSON.stringify(conduits)),
    annotations: JSON.parse(JSON.stringify(annotations)),
    phaseConfigs: JSON.parse(JSON.stringify(phaseConfigs)),
    trunkLabel,
    showTrunkLabel,
  });

  const pushHistory = () => {
    const snap = cloneStateSnapshot();
    setPastHistory((prev) => [...prev.slice(-39), snap]);
    setFutureHistory([]);
  };

  const handleUndo = () => {
    if (pastHistory.length === 0) {
      notify('No hay acciones anteriores para deshacer', 'info');
      return;
    }
    const previous = pastHistory[pastHistory.length - 1];
    const currentSnap = cloneStateSnapshot();
    setFutureHistory((prev) => [...prev, currentSnap]);
    setPastHistory((prev) => prev.slice(0, -1));

    setModules(previous.modules);
    setCages(previous.cages);
    setObjects(previous.objects);
    setConduits(previous.conduits);
    if (Array.isArray(previous.annotations)) setAnnotations(previous.annotations);
    if (previous.phaseConfigs) setPhaseConfigs(previous.phaseConfigs);
    setTrunkLabel(previous.trunkLabel);
    setShowTrunkLabel(previous.showTrunkLabel);
    notify('Última acción deshecha (Ctrl+Z)', 'info');
  };

  const handleRedo = () => {
    if (futureHistory.length === 0) {
      notify('No hay acciones para rehacer', 'info');
      return;
    }
    const next = futureHistory[futureHistory.length - 1];
    const currentSnap = cloneStateSnapshot();
    setPastHistory((prev) => [...prev, currentSnap]);
    setFutureHistory((prev) => prev.slice(0, -1));

    setModules(next.modules);
    setCages(next.cages);
    setObjects(next.objects);
    setConduits(next.conduits);
    if (Array.isArray(next.annotations)) setAnnotations(next.annotations);
    if (next.phaseConfigs) setPhaseConfigs(next.phaseConfigs);
    setTrunkLabel(next.trunkLabel);
    setShowTrunkLabel(next.showTrunkLabel);
    notify('Acción rehacha (Ctrl+Y)', 'info');
  };

  // Modal Nuevo Proyecto con Configuración de Distribución de Jaulas
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    projectName: '',
    projectDescription: '',
    clientName: '',
    centerName: '',
    coordinates: '',
    googleMapsUrl: '',
    clearExistingObjects: true,
    mod1Name: 'MÓDULO 200',
    mod1Rows: 2,
    mod1Cols: 6,
    mod1StartNumber: 201,
    mod1CageMeters: 30,
    hasMod2: true,
    mod2Name: 'MÓDULO 100',
    mod2Rows: 2,
    mod2Cols: 5,
    mod2StartNumber: 101,
    mod2CageMeters: 30,
  });

  // Estado de vista del plano (Pan & Zoom)
  const [zoom, setZoom] = useState(0.84);
  const [pan, setPan] = useState({ x: 24, y: 14 });
  const [snapToWalkway, setSnapToWalkway] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Herramientas y selección
  const [activeTool, setActiveTool] = useState('select');
  const [placeTemplate, setPlaceTemplate] = useState(SYMBOL_CATALOG[0]);
  const [placeShapeTemplate, setPlaceShapeTemplate] = useState(BASIC_SHAPES_CATALOG[0]);
  const [selectedId, setSelectedId] = useState('OBJ-02');
  const [selectedKind, setSelectedKind] = useState('object');

  // Estado de dibujo de canalización por fase
  const [conduitPhase, setConduitPhase] = useState('fase_r');
  const [conduitCableSpec, setConduitCableSpec] = useState('Cable Submarino H07RN-F 3G4 mm²');
  const [conduitDropMeters, setConduitDropMeters] = useState(6);
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [cursorSvgPos, setCursorSvgPos] = useState(null);

  // Estado de dibujo de jaula con separación estándar fija
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
  const [showRightSidebar, setShowRightSidebar] = useState(false);
  const [autoHideRightPanel, setAutoHideRightPanel] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Interacción de arrastre y portapapeles unificado
  const [draggingObjId, setDraggingObjId] = useState(null);
  const [draggingCageId, setDraggingCageId] = useState(null);
  const [draggingModuleId, setDraggingModuleId] = useState(null);
  const [draggingAnnotationId, setDraggingAnnotationId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredObj, setHoveredObj] = useState(null);
  const [clipboardItem, setClipboardItem] = useState(null);
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
  // ABRIR MENÚ "AGREGAR SÍMBOLO" Y PROCESAR INSERCIÓN MÚLTIPLE
  // ============================================================================
  const openAddSymbolModal = (presetItem = null) => {
    const baseItem = presetItem || symbolCatalog[0];
    const defaultMod = modules[0]?.id || 'MOD-200';
    setBatchSymbolForm({
      symbolType: baseItem.type || 'luminaria',
      genericName: TYPE_GENERIC_LABELS[baseItem.type] || baseItem.label || 'Proyector LED Fotoperiodo',
      spec:
        baseItem.type === 'enchufe_220v'
          ? 'Toma Industrial CEE 220V 16A 2P+T IP67'
          : baseItem.type === 'fotocelda'
          ? 'Fotocelda Crepuscular 220V IP65 (15 Lux)'
          : `${baseItem.label} (${baseItem.power}W)`,
      phase: baseItem.phase || 'fotoperiodo',
      power: Number(baseItem.power) || 0,
      brand: baseItem.brand || 'Aqualed',
      quantity: 1,
      rotation: baseItem.rotation ?? (baseItem.type === 'luminaria' ? 180 : 0),
      customColor: baseItem.customColor || '',
      targetModuleId: defaultMod,
      saveInPalette: false,
    });
    setShowAddSymbolModal(true);
  };

  const handleBatchSymbolTypeChange = (newType) => {
    const templateMatch = symbolCatalog.find((s) => s.type === newType) || symbolCatalog[0];
    const genericLabel = TYPE_GENERIC_LABELS[newType] || templateMatch?.label || 'Componente Eléctrico';
    const defaultSpec =
      newType === 'enchufe_220v'
        ? 'Toma Industrial CEE 220V 16A 2P+T IP67'
        : newType === 'fotocelda'
        ? 'Fotocelda Crepuscular 220V IP65 (15 Lux)'
        : `${genericLabel} (${templateMatch?.power ?? 1000}W)`;

    setBatchSymbolForm((prev) => ({
      ...prev,
      symbolType: newType,
      genericName: genericLabel,
      spec: defaultSpec,
      phase: templateMatch?.phase || prev.phase,
      power: templateMatch?.power ?? prev.power,
      brand: templateMatch?.brand || prev.brand,
      rotation: newType === 'luminaria' ? 180 : 0,
    }));
  };

  const handleInsertBatchSymbols = (e) => {
    e.preventDefault();
    const qty = Math.min(200, Math.max(1, Math.floor(Number(batchSymbolForm.quantity) || 1)));
    const symType = batchSymbolForm.symbolType || 'luminaria';
    const templateMatch = symbolCatalog.find((s) => s.type === symType) || symbolCatalog[0];
    const iconName = templateMatch?.icon || 'zap';

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
    const prefix = prefixMap[symType] || symType.slice(0, 3).toUpperCase();

    const targetMod = modules.find((m) => m.id === batchSymbolForm.targetModuleId) || modules[0];
    const modId = targetMod?.id || 'MOD-200';
    const modShort = modId.replace(/[^0-9]/g, '') || '200';

    const existingCount = objects.filter((o) => o.type === symType).length;

    // Determinar punto de partida en el pasillo central del módulo seleccionado o centro visible
    const modCages = cages.filter((c) => c.moduleId === modId);
    let startX = 180;
    let startY = 280;
    let stepX = 64;
    let stepY = 56;
    let maxCols = 8;

    if (modCages.length > 0) {
      const minX = Math.min(...modCages.map((c) => c.x));
      const minY = Math.min(...modCages.map((c) => c.y));
      const cageSize = Number(modCages[0].size) || BASE_CAGE_PX;
      startX = minX + Math.round(cageSize / 2);
      startY = minY + cageSize + Math.round(STANDARD_WALKWAY_WIDTH / 2);
      stepX = cageSize + STANDARD_WALKWAY_WIDTH;
      maxCols = Math.max(1, new Set(modCages.map((c) => c.x)).size);
    }

    pushHistory();

    const cleanSpec =
      batchSymbolForm.spec.trim() ||
      `${batchSymbolForm.genericName || TYPE_GENERIC_LABELS[symType] || 'Equipo'} (${Number(batchSymbolForm.power) || 0}W)`;
    const cleanBrand = batchSymbolForm.brand.trim() || 'Genérico';
    const cleanGeneric =
      batchSymbolForm.genericName.trim() ||
      TYPE_GENERIC_LABELS[symType] ||
      'Componente Eléctrico';

    const newItems = [];
    for (let i = 0; i < qty; i++) {
      const seq = existingCount + i + 1;
      const col = i % maxCols;
      const row = Math.floor(i / maxCols);
      const posX = Math.round(startX + col * stepX);
      const posY = Math.round(startY + row * stepY);

      newItems.push({
        id: `OBJ-${Date.now()}-${i}-${Math.floor(Math.random() * 1000)}`,
        tag: `${prefix}-${modShort}-${String(seq).padStart(2, '0')}`,
        genericName: cleanGeneric,
        brand: cleanBrand,
        type: symType,
        icon: iconName,
        phase: batchSymbolForm.phase,
        power: Number(batchSymbolForm.power) || 0,
        rotation: Number(batchSymbolForm.rotation) || 0,
        flipX: false,
        flipY: false,
        customColor: batchSymbolForm.customColor || '',
        amperage: symType === 'enchufe_220v' ? '16A' : undefined,
        ipGrade: symType === 'enchufe_220v' ? 'IP67' : undefined,
        luxThreshold: symType === 'fotocelda' ? '15 Lux' : undefined,
        controlledCircuit: symType === 'fotocelda' ? `Contactor Módulo ${modShort}` : undefined,
        spec: cleanSpec,
        status: 'operativo',
        x: posX,
        y: posY,
        moduleId: modId,
        locationLabel: `Pasillo ${targetMod?.name || modId}`,
        description: `${cleanSpec} · Marca: ${cleanBrand}.`,
        lastInspection: new Date().toISOString().slice(0, 10),
      });
    }

    setObjects((prev) => [...prev, ...newItems]);

    if (batchSymbolForm.saveInPalette) {
      const paletteEntry = {
        type: symType,
        label: cleanSpec,
        brand: cleanBrand,
        icon: iconName,
        phase: batchSymbolForm.phase,
        power: Number(batchSymbolForm.power) || 0,
        rotation: Number(batchSymbolForm.rotation) || 0,
        customColor: batchSymbolForm.customColor || '',
      };
      setSymbolCatalog((prev) => [...prev, paletteEntry]);
    }

    if (newItems.length > 0) {
      setSelectedId(newItems[0].id);
      setSelectedKind('object');
    }

    setShowAddSymbolModal(false);
    notify(
      qty === 1
        ? `1 símbolo "${newItems[0].tag}" insertado en el plano`
        : `${qty} símbolos "${cleanGeneric}" (${cleanBrand}) insertados en ${targetMod?.name || modId}`,
      'success'
    );
  };

  // ============================================================================
  // LÍMITES DINÁMICOS DE MÓDULOS (ZONA GRIS AUTOAJUSTABLE A LAS JAULAS ACTIVAS)
  // ============================================================================
  const moduleBoundsMap = useMemo(() => {
    const map = {};
    modules.forEach((mod) => {
      const modCages = cages.filter((c) => c.moduleId === mod.id);
      const walkway = STANDARD_WALKWAY_WIDTH;

      if (modCages.length === 0) {
        map[mod.id] = {
          hasCages: false,
          count: 0,
          boxX: mod.originX - walkway,
          boxY: mod.originY - walkway,
          totalW: 0,
          totalH: 0,
          midY: mod.originY + 80,
          rightEdge: mod.originX - walkway,
          leftEdge: mod.originX - walkway,
        };
        return;
      }

      const minX = Math.min(...modCages.map((c) => c.x));
      const minY = Math.min(...modCages.map((c) => c.y));
      const maxX = Math.max(...modCages.map((c) => c.x + (Number(c.size) || BASE_CAGE_PX)));
      const maxY = Math.max(...modCages.map((c) => c.y + (Number(c.size) || BASE_CAGE_PX)));

      const boxX = minX - walkway;
      const boxY = minY - walkway;
      const totalW = maxX - minX + walkway * 2;
      const totalH = maxY - minY + walkway * 2;

      map[mod.id] = {
        hasCages: true,
        count: modCages.length,
        boxX,
        boxY,
        totalW,
        totalH,
        midY: boxY + totalH / 2,
        rightEdge: boxX + totalW,
        leftEdge: boxX,
      };
    });
    return map;
  }, [modules, cages]);

  const detectModuleId = (x) => {
    if (modules.length === 0) return 'MOD-200';
    if (modules.length === 1) return modules[0].id;

    let bestModId = modules[0].id;
    let bestDist = Infinity;
    modules.forEach((mod) => {
      const b = moduleBoundsMap[mod.id];
      const centerX = b && b.hasCages ? b.boxX + b.totalW / 2 : mod.originX + 200;
      const d = Math.abs(x - centerX);
      if (d < bestDist) {
        bestDist = d;
        bestModId = mod.id;
      }
    });
    return bestModId;
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
      const annotationsToUse = overrideData?.annotations || annotations;
      const catalogToUse = overrideData?.symbolCatalog || symbolCatalog;
      const phasesToUse = overrideData?.phaseConfigs || phaseConfigs;

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
        annotations: annotationsToUse,
        phaseConfigs: phasesToUse,
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
    pushHistory();
    if (Array.isArray(bp.modules)) setModules(bp.modules);
    if (Array.isArray(bp.cages)) setCages(bp.cages);
    if (Array.isArray(bp.objects)) setObjects(bp.objects);
    if (Array.isArray(bp.conduits)) setConduits(bp.conduits);
    if (Array.isArray(bp.annotations)) setAnnotations(bp.annotations);
    else setAnnotations([]);
    if (bp.phaseConfigs && typeof bp.phaseConfigs === 'object') {
      setPhaseConfigs((prev) => ({ ...prev, ...bp.phaseConfigs }));
    }
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

  const selectedAnnotation = useMemo(
    () => (selectedKind === 'annotation' ? annotations.find((a) => a.id === selectedId) : null),
    [annotations, selectedId, selectedKind]
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
  // GESTIÓN DE TIPOS DE CIRCUITOS (CREAR Y MODIFICAR DESDE INSPECTOR / PALETA)
  // ============================================================================
  const handleSaveCircuitType = (e) => {
    e.preventDefault();
    const cleanName = circuitForm.label.trim();
    if (!cleanName) {
      notify('Ingresa un nombre para el tipo de circuito', 'warn');
      return;
    }

    pushHistory();

    if (circuitEditorMode === 'edit' && circuitForm.key && phaseConfigs[circuitForm.key]) {
      setPhaseConfigs((prev) => ({
        ...prev,
        [circuitForm.key]: {
          label: cleanName,
          color: circuitForm.color || prev[circuitForm.key].color,
        },
      }));
      notify(`Circuito "${cleanName}" actualizado`, 'success');
    } else {
      const slug = cleanName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      const newKey = phaseConfigs[slug] ? `${slug}_${Date.now().toString().slice(-4)}` : slug || `circuito_${Date.now()}`;

      setPhaseConfigs((prev) => ({
        ...prev,
        [newKey]: {
          label: cleanName,
          color: circuitForm.color || '#7c3aed',
        },
      }));

      if (selectedObject) {
        updateSelectedObject('phase', newKey);
      } else if (isEditingCatalog) {
        setCatalogForm((prev) => ({ ...prev, phase: newKey }));
      }
      notify(`Nuevo circuito "${cleanName}" creado`, 'success');
    }

    setCircuitEditorMode(null);
  };

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
      brand: (catalogForm.brand || '').trim() || 'Genérico',
      icon: catalogForm.icon,
      phase: catalogForm.phase,
      power: Number(catalogForm.power) || 0,
      rotation: Number(catalogForm.rotation) || 0,
      customColor: catalogForm.customColor || '',
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
      brand: '',
      icon: 'sun',
      phase: 'fotoperiodo',
      power: 1000,
      rotation: 180,
      customColor: '',
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
      brand: item.brand || '',
      icon: item.icon || 'zap',
      phase: item.phase || 'control',
      power: Number(item.power) || 0,
      rotation: Number(item.rotation) || 0,
      customColor: item.customColor || '',
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
  // CREAR NUEVO PROYECTO CON CONFIGURACIÓN DE DISTRIBUCIÓN DE JAULAS
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

    pushHistory();

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

    const m1Rows = Math.max(1, Number(newProjectForm.mod1Rows) || 2);
    const m1Cols = Math.max(1, Number(newProjectForm.mod1Cols) || 5);
    const m1Start = Number(newProjectForm.mod1StartNumber) || 201;
    const m1Meters = Math.max(5, Number(newProjectForm.mod1CageMeters) || 30);
    const m1SizePx = Math.round((m1Meters / BASE_CAGE_METERS) * BASE_CAGE_PX);
    const walkway = STANDARD_WALKWAY_WIDTH;
    const m1TotalCount = m1Rows * m1Cols;

    const generatedModules = [
      {
        id: 'MOD-200',
        name: newProjectForm.mod1Name.trim() || 'MÓDULO 200',
        subtitle: `Tren 1 - ${m1TotalCount} Jaulas (${m1Start} - ${m1Start + m1TotalCount - 1}) · ${m1Meters}m×${m1Meters}m`,
        originX: 120,
        originY: 160,
        headerOffsetX: 0,
        headerOffsetY: 0,
        rows: m1Rows,
        cols: m1Cols,
        cageSize: m1SizePx,
        cageSizeMeters: m1Meters,
        walkwayWidth: walkway,
        startNumber: m1Start,
      },
    ];

    if (newProjectForm.hasMod2) {
      const m2Rows = Math.max(1, Number(newProjectForm.mod2Rows) || 2);
      const m2Cols = Math.max(1, Number(newProjectForm.mod2Cols) || 5);
      const m2Start = Number(newProjectForm.mod2StartNumber) || 101;
      const m2Meters = Math.max(5, Number(newProjectForm.mod2CageMeters) || 30);
      const m2SizePx = Math.round((m2Meters / BASE_CAGE_METERS) * BASE_CAGE_PX);
      const m2TotalCount = m2Rows * m2Cols;

      const m1WidthPx = m1Cols * (m1SizePx + walkway) + walkway;
      const m2OriginX = 120 + m1WidthPx + 216;

      generatedModules.push({
        id: 'MOD-100',
        name: newProjectForm.mod2Name.trim() || 'MÓDULO 100',
        subtitle: `Tren 2 - ${m2TotalCount} Jaulas (${m2Start} - ${m2Start + m2TotalCount - 1}) · ${m2Meters}m×${m2Meters}m`,
        originX: m2OriginX,
        originY: 160,
        headerOffsetX: 0,
        headerOffsetY: 0,
        rows: m2Rows,
        cols: m2Cols,
        cageSize: m2SizePx,
        cageSizeMeters: m2Meters,
        walkwayWidth: walkway,
        startNumber: m2Start,
      });
    }

    const nextCages = generateCagesFromModules(generatedModules);
    const nextObjects = newProjectForm.clearExistingObjects ? [] : objects;
    const nextConduits = newProjectForm.clearExistingObjects ? [] : conduits;
    const nextAnnotations = newProjectForm.clearExistingObjects ? [] : annotations;

    setCompanyInfo(updatedInfo);
    setModules(generatedModules);
    setCages(nextCages);
    if (newProjectForm.clearExistingObjects) {
      setObjects([]);
      setConduits([]);
      setAnnotations([]);
    }
    setSelectedId(null);
    setSelectedKind(null);

    const slugId = `${cName}-${pName}`
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || `proyecto-${Date.now()}`;

    setCurrentBlueprintId(slugId);
    setBlueprintNameInput(cName);
    setShowNewProjectModal(false);

    notify(
      `Proyecto "${pName}" creado con ${nextCages.length} jaulas configuradas`,
      'success'
    );

    if (db && fbUser) {
      await handleSaveToCloud(slugId, cName, {
        companyInfo: updatedInfo,
        objects: nextObjects,
        conduits: nextConduits,
        annotations: nextAnnotations,
        cages: nextCages,
        modules: generatedModules,
        phaseConfigs,
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

    pushHistory();

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
    notify(
      `Canalización "${newConduit.tag}" (${phaseCfg.label}) creada: ${metrics.totalMeters} m totales (doble clic para editar)`,
      'success'
    );
  };

  // ============================================================================
  // FUNCIONES DE COPIAR, CORTAR, PEGAR Y DUPLICAR
  // ============================================================================
  const copySelectedToClipboard = () => {
    if (selectedObject) {
      setClipboardItem({ kind: 'object', data: { ...selectedObject } });
      notify(`Equipo "${selectedObject.tag}" copiado (Ctrl+V para pegar)`, 'info');
      return true;
    }
    if (selectedCage) {
      setClipboardItem({ kind: 'cage', data: { ...selectedCage } });
      notify(`Jaula "${selectedCage.label || selectedCage.number}" copiada (Ctrl+V para pegar)`, 'info');
      return true;
    }
    if (selectedConduit) {
      setClipboardItem({
        kind: 'conduit',
        data: { ...selectedConduit, points: selectedConduit.points.map((p) => ({ ...p })) },
      });
      notify(`Canalización "${selectedConduit.tag}" copiada (Ctrl+V para pegar)`, 'info');
      return true;
    }
    if (selectedAnnotation) {
      setClipboardItem({ kind: 'annotation', data: { ...selectedAnnotation } });
      notify('Figura / texto copiado (Ctrl+V para pegar)', 'info');
      return true;
    }
    return false;
  };

  const cutSelectedToClipboard = () => {
    if (selectedObject) {
      setClipboardItem({ kind: 'object', data: { ...selectedObject } });
      deleteObject(selectedObject.id, true);
      notify(`Equipo "${selectedObject.tag}" cortado (Ctrl+V para pegar)`, 'info');
      return true;
    }
    if (selectedCage) {
      setClipboardItem({ kind: 'cage', data: { ...selectedCage } });
      deleteCage(selectedCage.id, true);
      notify(`Jaula "${selectedCage.label || selectedCage.number}" cortada (Ctrl+V para pegar)`, 'info');
      return true;
    }
    if (selectedConduit) {
      setClipboardItem({
        kind: 'conduit',
        data: { ...selectedConduit, points: selectedConduit.points.map((p) => ({ ...p })) },
      });
      deleteConduit(selectedConduit.id, true);
      notify(`Canalización "${selectedConduit.tag}" cortada (Ctrl+V para pegar)`, 'info');
      return true;
    }
    if (selectedAnnotation) {
      setClipboardItem({ kind: 'annotation', data: { ...selectedAnnotation } });
      deleteAnnotation(selectedAnnotation.id, true);
      notify('Figura / texto cortado (Ctrl+V para pegar)', 'info');
      return true;
    }
    return false;
  };

  const duplicateObject = (sourceObj, offsetX = 32, offsetY = 32) => {
    if (!sourceObj) return;
    pushHistory();
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
      locationLabel: `${sourceObj.locationLabel || ''} (Copia)`.trim(),
    };

    setObjects((prev) => [...prev, clonedObj]);
    setSelectedId(clonedObj.id);
    setSelectedKind('object');
    notify(`Equipo pegado como "${clonedObj.tag}"`, 'success');
  };

  const duplicateCage = (sourceCage, offsetX = null, offsetY = 0) => {
    if (!sourceCage) return;
    pushHistory();
    const stepX =
      offsetX !== null
        ? offsetX
        : (Number(sourceCage.size) || BASE_CAGE_PX) + STANDARD_WALKWAY_WIDTH;
    const newX = Math.round(sourceCage.x + stepX);
    const newY = Math.round(sourceCage.y + offsetY);
    const targetModId = sourceCage.moduleId || detectModuleId(newX);

    const maxNum = cages.reduce((mx, c) => Math.max(mx, Number(c.number) || 0), 100);
    const nextNum = maxNum + 1;
    const newLabel = String(nextNum);

    const clonedCage = {
      ...sourceCage,
      id: `JAULA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      number: nextNum,
      label: newLabel,
      showLabel: true,
      moduleId: targetModId,
      x: newX,
      y: newY,
    };

    setCages((prev) => [...prev, clonedCage]);
    setSelectedId(clonedCage.id);
    setSelectedKind('cage');
    notify(`Jaula pegada como "${newLabel}" con separación estándar`, 'success');
  };

  const duplicateConduit = (sourceConduit, offsetX = 24, offsetY = 24) => {
    if (!sourceConduit) return;
    pushHistory();
    const clonedConduit = {
      ...sourceConduit,
      id: `CAN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tag: `${sourceConduit.tag}-CP`,
      points: (sourceConduit.points || []).map((p) => ({
        x: Math.round(p.x + offsetX),
        y: Math.round(p.y + offsetY),
      })),
    };
    setConduits((prev) => [...prev, clonedConduit]);
    setSelectedId(clonedConduit.id);
    setSelectedKind('conduit');
    notify(`Canalización pegada como "${clonedConduit.tag}"`, 'success');
  };

  const duplicateAnnotation = (sourceAnn, offsetX = 28, offsetY = 28) => {
    if (!sourceAnn) return;
    pushHistory();
    const cloned = {
      ...sourceAnn,
      id: `ANN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      x: Math.round(sourceAnn.x + offsetX),
      y: Math.round(sourceAnn.y + offsetY),
    };
    setAnnotations((prev) => [...prev, cloned]);
    setSelectedId(cloned.id);
    setSelectedKind('annotation');
    notify('Elemento gráfico pegado en el plano', 'success');
  };

  const pasteFromClipboard = () => {
    if (!clipboardItem) return;
    if (clipboardItem.kind === 'object') {
      duplicateObject(clipboardItem.data, 36, 36);
      setClipboardItem((prev) =>
        prev ? { ...prev, data: { ...prev.data, x: prev.data.x + 36, y: prev.data.y + 36 } } : null
      );
    } else if (clipboardItem.kind === 'cage') {
      const step = (Number(clipboardItem.data.size) || BASE_CAGE_PX) + STANDARD_WALKWAY_WIDTH;
      duplicateCage(clipboardItem.data, step, 0);
      setClipboardItem((prev) =>
        prev ? { ...prev, data: { ...prev.data, x: prev.data.x + step } } : null
      );
    } else if (clipboardItem.kind === 'conduit') {
      duplicateConduit(clipboardItem.data, 24, 24);
      setClipboardItem((prev) =>
        prev
          ? {
              ...prev,
              data: {
                ...prev.data,
                points: prev.data.points.map((p) => ({ x: p.x + 24, y: p.y + 24 })),
              },
            }
          : null
      );
    } else if (clipboardItem.kind === 'annotation') {
      duplicateAnnotation(clipboardItem.data, 28, 28);
      setClipboardItem((prev) =>
        prev ? { ...prev, data: { ...prev.data, x: prev.data.x + 28, y: prev.data.y + 28 } } : null
      );
    }
  };

  // ============================================================================
  // ATAJOS DE TECLADO: CTRL+Z, CTRL+Y, SHIFT+FLECHAS, SUPR, CTRL+C/X/V/D
  // ============================================================================
  useEffect(() => {
    const handleKeyDown = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const step = e.shiftKey ? 1 : 4;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

        if (selectedObject) {
          e.preventDefault();
          if (!e.repeat) pushHistory();
          setObjects((prev) =>
            prev.map((o) =>
              o.id === selectedObject.id ? { ...o, x: o.x + dx, y: o.y + dy } : o
            )
          );
          return;
        }

        if (selectedAnnotation) {
          e.preventDefault();
          if (!e.repeat) pushHistory();
          setAnnotations((prev) =>
            prev.map((a) =>
              a.id === selectedAnnotation.id ? { ...a, x: a.x + dx, y: a.y + dy } : a
            )
          );
          return;
        }

        if (selectedConduit) {
          e.preventDefault();
          if (!e.repeat) pushHistory();
          setConduits((prev) =>
            prev.map((c) =>
              c.id === selectedConduit.id
                ? {
                    ...c,
                    points: c.points.map((p) => ({ x: p.x + dx, y: p.y + dy })),
                  }
                : c
            )
          );
          return;
        }

        if (selectedModule) {
          e.preventDefault();
          if (!e.repeat) pushHistory();
          setModules((prev) =>
            prev.map((m) =>
              m.id === selectedModule.id
                ? {
                    ...m,
                    headerOffsetX: (m.headerOffsetX || 0) + dx,
                    headerOffsetY: (m.headerOffsetY || 0) + dy,
                  }
                : m
            )
          );
          return;
        }

        if (selectedCage) {
          e.preventDefault();
          if (lockCages) {
            notify('Las jaulas están fijadas. Desbloquéalas si deseas desplazarlas.', 'warn');
            return;
          }
          if (!e.repeat) pushHistory();
          setCages((prev) =>
            prev.map((c) =>
              c.id === selectedCage.id ? { ...c, x: c.x + dx, y: c.y + dy } : c
            )
          );
          return;
        }
      }

      if (e.key === 'Enter' && activeTool === 'draw_conduit' && drawingPoints.length >= 2) {
        e.preventDefault();
        finishDrawingConduit();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (copySelectedToClipboard()) {
          e.preventDefault();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
        if (cutSelectedToClipboard()) {
          e.preventDefault();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (clipboardItem) {
          e.preventDefault();
          pasteFromClipboard();
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedObject) {
          e.preventDefault();
          duplicateObject(selectedObject, 36, 36);
        } else if (selectedCage) {
          e.preventDefault();
          duplicateCage(selectedCage);
        } else if (selectedConduit) {
          e.preventDefault();
          duplicateConduit(selectedConduit);
        } else if (selectedAnnotation) {
          e.preventDefault();
          duplicateAnnotation(selectedAnnotation);
        }
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedObject) {
          e.preventDefault();
          deleteObject(selectedObject.id);
        } else if (selectedCage) {
          e.preventDefault();
          deleteCage(selectedCage.id);
        } else if (selectedConduit) {
          e.preventDefault();
          deleteConduit(selectedConduit.id);
        } else if (selectedAnnotation) {
          e.preventDefault();
          deleteAnnotation(selectedAnnotation.id);
        }
        return;
      }

      if (e.key === 'Escape') {
        if (showAddSymbolModal) {
          setShowAddSymbolModal(false);
        } else if (activeTool === 'draw_conduit') {
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
  }, [
    selectedObject,
    selectedCage,
    selectedConduit,
    selectedModule,
    selectedAnnotation,
    lockCages,
    clipboardItem,
    objects,
    cages,
    conduits,
    annotations,
    modules,
    pastHistory,
    futureHistory,
    showPreviewModal,
    showAddSymbolModal,
    isFullscreen,
    activeTool,
    drawingPoints,
  ]);

  const walkwayLines = useMemo(() => {
    const xsSet = new Set();
    const ysSet = new Set();

    cages.forEach((c) => {
      const halfW = STANDARD_WALKWAY_WIDTH / 2;
      const size = Number(c.size) || BASE_CAGE_PX;

      xsSet.add(c.x - halfW);
      xsSet.add(c.x + size + halfW);
      ysSet.add(c.y - halfW);
      ysSet.add(c.y + size + halfW);
    });

    return {
      xs: Array.from(xsSet),
      ys: Array.from(ysSet),
    };
  }, [cages]);

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

  const clientToSvgCoords = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left - pan.x) / zoom;
    const y = (clientY - rect.top - pan.y) / zoom;
    return { x, y };
  };

  const placeSymbolAtCoords = (rawX, rawY) => {
    pushHistory();
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

    const genericName =
      TYPE_GENERIC_LABELS[placeTemplate.type] || placeTemplate.label || 'Componente Eléctrico';

    const newObj = {
      id: `OBJ-${Date.now()}`,
      tag: `${prefix}-${modShort}-${String(count).padStart(2, '0')}`,
      genericName,
      brand: placeTemplate.brand || 'Genérico',
      type: placeTemplate.type,
      icon: placeTemplate.icon,
      phase: placeTemplate.phase,
      power: placeTemplate.power,
      rotation: placeTemplate.rotation ?? 180,
      flipX: false,
      flipY: false,
      customColor: placeTemplate.customColor || '',
      amperage: placeTemplate.amperage || '16A',
      ipGrade: placeTemplate.ipGrade || 'IP67',
      luxThreshold: placeTemplate.luxThreshold || '15 Lux',
      controlledCircuit: placeTemplate.controlledCircuit || `Contactor Módulo ${modShort}`,
      spec: defaultSpec,
      status: 'operativo',
      x: snapped.x,
      y: snapped.y,
      moduleId: modId,
      locationLabel: `Pasillo ${modId}`,
      description: `${defaultSpec} incorporado en pasillo.`,
      lastInspection: new Date().toISOString().slice(0, 10),
    };
    setObjects((prev) => [...prev, newObj]);
    setSelectedId(newObj.id);
    setSelectedKind('object');
    setActiveTool('select');
    notify(`Equipo "${newObj.tag}" añadido (doble clic para editar propiedades)`, 'success');
  };

  // ============================================================================
  // INSERTAR CUADRO DE TEXTO O FIGURA BÁSICA EN EL PLANO
  // ============================================================================
  const placeAnnotationAtCoords = (rawX, rawY) => {
    pushHistory();
    const shapeType = placeShapeTemplate?.shapeType || 'text';
    const isText = shapeType === 'text';
    const isArrowOrLine = shapeType === 'arrow' || shapeType === 'line';

    const newAnnotation = {
      id: `ANN-${Date.now()}`,
      shapeType,
      text: isText ? 'Nota / Texto Técnico' : '',
      x: Math.round(rawX),
      y: Math.round(rawY),
      width: isText ? 170 : isArrowOrLine ? 110 : 76,
      height: isText ? 42 : isArrowOrLine ? 24 : 76,
      strokeColor: '#0284c7',
      fillColor: isText ? '#ffffff' : '#bae6fd',
      fillOpacity: isText ? 0.95 : 0.35,
      strokeWidth: 2.5,
      fontSize: 12,
      textColor: '#0f172a',
      rotation: 0,
    };

    setAnnotations((prev) => [...prev, newAnnotation]);
    setSelectedId(newAnnotation.id);
    setSelectedKind('annotation');
    setActiveTool('select');
    if (isText) {
      setShowRightSidebar(true);
    }
    notify(
      `${placeShapeTemplate?.label || 'Elemento'} insertado (doble clic para editar propiedades)`,
      'success'
    );
  };

  const placeCageAtCoords = (rawX, rawY) => {
    pushHistory();
    const meters = Math.max(5, Number(newCageSizeMeters) || 30);
    const visualPx = Math.round((meters / BASE_CAGE_METERS) * BASE_CAGE_PX);
    const nextNum =
      cages.reduce((maxN, c) => Math.max(maxN, Number(c.number) || 0), 100) + 1;
    const customLabel = newCageLabelInput.trim() || String(nextNum);
    const modId = detectModuleId(rawX);
    const targetMod = modules.find((m) => m.id === modId) || modules[0];

    const step = visualPx + STANDARD_WALKWAY_WIDTH;
    const baseOriginX = targetMod ? targetMod.originX : 120;
    const baseOriginY = targetMod ? targetMod.originY : 160;
    const colIndex = Math.max(0, Math.round((rawX - baseOriginX) / step));
    const rowIndex = Math.max(0, Math.round((rawY - baseOriginY) / step));

    const alignedX = baseOriginX + colIndex * step;
    const alignedY = baseOriginY + rowIndex * step;

    const newCage = {
      id: `JAULA-${Date.now()}`,
      number: nextNum,
      label: customLabel,
      showLabel: true,
      moduleId: modId,
      row: rowIndex,
      col: colIndex,
      x: alignedX,
      y: alignedY,
      size: visualPx,
      sizeMeters: meters,
      dimensions: `${meters}m x ${meters}m`,
      depth: '22m',
      species: 'Salmón del Atlántico (Salmo salar)',
      biomassTons: 150,
      photoperiodActive: true,
      targetLux: 180,
      notes: `Jaula ${customLabel} (${meters}m x ${meters}m) con separación estándar de pasillo.`,
    };

    setCages((prev) => [...prev, newCage]);
    setSelectedId(newCage.id);
    setSelectedKind('cage');
    setActiveTool('select');
    notify(
      `Jaula "${customLabel}" (${meters}m × ${meters}m) insertada con separación estándar`,
      'success'
    );
  };

  const handleCanvasMouseDown = (e) => {
    if (e.button !== 0) return;
    const coords = clientToSvgCoords(e.clientX, e.clientY);

    if (activeTool === 'place') {
      placeSymbolAtCoords(coords.x, coords.y);
      return;
    }

    if (activeTool === 'place_shape') {
      placeAnnotationAtCoords(coords.x, coords.y);
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

    if (draggingAnnotationId) {
      const nextX = Math.round(coords.x - dragOffset.x);
      const nextY = Math.round(coords.y - dragOffset.y);
      setAnnotations((prev) =>
        prev.map((ann) =>
          ann.id === draggingAnnotationId ? { ...ann, x: nextX, y: nextY } : ann
        )
      );
      return;
    }

    if (draggingModuleId) {
      const bounds = moduleBoundsMap[draggingModuleId];
      const baseX = bounds ? bounds.boxX : 120;
      const baseY = bounds ? bounds.boxY - 54 : 106;
      const nextOffsetX = Math.round(coords.x - dragOffset.x - baseX);
      const nextOffsetY = Math.round(coords.y - dragOffset.y - baseY);
      setModules((prev) =>
        prev.map((m) =>
          m.id === draggingModuleId
            ? { ...m, headerOffsetX: nextOffsetX, headerOffsetY: nextOffsetY }
            : m
        )
      );
      return;
    }

    if (draggingCageId && !lockCages) {
      const targetCage = cages.find((c) => c.id === draggingCageId);
      const step = (Number(targetCage?.size) || BASE_CAGE_PX) + STANDARD_WALKWAY_WIDTH;
      const targetMod = modules.find((m) => m.id === targetCage?.moduleId) || modules[0];
      const baseOriginX = targetMod ? targetMod.originX : 120;
      const baseOriginY = targetMod ? targetMod.originY : 160;
      const rawNextX = coords.x - dragOffset.x;
      const rawNextY = coords.y - dragOffset.y;
      const snappedCol = Math.round((rawNextX - baseOriginX) / step);
      const snappedRow = Math.round((rawNextY - baseOriginY) / step);
      const nextX = baseOriginX + snappedCol * step;
      const nextY = baseOriginY + snappedRow * step;

      setCages((prev) =>
        prev.map((c) => (c.id === draggingCageId ? { ...c, x: nextX, y: nextY } : c))
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
    setDraggingCageId(null);
    setDraggingModuleId(null);
    setDraggingAnnotationId(null);
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
      setDraggingCageId(null);
      setDraggingModuleId(null);
      setDraggingAnnotationId(null);
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const coords = clientToSvgCoords(touch.clientX, touch.clientY);

      if (activeTool === 'place') {
        placeSymbolAtCoords(coords.x, coords.y);
        return;
      }

      if (activeTool === 'place_shape') {
        placeAnnotationAtCoords(coords.x, coords.y);
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
    setDraggingCageId(null);
    setDraggingModuleId(null);
    setDraggingAnnotationId(null);
    setIsPanning(false);
  };

  const updateSelectedObject = (field, value) => {
    if (!selectedObject) return;
    pushHistory();
    setObjects((prev) =>
      prev.map((obj) => (obj.id === selectedObject.id ? { ...obj, [field]: value } : obj))
    );
  };

  const updateSelectedAnnotation = (field, value) => {
    if (!selectedAnnotation) return;
    pushHistory();
    setAnnotations((prev) =>
      prev.map((ann) => (ann.id === selectedAnnotation.id ? { ...ann, [field]: value } : ann))
    );
  };

  const updateSelectedCage = (field, value) => {
    if (!selectedCage) return;
    pushHistory();
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
    pushHistory();
    setModules((prev) =>
      prev.map((m) => (m.id === selectedModule.id ? { ...m, [field]: value } : m))
    );
  };

  const centerModuleHeaderOverCages = (modId) => {
    const bounds = moduleBoundsMap[modId];
    const targetMod = modules.find((m) => m.id === modId);
    if (!bounds || !bounds.hasCages || !targetMod) return;
    pushHistory();
    const { width: headerWidth } = getModuleHeaderDimensions(targetMod, bounds.count);
    const centeredOffsetX = Math.round((bounds.totalW - headerWidth) / 2);
    setModules((prev) =>
      prev.map((m) =>
        m.id === modId ? { ...m, headerOffsetX: centeredOffsetX, headerOffsetY: 0 } : m
      )
    );
    notify('Encabezado centrado respecto a las jaulas del módulo', 'success');
  };

  const updateSelectedConduit = (field, value) => {
    if (!selectedConduit) return;
    pushHistory();
    setConduits((prev) =>
      prev.map((c) => (c.id === selectedConduit.id ? { ...c, [field]: value } : c))
    );
  };

  const deleteObject = (id, silent = false) => {
    pushHistory();
    setObjects((prev) => prev.filter((o) => o.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedKind(null);
    }
    if (!silent) notify('Equipo eliminado del plano', 'warn');
  };

  const deleteAnnotation = (id, silent = false) => {
    pushHistory();
    setAnnotations((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedKind(null);
    }
    if (!silent) notify('Elemento gráfico eliminado del plano', 'warn');
  };

  const deleteConduit = (id, silent = false) => {
    pushHistory();
    setConduits((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedKind(null);
    }
    if (!silent) notify('Canalización eliminada del plano', 'warn');
  };

  const deleteCage = (id, silent = false) => {
    pushHistory();
    setCages((prev) => prev.filter((c) => c.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setSelectedKind(null);
    }
    if (!silent) notify('Jaula eliminada · Zona gris autoajustada', 'warn');
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
          pushHistory();
          setModules(data.modules);
          setCages(data.cages);
          setObjects(data.objects);
          if (Array.isArray(data.conduits)) setConduits(data.conduits);
          if (Array.isArray(data.annotations)) setAnnotations(data.annotations);
          if (data.phaseConfigs && typeof data.phaseConfigs === 'object') {
            setPhaseConfigs((prev) => ({ ...prev, ...data.phaseConfigs }));
          }
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

  const generateSvgStringForExport = (removeGrid = true) => {
    const svgEl = svgRef.current;
    if (!svgEl) return null;

    let minX = 40;
    let minY = 65;
    let maxX = 1860;
    let maxY = 535;

    const activeBounds = Object.values(moduleBoundsMap).filter((b) => b.hasCages);
    if (activeBounds.length > 0) {
      minX = Math.min(...activeBounds.map((b) => b.boxX)) - 60;
      minY = Math.min(...activeBounds.map((b) => b.boxY - 90)) - 20;
      maxX = Math.max(...activeBounds.map((b) => b.boxX + b.totalW)) + 60;
      maxY = Math.max(...activeBounds.map((b) => b.boxY + b.totalH)) + 60;
    }

    if (annotations.length > 0) {
      const annMinX = Math.min(...annotations.map((a) => a.x - (a.width || 100)));
      const annMinY = Math.min(...annotations.map((a) => a.y - (a.height || 60)));
      const annMaxX = Math.max(...annotations.map((a) => a.x + (a.width || 100)));
      const annMaxY = Math.max(...annotations.map((a) => a.y + (a.height || 60)));
      minX = Math.min(minX, annMinX - 30);
      minY = Math.min(minY, annMinY - 30);
      maxX = Math.max(maxX, annMaxX + 30);
      maxY = Math.max(maxY, annMaxY + 30);
    }

    const exportWidth = Math.max(800, Math.round(maxX - minX));
    const exportHeight = Math.max(380, Math.round(maxY - minY));

    const clone = svgEl.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('viewBox', `${minX} ${minY} ${exportWidth} ${exportHeight}`);
    clone.setAttribute('width', String(exportWidth));
    clone.setAttribute('height', String(exportHeight));

    const gridRect = clone.querySelector('#sea-grid-bg');
    if (gridRect && removeGrid) {
      gridRect.remove();
    }

    const viewportG = clone.querySelector('#plan-viewport');
    if (viewportG) {
      viewportG.setAttribute('transform', 'translate(0, 0) scale(1)');
    }

    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('x', String(minX));
    bgRect.setAttribute('y', String(minY));
    bgRect.setAttribute('width', String(exportWidth));
    bgRect.setAttribute('height', String(exportHeight));
    bgRect.setAttribute('fill', removeGrid ? '#ffffff' : '#f0f9ff');
    clone.insertBefore(bgRect, clone.firstChild);

    return new XMLSerializer().serializeToString(clone);
  };

  const handleExportPNG = () => {
    const svgString = generateSvgStringForExport(false);
    if (!svgString) return;

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 2400;
      canvas.height = 680;
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

  const summarizedEquipment = useMemo(() => {
    const map = new Map();
    objects.forEach((o) => {
      const genericName = (
        o.genericName ||
        TYPE_GENERIC_LABELS[o.type] ||
        'Componente Eléctrico'
      ).trim();
      const brand = (o.brand || 'Sin Marca').trim();
      const specKey = (o.spec || '').trim();
      const key = `${genericName}__${brand}__${specKey}__${o.phase}__${Number(o.power) || 0}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          genericName,
          brand,
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
    const svgString = generateSvgStringForExport(true);
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
          <td style="font-weight:700;">${g.genericName}</td>
          <td style="font-weight:700; color:#0369a1;">${g.brand}</td>
          <td style="font-size:10px;">${g.tagsLabel}</td>
          <td>${g.modulesLabel}</td>
          <td>${g.spec}</td>
          <td>${phaseConfigs[g.phase]?.label || g.phase}</td>
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
          .header-pdf { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 12px; }
          .logo { max-height: 70px; max-width: 240px; object-fit: contain; }
          .platform-title { flex: 1; text-align: center; font-size: 14px; font-weight: 800; letter-spacing: 0.4px; color: #0f172a; }
          .plan-box { border: 1.5px solid #94a3b8; border-radius: 8px; padding: 6px; background: #ffffff; margin-bottom: 10px; }
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
          table.inv { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 12px; }
          table.inv th, table.inv td { border: 1px solid #cbd5e1; padding: 5px 6px; text-align: left; }
          table.inv th { background: #0f172a; color: #ffffff; font-weight: 700; }
          .footer-bottom { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 16px; border-top: 1.5px solid #cbd5e1; padding-top: 10px; }
          .company-footer { font-size: 13px; font-weight: 800; color: #0f172a; letter-spacing: 0.3px; }
          .sign-box { width: 250px; text-align: center; border-top: 1px solid #334155; padding-top: 5px; font-size: 10.5px; }
          .sign-img { max-height: 46px; margin: 0 auto 4px auto; display: block; }
        </style>
      </head>
      <body>
        <div class="header-pdf">
          ${companyInfo.logoDataUrl ? `<img src="${companyInfo.logoDataUrl}" class="logo" />` : '<div></div>'}
          <div class="platform-title">PLATAFORMA DE DISTRIBUCION EQUIPOS EN CENTROS DE CULTIVO</div>
          <div style="width:80px;"></div>
        </div>

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

        <h4>1. Resumen de Equipos Instalados por Componente Genérico y Marca</h4>
        <table class="inv">
          <thead>
            <tr>
              <th style="text-align:center;">Cant.</th>
              <th>Componente Genérico</th>
              <th>Marca</th>
              <th>TAGs Agrupados</th>
              <th>Módulo</th>
              <th>Características Técnicas</th>
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
        const matchBrand = (obj.brand || '').toLowerCase().includes(q);
        const matchLoc = (obj.locationLabel || '').toLowerCase().includes(q);
        if (!matchTag && !matchSpec && !matchBrand && !matchLoc) return false;
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

  const renderAnnotationGraphic = (ann, isSelected) => {
    const w = Math.max(20, Number(ann.width) || 100);
    const h = Math.max(16, Number(ann.height) || 50);
    const halfW = w / 2;
    const halfH = h / 2;
    const rot = Number(ann.rotation) || 0;
    const stroke = ann.strokeColor || '#0284c7';
    const fill = ann.fillColor || '#ffffff';
    const fillOpacity = ann.fillOpacity ?? 0.35;
    const strokeWidth = Number(ann.strokeWidth) || 2.5;
    const fontSize = Number(ann.fontSize) || 12;
    const textColor = ann.textColor || '#0f172a';
    const lines = (ann.text || '').split('\n');

    return (
      <g transform={`rotate(${rot})`}>
        {isSelected && (
          <rect
            x={-halfW - 6}
            y={-halfH - 6}
            width={w + 12}
            height={h + 12}
            rx="6"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.8"
            strokeDasharray="4 3"
          />
        )}

        {ann.shapeType === 'text' && (
          <g>
            <rect
              x={-halfW}
              y={-halfH}
              width={w}
              height={h}
              rx="6"
              fill={fill}
              fillOpacity={fillOpacity}
              stroke={stroke}
              strokeWidth={strokeWidth}
            />
            {lines.map((line, idx) => {
              const offsetY = (idx - (lines.length - 1) / 2) * (fontSize + 4) + fontSize * 0.35;
              return (
                <text
                  key={idx}
                  x="0"
                  y={offsetY}
                  textAnchor="middle"
                  fontSize={fontSize}
                  fontWeight="700"
                  fill={textColor}
                >
                  {line}
                </text>
              );
            })}
          </g>
        )}

        {ann.shapeType === 'rect' && (
          <rect
            x={-halfW}
            y={-halfH}
            width={w}
            height={h}
            rx="4"
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )}

        {ann.shapeType === 'circle' && (
          <ellipse
            cx="0"
            cy="0"
            rx={halfW}
            ry={halfH}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )}

        {ann.shapeType === 'triangle' && (
          <polygon
            points={`0,${-halfH} ${halfW},${halfH} ${-halfW},${halfH}`}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )}

        {ann.shapeType === 'diamond' && (
          <polygon
            points={`0,${-halfH} ${halfW},0 0,${halfH} ${-halfW},0`}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeLinejoin="round"
          />
        )}

        {ann.shapeType === 'line' && (
          <g>
            <line
              x1={-halfW}
              y1="0"
              x2={halfW}
              y2="0"
              stroke="transparent"
              strokeWidth="14"
            />
            <line
              x1={-halfW}
              y1="0"
              x2={halfW}
              y2="0"
              stroke={stroke}
              strokeWidth={strokeWidth + 1}
              strokeLinecap="round"
            />
          </g>
        )}

        {ann.shapeType === 'arrow' && (
          <g>
            <rect
              x={-halfW}
              y={-12}
              width={w}
              height={24}
              fill="transparent"
            />
            <line
              x1={-halfW}
              y1="0"
              x2={halfW - 14}
              y2="0"
              stroke={stroke}
              strokeWidth={strokeWidth + 1.2}
              strokeLinecap="round"
            />
            <polygon
              points={`${halfW},0 ${halfW - 16},-9 ${halfW - 16},9`}
              fill={stroke}
            />
          </g>
        )}

        {ann.shapeType !== 'text' && ann.text && ann.text.trim() !== '' && (
          <text
            x="0"
            y={fontSize * 0.35}
            textAnchor="middle"
            fontSize={fontSize}
            fontWeight="800"
            fill={textColor}
          >
            {ann.text}
          </text>
        )}
      </g>
    );
  };

  const renderSymbolGraphic = (obj, isSelected) => {
    const phaseColor = phaseConfigs[obj.phase]?.color || '#0284c7';
    const effectiveColor = obj.customColor && obj.customColor.trim() ? obj.customColor.trim() : phaseColor;
    const luminariaStroke = obj.customColor && obj.customColor.trim() ? obj.customColor.trim() : '#1d4ed8';
    const statusColor = STATUS_CONFIG[obj.status]?.color || '#10b981';
    const rot = Number(obj.rotation) || 0;
    const scaleX = obj.flipX ? -1 : 1;
    const scaleY = obj.flipY ? -1 : 1;

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

        <g transform={`scale(${scaleX}, ${scaleY}) rotate(${rot})`}>
          {obj.type === 'luminaria' ? (
            <g>
              <polygon
                points="10,-12 46,-26 46,26 10,12"
                fill={luminariaStroke}
                fillOpacity="0.22"
                pointerEvents="none"
              />
              <line
                x1="13"
                y1="-8"
                x2="40"
                y2="-18"
                stroke={luminariaStroke}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />
              <line
                x1="14"
                y1="0"
                x2="43"
                y2="0"
                stroke={luminariaStroke}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                strokeLinecap="round"
              />
              <line
                x1="13"
                y1="8"
                x2="40"
                y2="18"
                stroke={luminariaStroke}
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
                fill={luminariaStroke}
              />

              <path
                d="M -3,-14.5 L -11.5,-14.5 L -11.5,14.5 L -3,14.5"
                fill="none"
                stroke={luminariaStroke}
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
                stroke={luminariaStroke}
                strokeWidth="1.8"
              />
              <line x1="-8.5" y1="-7.5" x2="-4" y2="-7.5" stroke={luminariaStroke} strokeWidth="1.4" />
              <line x1="-8.5" y1="-3.8" x2="-4" y2="-3.8" stroke={luminariaStroke} strokeWidth="1.4" />
              <line x1="-8.5" y1="0" x2="-4" y2="0" stroke={luminariaStroke} strokeWidth="1.4" />
              <line x1="-8.5" y1="3.8" x2="-4" y2="3.8" stroke={luminariaStroke} strokeWidth="1.4" />
              <line x1="-8.5" y1="7.5" x2="-4" y2="7.5" stroke={luminariaStroke} strokeWidth="1.4" />

              <rect
                x="-4"
                y="-12.5"
                width="13.5"
                height="25"
                rx="3"
                fill={darkMode ? '#0f172a' : '#ffffff'}
                stroke={luminariaStroke}
                strokeWidth="2.2"
              />

              {[-7.5, -2.5, 2.5, 7.5].map((cy, rIdx) =>
                [-0.5, 2.8, 6.1].map((cx, cIdx) => (
                  <circle
                    key={`${rIdx}-${cIdx}`}
                    cx={cx}
                    cy={cy}
                    r="1.05"
                    fill={luminariaStroke}
                  />
                ))
              )}
            </g>
          ) : (
            <>
              <circle
                r="17"
                fill={darkMode ? '#0f172a' : '#ffffff'}
                stroke={effectiveColor}
                strokeWidth="2.6"
              />
              {obj.type === 'enchufe_220v' && (
                <g>
                  <rect x="-8" y="-8" width="16" height="16" rx="4" fill={effectiveColor} />
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
                    stroke={effectiveColor}
                    strokeWidth="1.8"
                  />
                  <circle r="3.8" fill="#0f172a" />
                  <circle cx="-1.2" cy="-1.2" r="1.1" fill="#ffffff" />
                </g>
              )}
              {obj.type === 'tablero' && (
                <g>
                  <rect x="-7" y="-8" width="14" height="16" rx="2" fill={effectiveColor} />
                  <polygon points="1,-5 -3,1 0,1 -1,5 4,-1 1,-1" fill="#ffffff" />
                </g>
              )}
              {obj.type === 'energizador' && (
                <g>
                  <circle r="6" fill={effectiveColor} />
                  <path
                    d="M -10,-6 A 12,12 0 0,1 -10,6 M 10,-6 A 12,12 0 0,0 10,6"
                    fill="none"
                    stroke={effectiveColor}
                    strokeWidth="1.8"
                  />
                </g>
              )}
              {obj.type === 'sensor' && (
                <g>
                  <circle r="6.5" fill={effectiveColor} />
                  <circle r="2.5" fill="#ffffff" />
                </g>
              )}
              {obj.type === 'camara' && (
                <g>
                  <rect x="-8" y="-5" width="11" height="10" rx="2" fill={effectiveColor} />
                  <polygon points="3,-3 9,-6 9,6 3,3" fill={effectiveColor} opacity="0.8" />
                </g>
              )}
              {obj.type === 'alimentador' && (
                <g>
                  <polygon points="0,-9 8,6 -8,6" fill={effectiveColor} />
                  <circle r="2.2" fill="#ffffff" />
                </g>
              )}
            </>
          )}
        </g>

        <circle
          cx="13"
          cy="-13"
          r="5"
          fill={statusColor}
          stroke={darkMode ? '#0f172a' : '#ffffff'}
          strokeWidth="1.8"
        />

        {showLabels && (
          <g transform="translate(0, 26)">
            <rect
              x="-34"
              y="-8"
              width="68"
              height="15"
              rx="4"
              fill={darkMode ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.95)'}
              stroke={effectiveColor}
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

  const renderPalettePreviewIcon = (iconName, colorOverride = '') => {
    const strokeCol = colorOverride || '#1d4ed8';
    switch (iconName) {
      case 'sun':
        return (
          <svg viewBox="0 0 32 32" className="w-5 h-5">
            <g transform="translate(13, 18) rotate(-42)">
              <polygon points="6,-8 22,-15 22,15 6,8" fill={strokeCol} fillOpacity="0.25" />
              <line x1="8" y1="-4" x2="19" y2="-9" stroke={strokeCol} strokeWidth="1.3" strokeDasharray="2 2" />
              <line x1="8" y1="0" x2="20" y2="0" stroke={strokeCol} strokeWidth="1.3" strokeDasharray="2 2" />
              <line x1="8" y1="4" x2="19" y2="9" stroke={strokeCol} strokeWidth="1.3" strokeDasharray="2 2" />
              <rect x="-11" y="-2" width="3.5" height="4" rx="1" fill={strokeCol} />
              <path d="M -2,-10 L -8,-10 L -8,10 L -2,10" fill="none" stroke={strokeCol} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="-3" y="-8.5" width="9" height="17" rx="2" fill="#ffffff" stroke={strokeCol} strokeWidth="1.8" />
              <circle cx="0" cy="-4" r="1" fill={strokeCol} />
              <circle cx="3" cy="-4" r="1" fill={strokeCol} />
              <circle cx="0" cy="0" r="1" fill={strokeCol} />
              <circle cx="3" cy="0" r="1" fill={strokeCol} />
              <circle cx="0" cy="4" r="1" fill={strokeCol} />
              <circle cx="3" cy="4" r="1" fill={strokeCol} />
            </g>
          </svg>
        );
      case 'plug':
        return <Zap className="w-4 h-4" style={{ color: colorOverride || '#2563eb' }} />;
      case 'eye':
        return <Eye className="w-4 h-4" style={{ color: colorOverride || '#f59e0b' }} />;
      case 'zap':
        return <Zap className="w-4 h-4" style={{ color: colorOverride || '#ef4444' }} />;
      case 'radio':
        return <Radio className="w-4 h-4" style={{ color: colorOverride || '#dc2626' }} />;
      case 'cpu':
        return <Cpu className="w-4 h-4" style={{ color: colorOverride || '#06b6d4' }} />;
      case 'camera':
        return <Camera className="w-4 h-4" style={{ color: colorOverride || '#06b6d4' }} />;
      default:
        return <Compass className="w-4 h-4" style={{ color: colorOverride || '#10b981' }} />;
    }
  };

  const renderShapeIcon = (shapeType) => {
    switch (shapeType) {
      case 'text':
        return <Type className="w-4 h-4 text-sky-600" />;
      case 'arrow':
        return <ArrowRight className="w-4 h-4 text-sky-600" />;
      case 'rect':
        return <Square className="w-4 h-4 text-sky-600" />;
      case 'circle':
        return <Circle className="w-4 h-4 text-sky-600" />;
      case 'triangle':
        return <Triangle className="w-4 h-4 text-sky-600" />;
      case 'diamond':
        return <Diamond className="w-4 h-4 text-sky-600" />;
      default:
        return <Minus className="w-4 h-4 text-sky-600" />;
    }
  };

  const renderBasic32ColorGrid = (selectedHex, onSelectHex) => (
    <div className="grid grid-cols-8 gap-1 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/70">
      {BASIC_32_COLORS.map((hex) => {
        const isCurrent = (selectedHex || '').toLowerCase() === hex.toLowerCase();
        return (
          <button
            key={hex}
            type="button"
            onClick={() => onSelectHex(hex)}
            className={`w-5 h-5 rounded-md border transition-transform hover:scale-110 ${
              isCurrent
                ? 'ring-2 ring-sky-500 border-white scale-110'
                : 'border-slate-300 dark:border-slate-600'
            }`}
            style={{ backgroundColor: hex }}
            title={hex.toUpperCase()}
          />
        );
      })}
    </div>
  );

  const mapsHref = buildGoogleMapsLink(companyInfo.coordinates, companyInfo.googleMapsUrl);

  const trunkCoords = useMemo(() => {
    if (modules.length < 2) return null;
    const b1 = moduleBoundsMap[modules[0].id];
    const b2 = moduleBoundsMap[modules[1].id];
    if (!b1?.hasCages || !b2?.hasCages) return null;
    if (b2.leftEdge <= b1.rightEdge) return null;
    return {
      x1: b1.rightEdge,
      y1: b1.midY,
      x2: b2.leftEdge,
      y2: b2.midY,
      midX: (b1.rightEdge + b2.leftEdge) / 2,
      midY: (b1.midY + b2.midY) / 2,
    };
  }, [modules, moduleBoundsMap]);

  return (
    <div
      ref={appContainerRef}
      className={`h-screen w-screen overflow-hidden flex flex-col select-none ${
        darkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* ====================================================================
          BARRA SUPERIOR DE HERRAMIENTAS Y TÍTULO CENTRADO
      ==================================================================== */}
      <header
        className={`z-30 border-b px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs ${
          darkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        {/* Izquierda: Identidad Empresa */}
        <div className="flex items-center gap-2.5 min-w-0">
          {companyInfo.logoDataUrl ? (
            <div
              onClick={() => logoInputRef.current?.click()}
              title="Haz clic para cambiar logotipo"
              className="h-11 min-w-[110px] max-w-[190px] rounded-xl border border-slate-200/80 bg-white px-2 py-1 flex items-center justify-center cursor-pointer shadow-xs shrink-0"
            >
              <img
                src={companyInfo.logoDataUrl}
                alt="Logo Empresa"
                className="max-h-9 w-auto max-w-full object-contain"
              />
            </div>
          ) : (
            <div
              onClick={() => logoInputRef.current?.click()}
              title="Haz clic para subir tu logotipo"
              className="h-11 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0 transition-colors"
            >
              <Building2 className="w-4 h-4" />
              <span>BEQA</span>
            </div>
          )}

          <div className="min-w-0 hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold truncate">
                {companyInfo.companyName}
              </span>
              <button
                onClick={() => setShowCompanyModal(true)}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:bg-sky-500/25 transition-colors"
              >
                Configurar
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
              {companyInfo.centerName}
            </p>
          </div>
        </div>

        {/* Centro: Título Principal Centrado */}
        <div className="flex-1 text-center px-2 min-w-[220px]">
          <h1 className="text-xs sm:text-sm md:text-base font-extrabold tracking-wide uppercase text-sky-700 dark:text-sky-400">
            PLATAFORMA DE DISTRIBUCION EQUIPOS EN CENTROS DE CULTIVO
          </h1>
        </div>

        {/* Derecha: Acciones Principales */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* BOTÓN DIRECTO AGREGAR SÍMBOLO (INSERCIÓN MÚLTIPLE) */}
          <button
            onClick={() => openAddSymbolModal()}
            className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 shadow-xs transition-colors"
            title="Abrir menú para agregar uno o varios símbolos con la misma descripción"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Agregar Símbolo</span>
          </button>

          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <button
              onClick={handleUndo}
              disabled={pastHistory.length === 0}
              className={`px-2 py-1.5 text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-40 ${
                darkMode
                  ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
              title="Deshacer última acción (Ctrl+Z)"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={futureHistory.length === 0}
              className={`px-2 py-1.5 text-xs font-bold border-l border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors disabled:opacity-40 ${
                darkMode
                  ? 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
              title="Rehacer acción (Ctrl+Y)"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => {
              setLockCages((v) => {
                const next = !v;
                notify(
                  next
                    ? 'Jaulas fijadas: su distribución queda protegida al mover equipos'
                    : 'Jaulas desbloqueadas: puedes reposicionarlas en la retícula',
                  'info'
                );
                return next;
              });
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-extrabold border flex items-center gap-1 transition-colors ${
              lockCages
                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40'
                : darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Fijar jaulas para no modificar su distribución al mover simbología"
          >
            {lockCages ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span className="hidden xl:inline">{lockCages ? 'Jaulas Fijas' : 'Jaulas Libres'}</span>
          </button>

          <button
            onClick={() => {
              setNewProjectForm({
                projectName: '',
                projectDescription: '',
                clientName: companyInfo.clientName || '',
                centerName: '',
                coordinates: '',
                googleMapsUrl: '',
                clearExistingObjects: true,
                mod1Name: 'MÓDULO 200',
                mod1Rows: 2,
                mod1Cols: 6,
                mod1StartNumber: 201,
                mod1CageMeters: 30,
                hasMod2: true,
                mod2Name: 'MÓDULO 100',
                mod2Rows: 2,
                mod2Cols: 5,
                mod2StartNumber: 101,
                mod2CageMeters: 30,
              });
              setShowNewProjectModal(true);
            }}
            className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs transition-colors"
            title="Nuevo Proyecto"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden 2xl:inline">Nuevo</span>
          </button>

          <button
            onClick={() => {
              setCloudSearchQuery('');
              setShowCloudModal(true);
            }}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-colors ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-sky-300 hover:bg-slate-700'
                : 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100'
            }`}
            title="Proyectos en la Nube"
          >
            <FolderOpen className="w-3.5 h-3.5 text-sky-500" />
            <span>({savedBlueprints.length})</span>
          </button>

          <button
            onClick={() => handleSaveToCloud()}
            disabled={isSavingCloud}
            className="px-2.5 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-600 text-slate-950 flex items-center gap-1 shadow-xs transition-colors disabled:opacity-60"
            title="Guardar en la Nube"
          >
            <CloudUpload className="w-3.5 h-3.5" />
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
            className={`p-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-colors ${
              snapToWalkway
                ? 'bg-blue-600 text-white border-blue-600'
                : darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Imán de pasillos"
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowLabels((v) => !v)}
            className={`p-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-colors ${
              showLabels
                ? 'bg-indigo-600 text-white border-indigo-600'
                : darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-300'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Mostrar/Ocultar etiquetas"
          >
            <Eye className="w-3.5 h-3.5" />
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
            {darkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setShowInventoryModal(true)}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white flex items-center gap-1"
            title="Resumen e Inventario de Equipos"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>({objects.length})</span>
          </button>

          <button
            onClick={handleExportPNG}
            className="px-2 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1"
            title="Exportar PNG"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setShowPreviewModal(true)}
            className="px-2 py-1.5 rounded-xl text-xs font-bold bg-slate-700 hover:bg-slate-800 text-white flex items-center gap-1"
            title="Vista Previa Lámina Técnica"
          >
            <MonitorPlay className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleExportPDF}
            className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1"
            title="Exportar PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => jsonInputRef.current?.click()}
            className={`p-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 ${
              darkMode
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-white border-slate-200 text-slate-700'
            }`}
            title="Cargar JSON"
          >
            <Upload className="w-3.5 h-3.5" />
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
            {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Expand className="w-3.5 h-3.5" />}
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
            {/* BOTÓN DESTACADO PARA AGREGAR SÍMBOLOS EN LOTE O INDIVIDUAL */}
            <div>
              <button
                type="button"
                onClick={() => openAddSymbolModal()}
                className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Agregar Símbolo (Por Cantidad)</span>
              </button>
            </div>

            {/* HERRAMIENTAS DE DIBUJO: CANALIZACIÓN POR FASE Y JAULAS ESTÁNDAR */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-800">
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
              </div>

              {/* 2. Dibujar Jaula con Separación Estándar */}
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
                    <span>Jaula (Separación Estándar)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (activeTool === 'draw_cage') {
                        setActiveTool('select');
                      } else {
                        setActiveTool('draw_cage');
                        notify(
                          `Haz clic en el plano para insertar jaula de ${newCageSizeMeters}m × ${newCageSizeMeters}m con separación estándar`,
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
                    {activeTool === 'draw_cage' ? 'Cancelar' : 'Insertar'}
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
              </div>
            </div>

            {/* CUADROS DE TEXTO Y FIGURAS BÁSICAS */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Cuadro de Texto y Figuras
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {BASIC_SHAPES_CATALOG.map((shape) => {
                  const isActiveShape =
                    activeTool === 'place_shape' &&
                    placeShapeTemplate?.shapeType === shape.shapeType;
                  return (
                    <button
                      key={shape.shapeType}
                      type="button"
                      onClick={() => {
                        setPlaceShapeTemplate(shape);
                        setActiveTool('place_shape');
                        notify(`Haz clic en el plano para insertar: ${shape.label}`, 'info');
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-left text-xs font-bold transition-all ${
                        isActiveShape
                          ? 'border-sky-500 bg-sky-500/15 ring-1 ring-sky-500'
                          : darkMode
                          ? 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
                          : 'border-slate-200 bg-slate-50 hover:border-sky-400'
                      }`}
                    >
                      {renderShapeIcon(shape.shapeType)}
                      <span className="truncate">{shape.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PALETA RÁPIDA DE SIMBOLOGÍA (1 A 1 O ABRIR MENÚ POR CANTIDAD) */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                  Paleta Rápida (1 clic)
                </span>
                <button
                  onClick={() => {
                    setCatalogForm({
                      editingIndex: null,
                      label: '',
                      brand: '',
                      icon: 'sun',
                      phase: Object.keys(phaseConfigs)[0] || 'fotoperiodo',
                      power: 1000,
                      rotation: 180,
                      customColor: '',
                    });
                    setIsEditingCatalog((v) => !v);
                  }}
                  className="px-2 py-0.5 rounded-lg text-[11px] font-extrabold bg-slate-200 dark:bg-slate-800 hover:bg-sky-600 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>{isEditingCatalog ? 'Cerrar' : 'Plantilla'}</span>
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
                      ? 'Editar Plantilla de Paleta'
                      : 'Nueva Plantilla en Paleta'}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Nombre / Descripción
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

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                      Marca por Defecto
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Aqualed, Philips, Schneider..."
                      value={catalogForm.brand}
                      onChange={(e) =>
                        setCatalogForm((prev) => ({ ...prev, brand: e.target.value }))
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
                        <option value="radio">Energizador / Cerco</option>
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
                      {Object.entries(phaseConfigs).map(([key, val]) => (
                        <option key={key} value={key}>
                          {val.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">
                      Color Básico (32 colores)
                    </label>
                    {renderBasic32ColorGrid(catalogForm.customColor, (hex) =>
                      setCatalogForm((prev) => ({ ...prev, customColor: hex }))
                    )}
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
                  const itemColor = item.customColor || phaseConfigs[item.phase]?.color || '';
                  return (
                    <div
                      key={`${item.label}-${idx}`}
                      onClick={() => {
                        setPlaceTemplate(item);
                        setActiveTool('place');
                        notify(`Modo inserción 1 a 1: Haz clic en el plano para ubicar "${item.label}"`, 'info');
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
                          {renderPalettePreviewIcon(item.icon, itemColor)}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate">{item.label}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {phaseConfigs[item.phase]?.label || item.phase} · {item.power}W
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddSymbolModal(item);
                          }}
                          title="Insertar varias unidades de este equipo"
                          className="px-1.5 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-500/15 text-sky-600 dark:text-sky-400 hover:bg-sky-600 hover:text-white"
                        >
                          +N
                        </button>
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
                  className={`p-2 rounded-xl border border-dashed text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors ${
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
                  className={`p-2 rounded-xl border border-dashed text-xs font-semibold flex flex-col items-center justify-center gap-1 transition-colors ${
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

            {/* Filtros de Capas y Búsqueda */}
            <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Filtros de Capas
              </span>

              <input
                type="text"
                placeholder="Buscar TAG, marca o equipo..."
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
                {Object.entries(phaseConfigs).map(([k, v]) => (
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
              {clipboardItem && (
                <button
                  onClick={pasteFromClipboard}
                  className="px-2 py-0.5 rounded-md bg-sky-600 text-white text-[11px] font-extrabold flex items-center gap-1 hover:bg-sky-700"
                  title="Pegar elemento del portapapeles (Ctrl+V)"
                >
                  <ClipboardPaste className="w-3 h-3" />
                  <span>Pegar</span>
                </button>
              )}
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

            {activeTool === 'place_shape' && (
              <div className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-extrabold shadow-md flex items-center gap-2">
                <span>Haz clic en el plano para insertar: {placeShapeTemplate?.label}</span>
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
                  Haz clic en el plano para insertar Jaula ({newCageSizeMeters}m × {newCageSizeMeters}m)
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
              title="Abrir panel inspector (también con doble clic sobre un objeto)"
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
            </defs>

            <rect id="sea-grid-bg" width="100%" height="100%" fill="url(#seaGrid)" />

            <g id="plan-viewport" transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* Estructuras de Módulos y Pasillos */}
              {modules.map((mod) => {
                const bounds = moduleBoundsMap[mod.id];
                if (!bounds || !bounds.hasCages) return null;

                const { width: headerWidth, height: headerHeight } = getModuleHeaderDimensions(
                  mod,
                  bounds.count
                );
                const headerX = bounds.boxX + (Number(mod.headerOffsetX) || 0);
                const headerY = bounds.boxY - (headerHeight + 10) + (Number(mod.headerOffsetY) || 0);

                return (
                  <g key={mod.id}>
                    <g
                      transform={`translate(${headerX}, ${headerY})`}
                      onMouseDown={(e) => {
                        if (activeTool !== 'select' || e.button !== 0) return;
                        e.stopPropagation();
                        pushHistory();
                        const coords = clientToSvgCoords(e.clientX, e.clientY);
                        setSelectedModuleId(mod.id);
                        setSelectedId(mod.id);
                        setSelectedKind('module');
                        setDraggingModuleId(mod.id);
                        setDragOffset({ x: coords.x - headerX, y: coords.y - headerY });
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setSelectedModuleId(mod.id);
                        setSelectedId(mod.id);
                        setSelectedKind('module');
                        setShowRightSidebar(true);
                      }}
                      className="cursor-move"
                    >
                      <rect
                        width={headerWidth}
                        height={headerHeight}
                        rx="10"
                        fill={darkMode ? '#0f172a' : '#ffffff'}
                        stroke={
                          selectedModuleId === mod.id && selectedKind === 'module'
                            ? '#0284c7'
                            : '#94a3b8'
                        }
                        strokeWidth={
                          selectedModuleId === mod.id && selectedKind === 'module' ? '2.5' : '1.8'
                        }
                      />
                      <text
                        x="14"
                        y={mod.subtitle?.trim() ? '19' : '21'}
                        fontSize="14"
                        fontWeight="800"
                        fill={darkMode ? '#f8fafc' : '#0f172a'}
                      >
                        {mod.name} ({bounds.count} jaulas)
                      </text>
                      {mod.subtitle?.trim() && (
                        <text
                          x="14"
                          y="34"
                          fontSize="10.5"
                          fontWeight="600"
                          fill={darkMode ? '#94a3b8' : '#475569'}
                        >
                          {mod.subtitle}
                        </text>
                      )}
                    </g>

                    <rect
                      x={bounds.boxX}
                      y={bounds.boxY}
                      width={bounds.totalW}
                      height={bounds.totalH}
                      rx="12"
                      fill={darkMode ? '#334155' : '#64748b'}
                      stroke={darkMode ? '#475569' : '#334155'}
                      strokeWidth="2.5"
                    />
                  </g>
                );
              })}

              {/* Línea Troncal Submarina Dinámica entre Módulos */}
              {trunkCoords && (
                <g>
                  <line
                    x1={trunkCoords.x1}
                    y1={trunkCoords.y1}
                    x2={trunkCoords.x2}
                    y2={trunkCoords.y2}
                    stroke="#0284c7"
                    strokeWidth="4"
                    strokeDasharray="10 6"
                  />
                  {showTrunkLabel && (
                    <g
                      transform={`translate(${trunkCoords.midX}, ${trunkCoords.midY - 14})`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId('TRUNK');
                        setSelectedKind('trunk');
                      }}
                      onDoubleClick={(e) => {
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
              )}

              {/* Jaulas de Cultivo */}
              {cages.map((cage) => {
                const isSel = selectedKind === 'cage' && selectedId === cage.id;
                const displayText = cage.label !== undefined ? cage.label : String(cage.number);
                const cMeters = Number(cage.sizeMeters) || BASE_CAGE_METERS;

                return (
                  <g
                    key={cage.id}
                    transform={`translate(${cage.x}, ${cage.y})`}
                    onMouseDown={(e) => {
                      if (activeTool !== 'select' || e.button !== 0) return;
                      e.stopPropagation();
                      setSelectedId(cage.id);
                      setSelectedKind('cage');
                      if (!lockCages) {
                        pushHistory();
                        const coords = clientToSvgCoords(e.clientX, e.clientY);
                        setDraggingCageId(cage.id);
                        setDragOffset({ x: coords.x - cage.x, y: coords.y - cage.y });
                      }
                    }}
                    onDoubleClick={(e) => {
                      if (activeTool !== 'select') return;
                      e.stopPropagation();
                      setSelectedId(cage.id);
                      setSelectedKind('cage');
                      setShowRightSidebar(true);
                    }}
                    className={lockCages ? 'cursor-pointer' : 'cursor-move'}
                  >
                    <rect
                      width={cage.size}
                      height={cage.size}
                      rx="6"
                      fill={darkMode ? '#0c4a6e' : '#bae6fd'}
                      stroke={isSel ? '#f59e0b' : darkMode ? '#38bdf8' : '#0284c7'}
                      strokeWidth={isSel ? '3.5' : '1.8'}
                    />

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
                    }}
                    onDoubleClick={(e) => {
                      if (activeTool !== 'select') return;
                      e.stopPropagation();
                      setSelectedId(conduit.id);
                      setSelectedKind('conduit');
                      setShowRightSidebar(true);
                    }}
                    className="cursor-pointer"
                  >
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke="transparent"
                      strokeWidth="14"
                    />
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
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke={pCfg.color}
                      strokeWidth={isSel ? '4.5' : '3.5'}
                      strokeDasharray={pCfg.dashArray === 'none' ? undefined : pCfg.dashArray}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
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

              {/* Cuadros de Texto y Figuras Básicas */}
              {annotations.map((ann) => {
                const isSel = selectedKind === 'annotation' && selectedId === ann.id;
                return (
                  <g
                    key={ann.id}
                    transform={`translate(${ann.x}, ${ann.y})`}
                    onMouseDown={(e) => {
                      if (activeTool !== 'select' || e.button !== 0) return;
                      e.stopPropagation();
                      pushHistory();
                      const coords = clientToSvgCoords(e.clientX, e.clientY);
                      setSelectedId(ann.id);
                      setSelectedKind('annotation');
                      setDraggingAnnotationId(ann.id);
                      setDragOffset({ x: coords.x - ann.x, y: coords.y - ann.y });
                    }}
                    onDoubleClick={(e) => {
                      if (activeTool !== 'select') return;
                      e.stopPropagation();
                      setSelectedId(ann.id);
                      setSelectedKind('annotation');
                      setShowRightSidebar(true);
                    }}
                    className="cursor-move"
                  >
                    {renderAnnotationGraphic(ann, isSel)}
                  </g>
                );
              })}

              {/* Equipos Eléctricos y Luminarias */}
              {filteredObjects.map((obj) => {
                const isSel = selectedKind === 'object' && selectedId === obj.id;
                return (
                  <g
                    key={obj.id}
                    transform={`translate(${obj.x}, ${obj.y})`}
                    onMouseDown={(e) => {
                      if (activeTool !== 'select' || e.button !== 0) return;
                      e.stopPropagation();
                      pushHistory();
                      setSelectedId(obj.id);
                      setSelectedKind('object');
                      setDraggingObjId(obj.id);
                    }}
                    onDoubleClick={(e) => {
                      if (activeTool !== 'select') return;
                      e.stopPropagation();
                      setSelectedId(obj.id);
                      setSelectedKind('object');
                      setShowRightSidebar(true);
                    }}
                    onTouchStart={(e) => {
                      if (activeTool !== 'select') return;
                      e.stopPropagation();
                      pushHistory();
                      setSelectedId(obj.id);
                      setSelectedKind('object');
                      setDraggingObjId(obj.id);
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
            PANEL DERECHO DESPLEGABLE SUPERPUESTO
        ==================================================================== */}
        {showRightSidebar && (
          <aside
            className={`fixed top-14 right-0 bottom-0 w-80 sm:w-96 z-50 border-l-2 shadow-2xl overflow-y-auto p-4 space-y-4 ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
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

            {/* EDITOR DE CUADRO DE TEXTO O FIGURA BÁSICA */}
            {selectedAnnotation ? (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-indigo-500">
                      Elemento Gráfico / Anotación
                    </span>
                    <h2 className="text-lg font-extrabold">
                      {BASIC_SHAPES_CATALOG.find((s) => s.shapeType === selectedAnnotation.shapeType)?.label ||
                        'Figura'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={copySelectedToClipboard}
                      className="p-2 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-300 hover:bg-slate-500/25"
                      title="Copiar (Ctrl+C)"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cutSelectedToClipboard}
                      className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                      title="Cortar (Ctrl+X)"
                    >
                      <Scissors className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteAnnotation(selectedAnnotation.id)}
                      className="p-2 rounded-xl bg-rose-500/15 text-rose-600 hover:bg-rose-500/25"
                      title="Eliminar (Supr)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    {selectedAnnotation.shapeType === 'text'
                      ? 'Contenido del Cuadro de Texto'
                      : 'Etiqueta / Texto Interior (Opcional)'}
                  </label>
                  <textarea
                    rows={selectedAnnotation.shapeType === 'text' ? 3 : 1}
                    placeholder="Escribe el texto aquí..."
                    value={selectedAnnotation.text || ''}
                    onChange={(e) => updateSelectedAnnotation('text', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold mb-1">Ancho (px)</label>
                    <input
                      type="number"
                      min="20"
                      max="800"
                      value={selectedAnnotation.width || 100}
                      onChange={(e) => updateSelectedAnnotation('width', Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1">Alto (px)</label>
                    <input
                      type="number"
                      min="16"
                      max="800"
                      value={selectedAnnotation.height || 50}
                      onChange={(e) => updateSelectedAnnotation('height', Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1">Letra (px)</label>
                    <input
                      type="number"
                      min="8"
                      max="48"
                      value={selectedAnnotation.fontSize || 12}
                      onChange={(e) => updateSelectedAnnotation('fontSize', Number(e.target.value))}
                      className={`w-full px-2.5 py-1.5 rounded-xl text-xs font-bold border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    Color de Borde / Flecha / Línea (32 colores)
                  </label>
                  {renderBasic32ColorGrid(selectedAnnotation.strokeColor, (hex) =>
                    updateSelectedAnnotation('strokeColor', hex)
                  )}
                </div>

                {selectedAnnotation.shapeType !== 'arrow' &&
                  selectedAnnotation.shapeType !== 'line' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold">Color de Fondo / Relleno</label>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedAnnotation(
                              'fillOpacity',
                              selectedAnnotation.fillOpacity === 0 ? 0.35 : 0
                            )
                          }
                          className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 hover:underline"
                        >
                          {selectedAnnotation.fillOpacity === 0 ? 'Activar relleno' : 'Sin relleno (transparente)'}
                        </button>
                      </div>
                      {renderBasic32ColorGrid(selectedAnnotation.fillColor, (hex) => {
                        updateSelectedAnnotation('fillColor', hex);
                        if (selectedAnnotation.fillOpacity === 0) {
                          updateSelectedAnnotation('fillOpacity', 0.45);
                        }
                      })}
                    </div>
                  )}

                <div>
                  <label className="block text-xs font-bold mb-1">Color del Texto</label>
                  {renderBasic32ColorGrid(selectedAnnotation.textColor, (hex) =>
                    updateSelectedAnnotation('textColor', hex)
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span>Rotación (°)</span>
                    <span className="text-sky-500 font-extrabold">
                      {selectedAnnotation.rotation || 0}°
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="1"
                    value={selectedAnnotation.rotation || 0}
                    onChange={(e) => updateSelectedAnnotation('rotation', Number(e.target.value))}
                    className="w-full accent-sky-600"
                  />
                </div>
              </div>
            ) : selectedObject ? (
              /* EDITOR DE EQUIPO SELECCIONADO */
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-sky-500">
                      Equipo / Luminaria Seleccionada
                    </span>
                    <h2 className="text-lg font-extrabold">{selectedObject.tag}</h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={copySelectedToClipboard}
                      className="p-2 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-300 hover:bg-slate-500/25"
                      title="Copiar (Ctrl+C)"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cutSelectedToClipboard}
                      className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                      title="Cortar (Ctrl+X)"
                    >
                      <Scissors className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteObject(selectedObject.id)}
                      className="p-2 rounded-xl bg-rose-500/15 text-rose-600 hover:bg-rose-500/25"
                      title="Eliminar equipo (Supr)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold mb-1">Identificador (TAG)</label>
                    <input
                      type="text"
                      value={selectedObject.tag}
                      onChange={(e) => updateSelectedObject('tag', e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">Marca del Equipo</label>
                    <input
                      type="text"
                      placeholder="Ej. Aqualed, Philips..."
                      value={selectedObject.brand || ''}
                      onChange={(e) => updateSelectedObject('brand', e.target.value)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-sky-300'
                          : 'bg-slate-50 border-slate-200 text-sky-800'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    Componente Genérico (Agrupación Resumen)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Proyector LED Fotoperiodo"
                    value={
                      selectedObject.genericName !== undefined
                        ? selectedObject.genericName
                        : TYPE_GENERIC_LABELS[selectedObject.type] || ''
                    }
                    onChange={(e) => updateSelectedObject('genericName', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-semibold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Características / Especificación</label>
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

                {/* Sistema / Circuito */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold">Sistema / Circuito</label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const currentCfg = phaseConfigs[selectedObject.phase] || {
                            label: selectedObject.phase,
                            color: '#0284c7',
                          };
                          setCircuitForm({
                            key: selectedObject.phase,
                            label: currentCfg.label,
                            color: currentCfg.color,
                          });
                          setCircuitEditorMode(circuitEditorMode === 'edit' ? null : 'edit');
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-200 dark:bg-slate-800 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center gap-1"
                        title="Modificar nombre o color de este circuito"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCircuitForm({
                            key: '',
                            label: '',
                            color: '#7c3aed',
                          });
                          setCircuitEditorMode(circuitEditorMode === 'create' ? null : 'create');
                        }}
                        className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-600 text-white hover:bg-sky-700 flex items-center gap-1"
                        title="Crear un nuevo tipo de circuito"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Nuevo</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <select
                      value={selectedObject.phase}
                      onChange={(e) => updateSelectedObject('phase', e.target.value)}
                      className={`col-span-2 px-2.5 py-2 rounded-xl text-xs font-bold border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    >
                      {Object.entries(phaseConfigs).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v.label}
                        </option>
                      ))}
                    </select>

                    <div>
                      <input
                        type="number"
                        placeholder="Watts"
                        value={selectedObject.power}
                        onChange={(e) => updateSelectedObject('power', Number(e.target.value))}
                        className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold border ${
                          darkMode
                            ? 'bg-slate-800 border-slate-700 text-white'
                            : 'bg-slate-50 border-slate-200 text-slate-900'
                        }`}
                        title="Potencia en Watts (W)"
                      />
                    </div>
                  </div>

                  {circuitEditorMode && (
                    <form
                      onSubmit={handleSaveCircuitType}
                      className={`p-2.5 rounded-xl border space-y-2 ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700'
                          : 'bg-sky-50 border-sky-200'
                      }`}
                    >
                      <div className="text-[10px] font-extrabold uppercase text-sky-600 dark:text-sky-400">
                        {circuitEditorMode === 'edit'
                          ? 'Modificar Tipo de Circuito'
                          : 'Crear Nuevo Tipo de Circuito'}
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Nombre del circuito (Ej. Respaldo UPS)"
                        value={circuitForm.label}
                        onChange={(e) =>
                          setCircuitForm((p) => ({ ...p, label: e.target.value }))
                        }
                        className={`w-full px-2.5 py-1.5 rounded-lg text-xs border ${
                          darkMode
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                      {renderBasic32ColorGrid(circuitForm.color, (hex) =>
                        setCircuitForm((p) => ({ ...p, color: hex }))
                      )}
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCircuitEditorMode(null)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-200 dark:bg-slate-700"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          Guardar Circuito
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-sky-500" />
                      <span>Color de la Simbología (32 colores)</span>
                    </label>
                    {selectedObject.customColor && (
                      <button
                        type="button"
                        onClick={() => updateSelectedObject('customColor', '')}
                        className="text-[10px] font-extrabold text-sky-600 dark:text-sky-400 hover:underline"
                      >
                        Usar color circuito
                      </button>
                    )}
                  </div>
                  {renderBasic32ColorGrid(selectedObject.customColor, (hex) =>
                    updateSelectedObject('customColor', hex)
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5">
                    Volteo Asimétrico (Tipo Espejo)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => updateSelectedObject('flipX', !selectedObject.flipX)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 transition-colors ${
                        selectedObject.flipX
                          ? 'border-sky-500 bg-sky-500/15 text-sky-600 dark:text-sky-300'
                          : darkMode
                          ? 'border-slate-700 bg-slate-800 text-slate-300'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <FlipHorizontal2 className="w-4 h-4" />
                      <span>Espejo Horizontal</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedObject('flipY', !selectedObject.flipY)}
                      className={`py-2 px-2.5 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 transition-colors ${
                        selectedObject.flipY
                          ? 'border-sky-500 bg-sky-500/15 text-sky-600 dark:text-sky-300'
                          : darkMode
                          ? 'border-slate-700 bg-slate-800 text-slate-300'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <FlipVertical2 className="w-4 h-4" />
                      <span>Espejo Vertical</span>
                    </button>
                  </div>
                </div>

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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={copySelectedToClipboard}
                      className="p-2 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-300 hover:bg-slate-500/25"
                      title="Copiar (Ctrl+C)"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cutSelectedToClipboard}
                      className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                      title="Cortar (Ctrl+X)"
                    >
                      <Scissors className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteConduit(selectedConduit.id)}
                      className="p-2 rounded-xl bg-rose-500/15 text-rose-600 hover:bg-rose-500/25"
                      title="Eliminar canalización (Supr)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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
                    className={`w-full px-2.5 py-2 rounded-xl text-xs font-bold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    {Object.entries(CONDUIT_PHASE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    Tipo de Conductor y Canalización
                  </label>
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
                  <label className="block text-xs font-bold mb-1">
                    Bajada Sumergida / Holgura Vertical (m)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={selectedConduit.dropMeters ?? 0}
                    onChange={(e) => updateSelectedConduit('dropMeters', Number(e.target.value))}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-extrabold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-sky-400'
                        : 'bg-slate-50 border-slate-200 text-sky-700'
                    }`}
                  />
                </div>

                {(() => {
                  const m = calculateConduitMetrics(selectedConduit);
                  return (
                    <div
                      className={`p-3 rounded-xl border space-y-1.5 text-xs ${
                        darkMode
                          ? 'bg-slate-800/70 border-slate-700'
                          : 'bg-sky-50 border-sky-200'
                      }`}
                    >
                      <div className="font-extrabold text-sky-600 dark:text-sky-400 uppercase text-[10px]">
                        Cubicación Automática del Tramo
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Recorrido Horizontal:</span>
                        <span className="font-bold">{m.horizontalMeters} m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Bajada / Holgura:</span>
                        <span className="font-bold">{m.dropMeters} m</span>
                      </div>
                      <div className="flex justify-between border-t border-slate-300 dark:border-slate-700 pt-1.5 text-sm font-extrabold">
                        <span>Total Cable Tramo:</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          {m.totalMeters} m
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : selectedModule ? (
              /* EDITOR DE MÓDULO DE CULTIVO */
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-sky-500">
                    Módulo de Cultivo Seleccionado
                  </span>
                  <h2 className="text-lg font-extrabold">{selectedModule.name}</h2>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Nombre del Módulo</label>
                  <input
                    type="text"
                    value={selectedModule.name}
                    onChange={(e) => updateSelectedModule('name', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-sm font-extrabold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Subtítulo / Descripción del Tren</label>
                  <input
                    type="text"
                    value={selectedModule.subtitle || ''}
                    onChange={(e) => updateSelectedModule('subtitle', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => centerModuleHeaderOverCages(selectedModule.id)}
                    className="py-2 px-3 rounded-xl text-xs font-extrabold bg-sky-600 text-white hover:bg-sky-700 flex items-center justify-center gap-1.5"
                  >
                    <AlignCenterHorizontal className="w-3.5 h-3.5" />
                    <span>Centrar Encabezado</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateSelectedModule('headerOffsetX', 0);
                      updateSelectedModule('headerOffsetY', 0);
                    }}
                    className="py-2 px-3 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-sky-500/20"
                  >
                    Alinear Izquierda
                  </button>
                </div>
              </div>
            ) : selectedKind === 'trunk' ? (
              /* EDITOR DE ETIQUETA DE TRONCAL */
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-sky-500">
                    Línea Troncal entre Módulos
                  </span>
                  <h2 className="text-lg font-extrabold">Etiqueta de Troncal Submarina</h2>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Texto de la Etiqueta</label>
                  <input
                    type="text"
                    value={trunkLabel}
                    onChange={(e) => setTrunkLabel(e.target.value)}
                    placeholder="Ej. Troncal Submarina 224m"
                    className={`w-full px-3 py-2 rounded-xl text-sm font-bold border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-xs font-bold">Mostrar etiqueta en el plano</span>
                  <button
                    onClick={() => setShowTrunkLabel((v) => !v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                      showTrunkLabel
                        ? 'bg-sky-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {showTrunkLabel ? 'Visible' : 'Oculta'}
                  </button>
                </div>
              </div>
            ) : selectedCage ? (
              /* EDITOR DE JAULA SELECCIONADA */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase text-amber-500">
                      Unidad de Cultivo Seleccionada
                    </span>
                    <h2 className="text-lg font-extrabold">
                      Jaula {selectedCage.label || selectedCage.number}
                    </h2>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={copySelectedToClipboard}
                      className="p-2 rounded-xl bg-slate-500/15 text-slate-600 dark:text-slate-300 hover:bg-slate-500/25"
                      title="Copiar Jaula (Ctrl+C)"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cutSelectedToClipboard}
                      className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25"
                      title="Cortar Jaula (Ctrl+X)"
                    >
                      <Scissors className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCage(selectedCage.id)}
                      className="p-2 rounded-xl bg-rose-500/15 text-rose-600 hover:bg-rose-500/25"
                      title="Eliminar Jaula (Supr)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    Número o Texto Interior de Jaula
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectedCage.label !== undefined ? selectedCage.label : String(selectedCage.number)}
                      onChange={(e) => updateSelectedCage('label', e.target.value)}
                      placeholder="Ej. 201 o dejar vacío"
                      className={`flex-1 px-3 py-2 rounded-xl text-sm font-extrabold border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-900'
                      }`}
                    />
                    <button
                      onClick={() => updateSelectedCage('label', '')}
                      className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-700 hover:bg-rose-500/20 text-slate-700 dark:text-slate-200"
                      title="Borrar número interior"
                    >
                      Limpiar
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    Dimensión de Jaula Cuadrada (metros por lado)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="5"
                      max="150"
                      value={selectedCage.sizeMeters || BASE_CAGE_METERS}
                      onChange={(e) => updateSelectedCage('sizeMeters', e.target.value)}
                      className={`w-28 px-3 py-2 rounded-xl text-sm font-extrabold border ${
                        darkMode
                          ? 'bg-slate-800 border-slate-700 text-sky-400'
                          : 'bg-slate-50 border-slate-200 text-sky-700'
                      }`}
                    />
                    <span className="text-xs font-bold text-slate-500">
                      m × {selectedCage.sizeMeters || BASE_CAGE_METERS} m
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div>
                    <div className="text-xs font-extrabold">Sistema Fotoperiodo</div>
                    <div className="text-[11px] text-slate-400">
                      {selectedCage.photoperiodActive
                        ? 'Encendido (180 Lux objetivo)'
                        : 'Apagado / Luz natural'}
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      updateSelectedCage('photoperiodActive', !selectedCage.photoperiodActive)
                    }
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold ${
                      selectedCage.photoperiodActive
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {selectedCage.photoperiodActive ? 'Activo' : 'Inactivo'}
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Especie en Cultivo</label>
                  <input
                    type="text"
                    value={selectedCage.species}
                    onChange={(e) => updateSelectedCage('species', e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs border ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>
            ) : (
              /* RESUMEN GENERAL */
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs space-y-1.5">
                  <div className="font-extrabold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                    <Info className="w-4 h-4" /> Inspector de Elementos
                  </div>
                  <p className="text-slate-500 dark:text-slate-300 leading-relaxed">
                    Usa el botón <strong>Agregar Símbolo</strong> para insertar uno o varios equipos idénticos de una sola vez, o haz <strong>doble clic</strong> sobre cualquier elemento del plano para editar sus propiedades.
                  </p>
                </div>

                {/* Resumen de Metros de Cable por Fase */}
                <div className="space-y-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block">
                    Cubicación de Cable por Fase
                  </span>
                  <div className="space-y-1.5">
                    {cableSummaryByPhase.map((item) => (
                      <div
                        key={item.phase}
                        className="flex items-center justify-between text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold">{item.label}</span>
                        </div>
                        <span className="font-extrabold">{item.totalMeters} m</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* ====================================================================
          MODAL DEDICADO: AGREGAR SÍMBOLO / OBJETO POR CANTIDAD
      ==================================================================== */}
      {showAddSymbolModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleInsertBatchSymbols}
            className={`w-full max-w-xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-sky-600 text-white">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wide">
                    Agregar Símbolo / Objeto al Plano
                  </h3>
                  <p className="text-[11px] text-sky-100">
                    Configura el equipo una vez e inserta toda la cantidad requerida con TAGs correlativos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSymbolModal(false)}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Fila 1: Tipo de Símbolo y Cantidad */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-extrabold mb-1 text-slate-600 dark:text-slate-300">
                    Tipo de Símbolo / Objeto *
                  </label>
                  <select
                    value={batchSymbolForm.symbolType}
                    onChange={(e) => handleBatchSymbolTypeChange(e.target.value)}
                    className={`w-full px-3 py-2.5 rounded-xl border text-xs font-extrabold ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="luminaria">Proyector LED Fotoperiodo</option>
                    <option value="enchufe_220v">Enchufe Industrial 220V</option>
                    <option value="fotocelda">Fotocelda Crepuscular</option>
                    <option value="tablero">Tablero Eléctrico IP66</option>
                    <option value="energizador">Energizador / Cerco Eléctrico</option>
                    <option value="sensor">Sensor / Sonda Multiparámetro</option>
                    <option value="camara">Cámara Submarina / PTZ</option>
                    <option value="alimentador">Selector de Alimentación</option>
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold mb-1 text-sky-600 dark:text-sky-400">
                    Cantidad a Insertar *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    required
                    value={batchSymbolForm.quantity}
                    onChange={(e) =>
                      setBatchSymbolForm((p) => ({ ...p, quantity: Number(e.target.value) }))
                    }
                    className={`w-full px-3 py-2.5 rounded-xl border text-sm font-extrabold text-center ${
                      darkMode
                        ? 'bg-slate-800 border-sky-500/60 text-sky-300'
                        : 'bg-sky-50 border-sky-400 text-sky-800'
                    }`}
                  />
                </div>
              </div>

              {/* Fila 2: Descripción técnica */}
              <div>
                <label className="block font-extrabold mb-1 text-slate-600 dark:text-slate-300">
                  Descripción / Especificación Técnica *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Proyector LED Fotoperiodo Sumergible 1000W 5000K"
                  value={batchSymbolForm.spec}
                  onChange={(e) =>
                    setBatchSymbolForm((p) => ({ ...p, spec: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              {/* Fila 3: Sistema / Circuito al que pertenece y Potencia */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-extrabold mb-1 text-slate-600 dark:text-slate-300">
                    Circuito / Sistema al que Pertenece *
                  </label>
                  <select
                    value={batchSymbolForm.phase}
                    onChange={(e) =>
                      setBatchSymbolForm((p) => ({ ...p, phase: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {Object.entries(phaseConfigs).map(([key, cfg]) => (
                      <option key={key} value={key}>
                        {cfg.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold mb-1 text-slate-600 dark:text-slate-300">
                    Potencia Unitaria (W) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={batchSymbolForm.power}
                    onChange={(e) =>
                      setBatchSymbolForm((p) => ({ ...p, power: Number(e.target.value) }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-extrabold ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Fila 4: Marca, Módulo de destino y Orientación */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-extrabold mb-1 text-slate-600 dark:text-slate-300">
                    Marca *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Aqualed, Schneider, JVA..."
                    value={batchSymbolForm.brand}
                    onChange={(e) =>
                      setBatchSymbolForm((p) => ({ ...p, brand: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-sky-300'
                        : 'bg-white border-slate-300 text-sky-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block font-extrabold mb-1 text-slate-600 dark:text-slate-300">
                    Módulo de Ubicación
                  </label>
                  <select
                    value={batchSymbolForm.targetModuleId}
                    onChange={(e) =>
                      setBatchSymbolForm((p) => ({ ...p, targetModuleId: e.target.value }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  >
                    {modules.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-extrabold mb-1 text-slate-600 dark:text-slate-300">
                    Orientación (°)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="360"
                    value={batchSymbolForm.rotation}
                    onChange={(e) =>
                      setBatchSymbolForm((p) => ({ ...p, rotation: Number(e.target.value) }))
                    }
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold ${
                      darkMode
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-white border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Color opcional */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-extrabold text-slate-600 dark:text-slate-300">
                    Color de Símbolo (Opcional · por defecto usa color del circuito)
                  </label>
                  {batchSymbolForm.customColor && (
                    <button
                      type="button"
                      onClick={() => setBatchSymbolForm((p) => ({ ...p, customColor: '' }))}
                      className="text-[11px] font-bold text-sky-600 hover:underline"
                    >
                      Restaurar color circuito
                    </button>
                  )}
                </div>
                {renderBasic32ColorGrid(batchSymbolForm.customColor, (hex) =>
                  setBatchSymbolForm((p) => ({ ...p, customColor: hex }))
                )}
              </div>

              {/* Resumen previo de la carga a insertar */}
              <div
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                  darkMode
                    ? 'bg-slate-800/80 border-slate-700'
                    : 'bg-sky-50 border-sky-200'
                }`}
              >
                <div>
                  <span className="font-extrabold text-sky-600 dark:text-sky-400">
                    Resumen a insertar:{' '}
                  </span>
                  <span className="font-bold">
                    {Math.max(1, Number(batchSymbolForm.quantity) || 1)} ×{' '}
                    {batchSymbolForm.genericName} ({batchSymbolForm.brand || 'Genérico'})
                  </span>
                </div>
                <div className="font-extrabold text-emerald-600 dark:text-emerald-400">
                  Potencia Total:{' '}
                  {(
                    ((Math.max(1, Number(batchSymbolForm.quantity) || 1) *
                      (Number(batchSymbolForm.power) || 0)) /
                      1000)
                  ).toFixed(2)}{' '}
                  kW
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={batchSymbolForm.saveInPalette}
                  onChange={(e) =>
                    setBatchSymbolForm((p) => ({ ...p, saveInPalette: e.target.checked }))
                  }
                  className="rounded accent-sky-600"
                />
                <span>Guardar también como plantilla en la paleta rápida izquierda</span>
              </label>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddSymbolModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-extrabold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>
                  Insertar {Math.max(1, Number(batchSymbolForm.quantity) || 1)} Símbolo(s) en el Plano
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ====================================================================
          MODAL NUEVO PROYECTO (CON DISTRIBUCIÓN DE JAULAS CONFIGURABLE)
      ==================================================================== */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateNewProject}
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-500" />
                <h3 className="text-base font-extrabold">Crear Nuevo Proyecto en la Plataforma</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="p-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-rose-500/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Nombre del Proyecto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Instalación Fotoperiodo Tren Norte y Sur"
                  value={newProjectForm.projectName}
                  onChange={(e) =>
                    setNewProjectForm((p) => ({ ...p, projectName: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border font-semibold ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Cliente / Empresa Mandante *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Salmones Austral S.A."
                  value={newProjectForm.clientName}
                  onChange={(e) =>
                    setNewProjectForm((p) => ({ ...p, clientName: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Nombre del Centro de Cultivo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Centro Punta Arenas"
                  value={newProjectForm.centerName}
                  onChange={(e) =>
                    setNewProjectForm((p) => ({ ...p, centerName: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Descripción del Proyecto</label>
                <textarea
                  rows={2}
                  placeholder="Detalle técnico del alcance..."
                  value={newProjectForm.projectDescription}
                  onChange={(e) =>
                    setNewProjectForm((p) => ({ ...p, projectDescription: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold mb-1">Coordenadas (Lat, Lon)</label>
                <input
                  type="text"
                  placeholder="-41.784520, -73.124890"
                  value={newProjectForm.coordinates}
                  onChange={(e) =>
                    setNewProjectForm((p) => ({ ...p, coordinates: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
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
                    setNewProjectForm((p) => ({ ...p, googleMapsUrl: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* CONFIGURACIÓN DE DISTRIBUCIÓN DE JAULAS DEL CENTRO */}
              <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                    Distribución de Jaulas y Dimensiones (Separación Estándar Automática)
                  </span>
                </div>

                {/* Módulo 1 */}
                <div
                  className={`p-3 rounded-xl border space-y-2 ${
                    darkMode
                      ? 'bg-slate-800/70 border-slate-700'
                      : 'bg-sky-50/70 border-sky-200'
                  }`}
                >
                  <div className="text-[11px] font-extrabold text-sky-700 dark:text-sky-300">
                    Tren / Módulo 1 ({Math.max(1, Number(newProjectForm.mod1Rows) || 1) * Math.max(1, Number(newProjectForm.mod1Cols) || 1)} jaulas)
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="block text-[10px] font-bold mb-0.5">Nombre</label>
                      <input
                        type="text"
                        value={newProjectForm.mod1Name}
                        onChange={(e) =>
                          setNewProjectForm((p) => ({ ...p, mod1Name: e.target.value }))
                        }
                        className={`w-full px-2 py-1.5 rounded-lg border font-bold ${
                          darkMode
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-0.5">Filas</label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={newProjectForm.mod1Rows}
                        onChange={(e) =>
                          setNewProjectForm((p) => ({ ...p, mod1Rows: Number(e.target.value) }))
                        }
                        className={`w-full px-2 py-1.5 rounded-lg border font-bold ${
                          darkMode
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-0.5">Columnas</label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={newProjectForm.mod1Cols}
                        onChange={(e) =>
                          setNewProjectForm((p) => ({ ...p, mod1Cols: Number(e.target.value) }))
                        }
                        className={`w-full px-2 py-1.5 rounded-lg border font-bold ${
                          darkMode
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-0.5">N° Inicial</label>
                      <input
                        type="number"
                        min="1"
                        value={newProjectForm.mod1StartNumber}
                        onChange={(e) =>
                          setNewProjectForm((p) => ({
                            ...p,
                            mod1StartNumber: Number(e.target.value),
                          }))
                        }
                        className={`w-full px-2 py-1.5 rounded-lg border font-bold ${
                          darkMode
                            ? 'bg-slate-900 border-slate-700 text-white'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-0.5">Lado Jaula (m)</label>
                      <input
                        type="number"
                        min="5"
                        max="150"
                        value={newProjectForm.mod1CageMeters}
                        onChange={(e) =>
                          setNewProjectForm((p) => ({
                            ...p,
                            mod1CageMeters: Number(e.target.value),
                          }))
                        }
                        className={`w-full px-2 py-1.5 rounded-lg border font-extrabold text-sky-600 ${
                          darkMode
                            ? 'bg-slate-900 border-slate-700'
                            : 'bg-white border-slate-300'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Módulo 2 Opcional */}
                <div
                  className={`p-3 rounded-xl border space-y-2 ${
                    darkMode
                      ? 'bg-slate-800/70 border-slate-700'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300">
                      Tren / Módulo 2{' '}
                      {newProjectForm.hasMod2
                        ? `(${Math.max(1, Number(newProjectForm.mod2Rows) || 1) * Math.max(1, Number(newProjectForm.mod2Cols) || 1)} jaulas)`
                        : '(Desactivado)'}
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newProjectForm.hasMod2}
                        onChange={(e) =>
                          setNewProjectForm((p) => ({ ...p, hasMod2: e.target.checked }))
                        }
                        className="rounded text-emerald-600"
                      />
                      <span>Incluir segundo módulo</span>
                    </label>
                  </div>

                  {newProjectForm.hasMod2 && (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-[10px] font-bold mb-0.5">Nombre</label>
                        <input
                          type="text"
                          value={newProjectForm.mod2Name}
                          onChange={(e) =>
                            setNewProjectForm((p) => ({ ...p, mod2Name: e.target.value }))
                          }
                          className={`w-full px-2 py-1.5 rounded-lg border font-bold ${
                            darkMode
                              ? 'bg-slate-900 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold mb-0.5">Filas</label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={newProjectForm.mod2Rows}
                          onChange={(e) =>
                            setNewProjectForm((p) => ({ ...p, mod2Rows: Number(e.target.value) }))
                          }
                          className={`w-full px-2 py-1.5 rounded-lg border font-bold ${
                            darkMode
                              ? 'bg-slate-900 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold mb-0.5">Columnas</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={newProjectForm.mod2Cols}
                          onChange={(e) =>
                            setNewProjectForm((p) => ({ ...p, mod2Cols: Number(e.target.value) }))
                          }
                          className={`w-full px-2 py-1.5 rounded-lg border font-bold ${
                            darkMode
                              ? 'bg-slate-900 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold mb-0.5">N° Inicial</label>
                        <input
                          type="number"
                          min="1"
                          value={newProjectForm.mod2StartNumber}
                          onChange={(e) =>
                            setNewProjectForm((p) => ({
                              ...p,
                              mod2StartNumber: Number(e.target.value),
                            }))
                          }
                          className={`w-full px-2 py-1.5 rounded-lg border font-bold ${
                            darkMode
                              ? 'bg-slate-900 border-slate-700 text-white'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold mb-0.5">Lado Jaula (m)</label>
                        <input
                          type="number"
                          min="5"
                          max="150"
                          value={newProjectForm.mod2CageMeters}
                          onChange={(e) =>
                            setNewProjectForm((p) => ({
                              ...p,
                              mod2CageMeters: Number(e.target.value),
                            }))
                          }
                          className={`w-full px-2 py-1.5 rounded-lg border font-extrabold text-sky-600 ${
                            darkMode
                              ? 'bg-slate-900 border-slate-700'
                              : 'bg-white border-slate-300'
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <input
                  id="clearObjectsChk"
                  type="checkbox"
                  checked={newProjectForm.clearExistingObjects}
                  onChange={(e) =>
                    setNewProjectForm((p) => ({ ...p, clearExistingObjects: e.target.checked }))
                  }
                  className="rounded text-emerald-600"
                />
                <label htmlFor="clearObjectsChk" className="font-semibold cursor-pointer">
                  Iniciar con el plano limpio (sin equipos ni canalizaciones previas)
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowNewProjectModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5"
              >
                <FolderPlus className="w-4 h-4" />
                <span>Crear y Guardar Proyecto</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ====================================================================
          MODAL: BASE DE DATOS DE PROYECTOS EN LA NUBE (FIREBASE)
      ==================================================================== */}
      {showCloudModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-4xl max-h-[88vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Cloud className="w-5 h-5 text-sky-500" />
                <div>
                  <h3 className="text-base font-extrabold">
                    Proyectos Guardados en Base de Datos en la Nube
                  </h3>
                  <p className="text-xs text-slate-400">
                    Proyecto activo: <strong>{companyInfo.projectName}</strong> · Centro:{' '}
                    <strong>{companyInfo.centerName}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCloudModal(false)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800"
              >
                Cerrar
              </button>
            </div>

            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-sky-500/5 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Título para guardar versión actual..."
                  value={blueprintNameInput}
                  onChange={(e) => setBlueprintNameInput(e.target.value)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                />
                <button
                  onClick={() => handleSaveToCloud(currentBlueprintId, blueprintNameInput)}
                  disabled={isSavingCloud}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5"
                >
                  <CloudUpload className="w-4 h-4" />
                  <span>{isSavingCloud ? 'Guardando...' : 'Actualizar Proyecto Actual'}</span>
                </button>
              </div>

              <input
                type="text"
                placeholder="Buscar proyecto guardado por nombre, cliente, centro..."
                value={cloudSearchQuery}
                onChange={(e) => setCloudSearchQuery(e.target.value)}
                className={`w-full px-3 py-2 rounded-xl text-xs border ${
                  darkMode
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
              {filteredBlueprints.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No se encontraron proyectos guardados en la nube.
                </div>
              ) : (
                filteredBlueprints.map((bp) => (
                  <div
                    key={bp.id}
                    className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      bp.id === currentBlueprintId
                        ? 'border-sky-500 bg-sky-500/10'
                        : darkMode
                        ? 'border-slate-800 bg-slate-800/50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm">
                          {bp.projectName || bp.title || bp.id}
                        </span>
                        {bp.id === currentBlueprintId && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-600 text-white">
                            ACTIVO
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        Cliente: {bp.clientName || bp.companyInfo?.clientName || '-'} · Centro:{' '}
                        {bp.centerName || bp.companyInfo?.centerName || '-'}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {bp.totalCages || bp.cages?.length || 0} jaulas ·{' '}
                        {bp.totalObjects || bp.objects?.length || 0} equipos · Actualizado:{' '}
                        {bp.updatedAt ? new Date(bp.updatedAt).toLocaleString('es-CL') : 'Reciente'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleLoadFromCloud(bp)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold"
                      >
                        Abrir Proyecto
                      </button>
                      <button
                        onClick={() => handleDeleteFromCloud(bp.id, bp.projectName || bp.title || bp.id)}
                        className="p-2 rounded-xl bg-rose-500/15 text-rose-600 hover:bg-rose-500/25"
                        title="Eliminar proyecto de la nube"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL DE INVENTARIO RESUMIDO POR EQUIPO GENÉRICO, MARCA Y CABLEADO
      ==================================================================== */}
      {showInventoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-5xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-extrabold">
                  Resumen General de Equipos y Cubicación de Cableado
                </h3>
                <p className="text-xs text-slate-400">
                  {companyInfo.projectName} · {companyInfo.centerName} ·{' '}
                  {summarizedEquipment.length} tipos de equipos ({objects.length} uds.) ·{' '}
                  {metrics.totalPowerKw} kW · {totalCableMeters} m cable
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Imprimir PDF
                </button>
                <button
                  onClick={() => setShowInventoryModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-xs font-bold"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="overflow-auto p-4 space-y-5">
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400 mb-2">
                  1. Resumen de Equipos Instalados por Componente Genérico y Marca
                </h4>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white text-left">
                      <th className="p-2.5 text-center">Cant.</th>
                      <th className="p-2.5">Componente Genérico</th>
                      <th className="p-2.5">Marca</th>
                      <th className="p-2.5">TAGs Agrupados</th>
                      <th className="p-2.5">Módulo</th>
                      <th className="p-2.5">Características Técnicas</th>
                      <th className="p-2.5">Circuito / Fase</th>
                      <th className="p-2.5 text-right">Pot. Unit.</th>
                      <th className="p-2.5 text-right">Pot. Total</th>
                      <th className="p-2.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summarizedEquipment.map((g) => (
                      <tr
                        key={g.key}
                        className="border-b border-slate-200 dark:border-slate-800 hover:bg-sky-500/5"
                      >
                        <td className="p-2.5 text-center font-extrabold text-sm text-sky-600 dark:text-sky-400">
                          {g.count}
                        </td>
                        <td className="p-2.5 font-extrabold">{g.genericName}</td>
                        <td className="p-2.5 font-bold text-sky-700 dark:text-sky-300">
                          {g.brand}
                        </td>
                        <td className="p-2.5 text-[11px] text-slate-500 max-w-[160px] truncate" title={g.tagsLabel}>
                          {g.tagsLabel}
                        </td>
                        <td className="p-2.5">{g.modulesLabel}</td>
                        <td className="p-2.5">{g.spec}</td>
                        <td className="p-2.5 font-semibold">
                          {phaseConfigs[g.phase]?.label || g.phase}
                        </td>
                        <td className="p-2.5 text-right">{g.unitPower} W</td>
                        <td className="p-2.5 text-right font-extrabold">{g.totalPower} W</td>
                        <td className="p-2.5 font-bold">{g.summaryStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2">
                  2. Cubicación de Canalizaciones y Metros de Cable por Fase
                </h4>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white text-left">
                      <th className="p-2.5">TAG Tramo</th>
                      <th className="p-2.5">Fase Eléctrica</th>
                      <th className="p-2.5">Conductor / Ducto</th>
                      <th className="p-2.5 text-right">Tramo Pasillo</th>
                      <th className="p-2.5 text-right">Bajada / Holgura</th>
                      <th className="p-2.5 text-right">Total Cable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conduits.map((c) => {
                      const m = calculateConduitMetrics(c);
                      const pCfg = CONDUIT_PHASE_CONFIG[c.phase] || CONDUIT_PHASE_CONFIG.fase_r;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => {
                            setSelectedId(c.id);
                            setSelectedKind('conduit');
                            setShowRightSidebar(true);
                            setShowInventoryModal(false);
                          }}
                          className="border-b border-slate-200 dark:border-slate-800 hover:bg-sky-500/10 cursor-pointer"
                        >
                          <td className="p-2.5 font-extrabold">{c.tag}</td>
                          <td className="p-2.5 font-bold flex items-center gap-1.5">
                            <span
                              className="w-2.5 h-2.5 rounded-full"
                              style={{ backgroundColor: pCfg.color }}
                            />
                            <span>{pCfg.label}</span>
                          </td>
                          <td className="p-2.5">{c.cableSpec}</td>
                          <td className="p-2.5 text-right">{m.horizontalMeters} m</td>
                          <td className="p-2.5 text-right">{m.dropMeters} m</td>
                          <td className="p-2.5 text-right font-extrabold text-emerald-600 dark:text-emerald-400">
                            {m.totalMeters} m
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-100 dark:bg-slate-800 font-extrabold">
                      <td colSpan={5} className="p-2.5 text-right">
                        TOTAL GENERAL DE CABLE UTILIZADO:
                      </td>
                      <td className="p-2.5 text-right text-sky-600 dark:text-sky-400">
                        {totalCableMeters} m
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL CONFIGURACIÓN DE PROYECTO, COORDENADAS Y FIRMA PDF
      ==================================================================== */}
      {showCompanyModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
              darkMode
                ? 'bg-slate-900 border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <h3 className="text-base font-extrabold">
              Datos del Proyecto, Ubicación y Firma Técnica
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Nombre del Proyecto</label>
                <input
                  type="text"
                  value={companyInfo.projectName}
                  onChange={(e) =>
                    setCompanyInfo((p) => ({ ...p, projectName: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border font-bold ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block font-bold mb-1">Descripción del Proyecto</label>
                <textarea
                  rows={2}
                  value={companyInfo.projectDescription || ''}
                  onChange={(e) =>
                    setCompanyInfo((p) => ({ ...p, projectDescription: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Cliente / Empresa Mandante</label>
                <input
                  type="text"
                  value={companyInfo.clientName || ''}
                  onChange={(e) =>
                    setCompanyInfo((p) => ({ ...p, clientName: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Centro de Cultivo / Pontón</label>
                <input
                  type="text"
                  value={companyInfo.centerName}
                  onChange={(e) =>
                    setCompanyInfo((p) => ({ ...p, centerName: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Coordenadas (Lat, Lon)</label>
                <input
                  type="text"
                  placeholder="-41.784520, -73.124890"
                  value={companyInfo.coordinates || ''}
                  onChange={(e) =>
                    setCompanyInfo((p) => ({ ...p, coordinates: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Enlace Google Maps</label>
                <input
                  type="url"
                  placeholder="https://maps.google.com/..."
                  value={companyInfo.googleMapsUrl || ''}
                  onChange={(e) =>
                    setCompanyInfo((p) => ({ ...p, googleMapsUrl: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
              <div>
                <label className="block font-bold mb-1">Empresa Ejecutora (Pie de página PDF)</label>
                <input
                  type="text"
                  value={companyInfo.companyName}
                  onChange={(e) =>
                    setCompanyInfo((p) => ({ ...p, companyName: e.target.value }))
                  }
                  className={`w-full px-3 py-2 rounded-xl border ${
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
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
                    darkMode
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-200 text-slate-900'
                  }`}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setShowCompanyModal(false);
                  notify('Datos del proyecto actualizados', 'success');
                }}
                className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-extrabold"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL DE VISTA PREVIA DE LÁMINA TÉCNICA
      ==================================================================== */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-6xl max-h-[92vh] bg-white text-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-5 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MonitorPlay className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-extrabold uppercase tracking-wider">
                  Vista Previa Lámina Técnica · {companyInfo.centerName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPNG}
                  className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-xs font-bold flex items-center gap-1"
                >
                  <ImageIcon className="w-3.5 h-3.5" /> Descargar PNG
                </button>
                <button
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-xs font-bold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Exportar PDF
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-xs font-bold"
                >
                  Cerrar
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between gap-4">
                {companyInfo.logoDataUrl ? (
                  <img
                    src={companyInfo.logoDataUrl}
                    alt="Logo"
                    className="h-16 max-w-[230px] object-contain"
                  />
                ) : (
                  <div className="w-12" />
                )}
                <div className="flex-1 text-center text-sm sm:text-base font-extrabold tracking-wide text-slate-900">
                  PLATAFORMA DE DISTRIBUCION EQUIPOS EN CENTROS DE CULTIVO
                </div>
                <div className="w-12" />
              </div>

              <div
                className="border-2 border-slate-300 rounded-xl p-2 bg-white"
                dangerouslySetInnerHTML={{
                  __html: generateSvgStringForExport(true) || '',
                }}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 border-2 border-slate-900 text-xs">
                <div className="p-2.5 border-b md:border-b-0 md:border-r border-slate-900">
                  <span className="block text-[9px] font-extrabold uppercase text-slate-500">
                    Proyecto
                  </span>
                  <span className="font-extrabold">{companyInfo.projectName}</span>
                </div>
                <div className="p-2.5 border-b md:border-b-0 md:border-r border-slate-900">
                  <span className="block text-[9px] font-extrabold uppercase text-slate-500">
                    Cliente
                  </span>
                  <span className="font-bold">{companyInfo.clientName}</span>
                </div>
                <div className="p-2.5">
                  <span className="block text-[9px] font-extrabold uppercase text-slate-500">
                    Centro / Coordenadas
                  </span>
                  <span className="font-bold block">{companyInfo.centerName}</span>
                  {companyInfo.coordinates && (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 font-bold underline text-[11px]"
                    >
                      {companyInfo.coordinates} (Abrir en Google Maps)
                    </a>
                  )}
                </div>
              </div>

              <div className="flex justify-between items-end pt-3 border-t border-slate-200">
                <div className="text-sm font-extrabold text-slate-900">
                  {companyInfo.companyName}
                </div>
                <div className="text-right text-xs">
                  <span className="font-bold">{companyInfo.responsibleName}</span> ·{' '}
                  <span className="text-slate-500">{companyInfo.responsibleLicense}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOOLTIP FLOTANTE AL PASAR EL CURSOR POR UN EQUIPO */}
      {hoveredObj && !draggingObjId && (
        <div
          className={`fixed bottom-24 right-5 z-30 p-3 rounded-2xl border shadow-xl max-w-xs pointer-events-none ${
            darkMode
              ? 'bg-slate-900/95 border-slate-700 text-slate-100'
              : 'bg-white/95 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-xs font-extrabold text-sky-500">{hoveredObj.tag}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-500/15">
              {STATUS_CONFIG[hoveredObj.status]?.label}
            </span>
          </div>
          <div className="text-xs font-bold">
            {hoveredObj.spec}
            {hoveredObj.brand ? ` · Marca: ${hoveredObj.brand}` : ''}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {phaseConfigs[hoveredObj.phase]?.label || hoveredObj.phase} · {hoveredObj.power}W
          </div>
        </div>
      )}

      {/* NOTIFICACIÓN TOAST */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}