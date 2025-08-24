interface YearData {
  currentSavings: number;
  grantsReceived: number;
  investmentGrowth: number;
  year: string;
  childAge: string;
}

interface RESPMultiYearChartProps {
  yearlyData: YearData[];
}

export default function RESPMultiYearChart({ yearlyData }: RESPMultiYearChartProps) {
  // Show all years starting from the first birthday milestone
  const allData = yearlyData; // Keep all data including first year
  
  // Split data into chunks of 6 years per chart
  const charts = [];
  for (let i = 0; i < allData.length; i += 6) {
    const chartData = allData.slice(i, i + 6);
    charts.push(chartData);
  }

  const renderChart = (data: YearData[], chartIndex: number) => {
    // Find the maximum value across ALL data for consistent scaling across charts
    // Handle missing properties gracefully by defaulting to 0
    const allValues = allData.flatMap(d => [
      d.currentSavings || 0, 
      d.grantsReceived || 0, 
      d.investmentGrowth || 0
    ]);
    const maxValue = Math.max(...allValues, 1);
    
    // Chart dimensions - use container width
    const chartWidth = 1200; // Wider to accommodate 6 years
    const yearGroupWidth = 180; // Space for 3 bars + spacing per year
    const chartHeight = 400;
    const barWidth = 50; // Good sized bars
    const startX = (chartWidth - (data.length * yearGroupWidth)) / 2 + 30; // Center the bars
    const bottomY = chartHeight - 80;
    const maxBarHeight = 280;

    return (
      <div key={chartIndex} className="bg-white p-8 rounded-lg border border-gray-200 mb-6 w-full">
        <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
          {charts.length > 1 
            ? `Investment Progression - Years ${chartIndex * 6 + 2}-${Math.min((chartIndex + 1) * 6 + 1, allData.length + 1)}`
            : `Investment Progression Until Education Starts`
          }
        </h3>
        
        <svg 
          width={chartWidth} 
          height={chartHeight} 
          className="mx-auto"
          role="img"
          aria-label={`RESP investment progression chart showing ${data.length} years of data`}
        >
          {/* Y-axis */}
          <line 
            x1="40" 
            y1="60" 
            x2="40" 
            y2={bottomY} 
            stroke="#e5e7eb" 
            strokeWidth="2"
          />
          
          {/* X-axis */}
          <line 
            x1="40" 
            y1={bottomY} 
            x2={chartWidth - 20} 
            y2={bottomY} 
            stroke="#e5e7eb" 
            strokeWidth="2"
          />
          
          {/* Bars for each year (3 bars per year) */}
          {data.map((yearData, yearIndex) => {
            const yearStartX = startX + yearIndex * yearGroupWidth;
            
            // Handle missing properties gracefully by defaulting to 0
            const currentSavings = yearData.currentSavings || 0;
            const grantsReceived = yearData.grantsReceived || 0;
            const investmentGrowth = yearData.investmentGrowth || 0;
            
            const bars = [
              {
                x: yearStartX,
                height: (currentSavings / maxValue) * maxBarHeight,
                value: currentSavings,
                label: 'Contributions',
                color: '#3b82f6' // blue
              },
              {
                x: yearStartX + barWidth, // No spacing between bars
                height: (grantsReceived / maxValue) * maxBarHeight,
                value: grantsReceived,
                label: 'Grants',
                color: '#10b981' // green
              },
              {
                x: yearStartX + barWidth * 2, // No spacing between bars
                height: (investmentGrowth / maxValue) * maxBarHeight,
                value: investmentGrowth,
                label: 'Growth',
                color: '#8b5cf6' // purple
              }
            ];
            
            return (
              <g key={yearIndex}>
                {/* Three separate bars */}
                {bars.map((bar, barIndex) => (
                  bar.height > 0 && (
                    <g key={barIndex}>
                      {/* Bar */}
                      <rect
                        x={bar.x}
                        y={bottomY - bar.height}
                        width={barWidth}
                        height={bar.height}
                        fill={bar.color}
                        rx="2"
                      />
                      
                      {/* Value label on bar (if tall enough) or below (if too small) */}
                      {bar.height > 25 ? (
                        <text
                          x={bar.x + barWidth / 2}
                          y={bottomY - bar.height / 2 + 4}
                          textAnchor="middle"
                          className="text-xs font-semibold fill-white"
                        >
                          ${bar.value.toLocaleString()}
                        </text>
                      ) : bar.value > 0 && (
                        <text
                          x={bar.x + barWidth / 2}
                          y={bottomY + 15}
                          textAnchor="middle"
                          className="text-xs font-semibold fill-gray-700"
                        >
                          ${bar.value.toLocaleString()}
                        </text>
                      )}
                      
                    </g>
                  )
                ))}
                
                {/* Year label centered under the 3 bars */}
                <text
                  x={yearStartX + (barWidth * 3) / 2}
                  y={bottomY + 25}
                  textAnchor="middle"
                  className="text-sm font-medium fill-gray-700"
                >
                  {yearData.year}
                </text>
                <text
                  x={yearStartX + (barWidth * 3) / 2}
                  y={bottomY + 45}
                  textAnchor="middle"
                  className="text-sm fill-gray-600"
                >
                  {yearData.childAge}
                </text>
                
                {/* Total value above the bars */}
                <text
                  x={yearStartX + (barWidth * 3) / 2}
                  y={bottomY - Math.max(...bars.map(b => b.height)) - 10}
                  textAnchor="middle"
                  className="text-sm font-bold fill-gray-800"
                >
                  Total: ${(currentSavings + grantsReceived + investmentGrowth).toLocaleString()}
                </text>
              </g>
            );
          })}
          
          {/* Y-axis label */}
          <text
            x="15"
            y="65"
            textAnchor="middle"
            className="text-xs fill-gray-600"
            transform="rotate(-90 15 65)"
          >
            Amount ($)
          </text>
        </svg>
        
        {/* Legend (only show on first chart) */}
        {chartIndex === 0 && (
          <div className="flex justify-center mt-4 space-x-6">
            <div className="flex items-center">
              <div className="w-4 h-4 rounded mr-2 bg-blue-500"></div>
              <span className="text-sm text-gray-600">Contributions</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded mr-2 bg-green-500"></div>
              <span className="text-sm text-gray-600">Government Grants</span>
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 rounded mr-2 bg-purple-500"></div>
              <span className="text-sm text-gray-600">Investment Growth</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Handle empty data case
  if (allData.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg border border-gray-200 mb-6 w-full">
        <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
          Investment Progression Until Education Starts
        </h3>
        <svg 
          className="mx-auto" 
          width="1200" 
          height="400"
          role="img"
          aria-label="Empty RESP investment progression chart - no data available"
        >
          {/* Empty state - just axes */}
          <line x1="40" y1="60" x2="40" y2="320" stroke="#e5e7eb" strokeWidth="2" />
          <line x1="40" y1="320" x2="1180" y2="320" stroke="#e5e7eb" strokeWidth="2" />
          <text x="600" y="200" textAnchor="middle" className="text-lg fill-gray-500">
            No data available
          </text>
        </svg>
      </div>
    );
  }

  return (
    <div>
      {charts.map((chartData, index) => renderChart(chartData, index))}
    </div>
  );
}