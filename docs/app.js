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

// Use an async IIFE to catch import errors gracefully
(async function init() {
    try {
        titleEl.textContent = "Loading modules...";
        
        // Dynamically import Mermaid and ELK to catch any CDN/CORS errors
        const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs');
        const { default: elkLayouts } = await import('https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0.1.4/dist/mermaid-layout-elk.esm.min.mjs');

        // Initialize mermaid with ELK support
        mermaid.registerLayoutLoaders(elkLayouts);
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        
        // Expose mermaid to global scope so renderSlide's onerror can use it
        window.mermaid = mermaid;

        titleEl.textContent = "Fetching data...";

        // Fetch JSON data
        const response = await fetch("data.json");
        const data = await response.json();
        
        slides = data;
        totalSlidesEl.textContent = slides.length;
        renderSlide(currentIndex);

    } catch (err) {
        console.error("Initialization failed:", err);
        titleEl.textContent = "Error Starting App";
        descEl.innerHTML = `<p>There was a problem loading the scripts or data:</p><pre style="color:red;">${err.stack || err.message || err}</pre><p>Check your browser console (F12) for more details.</p>`;
    }
})();

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
            const { svg } = await window.mermaid.render('mermaid-svg-' + index, slide.mermaid_code);
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
