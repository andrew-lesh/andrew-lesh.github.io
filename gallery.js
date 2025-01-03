document.addEventListener('DOMContentLoaded', function() {
    const gallery = document.getElementById('image-gallery');
    const galleryFolder = 'gallery_photos/';
    let currentIndex = 0;
    let images = [];
    let imageData = {};
    let slideInterval;
    const slideDuration = 5000; // 5 seconds per slide
    const autoFadeDuration = 1000; // 1 second fade duration for automatic transitions
    const manualFadeDuration = 300; // 300 milliseconds fade duration for manual transitions

    function loadImageNames() {
        return fetch(galleryFolder)
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const htmlDoc = parser.parseFromString(data, 'text/html');
                const links = htmlDoc.getElementsByTagName('a');
                let imageNames = Array.from(links)
                    .map(link => link.href)
                    .filter(href => href.match(/\.(jpg|jpeg|png|gif)$/i))
                    .map(href => href.split('/').pop());
                
                // Sort the images alphabetically
                imageNames.sort((a, b) => a.localeCompare(b));
                
                // Find the index of "laika.jpg"
                const laikaIndex = imageNames.findIndex(img => img.toLowerCase() === "laika.jpg");
                
                if (laikaIndex !== -1) {
                    // Reorder the array to start with Laika and continue alphabetically
                    imageNames = [
                        ...imageNames.slice(laikaIndex),
                        ...imageNames.slice(0, laikaIndex)
                    ];
                }
                
                return imageNames;
            });
    }

    function loadCSVData() {
        return fetch('data.csv')
            .then(response => response.text())
            .then(data => {
                const rows = data.split('\n').map(row => row.split(','));
                const headers = rows[0];
                return rows.slice(1).reduce((acc, row) => {
                    const victimName = row[headers.indexOf('VictimName')];
                    acc[victimName] = {
                        name: victimName,
                        event: row[headers.indexOf('Event')],
                        year: row[headers.indexOf('Date')].split(' ').pop()
                    };
                    return acc;
                }, {});
            });
    }

    function createImageElement(src, data) {
        const container = document.createElement('div');
        container.className = 'gallery-item';
    
        const img = document.createElement('img');
        img.src = galleryFolder + src;
        img.alt = data.name;
        img.className = 'gallery-image';
    
        const infoBar = document.createElement('div');
        infoBar.className = 'info-bar';
        infoBar.innerHTML = `
            <div class="gallery-victim-name">${data.name}</div>
            <div class="event-info">${data.event} (${data.year})</div>
        `;
    
        container.appendChild(img);
        container.appendChild(infoBar);
    
        container.addEventListener('click', function() {
            navigateToTimeline(src);
        });
    
        return container;
    }
    
    function showImage(index, isManualNavigation = false) {
        const imageName = images[index];
        let data;
    
        if (imageName === "Felicette.jpg") {
            data = {
                name: "Félicette",
                event: "Veronique AGI47",
                year: "1963"
            };
        } else if (imageName === "fe_fi_fo_fum_and_phooey.jpg") {
            data = {
                name: "Fe, Fi, Fo, Fum, and Phooey",
                event: "Apollo 17",
                year: "1972"
            };
        } else {
            const photoName = imageName.split('.')[0].replace(/[_,]/g, ' ').toLowerCase();
            data = Object.values(imageData).find(victim => 
                photoName === victim.name.toLowerCase()
            ) || { name: 'Unknown', event: 'Unknown', year: 'Unknown' };
        }
        
        const newItem = createImageElement(imageName, data);
        newItem.style.opacity = '0';
        
        const currentItem = gallery.querySelector('.gallery-item');
        const fadeDuration = isManualNavigation ? manualFadeDuration : autoFadeDuration;
        
        if (currentItem) {
            currentItem.style.opacity = '0';
            currentItem.style.transition = `opacity ${fadeDuration}ms ease-in-out`;
            setTimeout(() => {
                gallery.removeChild(currentItem);
                gallery.appendChild(newItem);
                setTimeout(() => {
                    newItem.style.opacity = '1';
                    newItem.style.transition = `opacity ${fadeDuration}ms ease-in-out`;
                    
                    // Add this part to ensure the image is resized correctly
                    const img = newItem.querySelector('img');
                    img.onload = function() {
                        const containerHeight = newItem.clientHeight;
                        const aspectRatio = this.naturalWidth / this.naturalHeight;
                        this.style.height = containerHeight + 'px';
                        this.style.width = (containerHeight * aspectRatio) + 'px';
                        this.style.maxWidth = 'none';
                    };
                    // Trigger onload if the image is already cached
                    if (img.complete) {
                        img.onload();
                    }
                }, 50);
            }, fadeDuration);
        } else {
            gallery.appendChild(newItem);
            setTimeout(() => {
                newItem.style.opacity = '1';
                newItem.style.transition = `opacity ${fadeDuration}ms ease-in-out`;
                
                // Same image resizing code as above
                const img = newItem.querySelector('img');
                img.onload = function() {
                    const containerHeight = newItem.clientHeight;
                    const aspectRatio = this.naturalWidth / this.naturalHeight;
                    this.style.height = containerHeight + 'px';
                    this.style.width = (containerHeight * aspectRatio) + 'px';
                    this.style.maxWidth = 'none';
                };
                if (img.complete) {
                    img.onload();
                }
            }, 50);
        }
    }

    function navigateToTimeline(imageName) {
        let victim;

        if (imageName.toLowerCase() === "laika.jpg") {
            victim = imageData['Laika'] || {
                name: "Laika",
                event: "Sputnik 2",
                date: "3 November 1957"
            };
        } else if (imageName === "Felicette.jpg") {
            victim = {
                name: "Félicette",
                event: "Veronique AGI47",
                date: "18 October 1963"
            };
        } else if (imageName === "fe_fi_fo_fum_and_phooey.jpg") {
            victim = {
                name: "Fe, Fi, Fo, Fum, and Phooey",
                event: "Apollo 17",
                date: "19 December 1972"
            };
        } else {
            const photoName = imageName.split('.')[0].replace(/[_,]/g, ' ').toLowerCase();
            victim = Object.values(imageData).find(v => 
                photoName === v.name.toLowerCase()
            );
        }
        
        if (victim) {
            const params = new URLSearchParams({
                victim: victim.name,
                event: victim.event,
                date: victim.date || victim.year,
                showVictimDetails: 'true'
            });
            window.location.href = `timeline.html?${params.toString()}`;
        }
    }

    function addNavigation() {
        const prevBtn = document.createElement('a');
        prevBtn.href = '#';
        prevBtn.className = 'gallery-nav prev';
        prevBtn.innerHTML = '&#10094;';
        prevBtn.addEventListener('click', function(e) {
            e.preventDefault();
            clearInterval(slideInterval);
            currentIndex = (currentIndex - 1 + images.length) % images.length;
            showImage(currentIndex, true);
            startSlideshow();
        });

        const nextBtn = document.createElement('a');
        nextBtn.href = '#';
        nextBtn.className = 'gallery-nav next';
        nextBtn.innerHTML = '&#10095;';
        nextBtn.addEventListener('click', function(e) {
            e.preventDefault();
            clearInterval(slideInterval);
            currentIndex = (currentIndex + 1) % images.length;
            showImage(currentIndex, true);
            startSlideshow();
        });

        const container = document.getElementById('gallery-container');
        container.appendChild(prevBtn);
        container.appendChild(nextBtn);
    }

    function startSlideshow() {
        clearInterval(slideInterval);
        slideInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % images.length;
            showImage(currentIndex);
        }, slideDuration);
    }

    function setupHeaderImageClick() {
        const headerImage = document.getElementById('header-image');
        if (headerImage) {
            headerImage.addEventListener('click', function() {
                navigateToTimeline('laika.jpg');
            });
            headerImage.style.cursor = 'pointer';
        }
    }

    if (gallery) {
        Promise.all([loadCSVData(), loadImageNames()])
            .then(([csvData, imageNames]) => {
                imageData = csvData;
                images = imageNames;
                if (images.length > 0) {
                    currentIndex = 0;
                    showImage(currentIndex);
                    addNavigation();
                    startSlideshow();
                }
                setupHeaderImageClick();
            })
            .catch(error => console.error('Error loading data:', error));
    } else {
        Promise.all([loadCSVData()])
            .then(([csvData]) => {
                imageData = csvData;
                setupHeaderImageClick();
            })
            .catch(error => console.error('Error loading data:', error));
    }
});