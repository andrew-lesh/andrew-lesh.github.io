document.addEventListener('DOMContentLoaded', function() {
    d3.csv('data.csv').then(data => {
        console.log('Data loaded:', data);
        createTimeline(data);
    }).catch(error => {
        console.error('Error loading CSV data:', error);
    });
});

// Variable to store the currently clicked victim across all events
let currentlyClickedVictim = null;

function createTimeline(data) {
    const width = 2500;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 50, left: 20 };

    const svg = d3.select('#timeline')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const parseDate = d3.timeParse('%d %B %Y');
    const aggregatedData = d3.rollup(data, v => {
        const allHuman = v.every(d => d.Type.toLowerCase() === 'human');
        return {
            Date: parseDate(v[0].Date),
            Event: v[0].Event,
            Country: v[0].Country,
            VictimNames: v.map(d => d.VictimName).join(', '),
            Type: allHuman ? 'human' : 'non-human',
            EventDescription: v[0].EventDescription,
            Victims: v.map(d => ({ name: d.VictimName, description: d.PersonDescription, type: d.Type })),
            VictimCount: v.length
        };
    }, d => d.Date + d.Event);

    const processedData = Array.from(aggregatedData.values());

    processedData.forEach(d => {
        console.log('Processed data:', d);
        if (!d.Date) {
            console.error('Date parsing error:', d);
        }
    });

    const mostRecentDate = d3.max(processedData, d => d.Date);
    const oldestDate = d3.min(processedData, d => d.Date);

    console.log('Most recent date:', mostRecentDate);
    console.log('Oldest date:', oldestDate);

    if (!mostRecentDate || !oldestDate) {
        console.error('Date range error:', { mostRecentDate, oldestDate });
        return;
    }

    const x = d3.scaleTime()
        .domain([mostRecentDate, oldestDate])
        .range([margin.left, width - margin.right]);

    const tickValues = d3.timeYear.range(oldestDate, mostRecentDate, 10).reverse();

    const xAxis = d3.axisBottom(x)
        .tickValues(tickValues)
        .tickFormat(d3.timeFormat('%Y'));

    svg.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(xAxis)
        .selectAll('text')
        .style('text-anchor', 'middle')
        .attr('dy', '1em');

    const circles = svg.selectAll('.circle')
        .data(processedData)
        .enter()
        .append('circle')
        .attr('class', 'circle')
        .attr('cx', d => x(d.Date))
        .attr('cy', height / 2)
        .attr('r', d => Math.sqrt(d.VictimCount) * 5)
        .attr('fill', d => d.Type === 'human' ? 'red' : 'blue')
        .on('click', function(event, d) {
            d3.selectAll('.circle').classed('active', false);
            d3.select(this).classed('active', true);
            showEventDetails(d, this);
        });

    const timeline = document.getElementById('timeline');
    timeline.addEventListener('scroll', function() {
        updateEventDetailsPosition();
    });
}

function showEventDetails(d, circleElement) {
    console.log('Event details:', d);
    const details = document.getElementById('details');
    const formatDate = d3.timeFormat('%d %B %Y');
    details.innerHTML = `
        <div class="close-button">×</div>
        <h3>${d.Event}</h3>
        <p>Date: ${formatDate(d.Date)}</p>
        <p>Country: ${d.Country}</p>
        <div class="event-description">
            ${d.EventDescription.split('||').map(para => `<p>${para.trim()}</p>`).join('')}
        </div>
        <p>Victims: ${d.Victims.map(v => `
            <span class="victim-name ${v.description ? 'has-description' : ''}" 
                  data-description="${v.description}" 
                  data-name="${v.name}" 
                  data-type="${v.type}">
                ${v.name}
            </span>`).join(', ')}
        </p>
        <p>Type: ${d.Type}</p>
    `;
    details.style.display = 'block';

    const closeButton = details.querySelector('.close-button');
    closeButton.addEventListener('click', function() {
        details.style.display = 'none';
        d3.selectAll('.circle').classed('active', false);
    });

    details.querySelectorAll('.victim-name.has-description').forEach(element => {
        element.addEventListener('click', function(e) {
            e.preventDefault();
            const clickedName = this.getAttribute('data-name');
            
            if (currentlyClickedVictim === clickedName) {
                // If clicking the same name, remove the clicked state
                currentlyClickedVictim = null;
                document.querySelectorAll('.victim-name').forEach(el => el.classList.remove('clicked'));
            } else {
                // Remove 'clicked' class from all victim names across all events
                document.querySelectorAll('.victim-name').forEach(el => el.classList.remove('clicked'));
                
                // Add 'clicked' class to the clicked name
                this.classList.add('clicked');

                // Update the currently clicked victim
                currentlyClickedVictim = clickedName;
            }

            showVictimDetails(this.getAttribute('data-name'), this.getAttribute('data-description'), this.getAttribute('data-type'));
        });
    });

    updateEventDetailsPosition(circleElement);
}

function updateEventDetailsPosition(circleElement) {
    const details = document.getElementById('details');
    if (details.style.display !== 'none' && circleElement) {
        const rect = circleElement.getBoundingClientRect();
        const timeline = document.getElementById('timeline');
        const timelineRect = timeline.getBoundingClientRect();

        let left = rect.left + rect.width / 2 - details.offsetWidth / 2;
        left = Math.max(timelineRect.left, Math.min(left, timelineRect.right - details.offsetWidth));

        let top = rect.top - details.offsetHeight - 10;
        if (top < timelineRect.top) {
            top = rect.bottom + 10;
        }

        details.style.left = `${left}px`;
        details.style.top = `${top}px`;
    }
}

function showVictimDetails(name, description, type) {
    console.log('Victim details:', { name, description, type });
    const victimDetails = document.getElementById('victim-details');
    const photoName = name.toLowerCase().replace(/\s+/g, '_');
    victimDetails.innerHTML = `
        <div class="victim-info">
            <div class="victim-photo-name">
                <img src="photos/${photoName}.jpg" alt="${name}" style="max-width: 100%; height: auto;">
                <h3>${name}</h3>
            </div>
            <div class="victim-description">
                ${description.split('||').map(para => `<p>${para.trim()}</p>`).join('')}
                <p>Type: ${type}</p>
            </div>
        </div>
    `;
    victimDetails.style.display = 'block';
}