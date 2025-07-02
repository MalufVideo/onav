// Tailwind CSS Configuration
tailwind.config = {
    theme: {
        extend: {
            colors: {
                primary: '#00ff9d',
                secondary: '#0066ff',
                purpleish: '#9370DB',
                dark: '#0a0a0a',
                darker: '#020202',
                'light-text': '#e0e0e0',
                'medium-text': '#a0a0a0',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['Fira Code', 'monospace'],
            },
            animation: {
                'subtle-float': 'subtle-float 6s ease-in-out infinite',
            },
            keyframes: {
                'subtle-float': {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-8px)' },
                }
            }
        }
    }
};

// Smooth Scrolling for Navigation Links
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll for anchor links
    const links = document.querySelectorAll('a[href^="#"]');
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Mobile Navigation Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (mobileMenu && !mobileMenu.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            mobileMenu.classList.add('hidden');
        }
    });

    // Navigation Active State
    const navLinks = document.querySelectorAll('nav a');
    const currentPath = window.location.pathname;
    
    navLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath || 
            (currentPath === '/' && link.getAttribute('href') === 'index.html')) {
            link.classList.add('text-primary');
        }
    });
});

// Modal Management
class ModalManager {
    constructor() {
        this.modals = {};
        this.init();
    }

    init() {
        // Find all modals
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            const modalId = modal.id;
            if (modalId) {
                this.modals[modalId] = modal;
                
                // Close button
                const closeBtn = modal.querySelector('.modal-close');
                if (closeBtn) {
                    closeBtn.addEventListener('click', () => this.close(modalId));
                }

                // Click outside to close
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.close(modalId);
                    }
                });
            }
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAll();
            }
        });
    }

    open(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevent background scroll
            
            // Pause any videos in the modal
            const iframe = modal.querySelector('iframe');
            if (iframe && iframe.src) {
                iframe.src = iframe.src; // Reload to reset video
            }
        }
    }

    close(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = ''; // Restore scroll
            
            // Stop any videos
            const iframe = modal.querySelector('iframe');
            if (iframe) {
                const src = iframe.src;
                iframe.src = '';
                iframe.src = src;
            }
        }
    }

    closeAll() {
        Object.keys(this.modals).forEach(modalId => {
            this.close(modalId);
        });
    }
}

// Initialize Modal Manager
let modalManager;
document.addEventListener('DOMContentLoaded', () => {
    modalManager = new ModalManager();
});

// FAQ Toggle Function
function toggleFAQ(faqId) {
    const content = document.getElementById(faqId + '-content');
    const icon = document.getElementById(faqId + '-icon');
    
    if (content && icon) {
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            icon.style.transform = 'rotate(180deg)';
        } else {
            content.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
        }
    }
}

// Intersection Observer for Animations
document.addEventListener('DOMContentLoaded', function() {
    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '50px'
        });

        // Observe elements with animation classes
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });
    }
});

// Performance Optimization: Lazy Loading Enhancement
document.addEventListener('DOMContentLoaded', function() {
    // Native lazy loading fallback
    if ('loading' in HTMLImageElement.prototype) {
        const images = document.querySelectorAll('img[loading="lazy"]');
        images.forEach(img => {
            if (img.dataset.src) {
                img.src = img.dataset.src;
            }
        });
    } else {
        // Fallback for browsers that don't support native lazy loading
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                }
            });
        });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }
});

// Contact Form Handler
function handleContactForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        
        // Show loading state
        submitBtn.textContent = 'Enviando...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            const response = await fetch('/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Success
                showNotification('Mensagem enviada com sucesso!', 'success');
                form.reset();
            } else {
                // Error
                showNotification(result.message || 'Erro ao enviar mensagem', 'error');
            }
        } catch (error) {
            showNotification('Erro ao enviar mensagem. Tente novamente.', 'error');
        } finally {
            // Restore button
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Notification System
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500' : 
        type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    } text-white`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Remove after 5 seconds
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Initialize contact forms
document.addEventListener('DOMContentLoaded', function() {
    const contactForms = document.querySelectorAll('form[data-contact-form]');
    contactForms.forEach(form => {
        handleContactForm(form.id);
    });
});

// Gallery Image Modal
function openImageModal(imageSrc, imageAlt) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content max-w-4xl">
            <button class="modal-close">&times;</button>
            <img src="${imageSrc}" alt="${imageAlt}" class="w-full h-auto rounded-lg">
            <p class="text-center mt-4 text-light-text">${imageAlt}</p>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // Close handlers
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.remove();
        document.body.style.overflow = '';
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            document.body.style.overflow = '';
        }
    });
    
    document.body.style.overflow = 'hidden';
}

// Performance: Defer non-critical JavaScript
function deferNonCriticalJS() {
    if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
            // Load non-critical scripts here
            initializeAnalytics();
        });
    } else {
        // Fallback for browsers without requestIdleCallback
        setTimeout(() => {
            initializeAnalytics();
        }, 1000);
    }
}

function initializeAnalytics() {
    // Analytics initialization code here
    if (typeof gtag !== 'undefined') {
        gtag('config', 'G-HPLPNWR5LS', {
            page_path: window.location.pathname
        });
    }
}

// Call defer function
document.addEventListener('DOMContentLoaded', deferNonCriticalJS);