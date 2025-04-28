// Add this to your main.js file or create a new js/contact.js file

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
});
