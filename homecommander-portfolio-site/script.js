// Interactive Demo Functionality
class HomeCommanderDemo {
    constructor() {
        this.currentTab = 'dashboard';
        this.brightness1 = 80;
        this.brightness3 = 60;
        this.colorIndex = 0;
        this.colors = [
            '#ff6b35', '#f7931e', '#ffd700', '#9acd32', 
            '#32cd32', '#00fa9a', '#00ced1', '#1e90ff',
            '#6a5acd', '#da70d6', '#ff69b4', '#ff1493'
        ];
        this.smartOutletOn = false;
        
        this.init();
        this.startClock();
    }

    init() {
        // Tab switching
        document.querySelectorAll('.demo-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Dashboard control interactions
        document.querySelectorAll('.demo-control').forEach(control => {
            control.addEventListener('click', (e) => {
                this.handleControlClick(e.currentTarget);
            });
        });

        // Device assignment buttons
        document.querySelectorAll('.assign-btn.available').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleDeviceAssignment(e.target);
            });
        });

        // Settings fullscreen toggle button
        const settingsBtn = document.querySelector('.settings-nav-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', (e) => {
                this.toggleFullscreen();
            });
        }

        // Demo navigation buttons in dashboard
        document.querySelectorAll('.demo-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetTab = e.target.dataset.tab;
                if (targetTab) {
                    this.switchTab(targetTab);
                }
            });
        });

        // Add keyboard controls
        document.addEventListener('keydown', (e) => {
            if (e.key >= '1' && e.key <= '6') {
                this.handleKeyboardControl(parseInt(e.key));
                e.preventDefault();
            }
        });
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.demo-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.demo-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-demo`).classList.add('active');

        this.currentTab = tabName;
    }

    handleControlClick(control) {
        const controlId = parseInt(control.dataset.control);
        this.handleKeyboardControl(controlId);
    }

    handleKeyboardControl(controlId) {
        // Add visual feedback
        const controlEl = document.querySelector(`[data-control="${controlId}"]`);
        if (controlEl) {
            controlEl.style.transform = 'scale(0.95)';
            setTimeout(() => {
                controlEl.style.transform = 'scale(1)';
            }, 150);
        }

        switch (controlId) {
            case 1: // Living Room Light Brightness
                this.brightness1 = (this.brightness1 + 10) % 110;
                if (this.brightness1 === 0) this.brightness1 = 10;
                document.getElementById('brightness-1').textContent = `${this.brightness1}%`;
                this.showToast(`Living Room Light: ${this.brightness1}%`);
                break;
                
            case 2: // Kitchen LED Strip Color
                this.colorIndex = (this.colorIndex + 1) % this.colors.length;
                const newColor = this.colors[this.colorIndex];
                const colorStatusEl = document.getElementById('color-status-2');
                const colorControlEl = document.getElementById('rotary-2-control');
                const textColor = this.getContrastTextColor(newColor);
                
                // Set background color on entire control circle
                colorControlEl.style.background = newColor;
                colorControlEl.style.color = textColor;
                
                // Update hex code text
                colorStatusEl.textContent = newColor;
                
                this.showToast(`Kitchen LED Strip: ${newColor}`);
                break;
                
            case 3: // Bedroom Light Brightness
                this.brightness3 = (this.brightness3 + 10) % 110;
                if (this.brightness3 === 0) this.brightness3 = 10;
                document.getElementById('brightness-3').textContent = `${this.brightness3}%`;
                this.showToast(`Bedroom Light: ${this.brightness3}%`);
                break;
                
            case 4: // Smart Outlet Toggle
                this.smartOutletOn = !this.smartOutletOn;
                const switchEl = document.getElementById('switch-4');
                const statusEl = document.getElementById('status-4');
                
                if (this.smartOutletOn) {
                    switchEl.textContent = '🌕';
                    statusEl.textContent = 'On';
                    this.showToast('Smart Outlet: On');
                } else {
                    switchEl.textContent = '🌑';
                    statusEl.textContent = 'Off';
                    this.showToast('Smart Outlet: Off');
                }
                break;
        }
    }

    handleDeviceAssignment(button) {
        const device = button.dataset.device;
        const spot = button.dataset.spot;
        
        // Simulate assignment
        button.classList.remove('available');
        button.classList.add('assigned');
        button.textContent = `Assigned to ${button.textContent.includes('Button') ? 'Button' : 'Rotary'} ${spot}`;
        
        this.showToast(`${device.charAt(0).toUpperCase() + device.slice(1)} assigned to control ${spot}`);
    }

    showToast(message) {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #2196f3;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    toggleFullscreen() {
        // Use the same toast notification style as dashboard notifications
        this.showToast('Fullscreen Toggle');
    }

    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString('en-US', { 
                hour12: false,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            document.getElementById('demo-time').textContent = timeString;
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    // Helper function to determine if text should be black or white based on background color
    getContrastTextColor(hexColor) {
        // Remove # if present
        const hex = hexColor.replace('#', '');
        
        // Convert to RGB
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Calculate luminance using standard formula
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        // Return black for light colors, white for dark colors
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }
}

// Scroll animations
class ScrollAnimations {
    constructor() {
        this.observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };
        
        this.init();
    }

    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-in');
                }
            });
        }, this.observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.feature-card, .tech-card, .gallery-item, .timeline-item').forEach(el => {
            observer.observe(el);
        });

        // Add CSS for animations
        this.addAnimationStyles();
    }

    addAnimationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .feature-card, .tech-card, .gallery-item, .timeline-item {
                opacity: 0;
                transform: translateY(30px);
                transition: opacity 0.6s ease, transform 0.6s ease;
            }
            
            .feature-card.animate-in, .tech-card.animate-in, 
            .gallery-item.animate-in, .timeline-item.animate-in {
                opacity: 1;
                transform: translateY(0);
            }
            
            .timeline-item:nth-child(even).animate-in {
                animation: slideInLeft 0.6s ease forwards;
            }
            
            .timeline-item:nth-child(odd).animate-in {
                animation: slideInRight 0.6s ease forwards;
            }
            
            @keyframes slideInLeft {
                from {
                    opacity: 0;
                    transform: translateX(-50px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
            
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(50px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Smooth scrolling for navigation links
class SmoothScrolling {
    constructor() {
        this.init();
    }

    init() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(e.target.getAttribute('href'));
                if (target) {
                    const headerOffset = 80;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// Gallery lightbox functionality
class GalleryLightbox {
    constructor() {
        this.init();
    }

    init() {
        document.querySelectorAll('.gallery-item img').forEach(img => {
            img.addEventListener('click', (e) => {
                this.openLightbox(e.target);
            });
        });
    }

    openLightbox(img) {
        const lightbox = document.createElement('div');
        lightbox.className = 'lightbox';
        lightbox.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            cursor: pointer;
        `;

        const lightboxImg = document.createElement('img');
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt;
        lightboxImg.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        `;

        lightbox.appendChild(lightboxImg);
        document.body.appendChild(lightbox);

        // Close on click
        lightbox.addEventListener('click', () => {
            document.body.removeChild(lightbox);
        });

        // Close on Escape key
        const closeOnEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(lightbox);
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);
    }
}

// Navbar scroll effect
class NavbarScrollEffect {
    constructor() {
        this.navbar = document.querySelector('.navbar');
        this.init();
    }

    init() {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                this.navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                this.navbar.style.boxShadow = '0 2px 20px rgba(0, 0, 0, 0.1)';
            } else {
                this.navbar.style.background = 'rgba(255, 255, 255, 0.95)';
                this.navbar.style.boxShadow = 'none';
            }
        });
    }
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HomeCommanderDemo();
    new ScrollAnimations();
    new SmoothScrolling();
    new GalleryLightbox();
    new NavbarScrollEffect();

    // Add demo instructions
    const instructions = document.createElement('div');
    instructions.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        background: #2196f3;
        color: white;
        padding: 0.75rem 1rem;
        border-radius: 8px;
        font-size: 0.9rem;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.3s ease;
    `;
    instructions.innerHTML = '💡 Try pressing keys 1-6 or clicking the controls!';
    document.body.appendChild(instructions);

    // Show instructions after a delay
    setTimeout(() => {
        instructions.style.opacity = '1';
        instructions.style.transform = 'translateY(0)';
    }, 2000);

    // Hide instructions after 8 seconds
    setTimeout(() => {
        instructions.style.opacity = '0';
        instructions.style.transform = 'translateY(20px)';
        setTimeout(() => {
            if (instructions.parentNode) {
                document.body.removeChild(instructions);
            }
        }, 300);
    }, 8000);
});
