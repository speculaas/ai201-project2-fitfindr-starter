document.addEventListener("DOMContentLoaded", () => {
    let slides = [];
    let currentIndex = 0;

    const imgEl = document.getElementById("gallery-image");
    const fallbackEl = document.getElementById("mermaid-fallback");
    const codeEl = document.getElementById("mermaid-code");
    const titleEl = document.getElementById("gallery-title");
    const descEl = document.getElementById("gallery-description");
    const currentSlideEl = document.getElementById("current-slide");
    const totalSlidesEl = document.getElementById("total-slides");

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
        
        // Reset image display
        imgEl.style.display = "block";
        fallbackEl.style.display = "none";
        
        // Update content
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
});
