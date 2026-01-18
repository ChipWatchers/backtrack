/**
 * X-Ray Spine Grid Background with 3 Scrolling Rows
 * Row 1 & 3 scroll left, Row 2 scrolls right
 */

class SpineBackground {
    constructor() {
        this.image = null;
        this.imageLoaded = false;
        this.rows = [];
        this.scrollSpeed = 0.5; // pixels per frame
        this.rowHeight = 0;
    }

    async init() {
        try {
            const canvas = document.getElementById('spineBackground');
            if (!canvas) {
                console.error('❌ Canvas element not found');
                return;
            }
            
            // Set initial canvas size
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            // Load the X-ray spine image
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            // Try to load from images directory (if it exists) or use a placeholder pattern
            img.onload = () => {
                this.image = img;
                this.imageLoaded = true;
                this.setupRows();
                this.animate();
                console.log('🦴 X-ray spine image loaded');
            };
            
            img.onerror = () => {
                console.warn('⚠️  Could not load X-ray image, using programmatic pattern');
                this.imageLoaded = false;
                this.setupRows();
                this.animate();
            };
            
            // Try to load the image - adjust path as needed
            // Will fallback to programmatic pattern if image doesn't exist
            img.src = '../images/xray.jpg';
            
        } catch (error) {
            console.error('❌ Error initializing spine background:', error);
            // Continue with programmatic pattern even if image fails
            this.imageLoaded = false;
            this.setupRows();
            this.animate();
        }
    }

    setupRows() {
        const canvas = document.getElementById('spineBackground');
        if (!canvas) return;
        
        // Split background into 3 horizontal rows
        this.rowHeight = canvas.height / 3;
        
        // Create 3 row objects with independent scroll positions
        this.rows = [
            { y: 0, offsetX: 0, direction: -1, width: canvas.width }, // Row 1: scroll left
            { y: this.rowHeight, offsetX: 0, direction: 1, width: canvas.width }, // Row 2: scroll right
            { y: this.rowHeight * 2, offsetX: 0, direction: -1, width: canvas.width } // Row 3: scroll left
        ];
    }

    createXRayPattern(ctx, width, height) {
        // Create programmatic X-ray spine pattern if image isn't loaded
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);
        
        // Draw spine segments (vertebrae)
        const segmentsPerRow = 12;
        const segmentWidth = width / segmentsPerRow;
        
        for (let i = 0; i < segmentsPerRow; i++) {
            const x = i * segmentWidth;
            const centerX = x + segmentWidth / 2;
            
            // Draw vertebrae (rectangular with rounded corners)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(x + 10, height * 0.3, segmentWidth - 20, height * 0.4, 8);
            ctx.fill();
            
            // Inner ellipse (spinal canal)
            ctx.fillStyle = '#1a1a1a';
            ctx.beginPath();
            ctx.ellipse(centerX, height * 0.5, segmentWidth * 0.15, height * 0.25, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // Medical text annotations (small)
            ctx.fillStyle = '#888888';
            ctx.font = '8px monospace';
            ctx.fillText(`${i + 1}`, x + 15, height * 0.7);
        }
    }

    animate() {
        if (!this.rows.length) return;
        
        const canvas = document.getElementById('spineBackground');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        const animateFrame = () => {
            // Clear canvas
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Draw each row
            this.rows.forEach((row, index) => {
                // Update scroll offset
                row.offsetX += this.scrollSpeed * row.direction;
                
                // Reset offset when it goes too far (seamless loop)
                const imageWidth = this.image ? this.image.width : canvas.width * 2;
                if (Math.abs(row.offsetX) >= imageWidth) {
                    row.offsetX = row.offsetX % imageWidth;
                }
                
                // Save context
                ctx.save();
                
                // Clip to row area
                ctx.beginPath();
                ctx.rect(0, row.y, canvas.width, this.rowHeight);
                ctx.clip();
                
                // Draw row content
                if (this.image && this.imageLoaded) {
                    const sourceRowHeight = this.image.height / 3;
                    const sourceY = index * sourceRowHeight;
                    
                    // Calculate positions for seamless scrolling
                    let drawX = -row.offsetX;
                    
                    // Draw first copy (primary)
                    ctx.drawImage(
                        this.image,
                        0, sourceY, // Source position (x, y)
                        this.image.width, sourceRowHeight, // Source size
                        drawX, row.y, // Destination position
                        this.image.width, this.rowHeight // Destination size
                    );
                    
                    // Draw second copy for seamless loop (behind)
                    if (row.direction < 0) {
                        // Scrolling left: second copy on the right
                        drawX = drawX + this.image.width;
                        ctx.drawImage(
                            this.image,
                            0, sourceY,
                            this.image.width, sourceRowHeight,
                            drawX, row.y,
                            this.image.width, this.rowHeight
                        );
                    } else {
                        // Scrolling right: second copy on the left
                        drawX = drawX - this.image.width;
                        ctx.drawImage(
                            this.image,
                            0, sourceY,
                            this.image.width, sourceRowHeight,
                            drawX, row.y,
                            this.image.width, this.rowHeight
                        );
                    }
                } else {
                    // Use programmatic pattern
                    ctx.translate(-row.offsetX, 0);
                    this.createXRayPattern(ctx, canvas.width * 2, this.rowHeight);
                    ctx.translate(canvas.width * 2, 0);
                    this.createXRayPattern(ctx, canvas.width * 2, this.rowHeight);
                }
                
                // Restore context
                ctx.restore();
            });
            
            requestAnimationFrame(animateFrame);
        };
        
        animateFrame();
        
        // Handle window resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.setupRows();
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
            }, 250);
        });
    }
}

// Initialize on page load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        const bg = new SpineBackground();
        await bg.init();
    });
}
