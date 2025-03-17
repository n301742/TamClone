<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import PdfEmbed from 'vue-pdf-embed';

// Define the proper Source type for PdfEmbed
type PdfSource = string | URL | ArrayBuffer | Uint8Array;

// Props
interface Props {
  source: PdfSource; // PDF source using the correct type
  formType: 'formA' | 'formB' | 'din676' | 'custom'; // DIN standard form type
  allowReposition?: boolean; // Whether to allow repositioning the annotation
  width?: number; // Width of the PDF viewer
  height?: number; // Height of the PDF viewer
}

const props = withDefaults(defineProps<Props>(), {
  formType: 'formB',
  allowReposition: false,
  width: 595, // Default A4 width in points (PDF.js units)
  height: 842 // Default A4 height in points
});

// Emits
const emit = defineEmits<{
  (e: 'annotation-moved', coordinates: {
    left: number;
    top: number;
    width: number;
    height: number;
  }): void;
}>();

// PDF.js viewer reference
const pdfRef = ref<any>(null);
const containerRef = ref<HTMLElement | null>(null);
const pdfScale = ref(1);
const isDragging = ref(false);
const startDragPosition = ref({ x: 0, y: 0 });
const annotationPosition = ref({ left: 0, top: 0 });

// DIN standard dimensions in points (1mm = 2.83465pt)
const MM_TO_POINTS = 2.83465;

// Define the address window dimensions based on DIN standards
const addressWindow = computed(() => {
  // Base positions for the three supported forms
  switch (props.formType) {
    case 'formA':
      // DIN 5008 Form A (hochgestelltes Anschriftfeld)
      return {
        left: 20 * MM_TO_POINTS, // 20mm from left
        top: 27 * MM_TO_POINTS,  // 27mm from top
        width: 85 * MM_TO_POINTS, // 85mm wide
        height: 40 * MM_TO_POINTS // 40mm high
      };
    case 'din676':
      // DIN 676 Type A
      return {
        left: 20 * MM_TO_POINTS, // 20mm from left
        top: 50 * MM_TO_POINTS,  // 50mm from top  
        width: 90 * MM_TO_POINTS, // 90mm wide
        height: 45 * MM_TO_POINTS // 45mm high
      };
    case 'custom':
      // Custom type starts with Form B dimensions
      return {
        left: 20 * MM_TO_POINTS, // 20mm from left
        top: 45 * MM_TO_POINTS,  // 45mm from top
        width: 85 * MM_TO_POINTS, // 85mm wide
        height: 40 * MM_TO_POINTS // 40mm high
      };
    case 'formB':
    default:
      // DIN 5008 Form B (tiefgestelltes Anschriftfeld)
      return {
        left: 20 * MM_TO_POINTS, // 20mm from left
        top: 45 * MM_TO_POINTS,  // 45mm from top
        width: 85 * MM_TO_POINTS, // 85mm wide
        height: 40 * MM_TO_POINTS // 40mm high
      };
  }
});

// Calculate the scaled position for the annotation overlay
const scaledAnnotation = computed(() => {
  if (isDragging.value) {
    return {
      left: `${annotationPosition.value.left}px`,
      top: `${annotationPosition.value.top}px`,
      width: `${addressWindow.value.width * pdfScale.value}px`,
      height: `${addressWindow.value.height * pdfScale.value}px`
    };
  }

  return {
    left: `${addressWindow.value.left * pdfScale.value}px`,
    top: `${addressWindow.value.top * pdfScale.value}px`,
    width: `${addressWindow.value.width * pdfScale.value}px`,
    height: `${addressWindow.value.height * pdfScale.value}px`
  };
});

// Cursor style for the annotation box
const annotationCursor = computed(() => {
  return props.allowReposition ? 'move' : 'default';
});

// Watch for form type changes to reset any custom position
watch(() => props.formType, () => {
  isDragging.value = false;
  annotationPosition.value = { left: 0, top: 0 };
});

// Methods
const onPdfLoaded = (pdf: any) => {
  pdfRef.value = pdf;
  
  // Calculate scale based on the container width
  if (containerRef.value) {
    const containerWidth = containerRef.value.clientWidth;
    pdfScale.value = containerWidth / props.width;
  }
};

// Handle starting to drag the annotation box
const startDrag = (event: MouseEvent) => {
  if (!props.allowReposition) return;
  
  isDragging.value = true;
  
  // Save starting position
  startDragPosition.value = {
    x: event.clientX,
    y: event.clientY
  };
  
  // Initialize annotation position if first drag
  if (annotationPosition.value.left === 0 && annotationPosition.value.top === 0) {
    annotationPosition.value = {
      left: addressWindow.value.left * pdfScale.value,
      top: addressWindow.value.top * pdfScale.value
    };
  }
  
  // Add event listeners for dragging
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', stopDrag);
  
  // Prevent default behavior
  event.preventDefault();
};

