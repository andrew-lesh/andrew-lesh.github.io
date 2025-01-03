const EVENT_INFO_LEFT_MARGIN = 60; // Adjust this value as needed

const state = {
    clickedVictim: null,
    setClickedVictim(name) {
        this.clickedVictim = name;
        this.updateUI();
    },
    updateUI() {
        document.querySelectorAll('.victim-name').forEach(el => {
            el.classList.toggle('clicked', el.getAttribute('data-name') === this.clickedVictim);
        });
    }
};

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const victim = urlParams.get('victim');
    const event = urlParams.get('event');
    const showVictimDetails = urlParams.get('showVictimDetails');
    
    d3.csv('data.csv').then(data => {
        console.log('Data loaded:', data);
        createTimeline(data);
        
        if (victim && event) {
            setTimeout(() => {
                scrollToStarAndShowDetails(victim, event, showVictimDetails === 'true');
            }, 1000);
        }
    }).catch(error => {
        console.error('Error loading CSV data:', error);
    });
});

function createTimeline(data) {
    const width = 2500;
    const height = 600;
    const eventInfoboxWidth = parseInt(getComputedStyle(document.getElementById('details')).width, 10);
    const margin = { top: 20, right: eventInfoboxWidth, bottom: 70, left: 60 };

    const svg = d3.select('#timeline')
        .append('svg')
        .attr('width', width + margin.right)
        .attr('height', height);

    const fixedYAxisSvg = d3.select('#fixed-y-axis')
        .append('svg')
        .attr('width', margin.left)
        .attr('height', height);
    
    const yAxisGroup = fixedYAxisSvg.append('g')
        .attr('class', 'y-axis-group')
        .attr('transform', `translate(${margin.left}, 0)`);

    // Ensure the fixed y-axis is a child of the timeline container
    //document.getElementById('timeline-container').appendChild(document.getElementById('fixed-y-axis'));

    const parseDate = d3.timeParse('%d %B %Y');
    
    const groupedData = d3.group(data, d => d.Date + '|' + d.Event);
    
    const processedData = Array.from(groupedData, ([key, value]) => {
        const firstEntry = value[0];
        const kinds = new Set(value.map(d => d.Kind.toLowerCase()));
        return {
            Date: parseDate(firstEntry.Date),
            Event: firstEntry.Event,
            Country: firstEntry.Country,
            VictimNames: value.map(d => d.VictimName),
            Type: value.some(d => d.Type.toLowerCase() === 'human') ? 'human' : 'non-human',
            EventDescription: firstEntry.EventDescription,
            Victims: value.map(d => ({
                name: d.VictimName,
                description: d.PersonDescription.replace(/\\n/g, '\n'),
                type: d.Type
            })),
            EventCount: parseFloat(firstEntry.EventCount) || 1,
            kind: kinds.size > 1 ? 'multiple' : Array.from(kinds)[0]
        };
    });

    const mostRecentDate = d3.max(processedData, d => d.Date);
    const oldestDate = d3.min(processedData, d => d.Date);

    
    // Insert the new code here
    const currentYear = new Date().getFullYear();

    const x = d3.scaleTime()
        .domain([d3.timeYear.floor(oldestDate), new Date(currentYear, 11, 31)])
        .range([margin.left, width]);

    const y = d3.scaleTime()
        .domain([new Date(0, 11, 31), new Date(0, 0, 1)])
        .range([margin.top, height - margin.bottom]);

    const tickValues = d3.timeYear.range(
        d3.timeYear.floor(oldestDate),
        new Date(currentYear + 1, 0, 1)
    );

    const xAxis = d3.axisBottom(x)
        .tickValues(tickValues)
        .tickFormat(d => d.getFullYear() % 5 === 0 ? d3.timeFormat('%Y')(d) : '')
        .tickSize(10);

    const xAxisGroup = svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(xAxis);

    xAxisGroup.selectAll('text')
        .style('text-anchor', 'middle')
        .attr('dy', '1em')
        .style('font-size', '14px')
        .style('font-weight', function(d) {
            return d.getFullYear() % 10 === 0 ? 'bold' : 'normal';
        });

    xAxisGroup.selectAll('.tick line')
        .style('opacity', d => d.getFullYear() % 5 === 0 ? 1 : 0.5);
    // End of new code


    const yAxis = d3.axisLeft(y)
        .tickFormat(d3.timeFormat('%b'))
        .tickSize(10);

    yAxisGroup.call(yAxis);

    yAxisGroup.selectAll('text')
        .style('text-anchor', 'end')
        .attr('dx', '-0.8em')
        .attr('dy', '0.15em')
        .style('font-size', '14px')
        .style('fill', '#fff');

    yAxisGroup.selectAll('line')
        .style('stroke', '#fff')
        .style('stroke-width', 1);

    yAxisGroup.select('path')
        .style('stroke', '#fff')
        .style('stroke-width', 1);


    

    const starSize = 20;

    const starPath = (size) => {
        const innerRadius = size / 2;
        const outerRadius = size;
        let path = '';
        for (let i = 0; i < 10; i++) {
            const angle = Math.PI * i / 5;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = radius * Math.sin(angle);
            const y = -radius * Math.cos(angle);
            path += (i === 0 ? 'M' : 'L') + x + ',' + y;
        }
        return path + 'Z';
    };

    
    // Define both color palettes
    const defaultColorMap = {
        monkey: d3.rgb(255, 0, 0),
        mouse: d3.rgb(0, 255, 0),
        dog: d3.rgb(0, 0, 255),
        mammal: d3.rgb(255, 255, 0),
        bug: d3.rgb(255, 165, 0),
        other: d3.rgb(0, 255, 255),
        multiple: d3.rgb(128, 0, 128)
    };

    const colorBlindFriendlyMap = {
        monkey: d3.rgb(230, 159, 0),    // Orange
        mouse: d3.rgb(86, 180, 233),    // Sky Blue
        dog: d3.rgb(0, 158, 115),       // Bluish Green
        mammal: d3.rgb(213, 94, 0),     // Vermillion
        bug: d3.rgb(240, 228, 66),      // Yellow
        other: d3.rgb(0, 114, 178),   // Reddish Purple
        multiple: d3.rgb(204, 121, 167)  // Blue
    };

    let currentColorMap = defaultColorMap;

    const getColor = (kind) => currentColorMap[kind.toLowerCase()] || currentColorMap.other;

    // Function to update colors
    function updateColors() {
        // Update star colors on the timeline
        d3.selectAll('.star')
            .transition()
            .duration(500)
            .attr('fill', d => getColor(d.kind));
    }

    // Function to toggle between default and color-blind friendly modes
    function toggleColorMode() {
        const defaultLegend = document.getElementById('default-legend');
        const colorblindLegend = document.getElementById('colorblind-legend');

        if (currentColorMap === defaultColorMap) {
            currentColorMap = colorBlindFriendlyMap;
            defaultLegend.style.display = 'none';
            colorblindLegend.style.display = 'block';
        } else {
            currentColorMap = defaultColorMap;
            defaultLegend.style.display = 'block';
            colorblindLegend.style.display = 'none';
        }

        updateColors();
    }

    // Add event listener to the toggle button
    document.getElementById('colorToggle').addEventListener('click', toggleColorMode);

    // Call updateColors initially to set the default colors
    updateColors();

    // Add a black rectangle behind the January label
    const januaryTick = yAxisGroup.selectAll('.tick')
        .filter(d => d.getMonth() === 0);

    januaryTick.insert('rect', 'text')
        .attr('class', 'january-highlight')
        .attr('x', -48)
        .attr('y', -9)
        .attr('width', 25)
        .attr('height', 18)
        .attr('fill', 'black');



    const stars = svg.selectAll('.star')
    .data(processedData)
    .enter()
    .append('path')
    .attr('class', 'star')
    .attr('d', starPath(starSize))
    .attr('transform', d => {
        const xPosition = x(d3.timeYear.floor(d.Date));
        const yPosition = y(new Date(0, d.Date.getMonth(), d.Date.getDate()));
        return `translate(${xPosition}, ${yPosition})`;
    })
    .attr('fill', d => getColor(d.kind))
    .on('click', function(event, d) {
        d3.selectAll('.star').classed('active', false);
        d3.select(this).classed('active', true);
        showEventDetails(d, this);
    })
    .on('mouseover', function() {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('transform', function() {
                const currentTransform = d3.select(this).attr('transform');
                const translate = currentTransform.substring(currentTransform.indexOf('(') + 1, currentTransform.indexOf(')'));
                return `translate(${translate}) scale(1.2)`;
            });
    })
    .on('mouseout', function() {
        d3.select(this)
            .transition()
            .duration(200)
            .attr('transform', function() {
                const currentTransform = d3.select(this).attr('transform');
                const translate = currentTransform.substring(currentTransform.indexOf('(') + 1, currentTransform.indexOf(')'));
                return `translate(${translate}) scale(1)`;
            });
    });

    d3.select('#timeline')
        .style('width', `${width + margin.right}px`);

    const timelineContainer = document.getElementById('timeline-container');
    timelineContainer.addEventListener('scroll', function() {
        requestAnimationFrame(updateEventDetailsPosition);
    });

    window.addEventListener('resize', function() {
        updateEventDetailsPosition();
        updateYAxisPosition();
    });

    function updateYAxisPosition() {
        const victimDetails = document.getElementById('victim-details');
        const fixedYAxis = document.getElementById('fixed-y-axis');
    
        if (victimDetails.style.display !== 'none') {
            fixedYAxis.classList.add('shifted');
        } else {
            fixedYAxis.classList.remove('shifted');
        }
    }
    updateYAxisPosition();
}

