let imageData = {};
const photosFolder = 'grid_photos/';

document.addEventListener('DOMContentLoaded', function() {
    const gridContainer = document.getElementById('photo-grid');

    function loadImageNames() {
        return fetch(photosFolder)
            .then(response => response.text())
            .then(data => {
                const parser = new DOMParser();
                const htmlDoc = parser.parseFromString(data, 'text/html');
                const links = htmlDoc.getElementsByTagName('a');
                return Array.from(links)
                    .map(link => link.href)
                    .filter(href => href.match(/\.(jpg|jpeg|png|gif)$/i))
                    .map(href => href.split('/').pop());
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

    function createGridItem(imageName) {
        const gridItem = document.createElement('div');
        gridItem.className = 'grid-item';

        const img = document.createElement('img');
        img.src = photosFolder + imageName;
        img.alt = imageName.split('.')[0].replace(/_/g, ' ');

        const infoBar = document.createElement('div');
        infoBar.className = 'info-bar';

        gridItem.appendChild(img);
        gridItem.appendChild(infoBar);

        gridItem.addEventListener('click', function() {
            navigateToTimeline(imageName);
        });

        gridItem.addEventListener('mouseenter', function() {
            updateInfoBar(infoBar, imageName);
        });

        return gridItem;
    }

    function updateInfoBar(infoBar, imageName) {
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
        } else if (imageName === "4_madagascar_hissing_cockroaches_20_jumping_bean_moths.jpg") {
            data = {
                name: "4 Madagascar hissing cockroaches, 20 jumping bean moths",
                event: "Genesis I",
                year: "2006"
            };
        } else {
            const photoName = imageName.split('.')[0].replace(/[_,]/g, ' ').toLowerCase();
            data = Object.values(imageData).find(v => 
                photoName === v.name.toLowerCase()
            ) || { name: 'Unknown', event: 'Unknown', year: 'Unknown' };
        }

        infoBar.innerHTML = `
            <div class="victim-name gallery-victim-name">${data.name}</div>
            <div class="event-info">${data.event} (${data.year})</div>
        `;
    }

    function navigateToTimeline(imageName) {
        let victim;

        if (imageName === "Felicette.jpg") {
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
        } else if (imageName === "4_madagascar_hissing_cockroaches_20_jumping_bean_moths.jpg") {
            victim = {
                name: "4 Madagascar hissing cockroaches, 20 jumping bean moths",
                event: "Genesis I",
                date: "12 July 2006"
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

    function layoutGridItems() {
        const grid = document.querySelector('.grid-container');
        const colWidth = 200;
        const gutter = 20;
        const topMargin = gutter;
    
        grid.style.marginTop = `${topMargin}px`;
    
        let columns = Math.floor(grid.clientWidth / (colWidth + gutter));
        columns = columns || 1;
    
        const columnHeights = Array(columns).fill(0);
        const gridItems = grid.children;
    
        const gridWidth = columns * (colWidth + gutter) - gutter;
        const leftOffset = (grid.clientWidth - gridWidth) / 2;
    
        for (let i = 0; i < gridItems.length; i++) {
            const item = gridItems[i];
            const shortestColumn = columnHeights.indexOf(Math.min(...columnHeights));
            
            item.style.position = 'absolute';
            item.style.width = `${colWidth}px`;
            item.style.left = `${leftOffset + shortestColumn * (colWidth + gutter)}px`;
            item.style.top = `${columnHeights[shortestColumn]}px`;
    
            columnHeights[shortestColumn] += item.offsetHeight + gutter;
        }
    
        grid.style.height = `${Math.max(...columnHeights)}px`;
    }

    Promise.all([loadCSVData(), loadImageNames()])
        .then(([csvData, imageNames]) => {
            imageData = csvData;
            imageNames.forEach(imageName => {
                const gridItem = createGridItem(imageName);
                gridContainer.appendChild(gridItem);
            });
            
            // Wait for images to load before laying out the grid
            const images = gridContainer.querySelectorAll('img');
            let loadedImages = 0;
            images.forEach(img => {
                img.onload = () => {
                    loadedImages++;
                    if (loadedImages === images.length) {
                        layoutGridItems();
                        window.addEventListener('resize', layoutGridItems);
                    }
                };
                if (img.complete) img.onload();
            });
        })
        .catch(error => console.error('Error loading data:', error));
});

// Wait for the page to load, then fade in the grid
window.addEventListener('load', function() {
    setTimeout(function() {
        const grid = document.getElementById('photo-grid');
        grid.style.opacity = '1';
    }, 200);  // 1000 milliseconds = 1 second
});