// Handle dragging the annotation box
const onDrag = (event: MouseEvent) => {
  if (!isDragging.value) return;
  
  // Calculate new position
  const deltaX = event.clientX - startDragPosition.value.x;
  const deltaY = event.clientY - startDragPosition.value.y;
  
  // Update position
  annotationPosition.value = {
    left: annotationPosition.value.left + deltaX,
    top: annotationPosition.value.top + deltaY
  };
  
  // Update start position for next move
  startDragPosition.value = {
    x: event.clientX,
    y: event.clientY
  };
};

// Handle stopping drag
const stopDrag = () => {
  if (!isDragging.value) return;
  
  isDragging.value = false;
  
  // Remove event listeners
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', stopDrag);
  
  // Convert back to PDF coordinates and emit the new position
  const newCoordinates = {
    left: annotationPosition.value.left / pdfScale.value,
    top: annotationPosition.value.top / pdfScale.value,
    width: addressWindow.value.width,
    height: addressWindow.value.height
  };
  
  emit('annotation-moved', newCoordinates);
};

// Clean up event listeners
onMounted(() => {
  window.addEventListener('resize', () => {
    if (containerRef.value) {
      pdfScale.value = containerRef.value.clientWidth / props.width;
    }
  });
});
</script>

<template>
  <div ref="containerRef" class="pdf-annotator-container">
    <!-- PDF Viewer -->
    <div class="pdf-viewer-container">
      <PdfEmbed 
        :source="source"
        :page="1"
        @loaded="onPdfLoaded"
      />
      
      <!-- Address Window Annotation Layer -->
      <div 
        class="address-annotation" 
        :style="scaledAnnotation"
        :class="{ 'draggable': allowReposition, 'dragging': isDragging }"
        @mousedown="startDrag"
      >
        <!-- Corner handles for resize visual effect -->
        <div class="annotation-corner top-left"></div>
        <div class="annotation-corner top-right"></div>
        <div class="annotation-corner bottom-left"></div>
        <div class="annotation-corner bottom-right"></div>
        
        <!-- Overlay title -->
        <div class="annotation-title">Address Window</div>
        
        <!-- Indicator that shows this is draggable -->
        <div v-if="allowReposition" class="drag-indicator">
          <i class="pi pi-arrows-alt"></i>
        </div>
      </div>
    </div>
    
    <!-- Form Type Indicator -->
    <div class="form-type-indicator">
      <span class="form-label">Form Type:</span>
      <span class="form-value">
        {{ props.formType === 'formA' ? 'DIN 5008 Form A' : 
           props.formType === 'din676' ? 'DIN 676 Type A' :
           props.formType === 'custom' ? 'Custom (Draggable)' :
           'DIN 5008 Form B' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.pdf-annotator-container {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.pdf-viewer-container {
  position: relative;
  width: 100%;
}

.address-annotation {
  position: absolute;
  border: 2px solid #2196F3;
  background-color: rgba(33, 150, 243, 0.2);
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  border-radius: 4px;
  box-sizing: border-box;
  pointer-events: none;
  transition: border-color 0.2s, background-color 0.2s;
  z-index: 10;
}

.address-annotation.draggable {
  cursor: move;
  pointer-events: all;
}

.address-annotation.dragging {
  background-color: rgba(33, 150, 243, 0.3);
  border-color: #1565C0;
}

.annotation-title {
  position: absolute;
  top: -25px;
  left: 0;
  background-color: #2196F3;
  color: white;
  padding: 2px 8px;
  font-size: 0.8rem;
  border-radius: 4px;
  white-space: nowrap;
}

.annotation-corner {
  position: absolute;
  width: 8px;
  height: 8px;
  background-color: white;
  border: 2px solid #2196F3;
  border-radius: 50%;
}

.top-left {
  top: -4px;
  left: -4px;
}

.top-right {
  top: -4px;
  right: -4px;
}

.bottom-left {
  bottom: -4px;
  left: -4px;
}

.bottom-right {
  bottom: -4px;
  right: -4px;
}

.drag-indicator {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #1565C0;
  font-size: 1.5rem;
  opacity: 0.5;
}

.draggable:hover .drag-indicator {
  opacity: 0.8;
}

.form-type-indicator {
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
  padding: 0.5rem;
  background-color: #f0f4f8;
  border-radius: 4px;
  font-size: 0.9rem;
}

.form-label {
  font-weight: 600;
  margin-right: 0.5rem;
  color: #546e7a;
}

.form-value {
  color: #2196F3;
  font-weight: 500;
}
</style> 