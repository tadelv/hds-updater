/**
 * Main Application Module
 * Handles UI interactions and coordinates between modules
 */

const App = {
    // Application state
    state: {
        firmwareFiles: null,
        connected: false,
        flashing: false
    },

    // Initialize application
    init() {
        this.cacheElements();
        this.attachEventListeners();
        this.updateUI();
    },

    // Cache DOM elements
    cacheElements() {
        this.elements = {
            // Upload element
            zipUpload: document.getElementById('zip-upload'),

            // Device connection
            connectBtn: document.getElementById('connect-btn'),
            disconnectBtn: document.getElementById('disconnect-btn'),
            deviceInfo: document.getElementById('device-info'),
            chipType: document.getElementById('chip-type'),
            macAddress: document.getElementById('mac-address'),
            flashSize: document.getElementById('flash-size'),

            // Flash controls
            flashBtn: document.getElementById('flash-btn'),
            progressContainer: document.getElementById('progress-container'),
            progressFill: document.getElementById('progress-fill'),
            console: document.getElementById('console')
        };
    },

    // Attach event listeners
    attachEventListeners() {
        // Upload
        this.elements.zipUpload.addEventListener('change', (e) => this.onZipUpload(e));

        // Device connection
        this.elements.connectBtn.addEventListener('click', () => this.onConnect());
        this.elements.disconnectBtn.addEventListener('click', () => this.onDisconnect());

        // Flash
        this.elements.flashBtn.addEventListener('click', () => this.onFlash());
    },

    // Update UI based on state
    updateUI() {
        // Update connection buttons
        this.elements.connectBtn.disabled = this.state.connected;
        this.elements.disconnectBtn.disabled = !this.state.connected;

        // Update flash button
        this.elements.flashBtn.disabled = !this.state.connected ||
                                           !this.state.firmwareFiles ||
                                           this.state.flashing;
    },

    // Handle zip upload
    async onZipUpload(e) {
        const file = e.target.files[0];
        if (!file) {
            this.state.firmwareFiles = null;
            this.updateUI();
            return;
        }

        try {
            this.log('Extracting firmware files...', 'info');

            const files = await FileHandler.extractZipFile(file);
            const validation = FileHandler.validateFirmwareFiles(files);

            if (!validation.isValid) {
                throw new Error(validation.message);
            }

            this.state.firmwareFiles = files;
            this.log(validation.message, 'success');
            this.updateUI();
        } catch (error) {
            this.log(error.message, 'error');
            this.state.firmwareFiles = null;
            this.updateUI();
        }
    },

    // Handle device connection
    async onConnect() {
        try {
            this.log('Connecting to device...', 'info');
            this.clearConsole();
            this.showConsole();

            const deviceInfo = await Flasher.connectDevice();

            this.state.connected = true;

            // Update device info display
            this.elements.chipType.textContent = deviceInfo.type;
            this.elements.macAddress.textContent = deviceInfo.macAddress;
            this.elements.flashSize.textContent = 'Auto-detect';
            this.elements.deviceInfo.classList.remove('hidden');

            this.log(`Connected to ${deviceInfo.type}`, 'success');
            this.log(`MAC Address: ${deviceInfo.macAddress}`, 'info');

            this.updateUI();
        } catch (error) {
            this.log(error.message, 'error');
            this.state.connected = false;
            this.updateUI();
        }
    },

    // Handle device disconnection
    async onDisconnect() {
        try {
            this.log('Disconnecting...', 'info');
            await Flasher.disconnectDevice();

            this.state.connected = false;
            this.elements.deviceInfo.classList.add('hidden');

            this.log('Disconnected', 'success');
            this.updateUI();
        } catch (error) {
            this.log(error.message, 'error');
        }
    },

    // Handle flash operation
    async onFlash() {
        if (!this.state.firmwareFiles) {
            this.log('No firmware files loaded', 'error');
            return;
        }

        if (!this.state.connected) {
            this.log('Device not connected', 'error');
            return;
        }

        try {
            this.state.flashing = true;
            this.updateUI();
            this.clearConsole();
            this.showConsole();
            this.showProgress();

            this.log('Preparing firmware files...', 'info');

            // Prepare files for flashing
            const preparedFiles = FileHandler.prepareFirmwareFiles(this.state.firmwareFiles);

            this.log(`Prepared ${preparedFiles.length} file(s) for flashing`, 'info');

            // Flash firmware
            await Flasher.flashFirmware(
                preparedFiles,
                (progress, info) => this.updateProgress(progress, info),
                (message, type) => this.log(message, type)
            );

            this.log('Flashing completed successfully!', 'success');
        } catch (error) {
            this.log(`Flashing failed: ${error.message}`, 'error');
        } finally {
            this.state.flashing = false;
            this.updateUI();
        }
    },

    // Update progress bar
    updateProgress(percent, info) {
        const progress = Math.min(100, Math.max(0, percent));
        this.elements.progressFill.style.width = `${progress}%`;
        this.elements.progressFill.textContent = `${progress.toFixed(0)}%`;

        if (info && info.currentFileName) {
            this.elements.progressFill.textContent =
                `${info.currentFile}/${info.totalFiles}: ${info.currentFileName} (${progress.toFixed(0)}%)`;
        }
    },

    // Show progress bar
    showProgress() {
        this.elements.progressContainer.classList.remove('hidden');
        this.updateProgress(0);
    },

    // Show console
    showConsole() {
        this.elements.console.classList.remove('hidden');
    },

    // Clear console
    clearConsole() {
        this.elements.console.innerHTML = '';
    },

    // Log message to console
    log(message, type = 'info') {
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
        this.elements.console.appendChild(line);
        this.elements.console.scrollTop = this.elements.console.scrollHeight;
    }
};

// Initialize app when DOM is loaded AND esptool is ready
const initApp = () => {
    if (window.esptooljs) {
        console.log('Initializing app with esptool-js ready');
        App.init();
    } else {
        console.log('Waiting for esptool-js to load...');
        setTimeout(initApp, 100);
    }
};

document.addEventListener('DOMContentLoaded', initApp);
