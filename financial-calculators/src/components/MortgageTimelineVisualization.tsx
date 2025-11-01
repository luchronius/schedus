'use client';

import { useMemo } from 'react';
import { MortgageHistoryPoint } from '@/utils/mortgageTracking';

interface MortgageTimelineVisualizationProps {
  history: MortgageHistoryPoint[];
  className?: string;
}

interface TimelineEvent {
  date: Date;
  balance: number;
  interestRate: number;
  event?: {
    type: 'payment' | 'lump_sum' | 'rate_change';
    amount: number;
    description?: string;
  };
  isSignificant: boolean;
}

export default function MortgageTimelineVisualization({ 
  history, 
  className = '' 
}: MortgageTimelineVisualizationProps) {
  
  const timelineEvents = useMemo(() => {
    if (history.length === 0) return [];
    
    // Process history into timeline events
    const events: TimelineEvent[] = history.map((point) => ({
      date: new Date(point.date),
      balance: point.balance,
      interestRate: point.interestRate,
      event: point.event,
      isSignificant: !!point.event && (point.event.type === 'lump_sum' || point.event.type === 'rate_change')
    })).sort((a, b) => a.date.getTime() - b.date.getTime());

    return events;
  }, [history]);

  const { maxBalance, minBalance, balanceRange } = useMemo(() => {
    if (timelineEvents.length === 0) return { maxBalance: 0, minBalance: 0, balanceRange: 0 };
    
    const balances = timelineEvents.map(e => e.balance);
    const max = Math.max(...balances);
    const min = Math.min(...balances);
    return {
      maxBalance: max,
      minBalance: min,
      balanceRange: max - min
    };
  }, [timelineEvents]);

  if (timelineEvents.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Mortgage Timeline</h3>
        <p className="text-gray-500">No timeline data available. Add balance snapshots and payments to see your mortgage history.</p>
      </div>
    );
  }

  // Calculate SVG dimensions and scaling
  const svgWidth = 800;
  const svgHeight = 400;
  const margin = { top: 40, right: 40, bottom: 60, left: 80 };
  const chartWidth = svgWidth - margin.left - margin.right;
  const chartHeight = svgHeight - margin.top - margin.bottom;

  const dateRange = timelineEvents[timelineEvents.length - 1].date.getTime() - timelineEvents[0].date.getTime();

  // Helper functions for scaling
  const getXPosition = (date: Date) => {
    const timeFromStart = date.getTime() - timelineEvents[0].date.getTime();
    return margin.left + (timeFromStart / dateRange) * chartWidth;
  };

  const getYPosition = (balance: number) => {
    const normalizedBalance = (balance - minBalance) / (balanceRange || 1);
    return margin.top + chartHeight - (normalizedBalance * chartHeight);
  };

  // Generate path for balance line
  const balancePath = timelineEvents
    .map((event, index) => {
      const x = getXPosition(event.date);
      const y = getYPosition(event.balance);
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-xl font-semibold text-gray-900 mb-6">Mortgage Balance Timeline</h3>
      
      <div className="w-full overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="min-w-full">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width={chartWidth} height={chartHeight} x={margin.left} y={margin.top} fill="url(#grid)" />
          
          {/* Y-axis labels (balance) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const balance = minBalance + (ratio * balanceRange);
            const y = getYPosition(balance);
            return (
              <g key={ratio}>
                <line 
                  x1={margin.left - 5} 
                  y1={y} 
                  x2={margin.left} 
                  y2={y} 
                  stroke="#6b7280" 
                  strokeWidth="1"
                />
                <text 
                  x={margin.left - 10} 
                  y={y + 4} 
                  textAnchor="end" 
                  fontSize="12" 
                  fill="#6b7280"
                >
                  ${(balance / 1000).toFixed(0)}k
                </text>
              </g>
            );
          })}
          
          {/* X-axis labels (dates) */}
          {timelineEvents.filter((_, index) => index % Math.max(1, Math.floor(timelineEvents.length / 6)) === 0).map((event) => {
            const x = getXPosition(event.date);
            return (
              <g key={event.date.getTime()}>
                <line 
                  x1={x} 
                  y1={margin.top + chartHeight} 
                  x2={x} 
                  y2={margin.top + chartHeight + 5} 
                  stroke="#6b7280" 
                  strokeWidth="1"
                />
                <text 
                  x={x} 
                  y={margin.top + chartHeight + 20} 
                  textAnchor="middle" 
                  fontSize="11" 
                  fill="#6b7280"
                  transform={`rotate(-45, ${x}, ${margin.top + chartHeight + 20})`}
                >
                  {event.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                </text>
              </g>
            );
          })}
          
          {/* Balance line */}
          <path 
            d={balancePath} 
            fill="none" 
            stroke="#3b82f6" 
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Event markers */}
          {timelineEvents.map((event, index) => {
            const x = getXPosition(event.date);
            const y = getYPosition(event.balance);
            
            if (event.event?.type === 'lump_sum') {
              return (
                <g key={index}>
                  {/* Lump sum payment marker */}
                  <circle
                    cx={x}
                    cy={y}
                    r="6"
                    fill="#dc2626"
                    stroke="#fff"
                    strokeWidth="2"
                  />
                  {/* Drop line to show impact */}
                  <line
                    x1={x}
                    y1={y - 20}
                    x2={x}
                    y2={y + 20}
                    stroke="#dc2626"
                    strokeWidth="2"
                    strokeDasharray="4,4"
                    opacity="0.7"
                  />
                </g>
              );
            } else if (event.event?.type === 'rate_change') {
              return (
                <g key={index}>
                  <rect
                    x={x - 5}
                    y={y - 5}
                    width={10}
                    height={10}
                    fill="#8b5cf6"
                    stroke="#fff"
                    strokeWidth={2}
                    transform={`rotate(45, ${x}, ${y})`}
                  />
                </g>
              );
            } else if (event.isSignificant) {
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="4"
                  fill="#10b981"
                  stroke="#fff"
                  strokeWidth="2"
                />
              );
            } else {
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="2"
                  fill="#3b82f6"
                  opacity="0.6"
                />
              );
            }
          })}
          
          {/* Axis lines */}
          <line 
            x1={margin.left} 
            y1={margin.top} 
            x2={margin.left} 
            y2={margin.top + chartHeight} 
            stroke="#374151" 
            strokeWidth="2"
          />
          <line 
            x1={margin.left} 
            y1={margin.top + chartHeight} 
            x2={margin.left + chartWidth} 
            y2={margin.top + chartHeight} 
            stroke="#374151" 
            strokeWidth="2"
          />
          
          {/* Axis labels */}
          <text 
            x={margin.left / 2} 
            y={margin.top + chartHeight / 2} 
            textAnchor="middle" 
            fontSize="14" 
            fill="#374151"
            transform={`rotate(-90, ${margin.left / 2}, ${margin.top + chartHeight / 2})`}
          >
            Balance ($)
          </text>
          <text 
            x={margin.left + chartWidth / 2} 
            y={svgHeight - 10} 
            textAnchor="middle" 
            fontSize="14" 
            fill="#374151"
          >
            Date
          </text>
        </svg>
      </div>

      {/* Legend and Summary Stats */}
      <div className="mt-6 flex flex-wrap items-center justify-between">
        <div className="flex items-center space-x-6 mb-4 flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-0.5 bg-blue-500 mr-2"></div>
            <span className="text-sm text-gray-600">Balance Trend</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-600 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Lump Sum Payments</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-purple-500 mr-2 transform rotate-45"></div>
            <span className="text-sm text-gray-600">Rate Changes</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm text-gray-600">Other Highlights</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <div>
            <span className="font-medium">Balance Reduction:</span>{' '}
            {((timelineEvents[0]?.balance ?? 0) - (timelineEvents[timelineEvents.length - 1]?.balance ?? 0)).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Lump Sum Payments:</span>{' '}
            {timelineEvents.filter(e => e.event?.type === 'lump_sum').length}
          </div>
          <div>
            <span className="font-medium">Rate Changes:</span>{' '}
            {timelineEvents.filter(e => e.event?.type === 'rate_change').length}
          </div>
          <div>
            <span className="font-medium">Time Span:</span>{' '}
            {timelineEvents.length > 1
              ? `${Math.round((timelineEvents[timelineEvents.length - 1].date.getTime() - timelineEvents[0].date.getTime()) / (1000 * 60 * 60 * 24 * 30))} months`
              : 'N/A'}
          </div>
        </div>
      </div>
      {/* Recent significant events */}
      <div className="mt-6">
        <h4 className="text-lg font-medium text-gray-900 mb-3">Recent Significant Events</h4>
        <div className="space-y-2">
          {(() => {
            const recentEvents = timelineEvents
              .filter(event => event.event && (event.event.type === 'lump_sum' || event.event.type === 'rate_change'))
              .slice(-5)
              .reverse();

            if (recentEvents.length === 0) {
              return <p className="text-gray-500 text-sm">No lump sum payments or rate changes recorded yet.</p>;
            }

            return recentEvents.map((event, index) => {
              const isRateChange = event.event?.type === 'rate_change';
              const amount = Number(event.event?.amount ?? 0);

              return (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium text-gray-900">
                      {event.date.toLocaleDateString()}
                    </span>
                    {event.event?.description && (
                      <span className="ml-2 text-sm text-gray-600">
                        - {event.event.description}
                      </span>
                    )}
                    {isRateChange && (
                      <span className="ml-2 text-xs text-purple-600">
                        {amount >= 0 ? '+' : '-'}{Math.abs(amount).toFixed(2)}%
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    {isRateChange ? (
                      <div className="font-medium text-purple-600">
                        Current rate: {event.interestRate.toFixed(2)}%
                      </div>
                    ) : (
                      <div className="font-medium text-red-600">
                        -${amount.toLocaleString()}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Balance: ${event.balance.toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>
    </div>
  );
}