function fadeOutEventDetails(callback) {
    const details = document.getElementById('details');
    if (details.classList.contains('visible')) {
        details.classList.remove('visible');
        details.style.opacity = '0';
        setTimeout(() => {
            details.style.display = 'none';
            if (callback) callback();
        }, 300); // This should match the transition duration in CSS
    } else {
        if (callback) callback();
    }
}

function showEventDetails(d, starElement) {
    const details = document.getElementById('details');
    
    // Fade out existing details if visible
    fadeOutEventDetails(() => {
        const formatDate = d3.timeFormat('%d %B %Y');
        details.innerHTML = `
            <div id="details-content">
                <div class="close-button">×</div>
                <h3>${d.Event}</h3>
                <p>Date: ${formatDate(d.Date)}</p>
                <p>Country: ${d.Country}</p>
                <div class="event-description">${d.EventDescription}</div>
                <p>${d.EventCount > 1 ? 'Lives Lost' : 'Life Lost'}: ${d.VictimNames.map(name => {
                    const victim = d.Victims.find(v => v.name === name);
                    return `<span class="victim-name ${victim.description ? 'has-description' : ''}" 
                          data-description="${victim.description || ''}" 
                          data-name="${name}" 
                          data-type="${victim.type}">${name}</span>`;
                }).join(', ')}
                </p>
            </div>
        `;
        details.style.display = 'block';
        details.style.opacity = '0';
        details.offsetHeight; // Force a reflow
        details.classList.add('visible');
        details.style.opacity = '1';
        details.associatedStar = starElement;

        updateEventDetailsPosition();
        state.updateUI();

        details.querySelector('.close-button').addEventListener('click', hideEventDetails);

        details.querySelectorAll('.victim-name.has-description').forEach(element => {
            element.addEventListener('click', function(e) {
                e.preventDefault();
                const clickedName = this.getAttribute('data-name');
                
                if (state.clickedVictim === clickedName) {
                    state.setClickedVictim(null);
                } else {
                    state.setClickedVictim(clickedName);
                }

                showVictimDetails(this.getAttribute('data-name'), this.getAttribute('data-description'), this.getAttribute('data-type'));
            });
        });
    });
}

