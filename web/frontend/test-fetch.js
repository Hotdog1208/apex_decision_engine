async function checkVite() {
    try {
        const res = await fetch('http://localhost:3000');
        const text = await res.text();
        // Vite injects errors directly into the HTML in dev mode or in the script payload
        if (text.includes('Error:')) {
            const parts = text.split('Error:');
            console.log('FOUND ERROR:', parts[1].substring(0, 500));
        } else {
            console.log('No visible raw error in HTML. Start length:', text.length);
        }
    } catch (e) {
        console.error('Fetch failed:', e);
    }
}
checkVite();
