// contact.js - Handles WhatsApp chat and social media interactions

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Get WhatsApp elements
    const whatsappButton = document.getElementById('whatsapp-button');
    const whatsappChatbox = document.getElementById('whatsapp-chatbox');
    const closeWhatsappChat = document.getElementById('close-whatsapp-chat');
    const openWhatsappChat = document.getElementById('open-whatsapp-chat');
    
    // Function to toggle chatbox visibility
    function toggleChatBox() {
        if (whatsappChatbox.style.display === 'none' || whatsappChatbox.style.display === '') {
            whatsappChatbox.style.display = 'flex';
            // Add slide-in animation class if you want
            whatsappChatbox.classList.add('slide-in');
        } else {
            whatsappChatbox.style.display = 'none';
            whatsappChatbox.classList.remove('slide-in');
        }
    }
    
    // Event listeners for WhatsApp chat
    if (whatsappButton) {
        whatsappButton.addEventListener('click', toggleChatBox);
    }
    
    if (closeWhatsappChat) {
        closeWhatsappChat.addEventListener('click', () => {
            whatsappChatbox.style.display = 'none';
        });
    }
    
    if (openWhatsappChat) {
        openWhatsappChat.addEventListener('click', () => {
            whatsappChatbox.style.display = 'flex';
        });
    }
    
    // Make WhatsApp button visible after a delay (optional)
    setTimeout(() => {
        if (whatsappButton) {
            whatsappButton.style.opacity = '1';
        }
    }, 2000);
    
    // Track WhatsApp clicks with analytics (if you have Firebase Analytics set up)
    const trackWhatsAppClick = () => {
        if (window.firebaseAnalytics) {
            window.firebaseAnalytics.logEvent('whatsapp_contact_click');
        }
    };
    
    // Add tracking to WhatsApp links
    document.querySelectorAll('a[href*="wa.me"]').forEach(link => {
        link.addEventListener('click', trackWhatsAppClick);
    });
    
    // ===== FACEBOOK INTEGRATION =====
    
    // Track Facebook page visits
    const trackFacebookClick = () => {
        // If Firebase Analytics is available
        if (window.firebaseAnalytics) {
            window.firebaseAnalytics.logEvent('social_click', {
                platform: 'facebook'
            });
        }
        
        // If Google Analytics is available
        if (window.gtag) {
            gtag('event', 'click', {
                'event_category': 'social_media',
                'event_label': 'facebook_page'
            });
        }
    };
    
    // Add tracking to all Facebook links
    document.querySelectorAll('a[href*="facebook.nextstepedu"]').forEach(link => {
        link.addEventListener('click', trackFacebookClick);
    });
    
    // Handle floating social icon animations
    const socialFloatIcons = document.querySelectorAll('.social-float-icon');
    if (socialFloatIcons.length > 0) {
        // Add hover effects or animations if needed
        socialFloatIcons.forEach(icon => {
            // Add any additional event listeners or animations
            icon.addEventListener('mouseenter', () => {
                icon.style.transform = 'scale(1.1)';
            });
            
            icon.addEventListener('mouseleave', () => {
                icon.style.transform = 'scale(1)';
            });
        });
        
        // Make social icons visible after a delay
        setTimeout(() => {
            document.querySelector('.social-float').style.opacity = '1';
        }, 2500); // Slightly after WhatsApp button appears
    }
});