function hideEventDetails() {
    fadeOutEventDetails(() => {
        d3.selectAll('.star').classed('active', false);
    });
}


function fadeOutVictimDetails(callback) {
    const victimDetails = document.getElementById('victim-details');
    if (victimDetails.classList.contains('visible')) {
        victimDetails.classList.remove('visible');
        victimDetails.style.opacity = '0';
        setTimeout(() => {
            victimDetails.style.display = 'none';
            if (callback) callback();
        }, 300); // This should match the transition duration in CSS
    } else {
        if (callback) callback();
    }
}

function showVictimDetails(name, description, type) {
    fadeOutVictimDetails(() => {
        const victimDetails = document.getElementById('victim-details');
        const photoName = name.toLowerCase().replace(/\s+/g, '_');
        
        const formattedDescription = description.replace(/\|\|/g, '<br><br>');
        
        victimDetails.innerHTML = `
            <span class="victim-close-button">&times;</span>
            <div class="victim-content">
                <div class="victim-photo-name">
                    <img src="photos/${photoName}.jpg" alt="${name}" style="max-width: 100%; height: auto;">
                    <h3>${name}</h3>
                </div>
                <div class="victim-description">
                    ${formattedDescription}
                </div>
            </div>
        `;
        
        victimDetails.style.display = 'flex';
        victimDetails.style.opacity = '0';  // Ensure it starts invisible
        victimDetails.offsetHeight; // Force a reflow
        
        // Fade in the new infobox
        setTimeout(() => {
            victimDetails.style.opacity = '1';
            victimDetails.classList.add('visible');
            updateYAxisPosition(); // Update y-axis position after fade-in

            // Scroll to the bottom of the page after fade-in starts
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });

            // If the immediate scroll doesn't work, try again after the fade-in should be complete
            setTimeout(() => {
                window.scrollTo({
                    top: document.body.scrollHeight,
                    behavior: 'smooth'
                });
            }, 300); // Adjust this value based on your fade-in duration
        }, 10);

        const closeButton = victimDetails.querySelector('.victim-close-button');
        closeButton.addEventListener('click', hideVictimDetails);
    });
}


