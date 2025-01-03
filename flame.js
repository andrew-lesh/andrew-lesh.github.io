document.addEventListener('DOMContentLoaded', function() {
    const flameContainer = document.getElementById('flame-container');
    const header = document.querySelector('header');
    let victimNames = [];
    let activeNames = new Set();
    const UNKNOWN_NAME = "Unknown";
    let unknownFlame = null;
    let activeFlameTexts = [];

    fetch('names.csv')
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n');
            victimNames = rows.slice(1)
                .map(row => row.trim())
                .filter(name => name !== "" && name !== UNKNOWN_NAME);

            animateFlame();
        })
        .catch(error => console.error('Error loading CSV:', error));

    function animateFlame() {
        createUnknownFlame();
        
        setInterval(() => {
            if (victimNames.length > activeNames.size) {
                let name;
                do {
                    name = victimNames[Math.floor(Math.random() * victimNames.length)];
                } while (activeNames.has(name));

                if (!activeNames.has(name)) {
                    createFlameText(name);
                }
            }
        }, 200);
    }

    function createUnknownFlame() {
        if (unknownFlame) return;
        unknownFlame = createFlameText(UNKNOWN_NAME, true);
    }

    function createFlameText(text, isUnknown = false) {
        activeNames.add(text);
        
        const flameText = document.createElement('div');
        flameText.className = 'flame-text';
        flameText.textContent = text;

        const size = Math.random() * 20 + 15;
        flameText.style.fontSize = `${size}px`;

        // Temporarily append the element to measure its actual width
        flameText.style.position = 'absolute';
        flameText.style.visibility = 'hidden';
        flameContainer.appendChild(flameText);
        const textWidth = flameText.offsetWidth;
        const textHeight = flameText.offsetHeight;
        flameContainer.removeChild(flameText);

        const containerWidth = flameContainer.offsetWidth;
        
        // Find a non-overlapping position
        let left = findNonOverlappingPosition(textWidth, textHeight);
        if (left === null) {
            // If no non-overlapping position is found, don't create the flame text
            activeNames.delete(text);
            return null;
        }

        flameText.style.left = `${left}px`;
        flameText.style.bottom = '0px';
        flameText.style.visibility = 'visible';
        flameText.style.position = 'absolute';

        flameContainer.appendChild(flameText);

        let progress = 0;
        const duration = 5000;
        const startTime = Date.now();

        function animate() {
            const elapsed = Date.now() - startTime;
            progress = Math.min(elapsed / duration, 1);

            const containerHeight = flameContainer.offsetHeight;
            const headerBottom = header.offsetHeight;
            const visibleHeight = containerHeight - headerBottom;
            const yPosition = progress * containerHeight;
            const xOffset = Math.sin(progress * Math.PI * 2) * 30;

            // Adjust position to prevent cutoff on both sides
            let newLeft = Math.max(0, Math.min(containerWidth - textWidth, left + xOffset));

            flameText.style.bottom = `${yPosition}px`;
            flameText.style.left = `${newLeft}px`;
            flameText.style.color = getFlameColor(progress);
            flameText.style.opacity = getOpacity(yPosition, visibleHeight);

            // Update position in activeFlameTexts
            const index = activeFlameTexts.findIndex(item => item.element === flameText);
            if (index !== -1) {
                activeFlameTexts[index].left = newLeft;
                activeFlameTexts[index].bottom = yPosition;
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                flameText.remove();
                activeNames.delete(text);
                // Remove from activeFlameTexts
                const index = activeFlameTexts.findIndex(item => item.element === flameText);
                if (index !== -1) {
                    activeFlameTexts.splice(index, 1);
                }
                if (isUnknown) {
                    unknownFlame = null;
                    createUnknownFlame();
                }
            }
        }

        // Add to activeFlameTexts
        activeFlameTexts.push({element: flameText, left: left, bottom: 0, width: textWidth, height: textHeight});

        requestAnimationFrame(animate);

        return flameText;
    }

    function findNonOverlappingPosition(width, height) {
        const containerWidth = flameContainer.offsetWidth;
        const maxLeft = containerWidth - width;
        const safetyMargin = 5;
        
        for (let attempts = 0; attempts < 50; attempts++) {
            const left = Math.random() * maxLeft;
            if (!isOverlapping(left, 0, width, height)) {
                return left;
            }
        }
        return null; // Couldn't find a non-overlapping position
    }

    function isOverlapping(left, bottom, width, height) {
        const safetyMargin = 5;
        for (let item of activeFlameTexts) {
            if (left < item.left + item.width + safetyMargin &&
                left + width + safetyMargin > item.left &&
                bottom < item.bottom + item.height + safetyMargin &&
                bottom + height + safetyMargin > item.bottom) {
                return true; // Overlap detected
            }
        }
        return false;
    }

    function getFlameColor(progress) {
        const red = 255;
        const green = Math.min(255, Math.max(0, progress * 510));
        const blue = Math.min(128, Math.max(0, progress * 255));
        return `rgb(${red}, ${green}, ${blue})`;
    }

    function getOpacity(yPosition, visibleHeight) {
        const fadeDistance = visibleHeight * 0.1; // 10% of the visible height for fading in/out
        if (yPosition < fadeDistance) {
            return yPosition / fadeDistance; // Fade in
        } else if (yPosition > visibleHeight - fadeDistance) {
            return (visibleHeight - yPosition) / fadeDistance; // Fade out
        }
        return 1; // Fully opaque in the middle
    }
});

// Wait for the page to load, then fade in the text
window.addEventListener('load', function() {
    setTimeout(function() {
        const flameText = document.getElementById('flame-text');
        if (flameText) {
            flameText.style.opacity = '1';
        }
    }, 1000);  // 1000 milliseconds = 1 second
});