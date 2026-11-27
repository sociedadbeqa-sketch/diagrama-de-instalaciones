import {
    PDFArray,
    PDFDocument,
    PDFName,
    PDFOperator,
    PDFOperatorNames,
    PDFPage,
    PDFRef,
    PDFString,
    StandardFonts,
    rgb,
  } from 'pdf-lib';
  
  interface PhaseConfigEntry {
    label: string;
    short: string;
    color: string;
    dashArray?: string;
  }
  
  export interface ExportPdfWithLayersParams {
    svgElement: SVGSVGElement;
    darkMode: boolean;
    fileName: string;
    companyInfo: {
      projectName?: string;
      projectDescription?: string;
      clientName?: string;
      centerName?: string;
      coordinates?: string;
      googleMapsUrl?: string;
      companyName?: string;
      responsibleName?: string;
      responsibleRole?: string;
      logoDataUrl?: string;
      signatureDataUrl?: string;
    };
    mapsLink: string;
    cages: any[];
    objects: any[];
    conduits: any[];
    annotations: any[];
    modules: any[];
    moduleBoundsMap: Record<string, any>;
    summarizedEquipment: any[];
    phaseConfigs?: Record<string, { label: string; color?: string }>;
    conduitPhaseConfig: Record<string, PhaseConfigEntry>;
    typeGenericLabels: Record<string, string>;
    calculateConduitMetrics: (conduit: any) => {
      horizontalMeters: number;
      dropMeters: number;
      totalMeters: number;
    };
    resolveConduitModuleId: (conduit: any, cagesList: any[], modulesList: any[]) => string;
  }
  
  const WIN_ANSI_EXTRAS = new Set([
    0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160,
    0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014,
    0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
  ]);
  
  function toPdfText(input: unknown): string {
    const raw = String(input ?? '')
      .replace(/\r?\n/g, ' ')
      .replace(/[✓✔]/g, 'OK')
      .replace(/[→➜]/g, '->')
      .replace(/[←]/g, '<-')
      .replace(/\u00a0/g, ' ');
  
    let out = '';
    for (let i = 0; i < raw.length; i++) {
      const code = raw.charCodeAt(i);
      if (
        (code >= 0x20 && code <= 0x7e) ||
        (code >= 0xa0 && code <= 0xff) ||
        WIN_ANSI_EXTRAS.has(code)
      ) {
        out += raw[i];
      } else if (code >= 0xd800 && code <= 0xdbff) {
        // Skip surrogate pairs cleanly
        i++;
      } else {
        out += ' ';
      }
    }
    return out.replace(/\s+/g, ' ').trim();
  }
  
  function hexToRgbColor(hex: string, fallback = { r: 0.06, g: 0.09, b: 0.16 }) {
    const cleaned = String(hex || '').replace('#', '').trim();
    if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
      return rgb(
        parseInt(cleaned.slice(0, 2), 16) / 255,
        parseInt(cleaned.slice(2, 4), 16) / 255,
        parseInt(cleaned.slice(4, 6), 16) / 255
      );
    }
    return rgb(fallback.r, fallback.g, fallback.b);
  }
  
  function wrapPdfText(
    text: string,
    font: any,
    fontSize: number,
    maxWidth: number
  ): string[] {
    const safe = toPdfText(text);
    if (!safe) return [''];
  
    const words = safe.split(' ');
    const lines: string[] = [];
    let current = '';
  
    const pushBrokenWord = (word: string) => {
      let chunk = '';
      for (const ch of word) {
        const test = chunk + ch;
        if (font.widthOfTextAtSize(test, fontSize) <= maxWidth || chunk.length === 0) {
          chunk = test;
        } else {
          lines.push(chunk);
          chunk = ch;
        }
      }
      if (chunk) lines.push(chunk);
    };
  
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
      } else {
        if (current) {
          lines.push(current);
          current = '';
        }
        if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
          current = word;
        } else {
          pushBrokenWord(word);
        }
      }
    }
    if (current) lines.push(current);
    return lines.length > 0 ? lines : [''];
  }
  
  async function dataUrlToPngBytes(dataUrl: string): Promise<Uint8Array | null> {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    try {
      return await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const w = Math.max(1, img.naturalWidth || img.width || 200);
          const h = Math.max(1, img.naturalHeight || img.height || 100);
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          canvas.toBlob(async (blob) => {
            if (!blob) {
              resolve(null);
              return;
            }
            const buf = await blob.arrayBuffer();
            resolve(new Uint8Array(buf));
          }, 'image/png');
        };
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      });
    } catch {
      return null;
    }
  }
  
  async function svgElementToPngBytes(
    svgNode: SVGSVGElement,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<Uint8Array> {
    const svgStr = new XMLSerializer().serializeToString(svgNode);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
  
    try {
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('No se pudo inicializar el lienzo de exportación'));
            return;
          }
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);
          ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
          canvas.toBlob(async (pngBlob) => {
            if (!pngBlob) {
              reject(new Error('No se pudo convertir la capa SVG a PNG'));
              return;
            }
            const buf = await pngBlob.arrayBuffer();
            resolve(new Uint8Array(buf));
          }, 'image/png');
        };
        img.onerror = () => reject(new Error('Error al renderizar capa del plano SVG'));
        img.src = url;
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  
  function prepareNormalizedSvgClone(
    svgEl: SVGSVGElement,
    minX: number,
    minY: number,
    exportWidth: number,
    exportHeight: number
  ): SVGSVGElement {
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('viewBox', `${minX} ${minY} ${exportWidth} ${exportHeight}`);
    clone.setAttribute('width', String(exportWidth));
    clone.setAttribute('height', String(exportHeight));
    clone.setAttribute('font-family', 'Segoe UI, Arial, Helvetica, sans-serif');
    clone.style.backgroundColor = 'transparent';
  
    const gridRect = clone.querySelector('#sea-grid-bg');
    if (gridRect) gridRect.remove();
  
    const viewportG = clone.querySelector('#plan-viewport');
    if (viewportG) {
      viewportG.setAttribute('transform', 'translate(0, 0) scale(1)');
    }
  
    return clone;
  }
  
  function drawTableroVectorIcon(
    page: PDFPage,
    centerX: number,
    centerY: number,
    tb: {
      effectiveColor?: string;
      statusColor?: string;
      rotation?: number;
      flipX?: boolean;
      flipY?: boolean;
    }
  ) {
    const mainColor = hexToRgbColor(tb.effectiveColor || '#ef4444');
    const statusColor = hexToRgbColor(tb.statusColor || '#10b981');
    const r = 6.2;
  
    page.drawCircle({
      x: centerX,
      y: centerY,
      size: r,
      color: rgb(1, 1, 1),
      borderColor: mainColor,
      borderWidth: 1.1,
    });
  
    const boxW = 5.2;
    const boxH = 5.8;
    page.drawRectangle({
      x: centerX - boxW / 2,
      y: centerY - boxH / 2,
      width: boxW,
      height: boxH,
      color: mainColor,
    });
  
    // Small white lightning bolt inside the panel
    const sx = tb.flipX ? -1 : 1;
    const sy = tb.flipY ? -1 : 1;
    const rad = ((Number(tb.rotation) || 0) * Math.PI) / 180;
    const tx = (x: number, y: number) => {
      const px = x * sx;
      const py = y * sy;
      const rx = px * Math.cos(rad) - py * Math.sin(rad);
      const ry = px * Math.sin(rad) + py * Math.cos(rad);
      return { x: centerX + rx * 0.36, y: centerY - ry * 0.36 };
    };
    const p1 = tx(1, -4.5);
    const p2 = tx(-2.5, 0.8);
    const p3 = tx(0.5, 0.8);
    const p4 = tx(-1, 4.5);
    page.drawLine({ start: p1, end: p2, thickness: 0.9, color: rgb(1, 1, 1) });
    page.drawLine({ start: p2, end: p3, thickness: 0.9, color: rgb(1, 1, 1) });
    page.drawLine({ start: p3, end: p4, thickness: 0.9, color: rgb(1, 1, 1) });
  
    // Status dot top-right
    page.drawCircle({
      x: centerX + 4.8,
      y: centerY + 4.8,
      size: 1.8,
      color: statusColor,
      borderColor: rgb(1, 1, 1),
      borderWidth: 0.6,
    });
  }
  
  export async function buildPdfWithLayersBytes(
    params: ExportPdfWithLayersParams
  ): Promise<Uint8Array> {
    const {
      svgElement,
      darkMode,
      companyInfo,
      mapsLink,
      cages,
      objects,
      conduits,
      annotations,
      modules,
      moduleBoundsMap,
      summarizedEquipment,
      phaseConfigs,
      conduitPhaseConfig,
      typeGenericLabels,
      calculateConduitMetrics,
      resolveConduitModuleId,
    } = params;
  
    // 1. Calcular bounding box completo del plano SVG
    let minX = 40;
    let minY = 65;
    let maxX = 1860;
    let maxY = 535;
  
    const activeBounds = Object.values(moduleBoundsMap || {}).filter((b: any) => b && b.hasCages);
    if (activeBounds.length > 0) {
      minX = Math.min(...activeBounds.map((b: any) => b.boxX)) - 60;
      minY = Math.min(...activeBounds.map((b: any) => b.boxY - 90)) - 20;
      maxX = Math.max(...activeBounds.map((b: any) => b.boxX + b.totalW)) + 60;
      maxY = Math.max(...activeBounds.map((b: any) => b.boxY + b.totalH)) + 60;
    }
  
    if (annotations.length > 0) {
      minX = Math.min(minX, ...annotations.map((a) => a.x - (a.width || 100) - 30));
      minY = Math.min(minY, ...annotations.map((a) => a.y - (a.height || 60) - 30));
      maxX = Math.max(maxX, ...annotations.map((a) => a.x + (a.width || 100) + 30));
      maxY = Math.max(maxY, ...annotations.map((a) => a.y + (a.height || 60) + 30));
    }
  
    if (objects.length > 0) {
      minX = Math.min(minX, ...objects.map((o) => Number(o.x || 0) - 65));
      minY = Math.min(minY, ...objects.map((o) => Number(o.y || 0) - 55));
      maxX = Math.max(maxX, ...objects.map((o) => Number(o.x || 0) + 65));
      maxY = Math.max(maxY, ...objects.map((o) => Number(o.y || 0) + 65));
    }
  
    conduits.forEach((c) => {
      (c.points || []).forEach((pt: any) => {
        minX = Math.min(minX, Number(pt.x || 0) - 70);
        minY = Math.min(minY, Number(pt.y || 0) - 45);
        maxX = Math.max(maxX, Number(pt.x || 0) + 70);
        maxY = Math.max(maxY, Number(pt.y || 0) + 45);
      });
    });
  
    const exportWidth = Math.max(800, Math.round(maxX - minX));
    const exportHeight = Math.max(380, Math.round(maxY - minY));
  
    const renderCanvasW = 2200;
    const renderCanvasH = Math.max(400, Math.round((renderCanvasW * exportHeight) / exportWidth));
  
    // 2. Preparar capas individuales del dibujo SVG (sin alterar tablas resumen)
    interface LayerRenderTask {
      id: string;
      name: string;
      group: 'base' | 'equipment' | 'conduits' | 'extras';
      subGroup?: string;
      parentId?: string;
      requiresLabelLayer?: boolean;
      svgNode: SVGSVGElement;
    }
  
    const layerTasks: LayerRenderTask[] = [];
    const masterClone = prepareNormalizedSvgClone(
      svgElement,
      minX,
      minY,
      exportWidth,
      exportHeight
    );
  
    // Capa Base: Módulos, pasillos y jaulas
    const baseClone = masterClone.cloneNode(true) as SVGSVGElement;
    baseClone
      .querySelectorAll(
        '[data-pdf-layer="object"], [data-pdf-layer="conduit"], [data-pdf-layer="trunk"], [data-pdf-layer="annotation"]'
      )
      .forEach((el) => el.remove());
    layerTasks.push({
      id: 'base',
      name: 'Plano Base (Módulos y Jaulas)',
      group: 'base',
      svgNode: baseClone,
    });
  
    // Capas de Equipos por tipo presente en el plano
    const presentObjTypes = Array.from(
      new Set(
        Array.from(masterClone.querySelectorAll('[data-pdf-layer="object"]'))
          .map((el) => el.getAttribute('data-obj-type') || '')
          .filter(Boolean)
      )
    );
  
    let hasAnyLabels = masterClone.querySelectorAll('[data-pdf-label="true"]').length > 0;
  
    presentObjTypes.forEach((objType) => {
      const labelName = typeGenericLabels[objType] || objType;
  
      if (objType === 'proyector_led') {
        const normalizeBrand = (el: Element) =>
          String(el.getAttribute('data-obj-brand') || '')
            .trim()
            .replace(/\s+/g, ' ') || 'Sin Marca';
  
        const brandDisplayMap = new Map<string, string>();
        masterClone
          .querySelectorAll('[data-pdf-layer="object"][data-obj-type="proyector_led"]')
          .forEach((el) => {
            const display = normalizeBrand(el);
            const key = display.toLowerCase();
            if (!brandDisplayMap.has(key)) {
              brandDisplayMap.set(key, display);
            }
          });
  
        const sortedBrands = Array.from(brandDisplayMap.entries()).sort((a, b) => {
          if (a[0] === 'sin marca') return 1;
          if (b[0] === 'sin marca') return -1;
          return a[1].localeCompare(b[1]);
        });
  
        sortedBrands.forEach(([brandKey, brandDisplay], bIdx) => {
          const layerId = `obj_proyector_led_brand_${bIdx}`;
          const layerDisplayName = `${labelName} - ${brandDisplay}`;
  
          const symClone = masterClone.cloneNode(true) as SVGSVGElement;
          const viewport = symClone.querySelector('#plan-viewport');
          if (viewport) {
            Array.from(viewport.children).forEach((child) => {
              const layerAttr = child.getAttribute('data-pdf-layer');
              const typeAttr = child.getAttribute('data-obj-type');
              if (
                layerAttr !== 'object' ||
                typeAttr !== 'proyector_led' ||
                normalizeBrand(child).toLowerCase() !== brandKey
              ) {
                child.remove();
              }
            });
          }
          symClone.querySelectorAll('[data-pdf-label="true"]').forEach((lbl) => lbl.remove());
  
          layerTasks.push({
            id: layerId,
            name: layerDisplayName,
            group: 'equipment',
            subGroup: 'proyector_led',
            svgNode: symClone,
          });
  
          const hasLabelsForBrand = Array.from(
            masterClone.querySelectorAll(
              '[data-pdf-layer="object"][data-obj-type="proyector_led"]'
            )
          ).some(
            (el) =>
              normalizeBrand(el).toLowerCase() === brandKey &&
              el.querySelectorAll('[data-pdf-label="true"]').length > 0
          );
  
          if (hasLabelsForBrand) {
            hasAnyLabels = true;
            const lblClone = masterClone.cloneNode(true) as SVGSVGElement;
            const lblViewport = lblClone.querySelector('#plan-viewport');
            if (lblViewport) {
              Array.from(lblViewport.children).forEach((child) => {
                const layerAttr = child.getAttribute('data-pdf-layer');
                const typeAttr = child.getAttribute('data-obj-type');
                if (
                  layerAttr !== 'object' ||
                  typeAttr !== 'proyector_led' ||
                  normalizeBrand(child).toLowerCase() !== brandKey
                ) {
                  child.remove();
                } else {
                  child.setAttribute('visibility', 'hidden');
                  child.querySelectorAll('[data-pdf-label="true"]').forEach((lbl) => {
                    lbl.setAttribute('visibility', 'visible');
                  });
                }
              });
            }
            layerTasks.push({
              id: `${layerId}_labels`,
              name: layerDisplayName,
              group: 'equipment',
              subGroup: 'proyector_led',
              parentId: layerId,
              requiresLabelLayer: true,
              svgNode: lblClone,
            });
          }
        });
        return;
      }
  
      const layerId = `obj_${objType}`;
  
      // Símbolos sin etiquetas
      const symClone = masterClone.cloneNode(true) as SVGSVGElement;
      const viewport = symClone.querySelector('#plan-viewport');
      if (viewport) {
        Array.from(viewport.children).forEach((child) => {
          const layerAttr = child.getAttribute('data-pdf-layer');
          const typeAttr = child.getAttribute('data-obj-type');
          if (layerAttr !== 'object' || typeAttr !== objType) {
            child.remove();
          }
        });
      }
      symClone.querySelectorAll('[data-pdf-label="true"]').forEach((lbl) => lbl.remove());
  
      layerTasks.push({
        id: layerId,
        name: labelName,
        group: 'equipment',
        svgNode: symClone,
      });
  
      // Etiquetas de este tipo de equipo (anidadas bajo el tipo y bajo "Etiquetas en Plano")
      const hasLabelsForType =
        masterClone.querySelectorAll(
          `[data-pdf-layer="object"][data-obj-type="${objType}"] [data-pdf-label="true"]`
        ).length > 0;
      if (hasLabelsForType) {
        hasAnyLabels = true;
        const lblClone = masterClone.cloneNode(true) as SVGSVGElement;
        const lblViewport = lblClone.querySelector('#plan-viewport');
        if (lblViewport) {
          Array.from(lblViewport.children).forEach((child) => {
            const layerAttr = child.getAttribute('data-pdf-layer');
            const typeAttr = child.getAttribute('data-obj-type');
            if (layerAttr !== 'object' || typeAttr !== objType) {
              child.remove();
            } else {
              child.setAttribute('visibility', 'hidden');
              child.querySelectorAll('[data-pdf-label="true"]').forEach((lbl) => {
                lbl.setAttribute('visibility', 'visible');
              });
            }
          });
        }
        layerTasks.push({
          id: `${layerId}_labels`,
          name: labelName,
          group: 'equipment',
          parentId: layerId,
          requiresLabelLayer: true,
          svgNode: lblClone,
        });
      }
    });
  
    // Capas de Cableados / Canalizaciones por fase presente en el plano
    const presentPhases = Object.keys(conduitPhaseConfig).filter((pKey) => {
      const conduitsInClone = Array.from(masterClone.querySelectorAll('[data-pdf-layer="conduit"]'));
      return conduitsInClone.some((el) => {
        const raw = el.getAttribute('data-conduit-phase') || 'fase_r';
        const normalized = conduitPhaseConfig[raw] ? raw : 'fase_r';
        return normalized === pKey;
      });
    });
  
    presentPhases.forEach((pKey) => {
      const pLabel = conduitPhaseConfig[pKey]?.label || pKey;
      const layerId = `conduit_${pKey}`;
  
      const condClone = masterClone.cloneNode(true) as SVGSVGElement;
      const condViewport = condClone.querySelector('#plan-viewport');
      if (condViewport) {
        Array.from(condViewport.children).forEach((child) => {
          const layerAttr = child.getAttribute('data-pdf-layer');
          const raw = child.getAttribute('data-conduit-phase') || 'fase_r';
          const normalized = conduitPhaseConfig[raw] ? raw : 'fase_r';
          if (layerAttr !== 'conduit' || normalized !== pKey) {
            child.remove();
          }
        });
      }
      condClone.querySelectorAll('[data-pdf-label="true"]').forEach((lbl) => lbl.remove());
  
      layerTasks.push({
        id: layerId,
        name: pLabel,
        group: 'conduits',
        svgNode: condClone,
      });
  
      const hasConduitLabels = Array.from(
        masterClone.querySelectorAll('[data-pdf-layer="conduit"]')
      ).some((el) => {
        const raw = el.getAttribute('data-conduit-phase') || 'fase_r';
        const normalized = conduitPhaseConfig[raw] ? raw : 'fase_r';
        return normalized === pKey && el.querySelectorAll('[data-pdf-label="true"]').length > 0;
      });
  
      if (hasConduitLabels) {
        hasAnyLabels = true;
        const condLblClone = masterClone.cloneNode(true) as SVGSVGElement;
        const condLblViewport = condLblClone.querySelector('#plan-viewport');
        if (condLblViewport) {
          Array.from(condLblViewport.children).forEach((child) => {
            const layerAttr = child.getAttribute('data-pdf-layer');
            const raw = child.getAttribute('data-conduit-phase') || 'fase_r';
            const normalized = conduitPhaseConfig[raw] ? raw : 'fase_r';
            if (layerAttr !== 'conduit' || normalized !== pKey) {
              child.remove();
            } else {
              child.setAttribute('visibility', 'hidden');
              child.querySelectorAll('[data-pdf-label="true"]').forEach((lbl) => {
                lbl.setAttribute('visibility', 'visible');
              });
            }
          });
        }
        layerTasks.push({
          id: `${layerId}_labels`,
          name: pLabel,
          group: 'conduits',
          parentId: layerId,
          requiresLabelLayer: true,
          svgNode: condLblClone,
        });
      }
    });
  
    // Capa Troncal Submarina
    if (masterClone.querySelectorAll('[data-pdf-layer="trunk"]').length > 0) {
      const trunkClone = masterClone.cloneNode(true) as SVGSVGElement;
      const tv = trunkClone.querySelector('#plan-viewport');
      if (tv) {
        Array.from(tv.children).forEach((child) => {
          if (child.getAttribute('data-pdf-layer') !== 'trunk') child.remove();
        });
      }
      layerTasks.push({
        id: 'trunk',
        name: 'Troncal Submarina',
        group: 'extras',
        svgNode: trunkClone,
      });
    }
  
    // Capa Textos y Figuras
    if (masterClone.querySelectorAll('[data-pdf-layer="annotation"]').length > 0) {
      const annClone = masterClone.cloneNode(true) as SVGSVGElement;
      const av = annClone.querySelector('#plan-viewport');
      if (av) {
        Array.from(av.children).forEach((child) => {
          if (child.getAttribute('data-pdf-layer') !== 'annotation') child.remove();
        });
      }
      layerTasks.push({
        id: 'annotation',
        name: 'Textos y Figuras',
        group: 'extras',
        svgNode: annClone,
      });
    }
  
    // Rasterizar todas las capas en paralelo
    const layerPngResults = await Promise.all(
      layerTasks.map(async (task) => ({
        task,
        pngBytes: await svgElementToPngBytes(task.svgNode, renderCanvasW, renderCanvasH),
      }))
    );
  
    // 3. Crear documento PDF con pdf-lib y registrar OCGs (Capas PDF nativas)
    const pdfDoc = await PDFDocument.create();
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  
    // Registrar OCGs únicos (el plano base siempre va fijo fuera de las capas)
    const ocgMap = new Map<
      string,
      { ref: PDFRef; propName: string; name: string; group: string; subGroup?: string }
    >();
    let ocCounter = 0;
  
    const registerOcg = (id: string, name: string, group: string, subGroup?: string) => {
      if (ocgMap.has(id)) return ocgMap.get(id)!;
      const propName = `OC${ocCounter++}`;
      const dict = pdfDoc.context.obj({
        Type: 'OCG',
        Name: PDFString.of(toPdfText(name)),
      });
      const ref = pdfDoc.context.register(dict);
      const entry = { ref, propName, name, group, subGroup };
      ocgMap.set(id, entry);
      return entry;
    };
  
    layerTasks.forEach((task) => {
      if (task.group !== 'base' && !task.parentId) {
        registerOcg(task.id, task.name, task.group, task.subGroup);
      }
    });
  
    if (hasAnyLabels) {
      registerOcg('labels_master', 'Etiquetas en Plano', 'extras');
    }
  
    // Configurar OCProperties + PageMode UseOC para abrir panel de Capas al lado izquierdo en el lector PDF
    const allOcgRefs = Array.from(ocgMap.values()).map((o) => o.ref);
    if (allOcgRefs.length > 0) {
      const orderArray = PDFArray.withContext(pdfDoc.context);
  
      const equipmentOcgs = Array.from(ocgMap.values()).filter((o) => o.group === 'equipment');
      if (equipmentOcgs.length > 0) {
        const eqFolder = PDFArray.withContext(pdfDoc.context);
        eqFolder.push(PDFString.of('Equipos e Instalaciones'));
  
        const projectorOcgs = equipmentOcgs.filter((o) => o.subGroup === 'proyector_led');
        const otherEqOcgs = equipmentOcgs.filter((o) => o.subGroup !== 'proyector_led');
  
        if (projectorOcgs.length > 0) {
          const projFolder = PDFArray.withContext(pdfDoc.context);
          projFolder.push(PDFString.of(toPdfText(typeGenericLabels.proyector_led || 'Proyector LED')));
          projectorOcgs.forEach((o) => projFolder.push(o.ref));
          eqFolder.push(projFolder);
        }
  
        otherEqOcgs.forEach((o) => eqFolder.push(o.ref));
        orderArray.push(eqFolder);
      }
  
      const conduitOcgs = Array.from(ocgMap.values()).filter((o) => o.group === 'conduits');
      if (conduitOcgs.length > 0) {
        const condFolder = PDFArray.withContext(pdfDoc.context);
        condFolder.push(PDFString.of('Cableados / Canalizaciones'));
        conduitOcgs.forEach((o) => condFolder.push(o.ref));
        orderArray.push(condFolder);
      }
  
      const extraOcgs = Array.from(ocgMap.values()).filter((o) => o.group === 'extras');
      if (extraOcgs.length > 0) {
        const extraFolder = PDFArray.withContext(pdfDoc.context);
        extraFolder.push(PDFString.of('Capas Adicionales'));
        extraOcgs.forEach((o) => extraFolder.push(o.ref));
        orderArray.push(extraFolder);
      }
  
      const ocgsArray = PDFArray.withContext(pdfDoc.context);
      const onArray = PDFArray.withContext(pdfDoc.context);
      allOcgRefs.forEach((ref) => {
        ocgsArray.push(ref);
        onArray.push(ref);
      });
  
      const dConfig = pdfDoc.context.obj({
        BaseState: 'ON',
        ON: onArray,
        Order: orderArray,
        ListMode: 'AllPages',
      });
  
      const ocProperties = pdfDoc.context.obj({
        OCGs: ocgsArray,
        D: dConfig,
      });
  
      pdfDoc.catalog.set(PDFName.of('OCProperties'), ocProperties);
      pdfDoc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOC'));
    }
  
    // 4. Construir páginas A4 Horizontal (841.89 x 595.28 pt)
    const PAGE_W = 841.89;
    const PAGE_H = 595.28;
    const MARGIN_X = 22;
    const MARGIN_TOP = 20;
    const MARGIN_BOTTOM = 22;
    const CONTENT_W = PAGE_W - MARGIN_X * 2;
  
    let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    let cursorY = PAGE_H - MARGIN_TOP;
  
    // Asignar Properties dictionary de capas OCG a Page 1
    const page1PropsDict = pdfDoc.context.obj({});
    ocgMap.forEach((entry) => {
      page1PropsDict.set(PDFName.of(entry.propName), entry.ref);
    });
    let page1Resources = page.node.Resources();
    if (!page1Resources) {
      page1Resources = pdfDoc.context.obj({});
      page.node.set(PDFName.of('Resources'), page1Resources);
    }
    page1Resources.set(PDFName.of('Properties'), page1PropsDict);
  
    // Logo superior (si existe)
    if (companyInfo.logoDataUrl) {
      const logoBytes = await dataUrlToPngBytes(companyInfo.logoDataUrl);
      if (logoBytes) {
        try {
          const logoImg = await pdfDoc.embedPng(logoBytes);
          const maxLogoH = 26;
          const maxLogoW = 120;
          const scale = Math.min(maxLogoW / logoImg.width, maxLogoH / logoImg.height, 1);
          const lw = logoImg.width * scale;
          const lh = logoImg.height * scale;
          page.drawImage(logoImg, {
            x: MARGIN_X,
            y: cursorY - lh,
            width: lw,
            height: lh,
          });
          cursorY -= lh + 6;
        } catch {
          // Ignore invalid logo image silently
        }
      }
    }
  
    // Caja del Plano con todas las capas OCG apiladas exactamente en el mismo rectángulo
    const maxPlanH = 218;
    const planPad = 4;
    const aspect = exportHeight / exportWidth;
    let planImgW = CONTENT_W - planPad * 2;
    let planImgH = planImgW * aspect;
    if (planImgH > maxPlanH) {
      planImgH = maxPlanH;
      planImgW = planImgH / aspect;
    }
    const planBoxH = planImgH + planPad * 2;
    const planBoxY = cursorY - planBoxH;
  
    page.drawRectangle({
      x: MARGIN_X,
      y: planBoxY,
      width: CONTENT_W,
      height: planBoxH,
      color: darkMode ? hexToRgbColor('#020617') : hexToRgbColor('#f8fafc'),
      borderColor: hexToRgbColor('#94a3b8'),
      borderWidth: 1,
    });
  
    const planImgX = MARGIN_X + (CONTENT_W - planImgW) / 2;
    const planImgY = planBoxY + planPad;
  
    const embeddedLayerImgs = await Promise.all(
      layerPngResults.map(async (item) => ({
        task: item.task,
        image: await pdfDoc.embedPng(item.pngBytes),
      }))
    );
  
    for (const { task, image } of embeddedLayerImgs) {
      // Plano base siempre visible, fuera de capas opcionales
      if (task.group === 'base') {
        page.drawImage(image, {
          x: planImgX,
          y: planImgY,
          width: planImgW,
          height: planImgH,
        });
        continue;
      }
  
      if (task.parentId && task.requiresLabelLayer) {
        const parentOcg = ocgMap.get(task.parentId);
        const labelsOcg = ocgMap.get('labels_master');
        if (parentOcg && labelsOcg) {
          page.pushOperators(
            PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [
              PDFName.of('OC'),
              PDFName.of(parentOcg.propName),
            ]),
            PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [
              PDFName.of('OC'),
              PDFName.of(labelsOcg.propName),
            ])
          );
          page.drawImage(image, {
            x: planImgX,
            y: planImgY,
            width: planImgW,
            height: planImgH,
          });
          page.pushOperators(
            PDFOperator.of(PDFOperatorNames.EndMarkedContent),
            PDFOperator.of(PDFOperatorNames.EndMarkedContent)
          );
          continue;
        }
      }
  
      const ocgEntry = ocgMap.get(task.id);
      if (ocgEntry) {
        page.pushOperators(
          PDFOperator.of(PDFOperatorNames.BeginMarkedContentSequence, [
            PDFName.of('OC'),
            PDFName.of(ocgEntry.propName),
          ])
        );
        page.drawImage(image, {
          x: planImgX,
          y: planImgY,
          width: planImgW,
          height: planImgH,
        });
        page.pushOperators(PDFOperator.of(PDFOperatorNames.EndMarkedContent));
      }
    }
  
    cursorY = planBoxY - 8;
  
    // =========================================================================
    // BLOQUE DE TÍTULO Y KPIs (SIEMPRE COMPLETOS Y SIN CAMBIOS)
    // =========================================================================
    const tbRow1H = 26;
    const tbRow2H = 26;
    const tbCol1W = CONTENT_W * 0.36;
    const tbCol2W = CONTENT_W * 0.32;
    const tbCol3W = CONTENT_W * 0.32;
    const borderDark = hexToRgbColor('#0f172a');
    const textDark = hexToRgbColor('#0f172a');
    const textMuted = hexToRgbColor('#475569');
  
    const drawLabeledBox = (
      x: number,
      topY: number,
      w: number,
      h: number,
      label: string,
      value: string,
      isLink = false
    ) => {
      page.drawRectangle({
        x,
        y: topY - h,
        width: w,
        height: h,
        borderColor: borderDark,
        borderWidth: 0.9,
        color: rgb(1, 1, 1),
      });
      page.drawText(toPdfText(label).toUpperCase(), {
        x: x + 5,
        y: topY - 9,
        size: 6.2,
        font: fontBold,
        color: textMuted,
      });
      const valText = wrapPdfText(value || '-', fontBold, 8.2, w - 10)[0];
      page.drawText(valText, {
        x: x + 5,
        y: topY - 20,
        size: 8.2,
        font: isLink ? fontBold : fontBold,
        color: isLink ? hexToRgbColor('#0284c7') : textDark,
      });
    };
  
    drawLabeledBox(MARGIN_X, cursorY, tbCol1W, tbRow1H, 'Proyecto', companyInfo.projectName || '-');
    drawLabeledBox(
      MARGIN_X + tbCol1W,
      cursorY,
      tbCol2W,
      tbRow1H,
      'Cliente / Mandante',
      companyInfo.clientName || '-'
    );
    drawLabeledBox(
      MARGIN_X + tbCol1W + tbCol2W,
      cursorY,
      tbCol3W,
      tbRow1H,
      'Centro / Pontón',
      companyInfo.centerName || '-'
    );
    cursorY -= tbRow1H;
  
    drawLabeledBox(
      MARGIN_X,
      cursorY,
      tbCol1W + tbCol2W,
      tbRow2H,
      'Descripción del Alcance',
      companyInfo.projectDescription || '-'
    );
    drawLabeledBox(
      MARGIN_X + tbCol1W + tbCol2W,
      cursorY,
      tbCol3W,
      tbRow2H,
      'Coordenadas Geográficas',
      companyInfo.coordinates || 'Sin coordenadas',
      Boolean(mapsLink)
    );
  
    // Link clickable de Google Maps en Coordenadas
    if (mapsLink && /^https?:\/\//i.test(mapsLink)) {
      const coordX = MARGIN_X + tbCol1W + tbCol2W;
      const linkAnnot = pdfDoc.context.obj({
        Type: 'Annot',
        Subtype: 'Link',
        Rect: [coordX, cursorY - tbRow2H, coordX + tbCol3W, cursorY],
        Border: [0, 0, 0],
        A: {
          Type: 'Action',
          S: 'URI',
          URI: PDFString.of(mapsLink),
        },
      });
      const linkRef = pdfDoc.context.register(linkAnnot);
      const existingAnnots = page.node.get(PDFName.of('Annots'));
      if (existingAnnots instanceof PDFArray) {
        existingAnnots.push(linkRef);
      } else {
        page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([linkRef]));
      }
    }
  
    cursorY -= tbRow2H + 7;
  
    // KPIs Row
    const safeObjects = Array.isArray(objects) ? objects : [];
    const safeConduits = Array.isArray(conduits) ? conduits : [];
    const safeCages = Array.isArray(cages) ? cages : [];
  
    const computedTotalWatts = safeObjects.reduce(
      (acc, o) => acc + (Number(o.power) || Number(o.watts) || 0),
      0
    );
    const computedGrandTotalMeters = Number(
      safeConduits
        .reduce((acc, c) => acc + (Number(calculateConduitMetrics(c)?.totalMeters) || 0), 0)
        .toFixed(1)
    );
  
    const installedSystemsSet = new Set<string>();
    safeObjects.forEach((o) => {
      const rawPhase = String(o.phase || '').trim();
      if (!rawPhase) return;
      if (rawPhase === 'luces_perimetrales') installedSystemsSet.add('Luces Perimetrales');
      else if (rawPhase === 'fotoperiodo') installedSystemsSet.add('Fotoperiodo LED');
      else if (rawPhase === 'fuerza_aux') installedSystemsSet.add('Fuerza 220V Auxiliar');
      else if (rawPhase === 'control') installedSystemsSet.add('Control / Tableros');
      else if (rawPhase === 'monitoreo') installedSystemsSet.add('Monitoreo / Cámaras');
      else if (rawPhase === 'alimentacion') installedSystemsSet.add('Alimentación');
      else {
        installedSystemsSet.add(
          rawPhase.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        );
      }
    });
    const installedSystems = Array.from(installedSystemsSet);
  
    const kpiGap = 6;
    const kpiUnitW = (CONTENT_W - kpiGap * 3) / 5;
    const kpiW1 = kpiUnitW;
    const kpiW2 = kpiUnitW * 2;
    const kpiW3 = kpiUnitW;
    const kpiW4 = kpiUnitW;
    const kpiH = 30;
    const kpiBg = hexToRgbColor('#f1f5f9');
    const kpiBorder = hexToRgbColor('#cbd5e1');
  
    const drawKpiBox = (x: number, w: number, label: string, val?: string) => {
      page.drawRectangle({
        x,
        y: cursorY - kpiH,
        width: w,
        height: kpiH,
        color: kpiBg,
        borderColor: kpiBorder,
        borderWidth: 0.7,
      });
      page.drawText(toPdfText(label).toUpperCase(), {
        x: x + 6,
        y: cursorY - 10,
        size: 6.2,
        font: fontBold,
        color: hexToRgbColor('#64748b'),
      });
      if (val !== undefined) {
        page.drawText(toPdfText(val), {
          x: x + 6,
          y: cursorY - 22,
          size: 9.2,
          font: fontBold,
          color: textDark,
        });
      }
    };
  
    drawKpiBox(
      MARGIN_X,
      kpiW1,
      'Jaulas Totales',
      `${safeCages.length} (${safeCages[0]?.dimensions || '30m x 30m'})`
    );
    drawKpiBox(MARGIN_X + kpiW1 + kpiGap, kpiW2, 'Checklist Sistemas Instalados');
  
    // Badges dentro de Checklist Sistemas Instalados
    const badgeStartX = MARGIN_X + kpiW1 + kpiGap + 6;
    let badgeX = badgeStartX;
    let badgeY = cursorY - 23;
    if (installedSystems.length === 0) {
      page.drawText('Sin sistemas registrados', {
        x: badgeX,
        y: badgeY + 2,
        size: 7.5,
        font: fontBold,
        color: hexToRgbColor('#64748b'),
      });
    } else {
      for (const sys of installedSystems) {
        const labelTxt = toPdfText(sys);
        const txtW = fontBold.widthOfTextAtSize(labelTxt, 6.8);
        const pillW = txtW + 16;
        if (badgeX + pillW > MARGIN_X + kpiW1 + kpiGap + kpiW2 - 6) {
          break;
        }
        page.drawRectangle({
          x: badgeX,
          y: badgeY - 1,
          width: pillW,
          height: 11.5,
          color: hexToRgbColor('#ecfdf5'),
          borderColor: hexToRgbColor('#10b981'),
          borderWidth: 0.7,
        });
        // Vector check mark
        page.drawLine({
          start: { x: badgeX + 3.5, y: badgeY + 4.2 },
          end: { x: badgeX + 5.2, y: badgeY + 2.4 },
          thickness: 1.1,
          color: hexToRgbColor('#059669'),
        });
        page.drawLine({
          start: { x: badgeX + 5.2, y: badgeY + 2.4 },
          end: { x: badgeX + 8.5, y: badgeY + 6.8 },
          thickness: 1.1,
          color: hexToRgbColor('#059669'),
        });
        page.drawText(labelTxt, {
          x: badgeX + 11.5,
          y: badgeY + 2.2,
          size: 6.8,
          font: fontBold,
          color: hexToRgbColor('#065f46'),
        });
        badgeX += pillW + 4;
      }
    }
  
    drawKpiBox(
      MARGIN_X + kpiW1 + kpiW2 + kpiGap * 2,
      kpiW3,
      'Potencia Total',
      `${(computedTotalWatts / 1000).toFixed(2)} kW`
    );
    drawKpiBox(
      MARGIN_X + kpiW1 + kpiW2 + kpiW3 + kpiGap * 3,
      kpiW4,
      'Cable Canalizado',
      `${computedGrandTotalMeters} m`
    );
  
    cursorY -= kpiH + 9;
  
    // =========================================================================
    // HELPERS DE PAGINACIÓN Y TABLAS VECTORIALES
    // =========================================================================
    const ensureSpace = (neededHeight: number) => {
      if (cursorY - neededHeight < MARGIN_BOTTOM) {
        page = pdfDoc.addPage([PAGE_W, PAGE_H]);
        cursorY = PAGE_H - MARGIN_TOP;
        return true;
      }
      return false;
    };
  
    interface TableCol {
      header: string;
      width: number;
      align?: 'left' | 'center' | 'right';
    }
  
    const drawTableHeader = (cols: TableCol[], headerH = 18) => {
      let x = MARGIN_X;
      for (const col of cols) {
        page.drawRectangle({
          x,
          y: cursorY - headerH,
          width: col.width,
          height: headerH,
          color: hexToRgbColor('#0f172a'),
          borderColor: hexToRgbColor('#334155'),
          borderWidth: 0.5,
        });
        const txt = toPdfText(col.header);
        const txtW = fontBold.widthOfTextAtSize(txt, 7.2);
        let tx = x + 4;
        if (col.align === 'center') tx = x + (col.width - txtW) / 2;
        else if (col.align === 'right') tx = x + col.width - txtW - 4;
        page.drawText(txt, {
          x: tx,
          y: cursorY - 11.5,
          size: 7.2,
          font: fontBold,
          color: rgb(1, 1, 1),
        });
        x += col.width;
      }
      cursorY -= headerH;
    };
  
    // =========================================================================
    // TABLA 1: EQUIPOS INSTALADOS (DATOS COMPLETOS)
    // =========================================================================
    const eqCols: TableCol[] = [
      { header: 'Cant.', width: 32, align: 'center' },
      { header: 'Marca', width: 64, align: 'left' },
      { header: 'TAGs Agrupados', width: 98, align: 'left' },
      { header: 'Módulo', width: 66, align: 'left' },
      { header: 'Ubicación', width: 78, align: 'left' },
      { header: 'Especificación Técnica', width: 178, align: 'left' },
      { header: 'Sistema', width: 88, align: 'left' },
      { header: 'Pot. Unit.', width: 48, align: 'right' },
      { header: 'Pot. Total', width: 52, align: 'right' },
      { header: 'Estado', width: CONTENT_W - (32 + 64 + 98 + 66 + 78 + 178 + 88 + 48 + 52), align: 'left' },
    ];
  
    if (summarizedEquipment.length > 0) {
      ensureSpace(36);
      drawTableHeader(eqCols);
  
      for (const g of summarizedEquipment) {
        const rawTags = Array.isArray(g.tags)
          ? g.tags.filter((t: any) => t && String(t).trim() !== '' && String(t).trim() !== '-').join(', ')
          : String(g.tagsLabel || '').trim();
        const hasValidTags = rawTags !== '' && rawTags !== '-' && rawTags.toLowerCase() !== 'sin tag';
        const displayTags = hasValidTags ? rawTags : 'SIN INFORMACION';
        const brandLabel = String(g.brand || '').trim() || 'Sin Marca';
        const specText = String(g.spec || '').trim() || '-';
        const notesText = String(g.notesLabel || '').trim();
  
        const rawSystem = String(g.phase || '').trim();
        const systemLabel = String(
          g.systemLabel ||
            phaseConfigs?.[rawSystem]?.label ||
            (rawSystem ? rawSystem.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()) : '')
        ).trim();
        const hasValidSystem = systemLabel !== '' && systemLabel !== '-';
        const systemDisplay = hasValidSystem ? systemLabel : 'SIN INFORMACION';
  
        const locationText = String(g.locationsLabel || '').trim();
        const hasValidLocation = locationText !== '' && locationText !== '-';
        const displayLocation = hasValidLocation ? locationText : 'SIN INFORMACION';
        const tableroItems = Array.isArray(g.tableroItems) ? g.tableroItems : [];
  
        const brandLines = wrapPdfText(brandLabel, fontBold, 7.2, eqCols[1].width - 8);
        const tagLines =
          tableroItems.length > 0
            ? tableroItems.map((tb: any) =>
                tb.tag && tb.tag !== '-' && tb.tag.toLowerCase() !== 'sin tag'
                  ? tb.tag
                  : 'SIN INFORMACION'
              )
            : wrapPdfText(displayTags, fontBold, 7.2, eqCols[2].width - 8);
        const modLines = wrapPdfText(g.modulesLabel || '-', fontRegular, 7.2, eqCols[3].width - 8);
        const locLines = wrapPdfText(displayLocation, fontRegular, 7.2, eqCols[4].width - 8);
        const specLines = wrapPdfText(specText, fontRegular, 7.2, eqCols[5].width - 8);
        const notesLines = notesText
          ? wrapPdfText(`Notas de mantención: ${notesText}`, fontRegular, 6.4, eqCols[5].width - 8)
          : [];
        const systemLines = wrapPdfText(systemDisplay, fontRegular, 7.2, eqCols[6].width - 8);
        const statusLines = wrapPdfText(g.summaryStatus || '-', fontRegular, 7.2, eqCols[9].width - 8);
  
        const maxLineCount = Math.max(
          1,
          brandLines.length,
          tableroItems.length > 0 ? tableroItems.length * 1.45 : tagLines.length,
          modLines.length,
          locLines.length,
          specLines.length + notesLines.length,
          systemLines.length,
          statusLines.length
        );
        const rowH = Math.max(17, Math.ceil(maxLineCount * 9.5) + 7);
  
        if (ensureSpace(rowH)) {
          drawTableHeader(eqCols);
        }
  
        let x = MARGIN_X;
        for (let ci = 0; ci < eqCols.length; ci++) {
          page.drawRectangle({
            x,
            y: cursorY - rowH,
            width: eqCols[ci].width,
            height: rowH,
            color: rgb(1, 1, 1),
            borderColor: kpiBorder,
            borderWidth: 0.5,
          });
          x += eqCols[ci].width;
        }
  
        const drawCellLines = (
          colIdx: number,
          lines: string[],
          font: any,
          size: number,
          color: any,
          align: 'left' | 'center' | 'right' = 'left'
        ) => {
          let cellX = MARGIN_X;
          for (let i = 0; i < colIdx; i++) cellX += eqCols[i].width;
          const colW = eqCols[colIdx].width;
          lines.forEach((ln, idx) => {
            const safeLn = toPdfText(ln);
            const tw = font.widthOfTextAtSize(safeLn, size);
            let tx = cellX + 4;
            if (align === 'center') tx = cellX + (colW - tw) / 2;
            else if (align === 'right') tx = cellX + colW - tw - 4;
            page.drawText(safeLn, {
              x: tx,
              y: cursorY - 10.5 - idx * 9.2,
              size,
              font,
              color,
            });
          });
        };
  
        drawCellLines(0, [String(g.count)], fontBold, 7.6, textDark, 'center');
        drawCellLines(1, brandLines, fontBold, 7.2, hexToRgbColor('#3730a3'));
  
        if (tableroItems.length > 0) {
          const tagCellX = MARGIN_X + eqCols[0].width + eqCols[1].width;
          tableroItems.forEach((tb: any, idx: number) => {
            const tbTag =
              tb.tag && tb.tag !== '-' && tb.tag.toLowerCase() !== 'sin tag'
                ? tb.tag
                : 'SIN INFORMACION';
            const isMuted = tbTag === 'SIN INFORMACION';
            const itemY = cursorY - 10 - idx * 14;
            drawTableroVectorIcon(page, tagCellX + 10, itemY + 2, tb);
            const wrappedTag = wrapPdfText(tbTag, fontBold, 7.1, eqCols[2].width - 24)[0];
            page.drawText(wrappedTag, {
              x: tagCellX + 20,
              y: itemY - 0.5,
              size: 7.1,
              font: isMuted ? fontItalic : fontBold,
              color: isMuted ? hexToRgbColor('#64748b') : textDark,
            });
          });
        } else {
          drawCellLines(
            2,
            tagLines,
            hasValidTags ? fontBold : fontItalic,
            7.2,
            hasValidTags ? textDark : hexToRgbColor('#64748b')
          );
        }
  
        drawCellLines(3, modLines, fontRegular, 7.2, textDark);
        drawCellLines(
          4,
          locLines,
          hasValidLocation ? fontRegular : fontItalic,
          7.2,
          hasValidLocation ? textDark : hexToRgbColor('#64748b')
        );
  
        // Spec + Notes
        let specCellX = MARGIN_X;
        for (let i = 0; i < 5; i++) specCellX += eqCols[i].width;
        specLines.forEach((ln, idx) => {
          page.drawText(toPdfText(ln), {
            x: specCellX + 4,
            y: cursorY - 10.5 - idx * 9.2,
            size: 7.2,
            font: fontRegular,
            color: textDark,
          });
        });
        notesLines.forEach((ln, idx) => {
          page.drawText(toPdfText(ln), {
            x: specCellX + 4,
            y: cursorY - 10.5 - (specLines.length + idx) * 8.6,
            size: 6.4,
            font: fontRegular,
            color: textMuted,
          });
        });
  
        drawCellLines(
          6,
          systemLines,
          hasValidSystem ? fontBold : fontItalic,
          7.2,
          hasValidSystem ? textDark : hexToRgbColor('#64748b')
        );
        drawCellLines(7, [`${g.unitPower || 0} W`], fontRegular, 7.2, textDark, 'right');
        drawCellLines(8, [`${g.totalPower || 0} W`], fontBold, 7.2, textDark, 'right');
        drawCellLines(9, statusLines, fontRegular, 7.2, textDark);
  
        cursorY -= rowH;
      }
  
      cursorY -= 8;
    }
  
    // =========================================================================
    // TABLAS DE CANALIZACIÓN Y TOTAL DE CABLE ELÉCTRICO (DATOS COMPLETOS)
    // =========================================================================
    if (safeConduits.length > 0) {
      const conduitPhaseGroupsMap = new Map<string, any>();
      const moduleOrderMap = new Map(modules.map((m, idx) => [m.id, idx]));
      const phaseOrderMap = new Map(
        Object.keys(conduitPhaseConfig).map((k, idx) => [k, idx])
      );
  
      safeConduits.forEach((c) => {
        const conduitModId = resolveConduitModuleId(c, safeCages, modules);
        const phaseKey = conduitPhaseConfig[c.phase] ? c.phase : 'fase_r';
        const phaseInfo = conduitPhaseConfig[phaseKey] || { label: c.phase || phaseKey };
        const conduitTypeLabel =
          String(c.conduitType || c.conduitSpec || '').trim() || 'Ducto HDPE 32mm PN10';
        const cableSpecLabel = String(c.cableSpec || '').trim() || '-';
        const groupKey = `${conduitModId}__${phaseKey}__${conduitTypeLabel.toLowerCase()}__${cableSpecLabel.toLowerCase()}`;
        const metrics = calculateConduitMetrics(c);
  
        if (!conduitPhaseGroupsMap.has(groupKey)) {
          conduitPhaseGroupsMap.set(groupKey, {
            moduleId: conduitModId,
            phaseKey,
            phaseLabel: phaseInfo.label,
            conduitTypeLabel,
            cableSpecLabel,
            horizontalMeters: 0,
            dropMeters: 0,
            totalMeters: 0,
          });
        }
        const grp = conduitPhaseGroupsMap.get(groupKey);
        grp.horizontalMeters = Number(
          (grp.horizontalMeters + (Number(metrics?.horizontalMeters) || 0)).toFixed(1)
        );
        grp.dropMeters = Number((grp.dropMeters + (Number(metrics?.dropMeters) || 0)).toFixed(1));
        grp.totalMeters = Number((grp.totalMeters + (Number(metrics?.totalMeters) || 0)).toFixed(1));
      });
  
      const sortedConduitGroups = Array.from(conduitPhaseGroupsMap.values()).sort((a, b) => {
        const modOrderA = moduleOrderMap.has(a.moduleId) ? moduleOrderMap.get(a.moduleId)! : 999;
        const modOrderB = moduleOrderMap.has(b.moduleId) ? moduleOrderMap.get(b.moduleId)! : 999;
        if (modOrderA !== modOrderB) return modOrderA - modOrderB;
        if (a.moduleId !== b.moduleId) return a.moduleId.localeCompare(b.moduleId);
        const pOrderA = phaseOrderMap.has(a.phaseKey) ? phaseOrderMap.get(a.phaseKey)! : 999;
        const pOrderB = phaseOrderMap.has(b.phaseKey) ? phaseOrderMap.get(b.phaseKey)! : 999;
        return pOrderA - pOrderB;
      });
  
      const condCols: TableCol[] = [
        { header: 'Módulo', width: 90, align: 'left' },
        { header: 'Tipo de Canalización', width: 170, align: 'left' },
        { header: 'Fase / Circuito', width: 150, align: 'left' },
        { header: 'Conductor / Cable', width: 220, align: 'left' },
        { header: 'Holgura', width: 72, align: 'center' },
        {
          header: 'Longitud Calculada',
          width: CONTENT_W - (90 + 170 + 150 + 220 + 72),
          align: 'right',
        },
      ];
  
      ensureSpace(36);
      drawTableHeader(condCols);
  
      for (const grp of sortedConduitGroups) {
        const typeLines = wrapPdfText(grp.conduitTypeLabel, fontBold, 7.2, condCols[1].width - 8);
        const phaseLines = wrapPdfText(grp.phaseLabel, fontRegular, 7.2, condCols[2].width - 8);
        const cableLines = wrapPdfText(grp.cableSpecLabel, fontRegular, 7.2, condCols[3].width - 8);
        const maxLines = Math.max(1, typeLines.length, phaseLines.length, cableLines.length);
        const rowH = Math.max(16, Math.ceil(maxLines * 9.5) + 6);
  
        if (ensureSpace(rowH)) {
          drawTableHeader(condCols);
        }
  
        let x = MARGIN_X;
        for (const c of condCols) {
          page.drawRectangle({
            x,
            y: cursorY - rowH,
            width: c.width,
            height: rowH,
            color: rgb(1, 1, 1),
            borderColor: kpiBorder,
            borderWidth: 0.5,
          });
          x += c.width;
        }
  
        const drawCondCell = (
          colIdx: number,
          lines: string[],
          font: any,
          align: 'left' | 'center' | 'right' = 'left'
        ) => {
          let cellX = MARGIN_X;
          for (let i = 0; i < colIdx; i++) cellX += condCols[i].width;
          const colW = condCols[colIdx].width;
          lines.forEach((ln, idx) => {
            const safeLn = toPdfText(ln);
            const tw = font.widthOfTextAtSize(safeLn, 7.2);
            let tx = cellX + 4;
            if (align === 'center') tx = cellX + (colW - tw) / 2;
            else if (align === 'right') tx = cellX + colW - tw - 4;
            page.drawText(safeLn, {
              x: tx,
              y: cursorY - 10.5 - idx * 9.2,
              size: 7.2,
              font,
              color: textDark,
            });
          });
        };
  
        drawCondCell(0, [grp.moduleId], fontBold);
        drawCondCell(1, typeLines, fontBold);
        drawCondCell(2, phaseLines, fontRegular);
        drawCondCell(3, cableLines, fontRegular);
        drawCondCell(4, [`${grp.dropMeters} m`], fontRegular, 'center');
        drawCondCell(5, [`${grp.totalMeters} m`], fontBold, 'right');
  
        cursorY -= rowH;
      }
  
      cursorY -= 9;
  
      // Tabla 3: Total de Cable Eléctrico Utilizado en el Proyecto (Todos los Módulos)
      const conductorTotalsMap = new Map<string, any>();
      safeConduits.forEach((c) => {
        const conduitModId = resolveConduitModuleId(c, safeCages, modules);
        const cableName = String(c.cableSpec || '').trim().replace(/\s+/g, ' ') || 'Sin Especificar';
        const cableKey = cableName.toLowerCase();
        const metrics = calculateConduitMetrics(c);
  
        if (!conductorTotalsMap.has(cableKey)) {
          conductorTotalsMap.set(cableKey, {
            cableName,
            modules: new Set<string>(),
            horizontalMeters: 0,
            dropMeters: 0,
            totalMeters: 0,
          });
        }
        const entry = conductorTotalsMap.get(cableKey);
        if (conduitModId) entry.modules.add(conduitModId);
        entry.horizontalMeters = Number(
          (entry.horizontalMeters + (Number(metrics?.horizontalMeters) || 0)).toFixed(1)
        );
        entry.dropMeters = Number(
          (entry.dropMeters + (Number(metrics?.dropMeters) || 0)).toFixed(1)
        );
        entry.totalMeters = Number(
          (entry.totalMeters + (Number(metrics?.totalMeters) || 0)).toFixed(1)
        );
      });
  
      const conductorTotalsList = Array.from(conductorTotalsMap.values());
      const projectCableHorizontalTotal = Number(
        conductorTotalsList.reduce((acc, item) => acc + item.horizontalMeters, 0).toFixed(1)
      );
      const projectCableDropTotal = Number(
        conductorTotalsList.reduce((acc, item) => acc + item.dropMeters, 0).toFixed(1)
      );
      const projectCableGrandTotal = Number(
        conductorTotalsList.reduce((acc, item) => acc + item.totalMeters, 0).toFixed(1)
      );
  
      const totalCols: TableCol[] = [
        { header: 'Conductor / Cable', width: 290, align: 'left' },
        { header: 'Módulos', width: 170, align: 'left' },
        { header: 'Tramo Pasillo', width: 110, align: 'right' },
        { header: 'Holgura', width: 100, align: 'right' },
        {
          header: 'Total Cable Utilizado',
          width: CONTENT_W - (290 + 170 + 110 + 100),
          align: 'right',
        },
      ];
  
      ensureSpace(50);
      page.drawText('TOTAL DE CABLE ELÉCTRICO UTILIZADO EN EL PROYECTO (TODOS LOS MÓDULOS)', {
        x: MARGIN_X,
        y: cursorY - 8,
        size: 7.5,
        font: fontBold,
        color: textDark,
      });
      cursorY -= 12;
      drawTableHeader(totalCols);
  
      for (const item of conductorTotalsList) {
        const modsLabel = Array.from<string>(item.modules)
          .sort((a, b) => {
            const orderA = moduleOrderMap.has(a) ? moduleOrderMap.get(a)! : 999;
            const orderB = moduleOrderMap.has(b) ? moduleOrderMap.get(b)! : 999;
            if (orderA !== orderB) return orderA - orderB;
            return String(a).localeCompare(String(b));
          })
          .join(', ');
  
        const cableLines = wrapPdfText(item.cableName, fontBold, 7.2, totalCols[0].width - 8);
        const modLines = wrapPdfText(modsLabel || '-', fontRegular, 7.2, totalCols[1].width - 8);
        const rowH = Math.max(16, Math.ceil(Math.max(cableLines.length, modLines.length) * 9.5) + 6);
  
        if (ensureSpace(rowH)) {
          drawTableHeader(totalCols);
        }
  
        let x = MARGIN_X;
        for (const c of totalCols) {
          page.drawRectangle({
            x,
            y: cursorY - rowH,
            width: c.width,
            height: rowH,
            color: rgb(1, 1, 1),
            borderColor: kpiBorder,
            borderWidth: 0.5,
          });
          x += c.width;
        }
  
        const drawTotalCell = (
          colIdx: number,
          lines: string[],
          font: any,
          align: 'left' | 'right' = 'left'
        ) => {
          let cellX = MARGIN_X;
          for (let i = 0; i < colIdx; i++) cellX += totalCols[i].width;
          const colW = totalCols[colIdx].width;
          lines.forEach((ln, idx) => {
            const safeLn = toPdfText(ln);
            const tw = font.widthOfTextAtSize(safeLn, 7.2);
            const tx = align === 'right' ? cellX + colW - tw - 4 : cellX + 4;
            page.drawText(safeLn, {
              x: tx,
              y: cursorY - 10.5 - idx * 9.2,
              size: 7.2,
              font,
              color: textDark,
            });
          });
        };
  
        drawTotalCell(0, cableLines, fontBold);
        drawTotalCell(1, modLines, fontRegular);
        drawTotalCell(2, [`${item.horizontalMeters} m`], fontRegular, 'right');
        drawTotalCell(3, [`${item.dropMeters} m`], fontRegular, 'right');
        drawTotalCell(4, [`${item.totalMeters} m`], fontBold, 'right');
  
        cursorY -= rowH;
      }
  
      // Fila pie TOTAL CABLE ELÉCTRICO DEL PROYECTO
      const footH = 18;
      if (ensureSpace(footH)) {
        drawTableHeader(totalCols);
      }
      const labelSpanW = totalCols[0].width + totalCols[1].width;
      const footCells = [
        { width: labelSpanW, text: 'TOTAL CABLE ELÉCTRICO DEL PROYECTO', align: 'left' as const },
        { width: totalCols[2].width, text: `${projectCableHorizontalTotal} m`, align: 'right' as const },
        { width: totalCols[3].width, text: `${projectCableDropTotal} m`, align: 'right' as const },
        { width: totalCols[4].width, text: `${projectCableGrandTotal} m`, align: 'right' as const },
      ];
      let fx = MARGIN_X;
      for (const fc of footCells) {
        page.drawRectangle({
          x: fx,
          y: cursorY - footH,
          width: fc.width,
          height: footH,
          color: kpiBg,
          borderColor: borderDark,
          borderWidth: 0.7,
        });
        const safeTxt = toPdfText(fc.text);
        const tw = fontBold.widthOfTextAtSize(safeTxt, 7.4);
        const tx = fc.align === 'right' ? fx + fc.width - tw - 4 : fx + 4;
        page.drawText(safeTxt, {
          x: tx,
          y: cursorY - 11.5,
          size: 7.4,
          font: fontBold,
          color: textDark,
        });
        fx += fc.width;
      }
      cursorY -= footH + 10;
    }
  
    // =========================================================================
    // PIE DE PÁGINA Y FIRMA
    // =========================================================================
    const footerNeededH = companyInfo.signatureDataUrl ? 56 : 30;
    ensureSpace(footerNeededH);
  
    page.drawLine({
      start: { x: MARGIN_X, y: cursorY },
      end: { x: MARGIN_X + CONTENT_W, y: cursorY },
      thickness: 0.8,
      color: kpiBorder,
    });
  
    const footerBottomY = cursorY - 22;
    page.drawText(toPdfText(companyInfo.companyName || 'SERVICIOS BEQA SPA'), {
      x: MARGIN_X,
      y: footerBottomY,
      size: 9.5,
      font: fontBold,
      color: textDark,
    });
  
    const signW = 190;
    const signX = MARGIN_X + CONTENT_W - signW;
    let signLineY = cursorY - 16;
  
    if (companyInfo.signatureDataUrl) {
      const signBytes = await dataUrlToPngBytes(companyInfo.signatureDataUrl);
      if (signBytes) {
        try {
          const signImg = await pdfDoc.embedPng(signBytes);
          const maxSH = 28;
          const maxSW = 130;
          const scale = Math.min(maxSW / signImg.width, maxSH / signImg.height, 1);
          const sw = signImg.width * scale;
          const sh = signImg.height * scale;
          signLineY = cursorY - (sh + 6);
          page.drawImage(signImg, {
            x: signX + (signW - sw) / 2,
            y: signLineY + 3,
            width: sw,
            height: sh,
          });
        } catch {
          // Ignore invalid signature image
        }
      }
    }
  
    page.drawLine({
      start: { x: signX, y: signLineY },
      end: { x: signX + signW, y: signLineY },
      thickness: 0.7,
      color: hexToRgbColor('#334155'),
    });
  
    const respName = toPdfText(companyInfo.responsibleName || 'Responsable Técnico');
    const respW = fontBold.widthOfTextAtSize(respName, 8);
    page.drawText(respName, {
      x: signX + (signW - respW) / 2,
      y: signLineY - 10,
      size: 8,
      font: fontBold,
      color: textDark,
    });
  
    if (companyInfo.responsibleRole) {
      const roleTxt = toPdfText(companyInfo.responsibleRole);
      const roleW = fontRegular.widthOfTextAtSize(roleTxt, 7.2);
      page.drawText(roleTxt, {
        x: signX + (signW - roleW) / 2,
        y: signLineY - 19,
        size: 7.2,
        font: fontRegular,
        color: textMuted,
      });
    }
  
    return await pdfDoc.save();
  }
  
  export async function exportPdfWithLayers(params: ExportPdfWithLayersParams): Promise<void> {
    const pdfBytes = await buildPdfWithLayersBytes(params);
    const pdfBlob = new Blob([pdfBytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' });
    const blobUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = params.fileName.endsWith('.pdf') ? params.fileName : `${params.fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      try {
        document.body.removeChild(link);
      } catch {
        // ignore
      }
      URL.revokeObjectURL(blobUrl);
    }, 2500);
  }