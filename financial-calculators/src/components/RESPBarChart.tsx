interface ChartData {
  currentSavings: number;
  grantsReceived: number;
  investmentGrowth: number;
  year: number;
  childAge: string;
}

interface RESPBarChartProps {
  data: ChartData;
}

export default function RESPBarChart({ data }: RESPBarChartProps) {
  const { currentSavings, grantsReceived, investmentGrowth, year, childAge } = data;
  
  // Calculate total for scaling
  const total = currentSavings + grantsReceived + investmentGrowth;
  const maxValue = Math.max(total, 1); // Prevent division by zero
  
  // Chart dimensions
  const chartWidth = 400;
  const chartHeight = 350;
  const barWidth = 100;
  const centerX = chartWidth / 2 - barWidth / 2;
  const bottomY = chartHeight - 80;
  const maxBarHeight = 220;
  
  // Calculate stacked bar heights (proportional to values)
  const currentSavingsHeight = (currentSavings / maxValue) * maxBarHeight;
  const grantsHeight = (grantsReceived / maxValue) * maxBarHeight;
  const growthHeight = (investmentGrowth / maxValue) * maxBarHeight;
  
  // Stack components (from bottom to top)
  const stackedComponents = [
    {
      y: bottomY - currentSavingsHeight,
      height: currentSavingsHeight,
      value: currentSavings,
      label: 'Current Savings',
      color: '#3b82f6' // blue
    },
    {
      y: bottomY - currentSavingsHeight - grantsHeight,
      height: grantsHeight,
      value: grantsReceived,
      label: 'Government Grants',
      color: '#10b981' // green
    },
    {
      y: bottomY - currentSavingsHeight - grantsHeight - growthHeight,
      height: growthHeight,
      value: investmentGrowth,
      label: 'Investment Growth',
      color: '#8b5cf6' // purple
    }
  ];
  
  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200">
      <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">
        Investment Breakdown
      </h3>
      
      <svg width={chartWidth} height={chartHeight} className="mx-auto">
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
        
        {/* Stacked Bar */}
        {stackedComponents.map((component, index) => (
          component.height > 0 && (
            <g key={index}>
              {/* Stacked bar segment */}
              <rect
                x={centerX}
                y={component.y}
                width={barWidth}
                height={component.height}
                fill={component.color}
                rx="2"
              />
              
              {/* Value label on segment (if tall enough) or to the side (if too small) */}
              {component.height > 20 ? (
                <text
                  x={centerX + barWidth / 2}
                  y={component.y + component.height / 2 + 4}
                  textAnchor="middle"
                  className="text-xs font-semibold fill-white"
                >
                  ${component.value.toLocaleString()}
                </text>
              ) : component.value > 0 && (
                <text
                  x={centerX + barWidth + 10}
                  y={component.y + component.height / 2 + 4}
                  textAnchor="start"
                  className="text-xs font-semibold fill-gray-700"
                >
                  ${component.value.toLocaleString()}
                </text>
              )}
            </g>
          )
        ))}
        
        {/* X-axis label */}
        <text
          x={centerX + barWidth / 2}
          y={bottomY + 20}
          textAnchor="middle"
          className="text-sm font-medium fill-gray-700"
        >
          {year}
        </text>
        <text
          x={centerX + barWidth / 2}
          y={bottomY + 40}
          textAnchor="middle"
          className="text-sm fill-gray-600"
        >
          {childAge}
        </text>
        
        {/* Total value above bar */}
        <text
          x={centerX + barWidth / 2}
          y={Math.max(50, bottomY - currentSavingsHeight - grantsHeight - growthHeight - 15)}
          textAnchor="middle"
          className="text-sm font-bold fill-gray-800"
        >
          Total: ${total.toLocaleString()}
        </text>
        
        {/* Y-axis labels */}
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
      
      {/* Legend */}
      <div className="flex justify-center mt-4 space-x-6">
        {stackedComponents.map((component, index) => (
          <div key={index} className="flex items-center">
            <div 
              className="w-4 h-4 rounded mr-2" 
              style={{ backgroundColor: component.color }}
            ></div>
            <span className="text-sm text-gray-600">{component.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}