function hideVictimDetails() {
    fadeOutVictimDetails(() => {
        state.setClickedVictim(null);
        updateYAxisPosition();
    });
}

function updateYAxisPosition() {
    const victimDetails = document.getElementById('victim-details');
    const fixedYAxis = document.getElementById('fixed-y-axis');
    if (victimDetails.classList.contains('visible')) {
        fixedYAxis.classList.add('shifted');
    } else {
        fixedYAxis.classList.remove('shifted');
    }
}

function adjustDetailsHeight() {
    const details = document.getElementById('details');
    const detailsContent = document.getElementById('details-content');
    const viewportHeight = window.innerHeight;
    const detailsRect = details.getBoundingClientRect();
    const maxHeight = Math.min(400, viewportHeight - detailsRect.top - 20); // 20px buffer, max 400px

    details.style.maxHeight = `${maxHeight}px`;
    detailsContent.style.maxHeight = `${maxHeight - 40}px`; // Account for padding and close button
}

function updateEventDetailsPosition() {
    const details = document.getElementById('details');
    if (details.style.display !== 'none' && details.associatedStar) {
        const starRect = details.associatedStar.getBoundingClientRect();
        const timelineContainer = document.getElementById('timeline-container');
        const timelineContainerRect = timelineContainer.getBoundingClientRect();

        let left = starRect.left - timelineContainerRect.left;
        let top = starRect.top - timelineContainerRect.top + starRect.height / 2 - details.offsetHeight / 2;

        left += timelineContainer.scrollLeft;
        //left += starRect.width / 2;
        left += starRect.width

        // Ensure the info box doesn't get too close to the left edge
        const minLeft = timelineContainer.scrollLeft + EVENT_INFO_LEFT_MARGIN;
        left = Math.max(minLeft, left);

        // Ensure the info box doesn't go beyond the right edge
        const maxLeft = timelineContainer.scrollLeft + timelineContainerRect.width - details.offsetWidth - EVENT_INFO_LEFT_MARGIN;
        left = Math.min(maxLeft, left);

        // Ensure the info box doesn't go beyond the top or bottom edges
        top = Math.max(EVENT_INFO_LEFT_MARGIN, Math.min(top, timelineContainerRect.height - details.offsetHeight - EVENT_INFO_LEFT_MARGIN));

        details.style.left = `${left}px`;
        details.style.top = `${top}px`;

        adjustDetailsHeight();
    }
}

function scrollToStarAndShowDetails(victimName, eventName, showVictimDetails) {
    const stars = d3.selectAll('.star');
    stars.each(function(d) {
        if (d.VictimNames.includes(victimName) && d.Event === eventName) {
            const star = d3.select(this);
            const starNode = star.node();
            const timelineContainer = document.getElementById('timeline-container');
            
            // Scroll to the star
            const starRect = starNode.getBoundingClientRect();
            const containerRect = timelineContainer.getBoundingClientRect();
            timelineContainer.scrollLeft = starRect.left - containerRect.left + timelineContainer.scrollLeft - containerRect.width / 2;
            
            // Show event details
            showEventDetails(d, starNode);
            
            // Highlight the star
            d3.selectAll('.star').classed('active', false);
            star.classed('active', true);

            if (showVictimDetails) {
                // Find and click the victim name in the event infobox
                setTimeout(() => {
                    const victimElement = document.querySelector(`.victim-name[data-name="${victimName}"]`);
                    if (victimElement && victimElement.classList.contains('has-description')) {
                        victimElement.click();
                        showVictimDetails(victimName, victimElement.getAttribute('data-description'), victimElement.getAttribute('data-type'));
                    }
                }, 100); // Small delay to ensure the event infobox has been created
            }
        }
    });
}

window.addEventListener('resize', function() {
    updateEventDetailsPosition();
    updateYAxisPosition();
});

// Call when the page loads and after a short delay
window.addEventListener('load', function() {
    updateYAxisPosition();
    setTimeout(updateYAxisPosition, 100);
});
victimDetails.style.display = 'block';
    updateYAxisPosition();