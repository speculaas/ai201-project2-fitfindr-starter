let slides = [];
let currentIndex = 0;
let navigationStack = [];
let currentState = null;

const imgEl = document.getElementById("gallery-image");
const fallbackEl = document.getElementById("mermaid-fallback");
const renderEl = document.getElementById("mermaid-render");
const codeEl = document.getElementById("mermaid-code");
const titleEl = document.getElementById("gallery-title");
const currentSlideEl = document.getElementById("current-slide");
const totalSlidesEl = document.getElementById("total-slides");

const textContentEl = document.querySelector(".text-content");

(async function init() {
    try {
        titleEl.textContent = "Loading modules...";
        
        const { default: mermaid } = await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs');
        const { default: elkLayouts } = await import('https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0.1.4/dist/mermaid-layout-elk.esm.min.mjs');

        mermaid.registerLayoutLoaders(elkLayouts);
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        window.mermaid = mermaid;

        titleEl.textContent = "Fetching data...";

        const response = await fetch("data.json");
        const data = await response.json();
        
        slides = data;
        totalSlidesEl.textContent = slides.length;
        renderSlide(currentIndex);

    } catch (err) {
        console.error("Initialization failed:", err);
        titleEl.textContent = "Error Starting App";
        textContentEl.innerHTML = `<p>Error loading scripts or data:</p><pre style="color:red;">${err.message}</pre>`;
    }
})();

function renderSlide(index) {
    if (slides.length === 0) return;
    
    const slide = slides[index];
    navigationStack = []; // Reset focus depth
    
    imgEl.style.display = "block";
    renderEl.style.display = "none";
    renderEl.innerHTML = "";
    fallbackEl.style.display = "none";
    
    imgEl.onerror = async function() {
        this.style.display = 'none';
        renderEl.style.display = 'flex';
        
        try {
            const { svg } = await window.mermaid.render('mermaid-svg-' + index, slide.mermaid_code);
            renderEl.innerHTML = svg;
            
            const svgElement = renderEl.querySelector('svg');
            if (svgElement) {
                svgElement.style.width = '100%';
                svgElement.style.height = '100%';
                svgPanZoom(svgElement, { zoomEnabled: true, controlIconsEnabled: true, fit: true, center: true, minZoom: 0.5, maxZoom: 10 });
            }
        } catch (error) {
            renderEl.style.display = 'none';
            fallbackEl.style.display = "block";
        }
    };
    
    imgEl.src = slide.image_filename;
    codeEl.textContent = slide.mermaid_code;
    titleEl.textContent = slide.title;
    
    renderRightColumn({
        type: 'root',
        description: slide.description,
        comments: slide.comments || []
    });
    
    currentSlideEl.textContent = index + 1;
}

function renderRightColumn(state) {
    currentState = state;
    textContentEl.innerHTML = "";
    
    if (state.type === 'nested') {
        const backContainer = document.createElement("div");
        backContainer.className = "back-btn-container";
        const backBtn = document.createElement("button");
        backBtn.className = "back-btn";
        backBtn.textContent = "⬅ Back to previous thread";
        backBtn.onclick = () => {
            const prevState = navigationStack.pop();
            renderRightColumn(prevState);
        };
        backContainer.appendChild(backBtn);
        textContentEl.appendChild(backContainer);
        
        const parentContainer = document.createElement("div");
        parentContainer.className = "parent-focused-comment comment-thread";
        renderCommentsArray([state.parentComment], parentContainer, true);
        textContentEl.appendChild(parentContainer);
    } else {
        if (state.description) {
            const descEl = document.createElement("div");
            descEl.id = "gallery-description";
            descEl.innerHTML = marked.parse(state.description);
            textContentEl.appendChild(descEl);
        }
    }
    
    const commentsContainer = document.createElement("div");
    commentsContainer.id = "gallery-comments-container";
    commentsContainer.className = "comment-thread";
    
    if (state.comments && state.comments.length > 0) {
        renderCommentsArray(state.comments, commentsContainer, false);
    }
    
    textContentEl.appendChild(commentsContainer);
    
    requestAnimationFrame(() => {
        const textContents = textContentEl.querySelectorAll('.comment-text-content');
        textContents.forEach(content => {
            if (content.scrollHeight > content.clientHeight) {
                const btn = document.createElement("button");
                btn.className = "see-more-btn";
                btn.textContent = "See more";
                btn.onclick = () => {
                    content.classList.remove('collapsed');
                    btn.remove();
                };
                content.parentElement.appendChild(btn);
            }
        });
    });
}

function renderCommentsArray(comments, container, isFocusedParent) {
    comments.forEach(comment => {
        const commentDiv = document.createElement("div");
        commentDiv.className = "comment";
        
        const authorDiv = document.createElement("div");
        authorDiv.className = "comment-author";
        authorDiv.textContent = comment.author;
        commentDiv.appendChild(authorDiv);
        
        const textWrapper = document.createElement("div");
        textWrapper.className = "comment-text-wrapper";
        
        const collapsedClass = isFocusedParent ? "" : "collapsed";
        const textDiv = document.createElement("div");
        textDiv.className = `comment-text comment-text-content ${collapsedClass}`;
        textDiv.innerHTML = marked.parse(comment.text);
        textWrapper.appendChild(textDiv);
        
        commentDiv.appendChild(textWrapper);
        
        if (comment.image_url) {
            const imgContainer = document.createElement("div");
            imgContainer.className = "comment-image-container";
            const commentImg = document.createElement("img");
            commentImg.src = comment.image_url;
            commentImg.alt = "Comment attachment";
            
            commentImg.onclick = async () => {
                renderEl.style.display = "none";
                fallbackEl.style.display = "none";
                imgEl.style.display = "block";
                imgEl.src = comment.image_url;
                
                if (!isFocusedParent) {
                    let nestedComments = [];
                    if (comment.nested_json_file) {
                        try {
                            const resp = await fetch(comment.nested_json_file);
                            const nestedSlide = await resp.json();
                            nestedComments = nestedSlide.comments || [];
                        } catch(err) {
                            console.error("Failed to load nested thread", err);
                        }
                    }
                    
                    // Push current view to stack
                    navigationStack.push(currentState);
                    
                    // Render the nested view (even if nestedComments is empty)
                    renderRightColumn({
                        type: 'nested',
                        parentComment: comment,
                        comments: nestedComments
                    });
                }
            };
            
            imgContainer.appendChild(commentImg);
            commentDiv.appendChild(imgContainer);
        }
        
        container.appendChild(commentDiv);
    });
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

document.getElementById("next-btn").addEventListener("click", nextSlide);
document.getElementById("prev-btn").addEventListener("click", prevSlide);

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") nextSlide();
    else if (e.key === "ArrowLeft") prevSlide();
});
