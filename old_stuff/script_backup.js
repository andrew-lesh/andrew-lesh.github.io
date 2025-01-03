document.addEventListener('DOMContentLoaded', function() {
    d3.csv('data.csv').then(data => {
        console.log('Data loaded:', data); // Log the loaded data
        createTimeline(data);
    }).catch(error => {
        console.error('Error loading CSV data:', error);
    });
});

function createTimeline(data) {
    const width = 2000;
    const height = 600;
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };

    const svg = d3.select('#timeline')
        .append('svg')
        .attr('width', width)
        .attr('height', height);

    const parseDate = d3.timeParse('%Y-%m-%d');
    const aggregatedData = d3.rollup(data, v => ({
        Date: parseDate(v[0].Date),
        Event: v[0].Event,
        Country: v[0].Country,
        VictimNames: v.map(d => d.VictimName).join(', '),
        Type: v[0].Type,
        EventDescription: v[0].EventDescription,
        Victims: v.map(d => ({ name: d.VictimName, description: d.PersonDescription })),
        VictimCount: v.length
    }), d => d.Date + d.Event);

    const processedData = Array.from(aggregatedData.values());

    processedData.forEach(d => {
        console.log('Processed data:', d); // Log each processed data entry
        if (!d.Date) {
            console.error('Date parsing error:', d);
        }
    });

    // Determine the most recent and oldest dates in the data
    const mostRecentDate = d3.max(processedData, d => d.Date);
    const oldestDate = d3.min(processedData, d => d.Date);

    console.log('Most recent date:', mostRecentDate); // Log the most recent date
    console.log('Oldest date:', oldestDate); // Log the oldest date

    if (!mostRecentDate || !oldestDate) {
        console.error('Date range error:', { mostRecentDate, oldestDate });
        return;
    }

    const x = d3.scaleTime()
        .domain([oldestDate, mostRecentDate])
        .range([margin.left, width - margin.right]);

    const xAxis = d3.axisBottom(x);

    svg.append('g')
        .attr('transform', `translate(0, ${height - margin.bottom})`)
        .call(xAxis);

    const circles = svg.selectAll('.circle')
        .data(processedData)
        .enter()
        .append('circle')
        .attr('class', 'circle')
        .attr('cx', d => x(d.Date))
        .attr('cy', height / 2)
        .attr('r', d => Math.sqrt(d.VictimCount) * 5) // Adjust radius based on victim count
        .attr('fill', d => d.Type === 'animal' ? 'blue' : 'red')
        .on('click', function(event, d) {
            showEventDetails(d);
        });

    function showEventDetails(d) {
        console.log('Event details:', d); // Log event details
        const details = document.getElementById('details');
        details.innerHTML = `
            <h3>${d.Event}</h3>
            <p>Date: ${d3.timeFormat('%B %d, %Y')(d.Date)}</p>
            <p>Country: ${d.Country}</p>
            <p>Event Description: ${d.EventDescription || 'No description available'}</p>
            <p>Victims: ${d.Victims.map(v => `<span class="victim-name" data-description="${v.description || 'No description available'}" data-name="${v.name}">${v.name}</span>`).join(', ')}</p>
            <p>Type: ${d.Type}</p>
        `;
        details.style.display = 'block';

        // Add click event listeners to victim names
        details.querySelectorAll('.victim-name').forEach(element => {
            element.addEventListener('click', function() {
                showVictimDetails(this.getAttribute('data-name'), this.getAttribute('data-description'));
            });
        });
    }

    function showVictimDetails(name, description) {
        console.log('Victim details:', { name, description }); // Log victim details
        const victimDetails = document.getElementById('victim-details');
        const photoName = name.toLowerCase().replace(/\s+/g, '_'); // Convert name to lowercase and replace spaces with underscores
        victimDetails.innerHTML = `
            <h3>${name}</h3>
            <p>Description: ${description}</p>
            <img src="photos/${photoName}.jpg" alt="${name}" style="max-width: 100%; height: auto;">
        `;
        victimDetails.style.display = 'block';
    }
}