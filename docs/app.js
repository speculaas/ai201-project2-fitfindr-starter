import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
import elkLayouts from 'https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0.1.4/dist/mermaid-layout-elk.esm.min.mjs';

let slides = [];
let currentIndex = 0;

const imgEl = document.getElementById("gallery-image");
const fallbackEl = document.getElementById("mermaid-fallback");
const renderEl = document.getElementById("mermaid-render");
const codeEl = document.getElementById("mermaid-code");
const titleEl = document.getElementById("gallery-title");
const descEl = document.getElementById("gallery-description");
const currentSlideEl = document.getElementById("current-slide");
const totalSlidesEl = document.getElementById("total-slides");

// Initialize mermaid with ELK support
mermaid.registerLayoutLoaders(elkLayouts);
mermaid.initialize({ startOnLoad: false, theme: 'default' });

// Fetch JSON data
fetch("data.json")
    .then(response => response.json())
    .then(data => {
        slides = data;
        totalSlidesEl.textContent = slides.length;
        renderSlide(currentIndex);
    })
    .catch(err => {
        console.error("Failed to load gallery data:", err);
        titleEl.textContent = "Error Loading Data";
        descEl.innerHTML = "<p>Could not load data.json. Ensure you are running this over a local HTTP server.</p>";
    });

function renderSlide(index) {
    if (slides.length === 0) return;
    
    const slide = slides[index];
    
    // Reset display
    imgEl.style.display = "block";
    renderEl.style.display = "none";
    renderEl.innerHTML = "";
    fallbackEl.style.display = "none";
    
    // Handle image load error: fallback to mermaid render
    imgEl.onerror = async function() {
        this.style.display = 'none';
        renderEl.style.display = 'flex';
        
        try {
            const { svg } = await mermaid.render('mermaid-svg-' + index, slide.mermaid_code);
            renderEl.innerHTML = svg;
            
            // Enable SVG Pan and Zoom
            const svgElement = renderEl.querySelector('svg');
            if (svgElement) {
                svgElement.style.width = '100%';
                svgElement.style.height = '100%';
                svgPanZoom(svgElement, {
                    zoomEnabled: true,
                    controlIconsEnabled: true,
                    fit: true,
                    center: true,
                    minZoom: 0.5,
                    maxZoom: 10
                });
            }
        } catch (error) {
            console.error("Mermaid render failed:", error);
            renderEl.style.display = 'none';
            fallbackEl.style.display = "block";
        }
    };

    // Trigger load
    imgEl.src = slide.image_filename;
    codeEl.textContent = slide.mermaid_code;
    titleEl.textContent = slide.title;
    
    // Parse markdown description
    descEl.innerHTML = marked.parse(slide.description);
    
    // Update counter
    currentSlideEl.textContent = index + 1;
}

function nextSlide() {
    if (slides.length === 0) return;
    currentIndex = (currentIndex + 1) % slides.length;
    renderSlide(currentIndex);
}

function prevSlide() {
    if (slides.length === 0) return;
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    renderSlide(currentIndex);
}

// Event Listeners
document.getElementById("next-btn").addEventListener("click", nextSlide);
document.getElementById("prev-btn").addEventListener("click", prevSlide);

// Keyboard navigation
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
        nextSlide();
    } else if (e.key === "ArrowLeft") {
        prevSlide();
    }
});
