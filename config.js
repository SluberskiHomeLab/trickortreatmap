// Local development configuration fallback
// This file will be overwritten by GitHub Actions during deployment

window.RUNTIME_CONFIG = {
    firebase: {
        apiKey: "",
        authDomain: "",
        databaseURL: "",
        projectId: "",
        storageBucket: "",
        messagingSenderId: "",
        appId: ""
    },
    googleMapsApiKey: "",
    isConfigured: false
};

console.log('📋 Using local development configuration (no secrets)');