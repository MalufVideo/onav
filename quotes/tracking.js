/**
 * Client-side tracking script for On+Av quote pages
 */

// Initialize tracking when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Start tracking session
    initializeTracking();
    
    // Track page view duration
    trackPageViewDuration();
    
    // Track user interactions
    trackUserInteractions();
    
    // Track scroll depth
    trackScrollDepth();
});

// Initialize tracking
function initializeTracking() {
    // Send initial page view data
    fetch('track_event.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            event_type: 'page_view',
            page_name: document.title,
            url: window.location.href,
            referrer: document.referrer,
            screen_width: window.screen.width,
            screen_height: window.screen.height
        })
    }).catch(error => {
        console.error('Tracking error:', error);
    });
}

// Track page view duration
function trackPageViewDuration() {
    const startTime = new Date().getTime();
    
    // Update duration periodically
    setInterval(function() {
        const currentTime = new Date().getTime();
        const duration = Math.floor((currentTime - startTime) / 1000); // in seconds
        
        fetch('track_event.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_type: 'update_duration',
                duration: duration
            })
        }).catch(error => {
            console.error('Duration tracking error:', error);
        });
    }, 30000); // Update every 30 seconds
    
    // Update on page unload
    window.addEventListener('beforeunload', function() {
        const currentTime = new Date().getTime();
        const duration = Math.floor((currentTime - startTime) / 1000); // in seconds
        
        // Use sendBeacon for more reliable tracking on page exit
        if (navigator.sendBeacon) {
            const data = new Blob([JSON.stringify({
                event_type: 'update_duration',
                duration: duration,
                is_exit: true
            })], { type: 'application/json' });
            
            navigator.sendBeacon('track_event.php', data);
        }
    });
}

// Track user interactions
function trackUserInteractions() {
    // Track clicks
    document.addEventListener('click', function(event) {
        const target = event.target;
        const elementType = target.tagName.toLowerCase();
        const elementId = target.id || '';
        const elementClass = target.className || '';
        let interactionDetail = '';
        
        // Get more specific details based on element type
        if (elementType === 'a') {
            interactionDetail = `Link click: ${target.href || 'No href'}`;
        } else if (elementType === 'button') {
            interactionDetail = `Button click: ${target.textContent || 'No text'}`;
        } else if (elementType === 'input') {
            interactionDetail = `Input interaction: ${target.type || 'Unknown type'}`;
        } else if (target.closest('.gallery-item')) {
            const galleryItem = target.closest('.gallery-item');
            interactionDetail = `Gallery item click: ${galleryItem.querySelector('img').alt || 'No alt text'}`;
        }
        
        // Send click data
        fetch('track_event.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_type: 'click',
                element_type: elementType,
                element_id: elementId,
                element_class: elementClass,
                interaction_detail: interactionDetail,
                x_position: event.clientX,
                y_position: event.clientY
            })
        }).catch(error => {
            console.error('Click tracking error:', error);
        });
    });
    
    // Track form submissions
    document.querySelectorAll('form').forEach(form => {
        form.addEventListener('submit', function(event) {
            const formId = form.id || 'unknown-form';
            const formAction = form.action || 'no-action';
            
            fetch('track_event.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    event_type: 'form_submit',
                    element_type: 'form',
                    element_id: formId,
                    interaction_detail: `Form submission: ${formAction}`
                })
            }).catch(error => {
                console.error('Form tracking error:', error);
            });
        });
    });
    
    // Track video interactions
    document.addEventListener('click', function(event) {
        if (event.target.closest('.play-icon') || 
            (event.target.closest('.gallery-item') && 
             event.target.closest('.gallery-item').getAttribute('onclick').includes('video'))) {
            
            const galleryItem = event.target.closest('.gallery-item');
            const videoSrc = galleryItem.getAttribute('onclick').match(/openLightbox\('video', '(.+?)'\)/)[1];
            
            fetch('track_event.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    event_type: 'video_play',
                    element_type: 'video',
                    interaction_detail: `Video play: ${videoSrc}`
                })
            }).catch(error => {
                console.error('Video tracking error:', error);
            });
        }
    });
}

// Track scroll depth
function trackScrollDepth() {
    let maxScrollDepth = 0;
    let lastReportedDepth = 0;
    const reportingThreshold = 10; // Report every 10% change
    
    window.addEventListener('scroll', function() {
        // Calculate scroll depth as percentage
        const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollPercentage = Math.round((scrollTop / scrollHeight) * 100);
        
        // Update max scroll depth
        if (scrollPercentage > maxScrollDepth) {
            maxScrollDepth = scrollPercentage;
            
            // Report if we've crossed a threshold
            if (Math.floor(maxScrollDepth / reportingThreshold) > Math.floor(lastReportedDepth / reportingThreshold)) {
                lastReportedDepth = maxScrollDepth;
                
                fetch('track_event.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        event_type: 'scroll_depth',
                        interaction_detail: `Scroll depth: ${maxScrollDepth}%`
                    })
                }).catch(error => {
                    console.error('Scroll tracking error:', error);
                });
            }
        }
    }, { passive: true });
    
    // Report final scroll depth on page unload
    window.addEventListener('beforeunload', function() {
        if (navigator.sendBeacon) {
            const data = new Blob([JSON.stringify({
                event_type: 'scroll_depth',
                interaction_detail: `Final scroll depth: ${maxScrollDepth}%`,
                is_exit: true
            })], { type: 'application/json' });
            
            navigator.sendBeacon('track_event.php', data);
        }
    });
}
